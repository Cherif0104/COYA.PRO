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
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  trashed_at?: string | null;
};

const DRIVE_BUCKET = 'drive-files';
const DRIVE_TABLE = 'drive_items';

export class DriveService {
  static async getProfileContext() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return { data: null as any, error: new Error('Non authentifié') };

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, organization_id, role')
      .eq('user_id', userId)
      .single();

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

    const { data, error } = await supabase
      .from('drive_items')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .is('trashed_at', null)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,mime_type.ilike.%${q}%`)
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
      return { data: null as DriveItem | null, error: new Error('Table drive_items absente : appliquez la migration Supabase (SENEGEL DRIVE).') };
    }
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DriveItem | null, error: ctx.error };
    const { user, profile } = ctx.data;

    const { data, error } = await supabase
      .from('drive_items')
      .insert({
        organization_id: profile.organization_id,
        parent_id: params.parentId,
        item_type: 'folder',
        name: params.name,
        description: params.description ?? null,
        created_by_id: profile.id,
        created_by_name: profile.full_name ?? user.email ?? 'Utilisateur',
      })
      .select('*')
      .single();

    return { data: (data as DriveItem) ?? null, error };
  }

  static async uploadFile(params: { parentId: string | null; file: File }) {
    const ctx = await DriveService.getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DriveItem | null, error: ctx.error };
    const { user, profile } = ctx.data;

    const orgPrefix = String(profile.organization_id);
    const safeName = params.file.name.replace(/[^\w.\-()\s]/g, '_');
    const path = `${orgPrefix}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from(DRIVE_BUCKET).upload(path, params.file, { upsert: false });
    if (uploadError) return { data: null, error: uploadError };

    const { data: publicUrl } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(path);

    const { data, error } = await supabase
      .from('drive_items')
      .insert({
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
      })
      .select('*')
      .single();

    if (error && handleOptionalTableError(error, DRIVE_TABLE, 'DriveService.uploadFile')) {
      return { data: null, error: new Error('Table drive_items absente : appliquez la migration Supabase (SENEGEL DRIVE).') };
    }
    return { data: (data as DriveItem) ?? null, error };
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

  static async getDownloadUrl(item: DriveItem, expiresInSeconds = 60 * 10) {
    if (!item.storage_bucket || !item.storage_path) return { data: null as string | null, error: new Error('Item sans fichier') };
    const { data, error } = await supabase.storage.from(item.storage_bucket).createSignedUrl(item.storage_path, expiresInSeconds);
    return { data: data?.signedUrl ?? null, error };
  }
}

