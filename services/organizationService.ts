import { supabase } from './supabaseService';
import { getPrimaryOrganizationId, isSingleOrganizationTenantMode } from '../constants/platformTenant';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  isActive: boolean;
  isPlatformRoot?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export class OrganizationService {
  /**
   * Récupère l'organisation de l'utilisateur actuellement connecté
   */
  static async getCurrentUserOrganization(): Promise<Organization | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        console.warn('⚠️ Utilisateur sans organisation:', profileError);
        return null;
      }

      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .eq('is_active', true)
        .single();

      if (orgError) {
        console.error('❌ Erreur récupération organisation:', orgError);
        return null;
      }

      return this.mapToOrganization(organization);
    } catch (error) {
      console.error('❌ Erreur getCurrentUserOrganization:', error);
      return null;
    }
  }

  /**
   * Récupère l'ID de l'organisation de l'utilisateur (pour les requêtes)
   */
  static async getCurrentUserOrganizationId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      return profile?.organization_id || null;
    } catch (error) {
      console.error('❌ Erreur getCurrentUserOrganizationId:', error);
      return null;
    }
  }

  /**
   * Liste toutes les organisations (Super Admin uniquement)
   */
  static async getAllOrganizations(): Promise<Organization[]> {
    try {
      if (isSingleOrganizationTenantMode()) {
        const pid = getPrimaryOrganizationId();
        const { data, error } = await supabase.from('organizations').select('*').eq('id', pid).maybeSingle();
        if (error || !data) {
          const { data: fallback } = await supabase.from('organizations').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
          return fallback ? [this.mapToOrganization(fallback)] : [];
        }
        return [this.mapToOrganization(data)];
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur getAllOrganizations:', error);
        return [];
      }

      return (data || []).map(org => this.mapToOrganization(org));
    } catch (error) {
      console.error('❌ Erreur getAllOrganizations:', error);
      return [];
    }
  }

  /**
   * Retourne une organisation par slug (minuscule)
   */
  static async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const clean = slug.toLowerCase().trim();
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', clean)
        .maybeSingle();
      if (error) {
        console.error('❌ Erreur getOrganizationBySlug:', error);
        return null;
      }
      return data ? this.mapToOrganization(data) : null;
    } catch (error) {
      console.error('❌ Erreur getOrganizationBySlug:', error);
      return null;
    }
  }

  /**
   * Liste des organisations actives pour suggestions
   */
  static async getActiveOrganizations(): Promise<Organization[]> {
    try {
      if (isSingleOrganizationTenantMode()) {
        return this.getAllOrganizations();
      }
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) {
        console.error('❌ Erreur getActiveOrganizations:', error);
        return [];
      }
      return (data || []).map(o => this.mapToOrganization(o));
    } catch (error) {
      console.error('❌ Erreur getActiveOrganizations:', error);
      return [];
    }
  }

  /**
   * Trouve par nom/slug ou crée l'organisation (si autorisé par RLS)
   */
  static async findOrCreateOrganizationByName(name: string, description?: string): Promise<Organization | null> {
    const slug = name.toLowerCase().trim().replace(/\s+/g, '-');
    const existing = await this.getOrganizationBySlug(slug);
    if (existing) return existing;
    // Créer si non trouvée (nécessite rôle super_administrator selon RLS)
    return await this.createOrganization(name, slug, description);
  }

  /**
   * Crée une nouvelle organisation (Super Admin uniquement)
   */
  static async createOrganization(
    name: string,
    slug: string,
    description?: string
  ): Promise<Organization | null> {
    try {
      if (isSingleOrganizationTenantMode()) {
        throw new Error(
          'Mode organisation unique (VITE_SINGLE_ORGANIZATION_MODE) : création de tenants désactivée. Désactivez ce flag pour ajouter des organisations hébergées.',
        );
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier que l'utilisateur est Super Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'super_administrator') {
        throw new Error('Seuls les Super Administrateurs peuvent créer des organisations');
      }

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: slug.toLowerCase().trim(),
          description,
          is_active: true,
          is_platform_root: false,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur createOrganization:', error);
        throw error;
      }

      return this.mapToOrganization(data);
    } catch (error: any) {
      console.error('❌ Erreur createOrganization:', error);
      throw error;
    }
  }

  /**
   * Met à jour une organisation (Super Admin uniquement)
   */
  static async updateOrganization(
    id: string,
    updates: Partial<Organization>
  ): Promise<Organization | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier que l'utilisateur est Super Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'super_administrator') {
        throw new Error('Seuls les Super Administrateurs peuvent modifier des organisations');
      }

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.slug) updateData.slug = updates.slug.toLowerCase().trim();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;
      if (updates.website !== undefined) updateData.website = updates.website;
      if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur updateOrganization:', error);
        throw error;
      }

      return this.mapToOrganization(data);
    } catch (error: any) {
      console.error('❌ Erreur updateOrganization:', error);
      throw error;
    }
  }

  /**
   * Désactive une organisation (Super Admin uniquement)
   */
  static async deactivateOrganization(id: string): Promise<boolean> {
    if (await this.isProtectedPlatformOrganization(id)) {
      throw new Error("Impossible de désactiver l'organisation plateforme (mère).");
    }
    if (isSingleOrganizationTenantMode() && id === getPrimaryOrganizationId()) {
      throw new Error("Impossible de désactiver l'unique organisation du tenant.");
    }
    const ok = (await this.updateOrganization(id, { isActive: false })) !== null;
    if (!ok) throw new Error('La désactivation a échoué.');
    return true;
  }

  /**
   * Active une organisation (Super Admin uniquement)
   */
  static async activateOrganization(id: string): Promise<boolean> {
    try {
      return await this.updateOrganization(id, { isActive: true }) !== null;
    } catch (error) {
      console.error('❌ Erreur activateOrganization:', error);
      return false;
    }
  }

  /**
   * Supprime une organisation (Super Admin uniquement)
   * ATTENTION : Supprime aussi toutes les données associées !
   */
  static async deleteOrganization(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier que l'utilisateur est Super Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'super_administrator') {
        throw new Error('Seuls les Super Administrateurs peuvent supprimer des organisations');
      }

      if (isSingleOrganizationTenantMode()) {
        throw new Error('Mode organisation unique : suppression d’organisation désactivée.');
      }
      if (await this.isProtectedPlatformOrganization(id)) {
        throw new Error("L'organisation plateforme (mère) ne peut pas être supprimée.");
      }

      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erreur deleteOrganization:', error);
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error('❌ Erreur deleteOrganization:', error);
      throw error;
    }
  }

  /**
   * Organisation mère plateforme (non supprimable / non désactivable).
   * Priorité à la ligne avec is_platform_root = true ; sinon repli sur VITE_PRIMARY_ORGANIZATION_ID.
   */
  static async isProtectedPlatformOrganization(organizationId: string): Promise<boolean> {
    try {
      const { data: rows, error: rootErr } = await supabase
        .from('organizations')
        .select('id')
        .eq('is_platform_root', true)
        .limit(1);
      const rootId = !rootErr && rows?.length ? rows[0].id : null;
      if (rootId) return organizationId === rootId;
    } catch {
      /* colonne absente ou erreur réseau */
    }
    return organizationId === getPrimaryOrganizationId();
  }

  /**
   * Récupère les statistiques d'une organisation
   */
  static async getOrganizationStats(organizationId: string): Promise<{
    usersCount: number;
    projectsCount: number;
    coursesCount: number;
    jobsCount: number;
  } | null> {
    try {
      const [
        { count: usersCount },
        { count: projectsCount },
        { count: coursesCount },
        { count: jobsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId)
      ]);

      return {
        usersCount: usersCount || 0,
        projectsCount: projectsCount || 0,
        coursesCount: coursesCount || 0,
        jobsCount: jobsCount || 0
      };
    } catch (error) {
      console.error('❌ Erreur getOrganizationStats:', error);
      return null;
    }
  }

  /**
   * Mappe les données Supabase vers le format Organization
   */
  private static mapToOrganization(data: any): Organization {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      logoUrl: data.logo_url,
      website: data.website,
      contactEmail: data.contact_email,
      isActive: data.is_active ?? true,
      isPlatformRoot: data.is_platform_root === true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by
    };
  }
}

export default OrganizationService;


