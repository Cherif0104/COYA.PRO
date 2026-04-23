import { supabase } from './supabaseService';
import {
  Employee,
  HrAbsenceEvent,
  HrAttendancePolicy,
  PresenceDailyRow,
  PresencePeriodMetric,
  PresencePeriodRollup,
  PresenceProjection,
  PresenceSession,
  PresenceStatus,
  PresenceStatusEvent,
} from '../types';

/** Une pause « significative » : au-delà de 2 minutes (micro-interruptions ignorées pour le comptage). */
export const MIN_SIGNIFICANT_PAUSE_SECONDS = 120;

/** Quota hebdomadaire de référence (44 h). */
export const ATTENDANCE_WEEKLY_TARGET_HOURS = 44;
/** 9 h effectives dans la plage horaire = « 1 jour de travail ». */
export const ATTENDANCE_DAILY_TARGET_HOURS = 9;
export const ATTENDANCE_DAILY_TARGET_SECONDS = ATTENDANCE_DAILY_TARGET_HOURS * 3600;
/** Fenêtre locale comptabilisée (début inclus, fin à cette heure pile, ex. 19 → jusqu’à 19:00:00). */
export const ATTENDANCE_WORK_WINDOW_START_HOUR = 9;
export const ATTENDANCE_WORK_WINDOW_END_HOUR = 19;

/** Quota hebdomadaire en secondes (44 h). */
export const ATTENDANCE_WEEKLY_TARGET_SECONDS = ATTENDANCE_WEEKLY_TARGET_HOURS * 3600;

/** Plafond d’affichage pour un segment ouvert (données non clôturées). */
export const PRESENCE_OPEN_SEGMENT_DISPLAY_CAP_SECONDS = 36 * 3600;

const ABSENCE_TABLE = 'hr_absence_events';

function startOfLocalCalendarDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Secondes de l’intervalle [startMs, endMs] intersectées avec la plage locale chaque jour
 * (ex. 9h00–19h00). 60 s = 1 min, 60 min = 1 h.
 */
export function windowedOverlapSecondsLocal(
  startMs: number,
  endMs: number,
  startHour: number = ATTENDANCE_WORK_WINDOW_START_HOUR,
  endHour: number = ATTENDANCE_WORK_WINDOW_END_HOUR,
): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  let total = 0;
  let day = startOfLocalCalendarDayMs(startMs);
  const lastDay = startOfLocalCalendarDayMs(endMs);
  while (day <= lastDay) {
    const dd = new Date(day);
    const w0 = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), startHour, 0, 0, 0).getTime();
    const w1 = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), endHour, 0, 0, 0).getTime();
    const o0 = Math.max(startMs, w0);
    const o1 = Math.min(endMs, w1);
    if (o1 > o0) total += Math.floor((o1 - o0) / 1000);
    dd.setDate(dd.getDate() + 1);
    day = dd.getTime();
  }
  return total;
}

/** Fusionne des intervalles [a,b) mur horloge en intervalles disjoints triés (évite double comptage). */
function mergeDisjointIntervals(intervals: Array<{ a: number; b: number }>): Array<{ a: number; b: number }> {
  const iv = intervals
    .filter(({ a, b }) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((x, y) => x.a - y.a || x.b - y.b);
  const out: Array<{ a: number; b: number }> = [];
  for (const cur of iv) {
    if (!out.length || cur.a > out[out.length - 1].b) {
      out.push({ a: cur.a, b: cur.b });
    } else {
      out[out.length - 1].b = Math.max(out[out.length - 1].b, cur.b);
    }
  }
  return out;
}

/**
 * Temps effectif sur la période : chevauchement avec [range], puis uniquement dans la fenêtre 9h–19h (locale),
 * moins les pauses déclarées sur les sessions (plafonné au brut fusionné pour éviter les doubles pauses fantômes).
 *
 * Les sessions qui se chevauchent (reconnexions / doublons) sont fusionnées sur l’axe temps **avant** application
 * de la fenêtre 9h–19h, pour ne pas additionner deux fois la même plage murale.
 */
export function computeEffectiveWorkedSecondsFromSessions(
  sessions: PresenceSession[],
  authUserId: string,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number = Date.now(),
  startHour: number = ATTENDANCE_WORK_WINDOW_START_HOUR,
  endHour: number = ATTENDANCE_WORK_WINDOW_END_HOUR,
): number {
  const clips: Array<{ a: number; b: number; pauseSec: number }> = [];
  for (const s of sessions) {
    if (String(s.userId) !== String(authUserId)) continue;
    if (!presenceStatusCountsTowardDuration(s.status)) continue;
    const a = new Date(s.startedAt).getTime();
    const b = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const o0 = Math.max(a, rangeStartMs);
    const o1 = Math.min(b, rangeEndMs);
    if (o1 <= o0) continue;
    const pauseSec = Math.max(0, Math.floor(Number(s.pauseMinutes || 0) * 60));
    clips.push({ a: o0, b: o1, pauseSec });
  }
  if (!clips.length) return 0;
  const mergedWall = mergeDisjointIntervals(clips.map((c) => ({ a: c.a, b: c.b })));
  let mergedGrossWindowed = 0;
  for (const m of mergedWall) {
    mergedGrossWindowed += windowedOverlapSecondsLocal(m.a, m.b, startHour, endHour);
  }
  const totalPauseSec = clips.reduce((sum, c) => sum + c.pauseSec, 0);
  return Math.max(0, mergedGrossWindowed - Math.min(mergedGrossWindowed, totalPauseSec));
}

/** Secondes minimales sur un jour pour compter comme « jour travaillé » (évite le bruit). */
export const WORKED_DAY_THRESHOLD_SECONDS = 900;

function parseLocalDateIso(dateIso: string): { y: number; m: number; d: number } | null {
  const p = dateIso.split('-').map((x) => Number(x));
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
  return { y: p[0], m: p[1], d: p[2] };
}

/** Liste inclusive des `YYYY-MM-DD` entre deux dates (calendrier local navigateur). */
export function enumerateLocalDateIsoInclusive(startIso: string, endIso: string): string[] {
  const a = parseLocalDateIso(startIso);
  const b = parseLocalDateIso(endIso);
  if (!a || !b) return [];
  const start = new Date(a.y, a.m - 1, a.d, 0, 0, 0, 0).getTime();
  const end = new Date(b.y, b.m - 1, b.d, 0, 0, 0, 0).getTime();
  if (end < start) return [];
  const out: string[] = [];
  for (let t = start; t <= end; t += 86400000) {
    const d = new Date(t);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

function localDayStartEndMs(dateIso: string): { startMs: number; endMs: number } | null {
  const p = parseLocalDateIso(dateIso);
  if (!p) return null;
  const startMs = new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0).getTime();
  const endMs = new Date(p.y, p.m - 1, p.d, 23, 59, 59, 999).getTime();
  return { startMs, endMs };
}

function localTodayIso(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` au calendrier local (évite le décalage UTC de `toISOString().slice(0,10)`). */
export function toLocalDateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Série journalière : temps effectif (même règle que `computeEffectiveWorkedSecondsFromSessions`) vs quota fixe par jour.
 */
export function computePresenceDailySeries(params: {
  sessions: PresenceSession[];
  authUserId: string;
  startDateIso: string;
  endDateIso: string;
  dailyTargetSeconds: number;
  nowMs?: number;
}): PresenceDailyRow[] {
  const nowMs = params.nowMs ?? Date.now();
  const target = Math.max(60, Math.floor(params.dailyTargetSeconds));
  const days = enumerateLocalDateIsoInclusive(params.startDateIso, params.endDateIso);
  const rows: PresenceDailyRow[] = [];
  for (const dateIso of days) {
    const bounds = localDayStartEndMs(dateIso);
    if (!bounds) continue;
    const workedSeconds = computeEffectiveWorkedSecondsFromSessions(
      params.sessions,
      params.authUserId,
      bounds.startMs,
      bounds.endMs,
      nowMs,
    );
    const ratePct = target > 0 ? (workedSeconds / target) * 100 : 0;
    rows.push({ dateIso, workedSeconds, targetSeconds: target, ratePct });
  }
  return rows;
}

export function summarizePresenceDailySeries(series: PresenceDailyRow[]): PresencePeriodRollup {
  let workedDayCount = 0;
  let totalWorkedSeconds = 0;
  let totalTargetSeconds = 0;
  for (const r of series) {
    totalWorkedSeconds += r.workedSeconds;
    totalTargetSeconds += r.targetSeconds;
    if (r.workedSeconds >= WORKED_DAY_THRESHOLD_SECONDS) workedDayCount += 1;
  }
  const avgHoursPerWorkedDay = workedDayCount > 0 ? totalWorkedSeconds / workedDayCount / 3600 : 0;
  const assiduityPct = totalTargetSeconds > 0 ? Math.min(100, (totalWorkedSeconds / totalTargetSeconds) * 100) : 0;
  return {
    workedDayCount,
    totalWorkedSeconds,
    totalTargetSeconds,
    avgHoursPerWorkedDay,
    assiduityPct,
  };
}

/**
 * Heuristique : sur les jours de la série déjà écoulés (date ≤ aujourd’hui local), ratio réalisé / cible ;
 * extrapolé en % « assiduité » si le même rythme se poursuivait (plafonné à 150 %).
 */
export function projectPeriodCompletionFromDailySeries(series: PresenceDailyRow[], nowMs: number = Date.now()): PresenceProjection {
  const todayIso = localTodayIso(nowMs);
  let sumWorked = 0;
  let sumTarget = 0;
  let elapsed = 0;
  for (const r of series) {
    if (r.dateIso <= todayIso) {
      elapsed += 1;
      sumWorked += r.workedSeconds;
      sumTarget += r.targetSeconds;
    }
  }
  const projectedAssiduityPct = sumTarget > 0 ? Math.min(150, (sumWorked / sumTarget) * 100) : null;
  return {
    projectedAssiduityPct,
    elapsedDayCount: elapsed,
    totalDayCount: series.length,
  };
}

/** CSV UTF-8 (séparateur ;) pour une série journalière d’un salarié. */
export function buildPresenceDailySeriesCsv(displayName: string, rows: PresenceDailyRow[]): string {
  const sep = ';';
  const head = ['salarié', 'date', 'worked_seconds', 'target_seconds', 'rate_pct'];
  const lines = rows.map((r) =>
    [displayName, r.dateIso, String(r.workedSeconds), String(r.targetSeconds), r.ratePct.toFixed(1)]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(sep),
  );
  return head.join(sep) + '\n' + lines.join('\n');
}

export type PresenceRollupCsvRow = {
  displayName: string;
  profileId: string;
} & PresencePeriodRollup & { projectedAssiduityPct: number | null };

export function buildPresenceRollupMultiCsv(rows: PresenceRollupCsvRow[]): string {
  const sep = ';';
  const head = [
    'salarié',
    'profile_id',
    'jours_travailles',
    'total_worked_seconds',
    'total_target_seconds',
    'moy_h_par_jour_travaille',
    'assiduite_pct',
    'tendance_pct',
  ];
  const body = rows.map((r) =>
    [
      r.displayName,
      r.profileId,
      String(r.workedDayCount),
      String(r.totalWorkedSeconds),
      String(r.totalTargetSeconds),
      r.avgHoursPerWorkedDay.toFixed(2),
      r.assiduityPct.toFixed(1),
      r.projectedAssiduityPct == null ? '' : String(r.projectedAssiduityPct.toFixed(1)),
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(sep),
  );
  return head.join(sep) + '\n' + body.join('\n');
}

/** Cible d’heures de présence pour l’intervalle : proportionnel à 44 h / semaine. */
export function expectedWeeklyScaledHoursBetween(rangeStartMs: number, rangeEndMs: number): number {
  const span = Math.max(0, rangeEndMs - rangeStartMs);
  if (span <= 0) return 0;
  const weekMs = 7 * 24 * 3600 * 1000;
  return (span / weekMs) * ATTENDANCE_WEEKLY_TARGET_HOURS;
}

/** Le statut « absent » ne compte pas de durée de présence (pas de temps continu à déduire). */
export function presenceStatusCountsTowardDuration(status: PresenceStatus | string | undefined | null): boolean {
  return status != null && String(status) !== 'absent';
}

export function periodBounds(period: PresencePeriodMetric['period']): { start: Date; end: Date; label: string; expectedHours: number } {
  const now = new Date();
  const year = now.getFullYear();
  if (period === 'day') {
    const start = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: start.toISOString().slice(0, 10), expectedHours: ATTENDANCE_DAILY_TARGET_HOURS };
  }
  if (period === 'week') {
    const day = (now.getDay() + 6) % 7;
    const start = new Date(year, now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${start.toISOString().slice(0, 10)} -> ${end.toISOString().slice(0, 10)}`, expectedHours: ATTENDANCE_WEEKLY_TARGET_HOURS };
  }
  if (period === 'month') {
    const start = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    const expectedHours = expectedWeeklyScaledHoursBetween(start.getTime(), end.getTime());
    return { start, end, label: `${start.toLocaleString('fr-FR', { month: 'long' })} ${year}`, expectedHours };
  }
  if (period === 'quarter') {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
    const q = Math.floor(now.getMonth() / 3) + 1;
    const expectedHours = expectedWeeklyScaledHoursBetween(start.getTime(), end.getTime());
    return { start, end, label: `T${q} ${year}`, expectedHours };
  }
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const expectedHours = expectedWeeklyScaledHoursBetween(start.getTime(), end.getTime());
  return { start, end, label: `${year}`, expectedHours };
}

export async function listHrAbsenceEvents(organizationId: string): Promise<HrAbsenceEvent[]> {
  const { data, error } = await supabase
    .from(ABSENCE_TABLE)
    .select('*')
    .eq('organization_id', organizationId)
    .order('absence_date', { ascending: false });
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.id,
    organizationId: r.organization_id,
    profileId: r.profile_id,
    absenceDate: r.absence_date,
    durationMinutes: r.duration_minutes ?? 0,
    isAuthorized: r.is_authorized === true,
    reason: r.reason ?? null,
    createdById: r.created_by_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createHrAbsenceEvent(params: Omit<HrAbsenceEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<HrAbsenceEvent | null> {
  const { data, error } = await supabase
    .from(ABSENCE_TABLE)
    .insert({
      organization_id: params.organizationId,
      profile_id: params.profileId,
      absence_date: params.absenceDate,
      duration_minutes: params.durationMinutes,
      is_authorized: params.isAuthorized,
      reason: params.reason ?? null,
      created_by_id: params.createdById ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    profileId: data.profile_id,
    absenceDate: data.absence_date,
    durationMinutes: data.duration_minutes,
    isAuthorized: data.is_authorized,
    reason: data.reason ?? null,
    createdById: data.created_by_id ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function computePresenceMetrics(params: {
  sessions: PresenceSession[];
  profileIds: string[];
  period: PresencePeriodMetric['period'];
  userIdByProfile?: Record<string, string>;
  hourlyRateByProfile?: Record<string, number>;
}): PresencePeriodMetric[] {
  const { start, end, label, expectedHours } = periodBounds(params.period);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return params.profileIds.map((profileId) => {
    const effectiveUserId = params.userIdByProfile?.[profileId] || profileId;
    const filtered = params.sessions.filter((s) => s.userId === effectiveUserId && new Date(s.startedAt).getTime() >= startMs && new Date(s.startedAt).getTime() <= endMs);
    const totalSeconds = computeEffectiveWorkedSecondsFromSessions(filtered, effectiveUserId, startMs, endMs, Date.now());
    const totalMinutes = totalSeconds / 60;
    const totalHours = totalMinutes / 60;
    const assiduityRate = expectedHours <= 0 ? 0 : Math.min(100, (totalHours / expectedHours) * 100);
    const hourlyRate = params.hourlyRateByProfile?.[profileId];
    return {
      profileId,
      period: params.period,
      label,
      totalMinutes,
      totalHours,
      expectedHours,
      assiduityRate,
      hourlyRate: hourlyRate ?? null,
      estimatedAmount: typeof hourlyRate === 'number' ? totalHours * hourlyRate : null,
    };
  });
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getPayrollPeriodBounds(referenceDate: string | Date, payrollPeriodStartDay: number): { start: Date; end: Date; label: string } {
  const ref = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  const safeStartDay = Math.min(28, Math.max(1, payrollPeriodStartDay || 1));
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const currentPeriodStart = new Date(year, month, safeStartDay, 0, 0, 0, 0);
  const start = ref.getDate() >= safeStartDay
    ? currentPeriodStart
    : new Date(year, month - 1, safeStartDay, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, safeStartDay, 0, 0, 0, 0);
  end.setMilliseconds(-1);

  return {
    start,
    end,
    label: `${toIsoDate(start)} -> ${toIsoDate(end)}`,
  };
}

export type PresenceComplianceMetric = {
  profileId: string;
  totalWorkedMinutes: number;
  expectedMinutes: number;
  disconnectCount: number;
  delayMinutes: number;
  unauthorizedAbsenceMinutes: number;
  paidMinutes: number;
  payableAmount: number;
  hourlyRate: number;
};

function minutesFromTimeString(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map((x) => Number(x || 0));
  return (h * 60) + m;
}

export function computePresenceCompliance(params: {
  employees: Employee[];
  sessions: PresenceSession[];
  statusEvents: PresenceStatusEvent[];
  absences: HrAbsenceEvent[];
  policy: HrAttendancePolicy | null;
  userIdByProfile: Record<string, string>;
  periodStart: string;
  periodEnd: string;
}): PresenceComplianceMetric[] {
  const startMs = new Date(`${params.periodStart}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${params.periodEnd}T23:59:59.999Z`).getTime();
  const expectedDaily = params.policy?.expectedDailyMinutes ?? 480;
  const expectedStartTime = params.policy?.expectedWorkStartTime || '09:00:00';
  const expectedStartMinutes = minutesFromTimeString(expectedStartTime);
  const toleranceDelay = params.policy?.monthlyDelayToleranceMinutes ?? 45;
  const toleranceAbsence = params.policy?.monthlyUnjustifiedAbsenceToleranceMinutes ?? 480;

  return params.employees.map((employee) => {
    const profileId = String(employee.profileId);
    const userId = params.userIdByProfile[profileId] || profileId;
    const sessions = params.sessions.filter((s) => {
      if (s.userId !== userId) return false;
      const started = new Date(s.startedAt).getTime();
      return started >= startMs && started <= endMs;
    });
    const unauthorizedAbsenceMinutes = params.absences
      .filter((a) => a.profileId === profileId && !a.isAuthorized && new Date(`${a.absenceDate}T12:00:00.000Z`).getTime() >= startMs && new Date(`${a.absenceDate}T12:00:00.000Z`).getTime() <= endMs)
      .reduce((acc, a) => acc + Math.max(0, a.durationMinutes || 0), 0);

    /** Toujours le temps effectif sessions (fenêtre 9h–19h, pauses, fusion des chevauchements). Les événements
     *  sommaient des segments qui se recouvraient → minutes et paie fantaisistes. */
    const workedMinutesFromSessionsEffective = Math.floor(
      computeEffectiveWorkedSecondsFromSessions(sessions, userId, startMs, endMs, Date.now()) / 60,
    );
    const workedMinutes = workedMinutesFromSessionsEffective;

    const days = new Set(
      sessions
        .filter((s) => presenceStatusCountsTowardDuration(s.status))
        .map((s) => new Date(s.startedAt).toISOString().slice(0, 10)),
    );
    const expectedMinutes = days.size * expectedDaily;
    const disconnectCount = sessions.filter((s) => !!s.endedAt).length;

    const firstSessionsByDay = sessions
      .filter((s) => presenceStatusCountsTowardDuration(s.status))
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .reduce<Record<string, PresenceSession>>((acc, session) => {
        const dayKey = new Date(session.startedAt).toISOString().slice(0, 10);
        if (!acc[dayKey] || new Date(session.startedAt).getTime() < new Date(acc[dayKey].startedAt).getTime()) {
          acc[dayKey] = session;
        }
        return acc;
      }, {});

    const delayMinutes = Object.values(firstSessionsByDay).reduce((acc, session) => {
      const d = new Date(session.startedAt);
      const actual = d.getHours() * 60 + d.getMinutes();
      return acc + Math.max(0, actual - expectedStartMinutes);
    }, 0);

    const payableDelayPenalty = Math.max(0, delayMinutes - toleranceDelay);
    const payableAbsencePenalty = Math.max(0, unauthorizedAbsenceMinutes - toleranceAbsence);
    const paidMinutes = Math.max(0, workedMinutes - payableDelayPenalty - payableAbsencePenalty);
    const hourlyRate = Number(employee.hourlyRate || sessions.find((s) => typeof s.hourlyRate === 'number')?.hourlyRate || 0);
    const payableAmount = (paidMinutes / 60) * hourlyRate;

    return {
      profileId,
      totalWorkedMinutes: workedMinutes,
      expectedMinutes,
      disconnectCount,
      delayMinutes,
      unauthorizedAbsenceMinutes,
      paidMinutes,
      payableAmount,
      hourlyRate,
    };
  });
}

const PAUSE_STATUSES = new Set<PresenceStatus>(['pause', 'pause_coffee', 'pause_lunch']);

/** Fin effective d’un segment : ne prolonge pas au-delà de la fin de session de présence si déconnecté. */
export function boundedStatusEventEndMs(
  evt: PresenceStatusEvent,
  nowMs: number,
  sessionById?: Map<string, PresenceSession>,
): number {
  if (evt.endedAt) return new Date(evt.endedAt).getTime();
  const sess = sessionById?.get(evt.presenceSessionId);
  const sessionCap = sess?.endedAt ? new Date(sess.endedAt).getTime() : nowMs;
  return Math.min(nowMs, sessionCap);
}

/** Secondes de segment (événement fermé ou en cours ; plafonné à la session si `sessionById` fourni). */
export function presenceEventDurationSeconds(
  evt: PresenceStatusEvent,
  nowMs: number = Date.now(),
  sessionById?: Map<string, PresenceSession>,
): number {
  if (!presenceStatusCountsTowardDuration(evt.status)) return 0;
  if (typeof evt.durationSeconds === 'number' && evt.durationSeconds >= 0 && evt.endedAt) {
    return evt.durationSeconds;
  }
  const start = new Date(evt.startedAt).getTime();
  const end = boundedStatusEventEndMs(evt, nowMs, sessionById);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

/** Segments de pause dont la durée dépasse le plafond (une ligne par événement) */
export function listPauseOverrunEvents(
  events: PresenceStatusEvent[],
  maxPauseMinutes: number,
  sessionById?: Map<string, PresenceSession>,
): PresenceStatusEvent[] {
  const maxSec = Math.max(1, maxPauseMinutes) * 60;
  const nowMs = Date.now();
  return events.filter((e) => {
    if (!PAUSE_STATUSES.has(e.status)) return false;
    return presenceEventDurationSeconds(e, nowMs, sessionById) > maxSec;
  });
}

/** Catégories agrégées pour un bilan journalier (secondes par type) */
export type DailyPresenceCategory = 'productive' | 'meeting' | 'pause' | 'mission' | 'absent' | 'technical';

export const DAILY_PRESENCE_CATEGORY_LABELS_FR: Record<DailyPresenceCategory, string> = {
  productive: 'Présent / productif',
  meeting: 'Réunion / brief',
  pause: 'Pauses',
  mission: 'Mission / déplacement',
  absent: 'Absent',
  technical: 'Incident technique',
};

export const DAILY_PRESENCE_CATEGORY_LABELS_EN: Record<DailyPresenceCategory, string> = {
  productive: 'Present / productive',
  meeting: 'Meeting / brief',
  pause: 'Breaks',
  mission: 'Mission / travel',
  absent: 'Absent',
  technical: 'Technical issue',
};

export function secondsToHmsParts(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function formatHmsFrench(parts: { hours: number; minutes: number; seconds: number }): string {
  const { hours, minutes, seconds } = parts;
  return `${hours} h ${String(minutes).padStart(2, '0')} min ${String(seconds).padStart(2, '0')} s`;
}

function localDayBoundsMs(dateIso: string): { startMs: number; endMs: number } {
  const [y, m, d] = dateIso.split('-').map((x) => Number(x));
  if (!y || !m || !d) return { startMs: 0, endMs: 0 };
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { startMs: start, endMs: end };
}

function statusToDailyCategory(status: PresenceStatus): DailyPresenceCategory {
  if (status === 'online' || status === 'present') return 'productive';
  if (status === 'in_meeting' || status === 'brief_team') return 'meeting';
  if (status === 'pause' || status === 'pause_coffee' || status === 'pause_lunch') return 'pause';
  if (status === 'away_mission') return 'mission';
  if (status === 'absent') return 'absent';
  return 'technical';
}

/** Secondes d’un segment qui tombent dans la journée locale `dateIso` (découpe aux bornes du jour). */
export function presenceEventSecondsInLocalDay(
  evt: PresenceStatusEvent,
  dateIso: string,
  nowMs: number = Date.now(),
  sessionById?: Map<string, PresenceSession>,
): number {
  if (!presenceStatusCountsTowardDuration(evt.status)) return 0;
  const { startMs, endMs } = localDayBoundsMs(dateIso);
  if (endMs <= startMs) return 0;
  const es = new Date(evt.startedAt).getTime();
  const ee = boundedStatusEventEndMs(evt, nowMs, sessionById);
  if (!Number.isFinite(es) || !Number.isFinite(ee) || ee <= es) return 0;
  const overlapStart = Math.max(es, startMs);
  const overlapEnd = Math.min(ee, endMs);
  if (overlapEnd <= overlapStart) return 0;
  return Math.floor((overlapEnd - overlapStart) / 1000);
}

const EMPTY_CATEGORIES: Record<DailyPresenceCategory, number> = {
  productive: 0,
  meeting: 0,
  pause: 0,
  mission: 0,
  absent: 0,
  technical: 0,
};

export type DailyPresenceBreakdown = {
  categories: Record<DailyPresenceCategory, number>;
  /** Temps suivi : uniquement segments non « absent » (l’absence n’a pas de durée comptée). */
  totalSeconds: number;
  /** Identique à totalSeconds (les segments absent sont exclus du calcul). */
  totalSecondsIncludingAbsent: number;
  /** Nombre de segments de pause touchant ce jour (pause / café / déjeuner). */
  pauseSegmentCount: number;
  /** Segments de pause de plus de {@link MIN_SIGNIFICANT_PAUSE_SECONDS} dans ce jour. */
  pauseSegmentsOverTwoMinutes: number;
};

/**
 * Ventilation « objectif journée » : temps présent (hors pause), pauses, écart / incohérences (dont incident technique).
 * `dailyTargetSeconds` = minutes prévues × 60 (fiche salarié ou politique).
 */
export function computeDailyQuotaSplitFromBreakdown(
  breakdown: DailyPresenceBreakdown,
  dailyTargetSeconds: number,
): { presentSeconds: number; pauseSeconds: number; incoherenceSeconds: number } {
  const c = breakdown.categories;
  const presentSeconds = c.productive + c.meeting + c.mission;
  const pauseSeconds = c.pause;
  const technicalSeconds = c.technical;
  const spent = presentSeconds + pauseSeconds;
  const incoherenceSeconds = Math.max(0, dailyTargetSeconds - spent) + technicalSeconds;
  return { presentSeconds, pauseSeconds, incoherenceSeconds };
}

/**
 * Affichage compact heures / minutes (sans équivalent-journée), pour une plage courte (ex. « cette heure »).
 */
export function formatWorkedSecondsClockCompact(workedSeconds: number, fr: boolean): string {
  const s = Math.max(0, Math.floor(workedSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (fr) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

/**
 * Affichage compact : équivalent-journée (quota = 1 j) + heures/minutes.
 * `dayQuotaSeconds` = minutes prévues salarié/politique × 60 (défaut 9 h interne si non fourni).
 */
export function formatWorkedSecondsAsDayAndClock(
  workedSeconds: number,
  fr: boolean,
  dayQuotaSeconds: number = ATTENDANCE_DAILY_TARGET_SECONDS,
): string {
  const s = Math.max(0, Math.floor(workedSeconds));
  const quota = Math.max(60, Math.floor(dayQuotaSeconds));
  const dayEq = s / quota;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const dStr = dayEq.toLocaleString(fr ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  if (fr) return `${dStr} j · ${h}h${String(m).padStart(2, '0')}`;
  return `${dStr} d · ${h}h${String(m).padStart(2, '0')}`;
}

/** Affichage vs cible (jour, semaine 44 h, etc.) : équivalent-journée + % de la cible. */
export function formatWorkedVsTargetSeconds(
  workedSeconds: number,
  targetSeconds: number,
  fr: boolean,
  dayQuotaSeconds: number = ATTENDANCE_DAILY_TARGET_SECONDS,
): string {
  const base = formatWorkedSecondsAsDayAndClock(workedSeconds, fr, dayQuotaSeconds);
  if (targetSeconds <= 0) return base;
  const pct = Math.min(999, (workedSeconds / targetSeconds) * 100);
  if (fr) return `${base} · ${pct.toFixed(0)} %`;
  return `${base} · ${pct.toFixed(0)}%`;
}

export function computeDailyPresenceBreakdown(params: {
  events: PresenceStatusEvent[];
  dateIso: string;
  userId: string;
  nowMs?: number;
  sessionById?: Map<string, PresenceSession>;
}): DailyPresenceBreakdown {
  const nowMs = params.nowMs ?? Date.now();
  const sessionById = params.sessionById;
  const categories = { ...EMPTY_CATEGORIES };
  let totalIncludingAbsent = 0;
  let pauseSegmentCount = 0;
  let pauseSegmentsOverTwoMinutes = 0;

  type Piece = { cs: number; ce: number; startedAtMs: number; status: PresenceStatus };
  const pieces: Piece[] = [];
  const { startMs: dayStart, endMs: dayEnd } = localDayBoundsMs(params.dateIso);
  if (dayEnd <= dayStart) {
    return {
      categories,
      totalSeconds: 0,
      totalSecondsIncludingAbsent: 0,
      pauseSegmentCount: 0,
      pauseSegmentsOverTwoMinutes: 0,
    };
  }

  for (const evt of params.events) {
    if (String(evt.userId) !== String(params.userId)) continue;
    if (!presenceStatusCountsTowardDuration(evt.status)) continue;
    const es = new Date(evt.startedAt).getTime();
    const ee = boundedStatusEventEndMs(evt, nowMs, sessionById);
    if (!Number.isFinite(es) || !Number.isFinite(ee) || ee <= es) continue;
    const overlapStart = Math.max(es, dayStart);
    const overlapEnd = Math.min(ee, dayEnd);
    if (overlapEnd <= overlapStart) continue;
    pieces.push({
      cs: overlapStart,
      ce: overlapEnd,
      startedAtMs: es,
      status: evt.status as PresenceStatus,
    });
  }

  if (!pieces.length) {
    return {
      categories,
      totalSeconds: 0,
      totalSecondsIncludingAbsent: 0,
      pauseSegmentCount: 0,
      pauseSegmentsOverTwoMinutes: 0,
    };
  }

  const marks = new Set<number>();
  for (const p of pieces) {
    marks.add(p.cs);
    marks.add(p.ce);
  }
  const sortedMarks = [...marks].sort((x, y) => x - y);

  let curPauseRunSec = 0;
  let inPauseRun = false;

  for (let i = 0; i < sortedMarks.length - 1; i++) {
    const T0 = sortedMarks[i];
    const T1 = sortedMarks[i + 1];
    if (T1 <= T0) continue;
    const covering = pieces.filter((p) => p.cs < T1 && p.ce > T0);
    if (!covering.length) continue;
    const pick = covering.reduce((best, cur) => (cur.startedAtMs > best.startedAtMs ? cur : best));
    const cat = statusToDailyCategory(pick.status);
    const sec = Math.floor((T1 - T0) / 1000);
    if (sec <= 0) continue;
    categories[cat] += sec;
    totalIncludingAbsent += sec;

    const isPause = PAUSE_STATUSES.has(pick.status);
    if (isPause) {
      if (!inPauseRun) {
        pauseSegmentCount += 1;
        inPauseRun = true;
        curPauseRunSec = 0;
      }
      curPauseRunSec += sec;
    } else {
      if (inPauseRun) {
        if (curPauseRunSec > MIN_SIGNIFICANT_PAUSE_SECONDS) pauseSegmentsOverTwoMinutes += 1;
        inPauseRun = false;
        curPauseRunSec = 0;
      }
    }
  }
  if (inPauseRun && curPauseRunSec > MIN_SIGNIFICANT_PAUSE_SECONDS) pauseSegmentsOverTwoMinutes += 1;

  const totalSeconds = totalIncludingAbsent;
  return {
    categories,
    totalSeconds,
    totalSecondsIncludingAbsent: totalIncludingAbsent,
    pauseSegmentCount,
    pauseSegmentsOverTwoMinutes,
  };
}

/** Une ligne par salarié pour une date (userId = auth user id des événements). */
export function computeDailyPresenceBreakdownByUser(params: {
  events: PresenceStatusEvent[];
  dateIso: string;
  userIds: string[];
  nowMs?: number;
  sessionById?: Map<string, PresenceSession>;
}): Array<DailyPresenceBreakdown & { userId: string }> {
  return params.userIds.map((userId) => ({
    userId,
    ...computeDailyPresenceBreakdown({
      events: params.events,
      dateIso: params.dateIso,
      userId,
      nowMs: params.nowMs,
      sessionById: params.sessionById,
    }),
  }));
}

// ----- Paie : période comptable + conversion temps → heures rémunérées -----

/**
 * Nombre de minutes « mur » comptées pour une heure de paie (défaut 60).
 * Certaines organisations utilisent une autre base (ex. 68) : modifier ici si besoin.
 */
export const PAYROLL_MINUTES_PER_PAID_HOUR = 60;

/** Secondes murales de présence dans [startMs, endMs], fusion des sessions qui se chevauchent. */
export function computeSessionOverlapSecondsInRange(
  sessions: PresenceSession[],
  authUserId: string,
  startMs: number,
  endMs: number,
  nowMs: number = Date.now(),
): number {
  const clips: Array<{ a: number; b: number }> = [];
  for (const s of sessions) {
    if (String(s.userId) !== String(authUserId)) continue;
    if (!presenceStatusCountsTowardDuration(s.status)) continue;
    const a = new Date(s.startedAt).getTime();
    const b = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const o0 = Math.max(a, startMs);
    const o1 = Math.min(b, endMs);
    if (o1 > o0) clips.push({ a: o0, b: o1 });
  }
  return mergeDisjointIntervals(clips).reduce((sum, m) => sum + Math.floor((m.b - m.a) / 1000), 0);
}

function localDateKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Jours distincts (calendrier local) avec au moins une session qui intersecte la période. */
export function countDistinctWorkDaysInRange(
  sessions: PresenceSession[],
  authUserId: string,
  startMs: number,
  endMs: number,
  nowMs: number = Date.now(),
): number {
  const days = new Set<string>();
  for (const s of sessions) {
    if (String(s.userId) !== String(authUserId)) continue;
    if (!presenceStatusCountsTowardDuration(s.status)) continue;
    const a = new Date(s.startedAt).getTime();
    const b = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const o0 = Math.max(a, startMs);
    const o1 = Math.min(b, endMs);
    if (o1 <= o0) continue;
    const dayStart = new Date(o0);
    dayStart.setHours(0, 0, 0, 0);
    let ptr = dayStart.getTime();
    while (ptr < o1) {
      days.add(localDateKeyFromMs(ptr));
      ptr += 86400000;
    }
  }
  return days.size;
}

/** Heures « paie » : minutes réelles / base (ex. 60 min = 1 h payée). */
export function workedSecondsToPayableHours(workedSeconds: number): number {
  const minutes = workedSeconds / 60;
  return minutes / Math.max(1, PAYROLL_MINUTES_PER_PAID_HOUR);
}

export type PayrollPeriodWorkedRow = {
  profileId: string;
  displayName: string;
  periodLabel: string;
  periodStartIso: string;
  periodEndIso: string;
  workedSeconds: number;
  /** Heures décimales pour calcul salaire (après règle PAYROLL_MINUTES_PER_PAID_HOUR). */
  payableHours: number;
  distinctWorkDays: number;
  /** Équivalent « jours à 9 h » (temps effectif ÷ 9 h). */
  fullDayEquivalents: number;
  hourlyRate: number;
  estimatedPay: number;
};

/** Aperçu rémunération sur la période comptable (politique RH) pour chaque salarié. */
export function listPayrollPeriodWorkedRows(params: {
  employees: Employee[];
  sessions: PresenceSession[];
  policy: HrAttendancePolicy | null;
  userIdByProfile: Record<string, string>;
  displayNameByProfileId: Record<string, string>;
  referenceDate?: Date;
}): PayrollPeriodWorkedRow[] {
  const ref = params.referenceDate ?? new Date();
  const startDay = params.policy?.payrollPeriodStartDay ?? 1;
  const { start, end, label } = getPayrollPeriodBounds(ref, startDay);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const nowMs = Date.now();

  return params.employees.map((emp) => {
    const profileId = String(emp.profileId);
    const authUserId = params.userIdByProfile[profileId] || profileId;
    const workedSeconds = computeEffectiveWorkedSecondsFromSessions(
      params.sessions,
      authUserId,
      startMs,
      endMs,
      nowMs,
    );
    const payableHours = workedSecondsToPayableHours(workedSeconds);
    const fullDayEquivalents = workedSeconds / Math.max(1, ATTENDANCE_DAILY_TARGET_SECONDS);
    const distinctWorkDays = countDistinctWorkDaysInRange(
      params.sessions,
      authUserId,
      startMs,
      endMs,
      nowMs,
    );
    const hourlyRate = Number(emp.hourlyRate ?? 0) || 0;
    const estimatedPay = payableHours * hourlyRate;
    const displayName =
      params.displayNameByProfileId[profileId] || profileId.slice(0, 8);
    return {
      profileId,
      displayName,
      periodLabel: label,
      periodStartIso: start.toISOString().slice(0, 10),
      periodEndIso: end.toISOString().slice(0, 10),
      workedSeconds,
      payableHours,
      distinctWorkDays,
      fullDayEquivalents,
      hourlyRate,
      estimatedPay,
    };
  });
}
