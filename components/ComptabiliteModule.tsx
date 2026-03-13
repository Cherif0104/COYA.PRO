import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Language, ChartOfAccount, AccountingJournal, JournalEntry, JournalEntryStatus, ChartAccountType, AccountingFramework, CostCenter, FiscalRule, Budget, ChartAccountFramework } from '../types';
import * as comptabiliteService from '../services/comptabiliteService';
import OrganizationService from '../services/organizationService';

/** Liste des exercices fiscaux (Paramètres) */
const FiscalYearsList: React.FC<{
  organizationId: string;
  fiscalYears: Awaited<ReturnType<typeof comptabiliteService.listFiscalYears>>;
  loadFiscalYears: () => Promise<void>;
  isFr: boolean;
}> = ({ fiscalYears, loadFiscalYears, isFr }) => (
  <div className="space-y-2">
    <button type="button" className="text-xs text-coya-primary hover:underline" onClick={() => loadFiscalYears()}>
      {isFr ? 'Actualiser' : 'Refresh'}
    </button>
    {fiscalYears.length === 0 ? (
      <p className="text-sm text-coya-text-muted">{isFr ? 'Aucun exercice. Créer via migration comptabilite-audit-p2.' : 'No fiscal years. Create via comptabilite-audit-p2 migration.'}</p>
    ) : (
      <ul className="text-sm space-y-1">
        {fiscalYears.map((fy) => (
          <li key={fy.id} className="flex justify-between gap-2">
            <span>{fy.label}</span>
            <span className="text-coya-text-muted">{fy.dateStart} → {fy.dateEnd}</span>
            {fy.isClosed && <span className="text-xs bg-gray-200 px-1 rounded">{isFr ? 'Clôturé' : 'Closed'}</span>}
          </li>
        ))}
      </ul>
    )}
  </div>
);

/**
 * Phase 4 – Comptabilité SYSCOHADA / SYCEBNL : plan comptable, journaux, écritures, bilans.
 * Droits : l’onglet Paramètres (cadre comptable, exercices, droits métier) et la saisie/modification
 * des écritures sont réservés aux utilisateurs avec droit d’écriture (canWrite). Les admins
 * plateforme et les rôles Comptabilité (editor/validator/admin) y ont accès ; les lecteurs (viewer)
 * voient uniquement les données en lecture seule.
 */
const ComptabiliteModule: React.FC = () => {
  const { language } = useLocalization();
  const { user: currentUser } = useAuth();
  const { permissions } = useModulePermissions();
  const isFr = language === Language.FR;

  const comptabilitePerms = permissions?.comptabilite;
  const canWrite = !!comptabilitePerms?.canWrite;
  const canDelete = !!comptabilitePerms?.canDelete;
  const canRead = !!comptabilitePerms?.canRead;
  const isReadOnly = canRead && !canWrite;

  const tabKeys = useMemo(() => {
    const all: Array<'parametres' | 'plan' | 'journaux' | 'ecritures' | 'rapports' | 'centres' | 'budgets' | 'fiscale'> = ['parametres', 'plan', 'journaux', 'ecritures', 'rapports', 'centres', 'budgets', 'fiscale'];
    return canWrite ? all : all.filter((t) => t !== 'parametres');
  }, [canWrite]);

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  type TabKey = 'parametres' | 'plan' | 'journaux' | 'ecritures' | 'rapports' | 'centres' | 'budgets' | 'fiscale';
  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accountingFramework, setAccountingFramework] = useState<AccountingFramework>('syscohada');
  const [fiscalYears, setFiscalYears] = useState<Awaited<ReturnType<typeof comptabiliteService.listFiscalYears>>>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [journals, setJournals] = useState<AccountingJournal[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [fiscalRules, setFiscalRules] = useState<FiscalRule[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportJournalId, setReportJournalId] = useState<string>('');
  const [reportType, setReportType] = useState<'bilan' | 'resultat' | 'bilan_series' | 'analytique' | 'budget_vs_real' | 'flux'>('bilan');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [balanceSheet, setBalanceSheet] = useState<Awaited<ReturnType<typeof comptabiliteService.getBalanceSheet>> | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<Awaited<ReturnType<typeof comptabiliteService.getIncomeStatement>> | null>(null);
  const [balanceSheetSeries, setBalanceSheetSeries] = useState<Awaited<ReturnType<typeof comptabiliteService.getBalanceSheetSeries>> | null>(null);
  const [analyticalBalances, setAnalyticalBalances] = useState<Awaited<ReturnType<typeof comptabiliteService.getAnalyticalBalances>> | null>(null);
  const [budgetVsReal, setBudgetVsReal] = useState<Awaited<ReturnType<typeof comptabiliteService.getBudgetVsReal>> | null>(null);
  const [cashFlow, setCashFlow] = useState<Awaited<ReturnType<typeof comptabiliteService.getCashFlowStatement>> | null>(null);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editAccount, setEditAccount] = useState<ChartOfAccount | null>(null);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showCostCenterForm, setShowCostCenterForm] = useState(false);
  const [showFiscalForm, setShowFiscalForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const currentUserId = (currentUser as any)?.id ?? (currentUser as any)?.user_id ?? null;

  useEffect(() => {
    let cancelled = false;
    OrganizationService.getCurrentUserOrganizationId().then((id) => {
      if (!cancelled) setOrganizationId(id || null);
    });
    return () => { cancelled = true; };
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listChartOfAccounts(organizationId, { framework: accountingFramework });
      setAccounts(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur plan comptable');
    }
  }, [organizationId, accountingFramework]);

  const loadFramework = useCallback(async () => {
    if (!organizationId) return;
    try {
      const s = await comptabiliteService.getOrganizationAccountingSettings(organizationId);
      if (s) setAccountingFramework(s.accountingFramework);
    } catch (_) {}
  }, [organizationId]);

  const loadFiscalYears = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listFiscalYears(organizationId);
      setFiscalYears(list);
    } catch (_) {}
  }, [organizationId]);

  const loadCostCenters = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listCostCenters(organizationId);
      setCostCenters(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur centres');
    }
  }, [organizationId]);

  const loadFiscalRules = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listFiscalRules(organizationId);
      setFiscalRules(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur fiscale');
    }
  }, [organizationId]);

  const loadBudgets = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listBudgets(organizationId);
      setBudgets(list);
      if (list.length > 0 && !selectedBudgetId) setSelectedBudgetId(list[0].id);
    } catch (e: any) {
      setError(e?.message || 'Erreur budgets');
    }
  }, [organizationId]);

  const loadJournals = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listAccountingJournals(organizationId);
      setJournals(list);
      if (list.length > 0 && !reportJournalId) setReportJournalId(list[0].id);
    } catch (e: any) {
      setError(e?.message || 'Erreur journaux');
    }
  }, [organizationId]);

  const loadEntries = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await comptabiliteService.listJournalEntries({
        organizationId,
        journalId: reportJournalId || undefined,
        dateFrom: reportDateFrom,
        dateTo: reportDateTo,
      });
      setEntries(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur écritures');
    }
  }, [organizationId, reportJournalId, reportDateFrom, reportDateTo]);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([loadFramework(), loadAccounts(), loadJournals()]).finally(() => setLoading(false));
  }, [organizationId, loadAccounts, loadJournals, loadFramework]);

  useEffect(() => {
    if (organizationId && activeTab === 'parametres') loadFiscalYears();
  }, [organizationId, activeTab, loadFiscalYears]);
  useEffect(() => {
    if (organizationId && activeTab === 'centres') loadCostCenters();
  }, [organizationId, activeTab, loadCostCenters]);
  useEffect(() => {
    if (organizationId && activeTab === 'fiscale') loadFiscalRules();
  }, [organizationId, activeTab, loadFiscalRules]);
  useEffect(() => {
    if (organizationId && activeTab === 'budgets') loadBudgets();
  }, [organizationId, activeTab, loadBudgets]);

  useEffect(() => {
    if (organizationId && activeTab === 'ecritures') loadEntries();
  }, [organizationId, activeTab, loadEntries]);

  const loadReports = useCallback(async () => {
    if (!organizationId) return;
    setError(null);
    try {
      if (reportType === 'bilan' || reportType === 'resultat') {
        const [bs, is_] = await Promise.all([
          comptabiliteService.getBalanceSheet(organizationId, reportDateTo),
          comptabiliteService.getIncomeStatement(organizationId, reportDateFrom, reportDateTo, { framework: accountingFramework }),
        ]);
        setBalanceSheet(bs);
        setIncomeStatement(is_);
      }
      if (reportType === 'bilan_series') {
        const series = await comptabiliteService.getBalanceSheetSeries(organizationId, reportDateFrom, reportDateTo, 'month', accountingFramework);
        setBalanceSheetSeries(series);
      }
      if (reportType === 'analytique') {
        const analytical = await comptabiliteService.getAnalyticalBalances(organizationId, reportDateFrom, reportDateTo);
        setAnalyticalBalances(analytical);
      }
      if (reportType === 'budget_vs_real' && selectedBudgetId) {
        const bvr = await comptabiliteService.getBudgetVsReal(organizationId, selectedBudgetId, accountingFramework);
        setBudgetVsReal(bvr);
      }
      if (reportType === 'flux') {
        const cf = await comptabiliteService.getCashFlowStatement(organizationId, reportDateFrom, reportDateTo);
        setCashFlow(cf);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur rapports');
    }
  }, [organizationId, reportDateFrom, reportDateTo, reportType, selectedBudgetId, accountingFramework]);

  useEffect(() => {
    if (organizationId && activeTab === 'rapports') loadReports();
  }, [organizationId, activeTab, loadReports]);

  const handleSaveJournal = async (form: { code: string; name: string }) => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      await comptabiliteService.createAccountingJournal({
        organizationId,
        code: form.code,
        name: form.name,
        journalType: 'general',
      });
      setShowJournalForm(false);
      await loadJournals();
    } catch (e: any) {
      setError(e?.message || 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAccount = async (form: { code: string; label: string; accountType: ChartAccountType; framework?: ChartAccountFramework | null; isCashFlowRegister?: boolean }) => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      if (editAccount) {
        await comptabiliteService.updateChartOfAccount(editAccount.id, form);
        setEditAccount(null);
      } else {
        await comptabiliteService.createChartOfAccount({
          organizationId,
          code: form.code,
          label: form.label,
          accountType: form.accountType,
          framework: form.framework ?? 'both',
          isCashFlowRegister: form.isCashFlowRegister ?? false,
        });
      }
      setShowAccountForm(false);
      await loadAccounts();
    } catch (e: any) {
      setError(e?.message || 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFramework = async (framework: AccountingFramework) => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      await comptabiliteService.setOrganizationAccountingFramework(organizationId, framework);
      setAccountingFramework(framework);
      await loadAccounts();
    } catch (e: any) {
      setError(e?.message || 'Erreur paramètre');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCostCenter = async (form: { code: string; label: string }) => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      await comptabiliteService.createCostCenter({ organizationId, code: form.code, label: form.label });
      setShowCostCenterForm(false);
      await loadCostCenters();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFiscalRule = async (form: { code: string; label: string; rate: number }) => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      await comptabiliteService.createFiscalRule({ organizationId, code: form.code, label: form.label, rate: form.rate });
      setShowFiscalForm(false);
      await loadFiscalRules();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBudget = async (form: { name: string; fiscalYear: number }) => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      await comptabiliteService.createBudget({ organizationId, name: form.name, fiscalYear: form.fiscalYear });
      setShowBudgetForm(false);
      await loadBudgets();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const accountTypeLabel = (t: ChartAccountType) =>
    isFr
      ? { asset: 'Actif', liability: 'Passif', equity: 'Capitaux propres', income: 'Produit', expense: 'Charge' }[t]
      : { asset: 'Asset', liability: 'Liability', equity: 'Equity', income: 'Income', expense: 'Expense' }[t];

  return (
    <StructuredModulePage
      moduleKey="comptabilite"
      titleFr="Comptabilité"
      titleEn="Accounting"
      descriptionFr="Comptabilité générale SYSCOHADA/SYCEBNL. Plan comptable, journaux, écritures, bilans et compte de résultat."
      descriptionEn="General accounting SYSCOHADA/SYCEBNL. Chart of accounts, journals, entries, balance sheet and P&L."
      icon="fas fa-calculator"
    >
      {error && (
        <div className="mb-4 p-3 rounded-coya bg-red-100 text-red-800 text-sm" role="alert">
          {error}
        </div>
      )}

      {isReadOnly && (
        <div className="mb-4 p-3 rounded-coya bg-amber-100 text-amber-800 text-sm border border-amber-200" role="status">
          {isFr ? 'Accès lecture seule. Les paramètres et la saisie sont réservés aux utilisateurs avec droit d\'écriture.' : 'Read-only access. Settings and data entry are restricted to users with write permission.'}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 border-b border-coya-border">
        {tabKeys.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-3 py-2 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-coya-primary text-coya-primary' : 'text-coya-text-muted'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'parametres' && (isFr ? 'Paramètres' : 'Settings')}
            {tab === 'plan' && (isFr ? 'Plan comptable' : 'Chart of accounts')}
            {tab === 'journaux' && (isFr ? 'Journaux' : 'Journals')}
            {tab === 'ecritures' && (isFr ? 'Écritures' : 'Entries')}
            {tab === 'rapports' && (isFr ? 'Rapports' : 'Reports')}
            {tab === 'centres' && (isFr ? 'Centres de coûts' : 'Cost centers')}
            {tab === 'budgets' && (isFr ? 'Budgets' : 'Budgets')}
            {tab === 'fiscale' && (isFr ? 'Fiscal' : 'Fiscal')}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-coya-text-muted py-4">{isFr ? 'Chargement…' : 'Loading…'}</p>
      )}

      {!loading && organizationId && activeTab === 'parametres' && (
        <div className="space-y-4">
          <div className="rounded-coya border border-coya-border bg-coya-card p-4 max-w-md">
            <h3 className="font-semibold text-coya-text mb-3">{isFr ? 'Cadre comptable' : 'Accounting framework'}</h3>
            <p className="text-sm text-coya-text-muted mb-3">
              {isFr ? 'SYSCOHADA : entreprises. SYCEBNL : associations / à but non lucratif.' : 'SYSCOHADA: companies. SYCEBNL: non-profit.'}
            </p>
            <select
              value={accountingFramework}
              onChange={(e) => handleSaveFramework(e.target.value as AccountingFramework)}
              disabled={submitting}
              className="w-full rounded-coya border border-coya-border px-3 py-2"
            >
              <option value="syscohada">SYSCOHADA</option>
              <option value="sycebnl">SYCEBNL</option>
            </select>
          </div>
          <div className="rounded-coya border border-coya-border bg-coya-card p-4 max-w-md">
            <h3 className="font-semibold text-coya-text mb-3">{isFr ? 'Exercices fiscaux' : 'Fiscal years'}</h3>
            <p className="text-sm text-coya-text-muted mb-3">
              {isFr ? 'Liste des exercices comptables (audit P2). Création via SQL ou migration.' : 'List of fiscal years (audit P2). Create via SQL or migration.'}
            </p>
            <FiscalYearsList organizationId={organizationId} fiscalYears={fiscalYears} loadFiscalYears={loadFiscalYears} isFr={isFr} />
          </div>
        </div>
      )}

      {!loading && organizationId && activeTab === 'plan' && (
        <div className="space-y-4">
          {canWrite && (
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white"
                onClick={() => { setShowAccountForm(true); setEditAccount(null); }}
              >
                + {isFr ? 'Ajouter un compte' : 'Add account'}
              </button>
            </div>
          )}
          {(showAccountForm || editAccount) && (
            <AccountForm
              isFr={isFr}
              initial={editAccount || undefined}
              onSubmit={handleSaveAccount}
              onCancel={() => { setShowAccountForm(false); setEditAccount(null); }}
              submitting={submitting}
            />
          )}
          <p className="text-xs text-coya-text-muted">
            {isFr ? 'Filtré par cadre : ' : 'Filtered by framework: '}{accountingFramework.toUpperCase()}. {isFr ? 'Cochez « Compte trésorerie » pour le tableau de flux.' : 'Check « Cash flow account » for cash flow statement.'}
          </p>
          <div className="rounded-coya border border-coya-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coya-bg">
                <tr>
                  <th className="text-left p-3">{isFr ? 'Code' : 'Code'}</th>
                  <th className="text-left p-3">{isFr ? 'Libellé' : 'Label'}</th>
                  <th className="text-left p-3">{isFr ? 'Type' : 'Type'}</th>
                  <th className="w-24 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t border-coya-border">
                    <td className="p-3 font-mono">{a.code}</td>
                    <td className="p-3">{a.label}</td>
                    <td className="p-3">{accountTypeLabel(a.accountType)}</td>
                    <td className="p-3">
                      {canWrite && (
                        <button type="button" className="text-coya-primary text-xs" onClick={() => setEditAccount(a)}>
                          {isFr ? 'Modifier' : 'Edit'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-coya-text-muted">
                      {isFr ? 'Aucun compte. Créez un plan comptable (ex. classes 1 à 8 SYSCOHADA).' : 'No accounts. Create a chart of accounts.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && organizationId && activeTab === 'journaux' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white"
              onClick={() => setShowJournalForm(true)}
            >
              + {isFr ? 'Créer un journal' : 'Create journal'}
            </button>
          </div>
          {showJournalForm && (
            <JournalForm
              isFr={isFr}
              onSubmit={handleSaveJournal}
              onCancel={() => setShowJournalForm(false)}
              submitting={submitting}
            />
          )}
          <div className="rounded-coya border border-coya-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coya-bg">
                <tr>
                  <th className="text-left p-3">{isFr ? 'Code' : 'Code'}</th>
                  <th className="text-left p-3">{isFr ? 'Nom' : 'Name'}</th>
                  <th className="text-left p-3">{isFr ? 'Type' : 'Type'}</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((j) => (
                  <tr key={j.id} className="border-t border-coya-border">
                    <td className="p-3 font-mono">{j.code}</td>
                    <td className="p-3">{j.name}</td>
                    <td className="p-3">{j.journalType}</td>
                  </tr>
                ))}
                {journals.length === 0 && !showJournalForm && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-coya-text-muted">
                      {isFr ? 'Aucun journal. Cliquez sur "Créer un journal" (ex. OD = Opérations diverses).' : 'No journals. Click "Create journal".'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && organizationId && activeTab === 'ecritures' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={reportJournalId}
              onChange={(e) => setReportJournalId(e.target.value)}
              className="rounded-coya border border-coya-border px-3 py-2 text-sm"
            >
              <option value="">{isFr ? 'Tous les journaux' : 'All journals'}</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>{j.code} – {j.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="rounded-coya border border-coya-border px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="rounded-coya border border-coya-border px-3 py-2 text-sm"
            />
            {canWrite && (
              <button
                type="button"
                className="rounded-coya bg-coya-primary px-4 py-2 text-sm text-white"
                onClick={() => setShowEntryForm(true)}
              >
                + {isFr ? 'Nouvelle écriture' : 'New entry'}
              </button>
            )}
          </div>
          {showEntryForm && journals.length > 0 && accounts.length > 0 && (
            <EntryForm
              isFr={isFr}
              organizationId={organizationId}
              journals={journals}
              accounts={accounts}
              costCenters={costCenters}
              fiscalRules={fiscalRules}
              defaultDate={reportDateTo}
              onSubmit={async (payload) => {
                await comptabiliteService.createJournalEntry({
                  organizationId,
                  journalId: payload.journalId,
                  entryDate: payload.entryDate,
                  reference: payload.reference || null,
                  description: payload.description || null,
                  documentNumber: payload.documentNumber || null,
                  attachmentType: payload.attachmentType || null,
                  attachmentUrl: payload.attachmentUrl || null,
                  resourceName: payload.resourceName || null,
                  resourceDatabaseUrl: payload.resourceDatabaseUrl || null,
                  createdById: currentUserId,
                  lines: [
                    { accountId: payload.accountIdDebit, label: payload.labelDebit, debit: payload.amount, credit: 0, costCenterId: payload.costCenterIdDebit || null, fiscalCode: payload.fiscalCodeDebit || null },
                    { accountId: payload.accountIdCredit, label: payload.labelCredit, debit: 0, credit: payload.amount, costCenterId: payload.costCenterIdCredit || null, fiscalCode: payload.fiscalCodeCredit || null },
                  ],
                });
                setShowEntryForm(false);
                loadEntries();
              }}
              onCancel={() => setShowEntryForm(false)}
              submitting={submitting}
            />
          )}
          <div className="rounded-coya border border-coya-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coya-bg">
                <tr>
                  <th className="text-left p-3">{isFr ? 'Date' : 'Date'}</th>
                  <th className="text-left p-3">{isFr ? 'N° pièce' : 'Doc #'}</th>
                  <th className="text-left p-3">{isFr ? 'Réf.' : 'Ref'}</th>
                  <th className="text-left p-3">{isFr ? 'Description' : 'Description'}</th>
                  <th className="text-left p-3">{isFr ? 'Statut' : 'Status'}</th>
                  {canWrite && <th className="text-left p-3">{isFr ? 'Actions' : 'Actions'}</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const status = (e.status as JournalEntryStatus) || 'draft';
                  const statusLabel = status === 'draft' ? (isFr ? 'Brouillon' : 'Draft') : status === 'validated' ? (isFr ? 'Validée' : 'Validated') : (isFr ? 'Verrouillée' : 'Locked');
                  return (
                    <tr key={e.id} className="border-t border-coya-border hover:bg-coya-bg/50">
                      <td className="p-3">{e.entryDate}</td>
                      <td className="p-3 font-mono">{e.documentNumber || '—'}</td>
                      <td className="p-3 font-mono">{e.reference || '—'}</td>
                      <td className="p-3">{e.description || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${status === 'draft' ? 'bg-amber-100 text-amber-800' : status === 'validated' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                          {statusLabel}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="p-3">
                          {status === 'draft' && (
                            <button
                              type="button"
                              className="text-xs text-coya-primary hover:underline mr-2"
                              onClick={async () => {
                                try {
                                  await comptabiliteService.setJournalEntryStatus(e.id, 'validated');
                                  loadEntries();
                                } catch (err: any) {
                                  setError(err?.message || 'Erreur validation');
                                }
                              }}
                            >
                              {isFr ? 'Valider' : 'Validate'}
                            </button>
                          )}
                          {status === 'validated' && (
                            <button
                              type="button"
                              className="text-xs text-coya-primary hover:underline"
                              onClick={async () => {
                                try {
                                  await comptabiliteService.setJournalEntryStatus(e.id, 'locked');
                                  loadEntries();
                                } catch (err: any) {
                                  setError(err?.message || 'Erreur verrouillage');
                                }
                              }}
                            >
                              {isFr ? 'Verrouiller' : 'Lock'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="p-6 text-center text-coya-text-muted">
                      {isFr ? 'Aucune écriture sur la période.' : 'No entries for the period.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && organizationId && activeTab === 'rapports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="rounded-coya border border-coya-border px-3 py-2 text-sm"
            >
              <option value="bilan">{isFr ? 'Bilan à une date' : 'Balance sheet'}</option>
              <option value="resultat">{isFr ? 'Compte de résultat' : 'Income statement'}</option>
              <option value="bilan_series">{isFr ? 'Bilans mensuels' : 'Monthly balance sheets'}</option>
              <option value="analytique">{isFr ? 'Analytique (centres)' : 'Analytical (centers)'}</option>
              <option value="budget_vs_real">{isFr ? 'Budget vs Réel' : 'Budget vs Real'}</option>
              <option value="flux">{isFr ? 'Flux de trésorerie' : 'Cash flow'}</option>
            </select>
            <span className="text-sm text-coya-text-muted">{isFr ? 'Période :' : 'Period:'}</span>
            <input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} className="rounded-coya border border-coya-border px-3 py-2 text-sm" />
            <span>→</span>
            <input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} className="rounded-coya border border-coya-border px-3 py-2 text-sm" />
            {reportType === 'budget_vs_real' && (
              <select value={selectedBudgetId} onChange={(e) => setSelectedBudgetId(e.target.value)} className="rounded-coya border border-coya-border px-3 py-2 text-sm">
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.fiscalYear})</option>
                ))}
              </select>
            )}
            <button type="button" className="rounded-coya bg-coya-primary px-4 py-2 text-sm text-white" onClick={loadReports}>
              {isFr ? 'Actualiser' : 'Refresh'}
            </button>
          </div>
          {reportType === 'bilan' && balanceSheet && (
            <div className="rounded-coya border border-coya-border p-4 bg-coya-card max-w-xl">
              <h3 className="font-semibold text-coya-text mb-3">{isFr ? 'Bilan au' : 'Balance sheet as of'} {reportDateTo}</h3>
              <div className="text-sm space-y-2">
                <p className="font-medium">{isFr ? 'Actif' : 'Assets'}</p>
                {balanceSheet.assets.map((a) => (
                  <div key={a.code} className="flex justify-between"><span>{a.code} {a.label}</span><span className="font-mono">{a.balance.toLocaleString('fr-FR')}</span></div>
                ))}
                <p className="border-t pt-2 font-medium">Total actif : {balanceSheet.totalAssets.toLocaleString('fr-FR')}</p>
                <p className="font-medium mt-4">{isFr ? 'Passif / Capitaux' : 'Liabilities / Equity'}</p>
                {balanceSheet.liabilities.map((a) => (
                  <div key={a.code} className="flex justify-between"><span>{a.code} {a.label}</span><span className="font-mono">{a.balance.toLocaleString('fr-FR')}</span></div>
                ))}
                {balanceSheet.equity.map((a) => (
                  <div key={a.code} className="flex justify-between"><span>{a.code} {a.label}</span><span className="font-mono">{a.balance.toLocaleString('fr-FR')}</span></div>
                ))}
                <p className="border-t pt-2 font-medium">Total : {balanceSheet.totalLiabilitiesAndEquity.toLocaleString('fr-FR')}</p>
              </div>
            </div>
          )}
          {reportType === 'resultat' && incomeStatement && (
            <div className="rounded-coya border border-coya-border p-4 bg-coya-card max-w-xl">
              <h3 className="font-semibold text-coya-text mb-3">{isFr ? 'Compte de résultat' : 'Income statement'} ({reportDateFrom} → {reportDateTo})</h3>
              <div className="text-sm space-y-2">
                <p className="font-medium">{isFr ? 'Produits' : 'Income'}</p>
                {incomeStatement.income.map((a) => (
                  <div key={a.code} className="flex justify-between"><span>{a.code} {a.label}</span><span className="font-mono">{a.balance.toLocaleString('fr-FR')}</span></div>
                ))}
                <p className="border-t pt-2">Total produits : {incomeStatement.totalIncome.toLocaleString('fr-FR')}</p>
                <p className="font-medium mt-4">{isFr ? 'Charges' : 'Expenses'}</p>
                {incomeStatement.expense.map((a) => (
                  <div key={a.code} className="flex justify-between"><span>{a.code} {a.label}</span><span className="font-mono">{a.balance.toLocaleString('fr-FR')}</span></div>
                ))}
                <p className="border-t pt-2">Total charges : {incomeStatement.totalExpense.toLocaleString('fr-FR')}</p>
                <p className="border-t pt-2 font-semibold">{isFr ? 'Résultat' : 'Result'} : {incomeStatement.result.toLocaleString('fr-FR')}</p>
              </div>
            </div>
          )}
          {reportType === 'bilan_series' && balanceSheetSeries !== null && (
            <div className="rounded-coya border border-coya-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-coya-bg"><tr><th className="text-left p-3">{isFr ? 'Clôture période' : 'Period end'}</th><th className="text-right p-3">{isFr ? 'Total actif' : 'Total assets'}</th><th className="text-right p-3">{isFr ? 'Total passif+cap.' : 'Total liab.+eq.'}</th></tr></thead>
                <tbody>
                  {balanceSheetSeries.map(({ periodEnd, balanceSheet: bs }) => (
                    <tr key={periodEnd} className="border-t border-coya-border">
                      <td className="p-3">{periodEnd}</td>
                      <td className="p-3 text-right font-mono">{bs.totalAssets.toLocaleString('fr-FR')}</td>
                      <td className="p-3 text-right font-mono">{bs.totalLiabilitiesAndEquity.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                  {balanceSheetSeries.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-coya-text-muted">{isFr ? 'Aucune période dans l\'intervalle.' : 'No period in range.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {reportType === 'analytique' && analyticalBalances !== null && (
            <div className="space-y-4">
              {analyticalBalances.map((cc) => (
                <div key={cc.costCenterId} className="rounded-coya border border-coya-border p-4 bg-coya-card">
                  <h4 className="font-medium text-coya-text mb-2">{cc.costCenterCode} – {cc.costCenterLabel}</h4>
                  <p className="text-xs text-coya-text-muted">Débit total : {cc.totalDebit.toLocaleString('fr-FR')} | Crédit : {cc.totalCredit.toLocaleString('fr-FR')}</p>
                  <div className="mt-2 text-sm">
                    {cc.balances.slice(0, 10).map((b) => (
                      <div key={b.accountId} className="flex justify-between"><span>{b.code} {b.label}</span><span className="font-mono">{b.balance.toLocaleString('fr-FR')}</span></div>
                    ))}
                    {cc.balances.length > 10 && <p className="text-coya-text-muted">… et {cc.balances.length - 10} autres comptes</p>}
                  </div>
                </div>
              ))}
              {analyticalBalances.length === 0 && <p className="text-coya-text-muted">{isFr ? 'Aucun centre de coût ou aucune ligne analytique.' : 'No cost center or analytical lines.'}</p>}
            </div>
          )}
          {reportType === 'budget_vs_real' && budgetVsReal !== null && (
            <div className="rounded-coya border border-coya-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-coya-bg">
                  <tr><th className="text-left p-3">{isFr ? 'Compte' : 'Account'}</th><th className="text-right p-3">{isFr ? 'Budget' : 'Budget'}</th><th className="text-right p-3">{isFr ? 'Réel' : 'Actual'}</th><th className="text-right p-3">{isFr ? 'Écart' : 'Variance'}</th></tr>
                </thead>
                <tbody>
                  {budgetVsReal.lines.map((l) => (
                    <tr key={l.accountId} className="border-t border-coya-border">
                      <td className="p-3">{l.accountCode} {l.accountLabel}</td>
                      <td className="p-3 text-right font-mono">{l.budgetAmount.toLocaleString('fr-FR')}</td>
                      <td className="p-3 text-right font-mono">{l.actualBalance.toLocaleString('fr-FR')}</td>
                      <td className="p-3 text-right font-mono">{l.variance.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 font-medium">
                  <tr><td className="p-3">Total</td><td className="p-3 text-right font-mono">{budgetVsReal.totalBudget.toLocaleString('fr-FR')}</td><td className="p-3 text-right font-mono">{budgetVsReal.totalActual.toLocaleString('fr-FR')}</td><td className="p-3 text-right font-mono">{budgetVsReal.totalVariance.toLocaleString('fr-FR')}</td></tr>
                </tfoot>
              </table>
            </div>
          )}
          {reportType === 'flux' && cashFlow !== null && (
            <div className="rounded-coya border border-coya-border p-4 bg-coya-card max-w-xl">
              <h3 className="font-semibold text-coya-text mb-3">{isFr ? 'Flux de trésorerie' : 'Cash flow'}</h3>
              <p className="text-sm">{isFr ? 'Trésorerie ouverture' : 'Opening cash'} : <span className="font-mono">{cashFlow.openingCash.toLocaleString('fr-FR')}</span></p>
              <p className="text-sm">{isFr ? 'Trésorerie clôture' : 'Closing cash'} : <span className="font-mono">{cashFlow.closingCash.toLocaleString('fr-FR')}</span></p>
              <p className="text-sm font-medium">{isFr ? 'Mouvement période' : 'Period movement'} : <span className="font-mono">{cashFlow.periodMovement.toLocaleString('fr-FR')}</span></p>
              {cashFlow.details.length > 0 && (
                <div className="mt-3 text-sm">
                  {cashFlow.details.map((d) => (
                    <div key={d.code} className="flex justify-between"><span>{d.code} {d.label}</span><span className="font-mono">{d.movement.toLocaleString('fr-FR')}</span></div>
                  ))}
                </div>
              )}
              {cashFlow.details.length === 0 && <p className="text-coya-text-muted text-sm">{isFr ? 'Marquez des comptes « Compte trésorerie » dans le plan comptable.' : 'Mark accounts as « Cash flow account » in chart of accounts.'}</p>}
            </div>
          )}
        </div>
      )}

      {!loading && organizationId && activeTab === 'centres' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && <button type="button" className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white" onClick={() => setShowCostCenterForm(true)}>+ {isFr ? 'Ajouter un centre' : 'Add center'}</button>}
          </div>
          {showCostCenterForm && (
            <CostCenterForm isFr={isFr} onSubmit={handleSaveCostCenter} onCancel={() => setShowCostCenterForm(false)} submitting={submitting} />
          )}
          <div className="rounded-coya border border-coya-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coya-bg"><tr><th className="text-left p-3">{isFr ? 'Code' : 'Code'}</th><th className="text-left p-3">{isFr ? 'Libellé' : 'Label'}</th></tr></thead>
              <tbody>
                {costCenters.map((cc) => (
                  <tr key={cc.id} className="border-t border-coya-border"><td className="p-3 font-mono">{cc.code}</td><td className="p-3">{cc.label}</td></tr>
                ))}
                {costCenters.length === 0 && !showCostCenterForm && <tr><td colSpan={2} className="p-6 text-center text-coya-text-muted">{isFr ? 'Aucun centre de coût.' : 'No cost center.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && organizationId && activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && <button type="button" className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white" onClick={() => setShowBudgetForm(true)}>+ {isFr ? 'Créer un budget' : 'Create budget'}</button>}
          </div>
          {showBudgetForm && <BudgetForm isFr={isFr} onSubmit={handleSaveBudget} onCancel={() => setShowBudgetForm(false)} submitting={submitting} />}
          <div className="rounded-coya border border-coya-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coya-bg"><tr><th className="text-left p-3">{isFr ? 'Nom' : 'Name'}</th><th className="text-left p-3">{isFr ? 'Exercice' : 'Year'}</th></tr></thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id} className="border-t border-coya-border"><td className="p-3">{b.name}</td><td className="p-3">{b.fiscalYear}</td></tr>
                ))}
                {budgets.length === 0 && !showBudgetForm && <tr><td colSpan={2} className="p-6 text-center text-coya-text-muted">{isFr ? 'Aucun budget.' : 'No budget.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && organizationId && activeTab === 'fiscale' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && <button type="button" className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white" onClick={() => setShowFiscalForm(true)}>+ {isFr ? 'Ajouter règle fiscale' : 'Add fiscal rule'}</button>}
          </div>
          {showFiscalForm && <FiscalForm isFr={isFr} onSubmit={handleSaveFiscalRule} onCancel={() => setShowFiscalForm(false)} submitting={submitting} />}
          <div className="rounded-coya border border-coya-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coya-bg"><tr><th className="text-left p-3">{isFr ? 'Code' : 'Code'}</th><th className="text-left p-3">{isFr ? 'Libellé' : 'Label'}</th><th className="text-right p-3">{isFr ? 'Taux' : 'Rate'}</th></tr></thead>
              <tbody>
                {fiscalRules.map((fr) => (
                  <tr key={fr.id} className="border-t border-coya-border"><td className="p-3 font-mono">{fr.code}</td><td className="p-3">{fr.label}</td><td className="p-3 text-right">{fr.rate} %</td></tr>
                ))}
                {fiscalRules.length === 0 && !showFiscalForm && <tr><td colSpan={3} className="p-6 text-center text-coya-text-muted">{isFr ? 'Aucune règle fiscale.' : 'No fiscal rule.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!organizationId && !loading && (
        <p className="text-coya-text-muted py-4">{isFr ? 'Aucune organisation associée.' : 'No organization linked.'}</p>
      )}
    </StructuredModulePage>
  );
};

function JournalForm({
  isFr,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  onSubmit: (form: { code: string; name: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    onSubmit({ code: code.trim(), name: name.trim() });
  };

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          className="w-full rounded-coya border border-coya-border px-3 py-2"
          placeholder={isFr ? 'Code (ex. OD)' : 'Code (e.g. OD)'}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <input
          type="text"
          className="w-full rounded-coya border border-coya-border px-3 py-2"
          placeholder={isFr ? 'Nom du journal' : 'Journal name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="rounded-coya bg-coya-primary px-4 py-2 text-white text-sm">
            {submitting ? (isFr ? 'Enregistrement…' : 'Saving…') : (isFr ? 'Enregistrer' : 'Save')}
          </button>
          <button type="button" onClick={onCancel} className="rounded-coya border border-coya-border px-4 py-2 text-sm">
            {isFr ? 'Annuler' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CostCenterForm({ isFr, onSubmit, onCancel, submitting }: { isFr: boolean; onSubmit: (form: { code: string; label: string }) => void; onCancel: () => void; submitting: boolean }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !label.trim()) return;
    onSubmit({ code: code.trim(), label: label.trim() });
  };
  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3 flex flex-wrap gap-3 items-end">
        <input type="text" className="rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Code' : 'Code'} value={code} onChange={(e) => setCode(e.target.value)} required />
        <input type="text" className="rounded-coya border border-coya-border px-3 py-2 flex-1 min-w-[200px]" placeholder={isFr ? 'Libellé' : 'Label'} value={label} onChange={(e) => setLabel(e.target.value)} required />
        <button type="submit" disabled={submitting} className="rounded-coya bg-coya-primary px-4 py-2 text-white text-sm">{isFr ? 'Enregistrer' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="rounded-coya border border-coya-border px-4 py-2 text-sm">{isFr ? 'Annuler' : 'Cancel'}</button>
      </form>
    </div>
  );
}

function BudgetForm({ isFr, onSubmit, onCancel, submitting }: { isFr: boolean; onSubmit: (form: { name: string; fiscalYear: number }) => void; onCancel: () => void; submitting: boolean }) {
  const [name, setName] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), fiscalYear });
  };
  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3 flex flex-wrap gap-3 items-end">
        <input type="text" className="rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Nom du budget' : 'Budget name'} value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="number" className="rounded-coya border border-coya-border px-3 py-2 w-24" value={fiscalYear} onChange={(e) => setFiscalYear(parseInt(e.target.value, 10) || new Date().getFullYear())} />
        <button type="submit" disabled={submitting} className="rounded-coya bg-coya-primary px-4 py-2 text-white text-sm">{isFr ? 'Créer' : 'Create'}</button>
        <button type="button" onClick={onCancel} className="rounded-coya border border-coya-border px-4 py-2 text-sm">{isFr ? 'Annuler' : 'Cancel'}</button>
      </form>
    </div>
  );
}

function FiscalForm({ isFr, onSubmit, onCancel, submitting }: { isFr: boolean; onSubmit: (form: { code: string; label: string; rate: number }) => void; onCancel: () => void; submitting: boolean }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [rate, setRate] = useState(0);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !label.trim()) return;
    onSubmit({ code: code.trim(), label: label.trim(), rate });
  };
  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3 flex flex-wrap gap-3 items-end">
        <input type="text" className="rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Code' : 'Code'} value={code} onChange={(e) => setCode(e.target.value)} required />
        <input type="text" className="rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Libellé' : 'Label'} value={label} onChange={(e) => setLabel(e.target.value)} required />
        <input type="number" step="0.01" className="rounded-coya border border-coya-border px-3 py-2 w-24" placeholder="%" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} />
        <button type="submit" disabled={submitting} className="rounded-coya bg-coya-primary px-4 py-2 text-white text-sm">{isFr ? 'Enregistrer' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="rounded-coya border border-coya-border px-4 py-2 text-sm">{isFr ? 'Annuler' : 'Cancel'}</button>
      </form>
    </div>
  );
}

function AccountForm({
  isFr,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  initial?: ChartOfAccount;
  onSubmit: (form: { code: string; label: string; accountType: ChartAccountType; framework?: ChartAccountFramework | null; isCashFlowRegister?: boolean }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [accountType, setAccountType] = useState<ChartAccountType>(initial?.accountType ?? 'expense');
  const [framework, setFramework] = useState<ChartAccountFramework>(initial?.framework ?? 'both');
  const [isCashFlowRegister, setIsCashFlowRegister] = useState(initial?.isCashFlowRegister ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !label.trim()) return;
    onSubmit({ code: code.trim(), label: label.trim(), accountType, framework, isCashFlowRegister });
  };

  const types: ChartAccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];
  const typeLabels: Record<ChartAccountType, string> = isFr
    ? { asset: 'Actif', liability: 'Passif', equity: 'Capitaux propres', income: 'Produit', expense: 'Charge' }
    : { asset: 'Asset', liability: 'Liability', equity: 'Equity', income: 'Income', expense: 'Expense' };

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          className="w-full rounded-coya border border-coya-border px-3 py-2"
          placeholder={isFr ? 'Code compte (ex. 601)' : 'Account code'}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <input
          type="text"
          className="w-full rounded-coya border border-coya-border px-3 py-2"
          placeholder={isFr ? 'Libellé' : 'Label'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <select
          className="w-full rounded-coya border border-coya-border px-3 py-2"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as ChartAccountType)}
        >
          {types.map((t) => (
            <option key={t} value={t}>{typeLabels[t]}</option>
          ))}
        </select>
        <select className="w-full rounded-coya border border-coya-border px-3 py-2" value={framework} onChange={(e) => setFramework(e.target.value as ChartAccountFramework)}>
          <option value="both">{isFr ? 'Les deux (SYSCOHADA + SYCEBNL)' : 'Both'}</option>
          <option value="syscohada">SYSCOHADA</option>
          <option value="sycebnl">SYCEBNL</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCashFlowRegister} onChange={(e) => setIsCashFlowRegister(e.target.checked)} />
          {isFr ? 'Compte trésorerie (flux de trésorerie)' : 'Cash flow account'}
        </label>
        <div className="flex gap-2">
          <button type="submit" className="rounded-coya bg-coya-primary px-4 py-2 text-sm text-white disabled:opacity-50" disabled={submitting}>
            {isFr ? 'Enregistrer' : 'Save'}
          </button>
          <button type="button" className="rounded-coya border border-coya-border px-4 py-2 text-sm" onClick={onCancel}>
            {isFr ? 'Annuler' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EntryForm({
  isFr,
  organizationId,
  journals,
  accounts,
  costCenters,
  fiscalRules,
  defaultDate,
  onSubmit,
  onCancel,
  submitting,
}: {
  isFr: boolean;
  organizationId: string;
  journals: AccountingJournal[];
  accounts: ChartOfAccount[];
  costCenters: CostCenter[];
  fiscalRules: FiscalRule[];
  defaultDate: string;
  onSubmit: (payload: {
    journalId: string;
    entryDate: string;
    reference?: string;
    description?: string;
    documentNumber?: string;
    attachmentType?: string | null;
    attachmentUrl?: string | null;
    resourceName?: string | null;
    resourceDatabaseUrl?: string | null;
    accountIdDebit: string;
    labelDebit?: string;
    costCenterIdDebit?: string | null;
    fiscalCodeDebit?: string | null;
    accountIdCredit: string;
    labelCredit?: string;
    costCenterIdCredit?: string | null;
    fiscalCodeCredit?: string | null;
    amount: number;
  }) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [journalId, setJournalId] = useState(journals[0]?.id ?? '');
  const [entryDate, setEntryDate] = useState(defaultDate);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [attachmentType, setAttachmentType] = useState<'link' | 'resource' | ''>('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [resourceDatabaseUrl, setResourceDatabaseUrl] = useState('');
  const [accountIdDebit, setAccountIdDebit] = useState(accounts[0]?.id ?? '');
  const [labelDebit, setLabelDebit] = useState('');
  const [costCenterIdDebit, setCostCenterIdDebit] = useState('');
  const [fiscalCodeDebit, setFiscalCodeDebit] = useState('');
  const [accountIdCredit, setAccountIdCredit] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [labelCredit, setLabelCredit] = useState('');
  const [costCenterIdCredit, setCostCenterIdCredit] = useState('');
  const [fiscalCodeCredit, setFiscalCodeCredit] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount.replace(',', '.'));
    if (!journalId || !entryDate || !accountIdDebit || !accountIdCredit || isNaN(n) || n <= 0) return;
    await onSubmit({
      journalId,
      entryDate,
      reference: reference.trim() || undefined,
      description: description.trim() || undefined,
      documentNumber: documentNumber.trim() || undefined,
      attachmentType: attachmentType || null,
      attachmentUrl: attachmentUrl.trim() || null,
      resourceName: resourceName.trim() || null,
      resourceDatabaseUrl: resourceDatabaseUrl.trim() || null,
      accountIdDebit,
      labelDebit: labelDebit.trim() || undefined,
      costCenterIdDebit: costCenterIdDebit || null,
      fiscalCodeDebit: fiscalCodeDebit.trim() || null,
      accountIdCredit,
      labelCredit: labelCredit.trim() || undefined,
      costCenterIdCredit: costCenterIdCredit || null,
      fiscalCodeCredit: fiscalCodeCredit.trim() || null,
      amount: n,
    });
  };

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 mb-4">
      <h3 className="font-semibold text-coya-text mb-3">{isFr ? 'Nouvelle écriture (débit / crédit)' : 'New entry (debit / credit)'}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-coya-text-muted mb-1">{isFr ? 'Journal' : 'Journal'}</label>
            <select className="w-full rounded-coya border border-coya-border px-3 py-2" value={journalId} onChange={(e) => setJournalId(e.target.value)} required>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>{j.code} – {j.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-coya-text-muted mb-1">{isFr ? 'Date' : 'Date'}</label>
            <input type="date" className="w-full rounded-coya border border-coya-border px-3 py-2" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm text-coya-text-muted mb-1">{isFr ? 'N° pièce / dossier' : 'Document number'}</label>
          <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder="ex. PJ-2025-001" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
        </div>
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Référence' : 'Reference'} value={reference} onChange={(e) => setReference(e.target.value)} />
        <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'Description' : 'Description'} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="border border-coya-border rounded-coya p-3 bg-coya-bg/30">
          <p className="text-sm font-medium text-coya-text mb-2">{isFr ? 'Pièce justificative (lien ou ressource)' : 'Supporting document (link or resource)'}</p>
          <select className="w-full rounded-coya border border-coya-border px-3 py-2 mb-2" value={attachmentType} onChange={(e) => setAttachmentType(e.target.value as any)}>
            <option value="">—</option>
            <option value="link">{isFr ? 'Lien URL' : 'URL link'}</option>
            <option value="resource">{isFr ? 'Ressource (nom + URL base)' : 'Resource (name + DB URL)'}</option>
          </select>
          {attachmentType === 'link' && (
            <input type="url" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder="https://..." value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
          )}
          {attachmentType === 'resource' && (
            <>
              <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2 mb-2" placeholder={isFr ? 'Nom ressource' : 'Resource name'} value={resourceName} onChange={(e) => setResourceName(e.target.value)} />
              <input type="url" className="w-full rounded-coya border border-coya-border px-3 py-2" placeholder={isFr ? 'URL d\'accès base' : 'Database access URL'} value={resourceDatabaseUrl} onChange={(e) => setResourceDatabaseUrl(e.target.value)} />
            </>
          )}
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-coya-text mb-2">{isFr ? 'Ligne au débit' : 'Debit line'}</p>
          <select className="w-full rounded-coya border border-coya-border px-3 py-2 mb-2" value={accountIdDebit} onChange={(e) => setAccountIdDebit(e.target.value)} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} – {a.label}</option>
            ))}
          </select>
          <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2 mb-2" placeholder={isFr ? 'Libellé ligne' : 'Line label'} value={labelDebit} onChange={(e) => setLabelDebit(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-coya border border-coya-border px-3 py-2" value={costCenterIdDebit} onChange={(e) => setCostCenterIdDebit(e.target.value)}>
              <option value="">{isFr ? 'Centre' : 'Center'}</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code}</option>
              ))}
            </select>
            <select className="rounded-coya border border-coya-border px-3 py-2" value={fiscalCodeDebit} onChange={(e) => setFiscalCodeDebit(e.target.value)}>
              <option value="">{isFr ? 'Fiscal' : 'Fiscal'}</option>
              {fiscalRules.map((fr) => (
                <option key={fr.id} value={fr.code}>{fr.code}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-coya-text mb-2">{isFr ? 'Ligne au crédit' : 'Credit line'}</p>
          <select className="w-full rounded-coya border border-coya-border px-3 py-2 mb-2" value={accountIdCredit} onChange={(e) => setAccountIdCredit(e.target.value)} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} – {a.label}</option>
            ))}
          </select>
          <input type="text" className="w-full rounded-coya border border-coya-border px-3 py-2 mb-2" placeholder={isFr ? 'Libellé ligne' : 'Line label'} value={labelCredit} onChange={(e) => setLabelCredit(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-coya border border-coya-border px-3 py-2" value={costCenterIdCredit} onChange={(e) => setCostCenterIdCredit(e.target.value)}>
              <option value="">{isFr ? 'Centre' : 'Center'}</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code}</option>
              ))}
            </select>
            <select className="rounded-coya border border-coya-border px-3 py-2" value={fiscalCodeCredit} onChange={(e) => setFiscalCodeCredit(e.target.value)}>
              <option value="">{isFr ? 'Fiscal' : 'Fiscal'}</option>
              {fiscalRules.map((fr) => (
                <option key={fr.id} value={fr.code}>{fr.code}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-coya-text-muted mb-1">{isFr ? 'Montant (débit = crédit)' : 'Amount (debit = credit)'}</label>
          <input type="number" step="0.01" min="0" className="w-full rounded-coya border border-coya-border px-3 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-coya bg-coya-primary px-4 py-2 text-sm text-white disabled:opacity-50" disabled={submitting}>
            {isFr ? 'Enregistrer l\'écriture' : 'Save entry'}
          </button>
          <button type="button" className="rounded-coya border border-coya-border px-4 py-2 text-sm" onClick={onCancel}>
            {isFr ? 'Annuler' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ComptabiliteModule;
