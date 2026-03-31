import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import DataAdapter from '../services/dataAdapter';
import { Employee, RESOURCE_MANAGEMENT_ROLES } from '../types';
import { supabase } from '../services/supabaseService';

interface EmployeeProfileProps {
  selectedEmployee?: Employee | null;
  onClearSelection?: () => void;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ selectedEmployee = null, onClearSelection }) => {
  const { user } = useAuth();
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [presenceHoursMonth, setPresenceHoursMonth] = useState(0);
  const [leavesCount, setLeavesCount] = useState(0);
  const [approvedLeavesCount, setApprovedLeavesCount] = useState(0);
  const canEdit = user ? RESOURCE_MANAGEMENT_ROLES.includes(user.role) : false;

  const profileId = selectedEmployee?.profileId
    ? String(selectedEmployee.profileId)
    : (user?.profileId ? String(user.profileId) : user?.id ? String(user.id) : null);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const data = await DataAdapter.getEmployeeByProfileId(profileId);
    setEmployee(data ?? null);
    setForm(data ? {
      position: data.position ?? '',
      workMode: data.workMode ?? 'office',
      hourlyRate: data.hourlyRate ?? 0,
      expectedDailyMinutes: data.expectedDailyMinutes ?? 480,
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
      position: '', workMode: 'office', hourlyRate: 0, expectedDailyMinutes: 480, managerId: '', mentorId: '', cnss: '', amo: '', indemnities: '',
      leaveRate: 1.5, tenureDate: '', familySituation: '', photoUrl: '', cvUrl: ''
    });
    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadLinkedData = async () => {
      if (!profileId) return;
      const { data: profileRow } = await supabase.from('profiles').select('user_id').eq('id', profileId).maybeSingle();
      const authUserId = (profileRow as any)?.user_id ? String((profileRow as any).user_id) : null;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const sessions = authUserId ? await DataAdapter.getPresenceSessions({ userId: authUserId, from: monthStart }) : [];
      const hours = sessions.reduce((acc, s) => {
        const start = new Date(s.startedAt).getTime();
        const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return acc;
        return acc + (end - start) / 3600000;
      }, 0);
      setPresenceHoursMonth(hours);
      const leaves = await DataAdapter.getLeaveRequests();
      const mine = leaves.filter((l) => l.userId === profileId);
      setLeavesCount(mine.length);
      setApprovedLeavesCount(mine.filter((l) => l.status === 'approved').length);
    };
    loadLinkedData();
  }, [profileId]);

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
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { key: 'position' as const, label: fr ? 'Poste' : 'Position', type: 'text' },
    { key: 'hourlyRate' as const, label: fr ? 'Taux horaire' : 'Hourly rate', type: 'number' },
    { key: 'expectedDailyMinutes' as const, label: fr ? 'Minutes prévues / jour' : 'Expected minutes / day', type: 'number' },
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          {fr ? 'Fiche salarié' : 'Employee profile'}
        </h2>
        {selectedEmployee && onClearSelection && (
          <button type="button" onClick={onClearSelection} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
            <i className="fas fa-arrow-left mr-1" />
            {fr ? 'Retour à la liste' : 'Back to list'}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {fr ? 'État civil, situation familiale, CNSS, AMO, indemnités, taux de congé, ancienneté, poste.' : 'Civil status, family situation, CNSS, AMO, indemnities, leave rate, tenure, position.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500 uppercase">{fr ? 'Présence (mois)' : 'Attendance (month)'}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{presenceHoursMonth.toFixed(1)} h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500 uppercase">{fr ? 'Demandes de congés' : 'Leave requests'}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{leavesCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500 uppercase">{fr ? 'Congés approuvés' : 'Approved leave'}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{approvedLeavesCount}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-coya-text mb-1">{fr ? 'Mode de travail' : 'Work mode'}</label>
          <select
            value={String(form.workMode ?? 'office')}
            onChange={(e) => setForm((f) => ({ ...f, workMode: e.target.value as any }))}
            disabled={!canEdit}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 disabled:opacity-70"
          >
            <option value="office">{fr ? 'Bureau' : 'Office'}</option>
            <option value="remote">{fr ? 'Domicile' : 'Remote'}</option>
            <option value="hybrid">{fr ? 'Hybride' : 'Hybrid'}</option>
          </select>
        </div>
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-coya-text mb-1">{label}</label>
            <input
              type={type}
              value={(form[key] ?? '') as string | number}
              onChange={(e) => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
              disabled={!canEdit}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 disabled:opacity-70"
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
            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Enregistrer' : 'Save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
