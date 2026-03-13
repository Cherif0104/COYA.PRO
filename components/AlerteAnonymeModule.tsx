import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';

/** Phase 6 – Alerte anonyme : transparence, anticorruption, cellule de crise */
const AlerteAnonymeModule: React.FC = () => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;

  const sections = [
    {
      key: 'protocole',
      titleFr: 'Protocole',
      titleEn: 'Protocol',
      icon: 'fas fa-shield-alt',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Réception alerte → activation cellule de crise / Alerte anonyme. Enquête interne anonyme et confidentielle. Audit plateforme sur les utilisateurs concernés.'
            : 'Alert receipt → crisis cell activation. Anonymous and confidential internal investigation. Platform audit on concerned users.'}
        </p>
      ),
    },
    {
      key: 'contenu',
      titleFr: 'Contenu des alertes',
      titleEn: 'Alert content',
      icon: 'fas fa-file-alt',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Lanceur peut rester anonyme ; désigner le(s) collaborateur(s) présumé(s) ; nature des faits, date, lieu ; pièces jointes (image, vidéo, audio, document).'
            : 'Reporter can stay anonymous; designate presumed staff; nature of facts, date, place; attachments (image, video, audio, document).'}
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="alerte_anonyme"
      titleFr="Alerte anonyme"
      titleEn="Anonymous alert"
      descriptionFr="Transparence, protection des salariés, anticorruption. Alerte anonyme ou nominative, enquête, audit."
      descriptionEn="Transparency, staff protection, anticorruption. Anonymous or named alert, investigation, audit."
      icon="fas fa-exclamation-triangle"
      sections={sections}
    />
  );
};

export default AlerteAnonymeModule;
