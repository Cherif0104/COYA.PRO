# Fonctionnalité de Suppression d'Utilisateurs

## Vue d'ensemble

Cette fonctionnalité permet aux rôles de **management** (Super Administrator, Administrator, Manager) de supprimer définitivement des utilisateurs de la plateforme SENEGEL.

## Implémentation

### Architecture

La suppression d'utilisateur fonctionne à plusieurs niveaux :

1. **Interface Utilisateur** : Modal de confirmation dans `UserManagement.tsx`
2. **Service de données** : Gestion dans `DataService.deleteUser()`
3. **Base de données** : Politique RLS pour autoriser la suppression

### Composants

#### 1. UserManagement.tsx

```typescript
// Import de ConfirmationModal pour remplacer window.confirm
import ConfirmationModal from './common/ConfirmationModal';

// État pour gérer l'utilisateur en cours de suppression
const [deletingUserId, setDeletingUserId] = useState<string | number | null>(null);

// Fonction pour déclencher le modal de confirmation
const handleDelete = async (user: User) => {
    setDeletingUserId(user.id);
};

// Fonction pour confirmer la suppression
const confirmDeleteUser = async () => {
    if (!deletingUserId || !onDeleteUser) return;
    
    try {
        await onDeleteUser(deletingUserId);
        console.log('✅ Utilisateur supprimé avec succès');
        setDeletingUserId(null);
    } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        alert('Erreur lors de la suppression de l\'utilisateur');
    }
};
```

#### 2. DataService.deleteUser()

**Fichier** : `services/dataService.ts`

```typescript
static async deleteUser(userId: string | number) {
    try {
        console.log('🔄 Delete user:', { userId });
        
        const userIdStr = String(userId);
        
        // Vérifier que l'utilisateur existe d'abord
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userIdStr)
            .single();
        
        if (checkError || !existingUser) {
            console.error('❌ Erreur: Utilisateur non trouvé dans profiles:', userIdStr);
            throw new Error('Utilisateur non trouvé');
        }
        
        console.log('✅ Utilisateur trouvé:', existingUser.email, existingUser.full_name);
        
        // Supprimer le profil de la table profiles
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', userIdStr);
        
        if (error) {
            console.error('❌ Erreur delete user:', error);
            throw error;
        }
        
        console.log('✅ User deleted:', { userId: userIdStr });
        return { success: true, error: null };
    } catch (error) {
        console.error('❌ Erreur delete user:', error);
        return { success: false, error };
    }
}
```

**Logs de debug inclus** :
- ✅ Recherche de l'utilisateur avant suppression
- ✅ Affichage de l'email et du nom trouvés
- ✅ Confirmation de suppression réussie
- ❌ Erreur si utilisateur non trouvé
- ❌ Erreur lors de la suppression

#### 3. Politique RLS (Row-Level Security)

**Fichier de migration** : `allow_management_roles_delete_profiles`

```sql
-- Politique RLS pour permettre aux rôles de management de supprimer les profils
CREATE POLICY "Management roles can delete any profile"
ON profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles AS current_profile
    WHERE current_profile.user_id = auth.uid()
    AND current_profile.role IN ('super_administrator', 'administrator', 'manager')
  )
);
```

**Rôles autorisés** :
- `super_administrator` : Accès système complet
- `administrator` : Administrateur SENEGEL
- `manager` : Manager SENEGEL

## Flux de suppression

```
1. Utilisateur clique sur "Supprimer" 
   ↓
2. Modal de confirmation s'affiche
   ↓
3. Utilisateur confirme la suppression
   ↓
4. Appelle App.handleDeleteUser()
   ↓
5. Appelle DataAdapter.deleteUser()
   ↓
6. Appelle DataService.deleteUser()
   ↓
7. Vérifie l'existence de l'utilisateur
   ↓
8. Supprime le profil de la table profiles
   ↓
9. Met à jour la liste locale
   ↓
10. Affiche un message de succès
```

## Sécurité

### Vérifications

1. **Authentification** : Seuls les utilisateurs authentifiés peuvent supprimer
2. **Rôle** : Seuls les rôles de management peuvent supprimer
3. **Existence** : Vérification de l'existence de l'utilisateur avant suppression
4. **Confirmation** : Modal de confirmation avant suppression définitive

### Politique RLS

La politique RLS garantit que :
- Seuls les Super Administrators, Administrators et Managers peuvent supprimer
- Les autres rôles ne peuvent pas supprimer des utilisateurs
- La suppression est vérifiée au niveau de la base de données

## Gestion des erreurs

### Cas d'erreur possibles

1. **Utilisateur non trouvé** :
   ```
   ❌ Erreur: Utilisateur non trouvé dans profiles: <userId>
   ```
   - Solution : Vérifier que l'ID est correct

2. **Erreur de permission RLS** :
   ```
   ❌ Erreur delete user: <RLS error>
   ```
   - Solution : Vérifier que l'utilisateur actuel a le bon rôle

3. **Erreur de base de données** :
   ```
   ❌ Erreur delete user: <DB error>
   ```
   - Solution : Vérifier la connexion à Supabase

## Persistance

### Ce qui est supprimé

- **Table `profiles`** : Le profil utilisateur est supprimé
- **Liste locale** : L'utilisateur est retiré de la liste dans l'interface

### Ce qui n'est PAS supprimé (actuellement)

- **Table `auth.users`** : Le compte Auth Supabase reste actif
  - *Note* : Pour supprimer complètement, il faudrait utiliser l'Admin API avec la service_role key

## Améliorations futures

### Suggestions

1. **Suppression complète** : Utiliser l'Admin API pour supprimer aussi de `auth.users`
2. **Soft Delete** : Marquer comme supprimé au lieu de supprimer définitivement
3. **Audit Trail** : Enregistrer qui a supprimé quoi et quand
4. **Notification** : Notifier l'utilisateur par email avant suppression

## Tests

### Scénarios testés

- ✅ **Super Admin supprime un utilisateur** : Fonctionne
- ✅ **Administrator supprime un utilisateur** : Fonctionne
- ✅ **Manager supprime un utilisateur** : Fonctionne
- ✅ **Suppression persistée après refresh** : Fonctionne
- ✅ **Modal de confirmation** : Fonctionne
- ❌ **Utilisateur non-management essaie de supprimer** : Bloqué par RLS

## Logs de Debug

### Logs disponibles

```javascript
🔄 Delete user: { userId: 'xxx' }
✅ Utilisateur trouvé: email@example.com Nom Utilisateur
✅ User deleted: { userId: 'xxx' }
✅ DataAdapter.deleteUser - User deleted: { userId: 'xxx' }
✅ Utilisateur supprimé de Supabase et localement
✅ Utilisateur supprimé avec succès
```

## Notes importantes

1. **Action irréversible** : La suppression est définitive (sans soft delete)
2. **Permissions requises** : Rôle de management requis
3. **RLS obligatoire** : Politique RLS nécessaire pour autoriser la suppression
4. **Logs importants** : Les logs aident à tracer toute suppression

---

**Date de création** : Janvier 2025  
**Version** : 1.0  
**Auteur** : Système de configuration SENEGEL


