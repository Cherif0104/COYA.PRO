import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import DataAdapter from '../services/dataAdapter';
import OrganizationService from '../services/organizationService';
import { Employee, EmployeeHrAttachment, RESOURCE_MANAGEMENT_ROLES, User } from '../types';
import { supabase } from '../services/supabaseService';
import * as hrAnalyticsService from '../services/hrAnalyticsService';

interface EmployeeProfileProps {
  selectedEmployee?: Employee | null;
  onClearSelection?: () => void;
  onSaved?: () => void;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ selectedEmployee = null, onClearSelection, onSaved }) => {
  const { user } = useAuth();
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});
  /** Si `platformUsers` est vide, noms issus des profils org (fallback). */
  const [hierarchyFallback, setHierarchyFallback] = useState<{ id: string; label: string }[]>([]);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [presenceHoursMonth, setPresenceHoursMonth] = useState(0);
  const [leavesCount, setLeavesCount] = useState(0);
  const [approvedLeavesCount, setApprovedLeavesCount] = useState(0);
  const [payrollRow, setPayrollRow] = useState<hrAnalyticsService.PayrollPeriodWorkedRow | null>(null);
  const canEdit = user ? RESOURCE_MANAGEMENT_ROLES.includes(user.role) : false;

  const profileId = selectedEmployee?.profileId
    ? String(selectedEmployee.profileId)
    : user?.profileId
      ? String(user.profileId)
      : user?.id
        ? String(user.id)
        : null;

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const data = await DataAdapter.getEmployeeByProfileId(profileId);
    setEmployee(data ?? null);
    setForm(
      data
        ? {
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
            cvUrl: data.cvUrl ?? '',
            hrAttachments: data.hrAttachments ?? [],
          }
        : {
            position: '',
            workMode: 'office',
            hourlyRate: 0,
            expectedDailyMinutes: 480,
            managerId: '',
            mentorId: '',
            cnss: '',
            amo: '',
            indemnities: '',
            leaveRate: 1.5,
            tenureDate: '',
            familySituation: '',
            photoUrl: '',
            cvUrl: '',
            hrAttachments: [],
          },
    );
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (platformUsers && platformUsers.length > 0) {
        setHierarchyFallback([]);
        return;
      }
      const orgId = await OrganizationService.getCurrentUserOrganizationId();
      if (!orgId || cancelled) return;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', orgId)
        .order('full_name', { ascending: true });
      if (cancelled) return;
      const self = profileId ? String(profileId) : '';
      const opts =
        (profiles || [])
          .filter((p: any) => p.id && String(p.id) !== self)
          .map((p: any) => ({
            id: String(p.id),
            label: p.full_name || p.email || String(p.id).slice(0, 8),
          })) || [];
      setHierarchyFallback(opts);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, platformUsers]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profileId || !employee?.organizationId) {
        setPayrollRow(null);
        return;
      }
      const { data: profileRow } = await supabase.from('profiles').select('user_id').eq('id', profileId).maybeSingle();
      const authUserId = (profileRow as any)?.user_id ? String((profileRow as any).user_id) : null;
      if (!authUserId || cancelled) {
        setPayrollRow(null);
        return;
      }
      const policy = await DataAdapter.getHrAttendancePolicy(employee.organizationId);
      const bounds = hrAnalyticsService.getPayrollPeriodBounds(new Date(), policy?.payrollPeriodStartDay ?? 1);
      const sessions = await DataAdapter.getPresenceSessions({
        userId: authUserId,
        from: bounds.start.toISOString(),
        to: bounds.end.toISOString(),
      });
      const rows = hrAnalyticsService.listPayrollPeriodWorkedRows({
        employees: [employee],
        sessions,
        policy,
        userIdByProfile: { [profileId]: authUserId },
        displayNameByProfileId: { [profileId]: '' },
      });
      if (!cancelled) setPayrollRow(rows[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, employee?.id, employee?.hourlyRate, employee?.organizationId]);

  const persistPartial = useCallback(
    async (patch: Partial<Employee>) => {
      if (!profileId || !employee?.organizationId) return;
      const { error } = await DataAdapter.upsertEmployee({
        ...patch,
        profileId,
        organizationId: employee.organizationId,
      });
      if (error) {
        alert(fr ? `Mise à jour impossible : ${error}` : `Update failed: ${error}`);
        return;
      }
      onSaved?.();
      load();
    },
    [profileId, employee?.organizationId, fr, onSaved, load],
  );

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const { error } = await DataAdapter.upsertEmployee({
      ...form,
      profileId,
      organizationId: (employee as any)?.organizationId,
    });
    setSaving(false);
    if (error) {
      alert(fr ? `Enregistrement impossible : ${error}` : `Could not save: ${error}`);
      return;
    }
    onSaved?.();
    load();
  };

  const onUpload = async (file: File | null, kind: 'photo' | 'cv' | 'documents') => {
    if (!file || !profileId || !employee?.organizationId) return;
    setUploadBusy(kind);
    try {
      const { publicUrl, error } = await DataAdapter.uploadEmployeeHrFile({
        organizationId: employee.organizationId,
        employeeProfileId: profileId,
        file,
        subfolder: kind === 'documents' ? 'documents' : kind,
      });
      if (error || !publicUrl) {
        alert(fr ? `Upload : ${error || 'échec'}` : `Upload: ${error || 'failed'}`);
        return;
      }
      if (kind === 'photo') {
        setForm((f) => ({ ...f, photoUrl: publicUrl }));
        await persistPartial({ photoUrl: publicUrl });
      } else if (kind === 'cv') {
        setForm((f) => ({ ...f, cvUrl: publicUrl }));
        await persistPartial({ cvUrl: publicUrl });
      } else {
        const att: EmployeeHrAttachment = {
          url: publicUrl,
          name: file.name,
          uploadedAt: new Date().toISOString(),
        };
        const next = [...((form.hrAttachments as EmployeeHrAttachment[]) || []), att];
        setForm((f) => ({ ...f, hrAttachments: next }));
        await persistPartial({ hrAttachments: next });
      }
    } finally {
      setUploadBusy(null);
    }
  };

  const hierarchyOptions = useMemo(() => {
    if (platformUsers && platformUsers.length > 0) {
      const opts = platformUsers
        .map((u) => userToHierarchyOption(u, profileId))
        .filter(Boolean) as { id: string; label: string }[];
      return opts.sort((a, b) => a.label.localeCompare(b.label, fr ? 'fr' : 'en', { sensitivity: 'base' }));
    }
    return [...hierarchyFallback].sort((a, b) => a.label.localeCompare(b.label, fr ? 'fr' : 'en', { sensitivity: 'base' }));
  }, [platformUsers, profileId, hierarchyFallback, fr]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
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
  ];

  const hms = payrollRow
    ? hrAnalyticsService.formatHmsFrench(hrAnalyticsService.secondsToHmsParts(payrollRow.workedSeconds))
    : '—';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">{fr ? 'Fiche salarié' : 'Employee profile'}</h2>
        {selectedEmployee && onClearSelection && (
          <button type="button" onClick={onClearSelection} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
            <i className="fas fa-arrow-left mr-1" />
            {fr ? 'Retour à la liste' : 'Back to list'}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {fr
          ? 'Manager et superviseur sont choisis dans la liste des utilisateurs de la plateforme (profils de l’organisation). Photo, CV et pièces : upload (bucket employee-files — migration requise).'
          : 'Manager and supervisor are picked from the organization’s platform users (profiles). Photo, CV and files: upload (employee-files bucket — migration required).'}
      </p>

      {payrollRow && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 mb-4 space-y-2">
          <h3 className="text-sm font-semibold text-emerald-900">
            {fr ? 'Aperçu rémunération (période comptable)' : 'Pay preview (accounting period)'}
          </h3>
          <p className="text-xs text-emerald-800">
            {payrollRow.periodLabel} ({payrollRow.periodStartIso} → {payrollRow.periodEndIso})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-xs text-emerald-700 block">{fr ? 'Temps connecté (sessions)' : 'Session time'}</span>
              <span className="font-mono font-medium text-emerald-950">{hms}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-700 block">{fr ? 'Heures paie (décimal)' : 'Payable hours'}</span>
              <span className="font-mono font-medium text-emerald-950">{payrollRow.payableHours.toFixed(3)} h</span>
            </div>
            <div>
              <span className="text-xs text-emerald-700 block">{fr ? 'Jours d’activité' : 'Active days'}</span>
              <span className="font-mono font-medium text-emerald-950">{payrollRow.distinctWorkDays}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-700 block">{fr ? 'Montant estimé' : 'Estimated pay'}</span>
              <span className="font-mono font-medium text-emerald-950">
                {payrollRow.estimatedPay.toLocaleString()} {fr ? 'XOF' : 'XOF'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-800/90">
            {fr
              ? `Conversion paie : 1 h = ${hrAnalyticsService.PAYROLL_MINUTES_PER_PAID_HOUR} min réelles (modifiable dans hrAnalyticsService). Secondes incluses dans le total.`
              : `Pay rule: 1 paid hour = ${hrAnalyticsService.PAYROLL_MINUTES_PER_PAID_HOUR} wall-clock minutes (edit in hrAnalyticsService). Seconds included in totals.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500 uppercase">{fr ? 'Présence (mois civil)' : 'Attendance (calendar month)'}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Manager (hiérarchie)' : 'Manager'}</label>
          <select
            value={String(form.managerId || '')}
            onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
            disabled={!canEdit}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 disabled:opacity-70"
          >
            <option value="">{fr ? '— Aucun —' : '— None —'}</option>
            {hierarchyOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Superviseur' : 'Supervisor'}</label>
          <select
            value={String(form.mentorId || '')}
            onChange={(e) => setForm((f) => ({ ...f, mentorId: e.target.value }))}
            disabled={!canEdit}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 disabled:opacity-70"
          >
            <option value="">{fr ? '— Aucun —' : '— None —'}</option>
            {hierarchyOptions.map((o) => (
              <option key={`s-${o.id}`} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <label className="block text-sm font-medium text-slate-700">{fr ? 'Photo' : 'Photo'}</label>
          {form.photoUrl ? (
            <img src={String(form.photoUrl)} alt="" className="h-24 w-24 rounded-lg object-cover border border-slate-100" />
          ) : (
            <div className="h-24 w-24 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">{fr ? 'Aucune' : 'None'}</div>
          )}
          {canEdit && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!!uploadBusy}
              className="text-sm"
              onChange={(ev) => onUpload(ev.target.files?.[0] || null, 'photo')}
            />
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <label className="block text-sm font-medium text-slate-700">CV (PDF / Word)</label>
          {form.cvUrl ? (
            <a href={String(form.cvUrl)} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline">
              {fr ? 'Ouvrir le CV' : 'Open CV'}
            </a>
          ) : (
            <p className="text-xs text-slate-500">{fr ? 'Aucun fichier' : 'No file'}</p>
          )}
          {canEdit && (
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              disabled={!!uploadBusy}
              className="text-sm"
              onChange={(ev) => onUpload(ev.target.files?.[0] || null, 'cv')}
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-3 mb-4 space-y-2">
        <label className="block text-sm font-medium text-slate-700">{fr ? 'Autres pièces jointes' : 'Other attachments'}</label>
        <ul className="text-sm space-y-1">
          {((form.hrAttachments as EmployeeHrAttachment[]) || []).map((a, i) => (
            <li key={`${a.url}-${i}`}>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
                {a.name}
              </a>
            </li>
          ))}
        </ul>
        {canEdit && (
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,image/*"
            disabled={!!uploadBusy}
            className="text-sm"
            onChange={(ev) => onUpload(ev.target.files?.[0] || null, 'documents')}
          />
        )}
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
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))
              }
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
            disabled={saving || !!uploadBusy}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? (fr ? 'Enregistrement…' : 'Saving…') : fr ? 'Enregistrer la fiche' : 'Save profile'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
