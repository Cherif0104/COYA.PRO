import React, { useState, useEffect } from 'react';
import { Poste } from '../types';
import OrganizationService from '../services/organizationService';
import * as postesService from '../services/postesService';
import AccessDenied from './common/AccessDenied';
import { isTableUnavailable } from '../services/optionalTableGuard';

interface PostesManagementProps {
  embeddedInUserManagement?: boolean;
}

const PostesManagement: React.FC<PostesManagementProps> = ({ embeddedInUserManagement }) => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPoste, setEditingPoste] = useState<Poste | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', isGlobal: false, isActive: true });

  const isAdmin = true; // En mode intégré dans UserManagement, le parent a déjà vérifié l'accès

  useEffect(() => {
    loadOrganizationAndPostes();
  }, []);

  const loadOrganizationAndPostes = async () => {
    try {
      setLoading(true);
      const orgId = await OrganizationService.getCurrentUserOrganizationId();
      setOrganizationId(orgId || null);
      const list = await postesService.listAllPostes(orgId || null);
      setPostes(list);
    } catch (error) {
      console.error('Erreur chargement postes:', error);
      alert('Erreur lors du chargement des postes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name?.trim()) {
        alert('Le nom est obligatoire');
        return;
      }
      await postesService.createPoste({
        organizationId: formData.isGlobal ? null : organizationId ?? null,
        name: formData.name.trim(),
        slug: formData.slug?.trim() || undefined,
      });
      alert('Poste créé avec succès');
      setShowCreateModal(false);
      resetForm();
      loadOrganizationAndPostes();
    } catch (error: any) {
      console.error('Erreur création poste:', error);
      alert(error?.message || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async () => {
    if (!editingPoste) return;
    try {
      await postesService.updatePoste(editingPoste.id, {
        name: formData.name.trim(),
        slug: formData.slug?.trim() || undefined,
        isActive: formData.isActive,
      });
      alert('Poste mis à jour');
      setEditingPoste(null);
      resetForm();
      loadOrganizationAndPostes();
    } catch (error: any) {
      console.error('Erreur mise à jour poste:', error);
      alert(error?.message || 'Erreur lors de la mise à jour');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', slug: '', isGlobal: false, isActive: true });
  };

  const openEditModal = (p: Poste) => {
    setEditingPoste(p);
    setFormData({
      name: p.name,
      slug: p.slug ?? '',
      isGlobal: p.organizationId == null,
      isActive: p.isActive ?? true,
    });
  };

  const toggleActive = async (p: Poste) => {
    try {
      await postesService.updatePoste(p.id, { isActive: !(p.isActive ?? true) });
      loadOrganizationAndPostes();
    } catch (error: any) {
      alert(error?.message || 'Erreur');
    }
  };

  if (!isAdmin) {
    return (
      <AccessDenied description="Vous n'avez pas les droits pour gérer les postes." />
    );
  }

  return (
    <div className="space-y-4">
      {isTableUnavailable('postes') ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Le référentiel <strong>postes</strong> n’est pas disponible dans cette base (table manquante). Vous pouvez activer la migration/creation de table côté Supabase, ou masquer cette rubrique.
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Postes (fonctions) de l&apos;organigramme. Les postes globaux sont partagés ; les postes liés à l&apos;organisation sont spécifiques.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditingPoste(null);
            resetForm();
            setShowCreateModal(true);
          }}
          disabled={!organizationId || isTableUnavailable('postes')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-plus mr-2" />
          Nouveau poste
        </button>
      </div>

      {!organizationId ? (
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
          Aucune organisation associée. Vous pouvez tout de même créer des postes globaux après sélection d&apos;une organisation.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
          Chargement des postes...
        </div>
      ) : postes.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun poste. Créez-en un pour commencer.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Portée</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {postes.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{p.slug ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {p.organizationId == null ? 'Global' : 'Organisation'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-sm">
                    <button type="button" onClick={() => openEditModal(p)} className="text-emerald-600 hover:text-emerald-800 mr-3">
                      Modifier
                    </button>
                    <button type="button" onClick={() => toggleActive(p)} className="text-gray-600 hover:text-gray-800">
                      {p.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création / édition */}
      {(showCreateModal || editingPoste) && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingPoste ? 'Modifier le poste' : 'Nouveau poste'}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Directeur général, Chef de projet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: directeur-general"
                  disabled={!!editingPoste}
                />
              </div>
              {!editingPoste && organizationId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isGlobal}
                    onChange={e => setFormData({ ...formData, isGlobal: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Poste global (partagé)</span>
                </label>
              )}
              {editingPoste && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setEditingPoste(null); resetForm(); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={editingPoste ? handleUpdate : handleCreate}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {editingPoste ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostesManagement;
