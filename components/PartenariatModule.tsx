import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import type { ModuleSection } from './common/StructuredModulePage';

/** Phase 4 – Partenariat : gestion des partenaires (complément CRM) */
const PartenariatModule: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;

  const sections: ModuleSection[] = [
    {
      key: 'partenaires',
      titleFr: 'Partenaires',
      titleEn: 'Partners',
      icon: 'fas fa-handshake',
      content: (
        <p className="text-slate-600 text-sm">
          {isFr
            ? 'Gestion des partenaires (bailleurs, ONG, institutions). Convention, durée, domaines de coopération. Liste et fiche partenaire à venir.'
            : 'Partner management (donors, NGOs, institutions). Agreements, duration, cooperation areas. Partner list and records coming soon.'}
        </p>
      ),
    },
  ];

  if (embedded) {
    return (
      <div className="space-y-6">
        {sections.map((sec) => (
          <section key={sec.key} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              {sec.icon && <i className={`${sec.icon} text-slate-600`} />}
              {isFr ? sec.titleFr : sec.titleEn}
            </h2>
            {sec.content}
          </section>
        ))}
      </div>
    );
  }

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
