import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';

/** Phase 6 – Messagerie / Discuss : canaux, conversations, centres d'assistance, appels */
const MessagerieModule: React.FC = () => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;

  const sections = [
    {
      key: 'canaux',
      titleFr: 'Canaux et discussions',
      titleEn: 'Channels and discussions',
      icon: 'fas fa-comments',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Discussions de groupe, canaux généraux, conversations individuelles (user à user). Centres d’assistance par département, équipe ou rôle.'
            : 'Group discussions, general channels, one-to-one conversations. Support centres by department, team or role.'}
        </p>
      ),
    },
    {
      key: 'appels',
      titleFr: 'Appels',
      titleEn: 'Calls',
      icon: 'fas fa-phone-alt',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr ? 'Appels département, groupe ou d’un user à un autre (type Odoo Discuss / Teams).' : 'Calls by department, group or user-to-user (Odoo Discuss / Teams style).'}
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="messagerie"
      titleFr="Messagerie / Discuss"
      titleEn="Messaging / Discuss"
      descriptionFr="Remplacement ou complément du chatbot : canaux, discussions individuelles, centres d’assistance, appels."
      descriptionEn="Replace or complement chatbot: channels, direct discussions, support centres, calls."
      icon="fas fa-envelope"
      sections={sections}
    />
  );
};

export default MessagerieModule;
