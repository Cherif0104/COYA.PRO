import { supabase } from './supabaseService';

// Service de fichiers Supabase Storage
export class FileService {
  // Upload d'un fichier vers Supabase Storage
  static async uploadFile(
    bucket: string,
    file: File,
    path?: string
  ) {
    try {
      const fileName = path || `${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return { 
        data: { 
          path: data.path, 
          url: urlData.publicUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Erreur upload fichier:', error);
      return { data: null, error };
    }
  }

  // Upload d'avatar
  static async uploadAvatar(file: File, userId: string) {
    try {
      const fileName = `avatars/${userId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return { 
        data: { 
          path: data.path, 
          url: urlData.publicUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Erreur upload avatar:', error);
      return { data: null, error };
    }
  }

  // Upload de reçu
  static async uploadReceipt(file: File, expenseId: string) {
    try {
      const fileName = `receipts/${expenseId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return { 
        data: { 
          path: data.path, 
          url: urlData.publicUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Erreur upload reçu:', error);
      return { data: null, error };
    }
  }

  // Upload de document
  static async uploadDocument(file: File, documentId: string) {
    try {
      const fileName = `documents/${documentId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      return { 
        data: { 
          path: data.path, 
          url: urlData.publicUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Erreur upload document:', error);
      return { data: null, error };
    }
  }

  // Supprimer un fichier
  static async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression fichier:', error);
      return { error };
    }
  }

  // Lister les fichiers d'un bucket
  static async listFiles(bucket: string, path?: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur liste fichiers:', error);
      return { data: null, error };
    }
  }

  // Obtenir l'URL publique d'un fichier
  static getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Obtenir l'URL signée d'un fichier (pour les fichiers privés)
  static async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur URL signée:', error);
      return { data: null, error };
    }
  }

  // Télécharger un fichier
  static async downloadFile(bucket: string, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur téléchargement fichier:', error);
      return { data: null, error };
    }
  }

  // Créer un bucket (admin seulement)
  static async createBucket(name: string, isPublic: boolean = false) {
    try {
      const { data, error } = await supabase.storage
        .createBucket(name, {
          public: isPublic,
          allowedMimeTypes: isPublic ? ['image/*'] : ['*/*'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création bucket:', error);
      return { data: null, error };
    }
  }

  // Supprimer un bucket (admin seulement)
  static async deleteBucket(name: string) {
    try {
      const { error } = await supabase.storage
        .deleteBucket(name);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Erreur suppression bucket:', error);
      return { error };
    }
  }

  // Obtenir les informations d'un fichier
  static async getFileInfo(bucket: string, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        });

      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    } catch (error) {
      console.error('Erreur info fichier:', error);
      return { data: null, error };
    }
  }
}

export default FileService;
