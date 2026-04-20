import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import AuthAIAssistant from './AuthAIAssistant';
import logoSenegel from '../assets/logo_senegel.png';
// import SenegelUsersList from './SenegelUsersList'; // supprimé

const IMPULCIA_URL = 'https://impulcia-afrique.com/';
const SUPPORT_EMAIL = 'techsupport@senegel.org';
const MAILTO_SUPPORT = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Besoin d\'aide - COYA.PRO')}`;

interface LoginProps {
  onLoginSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const { signIn } = useAuth();
  const { t } = useLocalization();
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState('');
  // const [showUsersList, setShowUsersList] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
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
    const defaultMessage = t('login_error_generic');
    if (!err) {
      return defaultMessage;
    }

    const rawMessage =
      typeof err === 'string'
        ? err
        : err?.message || err?.error_description || defaultMessage;

    const normalized = (rawMessage || '').toLowerCase();

    if (
      normalized.includes('invalid login') ||
      normalized.includes('invalid credential') ||
      normalized.includes('invalid email or password')
    ) {
      return t('login_error_invalid_credentials');
    }

    if (normalized.includes('aucun utilisateur') || normalized.includes('user not found')) {
      return t('login_error_account_not_found');
    }

    if (normalized.includes('password')) {
      return t('login_error_wrong_password');
    }

    if (normalized.includes('email not confirmed')) {
      return t('login_error_email_not_confirmed');
    }

    return rawMessage || defaultMessage;
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
          setEmailError(t('login_email_in_use_error'));
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
      setError(t('login_unexpected_error'));
    }
    
    setLoading(false);
  };

  const openAssistant = (prompt: string = '') => {
    setAssistantInitialPrompt(prompt);
    setAssistantOpen(true);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) return;
    setForgotPasswordLoading(true);
    setForgotPasswordError('');
    setForgotPasswordSent(false);
    try {
      const { supabase } = await import('../services/supabaseService');
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname || ''}` : undefined,
      });
      if (err) {
        setForgotPasswordError(err.message || t('login_error_generic'));
        return;
      }
      setForgotPasswordSent(true);
    } catch (err: any) {
      setForgotPasswordError(err?.message || t('login_error_generic'));
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <>
      {/* Page de connexion uniquement : plein écran, jamais affichée si déjà connecté (géré par App). */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 font-coya overflow-hidden"
        style={{
          background: `linear-gradient(180deg, var(--coya-primary-dark) 0%, var(--coya-primary) 25%, var(--coya-bg-gradient-start) 60%, var(--coya-bg-gradient-end) 100%)`,
        }}
      >
        <div className="w-full max-w-[340px] mx-auto bg-coya-card rounded-coya shadow-coya overflow-hidden border border-coya-border flex-shrink-0" style={{ boxShadow: 'var(--coya-shadow-lg)' }}>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col items-center mb-4">
              <div className="rounded-full p-2 border-2 border-[var(--coya-green)] bg-[var(--coya-green)]/10 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
                <img
                  src={logoSenegel}
                  alt="SENEGEL – CITOYENNETÉ, TRANSPARENCE, COMPÉTENCES"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-coya-text-muted tracking-wide mt-2 uppercase">
                CITOYENNETÉ, TRANSPARENCE, COMPÉTENCES
              </p>
              <p className="text-[10px] sm:text-xs text-coya-text-muted mt-1 italic text-center max-w-[260px]">
                COYA — Create Opportunities for Youth in Africa
              </p>
            </div>
            <h2 className="text-lg font-semibold text-coya-text mb-4 text-center">{t('login_title')}</h2>
            <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div data-testid="login-error" className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-coya-text mb-1">
                  {t('email')}
                </label>
                {emailError && (
                  <div className="mb-1 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                    <i className="fas fa-exclamation-circle mr-1" /> {emailError}
                  </div>
                )}
                <input
                  id="email"
                  name="email"
                  type="email"
                  data-testid="login-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-coya-border rounded-coya bg-coya-card text-coya-text placeholder-coya-text-muted focus:outline-none focus:ring-2 focus:ring-coya-primary focus:border-coya-primary text-sm"
                  placeholder={t('signup_email_placeholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-coya-text mb-1">
                  {t('password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    data-testid="login-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-coya-border rounded-coya bg-coya-card text-coya-text pr-10 focus:outline-none focus:ring-2 focus:ring-coya-primary focus:border-coya-primary text-sm"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? t('signup_hide_password') : t('signup_show_password')}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-coya-text-muted text-center space-x-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-coya-primary hover:underline font-medium"
                >
                  Mot de passe oublié
                </button>
                {onSwitchToSignup && (
                  <>
                    <span>·</span>
                    <button type="button" onClick={onSwitchToSignup} className="text-coya-primary hover:underline font-medium">
                      Créer un compte
                    </button>
                  </>
                )}
              </p>

              <p className="text-center text-xs text-coya-text-muted">
                <button type="button" onClick={() => setHelpOpen(true)} className="text-coya-primary hover:underline font-medium">
                  Problèmes de connexion
                </button>
              </p>

              <div className="pt-1">
                <button
                  type="submit"
                  data-testid="login-submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-coya text-white bg-coya-primary hover:bg-coya-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coya-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-coya"
                >
                  {loading ? t('login_loading') : t('login')}
                </button>
                <p className="text-center text-[10px] text-coya-text-muted mt-2 flex items-center justify-center gap-1">
                  <i className="fa fa-lock" aria-hidden />
                  Connexion sécurisée
                </p>
              </div>

              <p className="text-center text-xs text-coya-text-muted pt-4 mt-2 border-t border-coya-border">
                Solution développée par{' '}
                <a href={IMPULCIA_URL} target="_blank" rel="noopener noreferrer" className="text-coya-primary hover:underline font-medium">
                  Impulcia Afrique
                </a>
              </p>
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

      {/* Modal Besoin d'aide : style COYA unifié */}
      {isHelpOpen && (
        <>
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 font-coya">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, var(--coya-primary-dark) 0%, var(--coya-primary) 25%, var(--coya-bg-gradient-start) 60%, var(--coya-bg-gradient-end) 100%)',
              }}
              onClick={() => setHelpOpen(false)}
              aria-hidden
            />
            <div className="relative w-full max-w-md bg-coya-card rounded-2xl shadow-coya border border-coya-border p-6" style={{ boxShadow: 'var(--coya-shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-coya-text mb-3">Besoin d&apos;aide</h3>
              <p className="text-sm text-coya-text mb-4">
                Pour toute demande d&apos;assistance (accès, mot de passe, problème technique), veuillez vous rapprocher de votre manager afin qu&apos;il effectue une demande via <strong>Tickets IT</strong>.
              </p>
              <p className="text-sm text-coya-text-muted mb-4">
                Contact support :{' '}
                <a href={MAILTO_SUPPORT} className="text-coya-primary hover:underline font-medium">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <div className="flex justify-end">
                <button type="button" onClick={() => setHelpOpen(false)} className="px-4 py-2 rounded-xl bg-coya-primary text-white text-sm font-medium hover:bg-coya-primary-dark">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Mot de passe oublié – charte COYA */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 font-coya">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setForgotPasswordOpen(false); setForgotPasswordError(''); setForgotPasswordSent(false); }}
            aria-hidden
          />
          <div className="relative w-full max-w-sm bg-coya-card rounded-2xl shadow-coya border border-coya-border p-6" style={{ boxShadow: 'var(--coya-shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-coya-text mb-3">Mot de passe oublié</h3>
            {forgotPasswordSent ? (
              <p className="text-sm text-coya-text mb-4">
                Si un compte existe pour cette adresse, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception et les spams.
              </p>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <label htmlFor="forgot-email" className="block text-sm font-medium text-coya-text">Adresse e-mail</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-coya-border rounded-coya bg-coya-card text-coya-text text-sm focus:ring-2 focus:ring-coya-primary focus:border-coya-primary"
                  placeholder={t('signup_email_placeholder')}
                />
                {forgotPasswordError && <p className="text-sm text-red-600">{forgotPasswordError}</p>}
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setForgotPasswordOpen(false); setForgotPasswordError(''); }} className="px-4 py-2 rounded-xl border border-coya-border text-coya-text text-sm font-medium hover:bg-coya-bg">
                    Annuler
                  </button>
                  <button type="submit" disabled={forgotPasswordLoading} className="px-4 py-2 rounded-xl bg-coya-primary text-white text-sm font-medium hover:bg-coya-primary-dark disabled:opacity-50">
                    {forgotPasswordLoading ? t('login_loading') : 'Envoyer le lien'}
                  </button>
                </div>
              </form>
            )}
            {forgotPasswordSent && (
              <button type="button" onClick={() => { setForgotPasswordOpen(false); setForgotPasswordSent(false); }} className="mt-2 w-full px-4 py-2 rounded-xl bg-coya-primary text-white text-sm font-medium hover:bg-coya-primary-dark">
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default Login;


