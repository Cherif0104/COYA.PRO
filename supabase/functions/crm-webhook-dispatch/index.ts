/**
 * Relais sécurisé : vérifie le JWT utilisateur, charge les webhooks de son organisation,
 * envoie le corps JSON signé (HMAC-SHA256 hex) vers chaque URL activée.
 *
 * Variables (injectées par Supabase) :
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (validation session via header Authorization)
 * - SUPABASE_SERVICE_ROLE_KEY (lecture secrets webhooks + mise à jour statut livraison)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OutboundEvent =
  | { kind: 'contact.created'; contact: Record<string, unknown> }
  | { kind: 'contact.updated'; contact: Record<string, unknown>; previous?: Record<string, unknown> }
  | {
      kind: 'collecte.submissions_synced';
      ok: number;
      fail: number;
      collectionId?: string;
      organizationId?: string | null;
    }
  | { kind: 'crm.webhook_ping'; organizationId: string };

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function resolveTargetOrgId(event: OutboundEvent, profileOrgId: string | null): string | null {
  if (!profileOrgId) return null;
  if (event.kind === 'contact.created' || event.kind === 'contact.updated') {
    const cid = (event.contact as { organizationId?: string }).organizationId;
    return (typeof cid === 'string' && cid ? cid : profileOrgId) || profileOrgId;
  }
  if (event.kind === 'collecte.submissions_synced') {
    const oid = event.organizationId;
    return (typeof oid === 'string' && oid ? oid : profileOrgId) || profileOrgId;
  }
  if (event.kind === 'crm.webhook_ping') {
    return event.organizationId || null;
  }
  return profileOrgId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'server_misconfigured' });
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'missing_authorization' });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return jsonResponse(401, { error: 'invalid_session' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr || !profile?.organization_id) {
    return jsonResponse(403, { error: 'no_organization' });
  }

  const profileOrgId = String(profile.organization_id);

  let body: { event?: OutboundEvent };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const event = body?.event;
  if (!event || typeof event !== 'object' || !('kind' in event)) {
    return jsonResponse(400, { error: 'missing_event' });
  }

  const allowedKinds = new Set([
    'contact.created',
    'contact.updated',
    'collecte.submissions_synced',
    'crm.webhook_ping',
  ]);
  const kind = (event as { kind?: string }).kind;
  if (!kind || !allowedKinds.has(kind)) {
    return jsonResponse(400, { error: 'unsupported_event_kind' });
  }

  const targetOrgId = resolveTargetOrgId(event as OutboundEvent, profileOrgId);
  if (!targetOrgId) {
    return jsonResponse(400, { error: 'cannot_resolve_organization' });
  }

  if (targetOrgId !== profileOrgId) {
    return jsonResponse(403, { error: 'organization_mismatch' });
  }

  const { data: webhooks, error: whErr } = await admin
    .from('organization_crm_webhooks')
    .select('id, target_url, signing_secret, is_enabled')
    .eq('organization_id', targetOrgId)
    .eq('is_enabled', true);

  if (whErr) {
    console.error('[crm-webhook-dispatch] list webhooks', whErr);
    return jsonResponse(500, { error: 'list_webhooks_failed' });
  }

  const rows = (webhooks || []) as Array<{
    id: string;
    target_url: string;
    signing_secret: string;
    is_enabled: boolean;
  }>;

  if (rows.length === 0) {
    return jsonResponse(200, { ok: true, delivered: 0, targets: 0 });
  }

  const deliveryId = crypto.randomUUID();
  const sentAt = new Date().toISOString();
  const envelope = {
    delivery_id: deliveryId,
    sent_at: sentAt,
    organization_id: targetOrgId,
    event,
  };
  const rawBody = JSON.stringify(envelope);
  let delivered = 0;

  for (const row of rows) {
    let signature = '';
    try {
      signature = await hmacSha256Hex(row.signing_secret, rawBody);
    } catch (e) {
      console.error('[crm-webhook-dispatch] hmac', e);
      await admin
        .from('organization_crm_webhooks')
        .update({
          last_delivery_at: sentAt,
          last_delivery_status: 'failure',
          last_error: 'hmac_failed',
        })
        .eq('id', row.id);
      continue;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(row.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Coya-Signature': `sha256=${signature}`,
          'X-Coya-Delivery-Id': deliveryId,
          'X-Coya-Event': String((event as OutboundEvent).kind),
        },
        body: rawBody,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const ok = res.ok;
      if (ok) delivered += 1;
      await admin
        .from('organization_crm_webhooks')
        .update({
          last_delivery_at: sentAt,
          last_delivery_status: ok ? 'success' : 'failure',
          last_error: ok ? null : `http_${res.status}`,
        })
        .eq('id', row.id);
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message.slice(0, 480) : 'fetch_error';
      await admin
        .from('organization_crm_webhooks')
        .update({
          last_delivery_at: sentAt,
          last_delivery_status: 'failure',
          last_error: msg,
        })
        .eq('id', row.id);
    }
  }

  return jsonResponse(200, { ok: true, delivered, targets: rows.length, delivery_id: deliveryId });
});
