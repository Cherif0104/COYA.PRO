import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { LeaveRequest, User, Job, Employee } from '../types';
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

export type RhTab = 'salaries' | 'leave' | 'demandes' | 'employee' | 'postes' | 'organigramme' | 'payroll' | 'formation' | 'talent' | 'jobs' | 'planning';

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

  const loadEmployees = useCallback(async () => {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    const list = await DataAdapter.listEmployees(orgId ?? undefined);
    setEmployees(list ?? []);
  }, []);
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const fr = language === 'fr';
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
