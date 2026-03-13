import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

const QualiteModule: React.FC = () => (
  <StructuredModulePage
    moduleKey="qualite"
    titleFr="Qualité"
    titleEn="Quality"
    descriptionFr="Indicateurs qualité, processus, audits. Intégration avec le scoring et la Trinité."
    descriptionEn="Quality indicators, processes, audits. Integration with scoring and Trinité."
    icon="fas fa-check-double"
    sections={[{ key: 'q', titleFr: 'Indicateurs', titleEn: 'Indicators', icon: 'fas fa-chart-pie', content: <p className="text-coya-text-muted text-sm">Tableau de bord qualité et processus à venir.</p> }]}
  />
);

export default QualiteModule;
