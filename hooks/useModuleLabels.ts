import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { getModuleLabels, getDisplayName as getDisplayNameFromList, ModuleLabelDisplay } from '../services/moduleLabelsService';
import { supabase } from '../services/supabaseService';

export function useModuleLabels(): {
  labels: ModuleLabelDisplay[];
  loading: boolean;
  getDisplayName: (moduleKey: string) => string | null;
} {
  const { user } = useAuth();
  const { language } = useLocalization();
  const [labels, setLabels] = useState<ModuleLabelDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    if (!user?.id) return [];
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', user.id).single();
    const orgId = (profile as any)?.organization_id ?? null;
    return getModuleLabels(orgId);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) {
        setLabels([]);
        setLoading(false);
        return;
      }
      try {
        const list = await fetchLabels();
        if (!cancelled) setLabels(list);
      } catch (e) {
        if (!cancelled) setLabels([]);
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id, fetchLabels]);

  useEffect(() => {
    const onReload = () => fetchLabels().then(setLabels);
    window.addEventListener('module-labels-reload', onReload);
    return () => window.removeEventListener('module-labels-reload', onReload);
  }, [fetchLabels]);

  const getDisplayName = useCallback(
    (moduleKey: string) => getDisplayNameFromList(labels, moduleKey, language === 'fr' ? 'fr' : 'en'),
    [labels, language]
  );

  return { labels, loading, getDisplayName };
}
