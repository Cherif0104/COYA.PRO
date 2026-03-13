import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

const ConseilModule: React.FC = () => (
  <StructuredModulePage
    moduleKey="conseil"
    titleFr="Conseil"
    titleEn="Consulting"
    descriptionFr="Missions conseil, accompagnement, livrables. Suivi des mandats et rapports."
    descriptionEn="Consulting missions, support, deliverables. Mandate and report tracking."
    icon="fas fa-comments"
    sections={[{ key: 'c', titleFr: 'Missions', titleEn: 'Missions', icon: 'fas fa-briefcase', content: <p className="text-coya-text-muted text-sm">Catalogue des missions et suivi à venir.</p> }]}
  />
);

export default ConseilModule;
