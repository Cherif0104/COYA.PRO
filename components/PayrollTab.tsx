import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { User } from '../types';
import * as payrollService from '../services/payrollService';
import type { PaySlip } from '../services/payrollService';

interface PayrollTabProps {
  users: User[];
}

const PayrollTab: React.FC<PayrollTabProps> = ({ users }) => {
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

  const handleStatusChange = async (id: string, status: 'draft' | 'validated' | 'paid') => {
    const ok = await payrollService.updatePaySlipStatus(id, status);
    if (ok) load();
  };

  const usersWithProfile = users.filter((u) => (u as any).profileId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
        <span>{fr ? 'Chargement des bulletins...' : 'Loading pay slips...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-coya-text">{fr ? 'Bulletins de paie' : 'Pay slips'}</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
        >
          {fr ? 'Nouveau bulletin' : 'New pay slip'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
          <h3 className="font-semibold text-gray-900">{fr ? 'Créer un bulletin' : 'Create pay slip'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Salarié' : 'Employee'}</label>
              <select
                value={form.profileId}
                onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">— {fr ? 'Choisir' : 'Select'} —</option>
                {usersWithProfile.map((u) => (
                  <option key={u.id} value={(u as any).profileId}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Début période' : 'Period start'}</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Fin période' : 'Period end'}</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Brut' : 'Gross'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.grossAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, grossAmount: Number(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Net' : 'Net'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.netAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, netAmount: Number(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Devise' : 'Currency'}</label>
              <select
                value={form.currencyCode}
                onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="XOF">XOF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              {fr ? 'Créer' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              {fr ? 'Annuler' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {slips.length === 0 ? (
        <p className="text-gray-500">{fr ? 'Aucun bulletin. Créez-en un pour commencer.' : 'No pay slips. Create one to start.'}</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Période' : 'Period'}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Brut' : 'Gross'}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Net' : 'Net'}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Statut' : 'Status'}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{fr ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slips.map((s) => {
                const userName = usersWithProfile.find((u) => (u as any).profileId === s.profileId)?.name || s.profileId.slice(0, 8);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm">
                      <div>{userName}</div>
                      <div className="text-xs text-gray-500">
                        {s.periodStart} → {s.periodEnd}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">{s.grossAmount.toLocaleString()} {s.currencyCode}</td>
                    <td className="px-4 py-2 text-sm">{s.netAmount.toLocaleString()} {s.currencyCode}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${s.status === 'paid' ? 'bg-green-100 text-green-800' : s.status === 'validated' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {s.status === 'draft' ? (fr ? 'Brouillon' : 'Draft') : s.status === 'validated' ? (fr ? 'Validé' : 'Validated') : (fr ? 'Payé' : 'Paid')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-sm">
                      {s.status === 'draft' && (
                        <button type="button" onClick={() => handleStatusChange(s.id, 'validated')} className="text-blue-600 hover:text-blue-800 mr-2">
                          {fr ? 'Valider' : 'Validate'}
                        </button>
                      )}
                      {s.status === 'validated' && (
                        <button type="button" onClick={() => handleStatusChange(s.id, 'paid')} className="text-green-600 hover:text-green-800">
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
