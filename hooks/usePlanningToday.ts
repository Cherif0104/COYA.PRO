import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import DataAdapter from '../services/dataAdapter';
import { PlanningSlot } from '../types';

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function usePlanningToday() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user?.id) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = toYMD(new Date());
    DataAdapter.getPlanningSlots({ dateFrom: today, dateTo: today, userId: user.id })
      .then(setSlots)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { slots, loading, reload: load };
}
