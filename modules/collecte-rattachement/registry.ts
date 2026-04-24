import { addCustomCategory, deleteCustomCategory, listCustomCategories } from './storage';
import type { CollecteBuiltinCategoryKey } from './types';
import { COLLECTE_BUILTIN_CATEGORY_KEYS } from './types';

export interface CollecteCategoryMeta {
  key: string;
  labelFr: string;
  labelEn: string;
  builtin: boolean;
}

const BUILTIN_META: CollecteCategoryMeta[] = [
  { key: 'project', labelFr: 'Projet', labelEn: 'Project', builtin: true },
  { key: 'programme', labelFr: 'Programme', labelEn: 'Programme', builtin: true },
  { key: 'formation', labelFr: 'Formation (cours)', labelEn: 'Course', builtin: true },
];

export function listCollecteCategories(orgId: string | null | undefined): CollecteCategoryMeta[] {
  const custom = listCustomCategories(orgId).map((c) => ({
    key: c.key,
    labelFr: c.labelFr,
    labelEn: c.labelEn,
    builtin: false as const,
  }));
  return [...BUILTIN_META, ...custom];
}

export function registerCollecteCategory(
  orgId: string | null | undefined,
  keyRaw: string,
  labelFr: string,
  labelEn: string,
): CollecteCategoryMeta | null {
  const row = addCustomCategory(orgId, keyRaw, labelFr, labelEn);
  if (!row) return null;
  return { key: row.key, labelFr: row.labelFr, labelEn: row.labelEn, builtin: false };
}

export function unregisterCollecteCategory(orgId: string | null | undefined, categoryKey: string): boolean {
  return deleteCustomCategory(orgId, categoryKey);
}

export function defaultCollecteCategoryKey(): CollecteBuiltinCategoryKey {
  return 'project';
}

export { COLLECTE_BUILTIN_CATEGORY_KEYS };
