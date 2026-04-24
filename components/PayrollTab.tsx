import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { User, Employee } from '../types';
import * as payrollService from '../services/payrollService';
import type { PaySlip } from '../services/payrollService';
import PayrollMatrix from './PayrollMatrix';

interface PayrollTabProps {
  users: User[];
  employees?: Employee[];
  /** Période comptable paie (alignée politique RH) — requise pour la matrice */
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  canWriteRh?: boolean;
}

const PayrollTab: React.FC<PayrollTabProps> = ({
  users,
  employees = [],
  periodStart,
  periodEnd,
  periodLabel,
  canWriteRh = true,
}) => {
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [slips, setSlips] = useState<PaySlip[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [matrixRefresh, setMatrixRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    profileId: '',
    periodStart: '',
    periodEnd: '',
    grossAmount: 0,
    netAmount: 0,
    currencyCode: 'XOF',
    notes: '',
  });
  const [simulationInfo, setSimulationInfo] = useState<string>('');

  const loadList = useCallback(async () => {
    setListLoading(true);
    const list = await payrollService.listPaySlips();
    setSlips(list);
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (showForm && periodStart && periodEnd) {
      setForm((f) => ({ ...f, periodStart, periodEnd }));
    }
  }, [showForm, periodStart, periodEnd]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profileId || !form.periodStart || !form.periodEnd) {
      alert(fr ? 'Profil et période obligatoires.' : 'Profile and period required.');
      return;
    }
    const comp = await payrollService.computePayrollForProfilePeriod(
      form.profileId,
      form.periodStart,
      form.periodEnd
    );
    const lines = comp?.lines?.length ? comp.lines : [];
    const gross = comp?.grossAmount ?? form.grossAmount;
    const net = comp?.netAmount ?? form.netAmount;
    const created = await payrollService.createPaySlipWithLines({
      profileId: form.profileId,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      grossAmount: gross,
      netAmount: net,
      currencyCode: form.currencyCode,
      notes: form.notes || undefined,
      lines,
    });
    if (created) {
      setSlips((prev) => [created, ...prev]);
      setMatrixRefresh((n) => n + 1);
      setShowForm(false);
      setForm({
        profileId: '',
        periodStart: periodStart,
        periodEnd: periodEnd,
        grossAmount: 0,
        netAmount: 0,
        currencyCode: 'XOF',
        notes: '',
      });
    } else {
      alert(fr ? 'Erreur lors de la création du bulletin.' : 'Error creating pay slip.');
    }
  };

  const handleAutoCompute = async () => {
    if (!form.profileId || !form.periodStart || !form.periodEnd) {
      alert(fr ? 'Sélectionnez salarié + période.' : 'Select employee + period.');
      return;
    }
    const comp = await payrollService.computePayrollForProfilePeriod(
      form.profileId,
      form.periodStart,
      form.periodEnd
    );
    const sim = await payrollService.simulatePaySlipFromAttendance(form.profileId, form.periodStart, form.periodEnd);
    if (!comp || !sim) {
      setSimulationInfo(fr ? 'Aucune simulation disponible pour cette période.' : 'No simulation available for this period.');
      return;
    }
    setForm((f) => ({
      ...f,
      grossAmount: Number(comp.grossAmount.toFixed(2)),
      netAmount: Number(comp.netAmount.toFixed(2)),
      notes: `${fr ? 'Simulation présence + rubriques SN (indicatif)' : 'Attendance + indicative SN rubrics'}: ${sim.payableHours.toFixed(2)}h, ${fr ? 'retards' : 'delays'} ${sim.delayMinutes} min, ${fr ? 'absences NA' : 'unauthorized absences'} ${sim.unauthorizedAbsenceMinutes} min.`,
    }));
    setSimulationInfo(
      `${fr ? 'Calcul auto' : 'Auto computed'}: ${sim.payableHours.toFixed(2)}h × ${sim.hourlyRate.toLocaleString()} → ${fr ? 'net indicatif' : 'indicative net'} ${comp.netAmount.toLocaleString()} ${form.currencyCode}.`
    );
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'validated' | 'paid') => {
    const ok = await payrollService.updatePaySlipStatus(id, status);
    if (ok) {
      await loadList();
      setMatrixRefresh((n) => n + 1);
    }
  };

  const usersWithProfile = users.filter((u) => (u as any).profileId);
  const getDisplayName = (profileId: string) => {
    const u = usersWithProfile.find((u) => String((u as any).profileId) === String(profileId));
    return u?.name || u?.fullName || (u as any)?.email || profileId?.slice(0, 8) || '—';
  };

  return (
    <div className="space-y-8">
      <PayrollMatrix
        key={`${periodStart}-${periodEnd}-${matrixRefresh}`}
        users={users}
        employees={employees}
        periodStart={periodStart}
        periodEnd={periodEnd}
        periodLabel={periodLabel}
        canWrite={canWriteRh}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Bulletins de paie' : 'Pay slips'}</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          {fr ? 'Nouveau bulletin' : 'New pay slip'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{fr ? 'Créer un bulletin' : 'Create pay slip'}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{fr ? 'Salarié' : 'Employee'}</label>
              <select
                value={form.profileId}
                onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400"
                required
              >
                <option value="">— {fr ? 'Choisir un salarié' : 'Select employee'} —</option>
                {employees.length > 0
                  ? employees
                      .filter((e) => e.profileId)
                      .map((e) => {
                        const profileId = String(e.profileId!);
                        return (
                          <option key={e.id || profileId} value={profileId}>
                            {getDisplayName(profileId)}
                          </option>
                        );
                      })
                  : usersWithProfile.map((u) => (
                      <option key={u.id} value={(u as any).profileId}>
                        {u.name || u.email}
                      </option>
                    ))}
              </select>
              {employees.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {fr ? 'Seuls les salariés avec fiche peuvent avoir un bulletin.' : 'Only employees with a record can have a pay slip.'}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{fr ? 'Début période' : 'Period start'}</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{fr ? 'Fin période' : 'Period end'}</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{fr ? 'Brut' : 'Gross'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.grossAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, grossAmount: Number(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{fr ? 'Net' : 'Net'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.netAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, netAmount: Number(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{fr ? 'Devise' : 'Currency'}</label>
              <select
                value={form.currencyCode}
                onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400"
              >
                <option value="XOF">XOF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800">
              {fr ? 'Créer' : 'Create'}
            </button>
            <button
              type="button"
              onClick={handleAutoCompute}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              {fr ? 'Auto-calcul présence' : 'Auto-calc attendance'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              {fr ? 'Annuler' : 'Cancel'}
            </button>
          </div>
          {simulationInfo && <p className="text-xs text-slate-600">{simulationInfo}</p>}
        </form>
      )}

      {listLoading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          <span>{fr ? 'Chargement des bulletins…' : 'Loading pay slips…'}</span>
        </div>
      ) : slips.length === 0 ? (
        <p className="text-slate-500">{fr ? 'Aucun bulletin. Créez-en un pour commencer.' : 'No pay slips. Create one to start.'}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">{fr ? 'Période' : 'Period'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">{fr ? 'Brut' : 'Gross'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">{fr ? 'Net' : 'Net'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">{fr ? 'Statut' : 'Status'}</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">{fr ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {slips.map((s) => {
                const userName = getDisplayName(s.profileId);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-sm">
                      <div>{userName}</div>
                      <div className="text-xs text-gray-500">
                        {s.periodStart} → {s.periodEnd}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.grossAmount.toLocaleString()} {s.currencyCode}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.netAmount.toLocaleString()} {s.currencyCode}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          s.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'validated'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status === 'draft'
                          ? fr
                            ? 'Brouillon'
                            : 'Draft'
                          : s.status === 'validated'
                            ? fr
                              ? 'Validé'
                              : 'Validated'
                            : fr
                              ? 'Payé'
                              : 'Paid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {s.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'validated')}
                          className="mr-2 font-medium text-slate-600 hover:text-slate-900"
                        >
                          {fr ? 'Valider' : 'Validate'}
                        </button>
                      )}
                      {s.status === 'validated' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'paid')}
                          className="font-medium text-emerald-600 hover:text-emerald-800"
                        >
                          {fr ? 'Marquer payé' : 'Mark paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PayrollTab;
