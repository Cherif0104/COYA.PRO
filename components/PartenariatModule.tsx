import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

/** Phase 4 – Partenariat : gestion des partenaires (complément CRM) */
const PartenariatModule: React.FC = () => {
  const sections = [
    {
      key: 'partenaires',
      titleFr: 'Partenaires',
      titleEn: 'Partners',
      icon: 'fas fa-handshake',
      content: (
        <p className="text-coya-text-muted text-sm">
          Gestion des partenaires (bailleurs, ONG, institutions). Convention, durée, domaines de coopération. Liste et fiche partenaire à venir.
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="partenariat"
      titleFr="Partenariat"
      titleEn="Partnership"
      descriptionFr="Gestion des partenariats : bailleurs, ONG, institutions. Conventions, suivi des accords."
      descriptionEn="Partnership management: donors, NGOs, institutions. Agreements, follow-up."
      icon="fas fa-handshake"
      sections={sections}
    />
  );
};

export default PartenariatModule;
