import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import NexusFlowIcon from './icons/NexusFlowIcon';
import AuthAIAssistant from './AuthAIAssistant';
// import SenegelUsersList from './SenegelUsersList'; // supprimé

interface LoginProps {
  onSwitchToSignup: () => void;
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToSignup, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLocalization();
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState('');
  // const [showUsersList, setShowUsersList] = useState(false);
  const [isResetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  // Organisation (nom) – création si inexistante (si autorisé)
  const [organizationName, setOrganizationName] = useState('SENEGEL');
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        setOrgsLoading(true);
        const { default: OrganizationService } = await import('../services/organizationService');
        const list = await OrganizationService.getActiveOrganizations();
        setOrganizations(list.map(o => ({ id: o.id, name: o.name, slug: o.slug })));
        // Si SENEGEL existe, le sélectionner par défaut
        const senegel = list.find(o => (o.slug || '').toLowerCase() === 'senegel' || o.name.toLowerCase() === 'senegel');
        if (senegel) setOrganizationName(senegel.name);
      } catch (e) {
        console.warn('⚠️ Chargement organisations (non bloquant):', e);
      } finally {
        setOrgsLoading(false);
      }
    };
    loadOrgs();
  }, []);

  const formatLoginError = (err: any): string => {
    if (!err) {
      return 'Une erreur est survenue. Veuillez réessayer.';
    }

    const rawMessage =
      typeof err === 'string'
        ? err
        : err?.message || err?.error_description || 'Erreur de connexion.';

    const normalized = rawMessage.toLowerCase();

    if (
      normalized.includes('invalid login') ||
      normalized.includes('invalid credential') ||
      normalized.includes('invalid email or password')
    ) {
      return 'Identifiants invalides ou compte introuvable. Vérifiez votre email/mot de passe ou créez un nouveau compte.';
    }

    if (normalized.includes('aucun utilisateur') || normalized.includes('user not found')) {
      return 'Ce compte n’existe pas ou a été supprimé. Vérifiez l’adresse email ou créez un compte.';
    }

    if (normalized.includes('password')) {
      return 'Mot de passe incorrect. Réessayez ou cliquez sur “Mot de passe oublié ?”.';
    }

    if (normalized.includes('email not confirmed')) {
      return 'Votre email doit être confirmé avant la connexion. Vérifiez votre boîte mail.';
    }

    return rawMessage;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Tentative de connexion avec:', { email, password: '***' });
    setLoading(true);
    setError('');
    setEmailError('');

    try {
      const result = await signIn(email, password);
      console.log('📋 Résultat de connexion:', result);
      
      if (!result.success) {
        const friendly = formatLoginError(result.error);
        
        // Messages d'erreur plus clairs
        if (friendly.toLowerCase().includes('déjà utilisé') || friendly.toLowerCase().includes('already registered')) {
          // Si le backend renvoie ce message (rare en login), montrer l'alerte email
          setEmailError('Cet email est déjà utilisé. Utilisez un autre email ou connectez-vous.');
        } else {
          setEmailError('');
          setError(friendly);
        }
        
        console.error('❌ Erreur de connexion:', result.error);
      } else {
        console.log('✅ Connexion réussie !');
        // Harmoniser l'organisation sélectionnée: trouver/créer, puis mettre à jour le profil si nécessaire
        try {
          const { OrganizationService } = await import('../services/organizationService');
          const targetName = (organizationName || 'SENEGEL').trim();
          const org = await OrganizationService.findOrCreateOrganizationByName(targetName);
          if (org) {
            // Récupérer profil courant et mettre à jour organization_id si différent
            const { supabase } = await import('../services/supabaseService');
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser?.id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, organization_id')
                .eq('user_id', currentUser.id)
                .single();
              if (profile && profile.organization_id !== org.id) {
                await supabase
                  .from('profiles')
                  .update({ organization_id: org.id, updated_at: new Date().toISOString() })
                  .eq('user_id', currentUser.id);
              }
            }
          }
        } catch (orgErr) {
          console.warn('⚠️ Harmonisation organisation échouée (non bloquant):', orgErr);
        }
        // Appeler le callback de succès pour la redirection contrôlée
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (error) {
      console.error('💥 Erreur lors de la connexion:', error);
      setError('Erreur inattendue lors de la connexion');
    }
    
    setLoading(false);
  };

  const openAssistant = (prompt: string = '') => {
    setAssistantInitialPrompt(prompt);
    setAssistantOpen(true);
  }

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setResetLoading(true);
      setResetMsg(null);
      const { supabase } = await import('../services/supabaseService');
      const redirectTo = window.location.origin; // retour app
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail || email, { redirectTo });
      if (error) throw error;
      setResetMsg('Un lien de réinitialisation a été envoyé à votre e-mail.');
    } catch (err: any) {
      setResetMsg(err?.message || "Erreur lors de l'envoi du lien.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden md:flex">
          {/* Left Panel */}
          <div className="md:w-1/2 bg-gradient-to-br from-emerald-600 to-blue-600 text-white p-12 flex flex-col justify-center items-center text-center">
            <NexusFlowIcon className="w-28 h-28"/>
            <h1 className="text-3xl font-bold mt-4">COYA</h1>
            <p className="mt-2 text-emerald-100 text-sm font-medium">Creating Opportunities for Youth in Africa</p>
            <p className="mt-1 text-emerald-50 text-lg">Plateforme intelligente multi‑organisations</p>
            <div className="mt-8 space-y-4 text-sm text-emerald-50">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <i className="fas fa-building text-2xl mb-2"></i>
                <h3 className="font-semibold mb-2">Multi-Organisations</h3>
                <p className="text-xs">Chaque organisation possède son espace dédié et sécurisé</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <i className="fas fa-users text-2xl mb-2"></i>
                <h3 className="font-semibold mb-2">Écosystème Unifié</h3>
                <p className="text-xs">Une plateforme, plusieurs organisations, des milliers d'utilisateurs</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <i className="fas fa-shield-alt text-2xl mb-2"></i>
                <h3 className="font-semibold mb-2">Sécurité & Isolation</h3>
                <p className="text-xs">Vos données restent isolées au sein de votre organisation</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <i className="fas fa-info-circle text-2xl mb-2"></i>
                <h3 className="font-semibold mb-2">Rôles & Accès</h3>
                <p className="text-xs">Des rôles avancés peuvent nécessiter une invitation</p>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="md:w-1/2 p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900">{t('login_title')}</h2>
             <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Organisation (sélecteur) */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                {orgsLoading ? (
                  <div className="text-sm text-gray-500">Chargement des organisations…</div>
                ) : (
                  <select
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
                  >
                    {/* Toujours proposer SENEGEL en premier (organisation de référence) */}
                    {(!organizations.some(o => o.name.toLowerCase() === 'senegel')) && (
                      <option value="SENEGEL">SENEGEL</option>
                    )}
                    {organizations.map(o => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Choisissez votre organisation. Si elle n'existe pas, elle sera créée automatiquement après connexion (si autorisations).
                </p>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    <i className="fas fa-info-circle mr-1"></i>
                    Information
                  </p>
                  <p className="text-xs text-blue-700">
                    <strong>COYA</strong> : Marque plateforme. <strong>SENEGEL</strong> reste l'organisation de référence pour les tests publics.<br/>
                    <strong>Organisations partenaires</strong> : Accès sur invitation, création par Super Admins.
                  </p>
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('email')}
                </label>
                {emailError && (
                  <div className="mt-1 mb-1 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
                    <i className="fas fa-exclamation-circle mr-1"></i>
                    {emailError}
                  </div>
                )}
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('password')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="text-emerald-600 hover:text-emerald-500 font-medium"
                >
                  {t('forgot_password')}
                </button>
                <button
                  type="button"
                  onClick={() => openAssistant(t('auth_ai_prompt_password'))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Besoin d'aide ?
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connexion...' : t('login')}
                </button>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-600">
                  {t('login_prompt')}{' '}
                  <button
                    type="button"
                    onClick={onSwitchToSignup}
                    className="text-emerald-600 hover:text-emerald-500 font-medium"
                  >
                    {t('signup_prompt')}
                  </button>
                </span>
              </div>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => openAssistant()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {t('need_help')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {isAssistantOpen && (
        <AuthAIAssistant
          isOpen={isAssistantOpen}
          onClose={() => setAssistantOpen(false)}
          initialPrompt={assistantInitialPrompt}
        />
      )}

      {/* Liste d'utilisateurs retirée (composant supprimé) */}

      {/* Modal reset password */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={handleSendReset}>
              <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900">Réinitialiser le mot de passe</h2></div>
              <div className="p-6 space-y-3">
                {resetMsg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">{resetMsg}</div>}
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  value={resetEmail || email}
                  onChange={(e)=>setResetEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={()=>setResetOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold">Annuler</button>
                <button type="submit" disabled={resetLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {resetLoading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
