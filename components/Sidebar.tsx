

import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import NexusFlowIcon from './icons/NexusFlowIcon';
import { useAuth } from '../contexts/AuthContextSupabase';
import { ModuleName } from '../types';
import { useModuleLabels } from '../hooks/useModuleLabels';

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
          ? 'bg-white/20 text-white shadow-lg'
          : 'text-white/90 hover:bg-white/10 hover:text-white'
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
  const isActive = items.some(item => currentView === item.viewName);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-white/20 text-white shadow-lg'
            : 'text-white/90 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center">
          <i className={`${icon} w-6 text-center`}></i>
          <span className="ml-3">{label}</span>
        </div>
        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} transition-transform duration-200`}></i>
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1 ml-4 border-l-2 border-white/20 pl-2">
          {items.map(item => (
            <a
              key={item.viewName}
              href="#"
              onClick={(e) => { e.preventDefault(); setView(item.viewName); }}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                currentView === item.viewName
                  ? 'bg-white/15 text-white shadow-md'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
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

/** Entrées par domaine (alignées 10 départements Odoo / 22 modules) */
const SIDEBAR_SECTIONS: { title: string; items: { icon: string; labelKey: string; labelFallback: string; view: ModuleName }[] }[] = [
  {
    title: 'Workspace',
    items: [
      { icon: 'fas fa-th-large', labelKey: 'dashboard', labelFallback: 'Dashboard', view: 'dashboard' },
      { icon: 'fas fa-project-diagram', labelKey: 'projects', labelFallback: 'Projets', view: 'projects' },
      { icon: 'fas fa-calendar-week', labelKey: 'planning', labelFallback: 'Planning', view: 'planning' },
    ],
  },
  {
    title: 'RH',
    items: [
      { icon: 'fas fa-users-cog', labelKey: 'rh', labelFallback: 'Ressources Humaines', view: 'rh' },
    ],
  },
  {
    title: 'Administratif & Financier',
    items: [
      { icon: 'fas fa-file-invoice-dollar', labelKey: 'finance', labelFallback: 'Finance', view: 'finance' },
      { icon: 'fas fa-chart-line', labelKey: 'programme', labelFallback: 'Programme / Budget', view: 'programme' },
      { icon: 'fas fa-calculator', labelKey: 'comptabilite', labelFallback: 'Comptabilité', view: 'comptabilite' },
    ],
  },
  {
    title: 'Formation & Bootcamp',
    items: [
      { icon: 'fas fa-book-open', labelKey: 'courses', labelFallback: 'Cours', view: 'courses' },
    ],
  },
  {
    title: 'Emploi',
    items: [
      { icon: 'fas fa-briefcase', labelKey: 'jobs', labelFallback: 'Offres d\'emploi', view: 'jobs' },
    ],
  },
  {
    title: 'Prospection & Partenariat',
    items: [
      { icon: 'fas fa-users', labelKey: 'crm_sales', labelFallback: 'CRM & Ventes', view: 'crm_sales' },
      { icon: 'fas fa-handshake', labelKey: 'partenariat', labelFallback: 'Partenariat', view: 'partenariat' },
    ],
  },
  {
    title: 'Conseil & Qualité',
    items: [
      { icon: 'fas fa-comments', labelKey: 'conseil', labelFallback: 'Conseil', view: 'conseil' },
      { icon: 'fas fa-chart-pie', labelKey: 'analytics', labelFallback: 'Analytics', view: 'analytics' },
      { icon: 'fas fa-check-double', labelKey: 'qualite', labelFallback: 'Qualité', view: 'qualite' },
      { icon: 'fas fa-user-tie', labelKey: 'talent_analytics', labelFallback: 'Talent Analytics', view: 'talent_analytics' },
    ],
  },
  {
    title: 'Juridique',
    items: [
      { icon: 'fas fa-gavel', labelKey: 'juridique', labelFallback: 'Juridique', view: 'juridique' },
    ],
  },
  {
    title: 'Audiovisuel / Studio',
    items: [
      { icon: 'fas fa-video', labelKey: 'studio', labelFallback: 'Studio', view: 'studio' },
    ],
  },
  {
    title: 'IT & Tech',
    items: [
      { icon: 'fas fa-laptop-code', labelKey: 'tech', labelFallback: 'Tech', view: 'tech' },
    ],
  },
  {
    title: 'Collecte & Données',
    items: [
      { icon: 'fas fa-clipboard-list', labelKey: 'collecte', labelFallback: 'Collecte', view: 'collecte' },
    ],
  },
  {
    title: 'Trinité',
    items: [
      { icon: 'fas fa-gem', labelKey: 'trinite', labelFallback: 'Trinité', view: 'trinite' },
    ],
  },
  {
    title: 'Logistique & Opérations',
    items: [
      { icon: 'fas fa-boxes', labelKey: 'logistique', labelFallback: 'Logistique', view: 'logistique' },
      { icon: 'fas fa-car', labelKey: 'parc_auto', labelFallback: 'Parc automobile', view: 'parc_auto' },
      { icon: 'fas fa-ticket-alt', labelKey: 'ticket_it', labelFallback: 'Ticket IT', view: 'ticket_it' },
    ],
  },
  {
    title: 'Communication & Conformité',
    items: [
      { icon: 'fas fa-envelope', labelKey: 'messagerie', labelFallback: 'Messagerie / Discuss', view: 'messagerie' },
      { icon: 'fas fa-exclamation-triangle', labelKey: 'alerte_anonyme', labelFallback: 'Alerte anonyme', view: 'alerte_anonyme' },
    ],
  },
  {
    title: 'Base de connaissances',
    items: [
      { icon: 'fas fa-database', labelKey: 'knowledge_base', labelFallback: 'Base de connaissances', view: 'knowledge_base' },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, canAccessModule, permissionsLoading }) => {
  const { t } = useLocalization();
  const { getDisplayName } = useModuleLabels();

  const monitoringItems = [
    { icon: 'fas fa-bell', label: t('notifications_center') || 'Centre de notifications', view: 'notifications_center' },
    { icon: 'fas fa-history', label: t('activity_history') || 'Historique des activités', view: 'activity_logs' },
  ];

  const settingsItem = { icon: 'fas fa-cog', label: t('settings'), view: 'settings' as ModuleName };

  return (
    <aside className={`fixed lg:relative inset-y-0 left-0 bg-coya-primary text-white w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-coya`}>
      <div className="flex items-center justify-center h-20 border-b border-white/20 px-4">
        <NexusFlowIcon className="h-10 w-auto" />
        <h1 className="text-xl font-bold ml-2">{t('senegel_workflow_platform')}</h1>
      </div>
      <nav className="flex-grow px-4 py-6 space-y-2 overflow-y-auto">
        {permissionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coya-emeraude"></div>
          </div>
        ) : (
          <>
            {SIDEBAR_SECTIONS.map(section => {
              const visibleItems = section.items.filter(item => canAccessModule(item.view));
              if (visibleItems.length === 0) return null;
              return (
                <div key={section.title}>
                  <p className="px-4 pt-4 pb-2 text-xs uppercase text-white/70">{section.title}</p>
                  {visibleItems.map(item => (
                    <NavLink
                      key={item.view}
                      icon={item.icon}
                      label={getDisplayName(item.labelKey) || t(item.labelKey) || item.labelFallback}
                      viewName={item.view}
                      currentView={currentView}
                      setView={setView}
                    />
                  ))}
                </div>
              );
            })}
            <p className="px-4 pt-4 pb-2 text-xs uppercase text-white/70">Monitoring</p>
            {monitoringItems.map(item => (
              <NavLink key={item.view} icon={item.icon} label={item.label} viewName={item.view} currentView={currentView} setView={setView} />
            ))}
          </>
        )}
      </nav>
      <div className="px-4 pb-6 border-t border-white/20 pt-4">
        {!permissionsLoading && canAccessModule(settingsItem.view) && (
          <NavLink icon={settingsItem.icon} label={settingsItem.label} viewName={settingsItem.view} currentView={currentView} setView={setView} />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
