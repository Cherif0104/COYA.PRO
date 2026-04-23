import React, { useCallback, useEffect, useState } from 'react';
import type { Translation } from '../types';
import {
  createOrganizationCrmWebhook,
  deleteOrganizationCrmWebhook,
  generateWebhookSigningSecret,
  listOrganizationCrmWebhooks,
  type OrganizationCrmWebhookPublic,
  updateOrganizationCrmWebhook,
} from '../services/crmWebhookService';
import { sendCrmWebhookPing } from '../services/crmWebhookRelayService';

type Props = {
  organizationId: string | null;
  canManage: boolean;
  t: (key: keyof Translation) => string;
};

const CrmWebhookSettingsCard: React.FC<Props> = ({ organizationId, canManage, t }) => {
  const [rows, setRows] = useState<OrganizationCrmWebhookPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastCreatedSecret, setLastCreatedSecret] = useState<string | null>(null);
  const [pingMsg, setPingMsg] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await listOrganizationCrmWebhooks();
      if (err) {
        setError(err.message);
        setRows([]);
        return;
      }
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, organizationId]);

  const onAdd = async () => {
    if (!organizationId || !canManage) return;
    const url = newUrl.trim();
    if (!url.startsWith('https://')) {
      setError(String(t('crm_webhook_error_https')));
      return;
    }
    setSaving(true);
    setError(null);
    setLastCreatedSecret(null);
    const secret = generateWebhookSigningSecret();
    const { data, error: err } = await createOrganizationCrmWebhook({
      organizationId,
      targetUrl: url,
      label: newLabel.trim() || undefined,
      signingSecret: secret,
    });
    setSaving(false);
    if (err || !data) {
      setError(err?.message || 'create_failed');
      return;
    }
    setLastCreatedSecret(secret);
    setNewUrl('');
    setNewLabel('');
    await refresh();
  };

  const onToggle = async (row: OrganizationCrmWebhookPublic) => {
    if (!canManage) return;
    const { error: err } = await updateOrganizationCrmWebhook(row.id, { is_enabled: !row.is_enabled });
    if (err) setError(err.message);
    else await refresh();
  };

  const onDelete = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm(String(t('crm_webhook_confirm_delete')))) return;
    const { error: err } = await deleteOrganizationCrmWebhook(id);
    if (err) setError(err.message);
    else await refresh();
  };

  const onRegenerateSecret = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm(String(t('crm_webhook_confirm_regenerate')))) return;
    const secret = generateWebhookSigningSecret();
    const { error: err } = await updateOrganizationCrmWebhook(id, { signing_secret: secret });
    if (err) setError(err.message);
    else {
      setLastCreatedSecret(secret);
      await refresh();
    }
  };

  const onPing = async () => {
    if (!organizationId) return;
    setPingLoading(true);
    setPingMsg(null);
    const r = await sendCrmWebhookPing(organizationId);
    setPingLoading(false);
    setPingMsg(r.error ? `${t('crm_webhook_ping_fail')}: ${r.error}` : String(t('crm_webhook_ping_ok')));
  };

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
        {t('crm_webhook_no_org')}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <i className="fas fa-link text-emerald-600" />
          {t('crm_webhook_card_title')}
        </h3>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t('crm_webhook_card_body')}</p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {lastCreatedSecret && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 space-y-2">
          <p className="font-semibold text-emerald-950">{t('crm_webhook_secret_once')}</p>
          <code className="block text-xs break-all text-emerald-900 select-all">{lastCreatedSecret}</code>
          <button
            type="button"
            className="text-xs text-emerald-800 underline"
            onClick={() => setLastCreatedSecret(null)}
          >
            {t('crm_webhook_secret_dismiss')}
          </button>
        </div>
      )}

      {canManage && (
        <div className="space-y-2 border border-slate-100 rounded-xl p-4 bg-slate-50/80">
          <p className="text-xs font-semibold text-slate-700">{t('crm_webhook_add_title')}</p>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder={String(t('crm_webhook_url_placeholder'))}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={String(t('crm_webhook_label_placeholder'))}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <button
            type="button"
            disabled={saving || !newUrl.trim()}
            onClick={() => void onAdd()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-plus" />}
            {t('crm_webhook_add_button')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">{t('crm_webhook_list_title')}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="text-xs text-slate-600 hover:text-slate-900 underline"
        >
          {loading ? <i className="fas fa-spinner fa-spin" /> : t('crm_webhook_refresh')}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{t('crm_webhook_empty')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {row.label || row.target_url}
                </p>
                <p className="text-xs text-slate-500 break-all">{row.target_url}</p>
                <p className="text-[11px] text-slate-400">
                  {row.last_delivery_at
                    ? `${t('crm_webhook_last')}: ${row.last_delivery_at} — ${row.last_delivery_status || '—'}`
                    : t('crm_webhook_never')}
                  {row.last_error ? ` · ${row.last_error}` : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void onToggle(row)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${
                      row.is_enabled
                        ? 'border-amber-200 text-amber-900 bg-amber-50'
                        : 'border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    {row.is_enabled ? t('crm_webhook_disable') : t('crm_webhook_enable')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRegenerateSecret(row.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border border-slate-200 text-slate-800 hover:bg-slate-50"
                  >
                    {t('crm_webhook_regenerate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(row.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border border-red-200 text-red-800 hover:bg-red-50"
                  >
                    {t('crm_webhook_delete')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pingLoading || rows.length === 0}
          onClick={() => void onPing()}
          className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {pingLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-satellite-dish" />}
          {t('crm_webhook_ping')}
        </button>
        {pingMsg && <span className="text-xs text-slate-600">{pingMsg}</span>}
      </div>

      {!canManage && (
        <p className="text-xs text-slate-500">{t('crm_webhook_readonly')}</p>
      )}
    </div>
  );
};

export default CrmWebhookSettingsCard;
