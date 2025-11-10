# 🔒 SÉCURISATION SUPABASE STORAGE

## 📋 Vue d'ensemble

Ce document détaille la configuration de sécurité pour les buckets de stockage Supabase (avatars, documents, uploads).

---

## 🛡️ POLITIQUES STORAGE À CRÉER

### 1. Bucket : `avatars`

**Objectif** : Stocker les photos de profil des utilisateurs

**Politiques RLS** :

```sql
-- Activer RLS sur le bucket
UPDATE storage.buckets SET public = false WHERE name = 'avatars';

-- Tous les utilisateurs authentifiés peuvent lire les avatars
CREATE POLICY "Avatar public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Les utilisateurs peuvent uploader leur propre avatar
CREATE POLICY "Avatar user upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Les utilisateurs peuvent mettre à jour leur propre avatar
CREATE POLICY "Avatar user update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Les utilisateurs peuvent supprimer leur propre avatar
CREATE POLICY "Avatar user delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

### 2. Bucket : `documents`

**Objectif** : Stocker les documents de la Knowledge Base

**Politiques RLS** :

```sql
-- Activer RLS sur le bucket
UPDATE storage.buckets SET public = false WHERE name = 'documents';

-- Lecture : Tous les utilisateurs authentifiés (Knowledge Base publique)
CREATE POLICY "Document public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Upload : Tous les utilisateurs authentifiés
CREATE POLICY "Document user upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Mise à jour : Seulement le créateur
CREATE POLICY "Document creator update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Suppression : Seulement le créateur
CREATE POLICY "Document creator delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

### 3. Bucket : `project-files`

**Objectif** : Stocker les fichiers joints aux projets

**Politiques RLS** :

```sql
-- Activer RLS sur le bucket
UPDATE storage.buckets SET public = false WHERE name = 'project-files';

-- Lecture : Membres de l'organisation
CREATE POLICY "Project file read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
);

-- Upload : Membres authentifiés
CREATE POLICY "Project file upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.role() = 'authenticated'
);

-- Mise à jour : Créateur ou admin
CREATE POLICY "Project file update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_administrator', 'administrator')
    )
  )
);

-- Suppression : Créateur ou admin
CREATE POLICY "Project file delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_administrator', 'administrator')
    )
  )
);
```

---

## 🔒 RESTRICTIONS DE TAILLE ET TYPE

### Limites suggérées

```sql
-- Fonction de validation des uploads
CREATE OR REPLACE FUNCTION validate_file_upload(
  bucket_name TEXT,
  file_name TEXT,
  file_size BIGINT,
  content_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier la taille (max 5MB)
  IF file_size > 5242880 THEN
    RAISE EXCEPTION 'File size exceeds 5MB limit';
  END IF;

  -- Vérifier le type MIME pour les avatars (images uniquement)
  IF bucket_name = 'avatars' THEN
    IF content_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
      RAISE EXCEPTION 'Invalid file type for avatar. Only images allowed';
    END IF;
  END IF;

  -- Vérifier le type MIME pour les documents (PDF, images, documents)
  IF bucket_name = 'documents' THEN
    IF content_type NOT IN (
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ) THEN
      RAISE EXCEPTION 'Invalid file type for document';
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛠️ IMPLÉMENTATION CÔTÉ FRONTEND

### Service de gestion des uploads

```typescript
// services/fileService.ts (exemple d'amélioration)

export const uploadAvatar = async (file: File, userId: string) => {
  // Vérification taille
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Fichier trop volumineux (max 5MB)');
  }

  // Vérification type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Type de fichier non autorisé');
  }

  // Upload vers Supabase Storage
  const fileName = `${userId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
};
```

---

## ✅ CHECKLIST SÉCURISATION

- [ ] Buckets créés dans Supabase Dashboard
- [ ] RLS activé sur tous les buckets
- [ ] Politiques RLS appliquées
- [ ] Fonction de validation créée
- [ ] Frontend vérifie taille et type
- [ ] Tests de sécurité effectués

---

## 📝 NOTES IMPORTANTES

1. **Toujours valider côté backend** : Les restrictions frontend peuvent être contournées
2. **Limiter la taille** : Éviter les uploads trop volumineux
3. **Scanner antivirus** : Recommandé pour production
4. **CDN** : Configurer un CDN pour les avatars publics
5. **Backup** : Sauvegarder régulièrement les fichiers critiques

---

**FIN DU DOCUMENT**

