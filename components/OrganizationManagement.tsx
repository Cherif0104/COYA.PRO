import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Organization } from '../types';
import OrganizationService from '../services/organizationService';
import AccessDenied from './common/AccessDenied';
import { getPrimaryOrganizationId, isSingleOrganizationTenantMode } from '../constants/platformTenant';

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

  const singleTenant = isSingleOrganizationTenantMode();
  const primaryId = getPrimaryOrganizationId();

  return (
    <div className="space-y-4">
      {singleTenant && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">Mode organisation unique (maintenance)</p>
          <p className="mt-1 text-sky-900/90">
            Une seule organisation est exposée. Pour créer des tenants hébergés, désactivez{' '}
            <code className="rounded bg-white/80 px-1">VITE_SINGLE_ORGANIZATION_MODE</code> dans l’environnement.
          </p>
        </div>
      )}
      {!singleTenant && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Organisation plateforme et tenants hébergés</p>
          <p className="mt-1 text-emerald-900/95">
            L’organisation marquée <strong>plateforme</strong> concentre vos projets et données COYA ; elle ne peut pas
            être supprimée. Les <strong>tenants hébergés</strong> réutilisent le même modèle (départements, utilisateurs,
            droits modules) avec un contenu dédié : la liste ci-dessous n’affiche pas d’indicateurs sur leur activité
            (pas de visibilité agrégée). Les restrictions par module se configurent dans{' '}
            <strong>Utilisateurs &amp; droits</strong> et les départements par organisation.
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600">
          {singleTenant
            ? 'Identité et coordonnées de votre organisation COYA. Aucun autre tenant n’est prévu dans ce mode.'
            : 'Modifiez la fiche plateforme ou créez des organisations hébergées (nom et slug propres).'}
        </p>
        {!singleTenant && (
          <button
            type="button"
            onClick={() => {
              if (!canWriteModule) return;
              setEditingOrg(null);
              resetForm();
              setShowCreateModal(true);
            }}
            disabled={!canWriteModule}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-plus mr-2" aria-hidden />
            Nouvelle organisation
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{organizations.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Actives</p>
          <p className="text-2xl font-bold text-slate-900">{organizations.filter((o) => o.isActive).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Inactives</p>
          <p className="text-2xl font-bold text-slate-900">{organizations.filter((o) => !o.isActive).length}</p>
        </div>
      </div>

      <div>
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
                primaryOrganizationId={primaryId}
                singleTenantMode={singleTenant}
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
  primaryOrganizationId: string;
  singleTenantMode: boolean;
  canWrite: boolean;
}> = ({ organization, onEdit, onDelete, onToggleActive, primaryOrganizationId, singleTenantMode, canWrite }) => {
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isPlatformOrg =
    organization.isPlatformRoot === true || organization.id === primaryOrganizationId;

  useEffect(() => {
    if (!isPlatformOrg) {
      setStats(null);
      setLoadingStats(false);
      return;
    }
    void loadStats();
  }, [organization.id, isPlatformOrg]);

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
      isPlatformOrg ? 'border-emerald-500' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-800">{organization.name}</h3>
            {isPlatformOrg && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                Plateforme (mère)
              </span>
            )}
            {!isPlatformOrg && (
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                Tenant hébergé
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

          {/* Statistiques : uniquement pour l’organisation plateforme (pas de visibilité sur les tenants hébergés) */}
          {isPlatformOrg && loadingStats ? (
            <div className="animate-pulse flex gap-4 mt-3">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          ) : isPlatformOrg && stats ? (
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
          ) : !isPlatformOrg ? (
            <p className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              Contenu et volumétrie non visibles depuis la plateforme — gérés au sein du tenant.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isPlatformOrg || !canWrite}
            className={`p-2 rounded-lg transition-colors ${
              organization.isActive
                ? 'text-green-600 hover:bg-green-50'
                : 'text-yellow-600 hover:bg-yellow-50'
            } ${isPlatformOrg || !canWrite ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={isPlatformOrg ? 'Organisation plateforme — non désactivable' : organization.isActive ? 'Désactiver' : 'Activer'}
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
          {!singleTenantMode && !isPlatformOrg && (
            <button
              type="button"
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



