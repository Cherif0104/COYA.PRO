import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

/** Phase 4 – Collecte : formulaires, enquêtes, recrutement (rattachés projet/programme) */
const CollecteModule: React.FC = () => {
  const sections = [
    {
      key: 'formulaires',
      titleFr: 'Formulaires et enquêtes',
      titleEn: 'Forms and surveys',
      icon: 'fas fa-clipboard-list',
      content: (
        <p className="text-coya-text-muted text-sm">
          Formulaires de collecte rattachés à un projet, programme ou enquête. Recrutement, sondages, données bénéficiaires. Création et analyse des réponses à venir.
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="collecte"
      titleFr="Collecte & Données"
      titleEn="Data collection"
      descriptionFr="Formulaires de collecte, enquêtes, recrutement. Rattachement projet/programme. Analyse des données."
      descriptionEn="Collection forms, surveys, recruitment. Link to project/programme. Data analysis."
      icon="fas fa-clipboard-list"
      sections={sections}
    />
  );
};

export default CollecteModule;
