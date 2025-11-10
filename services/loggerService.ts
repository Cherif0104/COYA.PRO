/**
 * Service de logging avancé pour tracer le comportement de l'application
 * Permet d'identifier les bugs d'instabilité, redirections, sessions, refreshs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 
  | 'auth'           // Authentification
  | 'navigation'     // Navigation / Redirections
  | 'session'        // Gestion de session
  | 'state'          // Gestion d'état
  | 'refresh'        // Rechargements / Refresh
  | 'api'           // Appels API
  | 'render'        // Rendu / UI
  | 'data'          // Chargement données
  | 'error'         // Erreurs
  | 'performance';   // Performance

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Nombre maximum de logs à garder en mémoire
  private sessionId: string;
  private isEnabled = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    console.log(`🔵 Logger initialisé - Session ID: ${this.sessionId}`);
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addLog(level: LogLevel, category: LogCategory, message: string, data?: any, error?: Error) {
    if (!this.isEnabled) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      stack: error?.stack,
      sessionId: this.sessionId,
    };

    this.logs.push(logEntry);

    // Limiter le nombre de logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Supprimer les plus anciens
    }

    // Afficher dans la console
    this.displayInConsole(logEntry);
  }

  private displayInConsole(log: LogEntry) {
    const emoji = this.getEmoji(log.category);
    const style = this.getStyle(log.level);
    const prefix = `[${log.timestamp}] ${emoji} [${log.category.toUpperCase()}]`;
    
    console.log(
      `%c${prefix} ${log.message}`,
      style,
      log.data || ''
    );

    if (log.stack) {
      console.error('Stack trace:', log.stack);
    }
  }

  private getEmoji(category: LogCategory): string {
    const emojis = {
      'auth': '🔐',
      'navigation': '🧭',
      'session': '📦',
      'state': '🔄',
      'refresh': '♻️',
      'api': '🌐',
      'render': '🎨',
      'data': '📊',
      'error': '❌',
      'performance': '⚡',
    };
    return emojis[category] || '📝';
  }

  private getStyle(level: LogLevel): string {
    const styles = {
      'debug': 'color: #888',
      'info': 'color: #2196F3; font-weight: bold',
      'warn': 'color: #FF9800; font-weight: bold',
      'error': 'color: #F44336; font-weight: bold; background: #FFE0E0',
    };
    return styles[level] || '';
  }

  // Méthodes publiques pour logger par catégorie
  debug(category: LogCategory, message: string, data?: any) {
    this.addLog('debug', category, message, data);
  }

  info(category: LogCategory, message: string, data?: any) {
    this.addLog('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.addLog('warn', category, message, data);
  }

  error(category: LogCategory, message: string, data?: any, error?: Error) {
    this.addLog('error', category, message, data, error);
  }

  // Helpers spécifiques pour les cas d'usage critiques
  logAuth(action: string, data?: any) {
    this.info('auth', `🔐 ${action}`, data);
  }

  logNavigation(from: string, to: string, reason?: string) {
    this.info('navigation', `🧭 Navigation: ${from} → ${to}`, { from, to, reason });
  }

  logSession(action: string, data?: any) {
    this.info('session', `📦 Session: ${action}`, data);
  }

  logStateChange(component: string, previous: any, current: any) {
    this.debug('state', `🔄 State change in ${component}`, { previous, current });
  }

  logRefresh(reason: string) {
    this.info('refresh', `♻️ Refresh triggered: ${reason}`);
  }

  logRender(component: string, props?: any) {
    this.debug('render', `🎨 Rendering ${component}`, props);
  }

  logDataLoad(source: string, count: number, duration?: number) {
    this.info('data', `📊 Loaded ${count} items from ${source}`, { source, count, duration });
  }

  logPerformance(operation: string, duration: number) {
    this.info('performance', `⚡ ${operation} took ${duration}ms`, { operation, duration });
  }

  // Récupérer les logs
  getLogs(category?: LogCategory, level?: LogLevel): LogEntry[] {
    let filtered = this.logs;
    
    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    return filtered;
  }

  // Exporter les logs au format JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Vider les logs
  clearLogs() {
    this.logs = [];
    console.log('🔵 Logs cleared');
  }

  // Activer/désactiver le logging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`🔵 Logger ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Obtenir la session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Créer un rapport de session
  createSessionReport(): string {
    const errors = this.logs.filter(log => log.level === 'error');
    const warns = this.logs.filter(log => log.level === 'warn');
    const navigation = this.logs.filter(log => log.category === 'navigation');
    const auth = this.logs.filter(log => log.category === 'auth');
    const refresh = this.logs.filter(log => log.category === 'refresh');

    const report = `
📊 RAPPORT DE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session ID: ${this.sessionId}
Durée: ${this.logs.length > 0 ? `${Math.round((Date.now() - new Date(this.logs[0].timestamp).getTime()) / 1000)}s` : '0s'}
Total logs: ${this.logs.length}

📈 Statistiques:
  - Erreurs: ${errors.length}
  - Avertissements: ${warns.length}
  - Navigations: ${navigation.length}
  - Authentifications: ${auth.length}
  - Rechargements: ${refresh.length}

${errors.length > 0 ? `❌ Erreurs détectées: ${errors.map(e => e.message).join(', ')}` : '✅ Aucune erreur'}
${warns.length > 0 ? `⚠️ Avertissements: ${warns.map(w => w.message).join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    return report;
  }
}

// Instance singleton
export const logger = new LoggerService();

// Exposer globalement pour faciliter le debugging
if (typeof window !== 'undefined') {
  (window as any).logger = logger;
  (window as any).getLogs = () => logger.getLogs();
  (window as any).exportLogs = () => logger.exportLogs();
  (window as any).sessionReport = () => console.log(logger.createSessionReport());
  
  console.log('🔵 Logger disponible globalement: window.logger, window.getLogs(), window.exportLogs(), window.sessionReport()');
}

