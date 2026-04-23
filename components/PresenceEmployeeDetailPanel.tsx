import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Employee, HrAttendancePolicy, PresenceSession, PresenceStatusEvent } from '../types';
import * as hrAnalyticsService from '../services/hrAnalyticsService';

export type PresenceEmployeeDetailPanelProps = {
  open: boolean;
  onClose: () => void;
  fr: boolean;
  employees: Employee[];
  userIdByProfile: Record<string, string>;
  displayNameByProfileId: Record<string, string>;
  policy: HrAttendancePolicy | null;
  detailSessions: PresenceSession[];
  detailStatusEvents: PresenceStatusEvent[];
  detailLoading: boolean;
  onLoadRange: (fromIso: string, toIso: string) => void;
  initialProfileId?: string;
};

function defaultMonthRange(): { from: string; to: string } {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), 1);
  const end = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  return {
    from: hrAnalyticsService.toLocalDateIso(start),
    to: hrAnalyticsService.toLocalDateIso(end),
  };
}

function defaultWeekRange(): { from: string; to: string } {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: hrAnalyticsService.toLocalDateIso(start), to: hrAnalyticsService.toLocalDateIso(end) };
}

const PresenceEmployeeDetailPanel: React.FC<PresenceEmployeeDetailPanelProps> = ({
  open,
  onClose,
  fr,
  employees,
  userIdByProfile,
  displayNameByProfileId,
  policy,
  detailSessions,
  detailStatusEvents: _detailStatusEvents,
  detailLoading,
  onLoadRange,
  initialProfileId,
}) => {
  void _detailStatusEvents;
  const [{ from: fromIso, to: toIso }, setRange] = useState(defaultMonthRange);
  const [profileId, setProfileId] = useState<string>(() => initialProfileId || employees[0]?.profileId || '');
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (initialProfileId) setProfileId(initialProfileId);
    else setProfileId(employees[0]?.profileId || '');
  }, [initialProfileId, employees]);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const m = defaultMonthRange();
      setRange(m);
      onLoadRange(m.from, m.to);
    }
    prevOpenRef.current = open;
  }, [open, onLoadRange]);

  const orgDailyMinutes = Math.max(1, policy?.expectedDailyMinutes ?? 540);
  const employee = employees.find((e) => String(e.profileId) === String(profileId));
  const dailyTargetSeconds = Math.max(60, (employee?.expectedDailyMinutes ?? orgDailyMinutes) * 60);
  const authUserId = userIdByProfile[profileId] || profileId;
  const displayName = displayNameByProfileId[profileId] || profileId.slice(0, 8);

  const series = useMemo(
    () =>
      hrAnalyticsService.computePresenceDailySeries({
        sessions: detailSessions,
        authUserId,
        startDateIso: fromIso,
        endDateIso: toIso,
        dailyTargetSeconds,
        nowMs: Date.now(),
      }),
    [detailSessions, authUserId, fromIso, toIso, dailyTargetSeconds],
  );

  const rollup = useMemo(() => hrAnalyticsService.summarizePresenceDailySeries(series), [series]);
  const projection = useMemo(() => hrAnalyticsService.projectPeriodCompletionFromDailySeries(series), [series]);

  const chartData = useMemo(
    () =>
      series.map((r) => ({
        day: r.dateIso.slice(8),
        workedH: Math.round((r.workedSeconds / 3600) * 100) / 100,
        targetH: Math.round((r.targetSeconds / 3600) * 100) / 100,
      })),
    [series],
  );

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="relative w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col max-h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">
            {fr ? 'Analyse présence salarié' : 'Employee attendance analysis'}
          </h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1">
            {fr ? 'Fermer' : 'Close'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs text-slate-500">{fr ? 'Salarié' : 'Employee'}</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.profileId}>
                  {displayNameByProfileId[e.profileId] || e.profileId.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
              onClick={() => {
                const w = defaultWeekRange();
                setRange(w);
              }}
            >
              {fr ? 'Semaine en cours' : 'This week'}
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
              onClick={() => {
                const m = defaultMonthRange();
                setRange(m);
              }}
            >
              {fr ? 'Mois en cours' : 'This month'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{fr ? 'Du' : 'From'}</label>
              <input
                type="date"
                value={fromIso}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{fr ? 'Au' : 'To'}</label>
              <input
                type="date"
                value={toIso}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={detailLoading}
            onClick={() => onLoadRange(fromIso, toIso)}
            className="w-full rounded-lg bg-slate-900 text-white text-sm py-2 disabled:opacity-50"
          >
            {detailLoading ? (fr ? 'Chargement…' : 'Loading…') : fr ? 'Charger les données' : 'Load data'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
              <p className="text-[10px] uppercase text-slate-500">{fr ? 'Jours travaillés' : 'Worked days'}</p>
              <p className="text-lg font-semibold text-slate-900">{rollup.workedDayCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
              <p className="text-[10px] uppercase text-slate-500">{fr ? 'Moy. h / jour travaillé' : 'Avg h / worked day'}</p>
              <p className="text-lg font-semibold text-slate-900">{rollup.avgHoursPerWorkedDay.toFixed(1)} h</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
              <p className="text-[10px] uppercase text-slate-500">{fr ? 'Assiduité (plage)' : 'Assiduity (range)'}</p>
              <p className="text-lg font-semibold text-slate-900">{rollup.assiduityPct.toFixed(0)}%</p>
            </div>
            <div className="rounded-lg border border-emerald-100 p-2 bg-emerald-50/80">
              <p className="text-[10px] uppercase text-emerald-800">{fr ? 'Tendance (heuristique)' : 'Trend (heuristic)'}</p>
              <p className="text-lg font-semibold text-emerald-900">
                {projection.projectedAssiduityPct == null ? '—' : `${projection.projectedAssiduityPct.toFixed(0)}%`}
              </p>
              <p className="text-[10px] text-emerald-800 mt-1 leading-tight">
                {fr
                  ? 'Ratio réalisé / cible sur les jours déjà écoulés dans la plage (pas une prévision contractuelle).'
                  : 'Worked vs target on elapsed days in range (not a contractual forecast).'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  hrAnalyticsService.buildPresenceDailySeriesCsv(displayName, series),
                  `presence_journalier_${profileId}_${fromIso}_${toIso}.csv`,
                )
              }
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              {fr ? 'Export CSV (jours)' : 'Export CSV (days)'}
            </button>
          </div>

          <div className="h-56 w-full">
            {chartData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">{fr ? 'Aucune donnée' : 'No data'}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} />
                  <Tooltip formatter={(v: number) => `${v} h`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="workedH" name={fr ? 'Réalisé (h)' : 'Worked (h)'} fill="#0f766e" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="targetH" name={fr ? 'Quota (h)' : 'Target (h)'} fill="#94a3b8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-2 py-2">{fr ? 'Date' : 'Date'}</th>
                  <th className="text-right px-2 py-2">{fr ? 'Réalisé' : 'Worked'}</th>
                  <th className="text-right px-2 py-2">{fr ? 'Quota' : 'Target'}</th>
                  <th className="text-right px-2 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {series.map((r) => (
                  <tr key={r.dateIso} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{r.dateIso}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {hrAnalyticsService.formatWorkedSecondsClockCompact(r.workedSeconds, fr)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-500">
                      {hrAnalyticsService.formatWorkedSecondsClockCompact(r.targetSeconds, fr)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded ${
                          r.ratePct >= 90 ? 'bg-emerald-100 text-emerald-800' : r.ratePct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.ratePct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PresenceEmployeeDetailPanel;
