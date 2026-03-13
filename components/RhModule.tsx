import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { LeaveRequest, User, Job } from '../types';
import LeaveManagement from './LeaveManagement';
import LeaveManagementAdmin from './LeaveManagementAdmin';
import EmployeeProfile from './EmployeeProfile';
import TalentAnalytics from './TalentAnalytics';
import PostesListReadOnly from './PostesListReadOnly';
import OrganigrammeView from './OrganigrammeView';
import PayrollTab from './PayrollTab';

export type RhTab = 'leave' | 'employee' | 'postes' | 'organigramme' | 'payroll' | 'talent' | 'planning';

interface RhModuleProps {
  leaveRequests: LeaveRequest[];
  users: User[];
  jobs: Job[];
  setView: (view: string) => void;
  onAddLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateLeaveRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onUpdateLeaveDates?: (id: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onDeleteLeaveRequest: (id: string) => Promise<void>;
  isLoading?: boolean;
  loadingOperation?: string | null;
}

const RhModule: React.FC<RhModuleProps> = ({
  leaveRequests,
  users,
  jobs,
  setView,
  onAddLeaveRequest,
  onUpdateLeaveRequest,
  onUpdateLeaveDates,
  onDeleteLeaveRequest,
  isLoading,
  loadingOperation
}) => {
  const { t, language } = useLocalization();
  const { canAccessModule } = useModulePermissions();
  const [activeTab, setActiveTab] = useState<RhTab>('leave');

  const fr = language === 'fr';
  const showLeave = canAccessModule('leave_management') || canAccessModule('leave_management_admin');
  const showEmployee = true;
  const showPostes = true;
  const showOrganigramme = true;
  const showPayroll = true;
  const showTalent = canAccessModule('talent_analytics');
  const showPlanning = canAccessModule('planning');

  const tabs: { id: RhTab; label: string; show: boolean }[] = [
    { id: 'leave', label: fr ? 'Congés' : 'Leave', show: showLeave },
    { id: 'employee', label: fr ? 'Fiche salarié' : 'Employee profile', show: showEmployee },
    { id: 'postes', label: fr ? 'Fiche poste' : 'Job profile', show: showPostes },
    { id: 'organigramme', label: fr ? 'Organigramme' : 'Org chart', show: showOrganigramme },
    { id: 'payroll', label: fr ? 'Paie' : 'Payroll', show: showPayroll },
    { id: 'talent', label: fr ? 'Évaluations' : 'Evaluations', show: showTalent },
    { id: 'planning', label: fr ? 'Planning' : 'Planning', show: showPlanning }
  ];

  const visibleTabs = tabs.filter(tab => tab.show);
  const currentTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : (visibleTabs[0]?.id ?? 'leave');

  return (
    <div>
      <h1 className="text-3xl font-bold text-coya-text mb-2">
        {fr ? 'Ressources humaines' : 'Human resources'}
      </h1>
      <p className="text-coya-text-muted mb-6">
        {fr ? 'Congés, fiche salarié, évaluations.' : 'Leave, employee profile, evaluations.'}
      </p>

      <div className="border-b border-coya-border mb-6">
        <nav className="flex gap-4" aria-label="Sous-modules RH">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                currentTab === tab.id
                  ? 'border-coya-primary text-coya-primary'
                  : 'border-transparent text-coya-text-muted hover:text-coya-text hover:border-coya-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {currentTab === 'leave' && (
        <div className="space-y-8">
          {canAccessModule('leave_management') && (
            <section>
              <h2 className="text-xl font-semibold text-coya-text mb-4">
                {fr ? 'Mes demandes de congés' : 'My leave requests'}
              </h2>
              <LeaveManagement
                leaveRequests={leaveRequests}
                users={users}
                onAddLeaveRequest={onAddLeaveRequest}
                onUpdateLeaveRequest={onUpdateLeaveRequest}
                onDeleteLeaveRequest={onDeleteLeaveRequest}
              />
            </section>
          )}
          {canAccessModule('leave_management_admin') && (
            <section>
              <h2 className="text-xl font-semibold text-coya-text mb-4">
                {fr ? 'Validation / Liste des demandes' : 'Approval / Request list'}
              </h2>
              <LeaveManagementAdmin
                leaveRequests={leaveRequests}
                users={users}
                onUpdateLeaveRequest={onUpdateLeaveRequest}
                onUpdateLeaveDates={onUpdateLeaveDates}
                onDeleteLeaveRequest={onDeleteLeaveRequest}
              />
            </section>
          )}
        </div>
      )}

      {currentTab === 'employee' && <EmployeeProfile />}

      {currentTab === 'postes' && (
        <section>
          <h2 className="text-xl font-semibold text-coya-text mb-4">{fr ? 'Référentiel des postes' : 'Postes reference'}</h2>
          <PostesListReadOnly />
        </section>
      )}

      {currentTab === 'organigramme' && (
        <section>
          <h2 className="text-xl font-semibold text-coya-text mb-4">{fr ? 'Organigramme' : 'Organization chart'}</h2>
          <OrganigrammeView />
        </section>
      )}

      {currentTab === 'payroll' && (
        <section>
          <PayrollTab users={users} />
        </section>
      )}

      {currentTab === 'talent' && <TalentAnalytics setView={setView} users={users} jobs={jobs} />}

      {currentTab === 'planning' && (
        <section>
          <p className="text-coya-text-muted mb-4">{fr ? 'Accédez au planning complet via le menu.' : 'Access the full planning via the menu.'}</p>
          <button
            type="button"
            onClick={() => setView('planning')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            {fr ? 'Ouvrir le planning' : 'Open planning'}
          </button>
        </section>
      )}
    </div>
  );
};

export default RhModule;
