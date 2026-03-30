import { useState, useEffect, useCallback } from 'react';
import DataAdapter from '../services/dataAdapter';
import { ProjectModuleSettings } from '../types';

export function useProjectModuleSettings() {
  const [settings, setSettings] = useState<ProjectModuleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await DataAdapter.getProjectModuleSettings();
      setSettings(data);
    } catch (e) {
      console.error('useProjectModuleSettings load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<Pick<ProjectModuleSettings, 'projectTypes' | 'statuses' | 'alertDelayDays' | 'taskTemplates' | 'taskScorePercent' | 'managerScorePercent' | 'requireJustificationForCompletion' | 'autoFreezeOverdueTasks' | 'evaluationStartDate' | 'leavePendingSlaDays' | 'budgetWarningPercent' | 'budgetCriticalPercent' | 'objectiveOffTrackGapPercent'>>) => {
      setSaving(true);
      setSettings((prev) => (prev ? { ...prev, ...patch } : null));
      try {
        const updated = await DataAdapter.upsertProjectModuleSettings(patch);
        if (updated) setSettings(updated);
      } catch (e) {
        console.error('useProjectModuleSettings update:', e);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { settings, loading, saving, update, reload: load };
}
