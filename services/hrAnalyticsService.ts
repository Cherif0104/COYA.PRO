import { supabase } from './supabaseService';
import { Employee, HrAbsenceEvent, HrAttendancePolicy, PresencePeriodMetric, PresenceSession, PresenceStatus, PresenceStatusEvent } from '../types';

const ABSENCE_TABLE = 'hr_absence_events';

function minutesBetween(startIso: string, endIso?: string | null): number {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}

const PRODUCTIVE_STATUSES = new Set([
  'online',
  'present',
  'in_meeting',
  'brief_team',
  'away_mission',
]);

function periodBounds(period: PresencePeriodMetric['period']): { start: Date; end: Date; label: string; expectedHours: number } {
  const now = new Date();
  const year = now.getFullYear();
  if (period === 'day') {
    const start = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: start.toISOString().slice(0, 10), expectedHours: 8 };
  }
  if (period === 'week') {
    const day = (now.getDay() + 6) % 7;
    const start = new Date(year, now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${start.toISOString().slice(0, 10)} -> ${end.toISOString().slice(0, 10)}`, expectedHours: 40 };
  }
  if (period === 'month') {
    const start = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: `${start.toLocaleString('fr-FR', { month: 'long' })} ${year}`, expectedHours: 160 };
  }
  if (period === 'quarter') {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
    const q = Math.floor(now.getMonth() / 3) + 1;
    return { start, end, label: `T${q} ${year}`, expectedHours: 480 };
  }
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end, label: `${year}`, expectedHours: 1920 };
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
    const totalMinutes = filtered.reduce((acc, s) => acc + minutesBetween(s.startedAt, s.endedAt), 0);
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
    const sessionIds = new Set(sessions.map((s) => s.id));
    const events = params.statusEvents.filter((e) => sessionIds.has(e.presenceSessionId));
    const unauthorizedAbsenceMinutes = params.absences
      .filter((a) => a.profileId === profileId && !a.isAuthorized && new Date(`${a.absenceDate}T12:00:00.000Z`).getTime() >= startMs && new Date(`${a.absenceDate}T12:00:00.000Z`).getTime() <= endMs)
      .reduce((acc, a) => acc + Math.max(0, a.durationMinutes || 0), 0);

    const workedMinutesByEvents = events.reduce((acc, evt) => {
      if (!PRODUCTIVE_STATUSES.has(evt.status)) return acc;
      return acc + minutesBetween(evt.startedAt, evt.endedAt);
    }, 0);

    const workedMinutes = workedMinutesByEvents > 0
      ? workedMinutesByEvents
      : sessions.reduce((acc, s) => acc + minutesBetween(s.startedAt, s.endedAt), 0);

    const days = new Set(sessions.map((s) => new Date(s.startedAt).toISOString().slice(0, 10)));
    const expectedMinutes = days.size * expectedDaily;
    const disconnectCount = sessions.filter((s) => !!s.endedAt).length;

    const firstSessionsByDay = sessions
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
      const actual = d.getUTCHours() * 60 + d.getUTCMinutes();
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

/** Secondes de segment (événement fermé ou en cours jusqu’à maintenant) */
export function presenceEventDurationSeconds(evt: PresenceStatusEvent, nowMs: number = Date.now()): number {
  if (typeof evt.durationSeconds === 'number' && evt.durationSeconds >= 0 && evt.endedAt) {
    return evt.durationSeconds;
  }
  const start = new Date(evt.startedAt).getTime();
  const end = evt.endedAt ? new Date(evt.endedAt).getTime() : nowMs;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

/** Segments de pause dont la durée dépasse le plafond (une ligne par événement) */
export function listPauseOverrunEvents(events: PresenceStatusEvent[], maxPauseMinutes: number): PresenceStatusEvent[] {
  const maxSec = Math.max(1, maxPauseMinutes) * 60;
  return events.filter((e) => {
    if (!PAUSE_STATUSES.has(e.status)) return false;
    return presenceEventDurationSeconds(e) > maxSec;
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
export function presenceEventSecondsInLocalDay(evt: PresenceStatusEvent, dateIso: string, nowMs: number = Date.now()): number {
  const { startMs, endMs } = localDayBoundsMs(dateIso);
  if (endMs <= startMs) return 0;
  const es = new Date(evt.startedAt).getTime();
  const ee = evt.endedAt ? new Date(evt.endedAt).getTime() : nowMs;
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

export function computeDailyPresenceBreakdown(params: {
  events: PresenceStatusEvent[];
  dateIso: string;
  userId: string;
  nowMs?: number;
}): { categories: Record<DailyPresenceCategory, number>; totalSeconds: number } {
  const nowMs = params.nowMs ?? Date.now();
  const categories = { ...EMPTY_CATEGORIES };
  let totalSeconds = 0;
  for (const evt of params.events) {
    if (String(evt.userId) !== String(params.userId)) continue;
    const sec = presenceEventSecondsInLocalDay(evt, params.dateIso, nowMs);
    if (sec <= 0) continue;
    const cat = statusToDailyCategory(evt.status);
    categories[cat] += sec;
    totalSeconds += sec;
  }
  return { categories, totalSeconds };
}

/** Une ligne par salarié pour une date (userId = auth user id des événements). */
export function computeDailyPresenceBreakdownByUser(params: {
  events: PresenceStatusEvent[];
  dateIso: string;
  userIds: string[];
  nowMs?: number;
}): Array<{ userId: string; categories: Record<DailyPresenceCategory, number>; totalSeconds: number }> {
  return params.userIds.map((userId) => ({
    userId,
    ...computeDailyPresenceBreakdown({
      events: params.events,
      dateIso: params.dateIso,
      userId,
      nowMs: params.nowMs,
    }),
  }));
}
