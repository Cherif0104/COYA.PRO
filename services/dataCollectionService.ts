import { DataCollection } from '../types';

const STORAGE_KEY = 'coya_data_collections_v1';

function readAll(): DataCollection[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: DataCollection[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    /* ignore */
  }
}

export function listDataCollections(organizationId?: string | null): DataCollection[] {
  const all = readAll();
  if (!organizationId) return all;
  return all.filter((c) => !c.organizationId || c.organizationId === organizationId);
}

export function getDataCollection(id: string): DataCollection | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function upsertDataCollection(item: DataCollection): void {
  const all = readAll();
  const idx = all.findIndex((x) => x.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  writeAll(all);
}

export function deleteDataCollection(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id));
}

export function markDataCollectionLinkedToCrm(id: string): void {
  const all = readAll();
  const item = all.find((x) => x.id === id);
  if (!item) return;
  item.linkedToCrm = true;
  item.updatedAt = new Date().toISOString();
  writeAll(all);
}
