import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';

/** Trinité : scoring Ndiguel, Yar, Barké – évaluations trimestrielles / annuelles */
const TriniteModule: React.FC = () => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;

  const sections = [
    {
      key: 'scoring',
      titleFr: 'Scoring Trinité',
      titleEn: 'Trinité scoring',
      icon: 'fas fa-gem',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Ndiguel, Yar, Barké. La moyenne détermine les évaluations trimestrielles, semestrielles, annuelles. Matrice déterminée par algorithme.'
            : 'Ndiguel, Yar, Barké. Average determines quarterly, semi-annual, annual evaluations. Matrix by algorithm.'}
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="trinite"
      titleFr="Trinité"
      titleEn="Trinité"
      descriptionFr="Scoring Ndiguel, Yar, Barké. Intégration aux indicateurs et évaluations."
      descriptionEn="Scoring Ndiguel, Yar, Barké. Integration with indicators and evaluations."
      icon="fas fa-gem"
      sections={sections}
    />
  );
};

export default TriniteModule;
