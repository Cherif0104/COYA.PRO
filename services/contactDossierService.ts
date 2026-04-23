import { supabase } from './supabaseService';
import type { Contact } from '../types';

export type ContactDossierKind = 'timeline' | 'note' | 'link' | 'file';

export type ContactDossierItemRow = {
  id: string;
  organization_id: string;
  contact_id: string;
  kind: ContactDossierKind;
  title: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

function isUuidContactId(id: string | number): boolean {
  const s = String(id);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function listContactDossierItems(contactId: string): Promise<{
  data: ContactDossierItemRow[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('contact_dossier_items')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: new Error(error.message) };
    return { data: (data || []) as ContactDossierItemRow[], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function insertContactDossierItem(params: {
  organizationId: string;
  contactId: string;
  kind: ContactDossierKind;
  title?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown>;
  createdByUserId?: string | null;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('contact_dossier_items').insert({
      organization_id: params.organizationId,
      contact_id: params.contactId,
      kind: params.kind,
      title: params.title ?? null,
      body: params.body ?? null,
      metadata: params.metadata ?? {},
      created_by: params.createdByUserId ?? null,
    });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function deleteContactDossierItem(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('contact_dossier_items').delete().eq('id', id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Journal CRM côté serveur (ignore les contacts locaux non UUID). */
export async function logContactDossierFromCrm(
  contact: Contact,
  action: 'created' | 'updated',
  authUserId: string | undefined,
  previous?: Contact | null,
): Promise<void> {
  if (!authUserId || !isUuidContactId(contact.id)) return;
  const orgId = contact.organizationId;
  if (!orgId) return;
  const title =
    action === 'created'
      ? 'Contact créé'
      : 'Contact mis à jour';
  const body =
    action === 'updated' && previous
      ? summarizeContactDiff(previous, contact)
      : null;
  const metadata: Record<string, unknown> = {
    event: action === 'created' ? 'crm.contact.created' : 'crm.contact.updated',
    status: contact.status,
    source: contact.source ?? null,
  };
  if (action === 'updated' && previous) {
    metadata.previousSnapshot = {
      name: previous.name,
      status: previous.status,
      company: previous.company,
      workEmail: previous.workEmail,
    };
  }
  const { error } = await insertContactDossierItem({
    organizationId: orgId,
    contactId: String(contact.id),
    kind: 'timeline',
    title,
    body,
    metadata,
    createdByUserId: authUserId,
  });
  if (error) console.warn('[contactDossierService]', error.message);
}

function summarizeContactDiff(before: Contact, after: Contact): string {
  const parts: string[] = [];
  const keys: (keyof Contact)[] = [
    'name',
    'company',
    'status',
    'workEmail',
    'personalEmail',
    'officePhone',
    'mobilePhone',
    'whatsappNumber',
    'categoryId',
  ];
  keys.forEach((k) => {
    const a = before[k];
    const b = after[k];
    if (String(a ?? '') !== String(b ?? '')) {
      parts.push(`${String(k)}: « ${String(a ?? '')} » → « ${String(b ?? '')} »`);
    }
  });
  return parts.length ? parts.join('\n') : 'Mise à jour enregistrée.';
}
