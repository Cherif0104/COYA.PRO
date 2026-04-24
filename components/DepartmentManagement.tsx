import React, { useState, useEffect, useCallback } from 'react';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Department, ModuleName } from '../types';
import OrganizationService from '../services/organizationService';
import DepartmentService from '../services/departmentService';
import { DataService } from '../services/dataService';
import AccessDenied from './common/AccessDenied';
import { moduleDisplayNames } from './UserModulePermissions';

const ALL_MODULE_NAMES: ModuleName[] = [
  'dashboard', 'projects', 'goals_okrs', 'time_tracking', 'planning',
  'leave_management', 'finance', 'comptabilite', 'knowledge_base', 'courses', 'jobs',
  'crm_sales', 'analytics', 'talent_analytics', 'qualite',
  'rh', 'trinite', 'programme', 'tech', 'conseil',
  'user_management', 'course_management', 'job_management', 'leave_management_admin',
  'organization_management', 'department_management', 'postes_management', 'settings',
  'logistique', 'parc_auto', 'ticket_it', 'messagerie',
];

interface DepartmentManagementProps {
  embeddedInUserManagement?: boolean;
  canRead?: boolean;
  canWrite?: boolean;
}

const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ embeddedInUserManagement, canRead, canWrite }) => {
  const { canAccessModule, hasPermission } = useModulePermissions();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [membersModalDept, setMembersModalDept] = useState<Department | null>(null);
  const [orgProfileOptions, setOrgProfileOptions] = useState<Array<{ userId: string; profileId: string; label: string }>>([]);
  const [memberIdsInDept, setMemberIdsInDept] = useState<string[]>([]);
  const [memberSelection, setMemberSelection] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSaving, setMembersSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sequence: 0,
    isActive: true,
    moduleSlugs: [] as ModuleName[]
  });

  const canReadModule = embeddedInUserManagement ? (canRead ?? true) : canAccessModule('department_management');
  const canWriteModule = embeddedInUserManagement ? (canWrite ?? false) : hasPermission('department_management', 'write');

  useEffect(() => {
    if (canReadModule) {
      loadOrganizationAndDepartments();
    }
  }, [canReadModule]);

  const REQUIRED_DEPT_MODULE_COUNT = 2;

  const loadOrganizationAndDepartments = async () => {
    try {
      setLoading(true);
      const orgId = await OrganizationService.getCurrentUserOrganizationId();
      setOrganizationId(orgId || null);
      if (orgId) {
        const list = await DepartmentService.getDepartmentsByOrganizationId(orgId);
        setDepartments(list);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('Erreur chargement départements:', error);
      alert('Erreur lors du chargement des départements');
    } finally {
      setLoading(false);
    }
  };

  const validateModuleSlugs = (): boolean => {
    if (formData.moduleSlugs.length !== REQUIRED_DEPT_MODULE_COUNT) {
      alert(
        `Chaque département doit avoir exactement ${REQUIRED_DEPT_MODULE_COUNT} modules actifs (politique plateforme). Sélectionnez ${REQUIRED_DEPT_MODULE_COUNT} cases.`
      );
      return false;
    }
    return true;
  };

  const openMembersModal = useCallback(
    async (dept: Department) => {
      if (!canWriteModule || !organizationId) return;
      setMembersModalDept(dept);
      setMembersLoading(true);
      try {
        const [{ data: profiles }, ids] = await Promise.all([
          DataService.getProfiles(),
          DepartmentService.getUserIdsInDepartment(dept.id),
        ]);
        const inOrg = (profiles || []).filter((p: any) => String(p.organization_id || '') === String(organizationId));
        setOrgProfileOptions(
          inOrg.map((p: any) => ({
            userId: String(p.user_id || ''),
            profileId: String(p.id || ''),
            label: String(p.full_name || p.email || p.user_id || ''),
          })).filter((o) => o.userId),
        );
        setMemberIdsInDept(ids);
        setMemberSelection([...ids]);
      } catch (e) {
        console.error(e);
        alert('Erreur chargement des membres');
      } finally {
        setMembersLoading(false);
      }
    },
    [canWriteModule, organizationId],
  );

  const saveMembersModal = async () => {
    if (!membersModalDept || !canWriteModule) return;
    setMembersSaving(true);
    try {
      const before = new Set(memberIdsInDept);
      const after = new Set(memberSelection);
      const toAdd = memberSelection.filter((uid) => !before.has(uid));
      const toRemove = memberIdsInDept.filter((uid) => !after.has(uid));
      for (const uid of toAdd) {
        await DepartmentService.assignUserToDepartment(uid, membersModalDept.id);
      }
      for (const uid of toRemove) {
        await DepartmentService.removeUserFromDepartment(uid, membersModalDept.id);
      }
      const next = await DepartmentService.getUserIdsInDepartment(membersModalDept.id);
      setMemberIdsInDept(next);
      setMembersModalDept(null);
      try {
        window.dispatchEvent(new Event('permissions-reload'));
      } catch {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      alert('Erreur enregistrement des membres');
    } finally {
      setMembersSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!canWriteModule || !organizationId) return;
    try {
      if (!formData.name || !formData.slug) {
        alert('Le nom et le slug sont obligatoires');
        return;
      }
      if (!validateModuleSlugs()) return;
      await DepartmentService.createDepartment(organizationId, {
        name: formData.name,
        slug: formData.slug,
        moduleSlugs: formData.moduleSlugs,
        sequence: formData.sequence
      });
      alert('Département créé avec succès');
      setShowCreateModal(false);
      resetForm();
      loadOrganizationAndDepartments();
    } catch (error: any) {
      console.error('Erreur création département:', error);
      alert(error?.message || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async () => {
    if (!canWriteModule || !editingDept) return;
    try {
      if (!validateModuleSlugs()) return;
      await DepartmentService.updateDepartment(editingDept.id, {
        name: formData.name,
        slug: formData.slug,
        sequence: formData.sequence,
        isActive: formData.isActive,
        moduleSlugs: formData.moduleSlugs
      });
      alert('Département mis à jour');
      setEditingDept(null);
      resetForm();
      loadOrganizationAndDepartments();
    } catch (error: any) {
      console.error('Erreur mise à jour département:', error);
      alert(error?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canWriteModule) return;
    try {
      await DepartmentService.deleteDepartment(id);
      setDeleteConfirm(null);
      loadOrganizationAndDepartments();
    } catch (error: any) {
      console.error('Erreur suppression département:', error);
      alert(error?.message || 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      sequence: 0,
      isActive: true,
      moduleSlugs: []
    });
  };

  const openEditModal = (dept: Department) => {
    if (!canWriteModule) return;
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      slug: dept.slug,
      sequence: dept.sequence ?? 0,
      isActive: dept.isActive ?? true,
      moduleSlugs: dept.moduleSlugs ? [...dept.moduleSlugs] : []
    });
  };

  const toggleModuleSlug = (slug: ModuleName) => {
    setFormData(prev => ({
      ...prev,
      moduleSlugs: prev.moduleSlugs.includes(slug)
        ? prev.moduleSlugs.filter(m => m !== slug)
        : [...prev.moduleSlugs, slug]
    }));
  };

  if (!canReadModule) {
    return (
      <AccessDenied description="Vous n'avez pas les permissions nécessaires pour gérer les départements." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600">
          Chaque département active exactement <strong>{REQUIRED_DEPT_MODULE_COUNT} modules</strong>. Un utilisateur doit être affecté à un département pour bénéficier des modules de ce département (en plus des droits individuels configurés par le super administrateur).
        </p>
        <button
          type="button"
          onClick={() => {
            if (!canWriteModule) return;
            setEditingDept(null);
            resetForm();
            setShowCreateModal(true);
          }}
          disabled={!canWriteModule || !organizationId}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-plus mr-2" aria-hidden />
          Nouveau département
        </button>
      </div>

      <div>
        {!organizationId ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600">Aucune organisation associée à votre compte.</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des départements...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <i className="fas fa-sitemap text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun département</h3>
            <p className="text-gray-500">Créez le premier département pour votre organisation</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modules</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  {canWriteModule && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departments.map(dept => (
                  <tr key={dept.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.sequence ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(dept.moduleSlugs?.length ?? 0) > 0
                        ? (dept.moduleSlugs ?? []).map(s => moduleDisplayNames[s] || s).join(', ')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${dept.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {dept.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    {canWriteModule && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                        <button
                          type="button"
                          onClick={() => void openMembersModal(dept)}
                          className="text-slate-700 hover:text-slate-900 font-medium"
                        >
                          Membres
                        </button>
                        <button onClick={() => openEditModal(dept)} className="text-emerald-600 hover:text-emerald-800">
                          Modifier
                        </button>
                        <button onClick={() => setDeleteConfirm(dept.id)} className="text-red-600 hover:text-red-800">
                          Supprimer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création / édition */}
      {(showCreateModal || editingDept) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingDept ? 'Modifier le Département' : 'Nouveau Département'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: RH, Juridique"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: rh, crm_sales"
                  disabled={!!editingDept}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sequence}
                    onChange={e => setFormData({ ...formData, sequence: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {editingDept && (
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Actif</span>
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modules autorisés pour ce département (exactement {REQUIRED_DEPT_MODULE_COUNT})
                </label>
                <p className="text-xs text-amber-800 mb-2">
                  Sélection obligatoire : {REQUIRED_DEPT_MODULE_COUNT} modules — sinon la sauvegarde est refusée.
                </p>
                <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_MODULE_NAMES.map(slug => (
                    <label key={slug} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.moduleSlugs.includes(slug)}
                        onChange={() => toggleModuleSlug(slug)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{moduleDisplayNames[slug] ?? slug}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setEditingDept(null); resetForm(); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={editingDept ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {editingDept ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <p className="text-gray-800 mb-4">Supprimer ce département ? Les assignations utilisateurs seront également supprimées.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {membersModalDept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Membres — {membersModalDept.name}</h2>
              <p className="text-xs text-gray-600 mt-1">
                Cochez les comptes (auth) rattachés à l’organisation. Sans affectation ici, l’utilisateur ne reçoit pas les modules de ce département.
              </p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {membersLoading ? (
                <p className="text-sm text-gray-500">Chargement…</p>
              ) : (
                <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {orgProfileOptions.map((o) => {
                    const checked = memberSelection.includes(o.userId);
                    return (
                      <li key={o.userId}>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-emerald-600"
                            checked={checked}
                            onChange={() => {
                              setMemberSelection((prev) =>
                                checked ? prev.filter((id) => id !== o.userId) : [...prev, o.userId]
                              );
                            }}
                          />
                          <span className="truncate">{o.label}</span>
                          <span className="text-xs text-gray-400 shrink-0">{o.userId.slice(0, 8)}…</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onClick={() => setMembersModalDept(null)}
                disabled={membersSaving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                onClick={() => void saveMembersModal()}
                disabled={membersSaving || membersLoading}
              >
                {membersSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
