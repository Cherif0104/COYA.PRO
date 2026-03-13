import { useState, useEffect, useCallback } from 'react';
import DataService from '../services/dataService';
import { Objective } from '../types';

/** Jours de la semaine (lundi = 0) pour calcul "semaine courante" */
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export interface DashboardAggregates {
  /** Nombre de jours distincts avec au moins une session de présence cette semaine */
  daysWorkedThisWeek: number;
  /** Objectifs en cours (période couvre aujourd'hui, non terminés) */
  objectivesToday: Objective[];
  /** Heures travaillées cette semaine (depuis time_logs) */
  hoursThisWeek: number;
  loading: boolean;
  error: string | null;
}

/**
 * Agrège les données pour le tableau de bord : jours travaillés (présence),
 * objectifs du jour / en cours, heures de la semaine (optionnel via timeLogs passé en paramètre).
 */
export function useDashboardData(
  userId: string | undefined,
  objectives: Objective[] = [],
  timeLogs: { date: string; duration: number; userId: string }[] = []
) {
  const [daysWorkedThisWeek, setDaysWorkedThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPresence = useCallback(async (uid: string) => {
    const now = new Date();
    const { start, end } = getWeekBounds(now);
    const from = start.toISOString();
    const to = end.toISOString();
    const { data, error: err } = await DataService.getPresenceSessions({
      userId: uid,
      from,
      to,
    });
    if (err) {
      setError(err instanceof Error ? err.message : 'Erreur présence');
      return;
    }
    const sessions = data || [];
    const workingStatuses = new Set(['present', 'online', 'in_meeting', 'brief_team', 'away_mission']);
    const dates = new Set<string>();
    sessions.forEach((s) => {
      const started = s.startedAt ? new Date(s.startedAt) : null;
      if (started && workingStatuses.has(s.status)) {
        dates.add(started.toISOString().split('T')[0]);
      }
    });
    setDaysWorkedThisWeek(dates.size);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    loadPresence(userId).finally(() => setLoading(false));
  }, [userId, loadPresence]);

  const today = new Date().toISOString().split('T')[0];
  const objectivesToday = objectives.filter((o) => {
    const start = o.startDate ? new Date(o.startDate).toISOString().split('T')[0] : null;
    const end = o.endDate ? new Date(o.endDate).toISOString().split('T')[0] : null;
    const inPeriod = (!start || start <= today) && (!end || end >= today);
    const notDone = (o.progress ?? 0) < 100;
    return inPeriod && notDone;
  });

  const startOfWeek = getWeekBounds(new Date()).start;
  const hoursThisWeek = timeLogs
    .filter(
      (log) =>
        log.userId === userId &&
        new Date(log.date) >= startOfWeek
    )
    .reduce((sum, log) => sum + log.duration, 0) / 60;

  return {
    daysWorkedThisWeek,
    objectivesToday,
    hoursThisWeek,
    loading,
    error,
  };
}
