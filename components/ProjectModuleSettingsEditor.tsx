import React, { useState, useEffect } from 'react';
import { useProjectModuleSettings } from '../hooks/useProjectModuleSettings';
import { TASK_SCORE_PERCENT_EMPLOYEE, TASK_SCORE_PERCENT_MANAGER } from '../types';

const DEFAULT_TYPES = ['Projet interne', 'Client', 'Partenariat', 'Recherche'];
const DEFAULT_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];

const ProjectModuleSettingsEditor: React.FC = () => {
  const { settings, loading, saving, update } = useProjectModuleSettings();
  const [projectTypesText, setProjectTypesText] = useState('');
  const [statusesText, setStatusesText] = useState('');
  const [alertDelayDays, setAlertDelayDays] = useState(3);
  const [taskScorePercent, setTaskScorePercent] = useState(TASK_SCORE_PERCENT_EMPLOYEE);
  const [managerScorePercent, setManagerScorePercent] = useState(TASK_SCORE_PERCENT_MANAGER);
  const [requireJustificationForCompletion, setRequireJustificationForCompletion] = useState(true);
  const [autoFreezeOverdueTasks, setAutoFreezeOverdueTasks] = useState(true);
  const [evaluationStartDate, setEvaluationStartDate] = useState('');

  useEffect(() => {
    if (settings) {
      setProjectTypesText(settings.projectTypes?.join('\n') || DEFAULT_TYPES.join('\n'));
      setStatusesText(settings.statuses?.join('\n') || DEFAULT_STATUSES.join('\n'));
      setAlertDelayDays(settings.alertDelayDays ?? 3);
      setTaskScorePercent(settings.taskScorePercent ?? TASK_SCORE_PERCENT_EMPLOYEE);
      setManagerScorePercent(settings.managerScorePercent ?? TASK_SCORE_PERCENT_MANAGER);
      setRequireJustificationForCompletion(settings.requireJustificationForCompletion !== false);
      setAutoFreezeOverdueTasks(settings.autoFreezeOverdueTasks !== false);
      setEvaluationStartDate(settings.evaluationStartDate ? settings.evaluationStartDate.slice(0, 10) : '');
    }
  }, [settings]);

  const handleSaveTypes = () => {
    const list = projectTypesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) update({ projectTypes: list });
  };

  const handleSaveStatuses = () => {
    const list = statusesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) update({ statuses: list });
  };

  const handleSaveAlertDays = () => {
    const n = Math.max(0, Math.min(30, Number(alertDelayDays)));
    setAlertDelayDays(n);
    update({ alertDelayDays: n });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
        <span>Chargement…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Types de projet, statuts personnalisables et seuil d’alerte de retard (en jours) pour le module Projets.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Types de projet (un par ligne)</label>
        <textarea
          value={projectTypesText}
          onChange={(e) => setProjectTypesText(e.target.value)}
          onBlur={handleSaveTypes}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          rows={4}
          placeholder={DEFAULT_TYPES.join('\n')}
        />
        <p className="text-xs text-gray-500 mt-1">Sauvegardé à la sortie du champ.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Statuts des projets (un par ligne)</label>
        <textarea
          value={statusesText}
          onChange={(e) => setStatusesText(e.target.value)}
          onBlur={handleSaveStatuses}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          rows={5}
          placeholder={DEFAULT_STATUSES.join('\n')}
        />
        <p className="text-xs text-gray-500 mt-1">Sauvegardé à la sortie du champ.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Seuil d’alerte retard (jours)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={30}
            value={alertDelayDays}
            onChange={(e) => setAlertDelayDays(Number(e.target.value))}
            onBlur={handleSaveAlertDays}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-500">jours avant/sans échéance pour alerter</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Sauvegardé à la sortie du champ.</p>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Scoring et règles tâches (Phase 2)</h4>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">% par tâche réalisée (salarié)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={taskScorePercent}
                onChange={(e) => setTaskScorePercent(Number(e.target.value))}
                onBlur={() => update({ taskScorePercent: taskScorePercent })}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">% manager qui clôture</label>
              <input
                type="number"
                min={0}
                max={20}
                value={managerScorePercent}
                onChange={(e) => setManagerScorePercent(Number(e.target.value))}
                onBlur={() => update({ managerScorePercent: managerScorePercent })}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requireJustificationForCompletion}
              onChange={(e) => {
                setRequireJustificationForCompletion(e.target.checked);
                update({ requireJustificationForCompletion: e.target.checked });
              }}
              className="rounded border-gray-300 text-emerald-600"
            />
            <span className="text-sm text-gray-700">Justificatif obligatoire (au moins une pièce jointe) pour marquer « Réalisé »</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoFreezeOverdueTasks}
              onChange={(e) => {
                setAutoFreezeOverdueTasks(e.target.checked);
                update({ autoFreezeOverdueTasks: e.target.checked });
              }}
              className="rounded border-gray-300 text-emerald-600"
            />
            <span className="text-sm text-gray-700">Gel automatique si date/heure planifiée dépassée sans « Réalisé » (déblocage manager)</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date de démarrage des évaluations (scoring)</label>
            <input
              type="date"
              value={evaluationStartDate}
              onChange={(e) => setEvaluationStartDate(e.target.value)}
              onBlur={() => update({ evaluationStartDate: evaluationStartDate.trim() || null })}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Seules les tâches réalisées après cette date comptent pour le score (optionnel).</p>
          </div>
        </div>
      </div>

      {saving && (
        <p className="text-sm text-amber-600">
          <i className="fas fa-spinner fa-spin mr-2" />
          Enregistrement…
        </p>
      )}
    </div>
  );
};

export default ProjectModuleSettingsEditor;
