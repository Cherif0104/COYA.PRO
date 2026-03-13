import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

const JuridiqueModule: React.FC = () => (
  <StructuredModulePage
    moduleKey="juridique"
    titleFr="Juridique"
    titleEn="Legal"
    descriptionFr="Contrats, conformité, contentieux. Gestion des documents et échéances juridiques."
    descriptionEn="Contracts, compliance, litigation. Legal documents and deadlines."
    icon="fas fa-gavel"
    sections={[{ key: 'j', titleFr: 'Contrats et conformité', titleEn: 'Contracts & compliance', icon: 'fas fa-file-signature', content: <p className="text-coya-text-muted text-sm">Base documentaire et alertes échéances à venir.</p> }]}
  />
);

export default JuridiqueModule;
