# Guide de nettoyage des données de test

## ⚠️ IMPORTANT : Backup obligatoire

Avant toute opération de nettoyage, **faites un backup de votre base Supabase** :

1. Allez sur Supabase Dashboard → Database → Backups
2. Cliquez sur "Create backup"
3. Attendez la fin du backup avant de continuer

## Options de nettoyage

Le script `scripts/cleanup-test-data.sql` propose **5 options** :

### Option 1 : Nettoyage complet (TRUNCATE)
- **Supprime** : Toutes les données de toutes les tables
- **Garde** : La structure des tables (schéma)
- **Utilisation** : Production vierge, départ à zéro
- **Risque** : ⚠️⚠️⚠️ ÉLEVÉ - Tout est supprimé

**Instructions** :
1. Ouvrez `scripts/cleanup-test-data.sql`
2. Décommentez les lignes `TRUNCATE TABLE ...` dans la section OPTION 1
3. Exécutez dans l'éditeur SQL Supabase

### Option 2 : Nettoyage sélectif par date
- **Supprime** : Données créées avant une date spécifique
- **Garde** : Données récentes + super admin + SENEGEL
- **Utilisation** : Conserver les derniers ajouts, supprimer l'historique
- **Risque** : ⚠️ MOYEN - Contrôle granulaire

**Instructions** :
1. Modifiez la variable `cutoff_date` (ligne ~89)
2. Décommentez le bloc `DELETE FROM ...` dans la section DO $$
3. Exécutez le script

**Exemple** : Pour garder les données des 7 derniers jours :
```sql
cutoff_date TIMESTAMP := NOW() - INTERVAL '7 days';
```

### Option 3 : Nettoyage par type de données
- **Supprime** : Uniquement certaines catégories (projets, cours, emplois, etc.)
- **Garde** : Le reste
- **Utilisation** : Nettoyer module par module
- **Risque** : ⚠️ FAIBLE - Très ciblé

**Instructions** :
1. Décommentez uniquement les lignes correspondant aux données à supprimer
2. Exemple : `DELETE FROM projects WHERE title ILIKE '%test%';`
3. Exécutez les requêtes une par une

### Option 4 : Nettoyage des utilisateurs test
- **Supprime** : Utilisateurs avec "test", "demo", "facilitateur-partenaire" dans l'email
- **Garde** : Super admin principal
- **Utilisation** : Nettoyer les comptes de test uniquement
- **Risque** : ⚠️⚠️ MOYEN-ÉLEVÉ - Supprime aussi toutes les données de ces utilisateurs

**Instructions** :
1. Exécutez d'abord la requête `SELECT` pour voir la liste
2. Vérifiez que le super admin N'EST PAS dans la liste
3. Décommentez le `DELETE FROM profiles ...`
4. Exécutez

### Option 5 : Réinitialisation complète
- **Supprime** : TOUT sauf super admin et organisation SENEGEL
- **Garde** : Super admin + SENEGEL
- **Utilisation** : Repartir de zéro pour PROD avec un seul utilisateur
- **Risque** : ⚠️⚠️⚠️ TRÈS ÉLEVÉ - Presque tout est supprimé

**Instructions** :
1. **BACKUP OBLIGATOIRE**
2. Vérifiez l'email du super admin dans le script (ligne ~173)
3. Décommentez le bloc DO $$ de l'OPTION 5
4. Exécutez une fois, attendez la fin
5. Vérifiez les résultats avec les requêtes de vérification

## Vérifications post-nettoyage

Après nettoyage, exécutez les requêtes de vérification (en bas du script) :

```sql
-- Compter les éléments restants
SELECT 'Utilisateurs', COUNT(*) FROM profiles
UNION ALL SELECT 'Projets', COUNT(*) FROM projects
-- ... etc.

-- Vérifier les utilisateurs restants
SELECT email, full_name, role FROM profiles;

-- Vérifier les organisations restantes
SELECT name, slug, is_active FROM organizations;
```

## Recommandations selon votre cas

### Cas 1 : Première mise en production
- **Action** : Option 5 (Réinitialisation complète)
- **Résultat** : Base propre avec 1 super admin + org SENEGEL
- **Ensuite** : Créer les vrais utilisateurs

### Cas 2 : Vous avez déjà des vraies données
- **Action** : Option 3 ou 4 (Nettoyage sélectif)
- **Résultat** : Supprimer uniquement les tests
- **Ensuite** : Vérifier manuellement

### Cas 3 : Vous voulez garder des exemples
- **Action** : Option 2 (par date) ou Option 3 (par type)
- **Résultat** : Contrôle fin sur ce qui reste
- **Ensuite** : Anonymiser si nécessaire

## Checklist avant exécution

- [ ] Backup Supabase créé et vérifié
- [ ] Script SQL lu et compris
- [ ] Option choisie et décommentée
- [ ] Email super admin vérifié dans le script
- [ ] ID org SENEGEL vérifié (`550e8400-e29b-41d4-a716-446655440000`)
- [ ] Test en local d'abord (si possible)

## Exécution sur Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **SQL Editor** → **New query**
4. Copiez-collez le script (avec les options décommentées)
5. Cliquez sur **Run**
6. Attendez la fin de l'exécution
7. Vérifiez les résultats avec les requêtes de vérification

## En cas d'erreur

Si une erreur survient pendant l'exécution :

1. **Ne paniquez pas** - Les transactions SQL sont généralement atomiques
2. Notez le message d'erreur exact
3. Vérifiez si des données ont été supprimées (requêtes de vérification)
4. Restaurez depuis le backup si nécessaire
5. Corrigez le script et réessayez

## Après le nettoyage

1. **Testez la connexion** : Connectez-vous avec le super admin
2. **Vérifiez les modules** : Parcourez tous les modules pour confirmer qu'ils sont vides
3. **Créez des données de prod** : Ajoutez vos vraies données
4. **Testez les fonctionnalités** : Créez un projet, un cours, une facture, etc.
5. **Déployez sur Netlify** : Une fois satisfait

## Données à garder en production

- ✅ Organisation SENEGEL
- ✅ Super administrateur principal
- ✅ Permissions modules par défaut
- ❌ Tout le reste (à créer selon les besoins réels)

## Support

En cas de problème, conservez :
- Le message d'erreur
- La requête SQL exécutée
- Le nombre d'éléments avant/après
- L'email du compte avec lequel vous testez

---

**Créé le** : 2025-11-07  
**Priorité** : ÉLEVÉE - À faire avant déploiement client  
**Durée estimée** : 10-30 minutes selon l'option choisie

