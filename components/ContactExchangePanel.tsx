import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Contact, CrmContactLifecycleStatus, Translation } from '../types';
import { Language } from '../types';
import OrganizationService from '../services/organizationService';
import {
  contactStatusDbToUi,
  insertContactInteraction,
  listContactInteractions,
  type ContactInteractionActionType,
  type ContactInteractionRow,
} from '../services/contactInteractionService';
import { useAuth } from '../contexts/AuthContextSupabase';

type MotifPreset = 'commercial' | 'support' | 'hr' | 'billing' | 'partnership' | 'custom';

const ACTION_TYPES: { type: ContactInteractionActionType; labelKey: keyof Translation; iconClass: string }[] = [
  { type: 'follow_up', labelKey: 'crm_exchange_action_follow_up', iconClass: 'fas fa-redo' },
  { type: 'reminder', labelKey: 'crm_exchange_action_reminder', iconClass: 'fas fa-bell' },
  { type: 'email_sent', labelKey: 'crm_exchange_action_email_sent', iconClass: 'fas fa-paper-plane' },
  { type: 'phone_call', labelKey: 'crm_exchange_action_phone_call', iconClass: 'fas fa-phone' },
  { type: 'meeting', labelKey: 'crm_exchange_action_meeting', iconClass: 'fas fa-handshake' },
  { type: 'whatsapp', labelKey: 'crm_exchange_action_whatsapp', iconClass: 'fab fa-whatsapp' },
  { type: 'visit', labelKey: 'crm_exchange_action_visit', iconClass: 'fas fa-map-marker-alt' },
  { type: 'other', labelKey: 'crm_exchange_action_other', iconClass: 'fas fa-ellipsis-h' },
];

const MOTIF_PRESETS: { id: MotifPreset; labelKey: keyof Translation }[] = [
  { id: 'commercial', labelKey: 'crm_exchange_motif_commercial' },
  { id: 'support', labelKey: 'crm_exchange_motif_support' },
  { id: 'hr', labelKey: 'crm_exchange_motif_hr' },
  { id: 'billing', labelKey: 'crm_exchange_motif_billing' },
  { id: 'partnership', labelKey: 'crm_exchange_motif_partnership' },
  { id: 'custom', labelKey: 'crm_exchange_motif_custom' },
];

function isUuid(id: string | number): boolean {
  const s = String(id);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type Props = {
  contact: Contact;
  canEdit: boolean;
  onUpdateContact?: (c: Contact) => void | Promise<void>;
};

const PIPELINE: CrmContactLifecycleStatus[] = [
  'Lead',
  'Contacted',
  'Unreachable',
  'CallbackExpected',
  'Prospect',
  'Customer',
];

function statusTranslationKey(status: CrmContactLifecycleStatus): keyof Translation {
  if (status === 'CallbackExpected') return 'callback_expected';
  return status.toLowerCase() as keyof Translation;
}

const ContactExchangePanel: React.FC<Props> = ({ contact, canEdit, onUpdateContact }) => {
  const { t, language } = useLocalization();
  const { user } = useAuth();
  const isFr = language === Language.FR;
  const [orgId, setOrgId] = useState<string | null>(contact.organizationId ?? null);
  const [rows, setRows] = useState<ContactInteractionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<ContactInteractionActionType | null>(null);
  const [motifPreset, setMotifPreset] = useState<MotifPreset>('commercial');
  const [motifCustom, setMotifCustom] = useState('');
  const [detail, setDetail] = useState('');
  const [nextStatus, setNextStatus] = useState<CrmContactLifecycleStatus | ''>('');
  const [saving, setSaving] = useState(false);

  const contactUuid = useMemo(() => isUuid(contact.id), [contact.id]);

  useEffect(() => {
    if (!contact.organizationId) {
      void OrganizationService.getCurrentUserOrganizationId().then(setOrgId);
    } else {
      setOrgId(contact.organizationId);
    }
  }, [contact.organizationId]);

  const load = useCallback(async () => {
    if (!contactUuid) return;
    setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await listContactInteractions(String(contact.id));
      if (error) {
        setMsg(error.message);
        setRows([]);
        return;
      }
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }, [contact.id, contactUuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolvedOrgId = contact.organizationId ?? orgId;

  const openModal = (action: ContactInteractionActionType) => {
    setModalAction(action);
    setMotifPreset('commercial');
    setMotifCustom('');
    setDetail('');
    setNextStatus('');
  };

  const closeModal = () => {
    setModalAction(null);
  };

  const resolveMotifText = (): string => {
    if (motifPreset === 'custom') return motifCustom.trim() || String(t('crm_exchange_motif_custom_ph'));
    return String(t(MOTIF_PRESETS.find((m) => m.id === motifPreset)!.labelKey));
  };

  const submitModal = async () => {
    if (!modalAction || !resolvedOrgId || !contactUuid || !canEdit) return;
    const statusChange =
      nextStatus && nextStatus !== contact.status ? (nextStatus as CrmContactLifecycleStatus) : null;
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await insertContactInteraction({
        organizationId: resolvedOrgId,
        contactId: String(contact.id),
        contact,
        actionType: modalAction,
        motif: resolveMotifText(),
        detail: detail.trim() || null,
        statusUpdatedTo: statusChange,
        createdByUserId: user?.id ?? null,
      });
      if (error) {
        setMsg(error.message === 'CONTACT_NOT_SYNCED' ? String(t('crm_exchange_requires_uuid')) : error.message);
        return;
      }
      if (statusChange && onUpdateContact) {
        await onUpdateContact({ ...contact, status: statusChange });
      }
      closeModal();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = (type: ContactInteractionActionType) =>
    String(t(ACTION_TYPES.find((a) => a.type === type)?.labelKey ?? 'crm_exchange_action_other'));

  if (!contactUuid) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
        {t('crm_exchange_requires_uuid')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">{msg}</p>}

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{t('crm_exchange_section_title')}</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">{t('crm_exchange_section_subtitle')}</p>
        {canEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {ACTION_TYPES.map(({ type, labelKey, iconClass }) => (
              <button
                key={type}
                type="button"
                onClick={() => openModal(type)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                <i className={`${iconClass} text-[10px] text-emerald-700`} aria-hidden />
                {t(labelKey)}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">{isFr ? 'Lecture seule.' : 'Read-only.'}</p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{t('crm_exchange_history_title')}</h3>
        {loading ? (
          <p className="mt-2 text-xs text-slate-500">{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">{t('crm_exchange_history_empty')}</p>
        ) : (
          <ul className="mt-2 space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {rows.map((row) => {
              const snapUi = contactStatusDbToUi(row.status_snapshot);
              const nextUi = contactStatusDbToUi(row.status_updated_to);
              return (
                <li key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                      {actionLabel(row.action_type)}
                    </span>
                    <time className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleString()}</time>
                  </div>
                  <dl className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-slate-500">{t('crm_exchange_motif_label')}</dt>
                      <dd className="text-slate-900">{row.motif || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">{t('crm_exchange_status_at')}</dt>
                      <dd className="text-slate-900">{snapUi ? t(statusTranslationKey(snapUi)) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">{t('crm_exchange_action_done')}</dt>
                      <dd className="text-slate-900">
                        {nextUi ? (
                          <span>
                            {t('crm_exchange_status_changed')}{' '}
                            <span className="font-semibold">{t(statusTranslationKey(nextUi))}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">{t('crm_exchange_status_unchanged')}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  {row.detail ? (
                    <p className="mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2 text-xs text-slate-700">{row.detail}</p>
                  ) : null}
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {row.created_by && user?.id && row.created_by === user.id
                      ? t('crm_exchange_author_me')
                      : row.created_by
                        ? `${t('crm_exchange_author')}: ${String(row.created_by).slice(0, 8)}…`
                        : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalAction && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-3 sm:items-center" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">{t('crm_exchange_modal_title')}</h4>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-emerald-800">
              <i className={`${ACTION_TYPES.find((a) => a.type === modalAction)?.iconClass} mr-1`} aria-hidden />
              {actionLabel(modalAction)}
            </p>

            <label className="mt-4 block text-[10px] font-bold uppercase text-slate-500">{t('crm_exchange_motif_label')}</label>
            <select
              value={motifPreset}
              onChange={(e) => setMotifPreset(e.target.value as MotifPreset)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {MOTIF_PRESETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>
            {motifPreset === 'custom' && (
              <input
                value={motifCustom}
                onChange={(e) => setMotifCustom(e.target.value)}
                placeholder={String(t('crm_exchange_motif_custom_ph'))}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            )}

            <label className="mt-3 block text-[10px] font-bold uppercase text-slate-500">{t('crm_exchange_detail_label')}</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder={String(t('crm_exchange_detail_ph'))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />

            <label className="mt-3 block text-[10px] font-bold uppercase text-slate-500">
              {t('crm_exchange_optional_status')}
            </label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus((e.target.value || '') as CrmContactLifecycleStatus | '')}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">{t('crm_exchange_status_keep')}</option>
              {PIPELINE.map((s) => (
                <option key={s} value={s} disabled={s === contact.status}>
                  {t(statusTranslationKey(s))}
                </option>
              ))}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitModal()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? t('loading') : t('crm_exchange_submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactExchangePanel;
