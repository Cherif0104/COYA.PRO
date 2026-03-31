import { supabase } from './supabaseService';
import { Employee, HrAbsenceEvent, HrAttendancePolicy, PresencePeriodMetric, PresenceSession, PresenceStatusEvent } from '../types';

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
