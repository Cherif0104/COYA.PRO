import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Job, LeaveRequest, Meeting, Language, PlanningSlot, PlanningSlotType, Role, User, PLANNING_ORG_SCOPE_ROLES } from '../types';
import DataAdapter from '../services/dataAdapter';
import { DataService } from '../services/dataService';
import OrganizationService from '../services/organizationService';
import ConfirmationModal from './common/ConfirmationModal';
import RhModule from './RhModule';

const SLOT_TYPE_LABELS: Record<PlanningSlotType, string> = {
  telework: 'Télétravail',
  onsite: 'Présentiel',
  leave: 'Congé',
  meeting: 'Réunion',
  modulation: 'Modulation',
  other: 'Autre'
};

const SLOT_TYPE_ICONS: Record<PlanningSlotType, string> = {
  telework: 'fas fa-laptop-house',
  onsite: 'fas fa-building',
  leave: 'fas fa-umbrella-beach',
  meeting: 'fas fa-video',
  modulation: 'fas fa-exchange-alt',
  other: 'fas fa-calendar-day'
};

function getWeekBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  const day = start.getDay();
  const diff = start.getDate() - (day === 0 ? 6 : day - 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 19 * 60;
const DAY_RANGE_MIN = DAY_END_MIN - DAY_START_MIN;

function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const p = String(t).slice(0, 5);
  const [h, m] = p.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** Données & callbacks RH branchés depuis App (congés, salariés, offres) */
export type PlanningRhBridgeProps = {
  leaveRequests: LeaveRequest[];
  users: User[];
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  onAddLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateLeaveRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onUpdateLeaveDates?: (id: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onDeleteLeaveRequest: (id: string) => Promise<void>;
  isLoading?: boolean;
  loadingOperation?: string | null;
};

interface PlanningProps {
  meetings?: Meeting[];
  setView?: (view: string) => void;
  rh?: PlanningRhBridgeProps | null;
}

type PlanningNavTab =
  | 'hub'
  | 'my_schedule'
  | 'team_board'
  | 'attendance'
  | 'leave'
  | 'postes'
  | 'marketplace'
  | 'conflicts'
  | 'notifications';

const NAV_TABS: { id: PlanningNavTab; icon: string; labelFr: string; labelEn: string }[] = [
  { id: 'hub', icon: 'fas fa-grip-horizontal', labelFr: 'Pilotage', labelEn: 'Command center' },
  { id: 'my_schedule', icon: 'fas fa-calendar-week', labelFr: 'Mon planning', labelEn: 'My schedule' },
  { id: 'team_board', icon: 'fas fa-users-cog', labelFr: 'Équipe & planning', labelEn: 'Team & schedule' },
  { id: 'attendance', icon: 'fas fa-user-clock', labelFr: 'Présence (RH)', labelEn: 'Attendance (HR)' },
  { id: 'leave', icon: 'fas fa-umbrella-beach', labelFr: 'Absences (RH)', labelEn: 'Leave (HR)' },
  { id: 'postes', icon: 'fas fa-id-badge', labelFr: 'Postes (RH)', labelEn: 'Positions (HR)' },
  { id: 'marketplace', icon: 'fas fa-people-arrows', labelFr: 'Shifts & échanges', labelEn: 'Swaps & open shifts' },
  { id: 'conflicts', icon: 'fas fa-exclamation-triangle', labelFr: 'Conflits', labelEn: 'Conflicts' },
  { id: 'notifications', icon: 'fas fa-bell', labelFr: 'Notifications', labelEn: 'Notifications' },
];

const Planning: React.FC<PlanningProps> = ({ meetings = [], setView, rh = null }) => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;
  const { user } = useAuth();
  const { canAccessModule } = useModulePermissions();
  const [navTab, setNavTab] = useState<PlanningNavTab>('my_schedule');
  const [teamBoardSub, setTeamBoardSub] = useState<'rh' | 'grid'>('rh');
  const dragPayloadRef = useRef<{ slotId: string } | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const { start } = getWeekBounds(d);
    return start;
  });
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSlot, setModalSlot] = useState<PlanningSlot | null | 'new'>(null);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slotDate: toYMD(new Date()),
    slotType: 'onsite' as PlanningSlotType,
    startTime: '09:00',
    endTime: '18:00',
    title: '',
    notes: ''
  });
  const [viewMode, setViewMode] = useState<'week' | 'timeline'>('week');
  const [timelineDay, setTimelineDay] = useState(() => new Date());
  const [timelineUserIds, setTimelineUserIds] = useState<string[]>([]);
  const [timelineLabels, setTimelineLabels] = useState<Record<string, string>>({});

  const { start: dateFrom, end: dateTo } = useMemo(() => getWeekBounds(weekStart), [weekStart]);
  const dateFromStr = toYMD(dateFrom);
  const dateToStr = toYMD(dateTo);
  const timelineYmd = toYMD(timelineDay);

  const isOrgScopePlanner = useMemo(
    () => PLANNING_ORG_SCOPE_ROLES.includes(String(user?.role || '') as Role),
    [user?.role],
  );

  const canReadRh = canAccessModule('rh');
  const canReadLeave = canAccessModule('leave_management') || canAccessModule('leave_management_admin');
  const canReadPostes = canAccessModule('postes_management');

  const visibleNavTabs = useMemo(
    () =>
      NAV_TABS.filter((tab) => {
        if (tab.id === 'attendance') return canReadRh;
        if (tab.id === 'leave') return canReadLeave;
        if (tab.id === 'postes') return canReadPostes;
        return true;
      }),
    [canReadRh, canReadLeave, canReadPostes],
  );

  useEffect(() => {
    if (!visibleNavTabs.some((t) => t.id === navTab)) {
      setNavTab('my_schedule');
    }
  }, [visibleNavTabs, navTab]);

  useEffect(() => {
    if (navTab === 'team_board') {
      setTeamBoardSub(canReadRh ? 'rh' : 'grid');
    }
  }, [navTab, canReadRh]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);

    if (viewMode === 'week') {
      DataAdapter.getPlanningSlots({
        dateFrom: dateFromStr,
        dateTo: dateToStr,
        userId: user.id,
      })
        .then((list) => {
          if (!cancelled) setSlots(list);
        })
        .catch(() => {
          if (!cancelled) setSlots([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const orgId = await OrganizationService.getCurrentUserOrganizationId();
        const { data: profiles } = await DataService.getProfiles();
        const inOrg = (profiles || []).filter((p: any) => !orgId || p.organization_id === orgId);
        const authIds = inOrg.map((p: any) => String(p.user_id)).filter(Boolean);
        let ids = Array.from(new Set([String(user.id), ...authIds]));
        if (!isOrgScopePlanner) ids = [String(user.id)];
        ids = ids.slice(0, 8);
        const labels: Record<string, string> = {};
        inOrg.forEach((p: any) => {
          const uid = String(p.user_id);
          if (uid) labels[uid] = p.full_name || p.email || uid;
        });
        labels[String(user.id)] = 'Moi';
        if (!cancelled) {
          setTimelineUserIds(ids);
          setTimelineLabels(labels);
        }
        const list = await DataAdapter.getPlanningSlots({
          dateFrom: timelineYmd,
          dateTo: timelineYmd,
          userIds: ids,
        });
        if (!cancelled) setSlots(list);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewMode, dateFromStr, dateToStr, timelineYmd, user?.id, isOrgScopePlanner]);

  const slotsByDay = useMemo(() => {
    const map: Record<string, PlanningSlot[]> = {};
    slots.forEach((s) => {
      if (!map[s.slotDate]) map[s.slotDate] = [];
      map[s.slotDate].push(s);
    });
    return map;
  }, [slots]);

  const weekDays = useMemo(() => {
    const days: string[] = [];
    const cur = new Date(dateFrom);
    for (let i = 0; i < 7; i++) {
      days.push(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [dateFrom]);

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday = () => setWeekStart(getWeekBounds(new Date()).start);
  const prevTimelineDay = () => setTimelineDay((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextTimelineDay = () => setTimelineDay((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goTimelineToday = () => setTimelineDay(new Date());

  const openNew = () => {
    setForm({
      slotDate: toYMD(new Date()),
      slotType: 'onsite',
      startTime: '09:00',
      endTime: '18:00',
      title: '',
      notes: ''
    });
    setModalSlot('new');
  };

  const openEdit = (slot: PlanningSlot) => {
    setForm({
      slotDate: slot.slotDate,
      slotType: slot.slotType,
      startTime: slot.startTime?.slice(0, 5) || '09:00',
      endTime: slot.endTime?.slice(0, 5) || '18:00',
      title: slot.title || '',
      notes: slot.notes || ''
    });
    setModalSlot(slot);
  };

  const saveSlot = async () => {
    if (!user?.id) return;
    if (modalSlot === 'new') {
      const created = await DataAdapter.createPlanningSlot({
        userId: user.id,
        slotDate: form.slotDate,
        slotType: form.slotType,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        title: form.title || undefined,
        notes: form.notes || undefined
      });
      if (created) {
        setSlots((prev) => {
          const next = [...prev, created].sort(
            (a, b) => a.slotDate.localeCompare(b.slotDate) || (a.startTime || '').localeCompare(b.startTime || ''),
          );
          return next;
        });
      }
    } else if (modalSlot && modalSlot !== 'new') {
      const updated = await DataAdapter.updatePlanningSlot(modalSlot.id, {
        slotDate: form.slotDate,
        slotType: form.slotType,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        title: form.title || null,
        notes: form.notes || null
      });
      if (updated) setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
    setModalSlot(null);
  };

  const confirmDelete = async () => {
    if (!deleteSlotId) return;
    try {
      await DataAdapter.deletePlanningSlot(deleteSlotId);
      setSlots((prev) => prev.filter((s) => s.id !== deleteSlotId));
    } finally {
      setDeleteSlotId(null);
    }
  };

  const locale = isFr ? 'fr-FR' : 'en-US';
  const weekLabel = `${dateFrom.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${dateTo.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // ===== WFM: Pilotage data =====
  const [hubLoading, setHubLoading] = useState(false);
  const [hubMetrics, setHubMetrics] = useState<{
    slotsThisWeek: number;
    openShifts: number;
    swapPending: number;
    leavesPending: number;
    activePresence: number;
    unreadNotifications: number;
  } | null>(null);

  // ===== WFM: Team board =====
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSlots, setTeamSlots] = useState<PlanningSlot[]>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [teamWeekAnchor, setTeamWeekAnchor] = useState<Date>(() => new Date());
  const teamWeek = useMemo(() => getWeekBounds(teamWeekAnchor), [teamWeekAnchor]);
  const teamDateFrom = teamWeek.start;
  const teamDateTo = teamWeek.end;
  const teamWeekDays = useMemo(() => {
    const d: string[] = [];
    const cur = new Date(teamDateFrom);
    cur.setHours(12, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      d.push(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return d;
  }, [teamDateFrom]);

  // ===== WFM: Marketplace =====
  const [marketLoading, setMarketLoading] = useState(false);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);

  // ===== WFM: Conflicts =====
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<
    Array<{ id: string; severity: 'high' | 'medium' | 'low'; userId: string; date: string; title: string; details?: string }>
  >([]);

  // ===== WFM: Notifications =====
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const ymdFromDate = (d: Date) => toYMD(d);

  const computeConflictsFromSlots = (slots: PlanningSlot[]) => {
    const byUser = new Map<string, PlanningSlot[]>();
    for (const s of slots) {
      const arr = byUser.get(String(s.userId)) || [];
      arr.push(s);
      byUser.set(String(s.userId), arr);
    }
    const out: Array<{ id: string; severity: 'high' | 'medium' | 'low'; userId: string; date: string; title: string; details?: string }> = [];
    const MIN_REST_MIN = 11 * 60;

    for (const [uid, list] of byUser.entries()) {
      const sorted = [...list].sort((a, b) => {
        const da = String(a.slotDate).localeCompare(String(b.slotDate));
        if (da !== 0) return da;
        return (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0);
      });

      // Overlaps same day
      const byDay = new Map<string, PlanningSlot[]>();
      for (const s of sorted) {
        const arr = byDay.get(s.slotDate) || [];
        arr.push(s);
        byDay.set(s.slotDate, arr);
      }
      for (const [day, daySlots] of byDay.entries()) {
        const ds = [...daySlots].sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0));
        for (let i = 1; i < ds.length; i++) {
          const prev = ds[i - 1];
          const cur = ds[i];
          const prevEnd = timeToMinutes(prev.endTime) ?? 0;
          const curStart = timeToMinutes(cur.startTime) ?? 0;
          if (curStart < prevEnd) {
            out.push({
              id: `overlap:${uid}:${day}:${prev.id}:${cur.id}`,
              severity: 'high',
              userId: uid,
              date: day,
              title: isFr ? 'Chevauchement' : 'Overlap',
              details: isFr ? 'Deux créneaux se chevauchent.' : 'Two slots overlap.',
            });
          }
        }
      }

      // Rest between days (very lightweight heuristic)
      for (let i = 1; i < sorted.length; i++) {
        const a = sorted[i - 1];
        const b = sorted[i];
        if (!a.endTime || !b.startTime) continue;
        const aDay = a.slotDate;
        const bDay = b.slotDate;
        if (aDay === bDay) continue;
        const dayGap = Math.round((new Date(bDay + 'T12:00:00').getTime() - new Date(aDay + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));
        if (dayGap !== 1) continue;
        const restMin = (24 * 60 - (timeToMinutes(a.endTime) ?? 0)) + (timeToMinutes(b.startTime) ?? 0);
        if (restMin < MIN_REST_MIN) {
          out.push({
            id: `rest:${uid}:${aDay}:${bDay}:${a.id}:${b.id}`,
            severity: 'medium',
            userId: uid,
            date: bDay,
            title: isFr ? 'Repos insuffisant' : 'Insufficient rest',
            details: isFr ? `Repos ~${Math.max(0, restMin)} min (min 660).` : `Rest ~${Math.max(0, restMin)} min (min 660).`,
          });
        }
      }
    }
    return out;
  };

  const loadHub = async () => {
    if (!user?.id) return;
    setHubLoading(true);
    try {
      const from = ymdFromDate(teamDateFrom);
      const to = ymdFromDate(teamDateTo);
      const [slots, open, swaps, leaves, presence, notif] = await Promise.all([
        DataAdapter.getPlanningSlots({ dateFrom: from, dateTo: to, userIds: timelineUserIds.length ? timelineUserIds : [String(user.id)] }),
        DataAdapter.getOpenShifts({ dateFrom: from, dateTo: to, status: 'open' }),
        DataAdapter.getSwapRequests({ status: 'pending', dateFrom: from, dateTo: to }),
        DataAdapter.getLeaveRequests(),
        DataService.getPresenceSessions({ organizationId: (await OrganizationService.getCurrentUserOrganizationId()) || undefined, from, to }),
        DataService.getNotifications(String(user.id)),
      ]);
      const leavePending = Array.isArray(leaves) ? leaves.filter((r: any) => String(r.status || '').toLowerCase() === 'pending').length : 0;
      const activePresence = Array.isArray(presence?.data) ? presence.data.filter((s: any) => !s.endedAt && String(s.status || '').toLowerCase() !== 'closed').length : 0;
      const unread = Array.isArray(notif?.data) ? notif.data.filter((n: any) => !n.read).length : 0;
      setHubMetrics({
        slotsThisWeek: slots.length,
        openShifts: open.length,
        swapPending: swaps.length,
        leavesPending: leavePending,
        activePresence,
        unreadNotifications: unread,
      });
    } finally {
      setHubLoading(false);
    }
  };

  const loadTeamBoard = async () => {
    if (!user?.id) return;
    setTeamLoading(true);
    try {
      const from = ymdFromDate(teamDateFrom);
      const to = ymdFromDate(teamDateTo);
      const ids = timelineUserIds.length ? timelineUserIds : [String(user.id)];
      const slots = await DataAdapter.getPlanningSlots({ dateFrom: from, dateTo: to, userIds: ids });
      setTeamSlots(slots);
    } finally {
      setTeamLoading(false);
    }
  };

  const loadMarketplace = async () => {
    if (!user?.id) return;
    setMarketLoading(true);
    try {
      const from = ymdFromDate(teamDateFrom);
      const to = ymdFromDate(teamDateTo);
      const [open, swaps] = await Promise.all([
        DataAdapter.getOpenShifts({ dateFrom: from, dateTo: to, status: 'open' }),
        DataAdapter.getSwapRequests({ dateFrom: from, dateTo: to }),
      ]);
      setOpenShifts(open);
      setSwapRequests(swaps);
    } finally {
      setMarketLoading(false);
    }
  };

  const loadConflicts = async () => {
    setConflictsLoading(true);
    try {
      // Conflits calculés à partir des slots réels de la semaine (API slots)
      const from = ymdFromDate(teamDateFrom);
      const to = ymdFromDate(teamDateTo);
      const ids = timelineUserIds.length ? timelineUserIds : user?.id ? [String(user.id)] : [];
      const slots = await DataAdapter.getPlanningSlots({ dateFrom: from, dateTo: to, userIds: ids });
      setConflicts(computeConflictsFromSlots(slots));
    } finally {
      setConflictsLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    setNotifLoading(true);
    try {
      const res = await DataService.getNotifications(String(user.id));
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (navTab === 'hub') void loadHub();
    if (navTab === 'team_board') void loadTeamBoard();
    if (navTab === 'marketplace') void loadMarketplace();
    if (navTab === 'conflicts') void loadConflicts();
    if (navTab === 'notifications') void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTab, teamWeekAnchor, language]);

  const placeholderCard = (title: string, body: string, actions?: React.ReactNode) => (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h3>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );

  const scheduleToolbar = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${viewMode === 'week' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            onClick={() => setViewMode('week')}
          >
            {isFr ? 'Semaine' : 'Week'}
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${viewMode === 'timeline' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            onClick={() => setViewMode('timeline')}
          >
            {isFr ? `Timeline${isOrgScopePlanner ? ' (équipe)' : ''}` : `Timeline${isOrgScopePlanner ? ' (team)' : ''}`}
          </button>
        </div>
        {viewMode === 'timeline' && !isOrgScopePlanner && (
          <span className="text-xs text-slate-500">
            {isFr
              ? 'Vue jour : colonne « Moi » uniquement (manager : jusqu’à 8 personnes).'
              : 'Day view: “Me” column only (manager: up to 8 people).'}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium inline-flex items-center gap-2 text-slate-700"
        >
          <i className="fas fa-print" />
          {isFr ? 'Imprimer' : 'Print'}
        </button>
        <button
          type="button"
          onClick={openNew}
          className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium inline-flex items-center gap-2"
        >
          <i className="fas fa-plus" />
          {isFr ? 'Créneau' : 'Slot'}
        </button>
      </div>
    </div>
  );

  const scheduleBody = (
    <>
      {scheduleToolbar}

      {viewMode === 'week' && (
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={prevWeek} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <i className="fas fa-chevron-left" />
        </button>
        <span className="font-semibold text-slate-800 min-w-[280px] text-center">
          {isFr ? 'Semaine du' : 'Week of'} {weekLabel}
        </span>
        <button type="button" onClick={nextWeek} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <i className="fas fa-chevron-right" />
        </button>
        <button type="button" onClick={goToday} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
          {isFr ? 'Aujourd’hui' : 'Today'}
        </button>
      </div>
      )}

      {viewMode === 'timeline' && (
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button type="button" onClick={prevTimelineDay} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <i className="fas fa-chevron-left" />
        </button>
        <input
          type="date"
          value={timelineYmd}
          onChange={(e) => setTimelineDay(new Date(e.target.value + 'T12:00:00'))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button type="button" onClick={nextTimelineDay} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <i className="fas fa-chevron-right" />
        </button>
        <button type="button" onClick={goTimelineToday} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
          {isFr ? 'Aujourd’hui' : 'Today'}
        </button>
      </div>
      )}

      {loading ? (
        <p className="text-slate-500">{isFr ? 'Chargement des créneaux…' : 'Loading slots…'}</p>
      ) : viewMode === 'timeline' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {(timelineUserIds.length ? timelineUserIds : user?.id ? [String(user.id)] : []).map((colUid) => (
              <div key={colUid} className="w-40 sm:w-48 flex-shrink-0 border border-slate-200 rounded-xl bg-white overflow-hidden">
                <div className="px-2 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800 truncate" title={timelineLabels[colUid]}>
                  {timelineLabels[colUid] || colUid.slice(0, 8)}
                </div>
                <div className="relative h-[420px] bg-white">
                  {Array.from({ length: 13 }, (_, i) => 7 + i).map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100 text-[10px] text-slate-400 pl-1 pointer-events-none"
                      style={{ top: `${((h * 60 - DAY_START_MIN) / DAY_RANGE_MIN) * 100}%` }}
                    >
                      {h}h
                    </div>
                  ))}
                  {slots
                    .filter((s) => s.userId === colUid && s.slotDate === timelineYmd)
                    .map((slot) => {
                      const sm = timeToMinutes(slot.startTime) ?? 9 * 60;
                      const em = timeToMinutes(slot.endTime) ?? sm + 60;
                      const top = Math.max(0, ((sm - DAY_START_MIN) / DAY_RANGE_MIN) * 100);
                      const hPct = Math.max(3, ((em - sm) / DAY_RANGE_MIN) * 100);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => openEdit(slot)}
                          className="absolute left-1 right-1 rounded-md px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm border border-slate-200 bg-emerald-50 text-emerald-900 overflow-hidden hover:bg-emerald-100"
                          style={{ top: `${top}%`, height: `${hPct}%` }}
                          title={slot.title || SLOT_TYPE_LABELS[slot.slotType]}
                        >
                          <i className={`${SLOT_TYPE_ICONS[slot.slotType]} mr-0.5`} />
                          {SLOT_TYPE_LABELS[slot.slotType]}
                          {slot.title ? ` · ${slot.title}` : ''}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {weekDays.map((day) => (
            <div key={day} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 font-medium text-slate-800">
                {new Date(day + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
              <div className="p-4 space-y-2">
                {(slotsByDay[day] || []).length === 0 ? (
                  <p className="text-sm text-slate-500">{isFr ? 'Aucun créneau' : 'No slots'}</p>
                ) : (
                  (slotsByDay[day] || []).map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 bg-slate-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-lg ${slot.slotType === 'telework' ? 'bg-blue-100 text-blue-700' : slot.slotType === 'leave' ? 'bg-amber-100 text-amber-700' : slot.slotType === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          <i className={SLOT_TYPE_ICONS[slot.slotType]} />
                        </span>
                        <div>
                          <span className="font-medium text-slate-900">{SLOT_TYPE_LABELS[slot.slotType]}</span>
                          {slot.title && <span className="text-slate-600 ml-2">– {slot.title}</span>}
                          <div className="text-xs text-slate-500 mt-0.5">
                            {(slot.startTime || '').slice(0, 5)} – {(slot.endTime || '').slice(0, 5)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(slot)} className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg">
                          <i className="fas fa-edit" />
                        </button>
                        <button type="button" onClick={() => setDeleteSlotId(slot.id)} className="p-2 text-slate-500 hover:text-red-600 rounded-lg">
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {meetings.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-slate-200 font-medium text-slate-800">
            <i className="fas fa-video mr-2" />
            {isFr ? 'Réunions à venir' : 'Upcoming meetings'}
          </div>
          <ul className="divide-y divide-slate-200">
            {meetings.slice(0, 5).map((m) => (
              <li key={m.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{m.title}</span>
                  <span className="text-sm text-slate-500 ml-2">
                    {new Date(m.startTime).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {setView && (
                  <button type="button" onClick={() => setView('time_tracking')} className="text-sm text-emerald-600 hover:underline">
                    {isFr ? 'Voir dans Suivi du temps' : 'Open in Time tracking'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const hubCards: { tab: PlanningNavTab; titleFr: string; titleEn: string; descFr: string; descEn: string; icon: string }[] = [
    {
      tab: 'my_schedule',
      titleFr: 'Mon planning',
      titleEn: 'My schedule',
      descFr: 'Semaine, timeline, créneaux personnels.',
      descEn: 'Week view, timeline, personal slots.',
      icon: 'fas fa-calendar-week',
    },
    {
      tab: 'team_board',
      titleFr: 'Équipe & planning',
      titleEn: 'Team & schedule',
      descFr: 'Fiches salariés RH + grille des créneaux (droits selon rôle).',
      descEn: 'HR employee records + slot grid (role-based).',
      icon: 'fas fa-users-cog',
    },
    {
      tab: 'attendance',
      titleFr: 'Présence & pointage',
      titleEn: 'Attendance',
      descFr: 'Pointages, anomalies, validation superviseur.',
      descEn: 'Punches, exceptions, supervisor approval.',
      icon: 'fas fa-user-clock',
    },
    {
      tab: 'leave',
      titleFr: 'Absences',
      titleEn: 'Leave',
      descFr: 'Demandes, soldes, impact planning.',
      descEn: 'Requests, balances, schedule impact.',
      icon: 'fas fa-umbrella-beach',
    },
    {
      tab: 'postes',
      titleFr: 'Postes',
      titleEn: 'Positions',
      descFr: 'Référentiel RH + catalogue de postes suggérés.',
      descEn: 'HR directory + suggested job titles.',
      icon: 'fas fa-id-badge',
    },
    {
      tab: 'marketplace',
      titleFr: 'Shifts ouverts',
      titleEn: 'Open shifts',
      descFr: 'Échanges, prise de shift, file d’attente.',
      descEn: 'Swaps, take shift, queue.',
      icon: 'fas fa-people-arrows',
    },
    {
      tab: 'conflicts',
      titleFr: 'Conflits & conformité',
      titleEn: 'Conflicts',
      descFr: 'Repos, heures max, chevauchements.',
      descEn: 'Rest rules, max hours, overlaps.',
      icon: 'fas fa-exclamation-triangle',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto min-h-0 text-slate-900 pb-8">
      <header className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white text-sm">
                <i className="fas fa-calendar-alt" />
              </span>
              {isFr ? 'Planning & workforce' : 'Scheduling & workforce'}
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              {isFr
                ? 'Coquille type WFM : pilotage, planning personnel, puis modules présence, congés et marketplace — alignée sur la navigation SaaS du reste de l’app.'
                : 'WFM-style shell: command center, personal schedule, then attendance, leave and marketplace — aligned with the app’s SaaS navigation.'}
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 mt-4 border-t border-slate-100 pt-4" aria-label={isFr ? 'Sections planning' : 'Planning sections'}>
          {visibleNavTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setNavTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                navTab === t.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <i className={t.icon} />
              {isFr ? t.labelFr : t.labelEn}
            </button>
          ))}
        </nav>
      </header>

      <div className="mt-6 space-y-6">
        {navTab === 'hub' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hubCards
              .filter((c) => {
                if (c.tab === 'attendance') return canReadRh;
                if (c.tab === 'leave') return canReadLeave;
                if (c.tab === 'postes') return canReadPostes;
                return true;
              })
              .map((c) => (
              <button
                key={c.tab}
                type="button"
                onClick={() => setNavTab(c.tab)}
                className="text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <i className={c.icon} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{isFr ? c.titleFr : c.titleEn}</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{isFr ? c.descFr : c.descEn}</p>
                  </div>
                </div>
              </button>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      {isFr ? 'Pilotage (données réelles)' : 'Command center (real data)'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      {isFr
                        ? 'KPIs calculés depuis Supabase : créneaux, open shifts, swaps, congés, présence, notifications.'
                        : 'KPIs from Supabase: slots, open shifts, swaps, leave, presence, notifications.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadHub}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    disabled={hubLoading}
                  >
                    <i className={`fas fa-sync mr-2 ${hubLoading ? 'animate-spin' : ''}`} />
                    {isFr ? 'Rafraîchir' : 'Refresh'}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  {[
                    { k: 'slots', labelFr: 'Créneaux semaine', labelEn: 'Week slots', v: hubMetrics?.slotsThisWeek ?? '—', icon: 'fas fa-calendar-check' },
                    { k: 'open', labelFr: 'Open shifts', labelEn: 'Open shifts', v: hubMetrics?.openShifts ?? '—', icon: 'fas fa-bolt' },
                    { k: 'swap', labelFr: 'Swaps en attente', labelEn: 'Pending swaps', v: hubMetrics?.swapPending ?? '—', icon: 'fas fa-people-arrows' },
                    { k: 'leave', labelFr: 'Congés pending', labelEn: 'Pending leave', v: hubMetrics?.leavesPending ?? '—', icon: 'fas fa-umbrella-beach' },
                    { k: 'presence', labelFr: 'Présence active', labelEn: 'Active presence', v: hubMetrics?.activePresence ?? '—', icon: 'fas fa-user-clock' },
                    { k: 'notif', labelFr: 'Non lues', labelEn: 'Unread', v: hubMetrics?.unreadNotifications ?? '—', icon: 'fas fa-bell' },
                  ].map((m) => (
                    <div key={m.k} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">{isFr ? m.labelFr : m.labelEn}</span>
                        <i className={`${m.icon} text-slate-400`} />
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{hubLoading ? '…' : m.v}</div>
                    </div>
                  ))}
                </div>

                {setView && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setView('time_tracking')}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      {isFr ? 'Suivi du temps' : 'Time tracking'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('rh')}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      {isFr ? 'Ressources humaines' : 'Human resources'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {navTab === 'my_schedule' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">{scheduleBody}</div>
        )}

        {navTab === 'team_board' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {canReadRh ? (
                  <button
                    type="button"
                    onClick={() => setTeamBoardSub('rh')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      teamBoardSub === 'rh' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fas fa-address-book mr-2" />
                    {isFr ? 'Équipe RH (salariés)' : 'HR team (employees)'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTeamBoardSub('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    teamBoardSub === 'grid' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <i className="fas fa-border-all mr-2" />
                  {isFr ? 'Grille créneaux' : 'Slot grid'}
                </button>
                {!canReadRh ? (
                  <span className="text-xs text-amber-700">
                    {isFr ? 'Lecture RH requise pour les fiches salariés (module rh).' : 'RH read access required for employee records (rh module).'}
                  </span>
                ) : null}
              </div>

              {teamBoardSub === 'rh' && canReadRh && rh && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                  <RhModule
                    embedded
                    planningEmbedTab="salaries"
                    leaveRequests={rh.leaveRequests}
                    users={rh.users}
                    jobs={rh.jobs}
                    setJobs={rh.setJobs}
                    setView={(v) => setView?.(v)}
                    onAddLeaveRequest={rh.onAddLeaveRequest}
                    onUpdateLeaveRequest={rh.onUpdateLeaveRequest}
                    onUpdateLeaveDates={rh.onUpdateLeaveDates}
                    onDeleteLeaveRequest={rh.onDeleteLeaveRequest}
                    isLoading={rh.isLoading}
                    loadingOperation={rh.loadingOperation ?? null}
                  />
                </div>
              )}
              {teamBoardSub === 'rh' && canReadRh && !rh && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {isFr
                    ? 'Les données RH ne sont pas branchées sur ce planning. Ouvrez le module RH depuis le menu.'
                    : 'HR data is not wired to Planning from the app shell. Open HR from the menu.'}
                  {setView ? (
                    <button type="button" className="ml-2 underline font-semibold" onClick={() => setView('rh')}>
                      RH
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {teamBoardSub === 'grid' && (
            <div>
            <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  {isFr ? 'Grille planning équipe' : 'Team schedule grid'}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {isFr ? 'Drag & drop des créneaux (API planning_slots).' : 'Drag & drop slots (planning_slots API).'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeamWeekAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <i className="fas fa-chevron-left mr-2" />
                  {isFr ? 'Semaine -1' : 'Prev'}
                </button>
                <button
                  type="button"
                  onClick={() => setTeamWeekAnchor(new Date())}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {isFr ? 'Cette semaine' : 'This week'}
                </button>
                <button
                  type="button"
                  onClick={() => setTeamWeekAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {isFr ? 'Semaine +1' : 'Next'}
                  <i className="fas fa-chevron-right ml-2" />
                </button>
                <button
                  type="button"
                  onClick={loadTeamBoard}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                  disabled={teamLoading}
                >
                  <i className={`fas fa-sync mr-2 ${teamLoading ? 'animate-spin' : ''}`} />
                  {isFr ? 'Charger' : 'Load'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
              {/* Left: team roster */}
              <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 p-4 md:p-5 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{isFr ? 'Équipe' : 'Team'}</h3>
                  <span className="text-xs text-slate-500">
                    {(timelineUserIds.length ? timelineUserIds : user?.id ? [String(user.id)] : []).length} {isFr ? 'membres' : 'members'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-3 text-slate-400 text-sm" />
                    <input
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      placeholder={isFr ? 'Rechercher…' : 'Search…'}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2 max-h-[520px] overflow-auto pr-1">
                  {(timelineUserIds.length ? timelineUserIds : user?.id ? [String(user.id)] : [])
                    .filter((uid) => {
                      if (!teamFilter.trim()) return true;
                      const label = (timelineLabels[uid] || uid).toLowerCase();
                      return label.includes(teamFilter.trim().toLowerCase());
                    })
                    .map((uid) => (
                      <div key={uid} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{timelineLabels[uid] || uid.slice(0, 8)}</div>
                            <div className="text-xs text-slate-500 truncate">{uid}</div>
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            {teamSlots.filter((s) => String(s.userId) === uid).length}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-4 text-xs text-slate-500 leading-relaxed">
                  {isFr
                    ? 'Astuce : glissez un créneau sur une autre cellule (jour/agent) pour le replanifier.'
                    : 'Tip: drag a slot to another cell (day/user) to reschedule.'}
                </div>
              </aside>

              {/* Center: grid */}
              <section className="overflow-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[260px_repeat(7,1fr)] sticky top-0 bg-white z-10 border-b border-slate-100">
                    <div className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide bg-white">
                      {isFr ? 'Employés' : 'Employees'}
                    </div>
                    {teamWeekDays.map((d) => (
                      <div key={d} className="px-3 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide border-l border-slate-100 bg-white">
                        {new Date(d + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}
                      </div>
                    ))}
                  </div>

                  {(timelineUserIds.length ? timelineUserIds : user?.id ? [String(user.id)] : [])
                    .filter((uid) => {
                      if (!teamFilter.trim()) return true;
                      const label = (timelineLabels[uid] || uid).toLowerCase();
                      return label.includes(teamFilter.trim().toLowerCase());
                    })
                    .map((uid) => {
                      const userSlots = teamSlots.filter((s) => String(s.userId) === uid);
                      return (
                        <div key={uid} className="grid grid-cols-[260px_repeat(7,1fr)] border-b border-slate-100">
                          <div className="px-4 py-3 bg-slate-50/60">
                            <div className="text-sm font-semibold text-slate-900 truncate">{timelineLabels[uid] || uid.slice(0, 8)}</div>
                            <div className="text-xs text-slate-500 truncate">{isFr ? 'Créneaux' : 'Slots'}: {userSlots.length}</div>
                          </div>
                          {teamWeekDays.map((d) => {
                            const daySlots = userSlots.filter((s) => s.slotDate === d);
                            return (
                              <div
                                key={d}
                                className="border-l border-slate-100 px-2 py-2 min-h-[72px] bg-white"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  const payload = dragPayloadRef.current;
                                  if (!payload?.slotId) return;
                                  const slot = teamSlots.find((s) => String(s.id) === String(payload.slotId));
                                  if (!slot) return;
                                  const updated = await DataAdapter.updatePlanningSlot(String(slot.id), { userId: uid, slotDate: d });
                                  if (!updated) return;
                                  setTeamSlots((prev) => prev.map((s) => (String(s.id) === String(updated.id) ? updated : s)));
                                }}
                              >
                                <div className="flex flex-col gap-2">
                                  {daySlots.map((s) => (
                                    <div
                                      key={s.id}
                                      draggable
                                      onDragStart={() => {
                                        dragPayloadRef.current = { slotId: String(s.id) };
                                      }}
                                      onClick={() => openEdit(s)}
                                      className="group cursor-pointer rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 shadow-sm"
                                      title={s.title || SLOT_TYPE_LABELS[s.slotType]}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold text-slate-900 truncate">
                                            <i className={`${SLOT_TYPE_ICONS[s.slotType]} mr-1 text-slate-500`} />
                                            {SLOT_TYPE_LABELS[s.slotType]}
                                          </div>
                                          <div className="text-[11px] text-slate-600 truncate">
                                            {(s.startTime || '').slice(0, 5)}–{(s.endTime || '').slice(0, 5)}{s.title ? ` · ${s.title}` : ''}
                                          </div>
                                        </div>
                                        <i className="fas fa-grip-vertical text-slate-300 group-hover:text-slate-400" />
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForm((f) => ({
                                        ...f,
                                        slotDate: d,
                                      }));
                                      setModalSlot('new');
                                    }}
                                    className="text-left rounded-lg border border-dashed border-slate-200 hover:border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                                  >
                                    <i className="fas fa-plus mr-2" />
                                    {isFr ? 'Ajouter' : 'Add'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                </div>
              </section>
            </div>
            </div>
            )}
          </div>
        )}

        {navTab === 'attendance' && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
            {!rh ? (
              <div className="text-sm text-amber-800">
                {isFr
                  ? 'Données RH non connectées à ce composant. Utilisez le menu « Ressources humaines » ou le suivi du temps.'
                  : 'HR data is not wired here. Use Human resources from the menu or Time tracking.'}
              </div>
            ) : (
              <RhModule
                embedded
                planningEmbedTab="presence"
                leaveRequests={rh.leaveRequests}
                users={rh.users}
                jobs={rh.jobs}
                setJobs={rh.setJobs}
                setView={(v) => setView?.(v)}
                onAddLeaveRequest={rh.onAddLeaveRequest}
                onUpdateLeaveRequest={rh.onUpdateLeaveRequest}
                onUpdateLeaveDates={rh.onUpdateLeaveDates}
                onDeleteLeaveRequest={rh.onDeleteLeaveRequest}
                isLoading={rh.isLoading}
                loadingOperation={rh.loadingOperation ?? null}
              />
            )}
            {setView ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setView('time_tracking')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  {isFr ? 'Suivi du temps (pointage)' : 'Time tracking (punch)'}
                </button>
                <button
                  type="button"
                  onClick={() => setView('rh')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  {isFr ? 'Module RH complet' : 'Full HR module'}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {navTab === 'leave' && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
            {!rh ? (
              <div className="text-sm text-amber-800">
                {isFr
                  ? 'Données congés non connectées. Ouvrez le module RH depuis le menu.'
                  : 'Leave data is not wired here. Open HR from the menu.'}
              </div>
            ) : (
              <RhModule
                embedded
                planningEmbedTab="leave"
                leaveRequests={rh.leaveRequests}
                users={rh.users}
                jobs={rh.jobs}
                setJobs={rh.setJobs}
                setView={(v) => setView?.(v)}
                onAddLeaveRequest={rh.onAddLeaveRequest}
                onUpdateLeaveRequest={rh.onUpdateLeaveRequest}
                onUpdateLeaveDates={rh.onUpdateLeaveDates}
                onDeleteLeaveRequest={rh.onDeleteLeaveRequest}
                isLoading={rh.isLoading}
                loadingOperation={rh.loadingOperation ?? null}
              />
            )}
            {setView ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setView('rh')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  {isFr ? 'Ouvrir RH (onglet congés)' : 'Open HR (leave tab)'}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {navTab === 'postes' && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
            {!rh ? (
              <div className="text-sm text-amber-800">
                {isFr ? 'Données RH non connectées.' : 'HR data is not wired here.'}
              </div>
            ) : (
              <RhModule
                embedded
                planningEmbedTab="postes"
                leaveRequests={rh.leaveRequests}
                users={rh.users}
                jobs={rh.jobs}
                setJobs={rh.setJobs}
                setView={(v) => setView?.(v)}
                onAddLeaveRequest={rh.onAddLeaveRequest}
                onUpdateLeaveRequest={rh.onUpdateLeaveRequest}
                onUpdateLeaveDates={rh.onUpdateLeaveDates}
                onDeleteLeaveRequest={rh.onDeleteLeaveRequest}
                isLoading={rh.isLoading}
                loadingOperation={rh.loadingOperation ?? null}
              />
            )}
            {setView ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setView('settings')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  {isFr ? 'Paramètres → Postes (édition)' : 'Settings → Postes (edit)'}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {navTab === 'marketplace' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{isFr ? 'Shifts & échanges (API)' : 'Swaps & open shifts (API)'}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {isFr
                    ? 'Branché sur tables optionnelles `wfm_open_shifts` et `wfm_swap_requests` (si disponibles) + planning_slots.'
                    : 'Connected to optional tables `wfm_open_shifts` and `wfm_swap_requests` (if available) + planning_slots.'}
                </p>
              </div>
              <button
                type="button"
                onClick={loadMarketplace}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                disabled={marketLoading}
              >
                <i className={`fas fa-sync mr-2 ${marketLoading ? 'animate-spin' : ''}`} />
                {isFr ? 'Rafraîchir' : 'Refresh'}
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{isFr ? 'Open shifts' : 'Open shifts'}</h3>
                  <span className="text-xs text-slate-500">{openShifts.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {marketLoading ? (
                    <div className="text-sm text-slate-500">{isFr ? 'Chargement…' : 'Loading…'}</div>
                  ) : openShifts.length === 0 ? (
                    <div className="text-sm text-slate-500">{isFr ? 'Aucun open shift.' : 'No open shifts.'}</div>
                  ) : (
                    openShifts.slice(0, 12).map((s) => (
                      <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{s.role_name || s.role || (isFr ? 'Shift' : 'Shift')}</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {String(s.slot_date || '').slice(0, 10)} · {String(s.start_time || '').slice(0, 5)}–{String(s.end_time || '').slice(0, 5)}
                              {s.location ? ` · ${s.location}` : ''}
                            </div>
                            {s.premium_percent ? (
                              <div className="inline-flex mt-2 text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                                +{s.premium_percent}%
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                            onClick={async () => {
                              if (!user?.id) return;
                              const taken = await DataAdapter.takeOpenShift(String(s.id), String(user.id));
                              if (taken) void loadMarketplace();
                            }}
                          >
                            {isFr ? 'Prendre' : 'Take'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{isFr ? 'Demandes d’échange' : 'Swap requests'}</h3>
                  <span className="text-xs text-slate-500">{swapRequests.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {marketLoading ? (
                    <div className="text-sm text-slate-500">{isFr ? 'Chargement…' : 'Loading…'}</div>
                  ) : swapRequests.length === 0 ? (
                    <div className="text-sm text-slate-500">{isFr ? 'Aucune demande.' : 'No requests.'}</div>
                  ) : (
                    swapRequests.slice(0, 12).map((r) => (
                      <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {isFr ? 'Échange' : 'Swap'} · {String(r.status || 'pending')}
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {String(r.slot_date || '').slice(0, 10)} · {String(r.start_time || '').slice(0, 5)}–{String(r.end_time || '').slice(0, 5)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                              onClick={async () => {
                                const up = await DataAdapter.updateSwapRequest(String(r.id), { status: 'rejected' });
                                if (up) void loadMarketplace();
                              }}
                            >
                              {isFr ? 'Refuser' : 'Reject'}
                            </button>
                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                              onClick={async () => {
                                const up = await DataAdapter.updateSwapRequest(String(r.id), { status: 'approved' });
                                if (up) void loadMarketplace();
                              }}
                            >
                              {isFr ? 'Approuver' : 'Approve'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {navTab === 'conflicts' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{isFr ? 'Centre de conflits' : 'Conflict center'}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {isFr
                    ? 'Basé sur les slots réels (planning_slots) + règles client (chevauchement, repos).'
                    : 'Based on real slots (planning_slots) + client rules (overlap, rest).'}
                </p>
              </div>
              <button
                type="button"
                onClick={loadConflicts}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                disabled={conflictsLoading}
              >
                <i className={`fas fa-sync mr-2 ${conflictsLoading ? 'animate-spin' : ''}`} />
                {isFr ? 'Rafraîchir' : 'Refresh'}
              </button>
            </div>

            <div className="mt-4">
              {conflictsLoading ? (
                <div className="text-sm text-slate-500">{isFr ? 'Chargement…' : 'Loading…'}</div>
              ) : conflicts.length === 0 ? (
                <div className="text-sm text-slate-500">{isFr ? 'Aucun conflit détecté.' : 'No conflicts detected.'}</div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {conflicts.slice(0, 40).map((c) => (
                    <div key={c.id} className="p-3 bg-white flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                              c.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : c.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.severity.toUpperCase()}
                          </span>
                          <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 truncate">
                          {timelineLabels[c.userId] || c.userId.slice(0, 8)} · {c.date}
                          {c.details ? ` · ${c.details}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                        onClick={() => setNavTab('team_board')}
                      >
                        {isFr ? 'Voir' : 'View'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {navTab === 'notifications' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{isFr ? 'Notifications (API)' : 'Notifications (API)'}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {isFr
                    ? 'Branché sur la table `notifications` (RLS tolérée : retour vide si accès refusé).'
                    : 'Connected to `notifications` table (RLS tolerant: empty list if denied).'}
                </p>
              </div>
              <button
                type="button"
                onClick={loadNotifications}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
                disabled={notifLoading}
              >
                <i className={`fas fa-sync mr-2 ${notifLoading ? 'animate-spin' : ''}`} />
                {isFr ? 'Rafraîchir' : 'Refresh'}
              </button>
            </div>

            <div className="mt-4">
              {notifLoading ? (
                <div className="text-sm text-slate-500">{isFr ? 'Chargement…' : 'Loading…'}</div>
              ) : notifications.length === 0 ? (
                <div className="text-sm text-slate-500">{isFr ? 'Aucune notification.' : 'No notifications.'}</div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {notifications.slice(0, 40).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={async () => {
                        if (!n.read) await DataService.markNotificationAsRead(String(n.id));
                        void loadNotifications();
                      }}
                      className={`w-full text-left p-3 flex items-start gap-3 hover:bg-slate-50 ${n.read ? 'bg-white' : 'bg-amber-50/40'}`}
                    >
                      <span className={`mt-1 inline-flex h-2 w-2 rounded-full ${n.read ? 'bg-slate-300' : 'bg-amber-500'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{n.title || (isFr ? 'Notification' : 'Notification')}</div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {n.created_at ? new Date(n.created_at).toLocaleString(locale) : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalSlot !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b font-semibold">
              {modalSlot === 'new'
                ? isFr
                  ? 'Nouveau créneau'
                  : 'New slot'
                : isFr
                  ? 'Modifier le créneau'
                  : 'Edit slot'}
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Date' : 'Date'}</label>
                <input
                  type="date"
                  value={form.slotDate}
                  onChange={(e) => setForm((f) => ({ ...f, slotDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Type' : 'Type'}</label>
                <select
                  value={form.slotType}
                  onChange={(e) => setForm((f) => ({ ...f, slotType: e.target.value as PlanningSlotType }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                >
                  {(Object.keys(SLOT_TYPE_LABELS) as PlanningSlotType[]).map((k) => (
                    <option key={k} value={k}>
                      {SLOT_TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Début' : 'Start'}</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Fin' : 'End'}</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isFr ? 'Titre (optionnel)' : 'Title (optional)'}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={isFr ? 'Ex. Réunion équipe' : 'e.g. Team meeting'}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isFr ? 'Notes (optionnel)' : 'Notes (optional)'}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setModalSlot(null)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button type="button" onClick={saveSlot} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                {isFr ? 'Enregistrer' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSlotId && (
        <ConfirmationModal
          title={isFr ? 'Supprimer le créneau' : 'Delete slot'}
          message={isFr ? 'Êtes-vous sûr de vouloir supprimer ce créneau ?' : 'Are you sure you want to delete this slot?'}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteSlotId(null)}
        />
      )}
    </div>
  );
};

export default Planning;
