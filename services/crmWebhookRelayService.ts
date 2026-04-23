import type { CrmOutboundEvent } from './crmIntegrationHub';
import { supabase } from './supabaseService';

/**
 * Appelle l’Edge Function `crm-webhook-dispatch` avec la session courante (JWT).
 * Sans session : no-op. Les erreurs réseau / fonction absente sont loguées sans bloquer l’UI.
 */
export async function relayCrmOutboundEventToHttpWebhooks(event: CrmOutboundEvent): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) return;

    const { error } = await supabase.functions.invoke('crm-webhook-dispatch', {
      body: { event },
    });

    if (error) {
      console.warn('[crmWebhookRelay]', error.message || error);
    }
  } catch (e) {
    console.warn('[crmWebhookRelay]', e);
  }
}

/** Ping minimal pour tester la chaîne signature + URL distante. */
export async function sendCrmWebhookPing(organizationId: string): Promise<{ error: string | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      return { error: 'not_authenticated' };
    }
    const { data, error } = await supabase.functions.invoke('crm-webhook-dispatch', {
      body: { event: { kind: 'crm.webhook_ping', organizationId } as CrmOutboundEvent },
    });
    if (error) {
      return { error: error.message || 'invoke_failed' };
    }
    if (data && typeof data === 'object' && 'error' in data) {
      return { error: String((data as { error?: string }).error || 'edge_error') };
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
