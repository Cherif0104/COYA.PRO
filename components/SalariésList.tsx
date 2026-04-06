import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import DataAdapter from '../services/dataAdapter';
import OrganizationService from '../services/organizationService';
import { Employee, User, RESOURCE_MANAGEMENT_ROLES } from '../types';
import { useAuth } from '../contexts/AuthContextSupabase';

interface SalariésListProps {
  users: User[];
  onSelectEmployee?: (employee: Employee) => void;
  /** Incrémenter pour forcer un rechargement de la liste (ex. après édition fiche). */
  listVersion?: number;
  /** Après association ou changement côté liste (ex. recharger salariés côté module RH / présence). */
  onEmployeesMutated?: () => void;
}

const SalariésList: React.FC<SalariésListProps> = ({ users, onSelectEmployee, listVersion = 0, onEmployeesMutated }) => {
  const { language } = useLocalization();
  const { user: currentUser } = useAuth();
  const fr = language === 'fr';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());

  const canEdit = currentUser ? RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role) : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = await OrganizationService.getCurrentUserOrganizationId();
      const list = await DataAdapter.listEmployees(orgId ?? undefined);
      setEmployees(list ?? []);

      const profileIds = [...new Set((list ?? []).map((e) => e.profileId).filter(Boolean))] as string[];
      if (profileIds.length > 0) {
        const { supabase } = await import('../services/supabaseService');
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
        const map = new Map<string, string>();
        (profiles || []).forEach((p: any) => map.set(p.id, p.full_name || p.id));
        setProfileNames(map);
      } else {
        setProfileNames(new Map());
      }
    } catch (e) {
      console.error('SalariésList load:', e);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [listVersion]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssociateUser = async () => {
    if (!selectedUserId) return;
    const user = users.find((u) => String(u.profileId || u.id) === selectedUserId);
    if (!user) return;
    if (!user.profileId) {
      alert(
        fr
          ? 'Ce compte n’a pas d’identifiant profil valide. Réessayez après reconnexion ou contactez l’administrateur.'
          : 'This account has no valid profile id. Try again after sign-in or contact an administrator.'
      );
      return;
    }
    const profileId = String(user.profileId);
    setSaving(true);
    try {
      const orgId = await OrganizationService.getCurrentUserOrganizationId();
      const { data: created, error } = await DataAdapter.upsertEmployee({ profileId, organizationId: orgId ?? undefined });
      if (created && !error) {
        setEmployees((prev) => {
          const exists = prev.some((e) => e.profileId === profileId);
          if (exists) return prev.map((e) => (e.profileId === profileId ? created : e));
          return [created, ...prev];
        });
        setShowAssociateModal(false);
        setSelectedUserId('');
        onEmployeesMutated?.();
      } else {
        alert(
          error
            ? fr
              ? `Impossible de créer la fiche salarié : ${error}`
              : `Could not create employee record: ${error}`
            : fr
              ? 'Impossible de créer la fiche salarié.'
              : 'Could not create employee record.'
        );
      }
    } catch (e) {
      console.error('Associate user:', e);
      alert(fr ? 'Erreur lors de l\'association.' : 'Error associating user.');
    } finally {
      setSaving(false);
    }
  };

  const existingProfileIds = new Set(employees.map((e) => e.profileId).filter(Boolean));
  const usersNotYetEmployees = users.filter((u) => {
    const pid = u.profileId ? String(u.profileId) : String(u.id);
    return !existingProfileIds.has(pid);
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-6">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent" />
        <span>{fr ? 'Chargement des salariés…' : 'Loading employees…'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAssociateModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            <i className="fas fa-user-plus mr-2" />
            {fr ? 'Associer un utilisateur' : 'Associate user'}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">{fr ? 'Nom' : 'Name'}</th>
              <th className="px-4 py-3 font-semibold text-slate-700">{fr ? 'Poste' : 'Position'}</th>
              <th className="px-4 py-3 font-semibold text-slate-700">{fr ? 'Compte utilisateur' : 'User account'}</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-24">{fr ? 'Actions' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {fr ? 'Aucun salarié. Associez un utilisateur pour créer une fiche.' : 'No employees. Associate a user to create a record.'}
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const name = emp.profileId ? profileNames.get(emp.profileId) || emp.profileId?.slice(0, 8) : (fr ? 'Salarié sans compte' : 'No account');
                const hasAccount = Boolean(emp.profileId);
                return (
                  <tr key={emp.id || emp.profileId || ''} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.position || '—'}</td>
                    <td className="px-4 py-3">
                      {hasAccount ? (
                        <span className="text-emerald-600 text-xs font-medium">{fr ? 'Oui' : 'Yes'}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">{fr ? 'Non' : 'No'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {onSelectEmployee && (
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(emp)}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-xs"
                        >
                          {fr ? 'Fiche salarié' : 'Employee record'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAssociateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {fr ? 'Associer un utilisateur comme salarié' : 'Associate user as employee'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {fr ? 'Choisissez un utilisateur pour lui créer une fiche salarié.' : 'Choose a user to create an employee record.'}
            </p>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 mb-4"
            >
              <option value="">{fr ? '— Sélectionner —' : '— Select —'}</option>
              {usersNotYetEmployees.map((u) => {
                const id = u.profileId ? String(u.profileId) : String(u.id);
                return (
                  <option key={id} value={id}>
                    {u.fullName || u.name || u.email || id}
                  </option>
                );
              })}
            </select>
            {usersNotYetEmployees.length === 0 && (
              <p className="text-sm text-amber-600 mb-4">{fr ? 'Tous les utilisateurs ont déjà une fiche salarié.' : 'All users already have an employee record.'}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAssociateModal(false); setSelectedUserId(''); }} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
                {fr ? 'Annuler' : 'Cancel'}
              </button>
              <button type="button" onClick={handleAssociateUser} disabled={!selectedUserId || saving} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50">
                {saving ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Associer' : 'Associate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalariésList;
