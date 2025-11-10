# Amélioration : Gestion des Timeouts API

## Date : Janvier 2025
## Version : 2.1

## Problème Identifié

Les logs montraient de nombreuses erreurs `TypeError: Failed to fetch` sans message clair :

```javascript
❌ Erreur API GET projects: TypeError: Failed to fetch
❌ Erreur API GET invoices: TypeError: Failed to fetch
❌ Erreur get user module permissions: TypeError: Failed to fetch
AuthRetryableFetchError: Failed to fetch
```

### Causes Possibles

1. **Timeout réseau** : Réponse non reçue dans un délai raisonnable
2. **Problème serveur** : Supabase temporairement inaccessible
3. **Problème de réseau** : Connexion instable ou interrompue
4. **Absence de timeout configuré** : Les requêtes attendaient indéfiniment

### Impact

- UX dégradée : utilisateurs voient des erreurs incompréhensibles
- Crashs possibles : certaines fonctionnalités ne répondent plus
- Perte de temps : attente indéfinie sans feedback
- Logs pollués : messages d'erreur non informatifs

---

## Solution Implémentée

### Timeout de 10 secondes pour tous les appels API

Ajout d'un `AbortController` avec timeout de 10 secondes pour toutes les méthodes HTTP :

```typescript
// ❌ AVANT
const response = await fetch(url, {
  headers
});

// ✅ APRÈS
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

const response = await fetch(url, {
  headers,
  signal: controller.signal
});

clearTimeout(timeoutId);
```

### Messages d'Erreur Améliorés

Distinction entre timeout et autres erreurs :

```typescript
catch (error: any) {
  if (error.name === 'AbortError') {
    console.error(`⏱️ Timeout API GET ${endpoint} - Réponse non reçue dans les 10 secondes`);
  } else {
    console.error(`❌ Erreur API GET ${endpoint}:`, error.message || error);
  }
  return { data: null, error };
}
```

---

## Méthodes Modifiées

### 1. GET Request

```typescript
static async get(endpoint: string, params?: Record<string, any>) {
  // ...
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const response = await fetch(url, {
    headers,
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  // ...
}
```

### 2. POST Request

```typescript
static async post(endpoint: string, payload: any) {
  // ...
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  // ...
}
```

### 3. PUT Request

```typescript
static async put(endpoint: string, id: string, payload: any) {
  // ...
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  // ...
}
```

### 4. DELETE Request

```typescript
static async delete(endpoint: string, id: string) {
  // ...
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers,
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  // ...
}
```

---

## Bénéfices

### Pour les Utilisateurs

✅ **Feedback rapide** : Plus d'attente indéfinie  
✅ **Messages clairs** : Distinction entre timeout et autres erreurs  
✅ **Meilleure UX** : Échec rapide plutôt que freeze  

### Pour les Développeurs

✅ **Debug facilité** : Logs plus informatifs  
✅ **Identification rapide** : Timeout vs erreur serveur  
✅ **Monitoring amélioré** : Détection facile des problèmes réseau  

---

## Configuration

### Timeout Courant

- **Durée** : 10 secondes
- **Portée** : Tous les appels API (GET, POST, PUT, DELETE)
- **Méthode** : `AbortController` natif

### Personnalisation

Pour modifier le timeout, éditer la valeur dans chaque méthode :

```typescript
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes
const timeoutId = setTimeout(() => controller.abort(), 5000);  // 5 secondes
const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes
```

---

## Tests Recommandés

### Test 1 : Network Throttling

1. Ouvrir DevTools → Network
2. Sélectionner "Slow 3G"
3. Tester connexion/login
4. Vérifier que timeout s'affiche après 10s

### Test 2 : Offline Mode

1. Activer "Offline" dans DevTools
2. Tenter une action nécessitant API
3. Vérifier message d'erreur clair

### Test 3 : Serveur Inaccessible

1. Temporairement bloquer Supabase dans firewall
2. Tenter connexion
3. Vérifier message timeout

---

## Prochaines Améliorations

### Priorité Haute

- [ ] Retry automatique sur timeout
- [ ] Modal informatif pour l'utilisateur
- [ ] Fallback vers cache local

### Priorité Moyenne

- [ ] Configurable via variables d'environnement
- [ ] Metrics de timeout par endpoint
- [ ] Alertes automatiques

### Priorité Basse

- [ ] Timeout adaptatif selon type d'opération
- [ ] Circuit breaker pattern
- [ ] Rate limiting

---

## Références

- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Supabase: Timeout handling](https://supabase.com/docs/guides/api/rest/fetch)
- [JavaScript: Fetch API timeout](https://javascript.info/fetch-abort)

---

**Date de création** : Janvier 2025  
**Version** : 2.1  
**Auteur** : Système de développement EcosystIA


