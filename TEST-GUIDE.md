# 🧪 Guide de Test - Migration EcosystIA vers Supabase

## ✅ Tests de Validation

### 1. **Test d'Authentification**
- [ ] Ouvrir l'application sur http://localhost:5173
- [ ] Vérifier que la page de connexion s'affiche
- [ ] Tester l'inscription d'un nouvel utilisateur
- [ ] Tester la connexion avec un utilisateur existant
- [ ] Vérifier que le dashboard s'affiche après connexion

### 2. **Test des Modules Critiques**
- [ ] **Dashboard** : Vérifier que les statistiques s'affichent
- [ ] **Projects** : Créer un nouveau projet
- [ ] **Finance** : Créer une facture et une dépense
- [ ] Vérifier que les données sont persistées

### 3. **Test des Modules Business**
- [ ] **CRM** : Ajouter un nouveau contact
- [ ] **Time Tracking** : Enregistrer du temps
- [ ] **Leave Management** : Créer une demande de congé

### 4. **Test des Modules Formation**
- [ ] **Course Management** : Créer un nouveau cours
- [ ] **Courses** : Naviguer dans les cours
- [ ] **Course Detail** : Voir les détails d'un cours

### 5. **Test des Modules Complémentaires**
- [ ] **Goals** : Créer un nouvel objectif
- [ ] **Knowledge Base** : Ajouter un document

### 6. **Test des Notifications Temps Réel**
- [ ] Ouvrir deux onglets de l'application
- [ ] Créer un projet dans un onglet
- [ ] Vérifier que la notification apparaît dans l'autre onglet

### 7. **Test de Performance**
- [ ] Vérifier que l'application se charge rapidement
- [ ] Tester la navigation entre les modules
- [ ] Vérifier qu'il n'y a pas d'erreurs dans la console

## 🐛 Dépannage

### Erreurs Courantes
1. **Erreur de connexion Supabase** : Vérifier les variables d'environnement
2. **Erreur d'authentification** : Vérifier que les tables existent dans Supabase
3. **Erreur de données** : Vérifier que l'adaptateur fonctionne correctement

### Commandes de Debug
```bash
# Vérifier les logs du serveur
npm run dev

# Vérifier les erreurs dans la console du navigateur
F12 → Console

# Tester les services Supabase
window.testEcosystIA.runAllTests()
```

## 📊 Métriques de Succès

- ✅ **Authentification** : 100% fonctionnelle
- ✅ **CRUD Operations** : Toutes les opérations fonctionnent
- ✅ **Notifications** : Temps réel opérationnel
- ✅ **Performance** : Chargement < 3 secondes
- ✅ **Erreurs** : 0 erreur critique dans la console

## 🚀 Prochaines Étapes

1. **Tests utilisateur** : Faire tester par des utilisateurs réels
2. **Tests de charge** : Tester avec plusieurs utilisateurs simultanés
3. **Déploiement** : Préparer le déploiement sur Netlify
4. **Monitoring** : Mettre en place le monitoring de production
