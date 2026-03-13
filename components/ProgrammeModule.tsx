import React, { useState, useEffect, useCallback } from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
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
} from '../types';
import * as programmeService from '../services/programmeService';
import { DataAdapter } from '../services/dataAdapter';
import ConfirmationModal from './common/ConfirmationModal';

/** Phase 3 – Programme & Bailleur : programmes, bailleurs, budget, bénéficiaires */
const ProgrammeModule: React.FC = () => {
  const { language } = useLocalization();
  const { user: currentUser } = useAuth();
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
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'bailleur' | 'programme' | 'budget_line' | 'beneficiaire'; id: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [projectsForProgramme, setProjectsForProgramme] = useState<Project[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [isAuditorReadOnly, setIsAuditorReadOnly] = useState(false);
  const [showExpenseRequestForm, setShowExpenseRequestForm] = useState(false);

  const organizationId = (currentUser as any)?.organizationId ?? null;
  const currentUserId = (currentUser as any)?.id ?? (currentUser as any)?.user_id ?? null;

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
      return;
    }
    let cancelled = false;
    Promise.all([
      DataAdapter.getProjects().then((list) => list.filter((p) => p.programmeId === selectedProgramme.id)),
      programmeService.listExpenseRequests(selectedProgramme.id),
      currentUserId ? programmeService.isUserAuditorForProgramme(selectedProgramme.id, currentUserId) : Promise.resolve(false),
    ]).then(([projects, requests, isAuditor]) => {
      if (cancelled) return;
      setProjectsForProgramme(projects);
      setExpenseRequests(requests);
      setIsAuditorReadOnly(!!isAuditor);
    });
    return () => { cancelled = true; };
  }, [selectedProgramme?.id, currentUserId]);

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
    form: { name: string; code: string; description: string; bailleurId: string; startDate: string; endDate: string }
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
      } else {
        await programmeService.deleteBeneficiaire(deleteTarget.id);
        await loadBeneficiaires();
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
            <div className="w-[420px] flex-shrink-0 space-y-4">
              <div className="rounded-coya border border-coya-border bg-coya-card p-4">
                <h3 className="font-semibold text-coya-text mb-2">{selectedProgramme.name}</h3>
                <p className="text-sm text-coya-text-muted mb-2">{selectedProgramme.description || '—'}</p>
                <p className="text-sm">{isFr ? 'Bailleur' : 'Donor'}: {selectedProgramme.bailleurName || '—'}</p>
                <p className="text-sm">{selectedProgramme.startDate} → {selectedProgramme.endDate || '—'}</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-coya-text">{isFr ? 'Lignes budgétaires' : 'Budget lines'}</h4>
                  {!isAuditorReadOnly && (
                    <button
                      type="button"
                      className="text-sm text-coya-primary"
                      onClick={() => { setShowBudgetLineForm(true); setEditBudgetLine(null); }}
                    >
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
                <ul className="space-y-1 text-sm">
                  {budgetLines.map((bl) => (
                    <li key={bl.id} className="flex justify-between items-center p-2 bg-coya-bg rounded-coya">
                      <span>{bl.label}: {bl.plannedAmount} {bl.currency || 'XOF'}</span>
                      {!isAuditorReadOnly && (
                        <span>
                          <button type="button" className="text-coya-primary mr-1" onClick={() => setEditBudgetLine(bl)}>{isFr ? 'Mod.' : 'Edit'}</button>
                          <button type="button" className="text-red-600" onClick={() => setDeleteTarget({ type: 'budget_line', id: bl.id })}>×</button>
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
                    <button
                      type="button"
                      className="text-sm text-coya-primary"
                      onClick={() => { setShowBeneficiaireForm(true); setEditBeneficiaire(null); }}
                    >
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
                <ul className="space-y-1 text-sm">
                  {beneficiaires.map((b) => (
                    <li key={b.id} className="flex justify-between items-center p-2 bg-coya-bg rounded-coya">
                      <span>{b.theme || b.contact || b.id.slice(0, 8)}</span>
                      {!isAuditorReadOnly && (
                        <span>
                          <button type="button" className="text-coya-primary mr-1" onClick={() => setEditBeneficiaire(b)}>{isFr ? 'Mod.' : 'Edit'}</button>
                          <button type="button" className="text-red-600" onClick={() => setDeleteTarget({ type: 'beneficiaire', id: b.id })}>×</button>
                        </span>
                      )}
                    </li>
                  ))}
                  {beneficiaires.length === 0 && !showBeneficiaireForm && (
                    <li className="text-coya-text-muted p-2">{isFr ? 'Aucun bénéficiaire' : 'No beneficiaries'}</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-coya-text mb-2">{isFr ? 'Projets liés' : 'Linked projects'}</h4>
                <ul className="space-y-1 text-sm">
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
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-coya-text">{isFr ? 'Demandes de dépense' : 'Expense requests'}</h4>
                  {!isAuditorReadOnly && (
                    <button
                      type="button"
                      className="text-sm text-coya-primary"
                      onClick={() => setShowExpenseRequestForm(true)}
                    >
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
  onSubmit: (e: React.FormEvent, form: { name: string; code: string; description: string; bailleurId: string; startDate: string; endDate: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [bailleurId, setBailleurId] = useState(initial?.bailleurId ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? '');

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={(e) => onSubmit(e, { name, code, description, bailleurId, startDate, endDate })} className="space-y-3">
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
