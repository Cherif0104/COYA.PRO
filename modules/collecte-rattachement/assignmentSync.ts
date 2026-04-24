import type { DataCollection, DataCollectionAssignment } from '../../types';
import { isBuiltinCollecteCategoryKey } from './types';

/**
 * Garantit `assignment` à partir des champs historiques (projectId / programmeId / formationId).
 */
export function ensureDataCollectionAssignment(c: DataCollection): DataCollection {
  if (c.assignment?.categoryKey && c.assignment.targetId) return c;
  if (c.projectId) {
    const a: DataCollectionAssignment = {
      categoryKey: 'project',
      targetId: String(c.projectId),
      activityId: c.activityId ?? null,
    };
    return { ...c, assignment: a };
  }
  if (c.programmeId) {
    return {
      ...c,
      assignment: { categoryKey: 'programme', targetId: String(c.programmeId) },
    };
  }
  if (c.formationId) {
    return {
      ...c,
      assignment: { categoryKey: 'formation', targetId: String(c.formationId) },
    };
  }
  return c;
}

/**
 * Met à jour les champs historiques pour compat (filtres, backfill programme, CRM).
 * Les catégories hors (project, programme, formation) n’écrivent que `assignment`.
 */
export function syncLegacyIdsFromAssignment(c: DataCollection): DataCollection {
  const a = c.assignment;
  const cleared: DataCollection = {
    ...c,
    projectId: null,
    programmeId: null,
    formationId: null,
    activityId: null,
  };
  if (!a?.categoryKey || !a.targetId) return cleared;
  if (a.categoryKey === 'project') {
    cleared.projectId = a.targetId;
    cleared.activityId = a.activityId ?? null;
    return cleared;
  }
  if (a.categoryKey === 'programme') {
    cleared.programmeId = a.targetId;
    return cleared;
  }
  if (a.categoryKey === 'formation') {
    cleared.formationId = a.targetId;
    return cleared;
  }
  return cleared;
}

export function normalizeDataCollectionRecord(c: DataCollection): DataCollection {
  const withAssign = ensureDataCollectionAssignment(c);
  return syncLegacyIdsFromAssignment(withAssign);
}

export function isCustomAssignmentCategory(key: string): boolean {
  return !isBuiltinCollecteCategoryKey(key);
}
