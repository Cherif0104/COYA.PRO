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

/** Récupère les libellés des modules : globaux + organisation (org écrase global). */
export async function getModuleLabels(organizationId: string | null): Promise<ModuleLabelDisplay[]> {
  if (isTableUnavailable('module_labels')) return [];
  try {
    const { data: globalRows, error: globalErr } = await supabase
      .from('module_labels')
      .select('module_key, display_name_fr, display_name_en')
      .is('organization_id', null);
    if (globalErr) {
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
        handleOptionalTableError(orgErr, 'module_labels', 'moduleLabelsService.getModuleLabels.org');
      } else if (orgRows) {
        orgRows.forEach((r: any) => byKey.set(r.module_key, { moduleKey: r.module_key, displayNameFr: r.display_name_fr, displayNameEn: r.display_name_en }));
      }
    }
    return Array.from(byKey.values());
  } catch (e) {
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
  try {
    const query = organizationId
      ? supabase.from('module_labels').select('*').or(`organization_id.eq.${organizationId},organization_id.is.null`).order('module_key')
      : supabase.from('module_labels').select('*').is('organization_id', null).order('module_key');
    const { data, error } = await query;
    if (error) return [];
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');
  const row = {
    organization_id: params.organizationId,
    module_key: params.moduleKey,
    display_name_fr: params.displayNameFr || null,
    display_name_en: params.displayNameEn || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('module_labels').upsert(row, {
    onConflict: 'organization_id,module_key',
  });
  if (error) throw error;
}
