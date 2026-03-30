import { supabase } from './supabaseService';
import { TicketIT, TicketITStatus, TicketITVisibilityScope } from '../types';

const TABLE = 'it_tickets';
const LOCAL_KEY = 'coya_ticket_it_fallback_v1';

function isMissingTableError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    details.includes('does not exist') ||
    hint.includes('does not exist')
  );
}

function makeId(): string {
  try {
    const anyCrypto = (globalThis as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `ticket_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readLocal(): TicketIT[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: TicketIT[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    }
  } catch {
    /* ignore */
  }
}

function mapRow(r: any): TicketIT {
  return {
    id: r.id,
    organizationId: r.organization_id ?? null,
    title: r.title,
    description: r.description ?? '',
    status: r.status as TicketITStatus,
    visibilityScope: (r.visibility_scope as TicketITVisibilityScope) ?? 'self',
    broadcastOnCreate: r.broadcast_on_create ?? false,
    priority: r.priority ?? 'medium',
    issueTypeId: r.issue_type_id ?? null,
    issueTypeName: undefined,
    createdById: r.created_by_id,
    createdByName: r.created_by_name ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    validatedById: r.validated_by_id ?? null,
    validatedByName: r.validated_by_name ?? null,
    validatedAt: r.validated_at ?? null,
    rejectionReason: r.rejection_reason ?? null,
    assignedToId: r.assigned_to_id ?? null,
    assignedToName: r.assigned_to_name ?? null,
    sentToItAt: r.sent_to_it_at ?? null,
    resolvedAt: r.resolved_at ?? null,
    resolutionNotes: r.resolution_notes ?? null,
  };
}

export async function listTicketsIT(params: {
  organizationId?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
  status?: TicketITStatus | null;
}): Promise<TicketIT[]> {
  try {
    let query = supabase.from(TABLE).select('*, referential_values(name)').order('created_at', { ascending: false });
    if (params.organizationId) query = query.eq('organization_id', params.organizationId);
    if (params.createdById) query = query.eq('created_by_id', params.createdById);
    if (params.assignedToId) query = query.eq('assigned_to_id', params.assignedToId);
    if (params.status) query = query.eq('status', params.status);
    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        let local = readLocal();
        if (params.organizationId) local = local.filter((t) => !t.organizationId || t.organizationId === params.organizationId);
        if (params.createdById) local = local.filter((t) => String(t.createdById) === String(params.createdById));
        if (params.assignedToId) local = local.filter((t) => String(t.assignedToId) === String(params.assignedToId));
        if (params.status) local = local.filter((t) => t.status === params.status);
        return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return [];
    }
    return (data || []).map(mapRow);
  } catch {
    return [];
  }
}

export async function getTicketIT(id: string): Promise<TicketIT | null> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isMissingTableError(error)) return readLocal().find((t) => t.id === id) ?? null;
      return null;
    }
    if (!data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export async function createTicketIT(params: {
  organizationId?: string | null;
  title: string;
  description: string;
  priority?: TicketIT['priority'];
  issueTypeId?: string | null;
  visibilityScope?: TicketITVisibilityScope;
  broadcastOnCreate?: boolean;
  createdById: string;
  createdByName?: string;
}): Promise<TicketIT> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      organization_id: params.organizationId ?? null,
      title: params.title,
      description: params.description,
      priority: params.priority ?? 'medium',
      issue_type_id: params.issueTypeId ?? null,
      visibility_scope: params.visibilityScope ?? 'self',
      broadcast_on_create: params.broadcastOnCreate ?? false,
      status: 'draft',
      created_by_id: params.createdById,
      created_by_name: params.createdByName ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    if (isMissingTableError(error)) {
      const now = new Date().toISOString();
      const localTicket: TicketIT = {
        id: makeId(),
        organizationId: params.organizationId ?? null,
        title: params.title,
        description: params.description,
        status: 'draft',
        priority: params.priority ?? 'medium',
        issueTypeId: params.issueTypeId ?? null,
        issueTypeName: null,
        visibilityScope: params.visibilityScope ?? 'self',
        broadcastOnCreate: params.broadcastOnCreate ?? false,
        createdById: params.createdById,
        createdByName: params.createdByName,
        createdAt: now,
        updatedAt: now,
      };
      const all = readLocal();
      all.unshift(localTicket);
      writeLocal(all);
      return localTicket;
    }
    throw error;
  }
  return mapRow(data);
}

export async function updateTicketIT(id: string, updates: {
  title?: string;
  description?: string;
  priority?: TicketIT['priority'];
  issueTypeId?: string | null;
  visibilityScope?: TicketITVisibilityScope;
  broadcastOnCreate?: boolean;
  status?: TicketITStatus;
  validatedById?: string | null;
  validatedByName?: string | null;
  validatedAt?: string | null;
  rejectionReason?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  sentToItAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.priority !== undefined) row.priority = updates.priority;
  if (updates.issueTypeId !== undefined) row.issue_type_id = updates.issueTypeId;
  if (updates.visibilityScope !== undefined) row.visibility_scope = updates.visibilityScope;
  if (updates.broadcastOnCreate !== undefined) row.broadcast_on_create = updates.broadcastOnCreate;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.validatedById !== undefined) row.validated_by_id = updates.validatedById;
  if (updates.validatedByName !== undefined) row.validated_by_name = updates.validatedByName;
  if (updates.validatedAt !== undefined) row.validated_at = updates.validatedAt;
  if (updates.rejectionReason !== undefined) row.rejection_reason = updates.rejectionReason;
  if (updates.assignedToId !== undefined) row.assigned_to_id = updates.assignedToId;
  if (updates.assignedToName !== undefined) row.assigned_to_name = updates.assignedToName;
  if (updates.sentToItAt !== undefined) row.sent_to_it_at = updates.sentToItAt;
  if (updates.resolvedAt !== undefined) row.resolved_at = updates.resolvedAt;
  if (updates.resolutionNotes !== undefined) row.resolution_notes = updates.resolutionNotes;
  const { error } = await supabase.from(TABLE).update(row).eq('id', id);
  if (error) {
    if (isMissingTableError(error)) {
      const all = readLocal();
      const idx = all.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const prev = all[idx];
      all[idx] = {
        ...prev,
        title: updates.title !== undefined ? updates.title : prev.title,
        description: updates.description !== undefined ? updates.description : prev.description,
        priority: updates.priority !== undefined ? updates.priority : prev.priority,
        issueTypeId: updates.issueTypeId !== undefined ? updates.issueTypeId : prev.issueTypeId,
        visibilityScope: updates.visibilityScope !== undefined ? updates.visibilityScope : prev.visibilityScope,
        broadcastOnCreate: updates.broadcastOnCreate !== undefined ? updates.broadcastOnCreate : prev.broadcastOnCreate,
        status: updates.status !== undefined ? updates.status : prev.status,
        validatedById: updates.validatedById !== undefined ? updates.validatedById : prev.validatedById,
        validatedByName: updates.validatedByName !== undefined ? updates.validatedByName : prev.validatedByName,
        validatedAt: updates.validatedAt !== undefined ? updates.validatedAt : prev.validatedAt,
        rejectionReason: updates.rejectionReason !== undefined ? updates.rejectionReason : prev.rejectionReason,
        assignedToId: updates.assignedToId !== undefined ? updates.assignedToId : prev.assignedToId,
        assignedToName: updates.assignedToName !== undefined ? updates.assignedToName : prev.assignedToName,
        sentToItAt: updates.sentToItAt !== undefined ? updates.sentToItAt : prev.sentToItAt,
        resolvedAt: updates.resolvedAt !== undefined ? updates.resolvedAt : prev.resolvedAt,
        resolutionNotes: updates.resolutionNotes !== undefined ? updates.resolutionNotes : prev.resolutionNotes,
        updatedAt: new Date().toISOString(),
      };
      writeLocal(all);
      return;
    }
    throw error;
  }
}
