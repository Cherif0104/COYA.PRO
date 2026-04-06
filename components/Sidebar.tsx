import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import NexusFlowIcon from './icons/NexusFlowIcon';
import { ModuleName } from '../types';
import { useModuleLabels } from '../hooks/useModuleLabels';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen: boolean;
  canAccessModule: (module: ModuleName) => boolean;
  permissionsLoading: boolean;
}

/** Lien de navigation : style épuré, minimaliste */
const NavLink: React.FC<{
  icon: string;
  label: string;
  viewName: string;
  currentView: string;
  setView: (view: string) => void;
}> = ({ icon, label, viewName, currentView, setView }) => {
  const isActive = currentView === viewName;
  const isSubActive =
    (viewName === 'projects' && currentView.startsWith('project')) ||
    (viewName === 'courses' && (currentView.startsWith('course') || currentView === 'course_detail'));

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setView(viewName);
      }}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
        isActive || isSubActive
          ? 'bg-white/15 text-white'
          : 'text-white/85 hover:bg-white/10 hover:text-white'
      }`}
    >
      <i className={`${icon} w-5 text-center opacity-90`} />
      <span className="truncate">{label}</span>
    </a>
  );
};

/**
 * Modules visibles dans la sidebar (épurés).
 * - Supprimés en tant que modules distincts : Tech, Analytics.
 * - Talent Analytics et Offres d’emploi : sous-fonctionnalités du module RH (onglets dans Ressources humaines).
 * - Base documentaire → Archives (vision type Drive : dossiers / partages — en évolution).
 */
const SIDEBAR_ITEMS: { icon: string; labelKey: string; labelFallback: string; view: ModuleName }[] = [
  { icon: 'fas fa-th-large', labelKey: 'dashboard', labelFallback: 'Tableau de bord', view: 'dashboard' },
  { icon: 'fas fa-project-diagram', labelKey: 'projects', labelFallback: 'Projets', view: 'projects' },
  { icon: 'fas fa-calendar-week', labelKey: 'planning', labelFallback: 'Planning', view: 'planning' },
  { icon: 'fas fa-users-cog', labelKey: 'rh', labelFallback: 'Ressources humaines', view: 'rh' },
  { icon: 'fas fa-calculator', labelKey: 'comptabilite', labelFallback: 'Comptabilité', view: 'comptabilite' },
  { icon: 'fas fa-chart-line', labelKey: 'programme', labelFallback: 'Programme & Budget', view: 'programme' },
  { icon: 'fas fa-book-open', labelKey: 'courses', labelFallback: 'Cours', view: 'courses' },
  { icon: 'fas fa-users', labelKey: 'crm_sales', labelFallback: 'CRM & Ventes', view: 'crm_sales' },
  { icon: 'fas fa-clipboard-list', labelKey: 'collecte', labelFallback: 'Collecte de données', view: 'collecte' },
  { icon: 'fas fa-gem', labelKey: 'trinite', labelFallback: 'Trinité', view: 'trinite' },
  { icon: 'fas fa-boxes', labelKey: 'logistique', labelFallback: 'Logistique', view: 'logistique' },
  { icon: 'fas fa-car', labelKey: 'parc_auto', labelFallback: 'Parc automobile', view: 'parc_auto' },
  { icon: 'fas fa-envelope', labelKey: 'messagerie', labelFallback: 'Messagerie', view: 'messagerie' },
  { icon: 'fas fa-ticket-alt', labelKey: 'ticket_it', labelFallback: 'Ticket IT', view: 'ticket_it' },
  { icon: 'fas fa-folder-open', labelKey: 'knowledge_base', labelFallback: 'Archives', view: 'knowledge_base' },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, canAccessModule, permissionsLoading }) => {
  const { t } = useLocalization();
  const { getDisplayName } = useModuleLabels();

  const mainItems = SIDEBAR_ITEMS.filter((item) =>
    item.view === 'comptabilite'
      ? (canAccessModule(item.view) || canAccessModule('finance' as ModuleName))
      : canAccessModule(item.view)
  );
  const allNavItems: { icon: string; labelKey: string; labelFallback: string; view: string }[] = [...mainItems];

  const settingsItem = { icon: 'fas fa-cog', label: t('settings'), view: 'settings' as ModuleName };

  const getLabel = (item: { labelKey: string; labelFallback: string }) => {
    if (item.labelKey === 'rh') return 'Ressources humaines';
    if (item.labelKey === 'collecte') return getDisplayName(item.labelKey) || t(item.labelKey) || 'Collecte de données';
    if (item.labelKey === 'comptabilite') return 'Comptabilité';
    return getDisplayName(item.labelKey) || t(item.labelKey) || item.labelFallback;
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-slate-800 text-white transition-transform duration-200 lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* En-tête minimaliste */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <NexusFlowIcon className="h-8 w-auto opacity-95" />
        <span className="truncate text-sm font-semibold text-white">{t('senegel_workflow_platform')}</span>
      </div>

      {/* Liste unique, épurée */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {permissionsLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : (
          allNavItems.map((item) => (
            <NavLink
              key={item.view}
              icon={item.icon}
              label={getLabel(item)}
              viewName={item.view}
              currentView={currentView}
              setView={setView}
            />
          ))
        )}
      </nav>

      {/* Paramètres en bas */}
      <div className="shrink-0 border-t border-white/10 px-3 py-3">
        {!permissionsLoading && canAccessModule(settingsItem.view) && (
          <NavLink
            icon={settingsItem.icon}
            label={settingsItem.label}
            viewName={settingsItem.view}
            currentView={currentView}
            setView={setView}
          />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
