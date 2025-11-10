import { supabase } from './supabaseService';
import { ApiHelper } from './apiHelper';
import { Project, Invoice, Expense, Contact, TimeLog, LeaveRequest, Course, Objective, Document } from '../types';
import OrganizationService from './organizationService';

// Service de données Supabase
export class DataService {
  /**
   * Helper pour récupérer l'organization_id de l'utilisateur actuel
   * Utilisé pour toutes les opérations multi-tenant
   */
  private static async getCurrentUserOrganizationId(): Promise<string | null> {
    try {
      return await OrganizationService.getCurrentUserOrganizationId();
    } catch (error) {
      console.warn('⚠️ Erreur récupération organization_id (continue sans filtre):', error);
      return null;
    }
  }
  // ===== PROFILES =====
  static async getProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération profils:', error);
      return { data: null, error };
    }
  }

  static async getPendingProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération profils en attente:', error);
      return { data: null, error };
    }
  }

  static async searchInstructors(searchTerm: string, roles?: string[]) {
    const sanitized = searchTerm.trim().replace(/[%]/g, '').replace(/['"]/g, '');
    if (!sanitized) {
      return { data: [], error: null };
    }

    try {
      const organizationId = await this.getCurrentUserOrganizationId();
      let queryBuilder = supabase
        .from('profiles')
        .select('id, user_id, full_name, email, role, avatar_url, is_active')
        .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
        .order('full_name', { ascending: true });

      if (roles && roles.length > 0) {
        queryBuilder = queryBuilder.in('role', roles);
      }

      if (organizationId) {
        queryBuilder = queryBuilder.eq('organization_id', organizationId);
      }

      const { data, error } = await queryBuilder.limit(20);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur recherche instructeurs:', error);
      return { data: null, error };
    }
  }

  static async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      return { data: null, error };
    }
  }

  static async updateProfile(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      return { data: null, error };
    }
  }

  // Mettre à jour le rôle d'un utilisateur
  static async updateUserRole(userId: string, newRole: string) {
    try {
      console.log('🔄 Update user role:', { userId, newRole });
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur update user role:', error);
        throw error;
      }
      
      console.log('✅ User role updated:', data);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur update user role:', error);
      return { data: null, error };
    }
  }

  static async approveProfileRole(params: { profileId: string; approverId: string; comment?: string }) {
    const { profileId, approverId, comment } = params;
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Profil introuvable');

      const approvedRole: string = (profile.pending_role as string) || profile.role || 'student';
      const reviewComment = comment?.trim() ? comment.trim() : null;
      const requestedRole = profile.pending_role || approvedRole;

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: approvedRole,
          status: 'active',
          pending_role: null,
          review_comment: reviewComment,
          reviewed_at: new Date().toISOString(),
          reviewed_by: approverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('role_approval_logs')
        .insert({
          profile_id: profileId,
          requested_role: requestedRole,
          decision: 'approved',
          comment: reviewComment,
          decided_by: approverId
        });

      if (logError) {
        console.warn('⚠️ Erreur enregistrement log approbation (non bloquant):', logError);
      }

      return { data: updatedProfile, error: null };
    } catch (error) {
      console.error('❌ Erreur approbation rôle profil:', error);
      return { data: null, error };
    }
  }

  static async rejectProfileRole(params: { profileId: string; approverId: string; comment?: string }) {
    const { profileId, approverId, comment } = params;
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Profil introuvable');

      const reviewComment = comment?.trim() ? comment.trim() : null;
      const requestedRole = profile.pending_role || profile.role || 'student';

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
          pending_role: null,
          review_comment: reviewComment,
          reviewed_at: new Date().toISOString(),
          reviewed_by: approverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('role_approval_logs')
        .insert({
          profile_id: profileId,
          requested_role: requestedRole,
          decision: 'rejected',
          comment: reviewComment,
          decided_by: approverId
        });

      if (logError) {
        console.warn('⚠️ Erreur enregistrement log rejet (non bloquant):', logError);
      }

      return { data: updatedProfile, error: null };
    } catch (error) {
      console.error('❌ Erreur rejet rôle profil:', error);
      return { data: null, error };
    }
  }

  // Fonction pour activer/désactiver un utilisateur
  static async toggleUserActive(userId: string | number, isActive: boolean) {
    try {
      console.log('🔄 Toggle user active:', { userId, isActive });
      
      // Convertir userId en string si c'est un number
      const userIdStr = String(userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userIdStr)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur toggle user active:', error);
        throw error;
      }
      
      console.log('✅ User active status updated:', { userId: userIdStr, isActive, profileId: data?.id });
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur toggle user active:', error);
      return { data: null, error };
    }
  }

  // Fonction pour supprimer un utilisateur (suppression du profil uniquement)
  static async deleteUser(userId: string | number) {
    try {
      console.log('🔄 Delete user:', { userId });
      
      // Convertir userId en string si c'est un number
      const userIdStr = String(userId);
      
      // Vérifier que l'utilisateur existe d'abord
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userIdStr)
        .maybeSingle();
      
      // Gérer les cas où l'utilisateur n'existe pas (pas une erreur critique)
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = "no rows returned" - ce n'est pas une vraie erreur
        console.error('❌ Erreur lors de la vérification de l\'utilisateur:', checkError);
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
      }
      
      if (!existingUser) {
        console.warn('⚠️ Utilisateur non trouvé dans profiles:', userIdStr);
        // Retourner succès même si l'utilisateur n'existe pas (déjà supprimé ou n'existe jamais)
        return { success: true, error: null };
      }
      
      console.log('✅ Utilisateur trouvé:', existingUser.email, existingUser.full_name);
      
      // Supprimer les données liées à cet utilisateur AVANT de supprimer le profil
      // pour éviter les violations de contrainte de clé étrangère
      const profileId = existingUser.id;
      console.log('🔄 Suppression des données liées pour profileId:', profileId);
      
      // Supprimer les factures
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('user_id', profileId);
      if (invoicesError) {
        console.error('❌ Erreur suppression factures:', invoicesError);
      } else {
        console.log('✅ Factures supprimées');
      }
      
      // Supprimer les dépenses
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', profileId);
      if (expensesError) {
        console.error('❌ Erreur suppression dépenses:', expensesError);
      } else {
        console.log('✅ Dépenses supprimées');
      }
      
      // Supprimer les time logs
      const { error: timeLogsError } = await supabase
        .from('time_logs')
        .delete()
        .eq('user_id', profileId);
      if (timeLogsError) {
        console.error('❌ Erreur suppression time logs:', timeLogsError);
      } else {
        console.log('✅ Time logs supprimés');
      }
      
      // Supprimer les demandes de congé
      const { error: leaveRequestsError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('user_id', profileId);
      if (leaveRequestsError) {
        console.error('❌ Erreur suppression demandes de congé:', leaveRequestsError);
      } else {
        console.log('✅ Demandes de congé supprimées');
      }
      
      // Supprimer les objectifs
      const { error: objectivesError } = await supabase
        .from('objectives')
        .delete()
        .eq('owner_id', profileId);
      if (objectivesError) {
        console.error('❌ Erreur suppression objectifs:', objectivesError);
      } else {
        console.log('✅ Objectifs supprimés');
      }
      
      // Supprimer les notifications
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profileId);
      if (notificationsError) {
        console.error('❌ Erreur suppression notifications:', notificationsError);
      } else {
        console.log('✅ Notifications supprimées');
      }
      
      // Supprimer les permissions modules
      const { error: permissionsError } = await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', profileId);
      if (permissionsError) {
        console.error('❌ Erreur suppression permissions:', permissionsError);
      } else {
        console.log('✅ Permissions supprimées');
      }
      
      // Supprimer les budgets
      const { error: budgetsError } = await supabase
        .from('budgets')
        .delete()
        .eq('owner_id', profileId);
      if (budgetsError) {
        console.error('❌ Erreur suppression budgets:', budgetsError);
      } else {
        console.log('✅ Budgets supprimés');
      }
      
      // Supprimer les inscriptions aux cours
      const { error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', profileId);
      if (enrollmentsError) {
        console.error('❌ Erreur suppression inscriptions cours:', enrollmentsError);
      } else {
        console.log('✅ Inscriptions cours supprimées');
      }
      
      // Supprimer les instructeurs de cours
      const { error: instructorsError } = await supabase
        .from('course_instructors')
        .delete()
        .eq('profile_id', profileId);
      if (instructorsError) {
        console.error('❌ Erreur suppression instructeurs:', instructorsError);
      } else {
        console.log('✅ Instructeurs supprimés');
      }
      
      // Supprimer les favoris de documents
      const { error: favoritesError } = await supabase
        .from('document_favorites')
        .delete()
        .eq('user_id', profileId);
      if (favoritesError) {
        console.error('❌ Erreur suppression favoris documents:', favoritesError);
      } else {
        console.log('✅ Favoris documents supprimés');
      }
      
      // Supprimer les partages de documents
      const { error: sharesError } = await supabase
        .from('document_shares')
        .delete()
        .or(`shared_by_id.eq.${profileId},shared_with_user_id.eq.${profileId}`);
      if (sharesError) {
        console.error('❌ Erreur suppression partages documents:', sharesError);
      } else {
        console.log('✅ Partages documents supprimés');
      }
      
      // Supprimer les versions de documents
      const { error: versionsError } = await supabase
        .from('document_versions')
        .delete()
        .eq('updated_by_id', profileId);
      if (versionsError) {
        console.error('❌ Erreur suppression versions documents:', versionsError);
      } else {
        console.log('✅ Versions documents supprimées');
      }
      
      // Supprimer les documents créés
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('created_by_id', profileId);
      if (documentsError) {
        console.error('❌ Erreur suppression documents:', documentsError);
      } else {
        console.log('✅ Documents supprimés');
      }
      
      // Supprimer les articles de connaissance
      const { error: articlesError } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('user_id', profileId);
      if (articlesError) {
        console.error('❌ Erreur suppression articles:', articlesError);
      } else {
        console.log('✅ Articles supprimés');
      }
      
      // Supprimer les catégories de connaissance
      const { error: categoriesError } = await supabase
        .from('knowledge_categories')
        .delete()
        .eq('user_id', profileId);
      if (categoriesError) {
        console.error('❌ Erreur suppression catégories:', categoriesError);
      } else {
        console.log('✅ Catégories supprimées');
      }
      
      // Supprimer les demandes de congé (manager_id aussi)
      const { error: leaveManagerError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('manager_id', profileId);
      if (leaveManagerError) {
        console.error('❌ Erreur suppression demandes congé (manager):', leaveManagerError);
      } else {
        console.log('✅ Demandes congé (manager) supprimées');
      }
      
      // Supprimer les réunions (organisateur)
      const { error: meetingsError } = await supabase
        .from('meetings')
        .delete()
        .eq('organizer_id', profileId);
      if (meetingsError) {
        console.error('❌ Erreur suppression réunions:', meetingsError);
      } else {
        console.log('✅ Réunions supprimées');
      }
      
      // Supprimer les utilisateurs d'organisation
      const { error: orgUsersError } = await supabase
        .from('organization_users')
        .delete()
        .or(`user_id.eq.${profileId},invited_by.eq.${profileId}`);
      if (orgUsersError) {
        console.error('❌ Erreur suppression org users:', orgUsersError);
      } else {
        console.log('✅ Org users supprimés');
      }
      
      // ATTENTION: Ne pas supprimer les profils ayant ce manager_id
      // car cela supprimerait d'autres utilisateurs !
      // Mieux vaut modifier leur manager_id à NULL ou à un autre manager
      
      // Supprimer les dépenses récurrentes
      const { error: recurringExpensesError } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('owner_id', profileId);
      if (recurringExpensesError) {
        console.error('❌ Erreur suppression dépenses récurrentes:', recurringExpensesError);
      } else {
        console.log('✅ Dépenses récurrentes supprimées');
      }
      
      // Supprimer les factures récurrentes
      const { error: recurringInvoicesError } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('owner_id', profileId);
      if (recurringInvoicesError) {
        console.error('❌ Erreur suppression factures récurrentes:', recurringInvoicesError);
      } else {
        console.log('✅ Factures récurrentes supprimées');
      }
      
      // Supprimer les rôles utilisateur
      const { error: userRolesError } = await supabase
        .from('user_roles')
        .delete()
        .or(`user_id.eq.${profileId},granted_by.eq.${profileId},revoked_by.eq.${profileId}`);
      if (userRolesError) {
        console.error('❌ Erreur suppression rôles utilisateur:', userRolesError);
      } else {
        console.log('✅ Rôles utilisateur supprimés');
      }
      
      // Maintenant supprimer le profil
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userIdStr);
      
      if (error) {
        console.error('❌ Erreur delete user:', error);
        throw error;
      }
      
      console.log('✅ User deleted:', { userId: userIdStr });
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Erreur delete user:', error);
      return { success: false, error };
    }
  }

  // Fonction pour récupérer les permissions module d'un utilisateur
  static async getUserModulePermissions(userId: string) {
    try {
      console.log('🔄 Get user module permissions:', { userId });
      
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ Erreur get user module permissions:', error);
        throw error;
      }
      
      console.log('✅ User module permissions retrieved:', data?.length || 0, 'permissions');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur get user module permissions:', error);
      return { data: null, error };
    }
  }

  // Upsert des permissions module pour un utilisateur
  static async upsertUserModulePermissions(userId: string, perms: Array<{ moduleName: string; canRead: boolean; canWrite: boolean; canDelete: boolean; canApprove: boolean }>) {
    try {
      console.log('💾 Upsert user module permissions:', { userId, count: perms.length });
      if (!userId || !Array.isArray(perms)) throw new Error('Paramètres invalides');

      const rows = perms.map(p => ({
        user_id: userId,
        module_name: p.moduleName,
        can_read: p.canRead,
        can_write: p.canWrite,
        can_delete: p.canDelete,
        can_approve: p.canApprove,
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('user_module_permissions')
        .upsert(rows, { onConflict: 'user_id,module_name' })
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur upsert user module permissions:', error);
      return { data: null, error };
    }
  }

  // ===== UTILISATEURS PAR IDS =====
  static async getUsersByIds(userIds: string[]) {
    try {
      if (userIds.length === 0) return { data: [], error: null };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération utilisateurs par IDs:', error);
      return { data: null, error };
    }
  }
  static async getProjects() {
    return await ApiHelper.get('projects', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async getProject(id: string) {
    return await ApiHelper.get(`projects?id=eq.${id}&select=*`);
  }

  static async createProject(project: Partial<Project>) {
    try {
      // Mapper les statuts vers les valeurs valides de la base
      const mapStatus = (status: string) => {
        switch (status?.toLowerCase()) {
          case 'not started':
          case 'not_started':
            return 'active';
          case 'in progress':
          case 'in_progress':
            return 'active';
          case 'completed':
            return 'completed';
          case 'cancelled':
            return 'cancelled';
          case 'on hold':
          case 'on_hold':
            return 'on_hold';
          default:
            return 'active';
        }
      };

      // Mapper les priorités vers les valeurs valides de la base
      const mapPriority = (priority: string) => {
        switch (priority?.toLowerCase()) {
          case 'low':
            return 'low';
          case 'medium':
            return 'medium';
          case 'high':
            return 'high';
          case 'urgent':
            return 'urgent';
          default:
            return 'medium';
        }
      };

      console.log('🔍 Données projet reçues:', {
        title: project.title,
        status: project.status,
        mappedStatus: mapStatus(project.status || 'active'),
        priority: project.priority,
        mappedPriority: mapPriority(project.priority || 'medium'),
        team: project.team,
        teamCount: project.team?.length || 0
      });

      // Convertir les membres d'équipe en UUIDs valides
      const teamMemberIds = project.team?.map(member => {
        // Si c'est déjà un UUID valide, l'utiliser tel quel
        if (member.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id)) {
          return member.id;
        }
        // Générer un vrai UUID
        return crypto.randomUUID();
      }) || [];

      console.log('🔍 Team members IDs:', teamMemberIds);
      console.log('🔍 Team members count:', teamMemberIds.length);

      // Formater les dates pour Supabase (format ISO avec timezone)
      const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toISOString();
      };

      // Récupérer l'utilisateur actuel pour définir owner_id
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Récupérer l'organization_id de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', currentUser?.id || '')
        .single();

      return await ApiHelper.post('projects', {
        name: project.title || '',
        description: project.description || '',
        status: mapStatus(project.status || 'active'),
        priority: mapPriority(project.priority || 'medium'),
        start_date: formatDate(project.startDate),
        end_date: formatDate(project.dueDate),
        budget: project.budget || null,
        client: project.clientName || null,
        team_members: teamMemberIds.length > 0 ? teamMemberIds : null,
        owner_id: currentUser?.id || null,
        organization_id: profile?.organization_id || null,
        tasks: project.tasks || [],
        risks: project.risks || []
      });
    } catch (error) {
      console.error('Erreur création projet:', error);
      return { data: null, error };
    }
  }

  static async updateProject(id: string, updates: Partial<Project>) {
    // Mapper les statuts vers les valeurs valides de la base
    const mapStatus = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'not started':
        case 'not_started':
          return 'active';
        case 'in progress':
        case 'in_progress':
          return 'active';
        case 'completed':
          return 'completed';
        case 'cancelled':
          return 'cancelled';
        case 'on hold':
        case 'on_hold':
          return 'on_hold';
        default:
          return 'active';
      }
    };

    // Mapper les priorités vers les valeurs valides de la base
    const mapPriority = (priority: string) => {
      switch (priority?.toLowerCase()) {
        case 'low':
          return 'low';
        case 'medium':
          return 'medium';
        case 'high':
          return 'high';
        case 'urgent':
          return 'urgent';
        default:
          return 'medium';
      }
    };

    // Extraire les IDs des membres de l'équipe
    const teamMemberIds = updates.team?.map(member => {
      // Si c'est déjà un UUID valide, l'utiliser tel quel
      if (member.id && typeof member.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id)) {
        return member.id;
      }
      // Si c'est un nombre (ancien format), le convertir en string
      if (member.id && typeof member.id === 'number') {
        return String(member.id);
      }
      // Si c'est une string qui n'est pas un UUID, l'utiliser quand même (peut être un ID valide)
      if (member.id && typeof member.id === 'string') {
        return member.id;
      }
      // Si aucun ID n'est fourni, ignorer ce membre (ne devrait pas arriver)
      console.warn('⚠️ DataService.updateProject - Membre sans ID valide:', member);
      return null;
    }).filter((id): id is string => id !== null && id !== undefined) || [];

    console.log('🔄 DataService.updateProject - Team members IDs:', teamMemberIds);

    return await ApiHelper.put('projects', id, {
      name: updates.title,
      description: updates.description,
      status: mapStatus(updates.status || 'active'),
      priority: mapPriority(updates.priority || 'medium'),
      start_date: updates.startDate,
      end_date: updates.dueDate,
      budget: updates.budget,
      client: updates.clientName,
      team_members: teamMemberIds.length > 0 ? teamMemberIds : null, // Inclure les membres de l'équipe
      tasks: updates.tasks || [],
      risks: updates.risks || [],
      updated_at: new Date().toISOString()
    });
  }

  static async deleteProject(id: string) {
    return await ApiHelper.delete('projects', id);
  }

  // ===== INVOICES =====
  static async getInvoices() {
    // Timeout augmenté à 30 secondes pour les factures (peut être lent)
    const result = await ApiHelper.get('invoices', { 
      select: '*', 
      order: 'created_at.desc' 
    }, 30000);
    
    // Log pour diagnostic
    if (result.data && Array.isArray(result.data)) {
      console.log('📊 DataService.getInvoices - Données brutes Supabase:', {
        count: result.data.length,
        statuses: [...new Set(result.data.map((inv: any) => inv.status))],
        partiallyPaidCount: result.data.filter((inv: any) => inv.status === 'partially_paid').length,
        sample: result.data.slice(0, 3).map((inv: any) => ({ 
          id: inv.id, 
          status: inv.status, 
          invoice_number: inv.invoice_number || inv.number,
          paid_amount: inv.paid_amount,
          amount: inv.amount
        }))
      });
    }
    
    return result;
  }

  static async createInvoice(invoice: Partial<Invoice>) {
    try {
      // Récupérer l'utilisateur actuel et son profil
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profil pour obtenir l'ID du profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      // Normaliser le status en minuscules
      const normalizedStatus = invoice.status?.toLowerCase().replace(' ', '_') || 'draft';
      
      // Préparer les données d'insertion - Colonnes obligatoires uniquement d'abord
      const invoiceNumber = invoice.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`;
      
      // Commencer avec les colonnes obligatoires seulement
      const insertData: any = {
        invoice_number: invoiceNumber, // Basé sur getInvoices qui utilise invoice.invoice_number
      client_name: invoice.clientName || '',
      amount: invoice.amount || 0,
        status: normalizedStatus,
        due_date: invoice.dueDate || null,
        user_id: profile.id
      };
      
      // Ajouter les colonnes optionnelles seulement si elles ont une valeur
      // (elles peuvent ne pas exister dans la table)
      if (invoice.paidDate) {
        insertData.paid_date = invoice.paidDate;
      }
      
      // Gérer paid_amount pour paiement partiel
      if (invoice.paidAmount !== undefined && invoice.paidAmount !== null) {
        const paidAmount = Number(invoice.paidAmount);
        if (!isNaN(paidAmount) && paidAmount > 0) {
          insertData.paid_amount = paidAmount;
        }
      }
      
      // Receipt (peut ne pas exister)
      if (invoice.receipt?.fileName) {
        insertData.receipt_file_name = invoice.receipt.fileName;
      }
      if (invoice.receipt?.dataUrl) {
        insertData.receipt_data_url = invoice.receipt.dataUrl;
      }
      
      if (invoice.recurringSourceId) {
        insertData.recurring_source_id = invoice.recurringSourceId;
      }
      
      console.log('📤 DataService.createInvoice - Données à insérer:', insertData);
      
      // Essayer d'abord avec 'invoice_number' (basé sur les logs getInvoices)
      let { data, error } = await supabase
        .from('invoices')
        .insert(insertData)
        .select()
        .single();
      
      // Si erreur liée à une colonne inexistante, essayer sans les colonnes optionnelles
      if (error && (error.message?.includes('column') || error.code === 'PGRST116' || error.code === '42703')) {
        console.log('⚠️ DataService.createInvoice - Erreur colonne, essai sans colonnes optionnelles');
        console.log('⚠️ Erreur:', error.message);
        
        // Créer un objet minimal avec seulement les colonnes obligatoires
        const minimalData: any = {
          invoice_number: insertData.invoice_number,
          client_name: insertData.client_name,
          amount: insertData.amount,
          status: insertData.status,
          due_date: insertData.due_date,
          user_id: insertData.user_id
        };
        
        // Si ça échoue encore, essayer avec 'number' au lieu de 'invoice_number'
        const retryResult = await supabase
          .from('invoices')
          .insert({
            ...minimalData,
            number: minimalData.invoice_number
          } as any)
          .select()
          .single();
        
        if (!retryResult.error) {
          // Si ça marche avec 'number'
          data = retryResult.data;
          error = null;
        } else {
          data = retryResult.data;
          error = retryResult.error;
        }
      }
      
      if (error) {
        console.error('❌ DataService.createInvoice - Erreur Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          insertData: insertData
        });
        throw error;
      }
      
      console.log('✅ DataService.createInvoice - Facture créée dans Supabase:', {
        id: data.id,
        number: data.number || data.invoice_number,
        status: data.status
      });
      
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ DataService.createInvoice - Erreur complète:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      return { data: null, error };
    }
  }

  static async updateInvoice(id: string, updates: Partial<Invoice>) {
    try {
      // Normaliser le status en minuscules
      const normalizedStatus = updates.status?.toLowerCase().replace(' ', '_');
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber;
      if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (normalizedStatus !== undefined) updateData.status = normalizedStatus;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate;
      if (updates.paidAmount !== undefined) {
        // Gérer paid_amount correctement (éviter NaN)
        if (updates.paidAmount !== null && updates.paidAmount !== undefined) {
          const paidAmount = Number(updates.paidAmount);
          if (!isNaN(paidAmount) && paidAmount > 0) {
            updateData.paid_amount = paidAmount;
          } else {
            updateData.paid_amount = null;
          }
        } else {
          updateData.paid_amount = null;
        }
      }
      if (updates.receipt !== undefined) {
        updateData.receipt_file_name = updates.receipt?.fileName || null;
        updateData.receipt_data_url = updates.receipt?.dataUrl || null;
      }
      if (updates.recurringSourceId !== undefined) updateData.recurring_source_id = updates.recurringSourceId;

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour facture:', error);
      return { data: null, error };
    }
  }

  static async deleteInvoice(id: string) {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression facture:', error);
      return { error };
    }
  }

  // ===== EXPENSES =====
  static async getExpenses() {
    return await ApiHelper.get('expenses', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async createExpense(expense: Partial<Expense>) {
    try {
      // Récupérer l'utilisateur actuel et son profil
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profil pour obtenir l'ID du profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      // Normaliser le status en minuscules
      const normalizedStatus = expense.status?.toLowerCase() || 'unpaid';
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          title: expense.description || '',
          amount: expense.amount || 0,
          category: expense.category || '',
          date: expense.date || new Date().toISOString().split('T')[0],
          due_date: expense.dueDate || null,
          description: expense.description || '',
          status: normalizedStatus,
          receipt_file_name: expense.receipt?.fileName || null,
          receipt_data_url: expense.receipt?.dataUrl || null,
          budget_item_id: expense.budgetItemId || null,
          recurring_source_id: expense.recurringSourceId || null,
          user_id: profile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création dépense:', error);
      return { data: null, error };
    }
  }

  static async updateExpense(id: string, updates: Partial<Expense>) {
    try {
      // Normaliser le status en minuscules
      const normalizedStatus = updates.status?.toLowerCase();
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.description !== undefined) {
        updateData.title = updates.description;
        updateData.description = updates.description;
      }
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (normalizedStatus !== undefined) updateData.status = normalizedStatus;
      if (updates.receipt !== undefined) {
        updateData.receipt_file_name = updates.receipt?.fileName || null;
        updateData.receipt_data_url = updates.receipt?.dataUrl || null;
      }
      if (updates.budgetItemId !== undefined) updateData.budget_item_id = updates.budgetItemId;
      if (updates.recurringSourceId !== undefined) updateData.recurring_source_id = updates.recurringSourceId;

      const { data, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour dépense:', error);
      return { data: null, error };
    }
  }

  static async deleteExpense(id: string) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression dépense:', error);
      return { error };
    }
  }

  // ===== RECURRING INVOICES =====
  static async getRecurringInvoices() {
    return await ApiHelper.get('recurring_invoices', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async createRecurringInvoice(recurringInvoice: Partial<any>) {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      const { data, error } = await supabase
        .from('recurring_invoices')
        .insert({
          client_name: recurringInvoice.clientName || '',
          amount: recurringInvoice.amount || 0,
          frequency: recurringInvoice.frequency?.toLowerCase() || 'monthly',
          start_date: recurringInvoice.startDate || new Date().toISOString().split('T')[0],
          end_date: recurringInvoice.endDate || null,
          last_generated_date: recurringInvoice.lastGeneratedDate || recurringInvoice.startDate || new Date().toISOString().split('T')[0],
          owner_id: profile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création facture récurrente:', error);
      return { data: null, error };
    }
  }

  static async updateRecurringInvoice(id: string, updates: Partial<any>) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency.toLowerCase();
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.lastGeneratedDate !== undefined) updateData.last_generated_date = updates.lastGeneratedDate;

      const { data, error } = await supabase
        .from('recurring_invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour facture récurrente:', error);
      return { data: null, error };
    }
  }

  static async deleteRecurringInvoice(id: string) {
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression facture récurrente:', error);
      return { error };
    }
  }

  // ===== RECURRING EXPENSES =====
  static async getRecurringExpenses() {
    return await ApiHelper.get('recurring_expenses', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async createRecurringExpense(recurringExpense: Partial<any>) {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          category: recurringExpense.category || '',
          description: recurringExpense.description || '',
          amount: recurringExpense.amount || 0,
          frequency: recurringExpense.frequency?.toLowerCase() || 'monthly',
          start_date: recurringExpense.startDate || new Date().toISOString().split('T')[0],
          end_date: recurringExpense.endDate || null,
          last_generated_date: recurringExpense.lastGeneratedDate || recurringExpense.startDate || new Date().toISOString().split('T')[0],
          owner_id: profile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création dépense récurrente:', error);
      return { data: null, error };
    }
  }

  static async updateRecurringExpense(id: string, updates: Partial<any>) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency.toLowerCase();
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.lastGeneratedDate !== undefined) updateData.last_generated_date = updates.lastGeneratedDate;

      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour dépense récurrente:', error);
      return { data: null, error };
    }
  }

  static async deleteRecurringExpense(id: string) {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression dépense récurrente:', error);
      return { error };
    }
  }

  // ===== BUDGETS =====
  static async getBudgets() {
    return await ApiHelper.get('budgets', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async getBudgetLines(budgetId: string) {
    return await ApiHelper.get('budget_lines', { 
      select: '*', 
      filter: `budget_id.eq.${budgetId}`,
      order: 'created_at.asc' 
    });
  }

  static async getBudgetItems(budgetLineId: string) {
    return await ApiHelper.get('budget_items', { 
      select: '*', 
      filter: `budget_line_id.eq.${budgetLineId}`,
      order: 'created_at.asc' 
    });
  }

  static async createBudget(budget: Partial<any>) {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          title: budget.title || '',
          type: budget.type?.toLowerCase() || 'project',
          amount: budget.amount || 0,
          start_date: budget.startDate || new Date().toISOString().split('T')[0],
          end_date: budget.endDate || new Date().toISOString().split('T')[0],
          project_id: budget.projectId || null,
          owner_id: profile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (budgetError) throw budgetError;

      // Créer les budget_lines et budget_items si fournis
      if (budgetData && budget.budgetLines && Array.isArray(budget.budgetLines)) {
        for (const line of budget.budgetLines) {
          const { data: lineData, error: lineError } = await supabase
            .from('budget_lines')
            .insert({
              budget_id: budgetData.id,
              title: line.title || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (lineError) {
            console.error('Erreur création ligne budget:', lineError);
            continue;
          }

          if (lineData && line.items && Array.isArray(line.items)) {
            for (const item of line.items) {
              await supabase
                .from('budget_items')
                .insert({
                  budget_line_id: lineData.id,
                  description: item.description || '',
                  amount: item.amount || 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
            }
          }
        }
      }

      return { data: budgetData, error: null };
    } catch (error) {
      console.error('Erreur création budget:', error);
      return { data: null, error };
    }
  }

  static async updateBudget(id: string, updates: Partial<any>) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.type !== undefined) updateData.type = updates.type.toLowerCase();
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.projectId !== undefined) updateData.project_id = updates.projectId;

      const { data, error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour budget:', error);
      return { data: null, error };
    }
  }

  static async deleteBudget(id: string) {
    try {
      // Les budget_lines et budget_items seront supprimés automatiquement via CASCADE
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression budget:', error);
      return { error };
    }
  }

  // ===== CONTACTS =====
  static async getContacts() {
    return await ApiHelper.get('contacts', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async createContact(contact: any) {
    try {
      // Extrait le prénom et nom depuis le champ 'name' si nécessaire
      let firstName = contact.firstName || '';
      let lastName = contact.lastName || '';
      
      // Si le contact a un champ 'name' (format du CRM), on le split
      if (contact.name && !firstName && !lastName) {
        const nameParts = contact.name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Convertit le status en minuscules pour correspondre à Supabase
      const statusMap: Record<string, string> = {
        'Lead': 'lead',
        'Contacted': 'contacted',
        'Prospect': 'prospect',
        'Customer': 'customer'
      };
      const supabaseStatus = statusMap[contact.status] || contact.status?.toLowerCase() || 'lead';
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: contact.workEmail || contact.email || '',
          phone: contact.officePhone || contact.mobilePhone || '',
          company: contact.company || '',
          position: contact.position,
          status: supabaseStatus,
          source: contact.source,
          notes: contact.notes,
          tags: contact.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création contact:', error);
      return { data: null, error };
    }
  }

  static async updateContact(id: string, updates: Partial<Contact>) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          email: updates.email,
          phone: updates.phone,
          company: updates.company,
          position: updates.position,
          status: updates.status,
          source: updates.source,
          notes: updates.notes,
          tags: updates.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour contact:', error);
      return { data: null, error };
    }
  }

  static async deleteContact(id: string) {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression contact:', error);
      return { error };
    }
  }

  // ===== TIME LOGS =====
  static async getTimeLogs() {
    return await ApiHelper.get('time_logs', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async createTimeLog(timeLog: Partial<TimeLog>) {
    try {
      // Récupérer l'utilisateur actuel et son profil
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profil pour obtenir l'ID du profil (pas l'ID auth)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();
      
      if (profileError || !profile) {
        console.error('❌ Erreur récupération profil:', profileError);
        throw new Error(`Profil non trouvé: ${profileError?.message || 'Profil introuvable'}`);
      }

      console.log('✅ Profil trouvé pour time log:', { profileId: profile.id, userId: currentUser.id });

      // Convertir duration (minutes) en hours si nécessaire
      const hours = timeLog.duration ? timeLog.duration / 60 : (timeLog.hours || 0);

      // Fonction pour vérifier si une string est un UUID valide
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Résoudre les IDs selon le type d'entité
      // IMPORTANT: Ne mettre project_id, course_id, task_id, meeting_id QUE si ce sont des UUIDs valides
      let projectId: string | null = null;
      let courseId: string | null = null;
      let taskId: string | null = null;
      let meetingId: string | null = null;

      const entityIdStr = typeof timeLog.entityId === 'string' ? timeLog.entityId : String(timeLog.entityId || '');

      if (timeLog.entityType === 'project') {
        // Si c'est un UUID valide, utiliser project_id, sinon utiliser uniquement entity_id (text)
        if (isValidUUID(entityIdStr)) {
          projectId = entityIdStr;
        }
        // Pour les cas comme "meeting", on laisse projectId à null et on utilise entity_id (text)
      } else if (timeLog.entityType === 'course') {
        // Course.id est un number, donc on ne peut pas l'utiliser comme UUID
        // On utilise uniquement entity_id (text)
        // Mais si on a un UUID de cours depuis Supabase, on peut l'utiliser
        if (isValidUUID(entityIdStr)) {
          courseId = entityIdStr;
        }
      } else if (timeLog.entityType === 'task') {
        // Les tâches ont des IDs comme "ai-task-1761739925911-2" qui ne sont pas des UUIDs
        // On utilise uniquement entity_id (text), pas task_id (UUID)
        // Mais si c'est un UUID valide, on peut l'utiliser
        if (isValidUUID(entityIdStr)) {
          taskId = entityIdStr;
        }
      }

      console.log('🔄 Tentative création time log avec:', {
        entityType: timeLog.entityType,
        entityId: entityIdStr,
        entityTitle: timeLog.entityTitle,
        projectId,
        courseId,
        taskId,
        meetingId
      });

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: profile.id, // Utiliser l'ID du profil
          project_id: projectId, // null si pas un UUID valide
          course_id: courseId, // null si pas un UUID valide
          task_id: taskId, // null si pas un UUID valide
          meeting_id: meetingId, // null si pas un UUID valide
          description: timeLog.description || '',
          duration: timeLog.duration || 0, // En minutes
          hours: hours, // En heures
          date: timeLog.date || new Date().toISOString().split('T')[0],
          entity_type: timeLog.entityType || 'project',
          entity_id: entityIdStr, // Toujours utiliser ce champ pour stocker l'ID (text)
          entity_title: timeLog.entityTitle || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur création time log:', error);
        throw error;
      }
      
      console.log('✅ Time log créé:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création log temps:', error);
      return { data: null, error };
    }
  }

  static async updateTimeLog(id: string, updates: Partial<TimeLog>) {
    try {
      const hours = updates.duration ? updates.duration / 60 : (updates.hours || 0);
      
      const { data, error } = await supabase
        .from('time_logs')
        .update({
          description: updates.description,
          duration: updates.duration,
          hours: hours,
          date: updates.date,
          entity_type: updates.entityType,
          entity_id: typeof updates.entityId === 'string' ? updates.entityId : String(updates.entityId || ''),
          entity_title: updates.entityTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour time log:', error);
      return { data: null, error };
    }
  }

  static async deleteTimeLog(id: string) {
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression time log:', error);
      return { error };
    }
  }

  // ===== MEETINGS =====
  static async getMeetings() {
    return await ApiHelper.get('meetings', { 
      select: '*', 
      order: 'start_time.desc' 
    });
  }

  static async createMeeting(meeting: Partial<Meeting>) {
    try {
      // Récupérer l'utilisateur actuel et son profil
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profil pour obtenir l'ID du profil (pas l'ID auth)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();
      
      if (profileError || !profile) {
        console.error('❌ Erreur récupération profil:', profileError);
        throw new Error(`Profil non trouvé: ${profileError?.message || 'Profil introuvable'}`);
      }

      console.log('✅ Profil trouvé pour meeting:', { profileId: profile.id, userId: currentUser.id });

      // Convertir les attendees (User[]) en array d'IDs de profils
      // Les attendees sont stockés en JSONB avec soit profile.id soit profile.user_id
      const attendeeIds: string[] = [];
      if (meeting.attendees && Array.isArray(meeting.attendees)) {
        // Si les attendees sont des objets User avec id (number), on doit les convertir
        // Pour l'instant, on stocke juste les IDs comme string
        attendeeIds.push(...meeting.attendees.map((a: any) => String(a.id || a)));
      }

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title: meeting.title || '',
          description: meeting.description || '',
          start_time: meeting.startTime || new Date().toISOString(),
          end_time: meeting.endTime || new Date().toISOString(),
          organizer_id: profile.id, // Utiliser l'ID du profil
          attendees: attendeeIds.length > 0 ? attendeeIds : [],
          meeting_url: meeting.meetingUrl || null,
          access_code: meeting.accessCode || null,
          meeting_platform: meeting.meetingPlatform || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur création meeting:', error);
        throw error;
      }
      
      console.log('✅ Meeting créé:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création réunion:', error);
      return { data: null, error };
    }
  }

  static async updateMeeting(id: string, updates: Partial<Meeting>) {
    try {
      const attendeeIds: string[] = [];
      if (updates.attendees && Array.isArray(updates.attendees)) {
        attendeeIds.push(...updates.attendees.map((a: any) => String(a.id || a)));
      }

      const { data, error } = await supabase
        .from('meetings')
        .update({
          title: updates.title,
          description: updates.description,
          start_time: updates.startTime,
          end_time: updates.endTime,
          attendees: attendeeIds.length > 0 ? attendeeIds : undefined,
          meeting_url: updates.meetingUrl !== undefined ? (updates.meetingUrl || null) : undefined,
          access_code: updates.accessCode !== undefined ? (updates.accessCode || null) : undefined,
          meeting_platform: updates.meetingPlatform !== undefined ? (updates.meetingPlatform || null) : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour réunion:', error);
      return { data: null, error };
    }
  }

  static async deleteMeeting(id: string) {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression réunion:', error);
      return { error };
    }
  }

  // ===== LEAVE REQUESTS =====
  static async getLeaveRequests() {
    return await ApiHelper.get('leave_requests', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  // Fonction pour valider les règles RH
  static async validateLeaveRequestRules(leaveRequest: Partial<LeaveRequest>, userId: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!leaveRequest.startDate || !leaveRequest.endDate) {
      return { valid: false, errors: ['Les dates sont requises'] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(leaveRequest.startDate);
    startDate.setHours(0, 0, 0, 0);
    const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Règle 1: Anticipation de 15 jours (sauf urgence)
    if (!leaveRequest.isUrgent && daysUntilStart < 15) {
      errors.push('La date de début doit être au moins 15 jours après la date de demande (préavis de 15 jours requis pour les congés non urgents).');
    }

    // Règle 2: Motif d'urgence obligatoire si urgence cochée
    if (leaveRequest.isUrgent && (!leaveRequest.urgencyReason || leaveRequest.urgencyReason.trim() === '')) {
      errors.push('Le motif d\'urgence est obligatoire lorsque le congé est marqué comme urgent.');
    }

    // Règle 3: Éligibilité (6 mois entre congés) - seulement si pas urgent
    if (!leaveRequest.isUrgent) {
      try {
        // Récupérer le dernier congé terminé de l'utilisateur
        const { data: previousLeaves } = await supabase
          .from('leave_requests')
          .select('end_date, status')
          .eq('user_id', userId)
          .in('status', ['approved', 'completed'])
          .order('end_date', { ascending: false })
          .limit(1);

        if (previousLeaves && previousLeaves.length > 0) {
          const lastLeaveEnd = new Date(previousLeaves[0].end_date);
          lastLeaveEnd.setHours(0, 0, 0, 0);
          
          // Calculer 6 mois après la fin du dernier congé
          const sixMonthsLater = new Date(lastLeaveEnd);
          sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
          
          if (startDate < sixMonthsLater) {
            const monthsWait = Math.ceil((sixMonthsLater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
            errors.push(`Vous devez attendre 6 mois après votre dernier congé avant d'en demander un nouveau. Délai restant: environ ${monthsWait} mois.`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la vérification de l\'éligibilité:', error);
        // Ne pas bloquer la demande si erreur de vérification
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static async createLeaveRequest(leaveRequest: Partial<LeaveRequest>) {
    try {
      // Récupérer l'utilisateur actuel et son profil
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profil pour obtenir l'ID du profil (pas l'ID auth)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, manager_id')
        .eq('user_id', currentUser.id)
        .single();
      
      if (profileError || !profile) {
        console.error('❌ Erreur récupération profil:', profileError);
        throw new Error(`Profil non trouvé: ${profileError?.message || 'Profil introuvable'}`);
      }

      console.log('✅ Profil trouvé pour leave request:', { profileId: profile.id, userId: currentUser.id });

      // Valider les dates
      if (!leaveRequest.startDate || !leaveRequest.endDate) {
        throw new Error('Les dates de début et de fin sont requises');
      }

      if (new Date(leaveRequest.endDate) < new Date(leaveRequest.startDate)) {
        throw new Error('La date de fin doit être après la date de début');
      }

      // Valider les règles RH
      const validation = await this.validateLeaveRequestRules(leaveRequest, profile.id);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: profile.id, // Utiliser l'ID du profil
          leave_type_id: leaveRequest.leaveTypeId || null,
          start_date: leaveRequest.startDate,
          end_date: leaveRequest.endDate,
          status: 'pending', // Toujours 'pending' à la création
          reason: leaveRequest.reason || '',
          leave_type: leaveRequest.leaveTypeName || 'annual_leave', // Fallback si pas de leave_type_id
          is_urgent: leaveRequest.isUrgent || false,
          urgency_reason: leaveRequest.isUrgent ? (leaveRequest.urgencyReason || '') : null,
          manager_id: profile.manager_id || null, // Récupérer le manager_id du profil
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur création demande congé:', error);
        throw error;
      }

      console.log('✅ Leave request créée:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création demande congé:', error);
      return { data: null, error };
    }
  }

  static async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    try {
      // Récupérer l'utilisateur actuel pour approver_id si statut change
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let approverProfileId = null;

      if (currentUser && (updates.status === 'approved' || updates.status === 'rejected')) {
        // Récupérer le profile.id de l'approbateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
        
        approverProfileId = profile?.id || null;
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Mettre à jour seulement les champs fournis
      if (updates.status) {
        // Normaliser le status en minuscules pour respecter la contrainte CHECK
        const normalizedStatus = updates.status.toLowerCase() as 'pending' | 'approved' | 'rejected' | 'cancelled';
        
        // Vérifier que le status est valide
        const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
        if (!validStatuses.includes(normalizedStatus)) {
          throw new Error(`Status invalide: ${updates.status}. Les valeurs autorisées sont: ${validStatuses.join(', ')}`);
        }
        
        updateData.status = normalizedStatus;
        if (approverProfileId) {
          updateData.approver_id = currentUser.id; // Supabase attend auth.users.id pour approver_id
        }
      }
      // Vérifier la validation hiérarchique si on approuve/rejette
      if (updates.status && (updates.status.toLowerCase() === 'approved' || updates.status.toLowerCase() === 'rejected') && currentUser) {
        // Récupérer la demande pour vérifier le manager_id
        const { data: existingRequest } = await supabase
          .from('leave_requests')
          .select('manager_id, user_id')
          .eq('id', id)
          .single();

        if (existingRequest) {
          // Récupérer le profil de l'approbateur
          const { data: approverProfile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('user_id', currentUser.id)
            .single();

          // Vérifier si l'approbateur est admin/super_admin OU le manager assigné
          const isAdmin = approverProfile?.role === 'administrator' || approverProfile?.role === 'super_administrator';
          const isManager = existingRequest.manager_id && approverProfile?.id === existingRequest.manager_id;

          if (!isAdmin && !isManager) {
            throw new Error('Seul le responsable assigné ou un administrateur peut approuver/rejeter cette demande.');
          }
        }
      }

      if (updates.reason !== undefined) updateData.reason = updates.reason;
      if (updates.rejectionReason !== undefined) updateData.rejection_reason = updates.rejectionReason;
      if (updates.approvalReason !== undefined) updateData.approval_reason = updates.approvalReason;
      if (updates.startDate) updateData.start_date = updates.startDate;
      if (updates.endDate) updateData.end_date = updates.endDate;
      if (updates.leaveTypeId !== undefined) updateData.leave_type_id = updates.leaveTypeId || null;
      if (updates.isUrgent !== undefined) updateData.is_urgent = updates.isUrgent;
      if (updates.urgencyReason !== undefined) updateData.urgency_reason = updates.urgencyReason;
      
      // Si on approuve, on nettoie rejection_reason. Si on rejette, on nettoie approval_reason
      if (updates.status) {
        const normalizedStatus = updates.status.toLowerCase();
        if (normalizedStatus === 'approved') {
          updateData.rejection_reason = null;
        } else if (normalizedStatus === 'rejected') {
          updateData.approval_reason = null;
        }
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur mise à jour demande congé:', error);
        throw error;
      }

      console.log('✅ Leave request mise à jour:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour demande congé:', error);
      return { data: null, error };
    }
  }

  static async deleteLeaveRequest(id: string) {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression demande congé:', error);
      return { error };
    }
  }

  static async getLeaveTypes() {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération types de congés:', error);
      return { data: null, error };
    }
  }

  // ===== COURSES =====
  static async getCourses() {
    return await ApiHelper.get('courses', { 
      select: '*', 
      order: 'created_at.desc' 
    });
  }

  static async createCourse(course: Partial<Course>) {
    try {
      // Convertir duration en nombre si c'est une string (ex: "6 Weeks" -> nombre d'heures)
      let durationValue = 0;
      if (typeof course.duration === 'string') {
        // Extraire le nombre (ex: "6 Weeks" -> 6)
        const match = course.duration.match(/\d+/);
        durationValue = match ? parseInt(match[0]) * 40 : 0; // Approximation: 40h par semaine
      } else {
        durationValue = course.duration || 0;
      }

      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: course.title || '',
          description: course.description || '',
          instructor: course.instructor || '',
          instructor_id: course.instructorId || null,
          duration: durationValue,
          level: course.level || 'beginner',
          category: course.category || '',
          price: course.price || 0,
          status: course.status || 'draft',
          thumbnail_url: course.thumbnailUrl || null,
          target_students: course.targetStudents || null,
          youtube_url: course.youtubeUrl || null,
          drive_url: course.driveUrl || null,
          other_links: course.otherLinks || null,
          requires_final_validation: !!course.requiresFinalValidation,
          sequential_modules: !!course.sequentialModules,
          course_materials: course.courseMaterials || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Course créé:', data.id);
      
      // Sauvegarder les modules et leçons si présents
      if (course.modules && course.modules.length > 0) {
        console.log('📦 Sauvegarde modules pour cours:', data.id);
        
        for (let mIndex = 0; mIndex < course.modules.length; mIndex++) {
          const module = course.modules[mIndex];
          
          // Créer le module
          const { data: moduleData, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
              course_id: data.id,
              title: module.title || 'Untitled Module',
              order_index: mIndex + 1,
              requires_validation: module.requiresValidation ?? false,
              unlocks_next_module: module.unlocksNextModule ?? true,
              evidence_documents: module.evidenceDocuments || [],
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (moduleError) {
            console.error(`❌ Erreur création module ${mIndex}:`, moduleError);
            continue;
          }
          
          console.log(`✅ Module créé: ${moduleData.id}`);
          
          // Créer les leçons pour ce module
          if (module.lessons && module.lessons.length > 0) {
            for (let lIndex = 0; lIndex < module.lessons.length; lIndex++) {
              const lesson = module.lessons[lIndex];
              
              const { data: lessonData, error: lessonError } = await supabase
                .from('course_lessons')
                .insert({
                  module_id: moduleData.id,
                  title: lesson.title || 'Untitled Lesson',
                  type: lesson.type || 'video',
                  duration: lesson.duration || '0 min',
                  description: lesson.description || null,
                  content_url: lesson.contentUrl || null,
                  attachments: lesson.attachments || [],
                  external_links: lesson.externalLinks || [],
                  order_index: lIndex + 1,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (lessonError) {
                console.error(`❌ Erreur création leçon ${lIndex}:`, lessonError);
              } else {
                console.log(`✅ Leçon créée: ${lessonData.id}`);
              }
            }
          }
        }
        
        console.log('✅ Modules et leçons sauvegardés pour le cours');
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur création cours:', error);
      return { data: null, error };
    }
  }

  static async updateCourse(id: string, updates: Partial<Course>) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Filtrer seulement les champs qui existent réellement dans la table courses de Supabase
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.instructor !== undefined) updateData.instructor = updates.instructor;
      if (updates.instructorId !== undefined) updateData.instructor_id = updates.instructorId;
      if (updates.duration !== undefined) {
        // Convertir duration en nombre si c'est une string
        if (typeof updates.duration === 'string') {
          const match = updates.duration.match(/\d+/);
          updateData.duration = match ? parseInt(match[0]) * 40 : 0;
        } else {
          updateData.duration = updates.duration;
        }
      }
      if (updates.level !== undefined) updateData.level = updates.level;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;
      if (updates.targetStudents !== undefined) updateData.target_students = updates.targetStudents;
      if (updates.youtubeUrl !== undefined) updateData.youtube_url = updates.youtubeUrl;
      if (updates.driveUrl !== undefined) updateData.drive_url = updates.driveUrl;
      if (updates.otherLinks !== undefined) updateData.other_links = updates.otherLinks;
      if (updates.requiresFinalValidation !== undefined) updateData.requires_final_validation = updates.requiresFinalValidation;
      if (updates.sequentialModules !== undefined) updateData.sequential_modules = updates.sequentialModules;
      if (updates.courseMaterials !== undefined) updateData.course_materials = updates.courseMaterials;

      // Ignorer les champs calculés : modules, completedLessons, progress
      // Ces champs ne sont pas stockés dans la table courses

      console.log('🔄 Mise à jour course avec data:', updateData);

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        throw error;
      }
      console.log('✅ Course mis à jour:', data.id);

      // Mettre à jour les modules et leçons si fournis
      if (updates.modules) {
        const { data: existingModules, error: fetchModulesError } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', id);

        if (fetchModulesError) {
          console.error('❌ Erreur récupération modules avant mise à jour:', fetchModulesError);
          throw fetchModulesError;
        }

        const moduleIds = (existingModules || []).map((module: any) => module.id);

        if (moduleIds.length > 0) {
          const { error: deleteLessonsError } = await supabase
            .from('course_lessons')
            .delete()
            .in('module_id', moduleIds);

          if (deleteLessonsError) {
            console.error('❌ Erreur suppression leçons existantes:', deleteLessonsError);
            throw deleteLessonsError;
          }

          const { error: deleteModulesError } = await supabase
            .from('course_modules')
            .delete()
            .in('id', moduleIds);

          if (deleteModulesError) {
            console.error('❌ Erreur suppression modules existants:', deleteModulesError);
            throw deleteModulesError;
          }
        }

        for (let mIndex = 0; mIndex < updates.modules.length; mIndex++) {
          const module = updates.modules[mIndex];

          const { data: moduleData, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
              course_id: id,
              title: module.title || 'Untitled Module',
              order_index: mIndex + 1,
              requires_validation: module.requiresValidation ?? false,
              unlocks_next_module: module.unlocksNextModule ?? true,
              evidence_documents: module.evidenceDocuments || [],
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (moduleError) {
            console.error(`❌ Erreur création module lors mise à jour ${mIndex}:`, moduleError);
            throw moduleError;
          }

          if (module.lessons && module.lessons.length > 0) {
            for (let lIndex = 0; lIndex < module.lessons.length; lIndex++) {
              const lesson = module.lessons[lIndex];

              const { error: lessonError } = await supabase
                .from('course_lessons')
                .insert({
                  module_id: moduleData.id,
                  title: lesson.title || 'Untitled Lesson',
                  type: lesson.type || 'video',
                  duration: lesson.duration || '0 min',
                  description: lesson.description || null,
                  content_url: lesson.contentUrl || null,
                  attachments: lesson.attachments || [],
                  external_links: lesson.externalLinks || [],
                  order_index: lIndex + 1,
                  created_at: new Date().toISOString()
                });

              if (lessonError) {
                console.error(`❌ Erreur création leçon lors mise à jour ${lIndex}:`, lessonError);
                throw lessonError;
              }
            }
          }
        }
        console.log('✅ Modules et leçons mis à jour pour le cours', id);
      }

      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur mise à jour cours:', error);
      return { data: null, error };
    }
  }

  static async deleteCourse(id: string) {
    try {
      // 1. Récupérer les modules liés au cours
      const { data: modules, error: modulesFetchError } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', id);

      if (modulesFetchError) {
        throw modulesFetchError;
      }

      const moduleIds = (modules || []).map((module: any) => module.id);

      // 2. Supprimer les leçons associées
      if (moduleIds.length > 0) {
        const { error: lessonsDeleteError } = await supabase
          .from('course_lessons')
          .delete()
          .in('module_id', moduleIds);

        if (lessonsDeleteError) {
          throw lessonsDeleteError;
        }
      }

      // 3. Supprimer les modules
      if (moduleIds.length > 0) {
        const { error: modulesDeleteError } = await supabase
          .from('course_modules')
          .delete()
          .eq('course_id', id);

        if (modulesDeleteError) {
          throw modulesDeleteError;
        }
      }

      // 4. Supprimer les inscriptions (course_enrollments)
      const { error: enrollmentsDeleteError } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('course_id', id);

      if (enrollmentsDeleteError) {
        throw enrollmentsDeleteError;
      }

      // 5. Supprimer les time logs liés au cours
      const { data: timeLogs, error: timeLogsSelectError } = await supabase
        .from('time_logs')
        .select('id')
        .eq('entity_type', 'course')
        .eq('entity_id', id);

      if (timeLogsSelectError) {
        throw timeLogsSelectError;
      }

      if ((timeLogs || []).length > 0) {
        const timeLogIds = (timeLogs || []).map((log: any) => log.id);
        const { error: timeLogsDeleteError } = await supabase
          .from('time_logs')
          .delete()
          .in('id', timeLogIds);

        if (timeLogsDeleteError) {
          throw timeLogsDeleteError;
        }
      }

      // 6. Supprimer le cours
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Course supprimé:', id);
      return { error: null };
    } catch (error) {
      console.error('❌ Erreur suppression cours:', error);
      return { error };
    }
  }

  // Fonction pour charger les modules et leçons d'un cours
  static async getCourseModules(courseId: string) {
    try {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          id,
          title,
          order_index,
          requires_validation,
          unlocks_next_module,
          evidence_documents,
          lessons:course_lessons(*)
        `)
        .eq('course_id', courseId)
        .order('order_index');
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur récupération modules:', error);
      return { data: null, error };
    }
  }

  // Fonction pour récupérer la progression d'un utilisateur pour un cours
  static async getCourseEnrollment(courseId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        const details = `${error.code || ''} ${error.details || ''} ${error.message || ''}`.toLowerCase();
        if (details.includes('0 rows') || error.code === 'PGRST116') {
          return { data: null, error: null };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur récupération enrollment:', error);
      return { data: null, error };
    }
  }

  // Fonction pour créer ou mettre à jour l'enrollment (inscription + progression + notes)
  static async upsertCourseEnrollment(
    courseId: string, 
    userId: string, 
    progress: number, 
    completedLessons: string[], 
    notes?: Record<string, string>
  ) {
    try {
      // Vérifier si l'enrollment existe déjà
      const existing = await this.getCourseEnrollment(courseId, userId);
      
      const updateData: any = {
        progress,
        completed_lessons: completedLessons,
        updated_at: new Date().toISOString()
      };
      
      // Ajouter les notes si fournies
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      if (existing.data) {
        // Mettre à jour l'enrollment existant
        const { data, error } = await supabase
          .from('course_enrollments')
          .update(updateData)
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) throw error;
        console.log('✅ Enrollment mis à jour:', data.id);
        return { data, error: null };
      } else {
        // Créer un nouvel enrollment
        const insertData: any = {
          course_id: courseId,
          user_id: userId,
          progress,
          completed_lessons: completedLessons,
          status: 'active',
          enrolled_at: new Date().toISOString()
        };
        
        // Ajouter les notes si fournies
        if (notes !== undefined) {
          insertData.notes = notes;
        }
        
        const { data, error } = await supabase
          .from('course_enrollments')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        console.log('✅ Enrollment créé:', data.id);
        return { data, error: null };
      }
    } catch (error) {
      console.error('❌ Erreur upsert enrollment:', error);
      return { data: null, error };
    }
  }

  // ===== OBJECTIVES =====
  static async getObjectives() {
    try {
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération objectifs:', error);
      return { data: null, error };
    }
  }

  static async createObjective(objective: Partial<Objective>) {
    try {
      // Récupérer l'utilisateur actuel pour définir owner_id
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profil pour obtenir l'ID du profil (pas l'ID auth)
      // car objectives.owner_id référence profiles.id, pas auth.users.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', currentUser.id)
        .single();
      
      if (profileError || !profile) {
        console.error('❌ Erreur récupération profil:', {
          userId: currentUser.id,
          profileError,
          profile
        });
        throw new Error(`Profil non trouvé pour l'utilisateur: ${profileError?.message || 'Profil introuvable'}`);
      }

      console.log('✅ Profil trouvé:', {
        profileId: profile.id,
        userId: currentUser.id,
        fullName: profile.full_name
      });

      const ownerName = profile.full_name || currentUser.email || 'Utilisateur';

      console.log('🔄 Tentative création objectif avec:', {
        title: objective.title,
        owner_id: profile.id,
        project_id: objective.projectId
      });

      const { data, error } = await supabase
        .from('objectives')
        .insert({
          title: objective.title || '',
          description: objective.description,
          quarter: objective.quarter || 'Q4',
          year: objective.year || new Date().getFullYear(),
          owner_id: profile.id, // Utiliser l'ID du profil, pas l'ID auth
          status: objective.status || 'active',
          progress: objective.progress || 0,
          priority: objective.priority || 'Medium',
          start_date: objective.startDate,
          end_date: objective.endDate,
          category: objective.category,
          owner_name: ownerName,
          team_members: objective.teamMembers || [],
          key_results: objective.keyResults || [],
          project_id: objective.projectId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création objectif:', error);
      return { data: null, error };
    }
  }

  static async updateObjective(id: string, updates: Partial<Objective>) {
    try {
      const { data, error } = await supabase
        .from('objectives')
        .update({
          title: updates.title,
          description: updates.description,
          quarter: updates.quarter,
          year: updates.year,
          owner_id: updates.ownerId,
          status: updates.status,
          progress: updates.progress,
          priority: updates.priority,
          start_date: updates.startDate,
          end_date: updates.endDate,
          category: updates.category,
          owner_name: updates.ownerName,
          team_members: updates.teamMembers,
          key_results: updates.keyResults,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour objectif:', error);
      return { data: null, error };
    }
  }

  static async deleteObjective(id: string) {
    try {
      const { data, error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur suppression objectif:', error);
      return { data: null, error };
    }
  }

  // ===== DOCUMENTS (KNOWLEDGE BASE) =====
  static async getDocuments() {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profile.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', currentUser.user.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur introuvable');
      }

      // Récupérer les documents avec leurs favoris
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (docError) throw docError;

      // Récupérer les favoris de l'utilisateur
      const { data: userFavorites } = await supabase
        .from('document_favorites')
        .select('document_id')
        .eq('user_id', profile.id);

      const favoriteIds = new Set(userFavorites?.map(f => f.document_id) || []);

      // Marquer les favoris dans les documents
      const documentsWithFavorites = documents?.map(doc => ({
        ...doc,
        is_favorite: favoriteIds.has(doc.id)
      })) || [];
      
      console.log('✅ Documents récupérés:', documentsWithFavorites.length);
      return { data: documentsWithFavorites, error: null };
    } catch (error) {
      console.error('❌ Erreur récupération documents:', error);
      return { data: null, error };
    }
  }

  static async createDocument(document: Partial<Document>) {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le profile.id et full_name pour created_by_id et created_by_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', currentUser.user.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur introuvable');
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: document.title || '',
          content: document.content || '',
          description: document.description || null,
          created_by_id: profile.id,
          created_by_name: profile.full_name || currentUser.user.email || 'Utilisateur',
          category: document.category || null,
          tags: document.tags || null,
          is_public: document.isPublic ?? false,
          view_count: 0,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur création document:', error);
        throw error;
      }

      console.log('✅ Document créé:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur création document:', error);
      return { data: null, error };
    }
  }

  static async updateDocument(id: string, updates: Partial<Document>) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.category !== undefined) updateData.category = updates.category || null;
      if (updates.tags !== undefined) updateData.tags = updates.tags || null;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
      // Incrémenter la version si le contenu change
      if (updates.content !== undefined) {
        const { data: currentDoc } = await supabase
          .from('documents')
          .select('version')
          .eq('id', id)
          .single();
        updateData.version = (currentDoc?.version || 1) + 1;
      }

      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur mise à jour document:', error);
        throw error;
      }

      console.log('✅ Document mis à jour:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur mise à jour document:', error);
      return { data: null, error };
    }
  }

  static async deleteDocument(id: string) {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Erreur suppression document:', error);
        throw error;
      }

      console.log('✅ Document supprimé:', id);
      return { error: null };
    } catch (error) {
      console.error('❌ Erreur suppression document:', error);
      return { error };
    }
  }

  // ===== NOTIFICATIONS =====
  static async getNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      return { data: null, error };
    }
  }

  static async createNotification(notification: any) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId || '',
          message: notification.message || '',
          type: notification.type || 'info',
          entity_id: notification.entityId,
          read: notification.read || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création notification:', error);
      return { data: null, error };
    }
  }

  static async markNotificationAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur marquage notification:', error);
      return { error };
    }
  }

  // Gestion des rapports de projet
  static async createProjectReport(reportData: any) {
    try {
      const { data, error } = await supabase
        .from('project_reports')
        .insert({
          project_id: reportData.projectId,
          title: reportData.title,
          content: reportData.content,
          type: reportData.type,
          created_by: reportData.createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création rapport:', error);
      return { data: null, error };
    }
  }

  static async getProjectReports(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération rapports:', error);
      return { data: [], error };
    }
  }

  static async deleteProjectReport(reportId: string) {
    try {
      const { error } = await supabase
        .from('project_reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression rapport:', error);
      return { error };
    }
  }

  // ===== JOBS =====
  static async getJobs() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erreur récupération jobs:', error);
        return { data: [], error: null }; // Retourner tableau vide au lieu de null
      }
      
      console.log('📊 API GET jobs - Résultat:', data?.length || 0, 'éléments');
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Erreur récupération jobs:', error);
      return { data: [], error };
    }
  }

  static async createJob(job: any) {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const jobData = {
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        description: job.description,
        required_skills: job.requiredSkills || [],
        status: job.status || 'draft',
        sector: job.sector || null,
        experience_level: job.experienceLevel || null,
        remote_work: job.remoteWork || null,
        salary: job.salary || null,
        benefits: job.benefits || null,
        education: job.education || null,
        languages: job.languages || null,
        application_link: job.applicationLink || null,
        application_email: job.applicationEmail || null,
        company_website: job.companyWebsite || null,
        created_by: currentUser.user.id,
        applicants: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Job créé:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur création job:', error);
      return { data: null, error };
    }
  }

  static async updateJob(id: number, updates: any) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.company !== undefined) updateData.company = updates.company;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.requiredSkills !== undefined) updateData.required_skills = updates.requiredSkills;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.sector !== undefined) updateData.sector = updates.sector;
      if (updates.experienceLevel !== undefined) updateData.experience_level = updates.experienceLevel;
      if (updates.remoteWork !== undefined) updateData.remote_work = updates.remoteWork;
      if (updates.salary !== undefined) updateData.salary = updates.salary;
      if (updates.benefits !== undefined) updateData.benefits = updates.benefits;
      if (updates.education !== undefined) updateData.education = updates.education;
      if (updates.languages !== undefined) updateData.languages = updates.languages;
      if (updates.applicationLink !== undefined) updateData.application_link = updates.applicationLink;
      if (updates.applicationEmail !== undefined) updateData.application_email = updates.applicationEmail;
      if (updates.companyWebsite !== undefined) updateData.company_website = updates.companyWebsite;

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Job mis à jour:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur mise à jour job:', error);
      return { data: null, error };
    }
  }

  static async deleteJob(id: number) {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ Job supprimé:', id);
      return { error: null };
    } catch (error) {
      console.error('❌ Erreur suppression job:', error);
      return { error };
    }
  }

  // ===== ACTIVITY LOGS =====
  static async getActivityLogs(entityType?: string, entityId?: string) {
    try {
      // Construire l'URL avec les filtres Supabase
      let url = 'activity_logs?select=*&order=created_at.desc&limit=100';
      
      if (entityType) {
        url += `&entity_type=eq.${entityType}`;
      }
      
      if (entityId) {
        url += `&entity_id=eq.${entityId}`;
      }

      // Utiliser fetch directement avec le format Supabase
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tdwbqgyubigaurnjzbfv.supabase.co';
      const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd2JxZ3l1YmlnYXVybmp6YmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODA2NzEsImV4cCI6MjA3NjU1NjY3MX0.bmGr3gY0GFeJelVIq8xwZJ6xaZhb-L-SAhn6ypg6zzU';
      
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || apiKey;

      const response = await fetch(`${baseUrl}/rest/v1/${url}`, {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération activity logs:', error);
      return { data: null, error };
    }
  }

  // Récupérer l'historique pour une entité spécifique
  static async getEntityActivityHistory(entityType: string, entityId: string) {
    return this.getActivityLogs(entityType, entityId);
  }
}

export default DataService;
