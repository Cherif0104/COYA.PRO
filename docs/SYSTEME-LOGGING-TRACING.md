# Système de Logging et Tracing Complet

## Date : Janvier 2025
## Version : 1.0

## Vue d'Ensemble

Un système de logging avancé a été implémenté pour tracer le comportement de l'application et identifier les bugs d'instabilité signalés par les clients.

## Problèmes Identifiés par les Clients

### 1. Page Blanche après Signup
- **Problème** : Après création de compte, l'utilisateur voit une page blanche
- **Comportement attendu** : Redirection automatique vers la page de connexion

### 2. Flash de Login Page au Refresh
- **Problème** : Lors du refresh d'une page, une page de login s'affiche quelques millisecondes avant la redirection
- **Comportement attendu** : Reste sur la page actuelle sans flash

### 3. Refresh Nécessaire après Connexion
- **Problème** : Après connexion, il faut faire un refresh pour voir le dashboard
- **Comportement attendu** : Redirection immédiate vers le dashboard

## Service de Logging

### Structure

Le service `LoggerService` trace automatiquement :

#### Catégories de Logs

```typescript
type LogCategory = 
  | 'auth'           // Authentification (login, signup, logout)
  | 'navigation'     // Navigation / Redirections
  | 'session'        // Gestion de session
  | 'state'          // Gestion d'état
  | 'refresh'        // Rechargements / Refresh
  | 'api'           // Appels API
  | 'render'        // Rendu / UI
  | 'data'          // Chargement données
  | 'error'         // Erreurs
  | 'performance';   // Performance
```

#### Niveaux de Logs

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

### Fonctionnalités

#### 1. Logging Automatique

```typescript
logger.logAuth(action, data)           // Logger l'authentification
logger.logNavigation(from, to, reason) // Logger les navigations
logger.logSession(action, data)        // Logger la session
logger.logStateChange(component, prev, current) // Logger les changements d'état
logger.logRefresh(reason)              // Logger les refreshes
logger.logRender(component, props)     // Logger le rendu
logger.logDataLoad(source, count, duration) // Logger le chargement de données
logger.logPerformance(operation, duration) // Logger la performance
```

#### 2. Accès Global

Le logger est disponible globalement dans la console :

```javascript
// Voir tous les logs
window.getLogs()

// Voir les logs d'une catégorie spécifique
window.getLogs('auth')

// Voir les logs d'un niveau spécifique
window.getLogs(null, 'error')

// Exporter les logs en JSON
window.exportLogs()

// Générer un rapport de session
window.sessionReport()
```

#### 3. Rapport de Session

Le système génère automatiquement un rapport incluant :
- Session ID unique
- Durée de la session
- Nombre total de logs
- Statistiques par catégorie
- Erreurs et avertissements détectés

## Intégration dans l'Application

### App.tsx - Composant Principal

#### Logs Ajoutés

1. **Initialisation de l'application**
   ```typescript
   logger.info('auth', '🔄 Initialisation de l\'application')
   logger.debug('session', 'Checking authentication state')
   logger.logAuth('Utilisateur authentifié', { isAuthenticated })
   logger.logPerformance('App initialization', duration)
   ```

2. **Navigation**
   ```typescript
   logger.logNavigation(currentView, view, 'handleSetView')
   logger.debug('state', `Setting currentView: ${currentView} → ${view}`)
   logger.debug('session', `Persisted view to localStorage: ${view}`)
   ```

3. **Redirections**
   ```typescript
   logger.logAuth('Utilisateur NON authentifié - redirection vers login')
   logger.logNavigation(currentView, 'login', 'Not authenticated')
   ```

### Signup.tsx - Inscription

#### Logs Ajoutés

1. **Tentative d'inscription**
   ```typescript
   logger.logAuth('Tentative inscription', { email, role })
   ```

2. **Inscription réussie**
   ```typescript
   logger.logAuth('Inscription réussie', { email })
   logger.info('navigation', 'Redirection vers login après inscription')
   ```

3. **Callback onSignupSuccess**
   ```typescript
   logger.debug('state', 'Calling onSignupSuccess callback')
   logger.warn('auth', 'onSignupSuccess callback not defined - may cause white page')
   ```

4. **Erreurs d'inscription**
   ```typescript
   logger.error('auth', 'Erreur inscription', result.error)
   ```

## Utilisation pour le Debug

### Scénario 1 : Page Blanche après Signup

**Commandes de debug** :
```javascript
// Voir tous les logs d'authentification
window.getLogs('auth')

// Voir les logs de navigation
window.getLogs('navigation')

// Voir le rapport complet
window.sessionReport()
```

**Ce qu'on cherche** :
- Vérifier si `onSignupSuccess` est bien défini
- Vérifier si la redirection se fait
- Vérifier les changements d'état

### Scénario 2 : Flash de Login Page

**Commandes de debug** :
```javascript
// Voir tous les logs de navigation
window.getLogs('navigation')

// Voir les logs de session
window.getLogs('session')

// Voir le rapport complet
window.sessionReport()
```

**Ce qu'on cherche** :
- Identifier l'ordre des redirections
- Vérifier si `isInitialized` est bien géré
- Vérifier la persistance dans localStorage

### Scénario 3 : Refresh Nécessaire après Connexion

**Commandes de debug** :
```javascript
// Voir tous les logs d'authentification
window.getLogs('auth')

// Voir les logs de refresh
window.getLogs('refresh')

// Voir le rapport complet
window.sessionReport()
```

**Ce qu'on cherche** :
- Vérifier le flux après connexion
- Vérifier les appels API
- Vérifier les changements d'état

## Exemple de Logs

### Initialisation de l'Application

```
[2025-01-XX] 🔐 [AUTH] 🔄 Initialisation de l'application
[2025-01-XX] 📦 [SESSION] Checking authentication state
[2025-01-XX] 🔐 [AUTH] 🔐 Utilisateur authentifié {isAuthenticated: true}
[2025-01-XX] ⚡ [PERFORMANCE] ⚡ App initialization took 150ms
```

### Navigation

```
[2025-01-XX] 🧭 [NAVIGATION] 🧭 Navigation: dashboard → projects {from: "dashboard", to: "projects", reason: "handleSetView"}
[2025-01-XX] 🔄 [STATE] Setting currentView: dashboard → projects
[2025-01-XX] 📦 [SESSION] Persisted view to localStorage: projects
```

### Inscription

```
[2025-01-XX] 🔐 [AUTH] 🔐 Tentative inscription {email: "user@example.com", role: "student"}
[2025-01-XX] 🔐 [AUTH] 🔐 Inscription réussie {email: "user@example.com"}
[2025-01-XX] 🧭 [NAVIGATION] Redirection vers login après inscription
[2025-01-XX] 🔄 [STATE] Calling onSignupSuccess callback
```

### Erreur

```
[2025-01-XX] ❌ [ERROR] ❌ onSignupSuccess callback not defined - may cause white page
```

## Rapport de Session

Un exemple de rapport généré :

```
📊 RAPPORT DE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session ID: 1705123456789-abc123xyz
Durée: 45s
Total logs: 234

📈 Statistiques:
  - Erreurs: 2
  - Avertissements: 5
  - Navigations: 15
  - Authentifications: 3
  - Rechargements: 1

❌ Erreurs détectées: Erreur inscription, Failed to fetch
⚠️ Avertissements: onSignupSuccess callback not defined

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Prochaines Étapes

1. **Ajouter plus de logs** dans d'autres composants critiques
2. **Intégrer dans AuthContext** pour tracer l'état d'authentification
3. **Intégrer dans le middleware** pour tracer les guards
4. **Ajouter des logs de performance** pour mesurer les temps de chargement
5. **Créer un dashboard** pour visualiser les logs en temps réel

## Script de Debug Rapide

Pour debugger rapidement, copiez ce script dans la console :

```javascript
// Obtenir tous les logs
const allLogs = window.getLogs();

// Filtrer par catégorie
const authLogs = window.getLogs('auth');
const navLogs = window.getLogs('navigation');

// Filtrer par niveau
const errors = window.getLogs(null, 'error');
const warns = window.getLogs(null, 'warn');

// Afficher le rapport
window.sessionReport();

// Exporter pour analyse
const exported = window.exportLogs();
console.log(JSON.parse(exported));
```

## Configuration

### Activer/Désactiver le Logger

```typescript
// Désactiver le logging
logger.setEnabled(false);

// Réactiver
logger.setEnabled(true);
```

### Limiter le Nombre de Logs

Le nombre maximum de logs est configurable (par défaut 1000) :

```typescript
logger.maxLogs = 2000;
```

---

**Date de création** : Janvier 2025  
**Version** : 1.0  
**Auteur** : Système de développement EcosystIA


