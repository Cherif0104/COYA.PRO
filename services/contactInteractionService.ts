import { supabase } from './supabaseService';
import type { Contact, CrmContactLifecycleStatus } from '../types';

export type ContactInteractionActionType =
  | 'follow_up'
  | 'reminder'
  | 'email_sent'
  | 'phone_call'
  | 'meeting'
  | 'whatsapp'
  | 'visit'
  | 'other';

export type ContactInteractionRow = {
  id: string;
  organization_id: string;
  contact_id: string;
  action_type: ContactInteractionActionType;
  motif: string | null;
  status_snapshot: string | null;
  status_updated_to: string | null;
  detail: string | null;
  follow_up_at: string | null;
  created_by: string | null;
  created_at: string;
};

const UI_STATUS_TO_DB: Record<CrmContactLifecycleStatus, string> = {
  Lead: 'lead',
  Contacted: 'contacted',
  Unreachable: 'unreachable',
  CallbackExpected: 'callback_expected',
  Prospect: 'prospect',
  Customer: 'customer',
};

const DB_STATUS_TO_UI: Record<string, CrmContactLifecycleStatus> = {
  lead: 'Lead',
  contacted: 'Contacted',
  unreachable: 'Unreachable',
  callback_expected: 'CallbackExpected',
  prospect: 'Prospect',
  customer: 'Customer',
};

export function contactStatusUiToDbSnapshot(status: CrmContactLifecycleStatus): string {
  return UI_STATUS_TO_DB[status] ?? 'lead';
}

export function contactStatusDbToUi(db: string | null | undefined): CrmContactLifecycleStatus | null {
  if (!db) return null;
  const k = String(db).trim().toLowerCase();
  return DB_STATUS_TO_UI[k] ?? null;
}

function isUuidContactId(id: string | number): boolean {
  const s = String(id);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function listContactInteractions(contactId: string): Promise<{
  data: ContactInteractionRow[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: new Error(error.message) };
    return { data: (data || []) as ContactInteractionRow[], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function insertContactInteraction(params: {
  organizationId: string;
  contactId: string;
  contact: Contact;
  actionType: ContactInteractionActionType;
  motif: string | null;
  detail: string | null;
  statusUpdatedTo: CrmContactLifecycleStatus | null;
  createdByUserId: string | null;
  followUpAt?: string | null;
}): Promise<{ error: Error | null }> {
  if (!isUuidContactId(params.contactId)) {
    return { error: new Error('CONTACT_NOT_SYNCED') };
  }
  const statusSnapshot = contactStatusUiToDbSnapshot(params.contact.status);
  const statusUpdatedToDb = params.statusUpdatedTo ? contactStatusUiToDbSnapshot(params.statusUpdatedTo) : null;
  try {
    const followIso =
      params.followUpAt && String(params.followUpAt).trim()
        ? new Date(params.followUpAt as string).toISOString()
        : null;
    const { error } = await supabase.from('contact_interactions').insert({
      organization_id: params.organizationId,
      contact_id: params.contactId,
      action_type: params.actionType,
      motif: params.motif?.trim() || null,
      status_snapshot: statusSnapshot,
      status_updated_to: statusUpdatedToDb,
      detail: params.detail?.trim() || null,
      follow_up_at: followIso,
      created_by: params.createdByUserId ?? null,
    });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
