import { supabase } from '../services/supabaseService';

export interface AuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export class AuthGuard {
  private static instance: AuthGuard;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_WARNING_TIME = 5 * 60 * 1000; // 5 minutes
  private readonly INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private lastActivity: number = Date.now();

  private constructor() {
    this.setupActivityListeners();
  }

  public static getInstance(): AuthGuard {
    if (!AuthGuard.instance) {
      AuthGuard.instance = new AuthGuard();
    }
    return AuthGuard.instance;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  public async checkAuth(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erreur vérification session:', error);
        return false;
      }

      return !!session;
    } catch (error) {
      console.error('Erreur auth guard:', error);
      return false;
    }
  }

  /**
   * Protège une route - redirige vers login si non authentifié
   */
  public async protectRoute(redirectTo: string = '/login'): Promise<boolean> {
    const isAuthenticated = await this.checkAuth();
    
    if (!isAuthenticated) {
      console.log('🔒 Route protégée - redirection vers login');
      window.location.href = redirectTo;
      return false;
    }

    return true;
  }

  /**
   * Configure les listeners d'activité pour la gestion de l'inactivité
   */
  private setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.resetInactivityTimer();
      }, true);
    });
  }

  /**
   * Remet à zéro le timer d'inactivité
   */
  private resetInactivityTimer(): void {
    this.lastActivity = Date.now();
    
    // Annuler les timers existants
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // Programmer l'avertissement après 5 minutes
    this.warningTimer = setTimeout(() => {
      this.showInactivityWarning();
    }, this.INACTIVITY_WARNING_TIME);

    // Programmer la déconnexion après 10 minutes
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Affiche un avertissement d'inactivité (optionnel)
   */
  private showInactivityWarning(): void {
    console.log('⚠️ Avertissement: Vous serez déconnecté dans 5 minutes par inactivité');
    // Optionnel: afficher une notification à l'utilisateur
  }

  /**
   * Gère le timeout d'inactivité - déconnecte l'utilisateur
   */
  private async handleInactivityTimeout(): Promise<void> {
    console.log('⏰ Session expirée par inactivité');
    
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Erreur déconnexion automatique:', error);
      window.location.href = '/login';
    }
  }

  /**
   * Démarre la surveillance d'inactivité
   */
  public startInactivityMonitoring(): void {
    this.resetInactivityTimer();
  }

  /**
   * Arrête la surveillance d'inactivité
   */
  public stopInactivityMonitoring(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Déconnexion propre avec nettoyage
   */
  public async signOut(): Promise<void> {
    this.stopInactivityMonitoring();
    
    try {
      // Déconnexion Supabase
      await supabase.auth.signOut();
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  }
}

// Export de l'instance singleton
export const authGuard = AuthGuard.getInstance();

