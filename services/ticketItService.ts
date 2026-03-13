import { supabase } from './supabaseService';
import { TicketIT, TicketITStatus } from '../types';

const TABLE = 'it_tickets';

function mapRow(r: any): TicketIT {
  return {
    id: r.id,
    organizationId: r.organization_id ?? null,
    title: r.title,
    description: r.description ?? '',
    status: r.status as TicketITStatus,
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
    if (error) return [];
    return (data || []).map(mapRow);
  } catch {
    return [];
  }
}

export async function getTicketIT(id: string): Promise<TicketIT | null> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
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
      status: 'draft',
      created_by_id: params.createdById,
      created_by_name: params.createdByName ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateTicketIT(id: string, updates: {
  title?: string;
  description?: string;
  priority?: TicketIT['priority'];
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
  if (error) throw error;
}
