import React, { useState, useEffect, useCallback } from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useAppNavigation } from '../contexts/AppNavigationContext';
import {
  Language,
  Bailleur,
  Programme,
  ProgrammeBudgetLine,
  Beneficiaire,
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  Project,
  ExpenseRequest,
  ProgrammeStakeholder,
  ProgrammeStakeholderType,
  ProgrammeAction,
  ProgrammeDataRow,
  ProgrammeBailleurLink,
} from '../types';
import * as programmeService from '../services/programmeService';
import { DataAdapter } from '../services/dataAdapter';
import { DataService } from '../services/dataService';
import { supabase } from '../services/supabaseService';
import OrganizationService from '../services/organizationService';
import ConfirmationModal from './common/ConfirmationModal';

/** Phase 3 – Programme & Bailleur : programmes, bailleurs, budget, bénéficiaires */
const ProgrammeModule: React.FC = () => {
  const { language } = useLocalization();
  const { user: currentUser } = useAuth();
  const nav = useAppNavigation();
  const isFr = language === Language.FR;

  const [bailleurs, setBailleurs] = useState<Bailleur[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [budgetLines, setBudgetLines] = useState<ProgrammeBudgetLine[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'bailleurs' | 'programmes'>('programmes');
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [selectedBailleur, setSelectedBailleur] = useState<Bailleur | null>(null);
  const [showBailleurForm, setShowBailleurForm] = useState(false);
  const [showProgrammeForm, setShowProgrammeForm] = useState(false);
  const [showBudgetLineForm, setShowBudgetLineForm] = useState(false);
  const [showBeneficiaireForm, setShowBeneficiaireForm] = useState(false);
  const [editBailleur, setEditBailleur] = useState<Bailleur | null>(null);
  const [editProgramme, setEditProgramme] = useState<Programme | null>(null);
  const [editBudgetLine, setEditBudgetLine] = useState<ProgrammeBudgetLine | null>(null);
  const [editBeneficiaire, setEditBeneficiaire] = useState<Beneficiaire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'bailleur' | 'programme' | 'budget_line' | 'beneficiaire'; id: string }
    | { type: 'stakeholder' | 'action' | 'data_row' | 'prog_bailleur'; id: string }
    | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [projectsForProgramme, setProjectsForProgramme] = useState<Project[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [isAuditorReadOnly, setIsAuditorReadOnly] = useState(false);
  const [showExpenseRequestForm, setShowExpenseRequestForm] = useState(false);
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'synthese' | 'budget' | 'stakeholders' | 'actions' | 'collecte' | 'projets'>('synthese');
  const [extraBailleurs, setExtraBailleurs] = useState<ProgrammeBailleurLink[]>([]);
  const [stakeholders, setStakeholders] = useState<ProgrammeStakeholder[]>([]);
  const [actionsList, setActionsList] = useState<ProgrammeAction[]>([]);
  const [dataRows, setDataRows] = useState<ProgrammeDataRow[]>([]);
  const [collectSection, setCollectSection] = useState('participants');
  const [orgProfiles, setOrgProfiles] = useState<{ id: string; label: string }[]>([]);
  const [myProfileId, setMyProfileId] = useState('');
  const [extraBailleurToAdd, setExtraBailleurToAdd] = useState('');

  const userOrgId = (currentUser as any)?.organizationId ?? null;
  const organizationId = resolvedOrgId ?? userOrgId;
  const currentUserId = (currentUser as any)?.id ?? (currentUser as any)?.user_id ?? null;

  useEffect(() => {
    OrganizationService.getCurrentUserOrganizationId().then((id) => setResolvedOrgId(id));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    DataService.getProfiles().then(({ data }) => {
      const rows = (data || []).filter((p: any) => !organizationId || p.organization_id === organizationId);
      setOrgProfiles(rows.map((p: any) => ({ id: String(p.id), label: p.full_name || p.email || String(p.id) })));
    });
  }, [organizationId]);

  useEffect(() => {
    if (!currentUser) return;
    const uid = String((currentUser as any).id || currentUser.id || '');
    (async () => {
      const { data } = await DataService.getProfile(uid);
      let pid = String((currentUser as any)?.profileId || data?.id || '');
      if (!pid && uid) {
        const { data: row } = await supabase.from('profiles').select('id').eq('user_id', uid).maybeSingle();
        if (row?.id) pid = String(row.id);
      }
      setMyProfileId(pid);
    })();
  }, [currentUser]);

  const loadProgrammeExtras = useCallback(async (programmeId: string) => {
    const [eb, st, ac, dr] = await Promise.all([
      programmeService.listProgrammeBailleurs(programmeId),
      programmeService.listProgrammeStakeholders(programmeId),
      programmeService.listProgrammeActions(programmeId),
      programmeService.listProgrammeDataRows(programmeId),
    ]);
    setExtraBailleurs(eb);
    setStakeholders(st);
    setActionsList(ac);
    setDataRows(dr);
  }, []);

  const loadBailleurs = useCallback(async () => {
    try {
      const list = await programmeService.listBailleurs(organizationId);
      setBailleurs(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement bailleurs');
    }
  }, [organizationId]);

  const loadProgrammes = useCallback(async () => {
    try {
      const list = await programmeService.listProgrammes(organizationId);
      setProgrammes(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement programmes');
    }
  }, [organizationId]);

  const loadBudgetLines = useCallback(async () => {
    if (!selectedProgramme?.id) {
      setBudgetLines([]);
      return;
    }
    try {
      const list = await programmeService.listProgrammeBudgetLines(selectedProgramme.id);
      setBudgetLines(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement lignes budgétaires');
    }
  }, [selectedProgramme?.id]);

  const loadBeneficiaires = useCallback(async () => {
    try {
      const list = await programmeService.listBeneficiaires({
        organizationId,
        programmeId: selectedProgramme?.id ?? undefined,
      });
      setBeneficiaires(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement bénéficiaires');
    }
  }, [organizationId, selectedProgramme?.id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([loadBailleurs(), loadProgrammes()]).finally(() => setLoading(false));
  }, [loadBailleurs, loadProgrammes]);

  useEffect(() => {
    if (selectedProgramme) {
      loadBudgetLines();
      loadBeneficiaires();
    } else {
      setBudgetLines([]);
      setBeneficiaires([]);
    }
  }, [selectedProgramme, loadBudgetLines, loadBeneficiaires]);

  useEffect(() => {
    if (!selectedProgramme?.id) {
      setProjectsForProgramme([]);
      setExpenseRequests([]);
      setIsAuditorReadOnly(false);
      setExtraBailleurs([]);
      setStakeholders([]);
      setActionsList([]);
      setDataRows([]);
      return;
    }
    let cancelled = false;
    const pid = selectedProgramme.id;
    loadProgrammeExtras(pid);
    Promise.all([
      DataAdapter.getProjects().then((list) => list.filter((p) => p.programmeId === pid)),
      programmeService.listExpenseRequests(pid),
      currentUserId ? programmeService.isUserAuditorForProgramme(pid, currentUserId) : Promise.resolve(false),
      programmeService.getProgramme(pid),
    ]).then(([projects, requests, isAuditor, fresh]) => {
      if (cancelled) return;
      setProjectsForProgramme(projects);
      setExpenseRequests(requests);
      setIsAuditorReadOnly(!!isAuditor);
      if (fresh) setSelectedProgramme(fresh);
    });
    return () => { cancelled = true; };
  }, [selectedProgramme?.id, currentUserId, loadProgrammeExtras]);

  const handleSaveBailleur = async (e: React.FormEvent, form: { name: string; code: string; description: string; contact: string }) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editBailleur) {
        await programmeService.updateBailleur(editBailleur.id, {
          name: form.name.trim(),
          code: form.code.trim() || null,
          description: form.description.trim() || null,
          contact: form.contact.trim() || null,
        });
        await loadBailleurs();
        setEditBailleur(null);
      } else {
        await programmeService.createBailleur({
          organizationId,
          name: form.name.trim(),
          code: form.code.trim() || null,
          description: form.description.trim() || null,
          contact: form.contact.trim() || null,
        });
        await loadBailleurs();
        setShowBailleurForm(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgramme = async (
    e: React.FormEvent,
    form: {
      name: string;
      code: string;
      description: string;
      bailleurId: string;
      startDate: string;
      endDate: string;
      allowProjects: boolean;
    }
  ) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editProgramme) {
        await programmeService.updateProgramme(editProgramme.id, {
          name: form.name.trim(),
          code: form.code.trim() || null,
          description: form.description.trim() || null,
          bailleurId: form.bailleurId || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          allowProjects: form.allowProjects,
        });
        await loadProgrammes();
        if (selectedProgramme?.id === editProgramme.id) {
          const updated = await programmeService.getProgramme(editProgramme.id);
          if (updated) setSelectedProgramme(updated);
        }
        setEditProgramme(null);
      } else {
        await programmeService.createProgramme({
          organizationId,
          name: form.name.trim(),
          code: form.code.trim() || null,
          description: form.description.trim() || null,
          bailleurId: form.bailleurId || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          allowProjects: form.allowProjects,
        });
        await loadProgrammes();
        setShowProgrammeForm(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBudgetLine = async (
    e: React.FormEvent,
    form: { label: string; plannedAmount: string; spentAmount: string; currency: CurrencyCode }
  ) => {
    e.preventDefault();
    if (!selectedProgramme?.id || !form.label.trim()) return;
    const planned = parseFloat(form.plannedAmount) || 0;
    const spent = parseFloat(form.spentAmount) || 0;
    setSubmitting(true);
    try {
      if (editBudgetLine) {
        await programmeService.updateProgrammeBudgetLine(editBudgetLine.id, {
          label: form.label.trim(),
          plannedAmount: planned,
          spentAmount: spent,
          currency: form.currency,
        });
        await loadBudgetLines();
        setEditBudgetLine(null);
      } else {
        await programmeService.createProgrammeBudgetLine({
          programmeId: selectedProgramme.id,
          label: form.label.trim(),
          plannedAmount: planned,
          spentAmount: spent,
          currency: form.currency,
        });
        await loadBudgetLines();
        setShowBudgetLineForm(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBeneficiaire = async (e: React.FormEvent, form: Partial<Beneficiaire>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editBeneficiaire) {
        await programmeService.updateBeneficiaire(editBeneficiaire.id, {
          programmeId: form.programmeId ?? editBeneficiaire.programmeId,
          projectId: form.projectId ?? editBeneficiaire.projectId,
          theme: form.theme ?? editBeneficiaire.theme,
          target: form.target ?? editBeneficiaire.target,
          gender: form.gender ?? editBeneficiaire.gender,
          sector: form.sector ?? editBeneficiaire.sector,
          country: form.country ?? editBeneficiaire.country,
          region: form.region ?? editBeneficiaire.region,
          contact: form.contact ?? editBeneficiaire.contact,
          age: form.age ?? editBeneficiaire.age,
          education: form.education ?? editBeneficiaire.education,
          profession: form.profession ?? editBeneficiaire.profession,
        });
        await loadBeneficiaires();
        setEditBeneficiaire(null);
      } else {
        await programmeService.createBeneficiaire({
          organizationId,
          programmeId: selectedProgramme?.id ?? form.programmeId ?? null,
          projectId: form.projectId ?? null,
          theme: form.theme ?? null,
          target: form.target ?? null,
          gender: form.gender ?? null,
          sector: form.sector ?? null,
          country: form.country ?? null,
          region: form.region ?? null,
          contact: form.contact ?? null,
          age: form.age ?? null,
          education: form.education ?? null,
          profession: form.profession ?? null,
        });
        await loadBeneficiaires();
        setShowBeneficiaireForm(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.type === 'bailleur') {
        await programmeService.deleteBailleur(deleteTarget.id);
        await loadBailleurs();
      } else if (deleteTarget.type === 'programme') {
        await programmeService.deleteProgramme(deleteTarget.id);
        await loadProgrammes();
        if (selectedProgramme?.id === deleteTarget.id) setSelectedProgramme(null);
      } else if (deleteTarget.type === 'budget_line') {
        await programmeService.deleteProgrammeBudgetLine(deleteTarget.id);
        await loadBudgetLines();
      } else if (deleteTarget.type === 'beneficiaire') {
        await programmeService.deleteBeneficiaire(deleteTarget.id);
        await loadBeneficiaires();
      } else if (deleteTarget.type === 'stakeholder') {
        await programmeService.deleteProgrammeStakeholder(deleteTarget.id);
        if (selectedProgramme) await loadProgrammeExtras(selectedProgramme.id);
      } else if (deleteTarget.type === 'action') {
        await programmeService.deleteProgrammeAction(deleteTarget.id);
        if (selectedProgramme) await loadProgrammeExtras(selectedProgramme.id);
      } else if (deleteTarget.type === 'data_row') {
        await programmeService.deleteProgrammeDataRow(deleteTarget.id);
        if (selectedProgramme) await loadProgrammeExtras(selectedProgramme.id);
      } else if (deleteTarget.type === 'prog_bailleur') {
        await programmeService.removeProgrammeBailleur(deleteTarget.id);
        if (selectedProgramme) await loadProgrammeExtras(selectedProgramme.id);
      }
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const sections = [
    {
      key: 'programmes',
      titleFr: 'Programmes',
      titleEn: 'Programmes',
      icon: 'fas fa-chart-line',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Programmes financés par bailleurs. Liste et fiche programme avec lignes budgétaires et bénéficiaires.'
            : 'Donor-funded programmes. List and programme sheet with budget lines and beneficiaries.'}
        </p>
      ),
    },
    {
      key: 'budget',
      titleFr: 'Lignes budgétaires',
      titleEn: 'Budget lines',
      icon: 'fas fa-coins',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Lignes budgétaires par poste de dépense (programme), prévisionnel et dépensé.'
            : 'Budget lines by expense item, planned and spent.'}
        </p>
      ),
    },
    {
      key: 'beneficiaires',
      titleFr: 'Bénéficiaires',
      titleEn: 'Beneficiaries',
      icon: 'fas fa-users',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Thème, cible, genre, secteur, pays, région, contact, âge, niveau d\'études, profession.'
            : 'Theme, target, gender, sector, country, region, contact, age, education, profession.'}
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="programme"
      titleFr="Programme & Bailleur"
      titleEn="Programme & Donor"
      descriptionFr="Programmes financés par bailleurs. Projets par programme, budget, bénéficiaires."
      descriptionEn="Donor-funded programmes. Budget, beneficiaries."
      icon="fas fa-chart-line"
      sections={sections}
    >
      {error && (
        <div className="mb-4 p-3 rounded-coya bg-red-100 text-red-800 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-coya-border">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'programmes' ? 'border-b-2 border-coya-primary text-coya-primary' : 'text-coya-text-muted'}`}
          onClick={() => setActiveTab('programmes')}
        >
          {isFr ? 'Programmes' : 'Programmes'}
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'bailleurs' ? 'border-b-2 border-coya-primary text-coya-primary' : 'text-coya-text-muted'}`}
          onClick={() => setActiveTab('bailleurs')}
        >
          {isFr ? 'Bailleurs' : 'Donors'}
        </button>
      </div>

      {activeTab === 'bailleurs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white"
              onClick={() => { setShowBailleurForm(true); setEditBailleur(null); }}
            >
              {isFr ? 'Nouveau bailleur' : 'New donor'}
            </button>
          </div>
          {(showBailleurForm || editBailleur) && (
            <BailleurForm
              isFr={isFr}
              initial={editBailleur || undefined}
              onSubmit={handleSaveBailleur}
              onCancel={() => { setShowBailleurForm(false); setEditBailleur(null); }}
              submitting={submitting}
            />
          )}
          <div className="rounded-coya border border-coya-border bg-coya-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-coya-bg text-coya-text-muted">
                <tr>
                  <th className="p-3 font-medium">{isFr ? 'Nom' : 'Name'}</th>
                  <th className="p-3 font-medium">{isFr ? 'Code' : 'Code'}</th>
                  <th className="p-3 font-medium">{isFr ? 'Contact' : 'Contact'}</th>
                  <th className="p-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody className="text-coya-text">
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center">{isFr ? 'Chargement…' : 'Loading…'}</td></tr>
                ) : bailleurs.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-coya-text-muted">{isFr ? 'Aucun bailleur' : 'No donors'}</td></tr>
                ) : (
                  bailleurs.map((b) => (
                    <tr key={b.id} className="border-t border-coya-border">
                      <td className="p-3">{b.name}</td>
                      <td className="p-3">{b.code || '—'}</td>
                      <td className="p-3">{b.contact || '—'}</td>
                      <td className="p-3">
                        <button type="button" className="text-coya-primary mr-2" onClick={() => setEditBailleur(b)}>{isFr ? 'Modifier' : 'Edit'}</button>
                        <button type="button" className="text-red-600" onClick={() => setDeleteTarget({ type: 'bailleur', id: b.id })}>{isFr ? 'Supprimer' : 'Delete'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'programmes' && (
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white"
                onClick={() => { setShowProgrammeForm(true); setEditProgramme(null); }}
              >
                {isFr ? 'Nouveau programme' : 'New programme'}
              </button>
            </div>
            {(showProgrammeForm || editProgramme) && (
              <ProgrammeForm
                key={editProgramme?.id || 'new-programme'}
                isFr={isFr}
                bailleurs={bailleurs}
                initial={editProgramme || undefined}
                onSubmit={handleSaveProgramme}
                onCancel={() => { setShowProgrammeForm(false); setEditProgramme(null); }}
                submitting={submitting}
              />
            )}
            <div className="rounded-coya border border-coya-border bg-coya-card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-coya-bg text-coya-text-muted">
                  <tr>
                    <th className="p-3 font-medium">{isFr ? 'Nom' : 'Name'}</th>
                    <th className="p-3 font-medium">{isFr ? 'Bailleur' : 'Donor'}</th>
                    <th className="p-3 font-medium">{isFr ? 'Début / Fin' : 'Start / End'}</th>
                    <th className="p-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="text-coya-text">
                  {loading ? (
                    <tr><td colSpan={4} className="p-4 text-center">{isFr ? 'Chargement…' : 'Loading…'}</td></tr>
                  ) : programmes.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-coya-text-muted">{isFr ? 'Aucun programme' : 'No programmes'}</td></tr>
                  ) : (
                    programmes.map((p) => (
                      <tr
                        key={p.id}
                        className={`border-t border-coya-border cursor-pointer ${selectedProgramme?.id === p.id ? 'bg-coya-primary/10' : 'hover:bg-coya-bg/50'}`}
                        onClick={() => setSelectedProgramme(p)}
                      >
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3">{p.bailleurName || '—'}</td>
                        <td className="p-3">
                          {p.startDate || '—'} / {p.endDate || '—'}
                        </td>
                        <td className="p-3" onClick={(ev) => ev.stopPropagation()}>
                          {!(isAuditorReadOnly && selectedProgramme?.id === p.id) && (
                            <>
                              <button type="button" className="text-coya-primary mr-2" onClick={() => setEditProgramme(p)}>{isFr ? 'Modifier' : 'Edit'}</button>
                              <button type="button" className="text-red-600" onClick={() => setDeleteTarget({ type: 'programme', id: p.id })}>{isFr ? 'Supprimer' : 'Delete'}</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedProgramme && (
            <div className="w-full max-w-xl flex-shrink-0 space-y-3 border-l border-coya-border pl-4">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['synthese', isFr ? 'Synthèse' : 'Overview'],
                    ['budget', isFr ? 'Budget & bénéf.' : 'Budget & ben.'],
                    ['stakeholders', isFr ? 'Parties prenantes' : 'Stakeholders'],
                    ['actions', isFr ? 'Plans d’action' : 'Actions'],
                    ['collecte', isFr ? 'Collecte' : 'Data grid'],
                    ['projets', isFr ? 'Projets' : 'Projects'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      detailTab === id ? 'bg-coya-primary text-white' : 'bg-coya-bg text-coya-text'
                    }`}
                    onClick={() => setDetailTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {detailTab === 'synthese' && (
                <>
                  <div className="rounded-coya border border-coya-border bg-coya-card p-4">
                    <h3 className="font-semibold text-coya-text mb-2">{selectedProgramme.name}</h3>
                    <p className="text-sm text-coya-text-muted mb-2">{selectedProgramme.description || '—'}</p>
                    <p className="text-sm">{isFr ? 'Bailleur principal' : 'Primary donor'}: {selectedProgramme.bailleurName || '—'}</p>
                    <p className="text-sm">{selectedProgramme.startDate} → {selectedProgramme.endDate || '—'}</p>
                    {!isAuditorReadOnly && (
                      <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProgramme.allowProjects !== false}
                          onChange={async (e) => {
                            try {
                              await programmeService.updateProgramme(selectedProgramme.id, { allowProjects: e.target.checked });
                              const u = await programmeService.getProgramme(selectedProgramme.id);
                              if (u) setSelectedProgramme(u);
                              await loadProgrammes();
                            } catch (err: any) {
                              setError(err?.message || 'Erreur');
                            }
                          }}
                        />
                        {isFr ? 'Autoriser les projets rattachés' : 'Allow linked projects'}
                      </label>
                    )}
                  </div>
                  <div className="rounded-coya border border-coya-border bg-coya-card p-4">
                    <h4 className="font-medium text-sm mb-2">{isFr ? 'Bailleurs additionnels' : 'Additional donors'}</h4>
                    <div className="flex gap-2 flex-wrap items-center">
                      <select
                        className="flex-1 min-w-[140px] rounded-coya border border-coya-border px-2 py-1 text-sm"
                        value={extraBailleurToAdd}
                        onChange={(e) => setExtraBailleurToAdd(e.target.value)}
                      >
                        <option value="">—</option>
                        {bailleurs
                          .filter((b) => b.id !== selectedProgramme.bailleurId && !extraBailleurs.some((x) => x.bailleurId === b.id))
                          .map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                      </select>
                      {!isAuditorReadOnly && (
                        <button
                          type="button"
                          className="rounded-coya bg-coya-primary px-2 py-1 text-xs text-white"
                          onClick={async () => {
                            if (!extraBailleurToAdd || !selectedProgramme) return;
                            try {
                              await programmeService.addProgrammeBailleur(selectedProgramme.id, extraBailleurToAdd);
                              setExtraBailleurToAdd('');
                              await loadProgrammeExtras(selectedProgramme.id);
                            } catch (err: any) {
                              setError(err?.message || 'Erreur');
                            }
                          }}
                        >
                          {isFr ? 'Ajouter' : 'Add'}
                        </button>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {extraBailleurs.map((l) => (
                        <li key={l.id} className="flex justify-between p-1 bg-coya-bg rounded">
                          <span>{l.bailleurName || l.bailleurId}</span>
                          {!isAuditorReadOnly && (
                            <button type="button" className="text-red-600 text-xs" onClick={() => setDeleteTarget({ type: 'prog_bailleur', id: l.id })}>×</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {detailTab === 'budget' && (
                <>
                  <p className="text-xs text-coya-text-muted">{isFr ? 'Prévisionnel vs réel par ligne budgétaire.' : 'Planned vs spent per budget line.'}</p>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-coya-text">{isFr ? 'Lignes budgétaires' : 'Budget lines'}</h4>
                      {!isAuditorReadOnly && (
                        <button type="button" className="text-sm text-coya-primary" onClick={() => { setShowBudgetLineForm(true); setEditBudgetLine(null); }}>
                          + {isFr ? 'Ajouter' : 'Add'}
                        </button>
                      )}
                    </div>
                    {(showBudgetLineForm || editBudgetLine) && (
                      <BudgetLineForm
                        isFr={isFr}
                        initial={editBudgetLine || undefined}
                        onSubmit={handleSaveBudgetLine}
                        onCancel={() => { setShowBudgetLineForm(false); setEditBudgetLine(null); }}
                        submitting={submitting}
                      />
                    )}
                    <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                      {budgetLines.map((bl) => (
                        <li key={bl.id} className="flex flex-col p-2 bg-coya-bg rounded-coya gap-0.5">
                          <span className="font-medium">{bl.label}</span>
                          <span className="text-coya-text-muted text-xs">
                            {isFr ? 'Prév.' : 'Plan.'} {bl.plannedAmount} {bl.currency || 'XOF'} · {isFr ? 'Réel' : 'Actual'} {bl.spentAmount ?? 0}
                          </span>
                          {!isAuditorReadOnly && (
                            <span>
                              <button type="button" className="text-coya-primary mr-1 text-xs" onClick={() => setEditBudgetLine(bl)}>{isFr ? 'Mod.' : 'Edit'}</button>
                              <button type="button" className="text-red-600 text-xs" onClick={() => setDeleteTarget({ type: 'budget_line', id: bl.id })}>×</button>
                            </span>
                          )}
                        </li>
                      ))}
                      {budgetLines.length === 0 && !showBudgetLineForm && (
                        <li className="text-coya-text-muted p-2">{isFr ? 'Aucune ligne' : 'No lines'}</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-coya-text">{isFr ? 'Bénéficiaires' : 'Beneficiaries'}</h4>
                      {!isAuditorReadOnly && (
                        <button type="button" className="text-sm text-coya-primary" onClick={() => { setShowBeneficiaireForm(true); setEditBeneficiaire(null); }}>
                          + {isFr ? 'Ajouter' : 'Add'}
                        </button>
                      )}
                    </div>
                    {(showBeneficiaireForm || editBeneficiaire) && (
                      <BeneficiaireForm
                        isFr={isFr}
                        initial={editBeneficiaire || undefined}
                        onSubmit={handleSaveBeneficiaire}
                        onCancel={() => { setShowBeneficiaireForm(false); setEditBeneficiaire(null); }}
                        submitting={submitting}
                      />
                    )}
                    <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                      {beneficiaires.map((b) => (
                        <li key={b.id} className="flex justify-between items-center p-2 bg-coya-bg rounded-coya">
                          <span>{b.theme || b.contact || b.id.slice(0, 8)}</span>
                          {!isAuditorReadOnly && (
                            <span>
                              <button type="button" className="text-coya-primary mr-1 text-xs" onClick={() => setEditBeneficiaire(b)}>{isFr ? 'Mod.' : 'Edit'}</button>
                              <button type="button" className="text-red-600 text-xs" onClick={() => setDeleteTarget({ type: 'beneficiaire', id: b.id })}>×</button>
                            </span>
                          )}
                        </li>
                      ))}
                      {beneficiaires.length === 0 && !showBeneficiaireForm && (
                        <li className="text-coya-text-muted p-2">{isFr ? 'Aucun bénéficiaire' : 'No beneficiaries'}</li>
                      )}
                    </ul>
                  </div>
                </>
              )}

              {detailTab === 'stakeholders' && selectedProgramme && (
                <div className="rounded-coya border border-coya-border bg-coya-card p-3">
                  <ProgrammeStakeholderQuickAdd
                    isFr={isFr}
                    programmeId={selectedProgramme.id}
                    orgProfiles={orgProfiles}
                    disabled={isAuditorReadOnly}
                    onCreated={() => loadProgrammeExtras(selectedProgramme.id)}
                  />
                  <ul className="space-y-2 text-sm">
                    {stakeholders.map((s) => (
                      <li key={s.id} className="p-2 bg-coya-bg rounded flex justify-between gap-2">
                        <div>
                          <span className="font-medium text-xs uppercase text-coya-text-muted">{s.stakeholderType}</span>
                          <p>{orgProfiles.find((p) => p.id === s.profileId)?.label || s.externalName || s.profileId || '—'}</p>
                          {(s.externalRole || s.externalContact) && (
                            <p className="text-xs text-coya-text-muted">{s.externalRole} {s.externalContact}</p>
                          )}
                        </div>
                        {!isAuditorReadOnly && (
                          <button type="button" className="text-red-600 text-xs shrink-0" onClick={() => setDeleteTarget({ type: 'stakeholder', id: s.id })}>×</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailTab === 'actions' && selectedProgramme && (
                <div className="rounded-coya border border-coya-border bg-coya-card p-3">
                  <ProgrammeActionQuickAdd
                    isFr={isFr}
                    programmeId={selectedProgramme.id}
                    orgProfiles={orgProfiles}
                    disabled={isAuditorReadOnly}
                    onCreated={() => loadProgrammeExtras(selectedProgramme.id)}
                  />
                  <ul className="space-y-2 text-sm">
                    {actionsList.map((a) => (
                      <li key={a.id} className="p-2 bg-coya-bg rounded space-y-1">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{a.title}</span>
                          {!isAuditorReadOnly && (
                            <button type="button" className="text-red-600 text-xs" onClick={() => setDeleteTarget({ type: 'action', id: a.id })}>×</button>
                          )}
                        </div>
                        <p className="text-xs text-coya-text-muted">{a.actionType} · {a.status}</p>
                        {!isAuditorReadOnly && (
                          <div className="flex flex-wrap gap-1">
                            {a.status === 'draft' && (
                              <button type="button" className="text-[10px] px-2 py-0.5 rounded bg-amber-100" onClick={async () => {
                                await programmeService.updateProgrammeAction(a.id, { status: 'pending_validation' });
                                await loadProgrammeExtras(selectedProgramme.id);
                              }}>{isFr ? 'Soumettre' : 'Submit'}</button>
                            )}
                            {a.status === 'pending_validation' && myProfileId && (
                              <button type="button" className="text-[10px] px-2 py-0.5 rounded bg-blue-100" onClick={async () => {
                                await programmeService.updateProgrammeAction(a.id, {
                                  status: 'validated',
                                  validatedByProfileId: myProfileId,
                                  validatedAt: new Date().toISOString(),
                                });
                                await loadProgrammeExtras(selectedProgramme.id);
                              }}>{isFr ? 'Valider' : 'Validate'}</button>
                            )}
                            {(a.status === 'validated' || a.status === 'pending_validation') && (
                              <button type="button" className="text-[10px] px-2 py-0.5 rounded bg-emerald-100" onClick={async () => {
                                await programmeService.updateProgrammeAction(a.id, { status: 'done' });
                                await loadProgrammeExtras(selectedProgramme.id);
                              }}>{isFr ? 'Fait' : 'Done'}</button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailTab === 'collecte' && selectedProgramme && (
                <ProgrammeCollecteBlock
                  isFr={isFr}
                  programmeId={selectedProgramme.id}
                  section={collectSection}
                  onSectionChange={setCollectSection}
                  rows={dataRows}
                  disabled={isAuditorReadOnly}
                  onRefresh={() => loadProgrammeExtras(selectedProgramme.id)}
                  onDeleteRow={(id) => setDeleteTarget({ type: 'data_row', id })}
                />
              )}

              {detailTab === 'projets' && (
                <>
                  {selectedProgramme.allowProjects === false ? (
                    <p className="text-sm text-coya-text-muted">{isFr ? 'Les projets sont désactivés pour ce programme.' : 'Projects are disabled for this programme.'}</p>
                  ) : (
                    <>
                      {nav?.setView && (
                        <button
                          type="button"
                          className="mb-2 rounded-coya bg-coya-primary px-3 py-1.5 text-xs text-white"
                          onClick={() => nav.setView('projects')}
                        >
                          {isFr ? 'Ouvrir le module Projets' : 'Open Projects module'}
                        </button>
                      )}
                      <h4 className="font-medium text-coya-text mb-2">{isFr ? 'Projets liés' : 'Linked projects'}</h4>
                      <ul className="space-y-1 text-sm mb-4">
                        {projectsForProgramme.map((proj) => (
                          <li key={proj.id} className="flex justify-between items-center p-2 bg-coya-bg rounded-coya">
                            <span className="truncate" title={proj.title}>{proj.title}</span>
                            <span className="text-coya-text-muted text-xs ml-2">{proj.status}</span>
                          </li>
                        ))}
                        {projectsForProgramme.length === 0 && (
                          <li className="text-coya-text-muted p-2">{isFr ? 'Aucun projet lié' : 'No linked projects'}</li>
                        )}
                      </ul>
                    </>
                  )}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-coya-text">{isFr ? 'Demandes de dépense' : 'Expense requests'}</h4>
                      {!isAuditorReadOnly && (
                        <button type="button" className="text-sm text-coya-primary" onClick={() => setShowExpenseRequestForm(true)}>
                          + {isFr ? 'Nouvelle demande' : 'New request'}
                        </button>
                      )}
                    </div>
                    {showExpenseRequestForm && selectedProgramme && (
                      <ExpenseRequestForm
                        isFr={isFr}
                        programmeId={selectedProgramme.id}
                        organizationId={organizationId}
                        requestedById={currentUserId}
                        onSubmit={async (title, amount, currency) => {
                          await programmeService.createExpenseRequest({
                            programmeId: selectedProgramme.id,
                            organizationId,
                            title,
                            amount,
                            currency: currency || 'XOF',
                            requestedById: currentUserId,
                          });
                          const list = await programmeService.listExpenseRequests(selectedProgramme.id);
                          setExpenseRequests(list);
                          setShowExpenseRequestForm(false);
                        }}
                        onCancel={() => setShowExpenseRequestForm(false)}
                        submitting={submitting}
                      />
                    )}
                    <ul className="space-y-1 text-sm">
                      {expenseRequests.map((er) => (
                        <li key={er.id} className="flex justify-between items-center p-2 bg-coya-bg rounded-coya">
                          <span>{er.title} — {er.amount} {er.currency}</span>
                          <span className="text-coya-text-muted text-xs">{er.status}</span>
                        </li>
                      ))}
                      {expenseRequests.length === 0 && !showExpenseRequestForm && (
                        <li className="text-coya-text-muted p-2">{isFr ? 'Aucune demande' : 'No requests'}</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmationModal
          title={isFr ? 'Confirmer la suppression' : 'Confirm delete'}
          message={isFr ? 'Cette action est irréversible.' : 'This action cannot be undone.'}
          confirmLabel={isFr ? 'Supprimer' : 'Delete'}
          cancelLabel={isFr ? 'Annuler' : 'Cancel'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
          isLoading={submitting}
        />
      )}
    </StructuredModulePage>
  );
};

const STAKEHOLDER_TYPE_OPTIONS: { v: ProgrammeStakeholderType; fr: string; en: string }[] = [
  { v: 'facilitator', fr: 'Facilitateur / formateur', en: 'Facilitator / trainer' },
  { v: 'implementation_partner', fr: 'Partenaire de mise en œuvre', en: 'Implementation partner' },
  { v: 'donor_contact', fr: 'Contact bailleur', en: 'Donor contact' },
  { v: 'technical', fr: 'Intervenant technique', en: 'Technical contributor' },
  { v: 'other', fr: 'Autre', en: 'Other' },
];

function ProgrammeStakeholderQuickAdd({
  isFr,
  programmeId,
  orgProfiles,
  disabled,
  onCreated,
}: {
  isFr: boolean;
  programmeId: string;
  orgProfiles: { id: string; label: string }[];
  disabled?: boolean;
  onCreated: () => void;
}) {
  const [stakeholderType, setStakeholderType] = useState<ProgrammeStakeholderType>('facilitator');
  const [profileId, setProfileId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalRole, setExternalRole] = useState('');
  const [externalContact, setExternalContact] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId && !externalName.trim()) return;
    setSaving(true);
    try {
      await programmeService.createProgrammeStakeholder({
        programmeId,
        stakeholderType,
        profileId: profileId || null,
        externalName: externalName.trim() || null,
        externalRole: externalRole.trim() || null,
        externalContact: externalContact.trim() || null,
      });
      setProfileId('');
      setExternalName('');
      setExternalRole('');
      setExternalContact('');
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-coya border border-coya-border p-3 space-y-2 text-sm mb-3 bg-coya-bg/50">
      <select className="w-full rounded-coya border border-coya-border px-2 py-1 text-sm" value={stakeholderType} onChange={(e) => setStakeholderType(e.target.value as ProgrammeStakeholderType)} disabled={disabled}>
        {STAKEHOLDER_TYPE_OPTIONS.map((o) => (
          <option key={o.v} value={o.v}>{isFr ? o.fr : o.en}</option>
        ))}
      </select>
      <select className="w-full rounded-coya border border-coya-border px-2 py-1 text-sm" value={profileId} onChange={(e) => setProfileId(e.target.value)} disabled={disabled}>
        <option value="">{isFr ? 'Salarié (profil)' : 'Employee (profile)'}</option>
        {orgProfiles.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <input className="w-full rounded-coya border border-coya-border px-2 py-1 text-sm" placeholder={isFr ? 'Nom externe (si pas de profil)' : 'External name'} value={externalName} onChange={(e) => setExternalName(e.target.value)} disabled={disabled} />
      <input className="w-full rounded-coya border border-coya-border px-2 py-1 text-sm" placeholder={isFr ? 'Rôle' : 'Role'} value={externalRole} onChange={(e) => setExternalRole(e.target.value)} disabled={disabled} />
      <input className="w-full rounded-coya border border-coya-border px-2 py-1 text-sm" placeholder={isFr ? 'Contact' : 'Contact'} value={externalContact} onChange={(e) => setExternalContact(e.target.value)} disabled={disabled} />
      <button type="submit" disabled={disabled || saving} className="rounded-coya bg-coya-primary px-3 py-1 text-xs text-white disabled:opacity-50">
        {saving ? '…' : (isFr ? 'Ajouter' : 'Add')}
      </button>
    </form>
  );
}

function ProgrammeActionQuickAdd({
  isFr,
  programmeId,
  orgProfiles,
  disabled,
  onCreated,
}: {
  isFr: boolean;
  programmeId: string;
  orgProfiles: { id: string; label: string }[];
  disabled?: boolean;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [actionType, setActionType] = useState('formation');
  const [dueDate, setDueDate] = useState('');
  const [executorProfileId, setExecutorProfileId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await programmeService.createProgrammeAction({
        programmeId,
        title: title.trim(),
        actionType,
        dueDate: dueDate || null,
        executorProfileId: executorProfileId || null,
        notes: notes.trim() || null,
        status: 'draft',
      });
      setTitle('');
      setDueDate('');
      setExecutorProfileId('');
      setNotes('');
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-coya border border-coya-border p-3 space-y-2 text-sm mb-3 bg-coya-bg/50">
      <input className="w-full rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Titre de l’action' : 'Action title'} value={title} onChange={(e) => setTitle(e.target.value)} required disabled={disabled} />
      <input className="w-full rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Type (formation, collecte…)' : 'Type'} value={actionType} onChange={(e) => setActionType(e.target.value)} disabled={disabled} />
      <input type="date" className="w-full rounded-coya border border-coya-border px-2 py-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={disabled} />
      <select className="w-full rounded-coya border border-coya-border px-2 py-1" value={executorProfileId} onChange={(e) => setExecutorProfileId(e.target.value)} disabled={disabled}>
        <option value="">{isFr ? 'Exécutant' : 'Executor'}</option>
        {orgProfiles.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <textarea className="w-full rounded-coya border border-coya-border px-2 py-1 text-xs" rows={2} placeholder={isFr ? 'Notes' : 'Notes'} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} />
      <button type="submit" disabled={disabled || saving} className="rounded-coya bg-coya-primary px-3 py-1 text-xs text-white disabled:opacity-50">
        {saving ? '…' : (isFr ? 'Ajouter' : 'Add')}
      </button>
    </form>
  );
}

const COLLECT_COLS = ['col1', 'col2', 'col3', 'col4'] as const;

function ProgrammeCollecteBlock({
  isFr,
  programmeId,
  section,
  onSectionChange,
  rows,
  disabled,
  onRefresh,
  onDeleteRow,
}: {
  isFr: boolean;
  programmeId: string;
  section: string;
  onSectionChange: (s: string) => void;
  rows: ProgrammeDataRow[];
  disabled?: boolean;
  onRefresh: () => void;
  onDeleteRow: (id: string) => void;
}) {
  const filtered = rows.filter((r) => r.section === section);

  const addRow = async () => {
    const empty: Record<string, string> = {};
    COLLECT_COLS.forEach((c) => { empty[c] = ''; });
    await programmeService.createProgrammeDataRow({ programmeId, section, rowData: empty });
    onRefresh();
  };

  const saveCell = async (rowId: string, prev: Record<string, string>, col: string, value: string) => {
    await programmeService.updateProgrammeDataRow(rowId, { rowData: { ...prev, [col]: value } });
    onRefresh();
  };

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-3 space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-coya-text-muted">{isFr ? 'Section' : 'Section'}</label>
        <input className="flex-1 min-w-[120px] rounded-coya border border-coya-border px-2 py-1 text-sm" value={section} onChange={(e) => onSectionChange(e.target.value)} disabled={disabled} />
        {!disabled && (
          <button type="button" className="rounded-coya bg-coya-primary px-2 py-1 text-xs text-white" onClick={addRow}>
            + {isFr ? 'Ligne' : 'Row'}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-coya-border">
          <thead>
            <tr className="bg-coya-bg">
              {COLLECT_COLS.map((c) => (
                <th key={c} className="p-1 text-left">{c}</th>
              ))}
              <th className="p-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-coya-border">
                {COLLECT_COLS.map((c) => (
                  <td key={c} className="p-1">
                    <input
                      className="w-full min-w-[72px] rounded border border-coya-border px-1"
                      defaultValue={r.rowData[c] || ''}
                      disabled={disabled}
                      onBlur={(e) => saveCell(r.id, r.rowData, c, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-1">
                  {!disabled && (
                    <button type="button" className="text-red-600" onClick={() => onDeleteRow(r.id)}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-xs text-coya-text-muted">{isFr ? 'Aucune ligne dans cette section.' : 'No rows in this section.'}</p>}
    </div>
  );
}

function BailleurForm({
  isFr,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  initial?: Bailleur;
  onSubmit: (e: React.FormEvent, form: { name: string; code: string; description: string; contact: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={(e) => onSubmit(e, { name, code, description, contact })} className="space-y-3">
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Nom' : 'Name'} value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Code' : 'Code'} value={code} onChange={(e) => setCode(e.target.value)} />
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Contact' : 'Contact'} value={contact} onChange={(e) => setContact(e.target.value)} />
        <textarea className="w-full rounded-coya border border-coya-border px-3 py-2 min-h-[60px]" placeholder={isFr ? 'Description' : 'Description'} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          <button type="submit" className="rounded-coya bg-coya-primary px-4 py-2 text-sm text-white disabled:opacity-50" disabled={submitting}>{isFr ? 'Enregistrer' : 'Save'}</button>
          <button type="button" className="rounded-coya border border-coya-border px-4 py-2 text-sm" onClick={onCancel}>{isFr ? 'Annuler' : 'Cancel'}</button>
        </div>
      </form>
    </div>
  );
}

function ProgrammeForm({
  isFr,
  bailleurs,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  bailleurs: Bailleur[];
  initial?: Programme;
  onSubmit: (
    e: React.FormEvent,
    form: {
      name: string;
      code: string;
      description: string;
      bailleurId: string;
      startDate: string;
      endDate: string;
      allowProjects: boolean;
    }
  ) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [bailleurId, setBailleurId] = useState(initial?.bailleurId ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? '');
  const [allowProjects, setAllowProjects] = useState(initial?.allowProjects !== false);

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={(e) => onSubmit(e, { name, code, description, bailleurId, startDate, endDate, allowProjects })} className="space-y-3">
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Nom du programme' : 'Programme name'} value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Code' : 'Code'} value={code} onChange={(e) => setCode(e.target.value)} />
        <select className="w-full rounded-coya border border-coya-border px-3 py-2" value={bailleurId} onChange={(e) => setBailleurId(e.target.value)}>
          <option value="">— {isFr ? 'Bailleur' : 'Donor'} —</option>
          {bailleurs.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input type="date" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Début' : 'Start'} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Fin' : 'End'} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <textarea className="w-full rounded-coya border border-coya-border px-3 py-2 min-h-[60px]" placeholder={isFr ? 'Description' : 'Description'} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowProjects} onChange={(e) => setAllowProjects(e.target.checked)} />
          {isFr ? 'Autoriser les projets rattachés à ce programme' : 'Allow projects under this programme'}
        </label>
        <div className="flex gap-2">
          <button type="submit" className="rounded-coya bg-coya-primary px-4 py-2 text-sm text-white disabled:opacity-50" disabled={submitting}>{isFr ? 'Enregistrer' : 'Save'}</button>
          <button type="button" className="rounded-coya border border-coya-border px-4 py-2 text-sm" onClick={onCancel}>{isFr ? 'Annuler' : 'Cancel'}</button>
        </div>
      </form>
    </div>
  );
}

function BudgetLineForm({
  isFr,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  initial?: ProgrammeBudgetLine;
  onSubmit: (e: React.FormEvent, form: { label: string; plannedAmount: string; spentAmount: string; currency: CurrencyCode }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [plannedAmount, setPlannedAmount] = useState(initial?.plannedAmount?.toString() ?? '');
  const [spentAmount, setSpentAmount] = useState(initial?.spentAmount?.toString() ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? 'XOF');

  return (
    <div className="rounded-coya border border-coya-border bg-coya-bg p-3 mb-2">
      <form onSubmit={(e) => onSubmit(e, { label, plannedAmount, spentAmount, currency })} className="space-y-2 flex flex-wrap gap-2 items-end">
        <input type="text" className="flex-1 min-w-[120px] rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Libellé' : 'Label'} value={label} onChange={(e) => setLabel(e.target.value)} required />
        <input type="number" step="0.01" className="w-24 rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Prév.' : 'Planned'} value={plannedAmount} onChange={(e) => setPlannedAmount(e.target.value)} />
        <input type="number" step="0.01" className="w-24 rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Dépensé' : 'Spent'} value={spentAmount} onChange={(e) => setSpentAmount(e.target.value)} />
        <select className="rounded-coya border border-coya-border px-2 py-1" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="rounded-coya bg-coya-primary px-3 py-1 text-sm text-white disabled:opacity-50" disabled={submitting}>{isFr ? 'OK' : 'OK'}</button>
        <button type="button" className="rounded-coya border border-coya-border px-3 py-1 text-sm" onClick={onCancel}>{isFr ? 'Annuler' : 'Cancel'}</button>
      </form>
    </div>
  );
}

function BeneficiaireForm({
  isFr,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  initial?: Beneficiaire;
  onSubmit: (e: React.FormEvent, form: Partial<Beneficiaire>) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [theme, setTheme] = useState(initial?.theme ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');
  const [gender, setGender] = useState(initial?.gender ?? '');
  const [sector, setSector] = useState(initial?.sector ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [age, setAge] = useState(initial?.age ?? '');
  const [education, setEducation] = useState(initial?.education ?? '');
  const [profession, setProfession] = useState(initial?.profession ?? '');

  return (
    <div className="rounded-coya border border-coya-border bg-coya-bg p-3 mb-2">
      <form onSubmit={(e) => onSubmit(e, { theme, target, contact, gender, sector, country, region, age, education, profession })} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Thème' : 'Theme'} value={theme} onChange={(e) => setTheme(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Cible' : 'Target'} value={target} onChange={(e) => setTarget(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Contact' : 'Contact'} value={contact} onChange={(e) => setContact(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Genre' : 'Gender'} value={gender} onChange={(e) => setGender(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Secteur' : 'Sector'} value={sector} onChange={(e) => setSector(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Pays' : 'Country'} value={country} onChange={(e) => setCountry(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Région' : 'Region'} value={region} onChange={(e) => setRegion(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Âge' : 'Age'} value={age} onChange={(e) => setAge(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Études' : 'Education'} value={education} onChange={(e) => setEducation(e.target.value)} />
          <input type="text" className="rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Profession' : 'Profession'} value={profession} onChange={(e) => setProfession(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-coya bg-coya-primary px-3 py-1 text-sm text-white disabled:opacity-50" disabled={submitting}>{isFr ? 'Enregistrer' : 'Save'}</button>
          <button type="button" className="rounded-coya border border-coya-border px-3 py-1 text-sm" onClick={onCancel}>{isFr ? 'Annuler' : 'Cancel'}</button>
        </div>
      </form>
    </div>
  );
}

function ExpenseRequestForm({
  isFr,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  programmeId: string;
  organizationId: string | null;
  requestedById: string | null;
  onSubmit: (title: string, amount: number, currency: string) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('XOF');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!title.trim() || isNaN(n) || n < 0) return;
    setSaving(true);
    try {
      await onSubmit(title.trim(), n, currency);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-coya border border-coya-border bg-coya-bg p-3 mb-2">
      <form onSubmit={handleSubmit} className="space-y-2 flex flex-wrap gap-2 items-end">
        <input type="text" className="flex-1 min-w-[120px] rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Objet de la demande' : 'Request title'} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="number" step="0.01" min="0" className="w-28 rounded-coya border border-coya-border px-2 py-1" placeholder={isFr ? 'Montant' : 'Amount'} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <select className="rounded-coya border border-coya-border px-2 py-1" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="rounded-coya bg-coya-primary px-3 py-1 text-sm text-white disabled:opacity-50" disabled={submitting || saving}>{saving ? (isFr ? 'Création…' : 'Creating…') : (isFr ? 'Créer' : 'Create')}</button>
        <button type="button" className="rounded-coya border border-coya-border px-3 py-1 text-sm" onClick={onCancel}>{isFr ? 'Annuler' : 'Cancel'}</button>
      </form>
    </div>
  );
}

export default ProgrammeModule;
