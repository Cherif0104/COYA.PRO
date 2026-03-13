import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import DataAdapter from '../services/dataAdapter';
import { Employee, RESOURCE_MANAGEMENT_ROLES } from '../types';

const EmployeeProfile: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});
  const canEdit = user ? RESOURCE_MANAGEMENT_ROLES.includes(user.role) : false;

  const profileId = user?.profileId ? String(user.profileId) : user?.id ? String(user.id) : null;

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const data = await DataAdapter.getEmployeeByProfileId(profileId);
    setEmployee(data ?? null);
    setForm(data ? {
      position: data.position ?? '',
      managerId: data.managerId ?? '',
      mentorId: data.mentorId ?? '',
      cnss: data.cnss ?? '',
      amo: data.amo ?? '',
      indemnities: data.indemnities ?? '',
      leaveRate: data.leaveRate ?? 1.5,
      tenureDate: data.tenureDate ?? '',
      familySituation: data.familySituation ?? '',
      photoUrl: data.photoUrl ?? '',
      cvUrl: data.cvUrl ?? ''
    } : {
      position: '', managerId: '', mentorId: '', cnss: '', amo: '', indemnities: '',
      leaveRate: 1.5, tenureDate: '', familySituation: '', photoUrl: '', cvUrl: ''
    });
    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    await DataAdapter.upsertEmployee({
      ...form,
      profileId,
      organizationId: (employee as any)?.organizationId
    });
    setSaving(false);
    load();
  };

  if (!user) return null;
  if (loading) {
    return (
      <div className="bg-coya-card rounded-lg shadow-coya border border-coya-border p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-coya-border rounded w-3/4"></div>
            <div className="h-4 bg-coya-border rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { key: 'position' as const, label: fr ? 'Poste' : 'Position', type: 'text' },
    { key: 'cnss' as const, label: 'CNSS', type: 'text' },
    { key: 'amo' as const, label: 'AMO', type: 'text' },
    { key: 'indemnities' as const, label: fr ? 'Indemnités' : 'Indemnities', type: 'text' },
    { key: 'leaveRate' as const, label: fr ? 'Taux congé (j/26j)' : 'Leave rate', type: 'number' },
    { key: 'tenureDate' as const, label: fr ? 'Date de titularisation' : 'Tenure date', type: 'date' },
    { key: 'familySituation' as const, label: fr ? 'Situation familiale' : 'Family situation', type: 'text' },
    { key: 'photoUrl' as const, label: fr ? 'Photo (URL)' : 'Photo (URL)', type: 'url' },
    { key: 'cvUrl' as const, label: 'CV (URL)', type: 'url' }
  ];

  return (
    <div className="bg-coya-card rounded-lg shadow-coya border border-coya-border p-6">
      <h2 className="text-xl font-bold text-coya-text mb-4">
        {fr ? 'Fiche salarié' : 'Employee profile'}
      </h2>
      <p className="text-sm text-coya-text-muted mb-4">
        {fr ? 'État civil, situation familiale, CNSS, AMO, indemnités, taux de congé, ancienneté, poste.' : 'Civil status, family situation, CNSS, AMO, indemnities, leave rate, tenure, position.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-coya-text mb-1">{label}</label>
            <input
              type={type}
              value={(form[key] ?? '') as string | number}
              onChange={(e) => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
              disabled={!canEdit}
              className="w-full border border-coya-border rounded px-3 py-2 bg-coya-bg text-coya-text disabled:opacity-70"
            />
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-coya-primary text-white rounded-lg hover:bg-coya-primary-light disabled:opacity-50"
          >
            {saving ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Enregistrer' : 'Save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
