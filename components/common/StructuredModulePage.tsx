import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Language } from '../../types';

export interface ModuleSection {
  key: string;
  titleFr: string;
  titleEn: string;
  icon?: string;
  content: React.ReactNode;
}

interface StructuredModulePageProps {
  moduleKey: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  icon?: string;
  sections?: ModuleSection[];
  children?: React.ReactNode;
}

/** Page de module structurée (titre, description, sections) – remplace ModuleHub pour déploiement progressif */
const StructuredModulePage: React.FC<StructuredModulePageProps> = ({
  moduleKey,
  titleFr,
  titleEn,
  descriptionFr,
  descriptionEn,
  icon = 'fas fa-puzzle-piece',
  sections = [],
  children,
}) => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;
  const title = isFr ? titleFr : titleEn;
  const description = isFr ? descriptionFr : descriptionEn;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <i className={`${icon} text-slate-600`} aria-hidden />
          {title}
        </h1>
        <p className="text-slate-600">{description}</p>
      </header>
      {children}
      {sections.length > 0 && (
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
      )}
    </div>
  );
};

export default StructuredModulePage;
