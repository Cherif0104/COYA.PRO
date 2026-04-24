import { supabase } from './supabaseService';
import { ModuleName } from '../types';
import { handleOptionalTableError, isTableUnavailable } from './optionalTableGuard';

export interface ModuleLabelRow {
  id: string;
  organization_id: string | null;
  module_key: string;
  display_name_fr: string | null;
  display_name_en: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModuleLabelDisplay {
  moduleKey: string;
  displayNameFr: string | null;
  displayNameEn: string | null;
}

type SupabaseLikeError = { status?: number; code?: string; message?: string; details?: string; hint?: string };

const LOCAL_STORAGE_KEY = 'coya_module_labels_local_v1';
const FORBIDDEN_KEY = 'coya_module_labels_forbidden_v1';
let moduleLabelsForbidden = false;

function readForbiddenFlag(): boolean {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(FORBIDDEN_KEY) : null;
    return raw === '1';
  } catch {
    return false;
  }
}

function writeForbiddenFlag(v: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(FORBIDDEN_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function clearModuleLabelsForbiddenMode(): void {
  moduleLabelsForbidden = false;
  writeForbiddenFlag(false);
}

export function isModuleLabelsForbiddenMode(): boolean {
  return moduleLabelsForbidden || readForbiddenFlag();
}

// Initialise au chargement du module (évite le 1er appel réseau après refresh).
moduleLabelsForbidden = readForbiddenFlag();

function orgScope(organizationId: string | null): string {
  return organizationId && String(organizationId).trim() ? String(organizationId).trim() : '_global';
}

function isForbiddenError(error: unknown): boolean {
  const e = (error || {}) as SupabaseLikeError;
  const msg = `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase();
  return (
    e.status === 401 ||
    e.status === 403 ||
    e.code === '42501' || // insufficient_privilege
    msg.includes('insufficient privilege') ||
    msg.includes('permission denied') ||
    msg.includes('not allowed')
  );
}

type LocalFile = Record<string, Record<string, { fr: string | null; en: string | null }>>;

function readLocalFile(): LocalFile {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as LocalFile) : {};
  } catch {
    return {};
  }
}

function writeLocalFile(file: LocalFile): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(file));
  } catch {
    /* ignore */
  }
}

function getLocalLabels(organizationId: string | null): ModuleLabelDisplay[] {
  const file = readLocalFile();
  const scope = orgScope(organizationId);
  const map = file[scope] || {};
  return Object.entries(map).map(([moduleKey, v]) => ({
    moduleKey,
    displayNameFr: v.fr ?? null,
    displayNameEn: v.en ?? null,
  }));
}

function upsertLocalLabel(params: {
  organizationId: string | null;
  moduleKey: string;
  displayNameFr: string | null;
  displayNameEn: string | null;
}): void {
  const file = readLocalFile();
  const scope = orgScope(params.organizationId);
  if (!file[scope]) file[scope] = {};
  file[scope][params.moduleKey] = { fr: params.displayNameFr ?? null, en: params.displayNameEn ?? null };
  writeLocalFile(file);
}

/** Récupère les libellés des modules : globaux + organisation (org écrase global). */
export async function getModuleLabels(organizationId: string | null): Promise<ModuleLabelDisplay[]> {
  if (moduleLabelsForbidden) return getLocalLabels(organizationId);
  if (isTableUnavailable('module_labels')) return [];
  try {
    const { data: globalRows, error: globalErr } = await supabase
      .from('module_labels')
      .select('module_key, display_name_fr, display_name_en')
      .is('organization_id', null);
    if (globalErr) {
      if (isForbiddenError(globalErr)) {
        moduleLabelsForbidden = true;
        writeForbiddenFlag(true);
        return getLocalLabels(organizationId);
      }
      if (handleOptionalTableError(globalErr, 'module_labels', 'moduleLabelsService.getModuleLabels.global')) return [];
      return [];
    }
    const byKey = new Map<string, ModuleLabelDisplay>();
    (globalRows || []).forEach((r: any) => byKey.set(r.module_key, { moduleKey: r.module_key, displayNameFr: r.display_name_fr, displayNameEn: r.display_name_en }));
    if (organizationId) {
      const { data: orgRows, error: orgErr } = await supabase
        .from('module_labels')
        .select('module_key, display_name_fr, display_name_en')
        .eq('organization_id', organizationId);
      if (orgErr) {
        if (isForbiddenError(orgErr)) {
          moduleLabelsForbidden = true;
          writeForbiddenFlag(true);
          return getLocalLabels(organizationId);
        }
        handleOptionalTableError(orgErr, 'module_labels', 'moduleLabelsService.getModuleLabels.org');
      } else if (orgRows) {
        orgRows.forEach((r: any) => byKey.set(r.module_key, { moduleKey: r.module_key, displayNameFr: r.display_name_fr, displayNameEn: r.display_name_en }));
      }
    }
    return Array.from(byKey.values());
  } catch (e) {
    if (isForbiddenError(e)) {
      moduleLabelsForbidden = true;
      writeForbiddenFlag(true);
      return getLocalLabels(organizationId);
    }
    handleOptionalTableError(e, 'module_labels', 'moduleLabelsService.getModuleLabels.catch');
    return [];
  }
}

/** Récupère le libellé affiché pour un module (langue courante). */
export function getDisplayName(
  labels: ModuleLabelDisplay[],
  moduleKey: string,
  language: 'fr' | 'en'
): string | null {
  const row = labels.find((l) => l.moduleKey === moduleKey);
  if (!row) return null;
  if (language === 'fr' && row.displayNameFr) return row.displayNameFr;
  if (language === 'en' && row.displayNameEn) return row.displayNameEn;
  return row.displayNameFr || row.displayNameEn || null;
}

/** Liste tous les libellés (pour édition super admin). Un seul row par module_key (org écrase global). */
export async function getAllModuleLabelsForEdit(organizationId: string | null): Promise<ModuleLabelRow[]> {
  if (moduleLabelsForbidden) {
    const local = getLocalLabels(organizationId);
    return local.map((l) => ({
      id: `local_${orgScope(organizationId)}_${l.moduleKey}`,
      organization_id: organizationId,
      module_key: l.moduleKey,
      display_name_fr: l.displayNameFr,
      display_name_en: l.displayNameEn,
    }));
  }
  try {
    const query = organizationId
      ? supabase.from('module_labels').select('*').or(`organization_id.eq.${organizationId},organization_id.is.null`).order('module_key')
      : supabase.from('module_labels').select('*').is('organization_id', null).order('module_key');
    const { data, error } = await query;
    if (error) {
      if (isForbiddenError(error)) {
        moduleLabelsForbidden = true;
        writeForbiddenFlag(true);
        // On reconstruit au format ModuleLabelRow depuis le cache local.
        const local = getLocalLabels(organizationId);
        return local.map((l) => ({
          id: `local_${orgScope(organizationId)}_${l.moduleKey}`,
          organization_id: organizationId,
          module_key: l.moduleKey,
          display_name_fr: l.displayNameFr,
          display_name_en: l.displayNameEn,
        }));
      }
      return [];
    }
    const raw = (data || []).map((r: any) => ({
    id: r.id,
    organization_id: r.organization_id,
    module_key: r.module_key,
    display_name_fr: r.display_name_fr,
    display_name_en: r.display_name_en,
    created_at: r.created_at,
    updated_at: r.updated_at,
  })) as ModuleLabelRow[];
  const byKey = new Map<string, ModuleLabelRow>();
  raw.forEach((r) => {
    const existing = byKey.get(r.module_key);
    if (!existing || (organizationId && r.organization_id === organizationId)) byKey.set(r.module_key, r);
  });
  return Array.from(byKey.values());
  } catch {
    return [];
  }
}

/** Upsert un libellé (super admin). */
export async function upsertModuleLabel(params: {
  organizationId: string | null;
  moduleKey: ModuleName | string;
  displayNameFr: string | null;
  displayNameEn: string | null;
}): Promise<void> {
  if (moduleLabelsForbidden) {
    upsertLocalLabel({
      organizationId: params.organizationId,
      moduleKey: String(params.moduleKey),
      displayNameFr: params.displayNameFr,
      displayNameEn: params.displayNameEn,
    });
    return;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');
  const row = {
    organization_id: params.organizationId,
    module_key: params.moduleKey,
    display_name_fr: params.displayNameFr || null,
    display_name_en: params.displayNameEn || null,
    updated_at: new Date().toISOString(),
  };
  try {
    const { error } = await supabase.from('module_labels').upsert(row, {
      onConflict: 'organization_id,module_key',
    });
    if (error) {
      if (isForbiddenError(error)) {
        moduleLabelsForbidden = true;
        writeForbiddenFlag(true);
        upsertLocalLabel({
          organizationId: params.organizationId,
          moduleKey: String(params.moduleKey),
          displayNameFr: params.displayNameFr,
          displayNameEn: params.displayNameEn,
        });
        return;
      }
      throw error;
    }
  } catch (e) {
    if (isForbiddenError(e)) {
      moduleLabelsForbidden = true;
      writeForbiddenFlag(true);
      upsertLocalLabel({
        organizationId: params.organizationId,
        moduleKey: String(params.moduleKey),
        displayNameFr: params.displayNameFr,
        displayNameEn: params.displayNameEn,
      });
      return;
    }
    throw e;
  }
}

/** Exposé pour l'UI : vrai si on a au moins un libellé en cache local. */
export function hasLocalModuleLabels(organizationId: string | null): boolean {
  const file = readLocalFile();
  const scope = orgScope(organizationId);
  return !!file[scope] && Object.keys(file[scope]).length > 0;
}
