import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { User, Role, SENEGEL_RESERVED_ROLES } from '../types';
import OrganizationService from '../services/organizationService';
import DataAdapter from '../services/dataAdapter';
import UserModulePermissions from './UserModulePermissions';
import UserProfileEdit from './UserProfileEdit';
import ConfirmationModal from './common/ConfirmationModal';
import { RealtimeService } from '../services/realtimeService';
import { supabase } from '../services/supabaseService';
import AccessDenied from './common/AccessDenied';

const UserEditModal: React.FC<{
    user: User;
    onClose: () => void;
    onSave: (userId: number, newRole: Role) => void;
    isLoading?: boolean;
    allUsers?: User[];
    currentUserId?: string;
    canAssignReservedRoles: boolean;
}> = ({ user, onClose, onSave, isLoading = false, allUsers = [], currentUserId, canAssignReservedRoles }) => {
    const { t } = useLocalization();
    const [selectedRole, setSelectedRole] = useState<Role>(user.role);
    const PROTECTED_ROLES: Role[] = ['super_administrator', 'administrator', 'manager'];
    
    // Vérifier si l'utilisateur actuel est le dernier Super Admin
    const isLastSuperAdmin = user.role === 'super_administrator' && 
        allUsers.filter(u => u.role === 'super_administrator').length === 1;
    
    // Vérifier si on change un Super Admin vers un rôle non-protégé
    const isChangingFromAdminToNonAdmin = PROTECTED_ROLES.includes(user.role) && !PROTECTED_ROLES.includes(selectedRole);
    
    // Vérifier si c'est l'utilisateur actuellement connecté qui change de rôle
    const isChangingCurrentUser = currentUserId && String(user.id) === String(currentUserId);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Protection : Ne pas permettre de retirer le dernier Super Admin
        if (isLastSuperAdmin && selectedRole !== 'super_administrator') {
            alert('Impossible de changer le rôle du dernier Super Administrateur. Il doit rester Super Admin pour maintenir la sécurité de la plateforme.');
            return;
        }
        
        // Protection : Avertir si on retire le rôle d'admin à un utilisateur
        if (isChangingFromAdminToNonAdmin) {
            const confirmed = window.confirm(
                `Attention ! Vous êtes sur le point de retirer le rôle d'administration à "${user.name}". ` +
                `Cette action supprimera son accès au Management Ecosysteia. ` +
                `Êtes-vous sûr de vouloir continuer ?`
            );
            if (!confirmed) return;
        }
        
        // Avertir si c'est l'utilisateur actuellement connecté qui change de rôle
        if (isChangingCurrentUser) {
            const confirmed = window.confirm(
                `Attention ! Vous modifiez votre propre rôle. ` +
                `Cette action pourrait affecter vos accès. ` +
                `Voulez-vous continuer ?`
            );
            if (!confirmed) return;
        }
        
        onSave(user.id, selectedRole);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold">{t('assign_role')} pour {user.name}</h2>
                    </div>
                    <div className="p-6">
                        <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">{t('user_role')}</label>
                        <select
                            id="role-select"
                            value={selectedRole}
                            onChange={e => setSelectedRole(e.target.value as Role)}
                            disabled={isLoading}
                            className={`mt-1 block w-full p-2 border border-gray-300 rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                        >
                            <optgroup label={t('youth')}>
                                <option value="student">{t('student')}</option>
                                <option value="alumni">{t('alumni')}</option>
                            </optgroup>
                            <optgroup label={t('entrepreneur_category')}>
                                <option value="entrepreneur">{t('entrepreneur')}</option>
                                <option value="employer">{t('employer')}</option>
                                <option value="implementer">{t('implementer')}</option>
                                <option value="funder">{t('funder')}</option>
                            </optgroup>
                            <optgroup label={t('contributor_category')}>
                                <option value="trainer">{t('trainer')}</option>
                                <option value="coach">{t('coach')}</option>
                                <option value="facilitator">{t('facilitator')}</option>
                                <option value="mentor">{t('mentor')}</option>
                                <option value="partner_facilitator">{t('partner_facilitator')}</option>
                                <option value="publisher">{t('publisher')}</option>
                                <option value="editor">{t('editor')}</option>
                                <option value="producer">{t('producer')}</option>
                                <option value="artist">{t('artist')}</option>
                            </optgroup>
                            <optgroup label={t('staff_category')}>
                                <option value="intern" disabled={!canAssignReservedRoles}>{t('intern')}{!canAssignReservedRoles ? ' (SENEGEL)' : ''}</option>
                                <option value="supervisor" disabled={!canAssignReservedRoles}>{t('supervisor')}{!canAssignReservedRoles ? ' (SENEGEL)' : ''}</option>
                                <option value="manager" disabled={!canAssignReservedRoles}>{t('manager')}{!canAssignReservedRoles ? ' (SENEGEL)' : ''}</option>
                                <option value="administrator" disabled={!canAssignReservedRoles}>{t('administrator')}{!canAssignReservedRoles ? ' (SENEGEL)' : ''}</option>
                            </optgroup>
                            <optgroup label={t('super_admin_category')}>
                                <option value="super_administrator" disabled={!canAssignReservedRoles}>{t('super_administrator')}{!canAssignReservedRoles ? ' (SENEGEL)' : ''}</option>
                            </optgroup>
                        </select>
                        
                        {isLastSuperAdmin && (
                            <p className="mt-2 text-sm text-yellow-600">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Cet utilisateur est le dernier Super Administrateur. Il doit rester Super Admin.
                            </p>
                        )}
                        {!canAssignReservedRoles && SENEGEL_RESERVED_ROLES.includes(selectedRole) && (
                            <p className="mt-2 text-sm text-red-600">
                                <i className="fas fa-lock mr-1"></i>
                                Ce rôle est réservé à SENEGEL et ne peut être attribué que par un administrateur SENEGEL.
                            </p>
                        )}
                        
                        {isChangingFromAdminToNonAdmin && selectedRole !== user.role && (
                            <p className="mt-2 text-sm text-orange-600">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Attention : Cet utilisateur perdra son accès au Management Ecosysteia.
                            </p>
                        )}
                        
                        {isChangingCurrentUser && selectedRole !== user.role && (
                            <p className="mt-2 text-sm text-blue-600">
                                <i className="fas fa-info-circle mr-1"></i>
                                Vous modifiez votre propre rôle. Cela affectera vos accès.
                            </p>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isLoading}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading || (isLastSuperAdmin && selectedRole !== 'super_administrator')}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                        >
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                            {isLoading ? 'Enregistrement...' : t('save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface UserManagementProps {
    users: User[];
    onUpdateUser: (user: User) => void;
    onToggleActive?: (userId: string | number, isActive: boolean) => void;
    onDeleteUser?: (userId: string | number) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUpdateUser, onToggleActive, onDeleteUser }) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const { canAccessModule, hasPermission } = useModulePermissions();
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, inactive
    const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'permissions'>('users');
    const [canAssignReservedRoles, setCanAssignReservedRoles] = useState(false);
    const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

    const canReadModule = canAccessModule('user_management');
    const canWriteModule = hasPermission('user_management', 'write');
    const canDeleteModule = hasPermission('user_management', 'delete');

    // Déterminer si l'assignation des rôles réservés SENEGEL est autorisée
    useEffect(() => {
        const checkPermission = async () => {
            try {
                const org = await OrganizationService.getCurrentUserOrganization();
                const isSenegel = (org?.slug || '').toLowerCase() === 'senegel' || (org?.name || '').toLowerCase() === 'senegel';
                const isAdmin = currentUser?.role === 'super_administrator';
                setCanAssignReservedRoles(Boolean(isSenegel && isAdmin));
            } catch (e) {
                setCanAssignReservedRoles(false);
            }
        };
        checkPermission();
    }, [currentUser]);
    
    // Rôles protégés contre la suppression (SEULEMENT super_administrator)
    const PROTECTED_ROLES: Role[] = ['super_administrator'];

    // Realtime subscription pour les profils
    useEffect(() => {
        const channel = supabase
            .channel('profiles-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles'
            }, (payload) => {
                console.log('🔄 Changement Realtime profiles:', payload.eventType, payload.new);
                
                // Mettre à jour la liste des utilisateurs
                if (payload.eventType === 'UPDATE' && payload.new) {
                    const updatedProfile = payload.new as any;
                    const userToUpdate = users.find(u => {
                        // Vérifier si c'est le même utilisateur (user_id ou id)
                        return String(u.id) === String(updatedProfile.user_id) || String(u.id) === String(updatedProfile.id);
                    });
                    
                    if (userToUpdate) {
                        const updatedUser: User = {
                            ...userToUpdate,
                            role: updatedProfile.role as Role,
                            isActive: updatedProfile.is_active ?? true,
                            name: updatedProfile.full_name,
                            fullName: updatedProfile.full_name,
                            email: updatedProfile.email,
                            avatar: updatedProfile.avatar_url || '',
                            phone: updatedProfile.phone_number || '',
                            phoneNumber: updatedProfile.phone_number || '',
                            location: updatedProfile.location || '',
                            skills: updatedProfile.skills || [],
                            bio: updatedProfile.bio || '',
                            lastLogin: updatedProfile.last_login || userToUpdate.lastLogin,
                            createdAt: updatedProfile.created_at || userToUpdate.createdAt,
                            updatedAt: updatedProfile.updated_at || userToUpdate.updatedAt
                        };
                        onUpdateUser(updatedUser);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [users, onUpdateUser]);

    // Toggle Component réutilisable
    const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string }> = ({ checked, onChange, disabled = false, label }) => (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                checked ? 'bg-emerald-600' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={label}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );

    const handleEdit = (userToEdit: User) => {
        if (!canWriteModule) return;
        setSelectedUser(userToEdit);
        setModalOpen(true);
    };
    
    const handleEditProfile = (userToEdit: User) => {
        if (!canWriteModule) return;
        setProfileUser(userToEdit);
        setProfileModalOpen(true);
    };
    
    const handleSaveRole = async (userId: number, newRole: Role) => {
        if (!canWriteModule) return;
        const userToUpdate = users.find(u => u.id === userId);
        if(!userToUpdate) {
            console.error('❌ Utilisateur non trouvé pour modification rôle');
            return;
        }
        
        console.log('🔄 Modification rôle:', { userId, oldRole: userToUpdate.role, newRole });
        setIsUpdatingRole(true);
        try {
            await onUpdateUser({...userToUpdate, role: newRole});
            console.log('✅ Rôle modifié avec succès');
            
            // Message de succès
            if (typeof window !== 'undefined' && (window as any).Toast) {
                (window as any).Toast.success(`Rôle modifié avec succès en ${newRole}`);
            }
            
            // Déclencher le rechargement des permissions dans toute l'app
            window.dispatchEvent(new Event('permissions-reload'));
            console.log('📢 Event permissions-reload déclenché');
            
            // Attendre un peu pour que la mise à jour soit visible
            setTimeout(() => {
                setIsUpdatingRole(false);
        setModalOpen(false);
        setSelectedUser(null);
            }, 500);
        } catch (error) {
            console.error('❌ Erreur modification rôle:', error);
            alert('Erreur lors de la modification du rôle');
            setIsUpdatingRole(false);
        }
    };

    const handleSaveProfile = async (updatedUser: Partial<User>) => {
        if (!canWriteModule) return;
        if (!profileUser) return;
        const userToUpdate = { ...profileUser, ...updatedUser };
        try {
            await onUpdateUser(userToUpdate);
            console.log('✅ Profil modifié avec succès');
            
            // Message de succès (utiliser Toast si disponible)
            if (typeof window !== 'undefined' && (window as any).Toast) {
                (window as any).Toast.success('Profil modifié avec succès');
            }
            
            setProfileModalOpen(false);
            setProfileUser(null);
        } catch (error) {
            console.error('❌ Erreur modification profil:', error);
            alert('Erreur lors de la modification du profil');
        }
    };

    const handleToggleActive = async (user: User, newState: boolean) => {
        if (!canWriteModule) return;
        const newActiveState = newState;
        if (onToggleActive) {
            await onToggleActive(user.id, newActiveState);
        } else {
            // Fallback: mise à jour locale
            onUpdateUser({...user, isActive: newActiveState});
        }
    };

    const handleDelete = async (user: User) => {
        if (!canDeleteModule) return;
        // Vérifier si l'utilisateur a un rôle protégé (SEULEMENT super_administrator)
        if (PROTECTED_ROLES.includes(user.role as Role)) {
            alert(`Impossible de supprimer le rôle Super Administrateur (${user.role}). Ce rôle est protégé pour maintenir la sécurité de la plateforme.`);
            return;
        }
        
        setDeletingUserId(user.id);
    };

    const confirmDeleteUser = async () => {
        if (!deletingUserId || !onDeleteUser) return;
        
        const userToDelete = users.find(u => u.id === deletingUserId);
        const userName = userToDelete?.name || userToDelete?.email || 'utilisateur';
        
        setIsDeleting(true);
        try {
            console.log('🔄 Suppression utilisateur en cours:', { userId: deletingUserId, userName });
            await onDeleteUser(deletingUserId);
            console.log('✅ Utilisateur supprimé avec succès');
            
            // Message de succès
            if (typeof window !== 'undefined' && (window as any).Toast) {
                (window as any).Toast.success(`${userName} supprimé avec succès`);
            }
            
            setDeletingUserId(null);
            
            // Attendre un peu pour que la mise à jour soit visible
            setTimeout(() => {
                setIsDeleting(false);
            }, 500);
        } catch (error: any) {
            console.error('❌ Erreur suppression utilisateur:', error);
            const errorMessage = error?.message || 'Erreur inconnue lors de la suppression';
            alert(`Erreur lors de la suppression de l'utilisateur : ${errorMessage}`);
            setIsDeleting(false);
            setDeletingUserId(null);
        }
    };

    // Filtres des utilisateurs
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = searchQuery === '' ||
                user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && user.isActive !== false) ||
                (statusFilter === 'inactive' && user.isActive === false);
            
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

    const pendingUsers = useMemo(() => users.filter(user => user.status === 'pending'), [users]);
    const pendingApprovalsCount = pendingUsers.length;

    const formatRoleLabel = (roleValue?: Role | null) => {
        if (!roleValue) return '—';
        const translated = t(roleValue);
        if (translated && translated !== roleValue) {
            return translated;
        }
        return roleValue.replace(/_/g, ' ');
    };

    const handleNoteChange = (userId: string, value: string) => {
        setDecisionNotes(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (typeof window !== 'undefined' && (window as any).Toast && typeof (window as any).Toast[type] === 'function') {
            (window as any).Toast[type](message);
        }
    };

    // Métriques
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const adminUsers = users.filter(u => u.role === 'administrator' || u.role === 'super_administrator').length;
    const staffUsers = users.filter(u => ['manager', 'supervisor', 'intern'].includes(u.role)).length;

    if (!currentUser) return null;

    if (!canReadModule) {
        return <AccessDenied description="Vous n’avez pas les permissions nécessaires pour accéder à la gestion des utilisateurs. Veuillez contacter votre administrateur." />;
    }

    const hasAccess = currentUser.role === 'administrator' || currentUser.role === 'super_administrator' || currentUser.role === 'manager';
    const approverProfileId = currentUser.profileId ? String(currentUser.profileId) : (currentUser.id ? String(currentUser.id) : '');

    const handleApproveRequest = async (pendingUser: User) => {
        if (currentUser.role !== 'super_administrator') return;
        const profileId = pendingUser.profileId ? String(pendingUser.profileId) : (pendingUser.id ? String(pendingUser.id) : '');
        if (!profileId) {
            alert('Profil utilisateur introuvable. Impossible de traiter la demande.');
            return;
        }
        if (!approverProfileId) {
            alert('Impossible de déterminer le validateur. Veuillez réessayer.');
            return;
        }
        const key = String(pendingUser.id);
        const note = (decisionNotes[key] || '').trim();
        setProcessingRequestId(`approve-${key}`);
        try {
            const updatedUser = await DataAdapter.approvePendingProfile(profileId, approverProfileId, note);
            if (updatedUser) {
                onUpdateUser(updatedUser);
                setDecisionNotes(prev => ({ ...prev, [key]: '' }));
                showToast(`Demande approuvée pour ${pendingUser.name || pendingUser.email || 'l’utilisateur'}`, 'success');
            }
        } catch (error) {
            console.error('❌ Erreur approbation utilisateur:', error);
            alert('Erreur lors de l’approbation. Veuillez réessayer.');
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleRejectRequest = async (pendingUser: User) => {
        if (currentUser.role !== 'super_administrator') return;
        const profileId = pendingUser.profileId ? String(pendingUser.profileId) : (pendingUser.id ? String(pendingUser.id) : '');
        if (!profileId) {
            alert('Profil utilisateur introuvable. Impossible de traiter la demande.');
            return;
        }
        if (!approverProfileId) {
            alert('Impossible de déterminer le validateur. Veuillez réessayer.');
            return;
        }
        const key = String(pendingUser.id);
        const note = (decisionNotes[key] || '').trim();
        if (!note) {
            const confirmed = window.confirm('Aucun commentaire n’a été saisi. Voulez-vous rejeter sans commentaire ?');
            if (!confirmed) {
                return;
            }
        }
        setProcessingRequestId(`reject-${key}`);
        try {
            const updatedUser = await DataAdapter.rejectPendingProfile(profileId, approverProfileId, note);
            if (updatedUser) {
                onUpdateUser(updatedUser);
                setDecisionNotes(prev => ({ ...prev, [key]: '' }));
                showToast(`Demande rejetée pour ${pendingUser.name || pendingUser.email || 'l’utilisateur'}`, 'success');
            }
        } catch (error) {
            console.error('❌ Erreur rejet utilisateur:', error);
            alert('Erreur lors du rejet de la demande. Veuillez réessayer.');
        } finally {
            setProcessingRequestId(null);
        }
    };

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
                    <i className="fas fa-lock text-6xl text-red-500 mb-4"></i>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h2>
                    <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à ce module.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
        <div>
                            <h1 className="text-4xl font-bold mb-2">Gestion des Utilisateurs</h1>
                            <p className="text-emerald-50 text-sm">
                                Gérez les utilisateurs, leurs rôles et leurs accès à la plateforme
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Métriques Power BI style */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
                {/* Onglets */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-6">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                activeTab === 'users'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <i className="fas fa-users mr-2"></i>
                            Utilisateurs
                        </button>
                        {currentUser?.role === 'super_administrator' && (
                            <button
                                onClick={() => setActiveTab('approvals')}
                                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                    activeTab === 'approvals'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <i className="fas fa-user-clock mr-2"></i>
                                Demandes d'accès
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                activeTab === 'permissions'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <i className="fas fa-shield-alt mr-2"></i>
                            Permissions Module
                        </button>
                        {currentUser?.role === 'super_administrator' && (
                            <button
                                onClick={() => setActiveTab('super_admin')}
                                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                    activeTab === 'super_admin'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <i className="fas fa-user-shield mr-2"></i>
                                Créer Super Admin
                            </button>
                        )}
                    </div>
                </div>

                {/* Métriques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Total Utilisateurs</span>
                            <i className="fas fa-users text-2xl text-blue-600"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Utilisateurs Actifs</span>
                            <i className="fas fa-user-check text-2xl text-green-600"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{activeUsers}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Administrateurs</span>
                            <i className="fas fa-user-shield text-2xl text-purple-600"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{adminUsers}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg p-6 border border-orange-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Équipe</span>
                            <i className="fas fa-user-tie text-2xl text-orange-600"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{staffUsers}</p>
                    </div>
                    {currentUser.role === 'super_administrator' && (
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200 hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Demandes en attente</span>
                                <i className="fas fa-inbox text-2xl text-yellow-600"></i>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{pendingApprovalsCount}</p>
                            <p className="text-xs text-yellow-700 mt-2">Rôles nécessitant une validation Super Admin.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Contenu des onglets */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                {activeTab === 'users' && (
                    <>
                        {/* Barre de recherche et filtres */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                        <input
                                            type="text"
                                            placeholder="Rechercher un utilisateur..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="all">Tous les rôles</option>
                                    <option value="super_administrator">Super Admin</option>
                                    <option value="administrator">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="intern">Stagiaire</option>
                                    <option value="student">Étudiant</option>
                                    <option value="employer">Employeur</option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="active">Actifs</option>
                                    <option value="inactive">Inactifs</option>
                                </select>
                            </div>

                            {/* Compteur de résultats */}
                            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                                {filteredUsers.length} {filteredUsers.length > 1 ? 'utilisateurs trouvés' : 'utilisateur trouvé'}
                            </div>
                        </div>

                        {/* Liste des utilisateurs */}
                        {filteredUsers.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                                <i className="fas fa-users text-6xl text-gray-300 mb-4"></i>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun utilisateur trouvé</h3>
                                <p className="text-gray-500">
                                    {searchQuery || roleFilter !== 'all' 
                                        ? 'Aucun utilisateur ne correspond aux critères de recherche' 
                                        : 'Aucun utilisateur enregistré'}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                            <th scope="col" className="px-6 py-3">Nom</th>
                                            <th scope="col" className="px-6 py-3">Email</th>
                                            <th scope="col" className="px-6 py-3">Rôle</th>
                                            <th scope="col" className="px-6 py-3">Statut</th>
                                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                                        {filteredUsers.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center">
                                                    {user.avatar && !user.avatar.startsWith('data:image') ? (
                                                        <img src={user.avatar} alt={user.name || 'Utilisateur'} className="w-8 h-8 rounded-full mr-3 object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full mr-3 bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                                            {(user.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                        {user.name}
                                    </th>
                                    <td className="px-6 py-4">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {t(user.role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                                        {user.isActive !== false ? (
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                                Actif
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                                Inactif
                                                            </span>
                                                        )}
                                                        <Toggle 
                                                            checked={user.isActive !== false}
                                                            onChange={(newState) => handleToggleActive(user, newState)}
                                                            disabled={!canWriteModule}
                                                            label={user.isActive !== false ? 'Activer' : 'Désactiver'}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button 
                                                        onClick={() => handleEditProfile(user)} 
                                                        disabled={!canWriteModule}
                                                        className={`font-medium text-emerald-600 hover:text-emerald-800 px-3 py-1 rounded transition-colors ${canWriteModule ? 'hover:bg-emerald-50' : 'opacity-50 cursor-not-allowed'}`}
                                                    >
                                                        <i className="fas fa-user-edit mr-2"></i>
                                                        Profil
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEdit(user)} 
                                                        disabled={!canWriteModule}
                                                        className={`font-medium text-blue-600 hover:text-blue-800 px-3 py-1 rounded transition-colors ${canWriteModule ? 'hover:bg-blue-50' : 'opacity-50 cursor-not-allowed'}`}
                                                    >
                                                        <i className="fas fa-edit mr-2"></i>
                                                        Rôle
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(user)} 
                                                        disabled={PROTECTED_ROLES.includes(user.role as Role) || !canDeleteModule}
                                                        className={`font-medium text-red-600 hover:text-red-800 px-3 py-1 rounded transition-colors ${PROTECTED_ROLES.includes(user.role as Role) || !canDeleteModule ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
                                                        title={
                                                            PROTECTED_ROLES.includes(user.role as Role)
                                                                ? 'Impossible de supprimer le Super Administrateur'
                                                                : !canDeleteModule
                                                                    ? 'Permissions insuffisantes pour supprimer'
                                                                    : ''
                                                        }
                                                    >
                                                        <i className="fas fa-trash mr-2"></i>
                                                        Supprimer
                                                    </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                        )}
                    </>
                )}
                {activeTab === 'approvals' && currentUser.role === 'super_administrator' && (
                    <div className="space-y-6">
                        <div className="bg-white border border-emerald-200 rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-user-clock text-emerald-600"></i>
                                Workflow d'approbation
                            </h3>
                            <p className="text-sm text-gray-600 mt-2">
                                Les comptes ci-dessous ont demandé un rôle avancé. Validez ou rejetez chaque demande pour activer l’accès correspondant.
                            </p>
                        </div>

                        {pendingUsers.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-lg p-12 text-center border border-dashed border-emerald-200">
                                <i className="fas fa-check-circle text-6xl text-emerald-400 mb-4"></i>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune demande en attente</h3>
                                <p className="text-gray-500">
                                    Toutes les demandes ont été traitées. Les nouvelles demandes apparaîtront ici automatiquement.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {pendingUsers.map((pendingUser) => {
                                    const key = String(pendingUser.id);
                                    const noteValue = decisionNotes[key] || '';
                                    const approveLoading = processingRequestId === `approve-${key}`;
                                    const rejectLoading = processingRequestId === `reject-${key}`;
                                    const requestedRoleLabel = formatRoleLabel(pendingUser.pendingRole || pendingUser.role);
                                    const currentRoleLabel = formatRoleLabel(pendingUser.role);
                                    const pendingSince = pendingUser.createdAt
                                        ? new Date(pendingUser.createdAt).toLocaleString('fr-FR')
                                        : '—';

                                    return (
                                        <div key={pendingUser.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-white flex items-center justify-center text-lg font-semibold">
                                                            {(pendingUser.name || pendingUser.email || 'U')
                                                                .split(' ')
                                                                .filter(Boolean)
                                                                .map((n) => n[0])
                                                                .join('')
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-semibold text-gray-900">
                                                                {pendingUser.name || pendingUser.email}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">{pendingUser.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-semibold">
                                                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                            Rôle actuel : {currentRoleLabel}
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                                            Rôle demandé : {requestedRoleLabel}
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                                            Statut : En attente
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    <p>
                                                        <i className="far fa-clock mr-1"></i>
                                                        Demande créée le : <strong>{pendingSince}</strong>
                                                    </p>
                                                    {pendingUser.reviewComment && (
                                                        <p className="mt-2">
                                                            <i className="fas fa-comment-dots mr-1 text-emerald-500"></i>
                                                            Dernier commentaire : {pendingUser.reviewComment}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Commentaire interne (visible par l'équipe)
                                                </label>
                                                <textarea
                                                    value={noteValue}
                                                    onChange={(e) => handleNoteChange(key, e.target.value)}
                                                    rows={3}
                                                    disabled={approveLoading || rejectLoading}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                                    placeholder="Notes pour tracer la décision (optionnel)"
                                                />
                                            </div>

                                            <div className="mt-4 flex flex-wrap justify-end gap-3">
                                                <button
                                                    onClick={() => handleRejectRequest(pendingUser)}
                                                    disabled={approveLoading || rejectLoading}
                                                    className="inline-flex items-center px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {rejectLoading && (
                                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></span>
                                                    )}
                                                    Refuser
                                                </button>
                                                <button
                                                    onClick={() => handleApproveRequest(pendingUser)}
                                                    disabled={approveLoading || rejectLoading}
                                                    className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {approveLoading && (
                                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                                    )}
                                                    Approuver
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <UserModulePermissions users={users} canEdit={canWriteModule} />
                )}
            </div>

            {isModalOpen && selectedUser && (
                <UserEditModal 
                    user={selectedUser}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveRole}
                    isLoading={isUpdatingRole}
                    allUsers={users}
                    currentUserId={currentUser?.id}
                    canAssignReservedRoles={canAssignReservedRoles}
                />
            )}

            {isProfileModalOpen && profileUser && (
                <UserProfileEdit 
                    user={profileUser}
                    onClose={() => setProfileModalOpen(false)}
                    onSave={handleSaveProfile}
                />
            )}

            {deletingUserId && (
                <ConfirmationModal
                    title="Supprimer l'utilisateur"
                    message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${users.find(u => u.id === deletingUserId)?.name || users.find(u => u.id === deletingUserId)?.email}" ? Cette action est irréversible.`}
                    onConfirm={confirmDeleteUser}
                    onCancel={() => setDeletingUserId(null)}
                    confirmText="Supprimer"
                    cancelText="Annuler"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};

export default UserManagement;
