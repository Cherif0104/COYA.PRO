import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

const TechModule: React.FC = () => (
  <StructuredModulePage
    moduleKey="tech"
    titleFr="Tech / IT"
    titleEn="Tech / IT"
    descriptionFr="Infrastructure, déploiements, suivi technique. Lié au module Ticket IT pour les demandes utilisateurs."
    descriptionEn="Infrastructure, deployments, technical follow-up. Linked to Ticket IT for user requests."
    icon="fas fa-laptop-code"
    sections={[{ key: 't', titleFr: 'Infrastructure', titleEn: 'Infrastructure', icon: 'fas fa-server', content: <p className="text-coya-text-muted text-sm">État des services et interventions à venir.</p> }]}
  />
);

export default TechModule;
