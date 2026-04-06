import { DataCollection, DataCollectionSubmission } from '../types';
import * as programmeService from './programmeService';

const STORAGE_KEY = 'coya_data_collections_v1';
const SUBMISSIONS_KEY = 'coya_data_collection_submissions_v1';

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

function readSubmissions(): DataCollectionSubmission[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SUBMISSIONS_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubmissions(items: DataCollectionSubmission[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items));
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

type ProjectProgrammeRef = { id: string; programmeId?: string | null };

/**
 * Met à jour `programmeId` sur les collectes ayant un `projectId` pour refléter le programme du projet.
 * Utile après migration ou changement de `programme_id` côté projets.
 * @returns nombre d’enregistrements modifiés
 */
export function backfillProgrammeIdsFromProjects(projects: ProjectProgrammeRef[]): number {
  const map = new Map(projects.map((p) => [String(p.id), p.programmeId ?? null]));
  const all = readAll();
  let n = 0;
  const now = new Date().toISOString();
  const next = all.map((c) => {
    if (!c.projectId) return c;
    const prog = map.get(String(c.projectId));
    if (prog === undefined) return c;
    if (c.programmeId === prog) return c;
    n += 1;
    return { ...c, programmeId: prog, updatedAt: now };
  });
  if (n > 0) writeAll(next);
  return n;
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

/** Enregistre une soumission de formulaire (préparation API + CRM). */
export function recordDataCollectionSubmission(sub: DataCollectionSubmission): void {
  const all = readSubmissions();
  all.push(sub);
  writeSubmissions(all);
}

export function listSubmissionsForCollection(collectionId: string): DataCollectionSubmission[] {
  return readSubmissions().filter((s) => s.collectionId === collectionId);
}

export function listSubmissionsForOrg(organizationId?: string | null): DataCollectionSubmission[] {
  const all = readSubmissions();
  if (!organizationId) return all;
  return all.filter((s) => !s.organizationId || s.organizationId === organizationId);
}

/** Pousse vers le CRM les soumissions non synchronisées (email dédoublonné). */
export async function bulkSyncPendingSubmissionsToCrm(): Promise<{ ok: number; fail: number }> {
  const all = readSubmissions();
  let ok = 0;
  let fail = 0;
  const next = [...all];
  for (let i = 0; i < next.length; i++) {
    const s = next[i];
    if (s.syncedToCrm) continue;
    try {
      const res = await programmeService.upsertParticipantPayloadToCrm(s.payload);
      if (res) {
        next[i] = {
          ...s,
          syncedToCrm: true,
          crmContactId: res.contactId,
        };
        ok += 1;
      } else {
        fail += 1;
      }
    } catch {
      fail += 1;
    }
  }
  writeSubmissions(next);
  return { ok, fail };
}
