import { supabase } from './supabaseService';

/** Ligne webhook sans secret (liste UI). */
export type OrganizationCrmWebhookPublic = {
  id: string;
  organization_id: string;
  label: string | null;
  target_url: string;
  is_enabled: boolean;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

const publicFields =
  'id, organization_id, label, target_url, is_enabled, last_delivery_at, last_delivery_status, last_error, created_at, updated_at';

export function generateWebhookSigningSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function listOrganizationCrmWebhooks(): Promise<{
  data: OrganizationCrmWebhookPublic[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('organization_crm_webhooks')
      .select(publicFields)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: new Error(error.message) };
    return { data: (data || []) as OrganizationCrmWebhookPublic[], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function createOrganizationCrmWebhook(params: {
  organizationId: string;
  targetUrl: string;
  label?: string;
  signingSecret: string;
}): Promise<{ data: OrganizationCrmWebhookPublic | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_crm_webhooks')
      .insert({
        organization_id: params.organizationId,
        target_url: params.targetUrl.trim(),
        label: params.label?.trim() || null,
        signing_secret: params.signingSecret,
        is_enabled: true,
      })
      .select(publicFields)
      .single();
    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as OrganizationCrmWebhookPublic, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function updateOrganizationCrmWebhook(
  id: string,
  patch: Partial<Pick<OrganizationCrmWebhookPublic, 'target_url' | 'label' | 'is_enabled'>> & { signing_secret?: string },
): Promise<{ error: Error | null }> {
  try {
    const row: Record<string, unknown> = {};
    if (patch.target_url !== undefined) row.target_url = patch.target_url.trim();
    if (patch.label !== undefined) row.label = patch.label?.trim() || null;
    if (patch.is_enabled !== undefined) row.is_enabled = patch.is_enabled;
    if (patch.signing_secret !== undefined) row.signing_secret = patch.signing_secret;
    const { error } = await supabase.from('organization_crm_webhooks').update(row).eq('id', id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function deleteOrganizationCrmWebhook(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('organization_crm_webhooks').delete().eq('id', id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
