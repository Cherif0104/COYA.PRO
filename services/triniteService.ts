import { supabase } from './supabaseService';
import { DataService } from './dataService';
import { PresenceSession, TriniteScore } from '../types';
import {
  ATTENDANCE_WEEKLY_TARGET_HOURS,
  computeEffectiveWorkedSecondsFromSessions,
  expectedWeeklyScaledHoursBetween,
} from './hrAnalyticsService';

const TRINITE_TABLE = 'trinite_scores';
const TRINITE_SELF_NOTES = 'trinite_self_notes';
const TRINITE_MANAGER_REVIEWS = 'trinite_manager_reviews';

function isMissingTriniteSelfNotesTableError(err: unknown): boolean {
  const e = err as any;
  const msg = String(e?.message || e?.details || e?.hint || '');
  const code = String(e?.code || '');
  const status = Number(e?.status ?? e?.statusCode ?? NaN);
  if (status === 404 || /\b404\b/.test(msg)) return true;
  return (
    /trinite_self_notes|trinite_manager_reviews/i.test(msg) ||
    /schema cache|PGRST205|could not find the table|not found|introuvable/i.test(msg) ||
    code === 'PGRST205'
  );
}

function triniteSelfNotesSetupHint(): string {
  return (
    'Tables absentes sur Supabase. Appliquez la migration ' +
    '`supabase/migrations/20260421141000_trinite_self_notes_manager_reviews.sql` (SQL Editor ou `supabase db push`), puis rechargez la page.'
  );
}

function bounded(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export interface TriniteSelfNoteRow {
  organizationId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  note: string | null;
  aidedReceived: boolean;
  aidedByProfileId: string | null;
  aidedReason: string | null;
}

export interface TriniteManagerReviewRow {
  id: string;
  organizationId: string;
  subjectProfileId: string;
  periodStart: string;
  periodEnd: string;
  managerProfileId: string;
  rating: number | null;
  feedback: string | null;
  updatedAt?: string;
}

function mapSelfNoteRow(r: any): TriniteSelfNoteRow {
  return {
    organizationId: r.organization_id,
    profileId: r.profile_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    note: r.note ?? null,
    aidedReceived: !!r.aided_received,
    aidedByProfileId: r.aided_by_profile_id ?? null,
    aidedReason: r.aided_reason ?? null,
  };
}

export async function listTriniteScores(organizationId: string, periodStart: string, periodEnd: string): Promise<TriniteScore[]> {
  const { data, error } = await supabase
    .from(TRINITE_TABLE)
    .select('*')
    .eq('organization_id', organizationId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .order('global_score', { ascending: false });
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.id,
    organizationId: r.organization_id,
    profileId: r.profile_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    ndiguelScore: Number(r.ndiguel_score ?? 0),
    yarScore: Number(r.yar_score ?? 0),
    barkeScore: Number(r.barke_score ?? 0),
    globalScore: Number(r.global_score ?? 0),
    presenceScore: Number(r.presence_score ?? 0),
    performanceScore: Number(r.performance_score ?? 0),
    objectiveScore: Number(r.objective_score ?? 0),
    qualityScore: Number(r.quality_score ?? 0),
    sourceSnapshot: (r.source_snapshot as Record<string, any>) ?? null,
    generatedById: r.generated_by_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertTriniteScore(score: Omit<TriniteScore, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const { error } = await supabase
    .from(TRINITE_TABLE)
    .upsert(
      {
        organization_id: score.organizationId,
        profile_id: score.profileId,
        period_start: score.periodStart,
        period_end: score.periodEnd,
        ndiguel_score: score.ndiguelScore,
        yar_score: score.yarScore,
        barke_score: score.barkeScore,
        global_score: score.globalScore,
        presence_score: score.presenceScore,
        performance_score: score.performanceScore,
        objective_score: score.objectiveScore,
        quality_score: score.qualityScore,
        source_snapshot: score.sourceSnapshot ?? null,
        generated_by_id: score.generatedById ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,profile_id,period_start,period_end' },
    );
  if (error) throw error;
}

export function buildTriniteScore(params: {
  organizationId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  presenceSessions: PresenceSession[];
  completedTasks: number;
  totalTasks: number;
  objectivesDone: number;
  objectivesTotal: number;
  qualityIncidents: number;
  generatedById?: string | null;
}): Omit<TriniteScore, 'id' | 'createdAt' | 'updatedAt'> {
  const periodStartMs = new Date(`${params.periodStart}T00:00:00.000Z`).getTime();
  const periodEndMs = new Date(`${params.periodEnd}T23:59:59.999Z`).getTime();
  const uid = params.presenceSessions[0]?.userId ?? '';
  const workedSeconds = uid
    ? computeEffectiveWorkedSecondsFromSessions(
        params.presenceSessions,
        uid,
        periodStartMs,
        periodEndMs,
        Date.now(),
      )
    : 0;
  const sessionHours = workedSeconds / 3600;
  const targetPresenceHours = Math.max(
    ATTENDANCE_WEEKLY_TARGET_HOURS * 0.25,
    expectedWeeklyScaledHoursBetween(periodStartMs, periodEndMs),
  );
  const presenceScore = bounded(targetPresenceHours <= 0 ? 0 : (sessionHours / targetPresenceHours) * 100);
  const performanceScore = bounded(params.totalTasks <= 0 ? 60 : (params.completedTasks / params.totalTasks) * 100);
  const objectiveScore = bounded(params.objectivesTotal <= 0 ? 60 : (params.objectivesDone / params.objectivesTotal) * 100);
  const qualityScore = bounded(100 - params.qualityIncidents * 10);

  const ndiguelScore = bounded(performanceScore * 0.5 + objectiveScore * 0.5);
  const yarScore = bounded(presenceScore * 0.6 + qualityScore * 0.4);
  const barkeScore = bounded(objectiveScore * 0.4 + qualityScore * 0.6);
  const globalScore = bounded((ndiguelScore + yarScore + barkeScore) / 3);

  return {
    organizationId: params.organizationId,
    profileId: params.profileId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    ndiguelScore,
    yarScore,
    barkeScore,
    globalScore,
    presenceScore,
    performanceScore,
    objectiveScore,
    qualityScore,
    generatedById: params.generatedById ?? null,
    sourceSnapshot: {
      sessionHours,
      targetPresenceHours,
      completedTasks: params.completedTasks,
      totalTasks: params.totalTasks,
      objectivesDone: params.objectivesDone,
      objectivesTotal: params.objectivesTotal,
      qualityIncidents: params.qualityIncidents,
    },
  };
}

export async function getTriniteSelfNoteRow(
  organizationId: string,
  profileId: string,
  periodStart: string,
  periodEnd: string,
): Promise<TriniteSelfNoteRow | null> {
  try {
    const { data, error } = await supabase
      .from(TRINITE_SELF_NOTES)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();
    if (error || !data) return null;
    return mapSelfNoteRow(data);
  } catch {
    return null;
  }
}

export async function getTriniteSelfNote(
  organizationId: string,
  profileId: string,
  periodStart: string,
  periodEnd: string,
): Promise<string | null> {
  const row = await getTriniteSelfNoteRow(organizationId, profileId, periodStart, periodEnd);
  return row?.note ?? null;
}

export async function listTriniteSelfNotesForPeriod(
  organizationId: string,
  periodStart: string,
  periodEnd: string,
): Promise<TriniteSelfNoteRow[]> {
  try {
    const { data, error } = await supabase
      .from(TRINITE_SELF_NOTES)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd);
    if (error) return [];
    return (data || []).map(mapSelfNoteRow);
  } catch {
    return [];
  }
}

export async function listTriniteManagerReviews(
  organizationId: string,
  periodStart: string,
  periodEnd: string,
): Promise<TriniteManagerReviewRow[]> {
  try {
    const { data, error } = await supabase
      .from(TRINITE_MANAGER_REVIEWS)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd);
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      subjectProfileId: r.subject_profile_id,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      managerProfileId: r.manager_profile_id,
      rating: r.rating != null ? Number(r.rating) : null,
      feedback: r.feedback ?? null,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function upsertTriniteSelfNote(params: {
  organizationId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  note: string | null;
  aidedReceived?: boolean;
  aidedByProfileId?: string | null;
  aidedReason?: string | null;
}): Promise<void> {
  const row: Record<string, unknown> = {
    organization_id: params.organizationId,
    profile_id: params.profileId,
    period_start: params.periodStart,
    period_end: params.periodEnd,
    note: params.note,
    updated_at: new Date().toISOString(),
  };
  if (params.aidedReceived !== undefined) row.aided_received = params.aidedReceived;
  if (params.aidedByProfileId !== undefined) row.aided_by_profile_id = params.aidedByProfileId;
  if (params.aidedReason !== undefined) row.aided_reason = params.aidedReason;

  const { error } = await supabase.from(TRINITE_SELF_NOTES).upsert(row, {
    onConflict: 'organization_id,profile_id,period_start,period_end',
  });
  if (error) {
    if (isMissingTriniteSelfNotesTableError(error)) {
      throw new Error(`${error.message || 'Table absente'} — ${triniteSelfNotesSetupHint()}`);
    }
    throw error;
  }
}

export async function upsertTriniteManagerReview(params: {
  organizationId: string;
  subjectProfileId: string;
  periodStart: string;
  periodEnd: string;
  managerProfileId: string;
  rating: number | null;
  feedback: string | null;
}): Promise<void> {
  const { error } = await supabase.from(TRINITE_MANAGER_REVIEWS).upsert(
    {
      organization_id: params.organizationId,
      subject_profile_id: params.subjectProfileId,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      manager_profile_id: params.managerProfileId,
      rating: params.rating,
      feedback: params.feedback,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,subject_profile_id,period_start,period_end' },
  );
  if (error) {
    if (isMissingTriniteSelfNotesTableError(error) || /trinite_manager_reviews/i.test(String((error as any)?.message || ''))) {
      throw new Error(`${(error as any).message || 'Table absente'} — ${triniteSelfNotesSetupHint()}`);
    }
    throw error;
  }
}

/** Notifie les profils « pilotage » (hors la personne qui soumet). */
export async function notifyManagersTriniteSelfNote(
  organizationId: string,
  submitterProfileId: string,
  submitterDisplayName: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .in('role', ['super_administrator', 'administrator', 'manager', 'supervisor']);
    for (const row of data || []) {
      const pid = String((row as { id: string }).id);
      if (pid === submitterProfileId) continue;
      await DataService.createNotification({
        userId: pid,
        title: 'Trinité — fiche mise à jour',
        message: `${submitterDisplayName} a enregistré sa fiche Trinité (auto-évaluation / période).`,
        type: 'info',
        module: 'trinite',
        action: 'updated',
      });
    }
  } catch (e) {
    console.warn('notifyManagersTriniteSelfNote', e);
  }
}
