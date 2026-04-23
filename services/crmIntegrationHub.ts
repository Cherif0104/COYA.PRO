import type { Contact } from '../types';

/** Événements émis vers des intégrations externes (autres applis web, automatisations). */
export type CrmOutboundEvent =
  | {
      kind: 'contact.created';
      contact: Contact;
    }
  | {
      kind: 'contact.updated';
      contact: Contact;
      previous?: Partial<Contact>;
    }
  | {
      kind: 'collecte.submissions_synced';
      ok: number;
      fail: number;
      collectionId?: string;
      /** Organisation métier pour relais Edge (recommandé). */
      organizationId?: string | null;
    }
  /** Test de bout en bout relais + signature (corps minimal). */
  | { kind: 'crm.webhook_ping'; organizationId: string };

export type CrmOutboundHandler = (event: CrmOutboundEvent) => void;

const handlers = new Set<CrmOutboundHandler>();

/** Enregistre un écouteur (retourne une fonction de désinscription). */
export function registerCrmOutboundIntegration(handler: CrmOutboundHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Notifie les intégrations branchées en code + hook global optionnel `window.__COYA_CRM_EVENT__`
 * (utile pour iframes / scripts partenaires sans recompiler).
 */
export function dispatchCrmOutboundEvent(event: CrmOutboundEvent): void {
  handlers.forEach((h) => {
    try {
      h(event);
    } catch (e) {
      console.warn('[crmIntegrationHub] handler error', e);
    }
  });
  try {
    const w = typeof window !== 'undefined' ? (window as unknown as { __COYA_CRM_EVENT__?: (e: CrmOutboundEvent) => void }) : null;
    if (w?.__COYA_CRM_EVENT__) w.__COYA_CRM_EVENT__(event);
  } catch {
    /* ignore */
  }

  void import('./crmWebhookRelayService')
    .then(({ relayCrmOutboundEventToHttpWebhooks }) => relayCrmOutboundEventToHttpWebhooks(event))
    .catch((err) => console.warn('[crmIntegrationHub] relay', err));
}
