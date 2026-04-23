import { supabase } from './supabaseService';
import { handleOptionalTableError, isTableUnavailable } from './optionalTableGuard';

export type DriveItemType = 'folder' | 'file' | 'doc';

export type DriveItem = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  item_type: DriveItemType;
  name: string;
  description?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  owner_profile_id?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  trashed_at?: string | null;
  visibility?: 'private' | 'org_public';
};

const DRIVE_BUCKET = 'drive-files';
const DRIVE_TABLE = 'drive_items';

/** Fichiers « bureautiques » (PDF, Office, équivalents). */
const OFFICE_NAME_PATTERN = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|odt|ods|odp)$/i;

export class DriveService {
  /** Garantit un access_token sur le client REST (évite 403 RLS si la session n'est pas encore propagée). */
  private static async requireRestSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { error };
    if (!data.session?.access_token) {
      return { error: new Error('Session indisponible ou expirée. Reconnectez-vous pour utiliser DOCS SENEGEL.') };
    }
    return { error: null as null };
  }

  static async getProfileContext() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return { data: null as any, error: new Error('Non authentifié') };

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, organization_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !profile?.organization_id) {
      return { data: null, error: error ?? new Error('Profil/organisation introuvable') };
    }

    return { data: { user: userRes.user, profile }, error: null };
  }

  static async list(parentId: string | null) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: [] as DriveItem[], error: null };
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DriveItem[], error: ctx.error };
    const { profile } = ctx.data;

    const query = supabase
      .from('drive_items')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .is('trashed_at', null)
      .order('item_type', { ascending: true })
      .order('name', { ascending: true });

    const { data, error } =
      parentId === null ? await query.is('parent_id', null) : await query.eq('parent_id', parentId);

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.list')) {
      return { data: [] as DriveItem[], error: null };
    }
    return { data: (data as DriveItem[]) ?? [], error };
  }

  static async listTrashed() {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: [] as DriveItem[], error: null };
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DriveItem[], error: ctx.error };
    const { profile } = ctx.data;

    const { data, error } = await supabase
      .from('drive_items')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .not('trashed_at', 'is', null)
      .order('trashed_at', { ascending: false })
      .order('name', { ascending: true });

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.listTrashed')) {
      return { data: [] as DriveItem[], error: null };
    }
    return { data: (data as DriveItem[]) ?? [], error };
  }

  static async listRecent(limit = 30) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: [] as DriveItem[], error: null };
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DriveItem[], error: ctx.error };
    const { profile } = ctx.data;

    const { data, error } = await supabase
      .from('drive_items')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .is('trashed_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.listRecent')) {
      return { data: [] as DriveItem[], error: null };
    }
    return { data: (data as DriveItem[]) ?? [], error };
  }

  static async search(query: string, limit = 60) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: [] as DriveItem[], error: null };
    const q = query.trim();
    if (!q) return { data: [] as DriveItem[], error: null };

    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DriveItem[], error: ctx.error };
    const { profile } = ctx.data;

    const safe = q
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/,/g, ' ')
      .slice(0, 120);
    const pattern = `%${safe}%`;
    const { data, error } = await supabase
      .from('drive_items')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .is('trashed_at', null)
      .or(`name.ilike.${pattern},description.ilike.${pattern},mime_type.ilike.${pattern}`)
      .order('item_type', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit);

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.search')) {
      return { data: [] as DriveItem[], error: null };
    }
    return { data: (data as DriveItem[]) ?? [], error };
  }

  static async listAllFolders() {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: [] as DriveItem[], error: null };
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DriveItem[], error: ctx.error };
    const { profile } = ctx.data;

    const { data, error } = await supabase
      .from('drive_items')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('item_type', 'folder')
      .is('trashed_at', null)
      .order('name', { ascending: true });

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.listAllFolders')) {
      return { data: [] as DriveItem[], error: null };
    }
    return { data: (data as DriveItem[]) ?? [], error };
  }

  static async getBreadcrumbs(parentId: string | null) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: [] as DriveItem[], error: null };
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DriveItem[], error: ctx.error };
    const { profile } = ctx.data;

    const crumbs: DriveItem[] = [];
    let current = parentId;
    const guard = new Set<string>();

    while (current) {
      if (guard.has(current)) break;
      guard.add(current);

      const { data, error } = await supabase
        .from('drive_items')
        .select('*')
        .eq('id', current)
        .eq('organization_id', profile.organization_id)
        .single();

      if (error) {
        if (handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.getBreadcrumbs')) break;
        break;
      }
      if (!data) break;
      const item = data as DriveItem;
      crumbs.push(item);
      current = item.parent_id;
    }

    crumbs.reverse();
    return { data: crumbs, error: null };
  }

  static async createFolder(params: { parentId: string | null; name: string; description?: string }) {
    if (isTableUnavailable(DRIVE_TABLE)) {
      return { data: null as DriveItem | null, error: new Error('Table drive_items absente : appliquez la migration Supabase (DOCS SENEGEL).') };
    }
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DriveItem | null, error: ctx.error };
    const sessErr = await DriveService.requireRestSession();
    if (sessErr.error) return { data: null as DriveItem | null, error: sessErr.error };
    const { user, profile } = ctx.data;

    const id = globalThis.crypto?.randomUUID?.();
    if (!id) return { data: null as DriveItem | null, error: new Error('Impossible de générer un identifiant pour le dossier.') };

    // Pas de .select() sur l’insert : PostgREST évite RETURNING * ; on relit la ligne (même politique SELECT, id connu).
    const { error } = await supabase.from('drive_items').insert({
      id,
      organization_id: profile.organization_id,
      parent_id: params.parentId,
      item_type: 'folder',
      name: params.name,
      description: params.description ?? null,
      visibility: 'private',
      owner_profile_id: profile.id,
      created_by_id: profile.id,
      created_by_name: profile.full_name ?? user.email ?? 'Utilisateur',
    });
    if (error) return { data: null as DriveItem | null, error };

    const { data, error: readError } = await supabase.from('drive_items').select('*').eq('id', id).maybeSingle();
    if (readError) return { data: null as DriveItem | null, error: readError };
    return { data: (data as DriveItem) ?? null, error: null };
  }

  static async setFolderVisibility(folderId: string, visibility: 'private' | 'org_public') {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as DriveItem | null, error: null };
    const { data, error } = await supabase
      .from('drive_items')
      .update({ visibility })
      .eq('id', folderId)
      .eq('item_type', 'folder')
      .select('*')
      .single();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.setFolderVisibility')) {
      return { data: null as DriveItem | null, error: null };
    }
    return { data: (data as DriveItem) ?? null, error };
  }

  static isAllowedDocumentFile(file: File): boolean {
    const name = file.name || '';
    if (OFFICE_NAME_PATTERN.test(name)) return true;
    const m = (file.type || '').toLowerCase();
    if (!m) return false;
    if (m === 'application/pdf') return true;
    if (m.includes('wordprocessingml') || m.includes('msword')) return true;
    if (m.includes('spreadsheetml') || m.includes('excel') || m === 'text/csv') return true;
    if (m.includes('presentationml') || m.includes('powerpoint')) return true;
    if (m.includes('opendocument')) return true;
    return false;
  }

  static async uploadFile(params: { parentId: string | null; file: File }) {
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DriveItem | null, error: ctx.error };
    const sessErr = await DriveService.requireRestSession();
    if (sessErr.error) return { data: null as DriveItem | null, error: sessErr.error };
    const { user, profile } = ctx.data;

    if (!DriveService.isAllowedDocumentFile(params.file)) {
      return {
        data: null as DriveItem | null,
        error: new Error(
          'Format non autorisé : utilisez PDF, Word, Excel, PowerPoint ou équivalent (voir message sous le bouton envoi).',
        ),
      };
    }

    const orgPrefix = String(profile.organization_id);
    const safeName = params.file.name.replace(/[^\w.\-()\s]/g, '_');
    const path = `${orgPrefix}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from(DRIVE_BUCKET).upload(path, params.file, { upsert: false });
    if (uploadError) return { data: null, error: uploadError };

    const { data: publicUrl } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(path);

    const id = globalThis.crypto?.randomUUID?.();
    if (!id) return { data: null, error: new Error('Impossible de générer un identifiant pour le fichier.') };

    const { error } = await supabase.from('drive_items').insert({
      id,
      organization_id: profile.organization_id,
      parent_id: params.parentId,
      item_type: 'file',
      name: params.file.name,
      mime_type: params.file.type || null,
      size_bytes: params.file.size,
      storage_bucket: DRIVE_BUCKET,
      storage_path: path,
      description: publicUrl?.publicUrl ?? null,
      created_by_id: profile.id,
      created_by_name: profile.full_name ?? user.email ?? 'Utilisateur',
    });

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.uploadFile')) {
      return { data: null, error: new Error('Table drive_items absente : appliquez la migration Supabase (DOCS SENEGEL).') };
    }
    if (error) return { data: null, error };

    const { data, error: readError } = await supabase.from('drive_items').select('*').eq('id', id).maybeSingle();
    if (readError) return { data: null, error: readError };
    return { data: (data as DriveItem) ?? null, error: null };
  }

  static async trashItem(itemId: string) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as DriveItem | null, error: null };
    const { data, error } = await supabase
      .from('drive_items')
      .update({ trashed_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.trashItem')) {
      return { data: null, error: null };
    }
    return { data: (data as DriveItem) ?? null, error };
  }

  static async restoreItem(itemId: string) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as DriveItem | null, error: null };
    const { data, error } = await supabase
      .from('drive_items')
      .update({ trashed_at: null })
      .eq('id', itemId)
      .select('*')
      .single();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.restoreItem')) {
      return { data: null, error: null };
    }
    return { data: (data as DriveItem) ?? null, error };
  }

  static async renameItem(itemId: string, name: string) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as DriveItem | null, error: null };
    const { data, error } = await supabase
      .from('drive_items')
      .update({ name })
      .eq('id', itemId)
      .select('*')
      .single();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.renameItem')) {
      return { data: null, error: null };
    }
    return { data: (data as DriveItem) ?? null, error };
  }

  static async moveItem(itemId: string, parentId: string | null) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as DriveItem | null, error: null };
    const { data, error } = await supabase
      .from('drive_items')
      .update({ parent_id: parentId })
      .eq('id', itemId)
      .select('*')
      .single();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.moveItem')) {
      return { data: null, error: null };
    }
    return { data: (data as DriveItem) ?? null, error };
  }

  static async getItem(itemId: string) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as DriveItem | null, error: null };
    const { data, error } = await supabase.from('drive_items').select('*').eq('id', itemId).maybeSingle();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.getItem')) {
      return { data: null as DriveItem | null, error: null };
    }
    return { data: (data as DriveItem) ?? null, error };
  }

  static async copyItem(itemId: string, targetParentId: string | null) {
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DriveItem | null, error: ctx.error };
    const sessErr = await DriveService.requireRestSession();
    if (sessErr.error) return { data: null as DriveItem | null, error: sessErr.error };
    const { user, profile } = ctx.data;

    const { data: src, error: srcErr } = await DriveService.getItem(itemId);
    if (srcErr) return { data: null as DriveItem | null, error: srcErr };
    if (!src) return { data: null as DriveItem | null, error: new Error('Élément introuvable') };

    if (src.item_type === 'folder') {
      const res = await DriveService.copyFolderRecursive(src, targetParentId, {
        userEmail: user.email ?? null,
        requesterName: profile.full_name ?? user.email ?? 'Utilisateur',
        ownerProfileId: profile.id,
      });
      return res;
    }

    const res = await DriveService.copyFileLike(src, targetParentId, {
      orgId: String(profile.organization_id),
      createdById: profile.id,
      createdByName: profile.full_name ?? user.email ?? 'Utilisateur',
    });
    return res;
  }

  private static async copyFileLike(
    src: DriveItem,
    targetParentId: string | null,
    meta: { orgId: string; createdById: string; createdByName: string },
  ) {
    if (!src.storage_bucket || !src.storage_path) {
      return { data: null as DriveItem | null, error: new Error('Ce fichier n’a pas de stockage associé') };
    }
    const id = globalThis.crypto?.randomUUID?.();
    if (!id) return { data: null as DriveItem | null, error: new Error('Impossible de générer un identifiant.') };

    const safeName = (src.name || 'copie').replace(/[^\w.\-()\s]/g, '_');
    const newPath = `${meta.orgId}/${Date.now()}_${safeName}`;

    const { error: copyErr } = await supabase.storage.from(src.storage_bucket).copy(src.storage_path, newPath);
    if (copyErr) return { data: null as DriveItem | null, error: copyErr };

    const { data: publicUrl } = supabase.storage.from(src.storage_bucket).getPublicUrl(newPath);

    const { error: insErr } = await supabase.from('drive_items').insert({
      id,
      organization_id: src.organization_id,
      parent_id: targetParentId,
      item_type: src.item_type,
      name: DriveService.withCopySuffix(src.name),
      mime_type: src.mime_type ?? null,
      size_bytes: src.size_bytes ?? null,
      storage_bucket: src.storage_bucket,
      storage_path: newPath,
      description: publicUrl?.publicUrl ?? null,
      created_by_id: meta.createdById,
      created_by_name: meta.createdByName,
    });
    if (insErr) return { data: null as DriveItem | null, error: insErr };

    const { data, error: readError } = await supabase.from('drive_items').select('*').eq('id', id).maybeSingle();
    if (readError) return { data: null as DriveItem | null, error: readError };
    return { data: (data as DriveItem) ?? null, error: null };
  }

  private static async copyFolderRecursive(
    srcFolder: DriveItem,
    targetParentId: string | null,
    meta: { userEmail: string | null; requesterName: string; ownerProfileId: string },
  ) {
    if (srcFolder.item_type !== 'folder') {
      return { data: null as DriveItem | null, error: new Error('copyFolderRecursive: source invalide') };
    }

    const created = await DriveService.createFolder({
      parentId: targetParentId,
      name: DriveService.withCopySuffix(srcFolder.name),
      description: srcFolder.description ?? undefined,
    });
    if (created.error || !created.data) return { data: null as DriveItem | null, error: created.error ?? new Error('Création dossier échouée') };

    const children = await DriveService.list(srcFolder.id);
    if (children.error) return { data: created.data, error: children.error };

    for (const child of children.data) {
      if (child.item_type === 'folder') {
        const r = await DriveService.copyFolderRecursive(child, created.data.id, meta);
        if (r.error) return { data: created.data, error: r.error };
      } else {
        const r = await DriveService.copyFileLike(child, created.data.id, {
          orgId: String(created.data.organization_id),
          createdById: meta.ownerProfileId,
          createdByName: meta.requesterName,
        });
        if (r.error) return { data: created.data, error: r.error };
      }
    }

    return { data: created.data, error: null };
  }

  private static withCopySuffix(name: string) {
    const n = (name || '').trim();
    if (!n) return 'Copie';
    if (/\(copie\)$/i.test(n)) return n;
    return `${n} (copie)`;
  }

  static async deletePermanently(item: DriveItem) {
    if (isTableUnavailable(DRIVE_TABLE)) return { data: null as any, error: null };
    if (item.storage_bucket && item.storage_path) {
      const { error: storageError } = await supabase.storage.from(item.storage_bucket).remove([item.storage_path]);
      if (storageError) return { data: null as any, error: storageError };
    }
    const { data, error } = await supabase.from('drive_items').delete().eq('id', item.id).select('*').single();
    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.deletePermanently')) {
      return { data: null, error: null };
    }
    return { data, error };
  }

  static async listOrganizationProfiles() {
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as { id: string; full_name: string | null; email: string }[], error: ctx.error };
    const { profile } = ctx.data;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', profile.organization_id)
      .order('full_name', { ascending: true });
    if (error) return { data: [], error };
    return { data: (data as { id: string; full_name: string | null; email: string }[]) ?? [], error: null };
  }

  static async listFolderAcl(folderId: string) {
    const { data, error } = await supabase.from('drive_item_acl').select('profile_id, permission').eq('drive_item_id', folderId);
    return { data: (data as { profile_id: string; permission: string }[]) ?? [], error };
  }

  static async addFolderAcl(folderId: string, profileId: string, permission: 'viewer' | 'editor') {
    const { error } = await supabase.from('drive_item_acl').upsert(
      { drive_item_id: folderId, profile_id: profileId, permission },
      { onConflict: 'drive_item_id,profile_id' },
    );
    return { error };
  }

  static async removeFolderAcl(folderId: string, profileId: string) {
    const { error } = await supabase.from('drive_item_acl').delete().eq('drive_item_id', folderId).eq('profile_id', profileId);
    return { error };
  }

  static async getMyFolderCapability(
    folderId: string,
  ): Promise<{ level: 'owner' | 'editor' | 'viewer' | 'admin' | 'none'; error?: Error }> {
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { level: 'none', error: ctx.error ?? undefined };
    const { profile } = ctx.data;
    if (profile.role === 'super_administrator' || profile.role === 'administrator') return { level: 'admin' };
    const { data: folder, error } = await supabase
      .from('drive_items')
      .select('owner_profile_id')
      .eq('id', folderId)
      .eq('item_type', 'folder')
      .maybeSingle();
    if (error || !folder) return { level: 'none' };
    if (folder.owner_profile_id === profile.id) return { level: 'owner' };
    const { data: acl } = await supabase
      .from('drive_item_acl')
      .select('permission')
      .eq('drive_item_id', folderId)
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (acl?.permission === 'editor') return { level: 'editor' };
    if (acl?.permission === 'viewer') return { level: 'viewer' };
    return { level: 'none' };
  }

  static async getDownloadUrl(item: DriveItem, expiresInSeconds = 60 * 10) {
    if (!item.storage_bucket || !item.storage_path) return { data: null as string | null, error: new Error('Item sans fichier') };
    // Bucket public `drive-files` : URL publique directe (évite erreurs / latence sur signed URL).
    if (item.storage_bucket === DRIVE_BUCKET) {
      const { data } = supabase.storage.from(item.storage_bucket).getPublicUrl(item.storage_path);
      if (data?.publicUrl) return { data: data.publicUrl, error: null };
    }
    const { data, error } = await supabase.storage.from(item.storage_bucket).createSignedUrl(item.storage_path, expiresInSeconds);
    return { data: data?.signedUrl ?? null, error };
  }
}

