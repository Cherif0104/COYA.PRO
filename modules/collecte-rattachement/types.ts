/** Clés natives (compat historique projet / programme / formation). */
export const COLLECTE_BUILTIN_CATEGORY_KEYS = ['project', 'programme', 'formation'] as const;
export type CollecteBuiltinCategoryKey = (typeof COLLECTE_BUILTIN_CATEGORY_KEYS)[number];

export function isBuiltinCollecteCategoryKey(key: string): key is CollecteBuiltinCategoryKey {
  return (COLLECTE_BUILTIN_CATEGORY_KEYS as readonly string[]).includes(key);
}

export interface CollecteCustomCategoryRow {
  key: string;
  labelFr: string;
  labelEn: string;
  createdAt: string;
  /** Portée multi-tenant (id org ou `_global`). */
  orgScope?: string;
}

export interface CollecteCustomEntityRow {
  id: string;
  name: string;
  createdAt: string;
}
