import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface ModuleHubProps {
  moduleKey: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  icon?: string;
}

/** Vue hub pour un module (contenu à venir) – aligné 22 modules / 10 départements */
const ModuleHub: React.FC<ModuleHubProps> = ({
  moduleKey,
  titleFr,
  titleEn,
  descriptionFr,
  descriptionEn,
  icon = 'fas fa-puzzle-piece',
}) => {
  const { language } = useLocalization();
  const fr = language === 'fr';
  const title = fr ? titleFr : titleEn;
  const description = fr ? descriptionFr : descriptionEn;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-coya-text mb-2 flex items-center gap-3">
        <i className={`${icon} text-coya-primary`}></i>
        {title}
      </h1>
      <p className="text-coya-text-muted mb-6">{description}</p>
      <div className="bg-coya-card rounded-lg shadow-coya border border-coya-border p-8 text-center">
        <p className="text-coya-text-muted italic">
          {fr ? 'Contenu du module en cours de déploiement. Les droits d\'accès sont gérés dans Paramètres > Administration.' : 'Module content coming soon. Access rights are managed in Settings > Administration.'}
        </p>
      </div>
    </div>
  );
};

export default ModuleHub;
