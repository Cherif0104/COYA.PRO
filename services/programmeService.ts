import { supabase } from './supabaseService';
import { DataService } from './dataService';
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
  ProjectActivity,
  BudgetCascadeLine,
  BudgetCascadeScope,
  BudgetCascadeWorkflowStatus,
  BudgetRollupByPostRow,
  BudgetRollupByScopeRow,
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
const PROGRAMME_ACTION_ASSIGNEES = 'programme_action_assignees';
const PROGRAMME_ACTION_PROOFS_BUCKET = 'programme-action-proofs';
const PROGRAMME_DATA_ROWS = 'programme_data_rows';
const PROJECT_ACTIVITIES = 'project_activities';
const BUDGET_CASCADE_LINES = 'budget_cascade_lines';

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

/** PostgREST / schéma sans colonne contact sur bailleurs (FR ou EN) */
function isBailleurContactColumnError(err: unknown): boolean {
  const e = err as any;
  const msg = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.hint ?? ''}`;
  if (e?.code === 'PGRST204' && /contact/i.test(msg) && /bailleurs/i.test(msg)) return true;
  return (
    /contact/i.test(msg) &&
    (/bailleurs/i.test(msg) || /PGRST/i.test(msg)) &&
    (/cache|schéma|schema|column|colonne|find|trouv|Could not find/i.test(msg))
  );
}

/** programme_actions : base sans migration Phase actions (colonnes period_*, preuves, statuts assigned / not_realized). */
function isProgrammeActionsExtendedSchemaError(err: unknown): boolean {
  const e = err as any;
  const msg = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.hint ?? ''}`;
  if (e?.code === 'PGRST204' && /programme_actions/i.test(msg)) return true;
  if (/Could not find the '[^']+' column of 'programme_actions'/i.test(msg)) return true;
  if (/Impossible de trouver la[^']*colonne[^']*programme_actions/i.test(msg)) return true;
  if (/column.*programme_actions|colonne.*programme_actions/i.test(msg)) return true;
  return false;
}

function programmeActionStatusForLegacyInsert(status: ProgrammeActionStatus | undefined, hasAssignees: boolean): ProgrammeActionStatus {
  if (status === 'assigned') return hasAssignees ? 'validated' : 'draft';
  if (status === 'not_realized') return 'cancelled';
  return status ?? 'draft';
}

function programmeActionStatusForLegacyUpdate(status: ProgrammeActionStatus): ProgrammeActionStatus {
  if (status === 'assigned') return 'validated';
  if (status === 'not_realized') return 'cancelled';
  return status;
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
    crmContactId: r.crm_contact_id ?? null,
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
const BAILLEURS_COLS_BASE =
  'id, organization_id, name, code, description, created_at, updated_at';
const BAILLEURS_COLS_WITH_CONTACT = `${BAILLEURS_COLS_BASE}, contact`;

export async function listBailleurs(organizationId?: string | null): Promise<Bailleur[]> {
  try {
    const run = (cols: string) => {
      let q = supabase.from(BAILLEURS).select(cols).order('name');
      if (organizationId) q = q.eq('organization_id', organizationId);
      return q;
    };
    let { data, error } = await run(BAILLEURS_COLS_WITH_CONTACT);
    if (error) {
      ({ data, error } = await run(BAILLEURS_COLS_BASE));
    }
    if (error) {
      ({ data, error } = await run('*'));
    }
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
  const updatedAt = new Date().toISOString();
  const rowWithContact = {
    organization_id: params.organizationId ?? null,
    name: params.name,
    code: params.code ?? null,
    description: params.description ?? null,
    contact: params.contact ?? null,
    updated_at: updatedAt,
  };
  let { data, error } = await supabase.from(BAILLEURS).insert(rowWithContact).select().single();

  if (error && isBailleurContactColumnError(error)) {
    const contactLine =
      params.contact != null && String(params.contact).trim() !== ''
        ? `Contact : ${String(params.contact).trim()}`
        : '';
    const mergedDesc = [params.description, contactLine].filter((x) => x != null && String(x).trim() !== '').join('\n\n');
    const rowFallback = {
      organization_id: params.organizationId ?? null,
      name: params.name,
      code: params.code ?? null,
      description: mergedDesc || null,
      updated_at: updatedAt,
    };
    ({ data, error } = await supabase.from(BAILLEURS).insert(rowFallback).select().single());
  }

  if (error) throw error;
  return mapBailleur(data);
}

export async function updateBailleur(id: string, updates: Partial<Pick<Bailleur, 'name' | 'code' | 'description' | 'contact'>>): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.code !== undefined) row.code = updates.code;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.contact !== undefined) row.contact = updates.contact;
  let { error } = await supabase.from(BAILLEURS).update(row).eq('id', id);

  if (error && isBailleurContactColumnError(error) && updates.contact !== undefined) {
    const current = await getBailleur(id);
    const contactLine =
      updates.contact != null && String(updates.contact).trim() !== ''
        ? `Contact : ${String(updates.contact).trim()}`
        : '';
    const baseDesc = updates.description !== undefined ? updates.description : current?.description;
    const mergedDesc = [baseDesc, contactLine].filter((x) => x != null && String(x).trim() !== '').join('\n\n');
    const fallback: any = {
      updated_at: new Date().toISOString(),
      name: updates.name !== undefined ? updates.name : undefined,
      code: updates.code !== undefined ? updates.code : undefined,
      description: mergedDesc || null,
    };
    Object.keys(fallback).forEach((k) => fallback[k] === undefined && delete fallback[k]);
    ({ error } = await supabase.from(BAILLEURS).update(fallback).eq('id', id));
  }

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
  const rawAssignees = r.programme_action_assignees;
  const assigneeProfileIds = Array.isArray(rawAssignees)
    ? rawAssignees.map((x: any) => String(x.profile_id)).filter(Boolean)
    : [];
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
    periodStart: r.period_start ?? null,
    periodEnd: r.period_end ?? null,
    proofUrl: r.proof_url ?? null,
    proofStoragePath: r.proof_storage_path ?? null,
    completedByProfileId: r.completed_by_profile_id ?? null,
    completedAt: r.completed_at ?? null,
    assigneeProfileIds,
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
/** Passe en « non réalisé » les actions actives dont la date de fin (ou échéance) est dépassée. */
export async function applyProgrammeActionAutoClose(programmeId: string): Promise<void> {
  try {
    let { data, error } = await supabase
      .from(PROGRAMME_ACTIONS)
      .select('id, status, period_end, due_date')
      .eq('programme_id', programmeId);
    if (error) {
      ({ data, error } = await supabase
        .from(PROGRAMME_ACTIONS)
        .select('id, status, due_date')
        .eq('programme_id', programmeId));
    }
    if (error) {
      ({ data, error } = await supabase.from(PROGRAMME_ACTIONS).select('id, status').eq('programme_id', programmeId));
    }
    if (error || !data?.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const closable = new Set(['assigned', 'validated', 'pending_validation']);
    const nowIso = new Date().toISOString();
    for (const row of data as any[]) {
      if (!closable.has(row.status)) continue;
      const endRaw = row.period_end ?? row.due_date;
      if (!endRaw) continue;
      const endStr = String(endRaw).slice(0, 10);
      if (today > endStr) {
        let { error: uErr } = await supabase
          .from(PROGRAMME_ACTIONS)
          .update({ status: 'not_realized', updated_at: nowIso })
          .eq('id', row.id);
        if (uErr) {
          ({ error: uErr } = await supabase
            .from(PROGRAMME_ACTIONS)
            .update({ status: 'cancelled', updated_at: nowIso })
            .eq('id', row.id));
        }
        if (uErr) {
          await supabase.from(PROGRAMME_ACTIONS).update({ status: 'cancelled' }).eq('id', row.id);
        }
      }
    }
  } catch {
    /* schéma minimal ou RLS */
  }
}

async function replaceProgrammeActionAssignees(actionId: string, profileIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from(PROGRAMME_ACTION_ASSIGNEES).delete().eq('action_id', actionId);
  if (delErr) throw delErr;
  const uniq = [...new Set(profileIds.map((x) => String(x).trim()).filter(Boolean))];
  if (!uniq.length) return;
  const { error: insErr } = await supabase.from(PROGRAMME_ACTION_ASSIGNEES).insert(
    uniq.map((profile_id) => ({ action_id: actionId, profile_id })),
  );
  if (insErr) throw insErr;
}

/** Remplace les assignés (table `programme_action_assignees`) et aligne `executor_profile_id` sur le premier. Échoue si la migration n’est pas appliquée. */
export async function setProgrammeActionAssignees(actionId: string, profileIds: string[]): Promise<void> {
  const uniq = [...new Set(profileIds.map((x) => String(x).trim()).filter(Boolean))];
  await replaceProgrammeActionAssignees(actionId, uniq);
  await updateProgrammeAction(actionId, { executorProfileId: uniq[0] ?? null });
}

export async function uploadProgrammeActionProofFile(
  organizationId: string,
  actionId: string,
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${organizationId}/${actionId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(PROGRAMME_ACTION_PROOFS_BUCKET).upload(storagePath, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(PROGRAMME_ACTION_PROOFS_BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

export function getProgrammeActionProofPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(PROGRAMME_ACTION_PROOFS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function listProgrammeActions(programmeId: string): Promise<ProgrammeAction[]> {
  try {
    const mapRows = (rows: any[]) =>
      (rows || []).map((r) =>
        mapProgrammeAction({ ...r, programme_action_assignees: r.programme_action_assignees ?? [] }),
      );

    const attempts: Array<() => Promise<{ data: any; error: any }>> = [
      () =>
        supabase
          .from(PROGRAMME_ACTIONS)
          .select('*, programme_action_assignees(profile_id)')
          .eq('programme_id', programmeId)
          .order('updated_at', { ascending: false }),
      () =>
        supabase
          .from(PROGRAMME_ACTIONS)
          .select('*, programme_action_assignees(profile_id)')
          .eq('programme_id', programmeId)
          .order('created_at', { ascending: false }),
      () =>
        supabase
          .from(PROGRAMME_ACTIONS)
          .select('*, programme_action_assignees(profile_id)')
          .eq('programme_id', programmeId),
      () =>
        supabase
          .from(PROGRAMME_ACTIONS)
          .select('*')
          .eq('programme_id', programmeId)
          .order('updated_at', { ascending: false }),
      () =>
        supabase
          .from(PROGRAMME_ACTIONS)
          .select('*')
          .eq('programme_id', programmeId)
          .order('created_at', { ascending: false }),
      () =>
        supabase
          .from(PROGRAMME_ACTIONS)
          .select('*')
          .eq('programme_id', programmeId)
          .order('due_date', { ascending: true, nullsFirst: false }),
      () => supabase.from(PROGRAMME_ACTIONS).select('*').eq('programme_id', programmeId),
    ];

    for (const run of attempts) {
      const { data, error } = await run();
      if (!error && data) return mapRows(data);
    }
    return [];
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
  periodStart?: string | null;
  periodEnd?: string | null;
  assigneeProfileIds?: string[];
  notes?: string | null;
}): Promise<ProgrammeAction> {
  const assigneeProfileIds = params.assigneeProfileIds?.length
    ? params.assigneeProfileIds
    : params.executorProfileId
      ? [String(params.executorProfileId)]
      : [];
  const periodEnd = params.periodEnd ?? params.dueDate ?? null;
  const dueDate = params.dueDate ?? periodEnd;
  const updatedAt = new Date().toISOString();
  const modernRow = {
    programme_id: params.programmeId,
    title: params.title,
    action_type: params.actionType ?? 'other',
    status: params.status ?? 'draft',
    executor_profile_id: params.executorProfileId ?? assigneeProfileIds[0] ?? null,
    due_date: dueDate,
    period_start: params.periodStart ?? null,
    period_end: periodEnd,
    notes: params.notes ?? null,
    updated_at: updatedAt,
  };
  let { data, error } = await supabase.from(PROGRAMME_ACTIONS).insert(modernRow).select().single();
  if (error) {
    const legacyStatus = programmeActionStatusForLegacyInsert(params.status, assigneeProfileIds.length > 0);
    const legacyRow = {
      programme_id: params.programmeId,
      title: params.title,
      action_type: params.actionType ?? 'other',
      status: legacyStatus,
      executor_profile_id: params.executorProfileId ?? assigneeProfileIds[0] ?? null,
      due_date: dueDate,
      notes: params.notes ?? null,
      updated_at: updatedAt,
    };
    ({ data, error } = await supabase.from(PROGRAMME_ACTIONS).insert(legacyRow).select().single());
  }
  if (error) throw error;
  if (assigneeProfileIds.length) {
    try {
      await replaceProgrammeActionAssignees(data.id, assigneeProfileIds);
    } catch {
      /* table programme_action_assignees absente tant que migration non appliquée */
    }
  }
  const mapped = mapProgrammeAction(data);
  mapped.assigneeProfileIds = assigneeProfileIds;
  return mapped;
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
      | 'periodStart'
      | 'periodEnd'
      | 'proofUrl'
      | 'proofStoragePath'
      | 'completedByProfileId'
      | 'completedAt'
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
  if (updates.periodStart !== undefined) row.period_start = updates.periodStart;
  if (updates.periodEnd !== undefined) row.period_end = updates.periodEnd;
  if (updates.proofUrl !== undefined) row.proof_url = updates.proofUrl;
  if (updates.proofStoragePath !== undefined) row.proof_storage_path = updates.proofStoragePath;
  if (updates.completedByProfileId !== undefined) row.completed_by_profile_id = updates.completedByProfileId;
  if (updates.completedAt !== undefined) row.completed_at = updates.completedAt;
  if (updates.notes !== undefined) row.notes = updates.notes;
  let { error } = await supabase.from(PROGRAMME_ACTIONS).update(row).eq('id', id);
  if (error && isProgrammeActionsExtendedSchemaError(error)) {
    const legacy: any = { updated_at: row.updated_at };
    if (updates.title !== undefined) legacy.title = updates.title;
    if (updates.actionType !== undefined) legacy.action_type = updates.actionType;
    if (updates.status !== undefined) legacy.status = programmeActionStatusForLegacyUpdate(updates.status);
    if (updates.executorProfileId !== undefined) legacy.executor_profile_id = updates.executorProfileId;
    if (updates.validatedByProfileId !== undefined) legacy.validated_by_profile_id = updates.validatedByProfileId;
    if (updates.validatedAt !== undefined) legacy.validated_at = updates.validatedAt;
    if (updates.dueDate !== undefined) legacy.due_date = updates.dueDate;
    if (updates.notes !== undefined) legacy.notes = updates.notes;
    ({ error } = await supabase.from(PROGRAMME_ACTIONS).update(legacy).eq('id', id));
  }
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
    'organizationId', 'programmeId', 'projectId', 'crmContactId', 'theme', 'target', 'gender',
    'sector', 'country', 'region', 'contact', 'age', 'education', 'profession',
  ];
  const snake: Record<string, string> = {
    organizationId: 'organization_id', programmeId: 'programme_id', projectId: 'project_id', crmContactId: 'crm_contact_id',
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

// ---------- Activités de terrain (projet) ----------
function mapProjectActivity(r: any): ProjectActivity {
  return {
    id: r.id,
    organizationId: r.organization_id,
    programmeId: r.programme_id ?? null,
    projectId: r.project_id,
    title: r.title,
    description: r.description ?? null,
    location: r.location ?? null,
    startDate: r.start_date ?? null,
    endDate: r.end_date ?? null,
    status: (r.status as ProjectActivity['status']) || 'planned',
    sequence: r.sequence ?? 0,
    melTargetLabel: r.mel_target_label ?? null,
    melTargetValue: r.mel_target_value != null ? Number(r.mel_target_value) : null,
    melResultValue: r.mel_result_value != null ? Number(r.mel_result_value) : null,
    melUnit: r.mel_unit ?? null,
    melNotes: r.mel_notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapBudgetCascadeLine(r: any): BudgetCascadeLine {
  return {
    id: r.id,
    organizationId: r.organization_id,
    scopeLevel: r.scope_level as BudgetCascadeScope,
    programmeId: r.programme_id,
    projectId: r.project_id ?? null,
    activityId: r.activity_id ?? null,
    projectTaskId: r.project_task_id ?? null,
    parentLineId: r.parent_line_id ?? null,
    expensePostCode: r.expense_post_code ?? null,
    label: r.label,
    plannedAmount: Number(r.planned_amount),
    actualAmount: Number(r.actual_amount ?? 0),
    currency: r.currency ?? 'XOF',
    workflowStatus: (r.workflow_status as BudgetCascadeWorkflowStatus) || 'draft',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listProjectActivities(projectId: string): Promise<ProjectActivity[]> {
  try {
    const { data, error } = await supabase
      .from(PROJECT_ACTIVITIES)
      .select('*')
      .eq('project_id', projectId)
      .order('sequence', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map(mapProjectActivity);
  } catch {
    return [];
  }
}

export async function createProjectActivity(params: {
  organizationId: string;
  programmeId?: string | null;
  projectId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: ProjectActivity['status'];
  sequence?: number;
  melTargetLabel?: string | null;
  melTargetValue?: number | null;
  melResultValue?: number | null;
  melUnit?: string | null;
  melNotes?: string | null;
}): Promise<ProjectActivity> {
  const { data, error } = await supabase
    .from(PROJECT_ACTIVITIES)
    .insert({
      organization_id: params.organizationId,
      programme_id: params.programmeId ?? null,
      project_id: params.projectId,
      title: params.title,
      description: params.description ?? null,
      location: params.location ?? null,
      start_date: params.startDate ?? null,
      end_date: params.endDate ?? null,
      status: params.status ?? 'planned',
      sequence: params.sequence ?? 0,
      mel_target_label: params.melTargetLabel ?? null,
      mel_target_value: params.melTargetValue ?? null,
      mel_result_value: params.melResultValue ?? null,
      mel_unit: params.melUnit ?? null,
      mel_notes: params.melNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapProjectActivity(data);
}

export async function updateProjectActivity(
  id: string,
  updates: Partial<
    Pick<
      ProjectActivity,
      | 'title'
      | 'description'
      | 'location'
      | 'startDate'
      | 'endDate'
      | 'status'
      | 'sequence'
      | 'programmeId'
      | 'melTargetLabel'
      | 'melTargetValue'
      | 'melResultValue'
      | 'melUnit'
      | 'melNotes'
    >
  >,
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.location !== undefined) row.location = updates.location;
  if (updates.startDate !== undefined) row.start_date = updates.startDate;
  if (updates.endDate !== undefined) row.end_date = updates.endDate;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.sequence !== undefined) row.sequence = updates.sequence;
  if (updates.programmeId !== undefined) row.programme_id = updates.programmeId;
  if (updates.melTargetLabel !== undefined) row.mel_target_label = updates.melTargetLabel;
  if (updates.melTargetValue !== undefined) row.mel_target_value = updates.melTargetValue;
  if (updates.melResultValue !== undefined) row.mel_result_value = updates.melResultValue;
  if (updates.melUnit !== undefined) row.mel_unit = updates.melUnit;
  if (updates.melNotes !== undefined) row.mel_notes = updates.melNotes;
  const { error } = await supabase.from(PROJECT_ACTIVITIES).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteProjectActivity(id: string): Promise<void> {
  const { error } = await supabase.from(PROJECT_ACTIVITIES).delete().eq('id', id);
  if (error) throw error;
}

// ---------- Budget cascade (prévisionnel / réel + workflow) ----------
export async function listBudgetCascadeLines(programmeId: string): Promise<BudgetCascadeLine[]> {
  try {
    const { data, error } = await supabase
      .from(BUDGET_CASCADE_LINES)
      .select('*')
      .eq('programme_id', programmeId)
      .order('scope_level')
      .order('label');
    if (error) return [];
    return (data || []).map(mapBudgetCascadeLine);
  } catch {
    return [];
  }
}

export async function createBudgetCascadeLine(params: {
  organizationId: string;
  scopeLevel: BudgetCascadeScope;
  programmeId: string;
  projectId?: string | null;
  activityId?: string | null;
  projectTaskId?: string | null;
  parentLineId?: string | null;
  expensePostCode?: string | null;
  label: string;
  plannedAmount: number;
  actualAmount?: number;
  currency?: string;
  workflowStatus?: BudgetCascadeWorkflowStatus;
}): Promise<BudgetCascadeLine> {
  const { data, error } = await supabase
    .from(BUDGET_CASCADE_LINES)
    .insert({
      organization_id: params.organizationId,
      scope_level: params.scopeLevel,
      programme_id: params.programmeId,
      project_id: params.projectId ?? null,
      activity_id: params.activityId ?? null,
      project_task_id: params.projectTaskId ?? null,
      parent_line_id: params.parentLineId ?? null,
      expense_post_code: params.expensePostCode ?? null,
      label: params.label,
      planned_amount: params.plannedAmount,
      actual_amount: params.actualAmount ?? 0,
      currency: params.currency ?? 'XOF',
      workflow_status: params.workflowStatus ?? 'draft',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapBudgetCascadeLine(data);
}

export async function updateBudgetCascadeLine(
  id: string,
  updates: Partial<
    Pick<
      BudgetCascadeLine,
      'label' | 'plannedAmount' | 'actualAmount' | 'currency' | 'workflowStatus' | 'expensePostCode' | 'parentLineId'
    >
  >,
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.label !== undefined) row.label = updates.label;
  if (updates.plannedAmount !== undefined) row.planned_amount = updates.plannedAmount;
  if (updates.actualAmount !== undefined) row.actual_amount = updates.actualAmount;
  if (updates.currency !== undefined) row.currency = updates.currency;
  if (updates.workflowStatus !== undefined) row.workflow_status = updates.workflowStatus;
  if (updates.expensePostCode !== undefined) row.expense_post_code = updates.expensePostCode;
  if (updates.parentLineId !== undefined) row.parent_line_id = updates.parentLineId;
  const { error } = await supabase.from(BUDGET_CASCADE_LINES).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteBudgetCascadeLine(id: string): Promise<void> {
  const { error } = await supabase.from(BUDGET_CASCADE_LINES).delete().eq('id', id);
  if (error) throw error;
}

/** Crée ou met à jour la fiche CRM à partir d’un bénéficiaire terrain (nécessite colonne crm_contact_id + table contacts). */
export async function syncBeneficiaireToCrm(beneficiaireId: string): Promise<{ contactId: string } | null> {
  const { data: row, error: fetchErr } = await supabase.from(BENEFICIAIRES).select('*').eq('id', beneficiaireId).maybeSingle();
  if (fetchErr || !row) return null;
  const b = mapBeneficiaire(row);
  if (b.crmContactId) return { contactId: String(b.crmContactId) };

  const rawContact = (b.contact || '').trim();
  const emailMatch = rawContact.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const name = [b.theme, b.target].filter(Boolean).join(' — ').trim() || rawContact || 'Participant programme';
  const { data: created, error: createErr } = await DataService.createContact({
    name,
    workEmail: emailMatch ? emailMatch[0] : '',
    company: b.sector || '—',
    status: 'Lead',
    source: 'programme_beneficiaire',
    notes: [
      b.country && `Pays: ${b.country}`,
      b.region && `Région: ${b.region}`,
      b.gender && `Genre: ${b.gender}`,
      b.age && `Âge: ${b.age}`,
      b.education && `Formation: ${b.education}`,
      b.profession && `Profession: ${b.profession}`,
    ]
      .filter(Boolean)
      .join('\n'),
  });
  if (createErr || !created?.id) return null;
  const contactId = String(created.id);
  try {
    await updateBeneficiaire(beneficiaireId, { crmContactId: contactId });
  } catch {
    return { contactId };
  }
  return { contactId };
}

export function isBudgetValidatorRole(role: string | null | undefined): boolean {
  const r = (role || '').toLowerCase();
  return ['super_administrator', 'administrator', 'manager', 'supervisor', 'super_admin', 'admin', 'finance', 'finance_controller'].includes(r);
}

function computeRollupFromLines(lines: BudgetCascadeLine[]): {
  byPost: BudgetRollupByPostRow[];
  byScope: BudgetRollupByScopeRow[];
} {
  const postMap = new Map<string, BudgetRollupByPostRow>();
  const scopeMap = new Map<string, BudgetRollupByScopeRow>();
  for (const l of lines) {
    const postKey = `${l.programmeId}|${(l.expensePostCode || '').trim() || '__sans_poste__'}|${l.currency}`;
    const p = postMap.get(postKey) || {
      programmeId: l.programmeId,
      expensePostCode: (l.expensePostCode || '').trim() || '__sans_poste__',
      currency: l.currency,
      totalPlanned: 0,
      totalActual: 0,
      variancePlannedMinusActual: 0,
      lineCount: 0,
    };
    p.totalPlanned += l.plannedAmount;
    p.totalActual += l.actualAmount;
    p.lineCount += 1;
    p.variancePlannedMinusActual = p.totalPlanned - p.totalActual;
    postMap.set(postKey, p);

    const scKey = `${l.programmeId}|${l.scopeLevel}|${l.currency}`;
    const s = scopeMap.get(scKey) || {
      programmeId: l.programmeId,
      scopeLevel: l.scopeLevel,
      currency: l.currency,
      totalPlanned: 0,
      totalActual: 0,
      variancePlannedMinusActual: 0,
      lineCount: 0,
    };
    s.totalPlanned += l.plannedAmount;
    s.totalActual += l.actualAmount;
    s.lineCount += 1;
    s.variancePlannedMinusActual = s.totalPlanned - s.totalActual;
    scopeMap.set(scKey, s);
  }
  return { byPost: [...postMap.values()], byScope: [...scopeMap.values()] };
}

export async function listBudgetRollupByPost(programmeId: string): Promise<BudgetRollupByPostRow[]> {
  try {
    const { data, error } = await supabase
      .from('v_budget_cascade_rollup_by_post')
      .select('*')
      .eq('programme_id', programmeId);
    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        programmeId: r.programme_id,
        expensePostCode: r.expense_post_code,
        currency: r.currency,
        totalPlanned: Number(r.total_planned),
        totalActual: Number(r.total_actual),
        variancePlannedMinusActual: Number(r.variance_planned_minus_actual),
        lineCount: Number(r.line_count),
      }));
    }
  } catch {
    /* vue absente ou RLS */
  }
  const lines = await listBudgetCascadeLines(programmeId);
  return computeRollupFromLines(lines).byPost;
}

export async function listBudgetRollupByScope(programmeId: string): Promise<BudgetRollupByScopeRow[]> {
  try {
    const { data, error } = await supabase
      .from('v_budget_cascade_rollup_by_scope')
      .select('*')
      .eq('programme_id', programmeId);
    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        programmeId: r.programme_id,
        scopeLevel: r.scope_level as BudgetCascadeScope,
        currency: r.currency,
        totalPlanned: Number(r.total_planned),
        totalActual: Number(r.total_actual),
        variancePlannedMinusActual: Number(r.variance_planned_minus_actual),
        lineCount: Number(r.line_count),
      }));
    }
  } catch {
    /* vue absente */
  }
  const lines = await listBudgetCascadeLines(programmeId);
  return computeRollupFromLines(lines).byScope;
}

export async function findContactIdByEmailNormalized(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const { data, error } = await supabase.from('contacts').select('id').ilike('email', e).limit(1).maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

/** Dédoublonnage téléphone (égalité stricte après trim) — si pas d’email. */
export async function findContactIdByPhoneTrimmed(phone: string): Promise<string | null> {
  const p = phone.trim().replace(/\s+/g, ' ');
  if (p.length < 8) return null;
  const { data, error } = await supabase.from('contacts').select('id').eq('phone', p).limit(1).maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

function pickPayloadField(payload: Record<string, string>, keys: string[]): string {
  const entries = Object.entries(payload);
  const lowerMap = new Map(entries.map(([k, v]) => [k.toLowerCase(), v]));
  for (const key of keys) {
    const v = lowerMap.get(key.toLowerCase());
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

export type UpsertParticipantToCrmMeta = {
  collectionId?: string;
  submissionId?: string;
};

/** Dédoublonnage email puis création contact — pour soumissions collecte. */
export async function upsertParticipantPayloadToCrm(
  payload: Record<string, string>,
  meta?: UpsertParticipantToCrmMeta,
): Promise<{ contactId: string; created: boolean } | null> {
  const email = pickPayloadField(payload, ['email', 'workemail', 'e-mail', 'mail', 'courriel']);
  const phone = pickPayloadField(payload, ['phone', 'telephone', 'tel', 'mobile', 'portable']);
  const whatsapp = pickPayloadField(payload, ['whatsapp']);
  const firstName = pickPayloadField(payload, [
    'first_name',
    'firstname',
    'prenom',
    'given_name',
    'prénom',
  ]);
  const lastName = pickPayloadField(payload, [
    'last_name',
    'lastname',
    'nom',
    'family_name',
    'surname',
  ]);
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    pickPayloadField(payload, ['name', 'fullname', 'prenom_nom', 'participant', 'contact']);

  if (!email && !phone && !displayName) return null;

  if (email) {
    const existingId = await findContactIdByEmailNormalized(email);
    if (existingId) return { contactId: existingId, created: false };
  }
  if (phone) {
    const byPhone = await findContactIdByPhoneTrimmed(phone);
    if (byPhone) return { contactId: byPhone, created: false };
  }

  const skipNote = new Set(
    [
      'email',
      'mail',
      'phone',
      'tel',
      'telephone',
      'whatsapp',
      'first_name',
      'last_name',
      'firstname',
      'lastname',
      'prenom',
      'nom',
    ].map((k) => k.toLowerCase()),
  );
  const noteLines = Object.entries(payload)
    .filter(([k, v]) => v != null && String(v).trim() !== '' && !skipNote.has(k.toLowerCase()))
    .map(([k, v]) => `${k}: ${v}`);

  const company =
    pickPayloadField(payload, ['company', 'organisation', 'org', 'structure', 'sector']) || '—';
  const position = pickPayloadField(payload, ['profession', 'position', 'occupation']);

  const { data: created, error } = await DataService.createContact({
    name: displayName || email || phone || 'Participant collecte',
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    workEmail: email,
    company,
    position: position || undefined,
    status: 'Lead',
    source: 'collecte_submission',
    sourceCollectionId: meta?.collectionId ?? undefined,
    sourceSubmissionId: meta?.submissionId ?? undefined,
    notes: [
      whatsapp && `WhatsApp: ${whatsapp}`,
      ...noteLines,
    ]
      .filter(Boolean)
      .slice(0, 40)
      .join('\n'),
    officePhone: phone || undefined,
    mobilePhone: whatsapp || phone || undefined,
  } as any);
  if (error || !created?.id) return null;
  return { contactId: String(created.id), created: true };
}
