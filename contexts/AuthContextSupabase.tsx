import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AuthService, AuthUser } from '../services/authService';
const sanitizeFullName = (fullName?: string | null, email?: string | null) => {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }
  return email || 'Utilisateur';
};

const buildUserFromProfile = (profile: any): User => {
  const uiRole = AuthService.mapStoredRoleToUi(profile?.role);
  const status = (profile?.status as ProfileStatus) || 'active';
  const pendingRole = profile?.pending_role ? AuthService.mapStoredRoleToUi(profile.pending_role) : null;
  return {
    id: profile?.user_id || profile?.id,
    profileId: profile?.id,
    email: profile?.email || '',
    name: profile?.full_name || '',
    fullName: profile?.full_name || '',
    role: uiRole,
    avatar: profile?.avatar_url || '',
    phone: profile?.phone_number || '',
    phoneNumber: profile?.phone_number || '',
    skills: profile?.skills || [],
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || '',
    linkedinUrl: profile?.linkedin_url || '',
    githubUrl: profile?.github_url || '',
    isActive: profile?.is_active ?? true,
    lastLogin: profile?.last_login || new Date().toISOString(),
    createdAt: profile?.created_at || new Date().toISOString(),
    updatedAt: profile?.updated_at || new Date().toISOString(),
    status,
    pendingRole,
    reviewComment: profile?.review_comment || null,
    reviewedAt: profile?.reviewed_at || null,
    reviewedBy: profile?.reviewed_by || null
  };
};

const ensureProfile = async (authUser: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return data;
  }

  const storageRole = AuthService.normalizeRoleForStorage(authUser?.user_metadata?.role || authUser?.role);
  const organizationId = authUser?.user_metadata?.organization_id || AuthService.getDefaultOrganizationId();

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.id,
      email: authUser.email || '',
      full_name: sanitizeFullName(authUser?.user_metadata?.full_name, authUser.email),
      role: storageRole,
      phone_number: authUser?.user_metadata?.phone_number || null,
      organization_id: organizationId,
      is_active: true,
      last_login: new Date().toISOString(),
      status: 'active',
      pending_role: null
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return insertedProfile;
};
import { User, ProfileStatus, Role, ROLES_REQUIRING_APPROVAL } from '../types';
import { authGuard } from '../middleware/authGuard';
import { supabase } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  profile: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signUp: (email: string, password: string, fullName: string, phoneNumber?: string, role?: string, organizationId?: string) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier la session au chargement avec persistance
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Vérifier la session Supabase persistée
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur récupération session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Session persistée trouvée:', session.user.email);
          
          // Récupérer le profil depuis la table profiles
          let profile;
          try {
            profile = await ensureProfile(session.user);
          } catch (profileError) {
            console.error('❌ Erreur récupération profil:', profileError);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          const userData = buildUserFromProfile({ ...profile, user_id: session.user.id });
          const profileData: AuthUser = {
            id: session.user.id,
            email: profile.email,
            full_name: profile.full_name,
            role: AuthService.mapStoredRoleToUi(profile.role),
            avatar_url: profile.avatar_url || '',
            phone_number: profile.phone_number || '',
            status: (profile.status as ProfileStatus) || 'active',
            pending_role: profile.pending_role || null,
            review_comment: profile.review_comment || null,
            reviewed_at: profile.reviewed_at || null,
            reviewed_by: profile.reviewed_by || null
          };
          
          // Mettre à jour l'état de manière synchrone
          setUser(userData);
          setProfile(profileData);
          
          // Démarrer la surveillance d'inactivité
          authGuard.startInactivityMonitoring();
          
          console.log('✅ Utilisateur restauré depuis session persistée:', userData.email);
        } else {
          console.log('ℹ️ Aucune session persistée trouvée');
          // S'assurer que l'état est bien null
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: authUser, error } = await AuthService.signIn({ email, password });
      
      if (error) {
        setLoading(false);
        return { success: false, error };
      }

      if (authUser) {
        // Récupérer le profil complet pour obtenir profileId
        const profile = await ensureProfile({
          ...authUser,
          user_metadata: {
            role: authUser.role,
            full_name: authUser.full_name,
            phone_number: authUser.phone_number,
            organization_id: authUser.organization_id
          }
        });

        const userData = buildUserFromProfile({ ...profile, user_id: authUser.id });

        setUser(userData);
        setProfile({
          id: authUser.id,
          email: userData.email,
          full_name: userData.fullName,
          role: userData.role,
          avatar_url: userData.avatar,
          phone_number: userData.phone || '',
          status: userData.status,
          pending_role: userData.pendingRole ? AuthService.normalizeRoleForStorage(userData.pendingRole) : null,
          review_comment: userData.reviewComment || null,
          reviewed_at: userData.reviewedAt || null,
          reviewed_by: userData.reviewedBy || null
        });
        
        // Démarrer la surveillance d'inactivité
        authGuard.startInactivityMonitoring();
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Aucun utilisateur retourné' };
    } catch (error) {
      setLoading(false);
      return { success: false, error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phoneNumber?: string, role?: string, organizationId?: string) => {
    try {
      setLoading(true);
      const { user: authUser, error } = await AuthService.signUp({
        email,
        password,
        full_name: fullName,
        phone_number: phoneNumber,
        role: role || 'student',
        organization_id: organizationId
      });
      
      if (error) {
        setLoading(false);
        return { success: false, error };
      }

      if (authUser) {
        const requestedRole = (role as Role) || 'student';
        const approvalRequired = ROLES_REQUIRING_APPROVAL.includes(requestedRole);
        const status: ProfileStatus = approvalRequired ? 'pending' : 'active';
        const pendingRole = approvalRequired ? requestedRole : null;
        const effectiveRole: Role = approvalRequired
          ? 'student'
          : ((authUser.role as Role) || requestedRole);

        // Convertir AuthUser en User pour la compatibilité
        const userData: User = {
          id: authUser.id,
          email: authUser.email,
          name: fullName,
          fullName: authUser.full_name || fullName,
          role: effectiveRole,
          avatar: authUser.avatar_url || '',
          phone: phoneNumber || '',
          phoneNumber: phoneNumber || '',
          skills: [],
          bio: '',
          location: '',
          website: '',
          linkedinUrl: '',
          githubUrl: '',
          isActive: true,
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status,
          pendingRole,
          reviewComment: null,
          reviewedAt: null,
          reviewedBy: null
        };
        
        setUser(userData);
        setProfile({
          id: authUser.id,
          email: authUser.email || email,
          full_name: authUser.full_name || fullName,
          role: effectiveRole,
          avatar_url: authUser.avatar_url || '',
          phone_number: phoneNumber || '',
          organization_id: authUser.organization_id,
          status,
          pending_role: pendingRole ? AuthService.normalizeRoleForStorage(pendingRole) : null,
          review_comment: null,
          reviewed_at: null,
          reviewed_by: null
        });
        
        // Démarrer la surveillance d'inactivité
        authGuard.startInactivityMonitoring();
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Aucun utilisateur retourné' };
    } catch (error) {
      setLoading(false);
      return { success: false, error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Utiliser authGuard pour une déconnexion propre
      await authGuard.signOut();
      
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Rediriger vers dashboard après déconnexion
      window.location.href = '/login';
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      if (!profile) {
        return { success: false, error: 'Aucun profil trouvé' };
      }

      const { error } = await AuthService.updateProfile(profile.id, updates);
      
      if (error) {
        return { success: false, error };
      }

      // Mettre à jour le profil local
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);

      // Mettre à jour l'utilisateur local
      const updatedUser: User = {
        ...user!,
        fullName: updatedProfile.full_name,
        avatar: updatedProfile.avatar_url || '',
        updatedAt: new Date().toISOString()
      };
      setUser(updatedUser);

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

