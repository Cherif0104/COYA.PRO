/**
 * Registre des vues (view name → composant) pour le routage principal.
 * Intégration dans l'App : utiliser <ViewRouter currentView={currentView}>{fallback}</ViewRouter>
 * ou : const Module = getModuleViewComponent(currentView); if (Module) return <Module />;
 */
import React from 'react';
import ProgrammeModule from './components/ProgrammeModule';
import CollecteModule from './components/CollecteModule';
import TechModule from './components/TechModule';
import TriniteModule from './components/TriniteModule';
import LogistiqueModule from './components/LogistiqueModule';
import ParcAutoModule from './components/ParcAutoModule';
import TicketITModule from './components/TicketITModule';
import MessagerieModule from './components/MessagerieModule';
export type ViewName = string;

const MODULE_VIEWS: Record<string, React.ComponentType<{}>> = {
  programme: ProgrammeModule,
  collecte: CollecteModule,
  tech: TechModule,
  trinite: TriniteModule,
  logistique: LogistiqueModule,
  parc_auto: ParcAutoModule,
  ticket_it: TicketITModule,
  messagerie: MessagerieModule,
};

/**
 * Retourne le composant à afficher pour une vue donnée, ou null si géré ailleurs (dashboard, projects, etc.).
 * Usage dans le routeur principal (App ou équivalent) :
 *   const ModuleComponent = getModuleViewComponent(currentView);
 *   if (ModuleComponent) return <ModuleComponent />;
 *   // sinon : switch (currentView) { case 'dashboard': return <Dashboard />; ... }
 */
export function getModuleViewComponent(viewName: ViewName): React.ComponentType<{}> | null {
  return MODULE_VIEWS[viewName] ?? null;
}

/** Composant à utiliser dans le layout : rend le module du registre si la vue correspond, sinon children (switch existant). */
export const ViewRouter: React.FC<{ currentView: string; children: React.ReactNode }> = ({ currentView, children }) => {
  const ModuleComponent = getModuleViewComponent(currentView);
  if (ModuleComponent) return <ModuleComponent />;
  return <>{children}</>;
};

/** Labels pour les modules du registre (fallback si useModuleLabels non dispo) */
export const MODULE_LABELS: Record<string, { fr: string; en: string }> = {
  programme: { fr: 'Programme & Bailleur', en: 'Programme & Donor' },
  comptabilite: { fr: 'Comptabilité', en: 'Accounting' },
  collecte: { fr: 'Collecte de données', en: 'Data collection' },
  tech: { fr: 'Tech / IT', en: 'Tech / IT' },
  trinite: { fr: 'Trinité', en: 'Trinité' },
  logistique: { fr: 'Logistique', en: 'Logistics' },
  parc_auto: { fr: 'Parc automobile', en: 'Fleet management' },
  ticket_it: { fr: 'Ticket IT', en: 'IT Ticket' },
  messagerie: { fr: 'Messagerie / Discuss', en: 'Messaging / Discuss' },
};
