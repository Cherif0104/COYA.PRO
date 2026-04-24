import React, { useState, useEffect } from 'react';
import { Poste } from '../types';
import OrganizationService from '../services/organizationService';
import * as postesService from '../services/postesService';
import { useLocalization } from '../contexts/LocalizationContext';
import { HR_POSTE_CATALOG_EN, HR_POSTE_CATALOG_FR } from '../constants/hrPosteCatalog';

/** Liste en lecture seule des postes – intégrée dans RhModule (onglet Fiche poste) */
const PostesListReadOnly: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
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

  const catalog = fr ? HR_POSTE_CATALOG_FR : HR_POSTE_CATALOG_EN;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
        <span>{fr ? 'Chargement des postes...' : 'Loading postes...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <details className="rounded-lg border border-slate-200 bg-slate-50/80 open:bg-white" open={!compact}>
        <summary className={`cursor-pointer font-semibold text-slate-800 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden ${compact ? 'px-2 py-2 text-xs' : 'px-3 py-2.5 text-sm'}`}>
          <span>{fr ? 'Référentiel de postes suggérés' : 'Suggested job title catalog'}</span>
          <span className="text-slate-400 font-normal text-xs">{fr ? '(aide à la saisie)' : '(reference)'}</span>
        </summary>
        <div className={`px-3 pb-3 flex flex-wrap gap-1 border-t border-slate-100 ${compact ? 'pt-2' : 'pt-3'}`}>
          {catalog.map((label) => (
            <span
              key={label}
              className={`inline-flex rounded-full border border-slate-200 bg-white text-slate-700 ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </details>

      {postes.length === 0 ? (
        <p className="text-sm text-slate-500">
          {fr
            ? 'Aucun poste en base. Utilisez Paramètres → Utilisateurs & droits → Postes pour créer les fiches, en vous inspirant du référentiel ci-dessus.'
            : 'No postes in the database. Use Settings → Users & rights → Postes to create records, using the catalog above as a guide.'}
        </p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">{fr ? 'Nom' : 'Name'}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Slug</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">{fr ? 'Portée' : 'Scope'}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">{fr ? 'Statut' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {postes.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-1.5 text-sm font-medium text-slate-900">{p.name}</td>
                  <td className="px-3 py-1.5 text-sm text-slate-500">{p.slug ?? '—'}</td>
                  <td className="px-3 py-1.5 text-sm text-slate-500">
                    {p.organizationId == null ? (fr ? 'Global' : 'Global') : fr ? 'Organisation' : 'Organization'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {p.isActive ? (fr ? 'Actif' : 'Active') : fr ? 'Inactif' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 px-3 py-2 border-t border-slate-100">
            {fr ? 'Création / édition : Paramètres → Utilisateurs & droits → Postes.' : 'Create / edit: Settings → Users & rights → Postes.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PostesListReadOnly;
