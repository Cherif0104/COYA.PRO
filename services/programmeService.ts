import { supabase } from './supabaseService';
import {
  Bailleur,
  Programme,
  ProgrammeBudgetLine,
  Beneficiaire,
  CurrencyCode,
  ExpenseRequest,
  ExpenseRequestStatus,
  ProgrammeStakeholder,
  ProgrammeStakeholderType,
  ProgrammeAction,
  ProgrammeActionStatus,
  ProgrammeDataRow,
  ProgrammeBailleurLink,
} from '../types';

const BAILLEURS = 'bailleurs';
const PROGRAMMES = 'programmes';
const PROGRAMME_BUDGET_LINES = 'programme_budget_lines';
const BENEFICIAIRES = 'beneficiaires';
const PROGRAMME_AUDITORS = 'programme_auditors';
const EXPENSE_REQUESTS = 'expense_requests';
const PROGRAMME_BAILLEURS = 'programme_bailleurs';
const PROGRAMME_STAKEHOLDERS = 'programme_stakeholders';
const PROGRAMME_ACTIONS = 'programme_actions';
const PROGRAMME_DATA_ROWS = 'programme_data_rows';

function mapBailleur(r: any): Bailleur {
  return {
    id: r.id,
    organizationId: r.organization_id ?? null,
    name: r.name,
    code: r.code ?? null,
    description: r.description ?? null,
    contact: r.contact ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapProgramme(r: any): Programme {
  return {
    id: r.id,
    organizationId: r.organization_id ?? null,
    name: r.name,
    code: r.code ?? null,
    description: r.description ?? null,
    bailleurId: r.bailleur_id ?? null,
    bailleurName: r.bailleur_name ?? null,
    startDate: r.start_date ?? null,
    endDate: r.end_date ?? null,
    allowProjects: r.allow_projects !== false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapProgrammeBudgetLine(r: any): ProgrammeBudgetLine {
  return {
    id: r.id,
    programmeId: r.programme_id,
    label: r.label,
    plannedAmount: Number(r.planned_amount),
    spentAmount: r.spent_amount != null ? Number(r.spent_amount) : undefined,
    currency: (r.currency as CurrencyCode) ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapBeneficiaire(r: any): Beneficiaire {
  return {
    id: r.id,
    organizationId: r.organization_id ?? null,
    programmeId: r.programme_id ?? null,
    projectId: r.project_id ?? null,
    theme: r.theme ?? null,
    target: r.target ?? null,
    gender: r.gender ?? null,
    sector: r.sector ?? null,
    country: r.country ?? null,
    region: r.region ?? null,
    contact: r.contact ?? null,
    age: r.age ?? null,
    education: r.education ?? null,
    profession: r.profession ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------- Bailleurs ----------
export async function listBailleurs(organizationId?: string | null): Promise<Bailleur[]> {
  try {
    let query = supabase.from(BAILLEURS).select('*').order('name');
    if (organizationId) query = query.eq('organization_id', organizationId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapBailleur);
  } catch {
    return [];
  }
}

export async function getBailleur(id: string): Promise<Bailleur | null> {
  try {
    const { data, error } = await supabase.from(BAILLEURS).select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapBailleur(data);
  } catch {
    return null;
  }
}

export async function createBailleur(params: {
  organizationId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  contact?: string | null;
}): Promise<Bailleur> {
  const { data, error } = await supabase
    .from(BAILLEURS)
    .insert({
      organization_id: params.organizationId ?? null,
      name: params.name,
      code: params.code ?? null,
      description: params.description ?? null,
      contact: params.contact ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapBailleur(data);
}

export async function updateBailleur(id: string, updates: Partial<Pick<Bailleur, 'name' | 'code' | 'description' | 'contact'>>): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.code !== undefined) row.code = updates.code;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.contact !== undefined) row.contact = updates.contact;
  const { error } = await supabase.from(BAILLEURS).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteBailleur(id: string): Promise<void> {
  const { error } = await supabase.from(BAILLEURS).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Programmes ----------
export async function listProgrammes(organizationId?: string | null): Promise<Programme[]> {
  try {
    let query = supabase
      .from(PROGRAMMES)
      .select('*, bailleurs(name)')
      .order('name');
    if (organizationId) query = query.eq('organization_id', organizationId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((r: any) => {
      const p = mapProgramme(r);
      if (r.bailleurs?.name) p.bailleurName = r.bailleurs.name;
      return p;
    });
  } catch {
    return [];
  }
}

export async function getProgramme(id: string): Promise<Programme | null> {
  try {
    const { data, error } = await supabase
      .from(PROGRAMMES)
      .select('*, bailleurs(name)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    const p = mapProgramme(data);
    if (data.bailleurs?.name) p.bailleurName = data.bailleurs.name;
    return p;
  } catch {
    return null;
  }
}

export async function createProgramme(params: {
  organizationId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  bailleurId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  allowProjects?: boolean;
}): Promise<Programme> {
  const { data, error } = await supabase
    .from(PROGRAMMES)
    .insert({
      organization_id: params.organizationId ?? null,
      name: params.name,
      code: params.code ?? null,
      description: params.description ?? null,
      bailleur_id: params.bailleurId ?? null,
      start_date: params.startDate ?? null,
      end_date: params.endDate ?? null,
      allow_projects: params.allowProjects !== false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapProgramme(data);
}

export async function updateProgramme(
  id: string,
  updates: Partial<Pick<Programme, 'name' | 'code' | 'description' | 'bailleurId' | 'startDate' | 'endDate' | 'allowProjects'>>,
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.code !== undefined) row.code = updates.code;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.bailleurId !== undefined) row.bailleur_id = updates.bailleurId;
  if (updates.startDate !== undefined) row.start_date = updates.startDate;
  if (updates.endDate !== undefined) row.end_date = updates.endDate;
  if (updates.allowProjects !== undefined) row.allow_projects = updates.allowProjects;
  const { error } = await supabase.from(PROGRAMMES).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteProgramme(id: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMMES).delete().eq('id', id);
  if (error) throw error;
}

function mapProgrammeStakeholder(r: any): ProgrammeStakeholder {
  return {
    id: r.id,
    programmeId: r.programme_id,
    stakeholderType: (r.stakeholder_type as ProgrammeStakeholderType) || 'other',
    profileId: r.profile_id ?? null,
    externalName: r.external_name ?? null,
    externalRole: r.external_role ?? null,
    externalContact: r.external_contact ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapProgrammeAction(r: any): ProgrammeAction {
  return {
    id: r.id,
    programmeId: r.programme_id,
    title: r.title,
    actionType: r.action_type ?? 'other',
    status: (r.status as ProgrammeActionStatus) || 'draft',
    executorProfileId: r.executor_profile_id ?? null,
    validatedByProfileId: r.validated_by_profile_id ?? null,
    validatedAt: r.validated_at ?? null,
    dueDate: r.due_date ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapProgrammeDataRow(r: any): ProgrammeDataRow {
  const raw = r.row_data;
  const rowData =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, v == null ? '' : String(v)]),
        )
      : {};
  return {
    id: r.id,
    programmeId: r.programme_id,
    section: r.section ?? 'default',
    rowData,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------- Programme bailleurs additionnels (N-N) ----------
export async function listProgrammeBailleurs(programmeId: string): Promise<ProgrammeBailleurLink[]> {
  try {
    const { data, error } = await supabase
      .from(PROGRAMME_BAILLEURS)
      .select('*, bailleurs(name)')
      .eq('programme_id', programmeId);
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      programmeId: r.programme_id,
      bailleurId: r.bailleur_id,
      bailleurName: r.bailleurs?.name ?? null,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function addProgrammeBailleur(programmeId: string, bailleurId: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMME_BAILLEURS).insert({
    programme_id: programmeId,
    bailleur_id: bailleurId,
  });
  if (error) throw error;
}

export async function removeProgrammeBailleur(linkId: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMME_BAILLEURS).delete().eq('id', linkId);
  if (error) throw error;
}

// ---------- Parties prenantes (facilitateurs, partenaires, etc.) ----------
export async function listProgrammeStakeholders(programmeId: string): Promise<ProgrammeStakeholder[]> {
  try {
    const { data, error } = await supabase
      .from(PROGRAMME_STAKEHOLDERS)
      .select('*')
      .eq('programme_id', programmeId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapProgrammeStakeholder);
  } catch {
    return [];
  }
}

export async function createProgrammeStakeholder(params: {
  programmeId: string;
  stakeholderType: ProgrammeStakeholderType;
  profileId?: string | null;
  externalName?: string | null;
  externalRole?: string | null;
  externalContact?: string | null;
  notes?: string | null;
}): Promise<ProgrammeStakeholder> {
  const { data, error } = await supabase
    .from(PROGRAMME_STAKEHOLDERS)
    .insert({
      programme_id: params.programmeId,
      stakeholder_type: params.stakeholderType,
      profile_id: params.profileId ?? null,
      external_name: params.externalName ?? null,
      external_role: params.externalRole ?? null,
      external_contact: params.externalContact ?? null,
      notes: params.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapProgrammeStakeholder(data);
}

export async function updateProgrammeStakeholder(
  id: string,
  updates: Partial<
    Pick<
      ProgrammeStakeholder,
      'stakeholderType' | 'profileId' | 'externalName' | 'externalRole' | 'externalContact' | 'notes'
    >
  >,
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.stakeholderType !== undefined) row.stakeholder_type = updates.stakeholderType;
  if (updates.profileId !== undefined) row.profile_id = updates.profileId;
  if (updates.externalName !== undefined) row.external_name = updates.externalName;
  if (updates.externalRole !== undefined) row.external_role = updates.externalRole;
  if (updates.externalContact !== undefined) row.external_contact = updates.externalContact;
  if (updates.notes !== undefined) row.notes = updates.notes;
  const { error } = await supabase.from(PROGRAMME_STAKEHOLDERS).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteProgrammeStakeholder(id: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMME_STAKEHOLDERS).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Plans d'action ----------
export async function listProgrammeActions(programmeId: string): Promise<ProgrammeAction[]> {
  try {
    const { data, error } = await supabase
      .from(PROGRAMME_ACTIONS)
      .select('*')
      .eq('programme_id', programmeId)
      .order('due_date', { ascending: true, nullsFirst: false });
    if (error) return [];
    return (data || []).map(mapProgrammeAction);
  } catch {
    return [];
  }
}

export async function createProgrammeAction(params: {
  programmeId: string;
  title: string;
  actionType?: string;
  status?: ProgrammeActionStatus;
  executorProfileId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}): Promise<ProgrammeAction> {
  const { data, error } = await supabase
    .from(PROGRAMME_ACTIONS)
    .insert({
      programme_id: params.programmeId,
      title: params.title,
      action_type: params.actionType ?? 'other',
      status: params.status ?? 'draft',
      executor_profile_id: params.executorProfileId ?? null,
      due_date: params.dueDate ?? null,
      notes: params.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapProgrammeAction(data);
}

export async function updateProgrammeAction(
  id: string,
  updates: Partial<
    Pick<
      ProgrammeAction,
      | 'title'
      | 'actionType'
      | 'status'
      | 'executorProfileId'
      | 'validatedByProfileId'
      | 'validatedAt'
      | 'dueDate'
      | 'notes'
    >
  >,
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.actionType !== undefined) row.action_type = updates.actionType;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.executorProfileId !== undefined) row.executor_profile_id = updates.executorProfileId;
  if (updates.validatedByProfileId !== undefined) row.validated_by_profile_id = updates.validatedByProfileId;
  if (updates.validatedAt !== undefined) row.validated_at = updates.validatedAt;
  if (updates.dueDate !== undefined) row.due_date = updates.dueDate;
  if (updates.notes !== undefined) row.notes = updates.notes;
  const { error } = await supabase.from(PROGRAMME_ACTIONS).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteProgrammeAction(id: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMME_ACTIONS).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Collecte (lignes type tableur) ----------
export async function listProgrammeDataRows(programmeId: string, section?: string): Promise<ProgrammeDataRow[]> {
  try {
    let q = supabase.from(PROGRAMME_DATA_ROWS).select('*').eq('programme_id', programmeId).order('updated_at', { ascending: false });
    if (section) q = q.eq('section', section);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapProgrammeDataRow);
  } catch {
    return [];
  }
}

export async function createProgrammeDataRow(params: {
  programmeId: string;
  section?: string;
  rowData?: Record<string, string>;
}): Promise<ProgrammeDataRow> {
  const { data, error } = await supabase
    .from(PROGRAMME_DATA_ROWS)
    .insert({
      programme_id: params.programmeId,
      section: params.section ?? 'default',
      row_data: params.rowData ?? {},
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapProgrammeDataRow(data);
}

export async function updateProgrammeDataRow(id: string, updates: Partial<Pick<ProgrammeDataRow, 'section' | 'rowData'>>): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.section !== undefined) row.section = updates.section;
  if (updates.rowData !== undefined) row.row_data = updates.rowData;
  const { error } = await supabase.from(PROGRAMME_DATA_ROWS).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteProgrammeDataRow(id: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMME_DATA_ROWS).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Programme budget lines ----------
export async function listProgrammeBudgetLines(programmeId: string): Promise<ProgrammeBudgetLine[]> {
  try {
    const { data, error } = await supabase
      .from(PROGRAMME_BUDGET_LINES)
      .select('*')
      .eq('programme_id', programmeId)
      .order('label');
    if (error) return [];
    return (data || []).map(mapProgrammeBudgetLine);
  } catch {
    return [];
  }
}

export async function createProgrammeBudgetLine(params: {
  programmeId: string;
  label: string;
  plannedAmount: number;
  spentAmount?: number;
  currency?: CurrencyCode;
}): Promise<ProgrammeBudgetLine> {
  const { data, error } = await supabase
    .from(PROGRAMME_BUDGET_LINES)
    .insert({
      programme_id: params.programmeId,
      label: params.label,
      planned_amount: params.plannedAmount,
      spent_amount: params.spentAmount ?? 0,
      currency: params.currency ?? 'XOF',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapProgrammeBudgetLine(data);
}

export async function updateProgrammeBudgetLine(id: string, updates: Partial<Pick<ProgrammeBudgetLine, 'label' | 'plannedAmount' | 'spentAmount' | 'currency'>>): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.label !== undefined) row.label = updates.label;
  if (updates.plannedAmount !== undefined) row.planned_amount = updates.plannedAmount;
  if (updates.spentAmount !== undefined) row.spent_amount = updates.spentAmount;
  if (updates.currency !== undefined) row.currency = updates.currency;
  const { error } = await supabase.from(PROGRAMME_BUDGET_LINES).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteProgrammeBudgetLine(id: string): Promise<void> {
  const { error } = await supabase.from(PROGRAMME_BUDGET_LINES).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Bénéficiaires ----------
export async function listBeneficiaires(params: {
  organizationId?: string | null;
  programmeId?: string | null;
  projectId?: string | null;
}): Promise<Beneficiaire[]> {
  try {
    let query = supabase.from(BENEFICIAIRES).select('*').order('created_at', { ascending: false });
    if (params.organizationId) query = query.eq('organization_id', params.organizationId);
    if (params.programmeId) query = query.eq('programme_id', params.programmeId);
    if (params.projectId) query = query.eq('project_id', params.projectId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapBeneficiaire);
  } catch {
    return [];
  }
}

export async function getBeneficiaire(id: string): Promise<Beneficiaire | null> {
  try {
    const { data, error } = await supabase.from(BENEFICIAIRES).select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapBeneficiaire(data);
  } catch {
    return null;
  }
}

export async function createBeneficiaire(params: {
  organizationId?: string | null;
  programmeId?: string | null;
  projectId?: string | null;
  theme?: string | null;
  target?: string | null;
  gender?: string | null;
  sector?: string | null;
  country?: string | null;
  region?: string | null;
  contact?: string | null;
  age?: string | null;
  education?: string | null;
  profession?: string | null;
}): Promise<Beneficiaire> {
  const { data, error } = await supabase
    .from(BENEFICIAIRES)
    .insert({
      organization_id: params.organizationId ?? null,
      programme_id: params.programmeId ?? null,
      project_id: params.projectId ?? null,
      theme: params.theme ?? null,
      target: params.target ?? null,
      gender: params.gender ?? null,
      sector: params.sector ?? null,
      country: params.country ?? null,
      region: params.region ?? null,
      contact: params.contact ?? null,
      age: params.age ?? null,
      education: params.education ?? null,
      profession: params.profession ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapBeneficiaire(data);
}

export async function updateBeneficiaire(id: string, updates: Partial<Omit<Beneficiaire, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  const keys: (keyof Beneficiaire)[] = [
    'organizationId', 'programmeId', 'projectId', 'theme', 'target', 'gender',
    'sector', 'country', 'region', 'contact', 'age', 'education', 'profession',
  ];
  const snake: Record<string, string> = {
    organizationId: 'organization_id', programmeId: 'programme_id', projectId: 'project_id',
    theme: 'theme', target: 'target', gender: 'gender', sector: 'sector', country: 'country',
    region: 'region', contact: 'contact', age: 'age', education: 'education', profession: 'profession',
  };
  keys.forEach((k) => {
    if (updates[k] !== undefined) row[snake[k] || k] = updates[k];
  });
  const { error } = await supabase.from(BENEFICIAIRES).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteBeneficiaire(id: string): Promise<void> {
  const { error } = await supabase.from(BENEFICIAIRES).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Auditeurs externes (lecture seule sur un programme) ----------
export async function isUserAuditorForProgramme(programmeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(PROGRAMME_AUDITORS)
    .select('id')
    .eq('programme_id', programmeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

// ---------- Demandes de dépense (circuit dépense) ----------
function mapExpenseRequest(r: any): ExpenseRequest {
  return {
    id: r.id,
    programmeId: r.programme_id ?? null,
    organizationId: r.organization_id ?? null,
    title: r.title,
    amount: Number(r.amount),
    currency: r.currency ?? 'XOF',
    status: (r.status as ExpenseRequestStatus) ?? 'draft',
    requestedById: r.requested_by_id ?? null,
    validatedById: r.validated_by_id ?? null,
    rejectedReason: r.rejected_reason ?? null,
    justificationComment: r.justification_comment ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listExpenseRequests(programmeId?: string | null): Promise<ExpenseRequest[]> {
  try {
    let query = supabase.from(EXPENSE_REQUESTS).select('*').order('created_at', { ascending: false });
    if (programmeId) query = query.eq('programme_id', programmeId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapExpenseRequest);
  } catch {
    return [];
  }
}

export async function createExpenseRequest(params: {
  programmeId?: string | null;
  organizationId?: string | null;
  title: string;
  amount: number;
  currency?: string;
  requestedById?: string | null;
}): Promise<ExpenseRequest> {
  const { data, error } = await supabase
    .from(EXPENSE_REQUESTS)
    .insert({
      programme_id: params.programmeId ?? null,
      organization_id: params.organizationId ?? null,
      title: params.title,
      amount: params.amount,
      currency: params.currency ?? 'XOF',
      status: 'draft',
      requested_by_id: params.requestedById ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapExpenseRequest(data);
}

export async function updateExpenseRequest(
  id: string,
  updates: Partial<Pick<ExpenseRequest, 'status' | 'validatedById' | 'rejectedReason' | 'justificationComment'>>
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.validatedById !== undefined) row.validated_by_id = updates.validatedById;
  if (updates.rejectedReason !== undefined) row.rejected_reason = updates.rejectedReason;
  if (updates.justificationComment !== undefined) row.justification_comment = updates.justificationComment;
  const { error } = await supabase.from(EXPENSE_REQUESTS).update(row).eq('id', id);
  if (error) throw error;
}
