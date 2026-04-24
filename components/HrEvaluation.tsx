import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import StructuredModulePage from './common/StructuredModulePage';

export interface HrEvaluationProps {
  /** Dans Paramètres : pas de double en-tête (le titre est déjà dans la carte parente). */
  embedded?: boolean;
}

const HrEvaluation: React.FC<HrEvaluationProps> = ({ embedded = false }) => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;

  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-700">
        {isFr
          ? "Ce module est prêt à être branché : on ajoutera les référentiels (KPIs, matrices), puis les écrans d'évaluation et le calcul."
          : 'This module is scaffolded: next we add KPI/matrix referentials, evaluation screens and scoring.'}
      </p>
    </div>
  );

  if (embedded) return body;

  return (
    <StructuredModulePage
      moduleKey="rh_evaluation"
      titleFr="RH — Évaluation"
      titleEn="HR — Evaluation"
      descriptionFr="Prototype : matrices KPI, pondérations et agrégation (présences, projets, trinité, diligence)."
      descriptionEn="Prototype: KPI matrices, weights and aggregated signals (presence, projects, etc.)."
      icon="fas fa-clipboard-list"
    >
      {body}
    </StructuredModulePage>
  );
};

export default HrEvaluation;

