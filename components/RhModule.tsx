import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { LeaveRequest, User, Job, Employee, HrAbsenceEvent, HrAttendancePolicy, PresenceSession, PresenceStatus, PresenceStatusEvent } from '../types';
import DataAdapter from '../services/dataAdapter';
import OrganizationService from '../services/organizationService';
import LeaveManagement from './LeaveManagement';
import LeaveManagementAdmin from './LeaveManagementAdmin';
import EmployeeProfile from './EmployeeProfile';
import TalentAnalytics from './TalentAnalytics';
import PostesListReadOnly from './PostesListReadOnly';
import OrganigrammeView from './OrganigrammeView';
import PayrollTab from './PayrollTab';
import SalariésList from './SalariésList';
import Jobs from './Jobs';
import * as hrAnalyticsService from '../services/hrAnalyticsService';
import { usePresence } from '../contexts/PresenceContext';
import { DataService } from '../services/dataService';

export type RhTab = 'salaries' | 'presence' | 'leave' | 'demandes' | 'employee' | 'postes' | 'organigramme' | 'payroll' | 'formation' | 'talent' | 'jobs' | 'planning';

interface RhModuleProps {
  leaveRequests: LeaveRequest[];
  users: User[];
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setView: (view: string) => void;
  onAddLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateLeaveRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onUpdateLeaveDates?: (id: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onDeleteLeaveRequest: (id: string) => Promise<void>;
  isLoading?: boolean;
  loadingOperation?: string | null;
}

const SLA_DAYS_WARNING = 2;

type PresenceLiveRow = {
  profileId: string;
  displayName: string;
  currentStatus: PresenceStatus | 'absent';
  lastConnectionAt: string | null;
  todayMinutes: number;
  currentHourMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  dayRate: number;
};

function overlapMinutes(session: PresenceSession, rangeStartMs: number, rangeEndMs: number): number {
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const overlapStart = Math.max(start, rangeStartMs);
  const overlapEnd = Math.min(end, rangeEndMs);
  if (overlapEnd <= overlapStart) return 0;
  return Math.round((overlapEnd - overlapStart) / 60000);
}

const RhModule: React.FC<RhModuleProps> = ({
  leaveRequests,
  users,
  jobs,
  setJobs,
  setView,
  onAddLeaveRequest,
  onUpdateLeaveRequest,
  onUpdateLeaveDates,
  onDeleteLeaveRequest,
  isLoading,
  loadingOperation
}) => {
  const { t, language } = useLocalization();
  const { canAccessModule, hasPermission } = useModulePermissions();
  const [activeTab, setActiveTab] = useState<RhTab>('salaries');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { currentSession } = usePresence();
  const [presencePeriod, setPresencePeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [presenceMetrics, setPresenceMetrics] = useState<ReturnType<typeof hrAnalyticsService.computePresenceMetrics>>([]);
  const [absenceEvents, setAbsenceEvents] = useState<HrAbsenceEvent[]>([]);
  const [absenceProfileId, setAbsenceProfileId] = useState('');
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [absenceDuration, setAbsenceDuration] = useState('480');
  const [absenceAuthorized, setAbsenceAuthorized] = useState(true);
  const [absenceReason, setAbsenceReason] = useState('');
  const [policy, setPolicy] = useState<HrAttendancePolicy | null>(null);
  const [policySaving, setPolicySaving] = useState(false);
  const [userIdByProfile, setUserIdByProfile] = useState<Record<string, string>>({});
  const [complianceRows, setComplianceRows] = useState<hrAnalyticsService.PresenceComplianceMetric[]>([]);
  const [presenceSessions, setPresenceSessions] = useState<PresenceSession[]>([]);
  const [presenceStatusEvents, setPresenceStatusEvents] = useState<PresenceStatusEvent[]>([]);
  const [statusHistoryProfileFilter, setStatusHistoryProfileFilter] = useState<string>('all');
  const fr = language === 'fr';

  const loadEmployees = useCallback(async () => {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    const list = await DataAdapter.listEmployees(orgId ?? undefined);
    setEmployees(list ?? []);
  }, []);
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const loadPresenceAndAbsences = useCallback(async () => {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return;
    const [sessions, absences, loadedPolicy, profileRows, statusEvents] = await Promise.all([
      DataAdapter.getPresenceSessions({ organizationId: orgId }),
      hrAnalyticsService.listHrAbsenceEvents(orgId),
      DataAdapter.getHrAttendancePolicy(orgId),
      DataService.getProfiles(),
      DataAdapter.listPresenceStatusEvents({ organizationId: orgId }),
    ]);
    const profileMap = (profileRows.data || []).reduce<Record<string, string>>((acc, row: any) => {
      if (row?.id && row?.user_id) acc[String(row.id)] = String(row.user_id);
      return acc;
    }, {});
    setUserIdByProfile(profileMap);
    setPresenceSessions(sessions || []);
    setPresenceStatusEvents(statusEvents || []);
    const metrics = hrAnalyticsService.computePresenceMetrics({
      sessions: sessions || [],
      profileIds: employees.map((e) => e.profileId),
      period: presencePeriod,
      userIdByProfile: profileMap,
    });
    setPresenceMetrics(metrics);
    setPolicy(loadedPolicy);
    setAbsenceEvents(absences);
    const bounds = hrAnalyticsService.getPayrollPeriodBounds(new Date(), loadedPolicy?.payrollPeriodStartDay ?? 1);
    const compliance = hrAnalyticsService.computePresenceCompliance({
      employees,
      sessions: sessions || [],
      statusEvents: statusEvents || [],
      absences,
      policy: loadedPolicy,
      userIdByProfile: profileMap,
      periodStart: bounds.start.toISOString().slice(0, 10),
      periodEnd: bounds.end.toISOString().slice(0, 10),
    });
    setComplianceRows(compliance);
  }, [employees, presencePeriod]);

  const livePresenceRows = useMemo<PresenceLiveRow[]>(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
    const expectedDailyMinutes = Math.max(1, policy?.expectedDailyMinutes ?? 480);

    return employees.map((employee) => {
      const profileId = String(employee.profileId);
      const authUserId = userIdByProfile[profileId] || profileId;
      const sessions = presenceSessions
        .filter((s) => String(s.userId) === authUserId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const active = sessions.find((s) => !s.endedAt);
      const latest = sessions[0];
      const linkedUser = users.find((u) => String((u as any).profileId || '') === profileId);
      const displayName = linkedUser?.fullName || linkedUser?.name || linkedUser?.email || profileId.slice(0, 8);

      const todayMinutes = sessions.reduce((acc, s) => acc + overlapMinutes(s, startOfDay, nowMs), 0);
      const currentHourMinutes = sessions.reduce((acc, s) => acc + overlapMinutes(s, startOfHour, nowMs), 0);
      const weekMinutes = sessions.reduce((acc, s) => acc + overlapMinutes(s, startOfWeek, nowMs), 0);
      const monthMinutes = sessions.reduce((acc, s) => acc + overlapMinutes(s, startOfMonth, nowMs), 0);
      const dayRate = Math.min(100, (todayMinutes / expectedDailyMinutes) * 100);

      return {
        profileId,
        displayName,
        currentStatus: (active?.status || 'absent') as PresenceStatus | 'absent',
        lastConnectionAt: latest?.startedAt || null,
        todayMinutes,
        currentHourMinutes,
        weekMinutes,
        monthMinutes,
        dayRate,
      };
    });
  }, [employees, presenceSessions, userIdByProfile, policy?.expectedDailyMinutes, users]);

  const profileIdByUserId = useMemo(() => {
    const reverse: Record<string, string> = {};
    Object.entries(userIdByProfile).forEach(([profileId, userId]) => {
      reverse[String(userId)] = String(profileId);
    });
    return reverse;
  }, [userIdByProfile]);

  const statusHistoryRows = useMemo(() => {
    const targetProfile = statusHistoryProfileFilter === 'all' ? null : statusHistoryProfileFilter;
    const base = (presenceStatusEvents || []).map((evt) => {
      const profileId = profileIdByUserId[String(evt.userId)] || '';
      const linkedUser = users.find((u) => String((u as any).profileId || '') === profileId);
      return {
        ...evt,
        profileId,
        displayName: linkedUser?.fullName || linkedUser?.name || linkedUser?.email || profileId || String(evt.userId).slice(0, 8),
      };
    });
    const filtered = targetProfile ? base.filter((r) => r.profileId === targetProfile) : base;
    return filtered
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 120);
  }, [presenceStatusEvents, profileIdByUserId, users, statusHistoryProfileFilter]);

  const statusLabel = useCallback((status: PresenceStatus | 'absent') => {
    if (status === 'absent') return fr ? 'Absent' : 'Absent';
    if (status === 'in_meeting') return fr ? 'En réunion' : 'In meeting';
    if (status === 'pause' || status === 'pause_coffee' || status === 'pause_lunch') return fr ? 'En pause' : 'On break';
    if (status === 'brief_team') return fr ? 'Brief équipe' : 'Team brief';
    if (status === 'technical_issue') return fr ? 'Incident technique' : 'Technical issue';
    if (status === 'away_mission') return fr ? 'Mission' : 'Mission';
    return fr ? 'Présent' : 'Present';
  }, [fr]);

  const statusBadgeClass = useCallback((status: PresenceStatus | 'absent') => {
    if (status === 'absent') return 'bg-red-100 text-red-700';
    if (status === 'in_meeting' || status === 'brief_team') return 'bg-blue-100 text-blue-700';
    if (status === 'pause' || status === 'pause_coffee' || status === 'pause_lunch') return 'bg-amber-100 text-amber-700';
    if (status === 'technical_issue') return 'bg-rose-100 text-rose-700';
    if (status === 'away_mission') return 'bg-purple-100 text-purple-700';
    return 'bg-emerald-100 text-emerald-700';
  }, []);

  const formatDateTime = useCallback((iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(fr ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [fr]);

  const liveCounters = useMemo(() => {
    const present = livePresenceRows.filter((r) => ['online', 'present'].includes(r.currentStatus)).length;
    const meeting = livePresenceRows.filter((r) => ['in_meeting', 'brief_team'].includes(r.currentStatus)).length;
    const pause = livePresenceRows.filter((r) => ['pause', 'pause_coffee', 'pause_lunch'].includes(r.currentStatus)).length;
    const absent = livePresenceRows.filter((r) => r.currentStatus === 'absent').length;
    return { present, meeting, pause, absent };
  }, [livePresenceRows]);

  useEffect(() => {
    if (employees.length > 0) {
      loadPresenceAndAbsences();
    }
  }, [employees, loadPresenceAndAbsences]);

  const showSalaries = canAccessModule('rh');
  const showLeave = canAccessModule('leave_management') || canAccessModule('leave_management_admin');
  const showDemandes = showLeave || canAccessModule('rh');
  const showEmployee = canAccessModule('rh');
  const showPostes = canAccessModule('postes_management');
  const showOrganigramme = canAccessModule('organization_management');
  const showPayroll = canAccessModule('rh') && hasPermission('rh', 'read');
  const showFormation = canAccessModule('rh');
  const showTalent = canAccessModule('talent_analytics');
  const showJobs = canAccessModule('jobs');
  const showPlanning = canAccessModule('planning');

  const tabs: { id: RhTab; label: string; show: boolean }[] = [
    { id: 'salaries', label: fr ? 'Salariés' : 'Employees', show: showSalaries },
    { id: 'presence', label: fr ? 'Présence' : 'Attendance', show: showSalaries },
    { id: 'leave', label: fr ? 'Congés' : 'Leave', show: showLeave },
    { id: 'demandes', label: fr ? 'Demandes' : 'Requests', show: showDemandes },
    { id: 'employee', label: fr ? 'Fiche salarié' : 'Employee profile', show: showEmployee },
    { id: 'postes', label: fr ? 'Fiche poste' : 'Job profile', show: showPostes },
    { id: 'organigramme', label: fr ? 'Organigramme' : 'Org chart', show: showOrganigramme },
    { id: 'payroll', label: fr ? 'Paie' : 'Payroll', show: showPayroll },
    { id: 'formation', label: fr ? 'Formation' : 'Training', show: showFormation },
    { id: 'talent', label: fr ? 'Évaluations' : 'Evaluations', show: showTalent },
    { id: 'jobs', label: fr ? 'Offres d\'emploi' : 'Job offers', show: showJobs },
    { id: 'planning', label: fr ? 'Planning' : 'Planning', show: showPlanning }
  ];

  const visibleTabs = tabs.filter(tab => tab.show);
  const tabForContent = visibleTabs[0]?.id ?? 'salaries';
  const currentTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : tabForContent;

  const pendingLeaves = leaveRequests.filter(r => r.status === 'pending');
  const pendingOverSla = pendingLeaves.filter(r => {
    const created = r.createdAt ? new Date(r.createdAt).getTime() : 0;
    const days = (Date.now() - created) / (24 * 60 * 60 * 1000);
    return days >= SLA_DAYS_WARNING;
  });
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {fr ? 'Ressources humaines' : 'Human resources'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {fr ? 'Congés, fiche salarié, postes, paie et évaluations.' : 'Leave, employee profile, positions, payroll and evaluations.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 mb-6 inline-flex flex-wrap gap-1">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              currentTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label={tab.label}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab === 'salaries' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Liste des salariés' : 'Employees list'}</h2>
          </div>
          <div className="p-4">
            <SalariésList
              users={users}
              onSelectEmployee={(emp) => {
                setSelectedEmployee(emp);
                setActiveTab('employee');
              }}
            />
          </div>
        </section>
      )}

      {currentTab === 'presence' && (
        <section className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Assiduité et présence multi-périodes' : 'Multi-period attendance'}</h2>
            <div className="flex items-center gap-2">
              <select value={presencePeriod} onChange={(e) => setPresencePeriod(e.target.value as any)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="day">{fr ? 'Jour' : 'Day'}</option>
                <option value="week">{fr ? 'Semaine' : 'Week'}</option>
                <option value="month">{fr ? 'Mois' : 'Month'}</option>
                <option value="quarter">{fr ? 'Trimestre' : 'Quarter'}</option>
                <option value="year">{fr ? 'Année' : 'Year'}</option>
              </select>
              <button type="button" onClick={loadPresenceAndAbsences} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm">{fr ? 'Actualiser' : 'Refresh'}</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-md font-semibold text-slate-900">{fr ? 'Politique présence et paie' : 'Attendance and payroll policy'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                max={28}
                value={policy?.payrollPeriodStartDay ?? 1}
                onChange={(e) => setPolicy((prev) => ({ ...(prev || { id: '', organizationId: '', officeIpAllowlist: [], defaultWorkMode: 'office', enforceOfficeIp: false, expectedWorkStartTime: '09:00:00', expectedDailyMinutes: 480, monthlyDelayToleranceMinutes: 45, monthlyUnjustifiedAbsenceToleranceMinutes: 480, payrollPeriodStartDay: 1 }), payrollPeriodStartDay: Number(e.target.value || 1) }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder={fr ? 'Début mois comptable (1-28)' : 'Accounting month start (1-28)'}
              />
              <input
                type="number"
                min={0}
                value={policy?.monthlyDelayToleranceMinutes ?? 45}
                onChange={(e) => setPolicy((prev) => ({ ...(prev || { id: '', organizationId: '', officeIpAllowlist: [], defaultWorkMode: 'office', enforceOfficeIp: false, expectedWorkStartTime: '09:00:00', expectedDailyMinutes: 480, monthlyDelayToleranceMinutes: 45, monthlyUnjustifiedAbsenceToleranceMinutes: 480, payrollPeriodStartDay: 1 }), monthlyDelayToleranceMinutes: Number(e.target.value || 0) }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder={fr ? 'Tolérance retard mensuelle (min)' : 'Monthly delay tolerance (min)'}
              />
              <input
                type="number"
                min={0}
                value={policy?.monthlyUnjustifiedAbsenceToleranceMinutes ?? 480}
                onChange={(e) => setPolicy((prev) => ({ ...(prev || { id: '', organizationId: '', officeIpAllowlist: [], defaultWorkMode: 'office', enforceOfficeIp: false, expectedWorkStartTime: '09:00:00', expectedDailyMinutes: 480, monthlyDelayToleranceMinutes: 45, monthlyUnjustifiedAbsenceToleranceMinutes: 480, payrollPeriodStartDay: 1 }), monthlyUnjustifiedAbsenceToleranceMinutes: Number(e.target.value || 0) }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder={fr ? 'Tolérance absence injustifiée (min/mois)' : 'Unauthorized absence tolerance (min/month)'}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                min={60}
                value={policy?.expectedDailyMinutes ?? 480}
                onChange={(e) => setPolicy((prev) => ({ ...(prev || { id: '', organizationId: '', officeIpAllowlist: [], defaultWorkMode: 'office', enforceOfficeIp: false, expectedWorkStartTime: '09:00:00', expectedDailyMinutes: 480, monthlyDelayToleranceMinutes: 45, monthlyUnjustifiedAbsenceToleranceMinutes: 480, payrollPeriodStartDay: 1 }), expectedDailyMinutes: Number(e.target.value || 480) }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder={fr ? 'Minutes prévues/jour' : 'Expected minutes/day'}
              />
              <input
                type="time"
                value={(policy?.expectedWorkStartTime || '09:00:00').slice(0, 5)}
                onChange={(e) => setPolicy((prev) => ({ ...(prev || { id: '', organizationId: '', officeIpAllowlist: [], defaultWorkMode: 'office', enforceOfficeIp: false, expectedWorkStartTime: '09:00:00', expectedDailyMinutes: 480, monthlyDelayToleranceMinutes: 45, monthlyUnjustifiedAbsenceToleranceMinutes: 480, payrollPeriodStartDay: 1 }), expectedWorkStartTime: `${e.target.value}:00` }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-lg bg-slate-900 text-white text-sm px-3 py-2 disabled:opacity-60"
                disabled={policySaving}
                onClick={async () => {
                  const orgId = await OrganizationService.getCurrentUserOrganizationId();
                  if (!orgId || !policy) return;
                  setPolicySaving(true);
                  await DataAdapter.upsertHrAttendancePolicy({ ...policy, organizationId: orgId });
                  setPolicySaving(false);
                  await loadPresenceAndAbsences();
                }}
              >
                {policySaving ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Sauvegarder politique' : 'Save policy')}
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <input
                id="enforceIp"
                type="checkbox"
                checked={policy?.enforceOfficeIp === true}
                onChange={(e) => setPolicy((prev) => ({ ...(prev || { id: '', organizationId: '', officeIpAllowlist: [], defaultWorkMode: 'office', enforceOfficeIp: false, expectedWorkStartTime: '09:00:00', expectedDailyMinutes: 480, monthlyDelayToleranceMinutes: 45, monthlyUnjustifiedAbsenceToleranceMinutes: 480, payrollPeriodStartDay: 1 }), enforceOfficeIp: e.target.checked }))}
              />
              <label htmlFor="enforceIp">{fr ? 'Bloquer les sessions "bureau" hors IP autorisées' : 'Block "office" sessions outside allowed IPs'}</label>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs uppercase text-emerald-700">{fr ? 'Présents maintenant' : 'Present now'}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{liveCounters.present}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs uppercase text-blue-700">{fr ? 'En réunion' : 'In meeting'}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{liveCounters.meeting}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs uppercase text-amber-700">{fr ? 'En pause' : 'On break'}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{liveCounters.pause}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs uppercase text-red-700">{fr ? 'Absents' : 'Absent'}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{liveCounters.absent}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-md font-semibold text-slate-900">{fr ? 'Présence en direct par salarié' : 'Live attendance by employee'}</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">{fr ? 'Salarié' : 'Employee'}</th>
                  <th className="px-4 py-3 text-left">{fr ? 'Statut actuel' : 'Current status'}</th>
                  <th className="px-4 py-3 text-left">{fr ? 'Dernière connexion' : 'Last connection'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Cette heure' : 'This hour'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Aujourd’hui' : 'Today'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Semaine' : 'Week'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Mois' : 'Month'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Taux jour' : 'Day rate'}</th>
                </tr>
              </thead>
              <tbody>
                {livePresenceRows.map((row) => (
                  <tr key={row.profileId} className="border-b border-slate-100">
                    <td className="px-4 py-3">{row.displayName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(row.currentStatus)}`}>
                        {statusLabel(row.currentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.lastConnectionAt
                        ? new Date(row.lastConnectionAt).toLocaleString(fr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{(row.currentHourMinutes / 60).toFixed(2)} h</td>
                    <td className="px-4 py-3 text-right font-mono">{(row.todayMinutes / 60).toFixed(2)} h</td>
                    <td className="px-4 py-3 text-right font-mono">{(row.weekMinutes / 60).toFixed(2)} h</td>
                    <td className="px-4 py-3 text-right font-mono">{(row.monthMinutes / 60).toFixed(2)} h</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${row.dayRate >= 90 ? 'bg-emerald-100 text-emerald-700' : row.dayRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {row.dayRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {livePresenceRows.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{fr ? 'Aucune donnée de présence en direct.' : 'No live attendance data.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-md font-semibold text-slate-900">{fr ? 'Historique des statuts' : 'Status history timeline'}</h3>
              <select
                value={statusHistoryProfileFilter}
                onChange={(e) => setStatusHistoryProfileFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">{fr ? 'Tous les salariés' : 'All employees'}</option>
                {employees.map((emp) => {
                  const linkedUser = users.find((u) => String((u as any).profileId || '') === String(emp.profileId));
                  const name = linkedUser?.fullName || linkedUser?.name || linkedUser?.email || String(emp.profileId).slice(0, 8);
                  return (
                    <option key={emp.id} value={String(emp.profileId)}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">{fr ? 'Salarié' : 'Employee'}</th>
                  <th className="px-4 py-3 text-left">{fr ? 'Statut' : 'Status'}</th>
                  <th className="px-4 py-3 text-left">{fr ? 'Début' : 'Start'}</th>
                  <th className="px-4 py-3 text-left">{fr ? 'Fin' : 'End'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Durée' : 'Duration'}</th>
                  <th className="px-4 py-3 text-left">{fr ? 'Source' : 'Source'}</th>
                </tr>
              </thead>
              <tbody>
                {statusHistoryRows.map((row) => {
                  const duration = row.durationMinutes ?? (row.endedAt ? Math.max(0, Math.round((new Date(row.endedAt).getTime() - new Date(row.startedAt).getTime()) / 60000)) : null);
                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{row.displayName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(row.status as PresenceStatus)}`}>
                          {statusLabel(row.status as PresenceStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(row.startedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(row.endedAt ?? null)}</td>
                      <td className="px-4 py-3 text-right font-mono">{duration !== null ? `${(duration / 60).toFixed(2)} h` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.source || 'system'}</td>
                    </tr>
                  );
                })}
                {statusHistoryRows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">{fr ? 'Aucun historique de statut pour le moment.' : 'No status history yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">{fr ? 'Salarié' : 'Employee'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Heures réalisées' : 'Hours done'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Heures prévues' : 'Expected hours'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Assiduité' : 'Assiduity'}</th>
                </tr>
              </thead>
              <tbody>
                {presenceMetrics.map((m) => {
                  const emp = employees.find((e) => e.profileId === m.profileId);
                  return (
                    <tr key={m.profileId} className="border-b border-slate-100">
                      <td className="px-4 py-3">{emp?.profileId?.slice(0, 8) || m.profileId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-right font-mono">{m.totalHours.toFixed(1)} h</td>
                      <td className="px-4 py-3 text-right font-mono">{m.expectedHours.toFixed(1)} h</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${m.assiduityRate >= 90 ? 'bg-emerald-100 text-emerald-700' : m.assiduityRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {m.assiduityRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {presenceMetrics.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{fr ? 'Aucune donnée de présence.' : 'No attendance data.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-md font-semibold text-slate-900">{fr ? 'Contrôle mensuel paie (présence/retards/absences)' : 'Monthly payroll compliance (attendance/delays/absences)'}</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">{fr ? 'Salarié' : 'Employee'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Déconnexions' : 'Logouts'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Retard (min)' : 'Delay (min)'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Absence NA (min)' : 'Unauthorized absence (min)'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Heures payables' : 'Payable hours'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Montant estimé' : 'Estimated amount'}</th>
                </tr>
              </thead>
              <tbody>
                {complianceRows.map((row) => {
                  const displayUser = users.find((u) => String((u as any).profileId || '') === row.profileId);
                  return (
                    <tr key={row.profileId} className="border-b border-slate-100">
                      <td className="px-4 py-3">{displayUser?.fullName || displayUser?.name || row.profileId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-right">{row.disconnectCount}</td>
                      <td className="px-4 py-3 text-right">{row.delayMinutes}</td>
                      <td className="px-4 py-3 text-right">{row.unauthorizedAbsenceMinutes}</td>
                      <td className="px-4 py-3 text-right font-mono">{(row.paidMinutes / 60).toFixed(2)} h</td>
                      <td className="px-4 py-3 text-right font-mono">{row.payableAmount.toLocaleString()} XOF</td>
                    </tr>
                  );
                })}
                {complianceRows.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>{fr ? 'Aucun indicateur de conformité.' : 'No compliance metric yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-md font-semibold text-slate-900">{fr ? 'Codifier une absence (autorisée / non autorisée)' : 'Classify absence (authorized / unauthorized)'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <select value={absenceProfileId} onChange={(e) => setAbsenceProfileId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{fr ? 'Salarié' : 'Employee'}</option>
                {employees.map((e) => <option key={e.id} value={e.profileId}>{e.profileId.slice(0, 8)}</option>)}
              </select>
              <input type="date" value={absenceDate} onChange={(e) => setAbsenceDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="number" value={absenceDuration} onChange={(e) => setAbsenceDuration(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="minutes" />
              <select value={absenceAuthorized ? 'yes' : 'no'} onChange={(e) => setAbsenceAuthorized(e.target.value === 'yes')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="yes">{fr ? 'Autorisée' : 'Authorized'}</option>
                <option value="no">{fr ? 'Non autorisée' : 'Unauthorized'}</option>
              </select>
              <button
                type="button"
                className="rounded-lg bg-slate-900 text-white text-sm px-3 py-2"
                onClick={async () => {
                  const orgId = await OrganizationService.getCurrentUserOrganizationId();
                  if (!orgId || !absenceProfileId) return;
                  await hrAnalyticsService.createHrAbsenceEvent({
                    organizationId: orgId,
                    profileId: absenceProfileId,
                    absenceDate,
                    durationMinutes: Number(absenceDuration || 0),
                    isAuthorized: absenceAuthorized,
                    reason: absenceReason || null,
                    createdById: currentSession?.userId || null,
                  });
                  setAbsenceReason('');
                  await loadPresenceAndAbsences();
                }}
              >
                {fr ? 'Enregistrer' : 'Save'}
              </button>
            </div>
            <input value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder={fr ? 'Motif' : 'Reason'} />
            <div className="text-sm text-slate-600">
              {fr ? 'Derniers événements : ' : 'Latest events: '}
              {absenceEvents.slice(0, 5).map((a) => `${a.absenceDate} (${a.isAuthorized ? 'A' : 'NA'})`).join(', ') || '—'}
            </div>
          </div>
        </section>
      )}

      {currentTab === 'leave' && (
        <div className="space-y-6">
          {showLeave && pendingLeaves.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{fr ? 'Total demandes' : 'Total requests'}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{leaveRequests.length}</p>
              </div>
              <div className="rounded-xl border border-amber-200/70 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">{fr ? 'En attente' : 'Pending'}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingLeaves.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/70 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">{fr ? 'Approuvées' : 'Approved'}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{approvedCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{fr ? 'Rejetées' : 'Rejected'}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{rejectedCount}</p>
              </div>
            </div>
          )}
          {pendingOverSla.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {fr ? `${pendingOverSla.length} demande(s) en attente depuis plus de ${SLA_DAYS_WARNING} jours (SLA).` : `${pendingOverSla.length} request(s) pending for over ${SLA_DAYS_WARNING} days (SLA).`}
              </span>
            </div>
          )}
          {canAccessModule('leave_management') && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  {fr ? 'Mes demandes de congés' : 'My leave requests'}
                </h2>
              </div>
              <div className="p-4">
                <LeaveManagement
                  leaveRequests={leaveRequests}
                  users={users}
                  onAddLeaveRequest={onAddLeaveRequest}
                  onUpdateLeaveRequest={onUpdateLeaveRequest}
                  onDeleteLeaveRequest={onDeleteLeaveRequest}
                />
              </div>
            </section>
          )}
          {canAccessModule('leave_management_admin') && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  {fr ? 'Validation / Liste des demandes' : 'Approval / Request list'}
                </h2>
              </div>
              <div className="p-4">
                <LeaveManagementAdmin
                  leaveRequests={leaveRequests}
                  users={users}
                  onUpdateLeaveRequest={onUpdateLeaveRequest}
                  onUpdateLeaveDates={onUpdateLeaveDates}
                  onDeleteLeaveRequest={onDeleteLeaveRequest}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {currentTab === 'demandes' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Demandes' : 'Requests'}</h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-slate-600 text-sm">{fr ? 'Demandes de congé, bulletin de paie, certificat de travail, attestation de travail, attestation de congé.' : 'Leave requests, pay slip, work certificate, work attestation, leave attestation.'}</p>
            {showLeave && (
              <button type="button" onClick={() => setActiveTab('leave')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">
                <i className="fas fa-umbrella-beach mr-2" />
                {fr ? 'Voir les congés' : 'View leave'}
              </button>
            )}
          </div>
        </section>
      )}

      {currentTab === 'employee' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <EmployeeProfile selectedEmployee={selectedEmployee} onClearSelection={() => setSelectedEmployee(null)} />
        </section>
      )}

      {currentTab === 'postes' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Référentiel des postes' : 'Postes reference'}</h2>
          </div>
          <div className="p-4">
            <PostesListReadOnly />
          </div>
        </section>
      )}

      {currentTab === 'organigramme' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Organigramme' : 'Organization chart'}</h2>
          </div>
          <div className="p-4">
            <OrganigrammeView />
          </div>
        </section>
      )}

      {currentTab === 'payroll' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Paie' : 'Payroll'}</h2>
          </div>
          <div className="p-4">
            <PayrollTab users={users} employees={employees} />
          </div>
        </section>
      )}

      {currentTab === 'formation' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Formation' : 'Training'}</h2>
          </div>
          <div className="p-4">
            <p className="text-slate-500 text-sm">{fr ? 'Espace formation à venir : cursus et formations par salarié.' : 'Training space coming soon: courses and training per employee.'}</p>
          </div>
        </section>
      )}

      {currentTab === 'talent' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <TalentAnalytics setView={setView} users={users} jobs={jobs} />
        </section>
      )}

      {currentTab === 'planning' && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-slate-500 mb-4">{fr ? 'Accédez au planning complet via le menu.' : 'Access the full planning via the menu.'}</p>
          <button
            type="button"
            onClick={() => setView('planning')}
            className="btn-3d-secondary"
          >
            <i className="fas fa-calendar-week mr-2" />
            {fr ? 'Ouvrir le planning' : 'Open planning'}
          </button>
        </section>
      )}

      {currentTab === 'jobs' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4">
            <Jobs jobs={jobs} setJobs={setJobs} setView={setView} />
          </div>
        </section>
      )}
    </div>
  );
};

export default RhModule;
