import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { User, Employee } from '../types';
import * as payrollService from '../services/payrollService';
import type { PaySlip } from '../services/payrollService';

interface PayrollTabProps {
  users: User[];
  employees?: Employee[];
}

const PayrollTab: React.FC<PayrollTabProps> = ({ users, employees = [] }) => {
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [slips, setSlips] = useState<PaySlip[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = async () => {
    setLoading(true);
    const list = await payrollService.listPaySlips();
    setSlips(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profileId || !form.periodStart || !form.periodEnd) {
      alert(fr ? 'Profil et période obligatoires.' : 'Profile and period required.');
      return;
    }
    const created = await payrollService.createPaySlip({
      profileId: form.profileId,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      grossAmount: form.grossAmount,
      netAmount: form.netAmount,
      currencyCode: form.currencyCode,
      notes: form.notes || undefined,
    });
    if (created) {
      setSlips((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ profileId: '', periodStart: '', periodEnd: '', grossAmount: 0, netAmount: 0, currencyCode: 'XOF', notes: '' });
    } else {
      alert(fr ? 'Erreur lors de la création du bulletin.' : 'Error creating pay slip.');
    }
  };

  const handleAutoCompute = async () => {
    if (!form.profileId || !form.periodStart || !form.periodEnd) {
      alert(fr ? 'Sélectionnez salarié + période.' : 'Select employee + period.');
      return;
    }
    const sim = await payrollService.simulatePaySlipFromAttendance(form.profileId, form.periodStart, form.periodEnd);
    if (!sim) {
      setSimulationInfo(fr ? 'Aucune simulation disponible pour cette période.' : 'No simulation available for this period.');
      return;
    }
    setForm((f) => ({
      ...f,
      grossAmount: Number(sim.grossAmount.toFixed(2)),
      netAmount: Number(sim.netAmount.toFixed(2)),
      notes: `${fr ? 'Simulation présence' : 'Attendance simulation'}: ${sim.payableHours.toFixed(2)}h, ${fr ? 'retards' : 'delays'} ${sim.delayMinutes} min, ${fr ? 'absences NA' : 'unauthorized absences'} ${sim.unauthorizedAbsenceMinutes} min.`,
    }));
    setSimulationInfo(
      `${fr ? 'Calcul auto' : 'Auto computed'}: ${sim.payableHours.toFixed(2)}h × ${sim.hourlyRate.toLocaleString()} = ${sim.netAmount.toLocaleString()} ${form.currencyCode}.`
    );
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'validated' | 'paid') => {
    const ok = await payrollService.updatePaySlipStatus(id, status);
    if (ok) load();
  };

  const usersWithProfile = users.filter((u) => (u as any).profileId);
  const getDisplayName = (profileId: string) => {
    const u = usersWithProfile.find((u) => String((u as any).profileId) === String(profileId));
    return u?.name || u?.fullName || (u as any)?.email || profileId?.slice(0, 8) || '—';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent" />
        <span>{fr ? 'Chargement des bulletins…' : 'Loading pay slips…'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{fr ? 'Bulletins de paie' : 'Pay slips'}</h2>
        <button type="button" onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800">
          {fr ? 'Nouveau bulletin' : 'New pay slip'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
          <h3 className="font-semibold text-slate-900">{fr ? 'Créer un bulletin' : 'Create pay slip'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Salarié' : 'Employee'}</label>
              <select
                value={form.profileId}
                onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                required
              >
                <option value="">— {fr ? 'Choisir un salarié' : 'Select employee'} —</option>
                {employees.length > 0
                  ? employees.filter((e) => e.profileId).map((e) => {
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
                <p className="text-xs text-slate-500 mt-1">{fr ? 'Seuls les salariés avec fiche peuvent avoir un bulletin.' : 'Only employees with a record can have a pay slip.'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Début période' : 'Period start'}</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Fin période' : 'Period end'}</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Brut' : 'Gross'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.grossAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, grossAmount: Number(e.target.value) || 0 }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Net' : 'Net'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.netAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, netAmount: Number(e.target.value) || 0 }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Devise' : 'Currency'}</label>
              <select
                value={form.currencyCode}
                onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
              >
                <option value="XOF">XOF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800">{fr ? 'Créer' : 'Create'}</button>
            <button type="button" onClick={handleAutoCompute} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-100">{fr ? 'Auto-calcul présence' : 'Auto-calc attendance'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100">{fr ? 'Annuler' : 'Cancel'}</button>
          </div>
          {simulationInfo && <p className="text-xs text-slate-600">{simulationInfo}</p>}
        </form>
      )}

      {slips.length === 0 ? (
        <p className="text-slate-500">{fr ? 'Aucun bulletin. Créez-en un pour commencer.' : 'No pay slips. Create one to start.'}</p>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{fr ? 'Période' : 'Period'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{fr ? 'Brut' : 'Gross'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{fr ? 'Net' : 'Net'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{fr ? 'Statut' : 'Status'}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{fr ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
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
                    <td className="px-4 py-3 text-sm">{s.grossAmount.toLocaleString()} {s.currencyCode}</td>
                    <td className="px-4 py-3 text-sm">{s.netAmount.toLocaleString()} {s.currencyCode}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : s.status === 'validated' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.status === 'draft' ? (fr ? 'Brouillon' : 'Draft') : s.status === 'validated' ? (fr ? 'Validé' : 'Validated') : (fr ? 'Payé' : 'Paid')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {s.status === 'draft' && (
                        <button type="button" onClick={() => handleStatusChange(s.id, 'validated')} className="text-slate-600 hover:text-slate-900 font-medium mr-2">{fr ? 'Valider' : 'Validate'}</button>
                      )}
                      {s.status === 'validated' && (
                        <button type="button" onClick={() => handleStatusChange(s.id, 'paid')} className="text-emerald-600 hover:text-emerald-800 font-medium">{fr ? 'Marquer payé' : 'Mark paid'}</button>
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
