# Edge Functions COYA

## `crm-webhook-dispatch`

Relais des événements CRM vers les URLs configurées dans `organization_crm_webhooks`, avec en-tête `X-Coya-Signature: sha256=<hex>` (HMAC-SHA256 du corps JSON UTF-8, secret par ligne).

### Déploiement

1. Appliquer la migration `20260423130000_organization_crm_webhooks.sql`.
2. `supabase functions deploy crm-webhook-dispatch --project-ref <VOTRE_REF>`
3. Vérifier `[functions.crm-webhook-dispatch] verify_jwt = true` dans `supabase/config.toml` (déjà présent).

### Vérification côté récepteur

1. Lire le corps brut (string UTF-8).
2. Calculer `HMAC-SHA256(body, signing_secret)` en hexadécimal minuscule.
3. Comparer à la valeur après le préfixe `sha256=` dans `X-Coya-Signature`.

Le JSON contient `delivery_id`, `sent_at`, `organization_id` et `event` (même forme que côté app).
