import React, { useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Language, User, ModuleName } from '../types';
import UserProfileEdit from './UserProfileEdit';
import OrganizationManagement from './OrganizationManagement';
import DepartmentManagement from './DepartmentManagement';
import UserModulePermissions from './UserModulePermissions';
import CourseManagement from './CourseManagement';
import JobManagement from './JobManagement';
import LeaveManagementAdmin from './LeaveManagementAdmin';
import PostesManagement from './PostesManagement';
import ModuleLabelsEditor from './ModuleLabelsEditor';
import DashboardSettingsEditor from './DashboardSettingsEditor';
import ProjectModuleSettingsEditor from './ProjectModuleSettingsEditor';
import { LeaveRequest, Project, Course, Job } from '../types';

interface SettingsProps {
  reminderDays: number;
  onSetReminderDays: (days: number) => void;
  users?: User[];
  setView?: (view: string) => void;
  leaveRequests?: LeaveRequest[];
  projects?: Project[];
  courses?: Course[];
  jobs?: Job[];
  onUpdateLeaveRequest?: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onUpdateLeaveDates?: (id: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
  onAddCourse?: (course: Partial<Course>) => Promise<void>;
  onUpdateCourse?: (id: string, updates: Partial<Course>) => Promise<void>;
  onDeleteCourse?: (id: string) => Promise<void>;
  onAddJob?: (job: Partial<Job>) => Promise<void>;
  onUpdateJob?: (id: string, updates: Partial<Job>) => Promise<void>;
  onDeleteJob?: (id: number) => Promise<void>;
  isLoading?: boolean;
  loadingOperation?: string | null;
  automationKpis?: {
    cycleAt: string;
    scanned: {
      projects: number;
      tasks: number;
      objectives: number;
      leaves: number;
      invoices: number;
      meetings: number;
    };
    actions: {
      total: number;
      notifications: number;
      projectUpdates: number;
      objectiveUpdates: number;
      invoiceUpdates: number;
    };
    bySeverity: {
      info: number;
      warning: number;
      critical: number;
    };
  } | null;
}

/** Administration uniquement (22 modules / 10 départements) : droits et paramétrage */
const ADMIN_SECTIONS: { key: ModuleName; label: string; icon: string }[] = [
  { key: 'organization_management', label: 'Gestion des Organisations', icon: 'fas fa-building' },
  { key: 'department_management', label: 'Départements', icon: 'fas fa-sitemap' },
  { key: 'postes_management', label: 'Postes', icon: 'fas fa-user-tag' },
  { key: 'user_management', label: 'Droits d\'accès / Utilisateurs', icon: 'fas fa-user-cog' },
  { key: 'course_management', label: 'Gestion des formations', icon: 'fas fa-chalkboard-teacher' },
  { key: 'job_management', label: 'Gestion des Jobs', icon: 'fas fa-briefcase' },
  { key: 'leave_management_admin', label: 'Demandes de Congés (validation)', icon: 'fas fa-calendar-check' },
];

const Settings: React.FC<SettingsProps> = ({
  reminderDays,
  onSetReminderDays,
  users = [],
  setView,
  leaveRequests = [],
  courses = [],
  jobs = [],
  onUpdateLeaveRequest,
  onUpdateLeaveDates,
  onDeleteLeaveRequest,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  isLoading,
  loadingOperation,
  automationKpis,
}) => {
  const { t, language, setLanguage } = useLocalization();
  const { user } = useAuth();
  const { canAccessModule } = useModulePermissions();
  const [skills, setSkills] = useState(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<ModuleName | ''>('');
  const [showModuleLabels, setShowModuleLabels] = useState(false);
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  const [showProjectModuleSettings, setShowProjectModuleSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'personal' | 'admin'>('personal');
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);

  const visibleAdminSections = useMemo(
    () =>
      ADMIN_SECTIONS.filter((s) =>
        s.key === 'postes_management'
          ? user?.role === 'super_administrator' || user?.role === 'administrator'
          : canAccessModule(s.key),
      ),
    [user?.role, canAccessModule],
  );

  const showAdminTab = user?.role === 'super_administrator' || visibleAdminSections.length > 0;

  useEffect(() => {
    setProfileAvatarFailed(false);
  }, [user?.avatar]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
      // In a real app, you would call an API to save this.
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    // TODO: Appeler l'API pour sauvegarder le profil
    console.log('Profil mis à jour:', updatedUser);
  };

  // Générer les initiales pour l'avatar
  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    const firstInitial = parts[0]?.charAt(0)?.toUpperCase() || '';
    const lastInitial = parts[parts.length - 1]?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'U';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('settings_title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {showAdminTab
              ? 'Compte et préférences d’un côté, administration (rôles, modules, équipe) de l’autre.'
              : 'Profil, préférences et compétences.'}
          </p>
        </div>
      </div>

      {showAdminTab ? (
        <div className="flex flex-wrap gap-2 p-1.5 mb-6 bg-slate-100 rounded-xl border border-slate-200 max-w-xl">
          <button
            type="button"
            onClick={() => setSettingsTab('personal')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              settingsTab === 'personal' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-user mr-2 text-emerald-600" />
            Compte & préférences
          </button>
          <button
            type="button"
            onClick={() => setSettingsTab('admin')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              settingsTab === 'admin' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-shield-alt mr-2 text-slate-700" />
            Administration
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        {(!showAdminTab || settingsTab === 'personal') && (
          <>
        {/* Profile Settings */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t('profile')}</h2>
            <button type="button" onClick={() => setProfileModalOpen(true)} className="btn-3d-primary">
              <i className="fas fa-user-edit mr-2" />
              Modifier le profil
            </button>
          </div>
          <div className="p-4">
          <div className="flex items-center space-x-4">
            {user?.avatar && !profileAvatarFailed ? (
              <img 
                src={user.avatar} 
                alt={user?.name} 
                className="w-20 h-20 rounded-full border-2 border-emerald-500 object-cover"
                onError={() => setProfileAvatarFailed(true)}
              />
            ) : null}
            <div 
              className={`w-20 h-20 rounded-full border-2 border-emerald-500 bg-gradient-to-br from-emerald-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold ${user?.avatar && !profileAvatarFailed ? 'hidden' : ''}`}
            >
              {user ? getInitials(user.name) : 'U'}
            </div>
            <div className="flex-1">
              <p className="font-bold text-xl text-slate-900">{user?.name}</p>
              <p className="text-slate-500">{user?.email}</p>
              <p className="text-sm capitalize text-emerald-600 font-semibold mt-1">{t(user!.role)}</p>
              {user?.phone && <p className="text-slate-500 text-sm mt-1">{user.phone}</p>}
              {user?.location && <p className="text-slate-500 text-sm mt-1">{user.location}</p>}
            </div>
          </div>
          </div>
        </section>

        {/* Centre de notifications & historique — regroupés ici (retirés du menu principal) */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Notifications &amp; activité</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50"
              onClick={() => setView?.('notifications_center')}
            >
              <i className="fas fa-bell mr-2 text-amber-600" />
              Centre de notifications
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50"
              onClick={() => setView?.('activity_logs')}
            >
              <i className="fas fa-history mr-2 text-slate-600" />
              Historique des activités
            </button>
          </div>
        </section>

        {/* Skill Passport */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{t('my_skills')}</h2>
          </div>
          <div className="p-4">
          <p className="text-sm text-slate-500 mb-4">{t('skill_passport_subtitle')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map(skill => (
              <span key={skill} className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} className="ml-2 text-emerald-600 hover:text-emerald-800">
                  <i className="fas fa-times-circle text-xs"></i>
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input 
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder={t('enter_skill')}
              className="flex-grow p-2 border rounded-md"
            />
            <button type="submit" className="btn-3d-primary">{t('add_skill')}</button>
          </form>
          </div>
        </section>

        {/* Reminder Settings */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{t('reminder_settings')}</h2>
          </div>
          <div className="p-4">
          <div className="flex items-center justify-between max-w-xs">
            <label htmlFor="reminder-days" className="text-sm text-slate-600">{t('remind_days_before')}:</label>
            <input
              id="reminder-days"
              type="number"
              value={reminderDays}
              onChange={(e) => onSetReminderDays(Math.max(0, Number(e.target.value)))}
              className="w-24 p-2 border border-slate-300 rounded-lg text-center"
              min="0"
            />
          </div>
          </div>
        </section>

        {/* Automatisation & observabilité – pilotage workflows */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Automatisation des workflows</h2>
            {automationKpis && (
              <span className="text-xs text-slate-500">Dernier cycle: {new Date(automationKpis.cycleAt).toLocaleString('fr-FR')}</span>
            )}
          </div>
          <div className="p-4">
          {automationKpis ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <p className="text-xs uppercase text-slate-500">Actions totales</p>
                  <p className="text-xl font-bold text-slate-900">{automationKpis.actions.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <p className="text-xs uppercase text-slate-500">Notifications</p>
                  <p className="text-xl font-bold text-slate-900">{automationKpis.actions.notifications}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <p className="text-xs uppercase text-slate-500">Mises à jour auto</p>
                  <p className="text-xl font-bold text-slate-900">
                    {automationKpis.actions.projectUpdates + automationKpis.actions.objectiveUpdates + automationKpis.actions.invoiceUpdates}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-blue-50/80 p-3">
                  <p className="text-xs uppercase text-blue-700">Info</p>
                  <p className="text-lg font-semibold text-blue-900">{automationKpis.bySeverity.info}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-amber-50/80 p-3">
                  <p className="text-xs uppercase text-amber-700">Warning</p>
                  <p className="text-lg font-semibold text-amber-900">{automationKpis.bySeverity.warning}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-rose-50/80 p-3">
                  <p className="text-xs uppercase text-rose-700">Critical</p>
                  <p className="text-lg font-semibold text-rose-900">{automationKpis.bySeverity.critical}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun cycle d&apos;automatisation exécuté pour le moment.</p>
          )}
          </div>
        </section>

        {/* Language Settings */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{t('language')}</h2>
          </div>
          <div className="p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLanguage(Language.EN)} className={language === Language.EN ? 'btn-3d-primary' : 'btn-3d-secondary'}>{t('english')}</button>
            <button type="button" onClick={() => setLanguage(Language.FR)} className={language === Language.FR ? 'btn-3d-primary' : 'btn-3d-secondary'}>{t('french')}</button>
          </div>
          </div>
        </section>
          </>
        )}

        {showAdminTab && settingsTab === 'admin' && (
          <>
        {/* Libellés des modules (super admin uniquement) */}
        {user?.role === 'super_administrator' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Libellés des modules</h2>
            <p className="text-sm text-gray-600 mb-4">
              Personnalisez les noms affichés des modules dans la sidebar et les écrans de droits (super admin).
            </p>
            <button
              type="button"
              onClick={() => setShowModuleLabels(!showModuleLabels)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${showModuleLabels ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <i className="fas fa-tags"></i>
              {showModuleLabels ? 'Masquer l’éditeur' : 'Éditer les libellés'}
            </button>
            {showModuleLabels && (
              <div className="mt-4 border-t pt-4">
                <ModuleLabelsEditor />
              </div>
            )}
          </div>
        )}

        {/* Administration tableau de bord (super admin) – Phase 1.3 */}
        {user?.role === 'super_administrator' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Tableau de bord</h2>
            <p className="text-sm text-gray-600 mb-4">
              Activer ou désactiver les widgets du tableau de bord pour l’organisation.
            </p>
            <button
              type="button"
              onClick={() => setShowDashboardSettings(!showDashboardSettings)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${showDashboardSettings ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <i className="fas fa-th-large" />
              {showDashboardSettings ? 'Masquer les options' : 'Configurer les widgets'}
            </button>
            {showDashboardSettings && (
              <div className="mt-4 border-t pt-4">
                <DashboardSettingsEditor />
              </div>
            )}
          </div>
        )}

        {/* Administration module Projets (super admin) – Phase 2.4 */}
        {user?.role === 'super_administrator' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Module Projets</h2>
            <p className="text-sm text-gray-600 mb-4">
              Types de projet, statuts personnalisables et seuil d’alerte retard.
            </p>
            <button
              type="button"
              onClick={() => setShowProjectModuleSettings(!showProjectModuleSettings)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${showProjectModuleSettings ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <i className="fas fa-project-diagram" />
              {showProjectModuleSettings ? 'Masquer les options' : 'Configurer le module Projets'}
            </button>
            {showProjectModuleSettings && (
              <div className="mt-4 border-t pt-4">
                <ProjectModuleSettingsEditor />
              </div>
            )}
          </div>
        )}

        {/* Administration et gestion – visibilité selon canAccessModule (garde admin) */}
        {visibleAdminSections.length > 0 ? (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Équipe, droits et référentiels</h2>
                <p className="text-sm text-slate-500 mt-0.5">Choisissez un module ci-dessous (selon votre rôle).</p>
              </div>
              <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {visibleAdminSections.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setAdminSection(adminSection === s.key ? '' : s.key)}
                    className={adminSection === s.key ? 'btn-3d-primary' : 'btn-3d-secondary'}
                  >
                    <i className={s.icon + ' mr-2'} />
                    {s.label}
                  </button>
                ))}
              </div>
              {adminSection && (
                <div className="pt-4 mt-4 border-t border-slate-200">
                  {adminSection === 'organization_management' && <OrganizationManagement />}
                  {adminSection === 'department_management' && <DepartmentManagement />}
                  {adminSection === 'postes_management' && <PostesManagement />}
                  {adminSection === 'user_management' && <UserModulePermissions users={users} canEdit />}
                  {adminSection === 'course_management' && onAddCourse && onUpdateCourse && onDeleteCourse && (
                    <CourseManagement courses={courses} users={users} onAddCourse={onAddCourse} onUpdateCourse={onUpdateCourse} onDeleteCourse={onDeleteCourse} isLoading={isLoading} loadingOperation={loadingOperation} />
                  )}
                  {adminSection === 'job_management' && onAddJob && onUpdateJob && onDeleteJob && (
                    <JobManagement jobs={jobs} onAddJob={onAddJob} onUpdateJob={onUpdateJob} onDeleteJob={onDeleteJob} onNavigate={setView} isLoading={isLoading} loadingOperation={loadingOperation} />
                  )}
                  {adminSection === 'leave_management_admin' && onUpdateLeaveRequest && (
                    <LeaveManagementAdmin leaveRequests={leaveRequests} users={users} onUpdateLeaveRequest={onUpdateLeaveRequest} onUpdateLeaveDates={onUpdateLeaveDates} onDeleteLeaveRequest={onDeleteLeaveRequest} />
                  )}
                </div>
              )}
              </div>
            </section>
        ) : user?.role !== 'super_administrator' ? (
          <p className="text-sm text-slate-500 py-4">Aucune section d’administration accessible avec votre compte.</p>
        ) : null}
          </>
        )}
      </div>

      {/* Modal de modification du profil */}
      {isProfileModalOpen && user && (
        <UserProfileEdit 
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default Settings;
