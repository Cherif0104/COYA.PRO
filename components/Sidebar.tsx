


import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import NexusFlowIcon from './icons/NexusFlowIcon';
import { useAuth } from '../contexts/AuthContextSupabase';
import { ModuleName } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen: boolean;
  canAccessModule: (module: ModuleName) => boolean;
  permissionsLoading: boolean;
}

const NavLink: React.FC<{ icon: string; label: string; viewName: string; currentView: string; setView: (view: string) => void }> = 
  ({ icon, label, viewName, currentView, setView }) => {
  const isActive = currentView === viewName;
  const isSubActive = (viewName === 'projects' && currentView.startsWith('project')) ||
                      (viewName === 'courses' && (currentView.startsWith('course') || currentView === 'course_detail'));

  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); setView(viewName); }}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        (isActive || isSubActive)
          ? 'bg-emerald-600 text-white shadow-lg'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <i className={`${icon} w-6 text-center`}></i>
      <span className="ml-3">{label}</span>
    </a>
  );
};

interface ExpandableNavItemProps {
  icon: string;
  label: string;
  currentView: string;
  setView: (view: string) => void;
  items: { icon: string; label: string; viewName: string }[];
}

const ExpandableNavItem: React.FC<ExpandableNavItemProps> = ({ icon, label, currentView, setView, items }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if any sub-item is active
  const isActive = items.some(item => 
    currentView === item.viewName
  );

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-emerald-600 text-white shadow-lg'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        <div className="flex items-center">
          <i className={`${icon} w-6 text-center`}></i>
          <span className="ml-3">{label}</span>
        </div>
        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} transition-transform duration-200`}></i>
      </button>
      
      {isExpanded && (
        <div className="mt-1 space-y-1 ml-4 border-l-2 border-gray-700 pl-2">
          {items.map(item => (
            <a
              key={item.viewName}
              href="#"
              onClick={(e) => { e.preventDefault(); setView(item.viewName); }}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                currentView === item.viewName
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <i className={`${item.icon} w-6 text-center text-sm`}></i>
              <span className="ml-3">{item.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, canAccessModule, permissionsLoading }) => {
  const { t } = useLocalization();

  const workspaceItems = [
    { icon: 'fas fa-th-large', label: t('dashboard'), view: 'dashboard' as ModuleName },
    { icon: 'fas fa-project-diagram', label: t('projects'), view: 'projects' as ModuleName },
    { icon: 'fas fa-bullseye', label: t('goals_okrs'), view: 'goals_okrs' as ModuleName },
    { icon: 'fas fa-clock', label: t('time_tracking'), view: 'time_tracking' as ModuleName},
    { icon: 'fas fa-calendar-alt', label: t('leave_management'), view: 'leave_management' as ModuleName},
    { icon: 'fas fa-file-invoice-dollar', label: t('finance'), view: 'finance' as ModuleName},
    { icon: 'fas fa-database', label: t('knowledge_base'), view: 'knowledge_base' as ModuleName },
  ];

  const developmentItems = [
     { icon: 'fas fa-book-open', label: t('courses'), view: 'courses' as ModuleName },
     { icon: 'fas fa-briefcase', label: t('jobs'), view: 'jobs' as ModuleName },
  ];
  
  const toolsItems = [
    { icon: 'fas fa-robot', label: t('ai_coach'), view: 'ai_coach' as ModuleName },
    { icon: 'fas fa-flask', label: t('gen_ai_lab'), view: 'gen_ai_lab' as ModuleName },
  ];
  
  const settingsItem = { icon: 'fas fa-cog', label: t('settings'), view: 'settings' as ModuleName };

  const managementNavItems = [
    { icon: 'fas fa-building', label: 'Gestion des Organisations', viewName: 'organization_management' as ModuleName },
    { icon: 'fas fa-chalkboard-teacher', label: 'Gestion des Cours', viewName: 'course_management' as ModuleName },
    { icon: 'fas fa-briefcase', label: 'Gestion des Jobs', viewName: 'job_management' as ModuleName },
    { icon: 'fas fa-calendar-alt', label: 'Demandes de Congés', viewName: 'leave_management_admin' as ModuleName },
    { icon: 'fas fa-user-cog', label: 'Gestion des Utilisateurs', viewName: 'user_management' as ModuleName },
    { icon: 'fas fa-chart-pie', label: 'Analytics', viewName: 'analytics' as ModuleName },
    { icon: 'fas fa-user-tie', label: 'Talent Analytics', viewName: 'talent_analytics' as ModuleName },
  ];

  const visibleManagementItems = managementNavItems.filter(item => canAccessModule(item.viewName));
  
  return (
    <aside className={`fixed lg:relative inset-y-0 left-0 bg-gray-800 text-white w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col`}>
      <div className="flex items-center justify-center h-20 border-b border-gray-700 px-4">
        <NexusFlowIcon className="h-10 w-auto" />
        <h1 className="text-xl font-bold ml-2">{t('senegel_workflow_platform')}</h1>
      </div>
      <nav className="flex-grow px-4 py-6 space-y-2 overflow-y-auto">
        {permissionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <>
            <p className="px-4 pt-4 pb-2 text-xs uppercase text-gray-400">Workspace</p>
            {workspaceItems
              .filter(item => canAccessModule(item.view))
              .map(item => (
                <NavLink key={item.view} icon={item.icon} label={item.label} viewName={item.view} currentView={currentView} setView={setView} />
              ))}

            <p className="px-4 pt-4 pb-2 text-xs uppercase text-gray-400">Development</p>
            {developmentItems
              .filter(item => canAccessModule(item.view))
              .map(item => (
                <NavLink key={item.view} icon={item.icon} label={item.label} viewName={item.view} currentView={currentView} setView={setView} />
              ))}
            
            <p className="px-4 pt-4 pb-2 text-xs uppercase text-gray-400">Tools</p>
            {toolsItems
              .filter(item => canAccessModule(item.view))
              .map(item => (
                <NavLink key={item.view} icon={item.icon} label={item.label} viewName={item.view} currentView={currentView} setView={setView} />
              ))}
          </>
        )}

        {!permissionsLoading && (
          <>
            {/* CRM & Sales - Module indépendant */}
            {canAccessModule('crm_sales' as ModuleName) && (
              <NavLink 
                icon="fas fa-users" 
                label={t('crm_sales')} 
                viewName="crm_sales" 
                currentView={currentView} 
                setView={setView} 
              />
            )}

            {/* Menu expandable Management */}
            {visibleManagementItems.length > 0 && (
              <>
            <p className="px-4 pt-4 pb-2 text-xs uppercase text-gray-400">COYA Management</p>
                <ExpandableNavItem
                  icon="fas fa-tasks"
              label="COYA Management"
                  currentView={currentView}
                  setView={setView}
                  items={visibleManagementItems}
                />
              </>
            )}
          </>
        )}
      </nav>
      
      <div className="px-4 pb-6 border-t border-gray-700 pt-4">
         {!permissionsLoading && canAccessModule(settingsItem.view) && (
           <NavLink key={settingsItem.view} icon={settingsItem.icon} label={settingsItem.label} viewName={settingsItem.view} currentView={currentView} setView={setView} />
         )}
      </div>

    </aside>
  );
};

export default Sidebar;

