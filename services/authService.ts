import { supabase } from './supabaseService';
import { User, Role } from '../types';

const DEFAULT_ORGANIZATION_ID = '550e8400-e29b-41d4-a716-446655440000';
const DEFAULT_ROLE: Role = 'student';
const STORAGE_ROLE_MAP: Record<string, Role> = {
  partner: 'partner_facilitator'
};

const UI_TO_STORAGE_ROLE: Record<Role, string> = {
  super_administrator: 'super_administrator',
  administrator: 'administrator',
  manager: 'manager',
  supervisor: 'supervisor',
  intern: 'intern',
  trainer: 'trainer',
  coach: 'coach',
  facilitator: 'facilitator',
  partner_facilitator: 'partner',
  mentor: 'mentor',
  student: 'student',
  alumni: 'alumni',
  entrepreneur: 'entrepreneur',
  employer: 'employer',
  implementer: 'implementer',
  funder: 'funder',
  publisher: 'publisher',
  editor: 'editor',
  producer: 'producer',
  artist: 'artist'
};

const DB_ALLOWED_ROLES = new Set<string>([
  'super_administrator', 'administrator', 'manager', 'supervisor', 'intern',
  'trainer', 'coach', 'facilitator', 'mentor',
  'student', 'learner', 'alumni',
  'entrepreneur', 'employer', 'implementer', 'funder',
  'publisher', 'editor', 'producer', 'artist',
  'partner', 'supplier', 'service_provider',
  'ai_coach', 'ai_developer', 'ai_analyst'
]);

const normalizeRoleForStorageValue = (role?: string | null): string => {
  const fallbackStorageRole = UI_TO_STORAGE_ROLE[DEFAULT_ROLE];

  if (!role) {
    return fallbackStorageRole;
  }

  const lower = role.toLowerCase().trim();
  const mappedFromUi = (UI_TO_STORAGE_ROLE as Record<string, string>)[lower];
  const normalized = mappedFromUi || lower;

  if (DB_ALLOWED_ROLES.has(normalized)) {
    return normalized;
  }

  return fallbackStorageRole;
};

const mapRoleFromStorageValue = (role: string | null | undefined): Role => {
  if (!role) return DEFAULT_ROLE;
  const lower = role.toLowerCase();
  const mapped = STORAGE_ROLE_MAP[lower];
  if (mapped) return mapped;
  return (Object.keys(UI_TO_STORAGE_ROLE) as Role[]).includes(lower as Role) ? (lower as Role) : DEFAULT_ROLE;
};

const sanitizeFullName = (fullName?: string | null, email?: string | null) => {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }
  return email || 'Utilisateur';
};

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  organization_id?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  role?: string;
  organization_id?: string; // optionnel: permet de choisir une organisation partenaire au signup
}

export interface SignInData {
  email: string;
  password: string;
}

// Service d'authentification Supabase
export class AuthService {
  static mapStoredRoleToUi(role: string | null | undefined): Role {
    return mapRoleFromStorageValue(role);
  }

  static normalizeRoleForStorage(role?: string | null): string {
    return normalizeRoleForStorageValue(role);
  }

  static getDefaultOrganizationId() {
    return DEFAULT_ORGANIZATION_ID;
  }

  // Vérifier si un rôle management existe déjà
  static async checkRoleAvailability(role: string): Promise<{ available: boolean; error?: string }> {
    try {
      // Bloquer complètement super_administrator
      if (role === 'super_administrator') {
        return { 
          available: false, 
          error: 'Le rôle super_administrator ne peut pas être créé via l\'interface publique' 
        };
      }

      // Tous les autres rôles sont autorisés sans restriction (y compris administrator, manager, supervisor, intern)
      return { available: true };
    } catch (error) {
      console.error('Erreur vérification disponibilité rôle:', error);
      return { available: true }; // En cas d'erreur, on autorise par sécurité
    }
  }

  // Inscription
  static async signUp(data: SignUpData) {
    try {
      // Vérifier la disponibilité du rôle avant l'inscription
      const uiRole = (data.role as Role) || DEFAULT_ROLE;
      const storageRole = this.normalizeRoleForStorage(uiRole);
      const roleCheck = await this.checkRoleAvailability(uiRole);
      
      if (!roleCheck.available) {
        const error = new Error(roleCheck.error || 'Rôle non disponible');
        return { user: null, error };
      }

      // Déterminer l'organization_id AVANT l'appel signUp
      const organizationId = (data.organization_id && data.organization_id.trim()) || DEFAULT_ORGANIZATION_ID;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          email_redirect_to: undefined, // Pas de redirection email
          data: {
            full_name: data.full_name,
            phone_number: data.phone_number,
            role: this.mapStoredRoleToUi(storageRole),
            organization_id: organizationId
          }
        },
        // Confirmer automatiquement l'email pour le développement
        // En production, vous devriez activer la confirmation par email
      });

      if (authError) throw authError;

      if (authData.user) {
        // ═══════════════════════════════════════════════════════════
        // LOGIQUE MULTI-TENANT
        // ═══════════════════════════════════════════════════════════
        // Les inscriptions publiques rejoignent SENEGEL (organisation principale)
        // Les organisations partenaires nécessitent une invitation
        // ═══════════════════════════════════════════════════════════
        
        // Créer le profil utilisateur
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: data.email,
            full_name: data.full_name,
            phone_number: data.phone_number,
            role: storageRole,
            organization_id: organizationId
          });

        if (profileError) {
          console.error('Erreur création profil:', profileError);
          // Ne pas faire échouer l'inscription pour cette erreur
        }
      }

      return { user: authData.user, error: null };
    } catch (error) {
      console.error('Erreur inscription:', error);
      return { user: null, error };
    }
  }

  // Connexion - Utilise uniquement Supabase Auth
  static async signIn(data: SignInData) {
    try {
      console.log('🔍 AuthService.signIn appelé avec:', { email: data.email, password: '***' });
      
      // Authentification Supabase uniquement
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (authError) {
        console.error('❌ Erreur Supabase Auth:', authError);
        return { user: null, error: authError };
      }

      if (!authData.user) {
        console.log('❌ Aucun utilisateur retourné par Supabase');
        return { user: null, error: new Error('Aucun utilisateur trouvé. Vérifiez vos identifiants ou créez un compte.') };
      }

      console.log('👤 Utilisateur Supabase trouvé:', authData.user.id);
      
      // Récupérer le profil utilisateur depuis la table profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Erreur récupération profil:', profileError);
        // Si le profil n'existe pas, créer un profil basique depuis les metadata
        if (profileError.code === 'PGRST116') {
          console.log('⚠️ Profil non trouvé, création depuis metadata...');
          const storageRole = this.normalizeRoleForStorage(authData.user.user_metadata?.role);
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              email: authData.user.email || '',
              full_name: sanitizeFullName(authData.user.user_metadata?.full_name, authData.user.email),
              role: storageRole,
              phone_number: authData.user.user_metadata?.phone_number || null,
              organization_id: authData.user.user_metadata?.organization_id || DEFAULT_ORGANIZATION_ID,
              is_active: true
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Erreur création profil:', createError);
            return { user: null, error: createError };
          }

          // Mettre à jour la dernière connexion
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', authData.user.id);

          console.log('✅ Profil créé et authentification réussie !');
          return { 
            user: {
              id: authData.user.id,
              email: newProfile.email,
              full_name: newProfile.full_name,
              role: this.mapStoredRoleToUi(newProfile.role),
              avatar_url: newProfile.avatar_url || '',
              organization_id: newProfile.organization_id || DEFAULT_ORGANIZATION_ID
            }, 
            error: null 
          };
        }
        return { user: null, error: profileError };
      }

      const effectiveProfile = profile || await (async () => {
        const storageRole = this.normalizeRoleForStorage(authData.user.user_metadata?.role);
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: authData.user.email || '',
            full_name: sanitizeFullName(authData.user.user_metadata?.full_name, authData.user.email),
            role: storageRole,
            phone_number: authData.user.user_metadata?.phone_number || null,
            organization_id: authData.user.user_metadata?.organization_id || DEFAULT_ORGANIZATION_ID,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        return createdProfile;
      })();

      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString(), organization_id: effectiveProfile.organization_id || DEFAULT_ORGANIZATION_ID })
        .eq('user_id', authData.user.id);

      console.log('✅ Authentification Supabase réussie !');
      return { 
        user: {
          id: authData.user.id,
          email: effectiveProfile.email,
          full_name: effectiveProfile.full_name,
          role: this.mapStoredRoleToUi(effectiveProfile.role),
          avatar_url: effectiveProfile.avatar_url || '',
          organization_id: effectiveProfile.organization_id || DEFAULT_ORGANIZATION_ID
        }, 
        error: null 
      };
    } catch (error) {
      console.error('💥 Erreur dans AuthService.signIn:', error);
      return { user: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  // Déconnexion
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      return { error };
    }
  }

  // Récupérer l'utilisateur actuel
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      if (!user) return { user: null, error: null };

      // Récupérer le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        // Ne pas logger l'erreur si c'est juste un profil manquant
        if (profileError.code !== 'PGRST116') {
          console.error('Erreur récupération profil:', profileError);
        }
        return { user: null, error: profileError };
      }

      return {
        user: {
          id: user.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          avatar_url: profile.avatar_url
        },
        error: null
      };
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return { user: null, error };
    }
  }

  // Écouter les changements d'authentification
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Récupérer le profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profile) {
          callback({
            id: session.user.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            avatar_url: profile.avatar_url
          });
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  // Mettre à jour le profil
  static async updateProfile(userId: string, updates: Partial<AuthUser>) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      return { error };
    }
  }

  // Réinitialiser le mot de passe
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      return { error };
    }
  }

  // Changer le mot de passe
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      return { error };
    }
  }
}

export default AuthService;
