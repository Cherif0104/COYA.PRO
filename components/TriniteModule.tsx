import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import { useAppNavigation } from '../contexts/AppNavigationContext';
import OrganizationService from '../services/organizationService';
import DataAdapter from '../services/dataAdapter';
import * as triniteService from '../services/triniteService';
import { useAuth } from '../contexts/AuthContextSupabase';
import { supabase } from '../services/supabaseService';
import { DataService } from '../services/dataService';

/** Trinité : scoring Ndiguel, Yar, Barké – liens vers RH et parc pour alimenter les indicateurs */
const TriniteModule: React.FC = () => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;
  const nav = useAppNavigation();
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState<Awaited<ReturnType<typeof triniteService.listTriniteScores>>>([]);
  const [loading, setLoading] = useState(false);
  const [myProfileId, setMyProfileId] = useState('');
  const [selfNote, setSelfNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const isManager = useMemo(
    () => ['super_administrator', 'administrator', 'manager'].includes(String((user as any)?.role || '')),
    [user],
  );

  useEffect(() => {
    OrganizationService.getCurrentUserOrganizationId().then((id) => setOrganizationId(id ?? null));
  }, []);

  useEffect(() => {
    const uid = String((user as any)?.id || user?.id || '');
    if (!uid) return;
    (async () => {
      const { data } = await DataService.getProfile(uid);
      let pid = String((user as any)?.profileId || data?.id || '');
      if (!pid) {
        const { data: row } = await supabase.from('profiles').select('id').eq('user_id', uid).maybeSingle();
        if (row?.id) pid = String(row.id);
      }
      setMyProfileId(pid);
    })();
  }, [user]);

  useEffect(() => {
    if (!organizationId || !myProfileId) return;
    triniteService.getTriniteSelfNote(organizationId, myProfileId, periodStart, periodEnd).then((n) => setSelfNote(n || ''));
  }, [organizationId, myProfileId, periodStart, periodEnd]);

  const loadScores = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const list = await triniteService.listTriniteScores(organizationId, periodStart, periodEnd);
      setScores(list);
    } finally {
      setLoading(false);
    }
  }, [organizationId, periodStart, periodEnd]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const recompute = useCallback(async () => {
    if (!organizationId || !isManager) return;
    setLoading(true);
    try {
      const employees = await DataAdapter.listEmployees(organizationId);
      const sessions = await DataAdapter.getPresenceSessions({ organizationId, from: `${periodStart}T00:00:00Z`, to: `${periodEnd}T23:59:59Z` });
      const projects = await DataAdapter.getProjects();
      const objectives = await DataAdapter.getObjectives();
      const profileIds = employees.map((e) => e.profileId).filter(Boolean);
      const { data: profileRows } = profileIds.length > 0
        ? await supabase.from('profiles').select('id,user_id').in('id', profileIds)
        : { data: [] as any[] };
      const profileToAuthUser = new Map<string, string>((profileRows || []).map((r: any) => [String(r.id), String(r.user_id)]));
      for (const employee of employees) {
        const profileId = employee.profileId;
        const authUserId = profileToAuthUser.get(profileId) || '';
        const relatedProjects = projects.filter((p) => p.teamMemberIds?.includes(profileId));
        const totalTasks = relatedProjects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
        const completedTasks = relatedProjects.reduce((acc, p) => acc + (p.tasks?.filter((t) => t.status === 'completed').length || 0), 0);
        const relatedObjectives = objectives.filter((o) => (o.ownerId || '') === profileId);
        const objectivesDone = relatedObjectives.filter((o) => (o.progress || 0) >= 100).length;
        const built = triniteService.buildTriniteScore({
          organizationId,
          profileId,
          periodStart,
          periodEnd,
          presenceSessions: sessions.filter((s) => s.userId === authUserId),
          completedTasks,
          totalTasks,
          objectivesDone,
          objectivesTotal: relatedObjectives.length,
          qualityIncidents: Math.max(0, totalTasks - completedTasks > 4 ? 1 : 0),
          generatedById: user?.id || null,
        });
        await triniteService.upsertTriniteScore(built);
      }
      await loadScores();
    } finally {
      setLoading(false);
    }
  }, [organizationId, periodStart, periodEnd, user?.id, loadScores, isManager]);

  const top = useMemo(() => scores.slice(0, 3), [scores]);
  const myScore = useMemo(() => scores.find((s) => s.profileId === myProfileId) || null, [scores, myProfileId]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-900">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <i className="fas fa-gem text-slate-600" />
          Trinité
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {isFr
            ? 'Ndiguel, Yar, Barké : la moyenne sert aux évaluations trimestrielles, semestrielles ou annuelles. Les données RH et le parc automobile peuvent nourrir les indicateurs.'
            : 'Ndiguel, Yar, Barké: averages feed quarterly, semi-annual, or annual reviews. HR and fleet data can feed indicators.'}
        </p>
      </header>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{isFr ? 'Période' : 'Period'}</span>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <span className="text-slate-500">→</span>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <i className="fas fa-user text-slate-600" />
            {isFr ? 'Ma fiche' : 'My record'}
          </h2>
          {!myProfileId ? (
            <p className="text-sm text-slate-500">{isFr ? 'Profil non résolu.' : 'Profile not resolved.'}</p>
          ) : myScore ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Ndiguel</p>
                <p className="text-lg font-semibold">{myScore.ndiguelScore.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Yar</p>
                <p className="text-lg font-semibold">{myScore.yarScore.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Barké</p>
                <p className="text-lg font-semibold">{myScore.barkeScore.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-700">{isFr ? 'Global' : 'Global'}</p>
                <p className="text-lg font-semibold text-emerald-900">{myScore.globalScore.toFixed(1)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 mb-4">{isFr ? 'Pas encore de score calculé pour vous sur cette période.' : 'No score computed for you on this period yet.'}</p>
          )}
          <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Commentaire / auto-évaluation' : 'Self-assessment note'}</label>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] mb-2"
            value={selfNote}
            onChange={(e) => setSelfNote(e.target.value)}
            placeholder={isFr ? 'Votre retour sur la période…' : 'Your feedback on the period…'}
          />
          <button
            type="button"
            disabled={!organizationId || !myProfileId || savingNote}
            onClick={async () => {
              if (!organizationId || !myProfileId) return;
              setSavingNote(true);
              try {
                await triniteService.upsertTriniteSelfNote({
                  organizationId,
                  profileId: myProfileId,
                  periodStart,
                  periodEnd,
                  note: selfNote.trim() || null,
                });
              } finally {
                setSavingNote(false);
              }
            }}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50"
          >
            {savingNote ? '…' : (isFr ? 'Enregistrer ma note' : 'Save my note')}
          </button>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <i className="fas fa-chart-line text-slate-600" />
            {isFr ? 'Connexions métier' : 'Business connections'}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {isFr
              ? 'Ouvrez les modules sources pour alimenter ou consolider le scoring Trinité.'
              : 'Open the source modules to feed or consolidate Trinité scoring.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => nav?.setView('rh')}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50"
            >
              <i className="fas fa-users-cog mr-2" />
              {isFr ? 'Ressources humaines' : 'Human resources'}
            </button>
            <button
              type="button"
              onClick={() => nav?.setView('parc_auto')}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50"
            >
              <i className="fas fa-car mr-2" />
              {isFr ? 'Parc automobile' : 'Fleet'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <i className="fas fa-calculator text-slate-600" />
            {isFr ? 'Scores Trinité' : 'Trinity scores'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {isManager && (
              <button type="button" onClick={recompute} disabled={loading || !organizationId} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50">
                {loading ? (isFr ? 'Calcul…' : 'Computing…') : (isFr ? 'Recalculer les scores' : 'Recompute scores')}
              </button>
            )}
          </div>
          {!isManager && (
            <p className="text-xs text-slate-500 mb-3">{isFr ? 'Le recalcul global est réservé aux managers / administrateurs.' : 'Global recompute is limited to managers / administrators.'}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {top.map((score) => (
              <div key={score.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs uppercase text-emerald-700">{isFr ? 'Top score' : 'Top score'}</p>
                <p className="text-xl font-semibold text-slate-900">{score.globalScore.toFixed(1)}</p>
                <p className="text-xs text-slate-500">{score.profileId.slice(0, 8)}</p>
              </div>
            ))}
            {top.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 col-span-full">
                {isFr ? 'Aucun score pour la période. Lancez un recalcul.' : 'No score for this period. Run recompute.'}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-2">
            {isFr
              ? 'Le tableau respecte vos droits : les membres ne voient que leur ligne ; les managers voient l’équipe.'
              : 'The table follows your permissions: members see only their row; managers see the team.'}
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">{isFr ? 'Profil' : 'Profile'}</th>
                  <th className="text-right px-4 py-3">Ndiguel</th>
                  <th className="text-right px-4 py-3">Yar</th>
                  <th className="text-right px-4 py-3">Barké</th>
                  <th className="text-right px-4 py-3">{isFr ? 'Global' : 'Global'}</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score) => (
                  <tr key={score.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{score.profileId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-right font-mono">{score.ndiguelScore.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono">{score.yarScore.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono">{score.barkeScore.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{score.globalScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TriniteModule;
