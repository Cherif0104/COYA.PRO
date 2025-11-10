import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Organization } from '../types';
import OrganizationService from '../services/organizationService';
import AccessDenied from './common/AccessDenied';

const OrganizationManagement: React.FC = () => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const { canAccessModule, hasPermission } = useModulePermissions();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Formulaire de création/modification
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    contactEmail: ''
  });

  const canReadModule = canAccessModule('organization_management');
  const canWriteModule = hasPermission('organization_management', 'write');

  useEffect(() => {
    if (canReadModule) {
      loadOrganizations();
    }
  }, [canReadModule]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await OrganizationService.getAllOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Erreur chargement organisations:', error);
      alert('Erreur lors du chargement des organisations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!canWriteModule) {
      alert('Vous n’avez pas l’autorisation de créer une organisation.');
      return;
    }
    try {
      if (!formData.name || !formData.slug) {
        alert('Le nom et le slug sont obligatoires');
        return;
      }

      await OrganizationService.createOrganization(
        formData.name,
        formData.slug,
        formData.description || undefined
      );

      alert('Organisation créée avec succès !');
      setShowCreateModal(false);
      resetForm();
      loadOrganizations();
    } catch (error: any) {
      console.error('Erreur création organisation:', error);
      alert(error.message || 'Erreur lors de la création de l\'organisation');
    }
  };

  const handleUpdate = async () => {
    if (!canWriteModule || !editingOrg) return;

    try {
      await OrganizationService.updateOrganization(editingOrg.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        website: formData.website || undefined,
        contactEmail: formData.contactEmail || undefined
      });

      alert('Organisation mise à jour avec succès !');
      setEditingOrg(null);
      resetForm();
      loadOrganizations();
    } catch (error: any) {
      console.error('Erreur mise à jour organisation:', error);
      alert(error.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canWriteModule) return;
    try {
      await OrganizationService.deleteOrganization(id);
      alert('Organisation supprimée avec succès');
      setDeleteConfirm(null);
      loadOrganizations();
    } catch (error: any) {
      console.error('Erreur suppression organisation:', error);
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (org: Organization) => {
    if (!canWriteModule) return;
    try {
      if (org.isActive) {
        await OrganizationService.deactivateOrganization(org.id);
        alert('Organisation désactivée');
      } else {
        await OrganizationService.activateOrganization(org.id);
        alert('Organisation activée');
      }
      loadOrganizations();
    } catch (error: any) {
      console.error('Erreur toggle active:', error);
      alert(error.message || 'Erreur lors de la modification');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      website: '',
      contactEmail: ''
    });
  };

  const openEditModal = (org: Organization) => {
    if (!canWriteModule) return;
    setEditingOrg(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      description: org.description || '',
      website: org.website || '',
      contactEmail: org.contactEmail || ''
    });
  };

  if (!canReadModule) {
    return <AccessDenied description="Vous n’avez pas les permissions nécessaires pour gérer les organisations. Veuillez contacter votre administrateur." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestion des Organisations</h1>
              <p className="text-emerald-50 text-sm">
                Gérez les organisations partenaires et leurs espaces dédiés
              </p>
            </div>
            <button
              onClick={() => {
                if (!canWriteModule) return;
                setEditingOrg(null);
                resetForm();
                setShowCreateModal(true);
              }}
              disabled={!canWriteModule}
              className={`bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${
                canWriteModule ? 'hover:bg-emerald-50' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-plus mr-2"></i>
              Nouvelle Organisation
            </button>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Organisations</span>
              <i className="fas fa-building text-2xl text-blue-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{organizations.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Actives</span>
              <i className="fas fa-check-circle text-2xl text-green-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {organizations.filter(o => o.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Inactives</span>
              <i className="fas fa-pause-circle text-2xl text-yellow-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {organizations.filter(o => !o.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Partenaires</span>
              <i className="fas fa-handshake text-2xl text-purple-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {organizations.filter(o => o.id !== '550e8400-e29b-41d4-a716-446655440000').length}
            </p>
          </div>
        </div>
      </div>

      {/* Liste des organisations */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des organisations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <i className="fas fa-building text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune organisation</h3>
            <p className="text-gray-500">Créez votre première organisation partenaire</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map(org => (
              <OrganizationCard
                key={org.id}
                organization={org}
                onEdit={() => openEditModal(org)}
                onDelete={() => setDeleteConfirm(org.id)}
                onToggleActive={() => handleToggleActive(org)}
                isSenegel={org.id === '550e8400-e29b-41d4-a716-446655440000'}
                canWrite={canWriteModule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de création/modification */}
      {(showCreateModal || editingOrg) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingOrg ? 'Modifier l\'Organisation' : 'Nouvelle Organisation'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'organisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: Partenaire ABC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (identifiant unique) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: partenaire-abc"
                  disabled={!!editingOrg}
                />
                <p className="text-xs text-gray-500 mt-1">Utilisé pour l'URL (ne peut pas être modifié)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Description de l'organisation..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Web
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="contact@..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingOrg(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={editingOrg ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
              >
                {editingOrg ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-4">
              ⚠️ Attention : Cette action supprimera l'organisation et TOUTES ses données associées (projets, cours, utilisateurs, etc.). Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={!canWriteModule}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 ${
                  !canWriteModule ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant carte organisation
const OrganizationCard: React.FC<{
  organization: Organization;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isSenegel: boolean;
  canWrite: boolean;
}> = ({ organization, onEdit, onDelete, onToggleActive, isSenegel, canWrite }) => {
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadStats();
  }, [organization.id]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const orgStats = await OrganizationService.getOrganizationStats(organization.id);
      setStats(orgStats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 ${
      isSenegel ? 'border-emerald-500' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-800">{organization.name}</h3>
            {isSenegel && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                Organisation Principale
              </span>
            )}
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              organization.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {organization.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {organization.description && (
            <p className="text-sm text-gray-600 mb-3">{organization.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            <span><i className="fas fa-tag mr-1"></i>Slug: <code className="bg-gray-100 px-2 py-0.5 rounded">{organization.slug}</code></span>
            {organization.website && (
              <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                <i className="fas fa-globe mr-1"></i>Site Web
              </a>
            )}
            {organization.contactEmail && (
              <span><i className="fas fa-envelope mr-1"></i>{organization.contactEmail}</span>
            )}
          </div>

          {/* Statistiques */}
          {loadingStats ? (
            <div className="animate-pulse flex gap-4 mt-3">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          ) : stats && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <i className="fas fa-users text-blue-500"></i>
                <span className="font-semibold text-gray-700">{stats.usersCount} utilisateurs</span>
              </div>
              <div className="flex items-center gap-1">
                <i className="fas fa-project-diagram text-purple-500"></i>
                <span className="font-semibold text-gray-700">{stats.projectsCount} projets</span>
              </div>
              <div className="flex items-center gap-1">
                <i className="fas fa-book-open text-green-500"></i>
                <span className="font-semibold text-gray-700">{stats.coursesCount} cours</span>
              </div>
              <div className="flex items-center gap-1">
                <i className="fas fa-briefcase text-orange-500"></i>
                <span className="font-semibold text-gray-700">{stats.jobsCount} offres</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg transition-colors ${
              organization.isActive
                ? 'text-green-600 hover:bg-green-50'
                : 'text-yellow-600 hover:bg-yellow-50'
            }`}
            title={organization.isActive ? 'Désactiver' : 'Activer'}
          >
            <i className={`fas ${organization.isActive ? 'fa-toggle-on' : 'fa-toggle-off'} text-xl`}></i>
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <i className="fas fa-edit"></i>
          </button>
          {!isSenegel && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationManagement;



