import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { DataCollection, Language, Course, Project, Programme } from '../types';
import OrganizationService from '../services/organizationService';
import DataAdapter from '../services/dataAdapter';
import * as programmeService from '../services/programmeService';
import * as dataCollectionService from '../services/dataCollectionService';

type AssignmentKind = 'project' | 'programme' | 'formation';

function makeId(): string {
  try {
    // randomUUID n'existe pas partout (selon navigateur / contexte).
    const anyCrypto = (globalThis as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `dc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const CollecteModule: React.FC = () => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;
  const [orgId, setOrgId] = useState<string | null>(null);
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignKind, setAssignKind] = useState<AssignmentKind>('project');
  const [projectId, setProjectId] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [formationId, setFormationId] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | AssignmentKind>('all');

  const refresh = useCallback(() => {
    setCollections(dataCollectionService.listDataCollections(orgId));
  }, [orgId]);

  useEffect(() => {
    OrganizationService.getCurrentUserOrganizationId()
      .then(setOrgId)
      .catch(() => setOrgId(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [pList, prList, cList] = await Promise.all([
        DataAdapter.getProjects(),
        programmeService.listProgrammes(orgId ?? undefined),
        DataAdapter.getCourses(),
      ]);
      if (!cancelled) {
        setProjects(pList);
        setProgrammes(prList);
        setCourses(cList);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filteredList = useMemo(() => {
    if (filterKind === 'all') return collections;
    return collections.filter((c) => {
      if (filterKind === 'project') return !!c.projectId;
      if (filterKind === 'programme') return !!c.programmeId;
      return !!c.formationId;
    });
  }, [collections, filterKind]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAssignKind('project');
    setProjectId('');
    setProgrammeId('');
    setFormationId('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const tid = makeId();
    const now = new Date().toISOString();
    const base: Omit<DataCollection, 'projectId' | 'programmeId' | 'formationId'> & {
      projectId?: string | null;
      programmeId?: string | null;
      formationId?: string | null;
    } = {
      id: tid,
      organizationId: orgId,
      name: name.trim(),
      description: description.trim() || undefined,
      status: 'active',
      linkedToCrm: false,
      reusedFromCollecteId: null,
      createdAt: now,
      updatedAt: now,
      projectId: null,
      programmeId: null,
      formationId: null,
    };
    if (assignKind === 'project') {
      if (!projectId) return;
      base.projectId = projectId;
    } else if (assignKind === 'programme') {
      if (!programmeId) return;
      base.programmeId = programmeId;
    } else {
      if (!formationId) return;
      base.formationId = formationId;
    }
    dataCollectionService.upsertDataCollection(base as DataCollection);
    refresh();
    resetForm();
  };

  const duplicateForReuse = (src: DataCollection) => {
    const tid = makeId();
    const now = new Date().toISOString();
    const copy: DataCollection = {
      ...src,
      id: tid,
      name: `${src.name} (${isFr ? 'copie' : 'copy'})`,
      linkedToCrm: false,
      reusedFromCollecteId: src.id,
      createdAt: now,
      updatedAt: now,
    };
    dataCollectionService.upsertDataCollection(copy);
    refresh();
  };

  const markCrm = (id: string) => {
    dataCollectionService.markDataCollectionLinkedToCrm(id);
    refresh();
  };

  const remove = (id: string) => {
    if (!confirm(isFr ? 'Supprimer cette collecte ?' : 'Delete this collection?')) return;
    dataCollectionService.deleteDataCollection(id);
    refresh();
  };

  const labelForCollection = (c: DataCollection) => {
    if (c.projectId) {
      const p = projects.find((x) => String(x.id) === String(c.projectId));
      return isFr ? `Projet : ${p?.title ?? c.projectId}` : `Project: ${p?.title ?? c.projectId}`;
    }
    if (c.programmeId) {
      const pr = programmes.find((x) => x.id === c.programmeId);
      return isFr ? `Programme : ${pr?.name ?? c.programmeId}` : `Programme: ${pr?.name ?? c.programmeId}`;
    }
    if (c.formationId) {
      const cr = courses.find((x) => x.id === c.formationId);
      return isFr ? `Formation (cours) : ${cr?.title ?? c.formationId}` : `Course: ${cr?.title ?? c.formationId}`;
    }
    return isFr ? 'Non rattachée' : 'Unassigned';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-900">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <i className="fas fa-clipboard-list text-slate-600" />
          {isFr ? 'Collecte de données' : 'Data collection'}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          {isFr
            ? 'Chaque campagne se rattache à un projet, un programme ou une formation globale (module Cours), distinct de la formation RH. Les collectes peuvent être réutilisées ou liées au CRM pour enrichir les contacts.'
            : 'Each campaign links to a project, programme, or global course (Courses module), distinct from HR training. Collections can be reused or pushed to CRM to enrich contacts.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {isFr ? 'Nouvelle collecte' : 'New collection'}
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Nom' : 'Name'}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Description' : 'Description'}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">{isFr ? 'Rattachement' : 'Assignment'}</span>
              <div className="flex flex-wrap gap-3">
                {(['project', 'programme', 'formation'] as AssignmentKind[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="kind" checked={assignKind === k} onChange={() => setAssignKind(k)} className="rounded-full border-slate-300" />
                    {k === 'project' && (isFr ? 'Projet' : 'Project')}
                    {k === 'programme' && (isFr ? 'Programme' : 'Programme')}
                    {k === 'formation' && (isFr ? 'Formation (cours)' : 'Course')}
                  </label>
                ))}
              </div>
            </div>
            {assignKind === 'project' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Projet' : 'Project'}</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                >
                  <option value="">{isFr ? '— Choisir —' : '— Choose —'}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {assignKind === 'programme' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Programme' : 'Programme'}</label>
                <select
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                >
                  <option value="">{isFr ? '— Choisir —' : '— Choose —'}</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {assignKind === 'formation' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{isFr ? 'Cours / formation globale' : 'Global course'}</label>
                <select
                  value={formationId}
                  onChange={(e) => setFormationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                >
                  <option value="">{isFr ? '— Choisir —' : '— Choose —'}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800">
              {isFr ? 'Enregistrer la collecte' : 'Save collection'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{isFr ? 'Stratégie & réutilisation' : 'Strategy & reuse'}</h2>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            <li>{isFr ? 'Une collecte est versionnée localement (navigateur) jusqu’à branchement API / Supabase.' : 'Collections are stored in the browser until API / Supabase is wired.'}</li>
            <li>{isFr ? 'Réutiliser : duplique la campagne pour un autre rattachement ou enrichis le CRM depuis le module CRM.' : 'Reuse: duplicate the campaign or enrich CRM from the CRM module.'}</li>
            <li>{isFr ? 'Lier au CRM : marque la collecte ou crée un contact depuis « Enrichir depuis une collecte ».' : 'CRM link: flag the collection or create a contact via CRM “Enrich from collection”.'}</li>
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-slate-600">{isFr ? 'Filtre' : 'Filter'}:</span>
        {(['all', 'project', 'programme', 'formation'] as const).map((fk) => (
          <button
            key={fk}
            type="button"
            onClick={() => setFilterKind(fk)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
              filterKind === fk ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {fk === 'all' && (isFr ? 'Toutes' : 'All')}
            {fk === 'project' && (isFr ? 'Projets' : 'Projects')}
            {fk === 'programme' && (isFr ? 'Programmes' : 'Programmes')}
            {fk === 'formation' && (isFr ? 'Formations' : 'Courses')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <p className="text-slate-500 text-sm">{isFr ? 'Aucune collecte pour ce filtre.' : 'No collections for this filter.'}</p>
        ) : (
          filteredList.map((c) => (
            <article key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{labelForCollection(c)}</p>
                {c.description && <p className="text-sm text-slate-600 mt-2">{c.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.linkedToCrm && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">CRM</span>
                  )}
                  {c.reusedFromCollecteId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {isFr ? 'Réutilisation' : 'Reused'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => duplicateForReuse(c)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isFr ? 'Dupliquer' : 'Duplicate'}
                </button>
                {!c.linkedToCrm && (
                  <button
                    type="button"
                    onClick={() => markCrm(c.id)}
                    className="px-3 py-2 rounded-xl border border-emerald-200 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                  >
                    {isFr ? 'Marquer lien CRM' : 'Mark CRM link'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="px-3 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  {isFr ? 'Supprimer' : 'Delete'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default CollecteModule;
