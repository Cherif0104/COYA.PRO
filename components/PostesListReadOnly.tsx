import React, { useState, useEffect } from 'react';
import { Poste } from '../types';
import OrganizationService from '../services/organizationService';
import * as postesService from '../services/postesService';
import { useLocalization } from '../contexts/LocalizationContext';

/** Liste en lecture seule des postes – intégrée dans RhModule (onglet Fiche poste) */
const PostesListReadOnly: React.FC = () => {
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgId = await OrganizationService.getCurrentUserOrganizationId();
        const list = await postesService.listAllPostes(orgId || null);
        if (!cancelled) setPostes(list);
      } catch {
        if (!cancelled) setPostes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
        <span>{fr ? 'Chargement des postes...' : 'Loading postes...'}</span>
      </div>
    );
  }

  if (postes.length === 0) {
    return (
      <p className="text-gray-500">
        {fr ? 'Aucun poste défini. La gestion des postes se fait dans Droits d\'accès (onglet Postes).' : 'No postes defined. Poste management is in Access rights (Postes tab).'}
      </p>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Nom' : 'Name'}</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Portée' : 'Scope'}</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Statut' : 'Status'}</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {postes.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.name}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{p.slug ?? '—'}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{p.organizationId == null ? (fr ? 'Global' : 'Global') : (fr ? 'Organisation' : 'Organization')}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 text-xs rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {p.isActive ? (fr ? 'Actif' : 'Active') : (fr ? 'Inactif' : 'Inactive')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 px-4 py-2 border-t border-gray-100">
        {fr ? 'Pour créer ou modifier les postes : Droits d\'accès → onglet Postes.' : 'To create or edit postes: Access rights → Postes tab.'}
      </p>
    </div>
  );
};

export default PostesListReadOnly;
