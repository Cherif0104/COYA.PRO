import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { supabase } from '../services/supabaseService';
import { ModuleName } from '../types';
import { clearModuleLabelsForbiddenMode, getAllModuleLabelsForEdit, hasLocalModuleLabels, upsertModuleLabel, ModuleLabelRow } from '../services/moduleLabelsService';
import { moduleDisplayNames } from './UserModulePermissions';

const ALL_MODULE_KEYS: ModuleName[] = [
  'dashboard', 'projects', 'goals_okrs', 'time_tracking', 'planning', 'leave_management',
  'finance', 'comptabilite', 'knowledge_base', 'courses', 'jobs', 'crm_sales',
  'analytics', 'talent_analytics', 'qualite', 'rh', 'trinite', 'programme',
  'tech', 'conseil', 'user_management', 'course_management',
  'job_management', 'leave_management_admin', 'organization_management', 'department_management', 'settings',
];

const ModuleLabelsEditor: React.FC = () => {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, { fr: string; en: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', user.id).single();
        const orgId = (profile as any)?.organization_id ?? null;
        setOrganizationId(orgId);
        const list = await getAllModuleLabelsForEdit(orgId);
        const map: Record<string, { fr: string; en: string }> = {};
        ALL_MODULE_KEYS.forEach((key) => {
          const row = list.find((r: ModuleLabelRow) => r.module_key === key);
          map[key] = { fr: row?.display_name_fr ?? '', en: row?.display_name_en ?? '' };
        });
        if (!cancelled) setRows(map);
        if (!cancelled && hasLocalModuleLabels(orgId)) {
          setWarning(
            "Mode compatibilité activé : l’accès à `module_labels` est refusé (403) dans Supabase. Les libellés sont enregistrés localement (navigateur) pour cette organisation.",
          );
        } else if (!cancelled) {
          setWarning(null);
        }
      } catch (e) {
        if (!cancelled) setRows({});
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const reloadFromSource = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', user.id).single();
      const orgId = (profile as any)?.organization_id ?? null;
      setOrganizationId(orgId);
      const list = await getAllModuleLabelsForEdit(orgId);
      const map: Record<string, { fr: string; en: string }> = {};
      ALL_MODULE_KEYS.forEach((key) => {
        const row = list.find((r: ModuleLabelRow) => r.module_key === key);
        map[key] = { fr: row?.display_name_fr ?? '', en: row?.display_name_en ?? '' };
      });
      setRows(map);
      if (hasLocalModuleLabels(orgId)) {
        setWarning(
          "Mode compatibilité activé : l’accès à `module_labels` est refusé (403) dans Supabase. Les libellés sont enregistrés localement (navigateur) pour cette organisation.",
        );
      } else {
        setWarning(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (moduleKey: string, lang: 'fr' | 'en', value: string) => {
    setRows((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [lang]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of ALL_MODULE_KEYS) {
        const r = rows[key] ?? { fr: '', en: '' };
        await upsertModuleLabel({
          organizationId,
          moduleKey: key,
          displayNameFr: r.fr || null,
          displayNameEn: r.en || null,
        });
      }
      window.dispatchEvent(new Event('permissions-reload'));
      window.dispatchEvent(new Event('module-labels-reload'));
      alert('Libellés enregistrés.');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement.');
    }
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-gray-500">Chargement...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Saisissez les libellés personnalisés (FR/EN). Vide = utilisation du libellé par défaut.
      </p>
      {warning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong className="font-semibold">Information</strong>
          <div className="mt-1 text-amber-900">{warning}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-white border border-amber-200 text-amber-900 hover:bg-amber-100"
              onClick={() => {
                clearModuleLabelsForbiddenMode();
                reloadFromSource();
              }}
            >
              Réessayer Supabase
            </button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Module (clé)</th>
              <th className="px-3 py-2 text-left font-semibold">Défaut</th>
              <th className="px-3 py-2 text-left font-semibold">Libellé FR</th>
              <th className="px-3 py-2 text-left font-semibold">Libellé EN</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODULE_KEYS.map((key) => (
              <tr key={key} className="border-t border-gray-200">
                <td className="px-3 py-2 font-mono text-gray-600">{key}</td>
                <td className="px-3 py-2 text-gray-500">{moduleDisplayNames[key]}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={rows[key]?.fr ?? ''}
                    onChange={(e) => handleChange(key, 'fr', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="FR"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={rows[key]?.en ?? ''}
                    onChange={(e) => handleChange(key, 'en', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="EN"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-coya-primary text-white rounded-lg hover:bg-coya-primary-light disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les libellés'}
      </button>
    </div>
  );
};

export default ModuleLabelsEditor;
