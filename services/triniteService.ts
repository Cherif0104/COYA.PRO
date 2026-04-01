import { supabase } from './supabaseService';
import { PresenceSession, TriniteScore } from '../types';

const TRINITE_TABLE = 'trinite_scores';
const TRINITE_SELF_NOTES = 'trinite_self_notes';

function bounded(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
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
    .upsert({
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
    }, { onConflict: 'organization_id,profile_id,period_start,period_end' });
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
  const sessionHours = params.presenceSessions.reduce((acc, s) => {
    const start = new Date(s.startedAt).getTime();
    const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return acc;
    return acc + ((end - start) / 3600000);
  }, 0);

  const presenceScore = bounded((sessionHours / 160) * 100);
  const performanceScore = bounded(params.totalTasks <= 0 ? 60 : (params.completedTasks / params.totalTasks) * 100);
  const objectiveScore = bounded(params.objectivesTotal <= 0 ? 60 : (params.objectivesDone / params.objectivesTotal) * 100);
  const qualityScore = bounded(100 - (params.qualityIncidents * 10));

  const ndiguelScore = bounded((performanceScore * 0.5) + (objectiveScore * 0.5));
  const yarScore = bounded((presenceScore * 0.6) + (qualityScore * 0.4));
  const barkeScore = bounded((objectiveScore * 0.4) + (qualityScore * 0.6));
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
      completedTasks: params.completedTasks,
      totalTasks: params.totalTasks,
      objectivesDone: params.objectivesDone,
      objectivesTotal: params.objectivesTotal,
      qualityIncidents: params.qualityIncidents,
    },
  };
}

export async function getTriniteSelfNote(
  organizationId: string,
  profileId: string,
  periodStart: string,
  periodEnd: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from(TRINITE_SELF_NOTES)
      .select('note')
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();
    if (error) return null;
    return (data as { note?: string } | null)?.note ?? null;
  } catch {
    return null;
  }
}

export async function upsertTriniteSelfNote(params: {
  organizationId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase.from(TRINITE_SELF_NOTES).upsert(
    {
      organization_id: params.organizationId,
      profile_id: params.profileId,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      note: params.note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,profile_id,period_start,period_end' },
  );
  if (error) throw error;
}
