import type { CollecteCustomCategoryRow, CollecteCustomEntityRow } from './types';
import { isBuiltinCollecteCategoryKey } from './types';

const STORAGE_CATEGORIES = 'coya_collecte_rattachement_categories_v1';
const STORAGE_ENTITIES = 'coya_collecte_rattachement_entities_v1';

function orgScope(orgId: string | null | undefined): string {
  return orgId && String(orgId).trim() ? String(orgId).trim() : '_global';
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    /* ignore */
  }
}

type CategoriesFile = { items: CollecteCustomCategoryRow[] };

function readCategoriesFile(): CategoriesFile {
  const f = readJson<CategoriesFile | CollecteCustomCategoryRow[] | null>(STORAGE_CATEGORIES, { items: [] });
  if (Array.isArray(f)) return { items: f };
  if (f && Array.isArray((f as CategoriesFile).items)) return f as CategoriesFile;
  return { items: [] };
}

function writeCategoriesFile(file: CategoriesFile) {
  writeJson(STORAGE_CATEGORIES, file);
}

type EntitiesFile = Record<string, CollecteCustomEntityRow[]>;

function readEntitiesFile(): EntitiesFile {
  return readJson<EntitiesFile>(STORAGE_ENTITIES, {});
}

function writeEntitiesFile(file: EntitiesFile) {
  writeJson(STORAGE_ENTITIES, file);
}

function entityStorageKey(orgId: string | null | undefined, categoryKey: string): string {
  return `${orgScope(orgId)}::${categoryKey}`;
}

/** Exemple métier demandé : catégorie « émission » (extensible, stockée par organisation). */
const DEFAULT_CUSTOM_SEEDS: Array<Pick<CollecteCustomCategoryRow, 'key' | 'labelFr' | 'labelEn'>> = [
  { key: 'emission', labelFr: 'Émission', labelEn: 'Show / broadcast' },
];

export function seedDefaultCustomCategories(orgId: string | null | undefined): void {
  const file = readCategoriesFile();
  const scope = orgScope(orgId);
  const existingKeys = new Set(
    file.items.filter((r) => (r.orgScope ?? '_global') === scope).map((r) => r.key),
  );
  const now = new Date().toISOString();
  let changed = false;
  for (const seed of DEFAULT_CUSTOM_SEEDS) {
    if (existingKeys.has(seed.key) || isBuiltinCollecteCategoryKey(seed.key)) continue;
    file.items.push({
      ...seed,
      createdAt: now,
      orgScope: scope,
    });
    changed = true;
  }
  if (changed) writeCategoriesFile(file);
}

export function listCustomCategories(orgId: string | null | undefined): CollecteCustomCategoryRow[] {
  seedDefaultCustomCategories(orgId);
  const scope = orgScope(orgId);
  const file = readCategoriesFile();
  return file.items.filter((r) => (r.orgScope ?? '_global') === scope);
}

export function addCustomCategory(
  orgId: string | null | undefined,
  keyRaw: string,
  labelFr: string,
  labelEn: string,
): CollecteCustomCategoryRow | null {
  const key = keyRaw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  if (!key || isBuiltinCollecteCategoryKey(key)) return null;
  const file = readCategoriesFile();
  const scope = orgScope(orgId);
  if (file.items.some((r) => r.key === key && (r.orgScope ?? '_global') === scope)) {
    return null;
  }
  const row: CollecteCustomCategoryRow = {
    key,
    labelFr: labelFr.trim() || key,
    labelEn: labelEn.trim() || key,
    createdAt: new Date().toISOString(),
    orgScope: scope,
  };
  file.items.push(row);
  writeCategoriesFile(file);
  return row;
}

export function deleteCustomCategory(orgId: string | null | undefined, categoryKey: string): boolean {
  const key = String(categoryKey || '').trim().toLowerCase();
  if (!key || isBuiltinCollecteCategoryKey(key)) return false;
  const scope = orgScope(orgId);
  const file = readCategoriesFile();
  const before = file.items.length;
  file.items = file.items.filter((r) => !((r.orgScope ?? '_global') === scope && r.key === key));
  if (file.items.length === before) return false;
  writeCategoriesFile(file);

  // Nettoyer les entités associées.
  const all = readEntitiesFile();
  const storageKey = entityStorageKey(orgId, key);
  if (all[storageKey]) {
    delete all[storageKey];
    writeEntitiesFile(all);
  }
  return true;
}

export function listCustomEntities(orgId: string | null | undefined, categoryKey: string): CollecteCustomEntityRow[] {
  const all = readEntitiesFile();
  return all[entityStorageKey(orgId, categoryKey)] ?? [];
}

export function addCustomEntity(
  orgId: string | null | undefined,
  categoryKey: string,
  name: string,
): CollecteCustomEntityRow | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const all = readEntitiesFile();
  const k = entityStorageKey(orgId, categoryKey);
  const list = [...(all[k] ?? [])];
  const row: CollecteCustomEntityRow = {
    id: `ce_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
  };
  list.push(row);
  all[k] = list;
  writeEntitiesFile(all);
  return row;
}

export function deleteCustomEntity(
  orgId: string | null | undefined,
  categoryKey: string,
  entityId: string,
): boolean {
  const k = entityStorageKey(orgId, categoryKey);
  const all = readEntitiesFile();
  const before = all[k]?.length ?? 0;
  const next = (all[k] ?? []).filter((e) => e.id !== entityId);
  all[k] = next;
  writeEntitiesFile(all);
  return next.length !== before;
}
