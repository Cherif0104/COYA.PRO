import { supabase } from './supabaseService';
import {
  ChartOfAccount,
  ChartAccountType,
  AccountingJournal,
  AccountingJournalType,
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
  AccountingPermission,
  FiscalYear,
  AccountingFramework,
  CostCenter,
  FiscalRule,
  Budget,
  BudgetLine,
  OrganizationAccountingSettings,
  JournalEntryAttachment,
  AccountingMatchingGroup,
  AccountingReconciliation,
  AccountingPeriodClosure,
} from '../types';
import { getGeneralAccountsTemplate } from './accountingTemplates';

const CHART = 'chart_of_accounts';
const JOURNALS = 'accounting_journals';
const ENTRIES = 'journal_entries';
const LINES = 'journal_entry_lines';
const ORG_SETTINGS = 'organization_accounting_settings';
const ATTACHMENTS = 'journal_entry_attachments';
const COST_CENTERS = 'cost_centers';
const FISCAL_RULES = 'fiscal_rules';
const BUDGETS = 'budgets';
const BUDGET_LINES = 'budget_lines';
const BUCKET_ACCOUNTING = 'accounting-attachments';
const ACCOUNTING_PERMISSIONS = 'accounting_permissions';
const FISCAL_YEARS = 'fiscal_years';
const MATCHING_GROUPS = 'accounting_matching_groups';
const MATCHING_LINES = 'accounting_matching_lines';
const RECONCILIATIONS = 'accounting_reconciliations';
const PERIOD_CLOSURES = 'accounting_period_closures';

function isMissingColumnError(err: unknown, column: string): boolean {
  const e = err as { code?: string; message?: string; details?: string; hint?: string };
  const code = String(e?.code || '');
  const msg = `${e?.message || ''} ${e?.details || ''} ${e?.hint || ''}`.toLowerCase();
  // PostgREST schema cache missing column
  if (code === 'PGRST204') return msg.includes(String(column).toLowerCase());
  return false;
}

function mapAccount(r: any): ChartOfAccount {
  return {
    id: r.id,
    organizationId: r.organization_id,
    code: r.code,
    label: r.label,
    accountType: r.account_type as ChartAccountType,
    parentId: r.parent_id ?? null,
    framework: r.framework ?? null,
    isCashFlowRegister: r.is_cash_flow_register === true,
    isActive: r.is_active !== false,
    sequence: r.sequence ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapJournal(r: any): AccountingJournal {
  return {
    id: r.id,
    organizationId: r.organization_id,
    code: r.code,
    name: r.name,
    journalType: r.journal_type as AccountingJournalType,
    currency: r.currency ?? 'XOF',
    isActive: r.is_active !== false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapEntry(r: any): JournalEntry {
  return {
    id: r.id,
    organizationId: r.organization_id,
    journalId: r.journal_id,
    entryDate: r.entry_date,
    reference: r.reference ?? null,
    description: r.description ?? null,
    documentNumber: r.document_number ?? null,
    attachmentType: r.attachment_type ?? null,
    attachmentUrl: r.attachment_url ?? null,
    attachmentStoragePath: r.attachment_storage_path ?? null,
    resourceName: r.resource_name ?? null,
    resourceDatabaseUrl: r.resource_database_url ?? null,
    status: (r.status as JournalEntryStatus) ?? 'draft',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdById: r.created_by_id ?? null,
  };
}

function mapLine(r: any): JournalEntryLine {
  return {
    id: r.id,
    entryId: r.entry_id,
    accountId: r.account_id,
    label: r.label ?? null,
    debit: Number(r.debit ?? 0),
    credit: Number(r.credit ?? 0),
    sequence: r.sequence ?? 0,
    costCenterId: r.cost_center_id ?? null,
    fiscalCode: r.fiscal_code ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    accountCode: r.chart_of_accounts?.code,
    accountLabel: r.chart_of_accounts?.label,
  };
}

function mapMatchingGroup(r: any): AccountingMatchingGroup {
  return {
    id: r.id,
    organizationId: r.organization_id,
    code: r.code,
    accountId: r.account_id,
    matchedAt: r.matched_at ?? null,
    note: r.note ?? null,
    createdById: r.created_by_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapReconciliation(r: any): AccountingReconciliation {
  const statementBalance = Number(r.statement_balance ?? 0);
  const bookBalance = Number(r.book_balance ?? 0);
  return {
    id: r.id,
    organizationId: r.organization_id,
    journalId: r.journal_id,
    accountId: r.account_id,
    statementReference: r.statement_reference,
    statementDate: r.statement_date,
    statementBalance,
    bookBalance,
    variance: Number(r.variance ?? statementBalance - bookBalance),
    status: r.status ?? 'draft',
    notes: r.notes ?? null,
    createdById: r.created_by_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapPeriodClosure(r: any): AccountingPeriodClosure {
  return {
    id: r.id,
    organizationId: r.organization_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    closureType: r.closure_type,
    status: r.status,
    reason: r.reason ?? null,
    closedById: r.closed_by_id ?? null,
    closedAt: r.closed_at ?? null,
    reopenedById: r.reopened_by_id ?? null,
    reopenedAt: r.reopened_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------- Cadre comptable (SYSCOHADA / SYCEBNL) ----------
export async function getOrganizationAccountingSettings(organizationId: string): Promise<OrganizationAccountingSettings | null> {
  try {
    const { data, error } = await supabase
      .from(ORG_SETTINGS)
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      organizationId: data.organization_id,
      accountingFramework: data.accounting_framework as AccountingFramework,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function setOrganizationAccountingFramework(
  organizationId: string,
  accountingFramework: AccountingFramework
): Promise<OrganizationAccountingSettings> {
  const { data: existing } = await supabase.from(ORG_SETTINGS).select('id').eq('organization_id', organizationId).maybeSingle();
  const row = { organization_id: organizationId, accounting_framework: accountingFramework, updated_at: new Date().toISOString() };
  if (existing) {
    const { data, error } = await supabase.from(ORG_SETTINGS).update(row).eq('id', existing.id).select().single();
    if (error) throw error;
    return { id: data.id, organizationId: data.organization_id, accountingFramework: data.accounting_framework, createdAt: data.created_at, updatedAt: data.updated_at };
  } else {
    const { data, error } = await supabase.from(ORG_SETTINGS).insert(row).select().single();
    if (error) throw error;
    return { id: data.id, organizationId: data.organization_id, accountingFramework: data.accounting_framework, createdAt: data.created_at, updatedAt: data.updated_at };
  }
}

// ---------- Droits Comptabilité (audit P2) ----------
export async function getAccountingPermissions(
  organizationId: string,
  userId?: string | null
): Promise<AccountingPermission[]> {
  try {
    let query = supabase
      .from(ACCOUNTING_PERMISSIONS)
      .select('*')
      .eq('organization_id', organizationId);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('user_id');
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      userId: r.user_id,
      role: r.role,
      allowedJournalIds: r.allowed_journal_ids ?? null,
      allowedCostCenterIds: r.allowed_cost_center_ids ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

// ---------- Exercices fiscaux (audit P2) ----------
export async function listFiscalYears(organizationId: string): Promise<FiscalYear[]> {
  try {
    const { data, error } = await supabase
      .from(FISCAL_YEARS)
      .select('*')
      .eq('organization_id', organizationId)
      .order('date_start', { ascending: false });
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      label: r.label,
      dateStart: r.date_start,
      dateEnd: r.date_end,
      isClosed: !!r.is_closed,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function listMatchingGroups(organizationId: string, accountId?: string): Promise<AccountingMatchingGroup[]> {
  try {
    let query = supabase.from(MATCHING_GROUPS).select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (accountId) query = query.eq('account_id', accountId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapMatchingGroup);
  } catch {
    return [];
  }
}

export async function createMatchingGroup(params: {
  organizationId: string;
  accountId: string;
  lineIds: string[];
  note?: string | null;
  createdById?: string | null;
}): Promise<AccountingMatchingGroup> {
  const code = `LTR-${Date.now()}`;
  const { data, error } = await supabase
    .from(MATCHING_GROUPS)
    .insert({
      organization_id: params.organizationId,
      account_id: params.accountId,
      code,
      note: params.note ?? null,
      matched_at: new Date().toISOString(),
      created_by_id: params.createdById ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;

  if (params.lineIds.length > 0) {
    const rows = params.lineIds.map((lineId) => ({ matching_group_id: data.id, line_id: lineId }));
    const { error: linesErr } = await supabase.from(MATCHING_LINES).insert(rows);
    if (linesErr) throw linesErr;
  }

  return { ...mapMatchingGroup(data), lineIds: params.lineIds };
}

export async function listReconciliations(organizationId: string): Promise<AccountingReconciliation[]> {
  try {
    const { data, error } = await supabase
      .from(RECONCILIATIONS)
      .select('*')
      .eq('organization_id', organizationId)
      .order('statement_date', { ascending: false });
    if (error) return [];
    return (data || []).map(mapReconciliation);
  } catch {
    return [];
  }
}

export async function createReconciliation(params: {
  organizationId: string;
  journalId: string;
  accountId: string;
  statementReference: string;
  statementDate: string;
  statementBalance: number;
  notes?: string | null;
  createdById?: string | null;
}): Promise<AccountingReconciliation> {
  const { data: balanceRows } = await supabase
    .from(LINES)
    .select('debit, credit, entry:journal_entries!inner(entry_date, organization_id)')
    .eq('account_id', params.accountId);
  const bookBalance = (balanceRows || [])
    .filter((row: any) => row.entry?.organization_id === params.organizationId && row.entry?.entry_date <= params.statementDate)
    .reduce((acc: number, row: any) => acc + Number(row.debit || 0) - Number(row.credit || 0), 0);
  const variance = Number(params.statementBalance) - bookBalance;

  const { data, error } = await supabase
    .from(RECONCILIATIONS)
    .insert({
      organization_id: params.organizationId,
      journal_id: params.journalId,
      account_id: params.accountId,
      statement_reference: params.statementReference,
      statement_date: params.statementDate,
      statement_balance: params.statementBalance,
      book_balance: bookBalance,
      variance,
      status: 'draft',
      notes: params.notes ?? null,
      created_by_id: params.createdById ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapReconciliation(data);
}

export async function setReconciliationStatus(id: string, status: 'draft' | 'validated'): Promise<void> {
  const { error } = await supabase.from(RECONCILIATIONS).update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listPeriodClosures(organizationId: string): Promise<AccountingPeriodClosure[]> {
  try {
    const { data, error } = await supabase
      .from(PERIOD_CLOSURES)
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false });
    if (error) return [];
    return (data || []).map(mapPeriodClosure);
  } catch {
    return [];
  }
}

export async function closeAccountingPeriod(params: {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  closureType: 'month' | 'quarter' | 'semester' | 'year';
  reason?: string | null;
  actorId?: string | null;
}): Promise<AccountingPeriodClosure> {
  const { data, error } = await supabase
    .from(PERIOD_CLOSURES)
    .upsert({
      organization_id: params.organizationId,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      closure_type: params.closureType,
      status: 'closed',
      reason: params.reason ?? null,
      closed_by_id: params.actorId ?? null,
      closed_at: new Date().toISOString(),
      reopened_by_id: null,
      reopened_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,period_start,period_end' })
    .select('*')
    .single();
  if (error) throw error;
  return mapPeriodClosure(data);
}

export async function reopenAccountingPeriod(id: string, actorId?: string | null): Promise<void> {
  const { error } = await supabase.from(PERIOD_CLOSURES).update({
    status: 'reopened',
    reopened_by_id: actorId ?? null,
    reopened_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

// ---------- Plan comptable ----------
export async function listChartOfAccounts(
  organizationId: string,
  options?: { framework?: AccountingFramework | null }
): Promise<ChartOfAccount[]> {
  try {
    let query = supabase
      .from(CHART)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('sequence', { ascending: true })
      .order('code');
    if (options?.framework) {
      query = query.or(`framework.eq.${options.framework},framework.eq.both`);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapAccount);
  } catch {
    return [];
  }
}

export async function getChartOfAccount(id: string): Promise<ChartOfAccount | null> {
  const { data, error } = await supabase.from(CHART).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapAccount(data) : null;
}

export async function createChartOfAccount(params: {
  organizationId: string;
  code: string;
  label: string;
  accountType: ChartAccountType;
  parentId?: string | null;
  sequence?: number;
  framework?: string | null;
  isCashFlowRegister?: boolean;
}): Promise<ChartOfAccount> {
  const { data, error } = await supabase
    .from(CHART)
    .insert({
      organization_id: params.organizationId,
      code: params.code,
      label: params.label,
      account_type: params.accountType,
      parent_id: params.parentId ?? null,
      sequence: params.sequence ?? 0,
      framework: params.framework ?? 'both',
      is_cash_flow_register: params.isCashFlowRegister ?? false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapAccount(data);
}

export async function seedGeneralChartOfAccounts(params: {
  organizationId: string;
  framework: AccountingFramework;
}): Promise<{ inserted: number; skipped: number }> {
  const templates = getGeneralAccountsTemplate(params.framework);
  const existing = await listChartOfAccounts(params.organizationId, { framework: params.framework });
  const existingCodes = new Set(existing.map((a) => a.code));
  let inserted = 0;
  let skipped = 0;

  for (const item of templates) {
    if (existingCodes.has(item.code)) {
      skipped += 1;
      continue;
    }
    await createChartOfAccount({
      organizationId: params.organizationId,
      code: item.code,
      label: item.label,
      accountType: item.accountType,
      framework: item.framework,
      isCashFlowRegister: item.isCashFlowRegister ?? false,
    });
    inserted += 1;
  }
  return { inserted, skipped };
}

export async function updateChartOfAccount(
  id: string,
  updates: Partial<Pick<ChartOfAccount, 'code' | 'label' | 'accountType' | 'parentId' | 'isActive' | 'sequence' | 'framework' | 'isCashFlowRegister'>>
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.code !== undefined) row.code = updates.code;
  if (updates.label !== undefined) row.label = updates.label;
  if (updates.accountType !== undefined) row.account_type = updates.accountType;
  if (updates.parentId !== undefined) row.parent_id = updates.parentId;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.sequence !== undefined) row.sequence = updates.sequence;
  if (updates.framework !== undefined) row.framework = updates.framework;
  if (updates.isCashFlowRegister !== undefined) row.is_cash_flow_register = updates.isCashFlowRegister;
  const { error } = await supabase.from(CHART).update(row).eq('id', id);
  if (error) throw error;
}

// ---------- Journaux ----------
export async function listAccountingJournals(organizationId: string): Promise<AccountingJournal[]> {
  try {
    const { data, error } = await supabase
      .from(JOURNALS)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('code');
    if (error) return [];
    return (data || []).map(mapJournal);
  } catch {
    return [];
  }
}

export async function createAccountingJournal(params: {
  organizationId: string;
  code: string;
  name: string;
  journalType?: AccountingJournalType;
  currency?: string;
}): Promise<AccountingJournal> {
  const { data, error } = await supabase
    .from(JOURNALS)
    .insert({
      organization_id: params.organizationId,
      code: params.code,
      name: params.name,
      journal_type: params.journalType ?? 'general',
      currency: params.currency ?? 'XOF',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapJournal(data);
}

// ---------- Écritures ----------
export async function listJournalEntries(params: {
  organizationId: string;
  journalId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: JournalEntryStatus | null;
}): Promise<JournalEntry[]> {
  try {
    let query = supabase
      .from(ENTRIES)
      .select('*')
      .eq('organization_id', params.organizationId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (params.journalId) query = query.eq('journal_id', params.journalId);
    if (params.dateFrom) query = query.gte('entry_date', params.dateFrom);
    if (params.dateTo) query = query.lte('entry_date', params.dateTo);
    if (params.status) query = query.eq('status', params.status);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapEntry);
  } catch {
    return [];
  }
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase.from(ENTRIES).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapEntry(data) : null;
}

export async function getJournalEntryWithLines(id: string): Promise<JournalEntry | null> {
  const { data: entry, error: eErr } = await supabase.from(ENTRIES).select('*').eq('id', id).maybeSingle();
  if (eErr || !entry) return entry ? mapEntry(entry) : null;
  const { data: lines, error: lErr } = await supabase
    .from(LINES)
    .select('*, chart_of_accounts(code, label)')
    .eq('entry_id', id)
    .order('sequence')
    .order('id');
  if (lErr) throw lErr;
  const mapped = mapEntry(entry);
  mapped.lines = (lines || []).map((l: any) => ({
    ...mapLine(l),
    accountCode: l.chart_of_accounts?.code,
    accountLabel: l.chart_of_accounts?.label,
  }));
  return mapped;
}

export async function createJournalEntry(params: {
  organizationId: string;
  journalId: string;
  entryDate: string;
  reference?: string | null;
  description?: string | null;
  documentNumber?: string | null;
  attachmentType?: string | null;
  attachmentUrl?: string | null;
  attachmentStoragePath?: string | null;
  resourceName?: string | null;
  resourceDatabaseUrl?: string | null;
  createdById?: string | null;
  lines: Array<{
    accountId: string;
    label?: string | null;
    debit: number;
    credit: number;
    costCenterId?: string | null;
    fiscalCode?: string | null;
  }>;
}): Promise<JournalEntry> {
  const row: Record<string, unknown> = {
    organization_id: params.organizationId,
    journal_id: params.journalId,
    entry_date: params.entryDate,
    reference: params.reference ?? null,
    description: params.description ?? null,
    document_number: params.documentNumber ?? null,
    attachment_type: params.attachmentType ?? null,
    attachment_url: params.attachmentUrl ?? null,
    attachment_storage_path: params.attachmentStoragePath ?? null,
    resource_name: params.resourceName ?? null,
    resource_database_url: params.resourceDatabaseUrl ?? null,
    created_by_id: params.createdById ?? null,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };
  // Compat: certaines bases n'ont pas encore la colonne `attachment_storage_path`.
  let entry: any = null;
  {
    const { data, error } = await supabase.from(ENTRIES).insert(row).select().single();
    if (error) {
      if (isMissingColumnError(error, 'attachment_storage_path')) {
        const retryRow = { ...row };
        delete (retryRow as any).attachment_storage_path;
        const { data: data2, error: err2 } = await supabase.from(ENTRIES).insert(retryRow).select().single();
        if (err2) throw err2;
        entry = data2;
      } else {
        throw error;
      }
    } else {
      entry = data;
    }
  }
  if (params.lines.length > 0) {
    const lineRows = params.lines.map((l, i) => ({
      entry_id: entry.id,
      account_id: l.accountId,
      label: l.label ?? null,
      debit: l.debit,
      credit: l.credit,
      sequence: i,
      cost_center_id: l.costCenterId ?? null,
      fiscal_code: l.fiscalCode ?? null,
    }));
    const { error: linesErr } = await supabase.from(LINES).insert(lineRows);
    if (linesErr) throw linesErr;
  }
  return mapEntry(entry);
}

export async function updateJournalEntry(
  id: string,
  updates: Partial<Pick<JournalEntry, 'entryDate' | 'reference' | 'description' | 'documentNumber' | 'attachmentType' | 'attachmentUrl' | 'attachmentStoragePath' | 'resourceName' | 'resourceDatabaseUrl' | 'status'>>
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.entryDate !== undefined) row.entry_date = updates.entryDate;
  if (updates.reference !== undefined) row.reference = updates.reference;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.documentNumber !== undefined) row.document_number = updates.documentNumber;
  if (updates.attachmentType !== undefined) row.attachment_type = updates.attachmentType;
  if (updates.attachmentUrl !== undefined) row.attachment_url = updates.attachmentUrl;
  if (updates.attachmentStoragePath !== undefined) row.attachment_storage_path = updates.attachmentStoragePath;
  if (updates.resourceName !== undefined) row.resource_name = updates.resourceName;
  if (updates.resourceDatabaseUrl !== undefined) row.resource_database_url = updates.resourceDatabaseUrl;
  if (updates.status !== undefined) row.status = updates.status;
  const { error } = await supabase.from(ENTRIES).update(row).eq('id', id);
  if (error) {
    if (row.attachment_storage_path !== undefined && isMissingColumnError(error, 'attachment_storage_path')) {
      const retryRow = { ...row };
      delete (retryRow as any).attachment_storage_path;
      const { error: err2 } = await supabase.from(ENTRIES).update(retryRow).eq('id', id);
      if (err2) throw err2;
      return;
    }
    throw error;
  }
}

/** Passe une écriture au statut validé ou verrouillé (audit P2). */
export async function setJournalEntryStatus(id: string, status: JournalEntryStatus): Promise<void> {
  const { error } = await supabase
    .from(ENTRIES)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const atts = await listJournalEntryAttachments(id);
  for (const a of atts) {
    try {
      await supabase.storage.from(BUCKET_ACCOUNTING).remove([a.filePath]);
    } catch (_) {}
  }
  const { error: aErr } = await supabase.from(ATTACHMENTS).delete().eq('entry_id', id);
  if (aErr) throw aErr;
  const { error } = await supabase.from(LINES).delete().eq('entry_id', id);
  if (error) throw error;
  const { error: e2 } = await supabase.from(ENTRIES).delete().eq('id', id);
  if (e2) throw e2;
}

// ---------- Pièces jointes écritures ----------
export async function listJournalEntryAttachments(entryId: string): Promise<JournalEntryAttachment[]> {
  const { data, error } = await supabase.from(ATTACHMENTS).select('*').eq('entry_id', entryId).order('created_at');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    entryId: r.entry_id,
    filePath: r.file_path,
    name: r.name,
    mimeType: r.mime_type ?? null,
    fileSize: r.file_size ?? null,
    createdAt: r.created_at,
  }));
}

export async function addJournalEntryAttachment(
  entryId: string,
  file: File
): Promise<JournalEntryAttachment> {
  const path = `${entryId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: uploadErr } = await supabase.storage.from(BUCKET_ACCOUNTING).upload(path, file, { upsert: false });
  if (uploadErr) throw uploadErr;
  const { data, error } = await supabase
    .from(ATTACHMENTS)
    .insert({ entry_id: entryId, file_path: path, name: file.name, mime_type: file.type || null, file_size: file.size })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, entryId: data.entry_id, filePath: data.file_path, name: data.name, mimeType: data.mime_type, fileSize: data.file_size, createdAt: data.created_at };
}

export async function deleteJournalEntryAttachment(attachmentId: string): Promise<void> {
  const { data: row } = await supabase.from(ATTACHMENTS).select('file_path').eq('id', attachmentId).single();
  if (row?.file_path) {
    try {
      await supabase.storage.from(BUCKET_ACCOUNTING).remove([row.file_path]);
    } catch (_) {}
  }
  const { error } = await supabase.from(ATTACHMENTS).delete().eq('id', attachmentId);
  if (error) throw error;
}

export async function getJournalEntryAttachmentSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_ACCOUNTING).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? '';
}

export async function listJournalEntryLines(entryId: string): Promise<JournalEntryLine[]> {
  const { data, error } = await supabase
    .from(LINES)
    .select('*, chart_of_accounts(code, label)')
    .eq('entry_id', entryId)
    .order('sequence')
    .order('id');
  if (error) throw error;
  return (data || []).map((l: any) => ({
    ...mapLine(l),
    accountCode: l.chart_of_accounts?.code,
    accountLabel: l.chart_of_accounts?.label,
  }));
}

// ---------- Centres de coûts (analytique) ----------
export async function listCostCenters(organizationId: string): Promise<CostCenter[]> {
  try {
    const { data, error } = await supabase
      .from(COST_CENTERS)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('code');
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      code: r.code,
      label: r.label,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function createCostCenter(params: { organizationId: string; code: string; label: string }): Promise<CostCenter> {
  const { data, error } = await supabase
    .from(COST_CENTERS)
    .insert({
      organization_id: params.organizationId,
      code: params.code,
      label: params.label,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, organizationId: data.organization_id, code: data.code, label: data.label, isActive: true, createdAt: data.created_at, updatedAt: data.updated_at };
}

// ---------- Règles fiscales ----------
export async function listFiscalRules(organizationId: string): Promise<FiscalRule[]> {
  try {
    const { data, error } = await supabase.from(FISCAL_RULES).select('*').eq('organization_id', organizationId).order('code');
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      code: r.code,
      label: r.label,
      rate: Number(r.rate ?? 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function createFiscalRule(params: { organizationId: string; code: string; label: string; rate?: number }): Promise<FiscalRule> {
  const { data, error } = await supabase
    .from(FISCAL_RULES)
    .insert({
      organization_id: params.organizationId,
      code: params.code,
      label: params.label,
      rate: params.rate ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, organizationId: data.organization_id, code: data.code, label: data.label, rate: Number(data.rate), createdAt: data.created_at, updatedAt: data.updated_at };
}

// ---------- Budgets ----------
export async function listBudgets(organizationId: string): Promise<Budget[]> {
  try {
    const { data, error } = await supabase
      .from(BUDGETS)
      .select('*')
      .eq('organization_id', organizationId)
      .order('fiscal_year', { ascending: false });
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      fiscalYear: r.fiscal_year,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getBudget(id: string): Promise<Budget | null> {
  try {
    const { data, error } = await supabase.from(BUDGETS).select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data ? { id: data.id, organizationId: data.organization_id, name: data.name, fiscalYear: data.fiscal_year, isActive: data.is_active !== false, createdAt: data.created_at, updatedAt: data.updated_at } : null;
  } catch {
    return null;
  }
}

export async function createBudget(params: { organizationId: string; name: string; fiscalYear: number }): Promise<Budget> {
  const { data, error } = await supabase
    .from(BUDGETS)
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      fiscal_year: params.fiscalYear,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, organizationId: data.organization_id, name: data.name, fiscalYear: data.fiscal_year, isActive: true, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function listBudgetLines(budgetId: string): Promise<(BudgetLine & { accountCode?: string; accountLabel?: string })[]> {
  try {
    const { data, error } = await supabase
      .from(BUDGET_LINES)
      .select('*, chart_of_accounts(code, label)')
      .eq('budget_id', budgetId)
      .order('id');
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      budgetId: r.budget_id,
      accountId: r.account_id,
      costCenterId: r.cost_center_id ?? null,
      amount: Number(r.amount ?? 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      accountCode: r.chart_of_accounts?.code,
      accountLabel: r.chart_of_accounts?.label,
    }));
  } catch {
    return [];
  }
}

export async function setBudgetLines(budgetId: string, lines: Array<{ accountId: string; costCenterId?: string | null; amount: number }>): Promise<void> {
  const { error: delErr } = await supabase.from(BUDGET_LINES).delete().eq('budget_id', budgetId);
  if (delErr) throw delErr;
  if (lines.length > 0) {
    const rows = lines.map((l) => ({
      budget_id: budgetId,
      account_id: l.accountId,
      cost_center_id: l.costCenterId ?? null,
      amount: l.amount,
    }));
    const { error: insErr } = await supabase.from(BUDGET_LINES).insert(rows);
    if (insErr) throw insErr;
  }
}

// ---------- Rapports : soldes par compte (dateFrom → dateTo) ----------
export async function getAccountBalances(params: {
  organizationId: string;
  dateFrom: string;
  dateTo: string;
  costCenterId?: string | null;
  framework?: AccountingFramework | null;
}): Promise<Array<{ accountId: string; code: string; label: string; accountType: string; debit: number; credit: number; balance: number }>> {
  try {
    const { data: entries, error: eErr } = await supabase
      .from(ENTRIES)
      .select('id')
      .eq('organization_id', params.organizationId)
      .gte('entry_date', params.dateFrom)
      .lte('entry_date', params.dateTo);
    if (eErr) return [];
    const entryIds = (entries || []).map((e: any) => e.id);
    if (entryIds.length === 0) return [];

    const lineQuery = supabase.from(LINES).select('account_id, debit, credit, cost_center_id').in('entry_id', entryIds);
    const { data: lines, error: lErr } = await lineQuery;
    if (lErr) return [];

    let filtered = (lines || []) as any[];
    if (params.costCenterId) {
      filtered = filtered.filter((l) => l.cost_center_id === params.costCenterId);
    }

    const byAccount: Record<string, { debit: number; credit: number }> = {};
    filtered.forEach((l: any) => {
      const aid = l.account_id;
      if (!byAccount[aid]) byAccount[aid] = { debit: 0, credit: 0 };
      byAccount[aid].debit += Number(l.debit ?? 0);
      byAccount[aid].credit += Number(l.credit ?? 0);
    });

    const accounts = await listChartOfAccounts(params.organizationId, params.framework ? { framework: params.framework } : undefined);
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    return Object.entries(byAccount).map(([accountId, { debit, credit }]) => {
      const acc = accountMap.get(accountId);
      const balance = debit - credit;
      return {
        accountId,
        code: acc?.code ?? '',
        label: acc?.label ?? '',
        accountType: acc?.accountType ?? 'expense',
        debit,
        credit,
        balance,
      };
    });
  } catch {
    return [];
  }
}

/** Bilan à une date (actif / passif / capitaux propres) */
export async function getBalanceSheet(organizationId: string, asOfDate: string): Promise<{
  assets: Array<{ code: string; label: string; balance: number }>;
  liabilities: Array<{ code: string; label: string; balance: number }>;
  equity: Array<{ code: string; label: string; balance: number }>;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}> {
  const balances = await getAccountBalances({
    organizationId,
    dateFrom: '1900-01-01',
    dateTo: asOfDate,
  });
  const assets = balances.filter((b) => b.accountType === 'asset' && b.balance !== 0);
  const liabilities = balances.filter((b) => b.accountType === 'liability' && b.balance !== 0);
  const equity = balances.filter((b) => b.accountType === 'equity' && b.balance !== 0);
  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
  const totalLiabilitiesAndEquity = liabilities.reduce((s, b) => s + b.balance, 0) + equity.reduce((s, b) => s + b.balance, 0);
  return {
    assets: assets.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
    liabilities: liabilities.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
    equity: equity.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
    totalAssets,
    totalLiabilitiesAndEquity,
  };
}

/** Compte de résultat (produits - charges) sur une période */
export async function getIncomeStatement(
  organizationId: string,
  dateFrom: string,
  dateTo: string,
  options?: { costCenterId?: string | null; framework?: AccountingFramework | null }
): Promise<{
  income: Array<{ code: string; label: string; balance: number }>;
  expense: Array<{ code: string; label: string; balance: number }>;
  totalIncome: number;
  totalExpense: number;
  result: number;
}> {
  const balances = await getAccountBalances({
    organizationId,
    dateFrom,
    dateTo,
    costCenterId: options?.costCenterId,
    framework: options?.framework,
  });
  const income = balances.filter((b) => b.accountType === 'income');
  const expense = balances.filter((b) => b.accountType === 'expense');
  const totalIncome = income.reduce((s, b) => s + b.balance, 0);
  const totalExpense = expense.reduce((s, b) => s + Math.abs(b.balance), 0);
  return {
    income: income.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
    expense: expense.map((b) => ({ code: b.code, label: b.label, balance: Math.abs(b.balance) })),
    totalIncome,
    totalExpense,
    result: totalIncome - totalExpense,
  };
}

export type ReportPeriodType = 'month' | 'quarter' | 'semester' | 'year';

/** Bilans à des dates de clôture (mensuel, trimestriel, semestriel, annuel) */
export async function getBalanceSheetSeries(
  organizationId: string,
  dateFrom: string,
  dateTo: string,
  periodType: ReportPeriodType,
  framework?: AccountingFramework | null
): Promise<Array<{ periodEnd: string; balanceSheet: Awaited<ReturnType<typeof getBalanceSheet>> }>> {
  const ends: string[] = [];
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  while (d <= to) {
    let end: Date;
    if (periodType === 'month') {
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    } else if (periodType === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      end = new Date(d.getFullYear(), q * 3, 0);
    } else if (periodType === 'semester') {
      const sem = d.getMonth() < 6 ? 6 : 12;
      end = new Date(d.getFullYear(), sem, 0);
    } else {
      end = new Date(d.getFullYear(), 11, 31);
    }
    if (end >= from && end <= to) {
      ends.push(end.toISOString().slice(0, 10));
    }
    if (periodType === 'month') d.setMonth(d.getMonth() + 1);
    else if (periodType === 'quarter') d.setMonth(d.getMonth() + 3);
    else if (periodType === 'semester') d.setMonth(d.getMonth() + 6);
    else d.setFullYear(d.getFullYear() + 1);
  }
  const seen = new Set<string>();
  const uniqueEnds = ends.filter((e) => {
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });
  const result: Array<{ periodEnd: string; balanceSheet: Awaited<ReturnType<typeof getBalanceSheet>> }> = [];
  const accounts = await listChartOfAccounts(organizationId, framework ? { framework } : undefined);
  for (const periodEnd of uniqueEnds) {
    const balances = await getAccountBalances({
      organizationId,
      dateFrom: '1900-01-01',
      dateTo: periodEnd,
      framework,
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const withType = balances.map((b) => ({ ...b, accountType: accountMap.get(b.accountId)?.accountType ?? b.accountType }));
    const assets = withType.filter((b) => b.accountType === 'asset' && b.balance !== 0);
    const liabilities = withType.filter((b) => b.accountType === 'liability' && b.balance !== 0);
    const equity = withType.filter((b) => b.accountType === 'equity' && b.balance !== 0);
    result.push({
      periodEnd,
      balanceSheet: {
        assets: assets.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
        liabilities: liabilities.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
        equity: equity.map((b) => ({ code: b.code, label: b.label, balance: b.balance })),
        totalAssets: assets.reduce((s, b) => s + b.balance, 0),
        totalLiabilitiesAndEquity: liabilities.reduce((s, b) => s + b.balance, 0) + equity.reduce((s, b) => s + b.balance, 0),
      },
    });
  }
  return result;
}

/** Soldes par centre de coût (comptabilité analytique) */
export async function getAnalyticalBalances(
  organizationId: string,
  dateFrom: string,
  dateTo: string
): Promise<Array<{ costCenterId: string; costCenterCode: string; costCenterLabel: string; balances: Awaited<ReturnType<typeof getAccountBalances>>; totalDebit: number; totalCredit: number }>> {
  const centers = await listCostCenters(organizationId);
  const result: Array<{ costCenterId: string; costCenterCode: string; costCenterLabel: string; balances: Awaited<ReturnType<typeof getAccountBalances>>; totalDebit: number; totalCredit: number }> = [];
  for (const cc of centers) {
    const balances = await getAccountBalances({ organizationId, dateFrom, dateTo, costCenterId: cc.id });
    const totalDebit = balances.reduce((s, b) => s + b.debit, 0);
    const totalCredit = balances.reduce((s, b) => s + b.credit, 0);
    result.push({
      costCenterId: cc.id,
      costCenterCode: cc.code,
      costCenterLabel: cc.label,
      balances,
      totalDebit,
      totalCredit,
    });
  }
  return result;
}

/** Budget vs réel (comparaison par compte sur l'exercice) */
export async function getBudgetVsReal(
  organizationId: string,
  budgetId: string,
  framework?: AccountingFramework | null
): Promise<{
  lines: Array<{ accountId: string; accountCode: string; accountLabel: string; budgetAmount: number; actualBalance: number; variance: number }>;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
}> {
  const budget = await getBudget(budgetId);
  if (!budget) {
    return { lines: [], totalBudget: 0, totalActual: 0, totalVariance: 0 };
  }
  const dateFrom = `${budget.fiscalYear}-01-01`;
  const dateTo = `${budget.fiscalYear}-12-31`;
  const lines = await listBudgetLines(budgetId);
  const actualBalances = await getAccountBalances({ organizationId, dateFrom, dateTo, framework });
  const actualByAccount = new Map(actualBalances.map((b) => [b.accountId, b.balance]));
  const resultLines = lines.map((l) => {
    const actual = actualByAccount.get(l.accountId) ?? 0;
    const budgetAmount = l.amount;
    return {
      accountId: l.accountId,
      accountCode: l.accountCode ?? '',
      accountLabel: l.accountLabel ?? '',
      budgetAmount,
      actualBalance: actual,
      variance: actual - budgetAmount,
    };
  });
  const totalBudget = resultLines.reduce((s, l) => s + l.budgetAmount, 0);
  const totalActual = resultLines.reduce((s, l) => s + l.actualBalance, 0);
  return {
    lines: resultLines,
    totalBudget,
    totalActual,
    totalVariance: totalActual - totalBudget,
  };
}

/** Flux de trésorerie : mouvement sur les comptes marqués "trésorerie" (ouverture, clôture, mouvement période) */
export async function getCashFlowStatement(
  organizationId: string,
  dateFrom: string,
  dateTo: string
): Promise<{
  openingCash: number;
  closingCash: number;
  periodMovement: number;
  details: Array<{ code: string; label: string; opening: number; closing: number; movement: number }>;
}> {
  const accounts = await listChartOfAccounts(organizationId);
  const cashAccountIds = accounts.filter((a) => a.isCashFlowRegister).map((a) => a.id);
  if (cashAccountIds.length === 0) {
    return { openingCash: 0, closingCash: 0, periodMovement: 0, details: [] };
  }
  const balancesToStart = await getAccountBalances({
    organizationId,
    dateFrom: '1900-01-01',
    dateTo: new Date(new Date(dateFrom).getTime() - 86400000).toISOString().slice(0, 10),
  });
  const balancesToEnd = await getAccountBalances({
    organizationId,
    dateFrom: '1900-01-01',
    dateTo: dateTo,
  });
  const balancesPeriod = await getAccountBalances({ organizationId, dateFrom, dateTo });
  const byAccount = (arr: typeof balancesToStart) => {
    const m = new Map<string, number>();
    arr.filter((b) => cashAccountIds.includes(b.accountId)).forEach((b) => m.set(b.accountId, b.balance));
    return m;
  };
  const openMap = byAccount(balancesToStart);
  const closeMap = byAccount(balancesToEnd);
  const periodMap = new Map<string, number>();
  balancesPeriod.filter((b) => cashAccountIds.includes(b.accountId)).forEach((b) => periodMap.set(b.accountId, b.balance));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  let openingCash = 0;
  let closingCash = 0;
  const details: Array<{ code: string; label: string; opening: number; closing: number; movement: number }> = [];
  for (const id of cashAccountIds) {
    const opening = openMap.get(id) ?? 0;
    const closing = closeMap.get(id) ?? 0;
    const movement = periodMap.get(id) ?? 0;
    openingCash += opening;
    closingCash += closing;
    details.push({
      code: accountMap.get(id)?.code ?? '',
      label: accountMap.get(id)?.label ?? '',
      opening,
      closing,
      movement,
    });
  }
  return {
    openingCash,
    closingCash,
    periodMovement: closingCash - openingCash,
    details,
  };
}
