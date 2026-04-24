import React, { useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Contact, Translation } from '../types';
import { Language } from '../types';
import * as dataCollectionService from '../services/dataCollectionService';
import { getCollectePayloadFieldLabel } from '../utils/collecteParticipantFields';
import ContactExchangePanel from './ContactExchangePanel';

const statusStyles: Record<Contact['status'], string> = {
  Lead: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Unreachable: 'bg-orange-100 text-orange-900',
  CallbackExpected: 'bg-indigo-100 text-indigo-900',
  Prospect: 'bg-purple-100 text-purple-800',
  Customer: 'bg-green-100 text-green-800',
};

function statusTranslationKey(status: Contact['status']): keyof Translation {
  if (status === 'CallbackExpected') return 'callback_expected';
  return status.toLowerCase() as keyof Translation;
}

type Props = {
  contact: Contact;
  onBack: () => void;
  onRequestEdit: (c: Contact) => void;
  onRequestDelete: (id: string | number) => void;
  onDraftEmail: (c: Contact) => void;
  onGoToCollecteCampaign?: (collectionId: string) => void;
  canEdit: boolean;
  /** Mise à jour pipeline après enregistrement d’un échange (statut optionnel). */
  onUpdateContact?: (c: Contact) => void | Promise<void>;
};

function fieldRow(label: string, value: React.ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, '');
}

/** Regroupe e-mails et lignes téléphoniques pour éviter les doublons visuels (même valeur sur plusieurs champs). */
function useContactPresentation(contact: Contact, t: (k: keyof Translation) => string) {
  return useMemo(() => {
    const emails: { label: string; value: string }[] = [];
    const work = contact.workEmail?.trim();
    const pers = contact.personalEmail?.trim();
    if (work) emails.push({ label: t('work_email'), value: work });
    if (pers && pers.toLowerCase() !== (work || '').toLowerCase()) {
      emails.push({ label: t('personal_email'), value: pers });
    }

    type PhoneLine = { label: string; display: string; key: string };
    const rawLines: PhoneLine[] = [];
    if (contact.officePhone?.trim()) {
      const d = contact.officePhone.trim();
      rawLines.push({ label: t('office_phone'), display: d, key: digitsOnly(d) || d });
    }
    if (contact.mobilePhone?.trim()) {
      const d = contact.mobilePhone.trim();
      rawLines.push({ label: t('mobile_phone'), display: d, key: digitsOnly(d) || d });
    }
    if (contact.whatsappNumber?.trim()) {
      const d = contact.whatsappNumber.trim();
      rawLines.push({ label: t('whatsapp_number'), display: d, key: digitsOnly(d) || d });
    }

    const byKey = new Map<string, { display: string; labels: string[] }>();
    for (const row of rawLines) {
      const prev = byKey.get(row.key);
      if (prev) {
        if (!prev.labels.includes(row.label)) prev.labels.push(row.label);
      } else {
        byKey.set(row.key, { display: row.display, labels: [row.label] });
      }
    }
    const phones = Array.from(byKey.values()).map((p) => ({
      value: p.display,
      caption: p.labels.length > 1 ? p.labels.join(' · ') : p.labels[0],
    }));

    const mailHref = work ? `mailto:${encodeURIComponent(work)}` : null;
    const primaryPhone = phones[0]?.value;
    const telHref = primaryPhone ? `tel:${String(primaryPhone).replace(/\s/g, '')}` : null;
    const waRaw = contact.whatsappNumber?.trim();
    const waHref = waRaw ? `https://wa.me/${digitsOnly(waRaw)}` : null;

    const categoryDisplay =
      contact.categoryName ||
      (contact.categoryId && /^[0-9a-f-]{36}$/i.test(String(contact.categoryId)) ? null : contact.categoryId) ||
      '—';

    return { emails, phones, mailHref, telHref, waHref, categoryDisplay };
  }, [contact, t]);
}

const CRMContactDetailPage: React.FC<Props> = ({
  contact,
  onBack,
  onRequestEdit,
  onRequestDelete,
  onDraftEmail,
  onGoToCollecteCampaign,
  canEdit,
  onUpdateContact,
}) => {
  const { t, language } = useLocalization();
  const isFr = language === Language.FR;
  const [profileTab, setProfileTab] = useState<'crm' | 'collecte'>('crm');
  const pres = useContactPresentation(contact, t);

  const { submission, collection } = useMemo(() => dataCollectionService.resolveCollecteContext(contact), [contact]);

  const collecteRows = useMemo(() => {
    if (!submission?.payload) return [];
    return Object.entries(submission.payload).sort(([a], [b]) => a.localeCompare(b));
  }, [submission]);

  const tabBtn = (id: 'crm' | 'collecte', label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setProfileTab(id)}
      className={`flex-1 border-b-2 py-2.5 text-center text-xs font-semibold transition-colors ${
        profileTab === id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  const shortId = (id?: string | null) => {
    if (!id) return null;
    const s = String(id);
    if (s.length <= 14) return s;
    return `${s.slice(0, 8)}…${s.slice(-4)}`;
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-100/90 to-[#f0f2f6] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-md sm:px-5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <i className="fas fa-arrow-left text-[11px]" aria-hidden />
              {t('crm_contact_detail_back')}
            </button>
            <div className="min-w-0 sm:pl-1">
              <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">{contact.name}</h1>
              <p className="truncate text-xs text-slate-500">{contact.company}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyles[contact.status]}`}>
                  {t(statusTranslationKey(contact.status))}
                </span>
                {contact.sourceCollectionId && (
                  <span className="inline-flex max-w-[200px] truncate rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900">
                    {collection?.name ?? shortId(contact.sourceCollectionId)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => onDraftEmail(contact)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-orange-600 hover:to-amber-600"
            >
              <i className="fas fa-magic text-[11px]" aria-hidden />
              {t('crm_contact_detail_draft_email')}
            </button>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => onRequestEdit(contact)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  <i className="fas fa-pen text-[10px]" aria-hidden />
                  {t('crm_contact_detail_edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(contact.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50"
                >
                  <i className="fas fa-trash text-[10px]" aria-hidden />
                  {t('crm_contact_detail_delete')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-6">
        <div className="grid min-h-[min(72vh,760px)] gap-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg ring-1 ring-slate-900/[0.04] xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,300px)]">
          {/* Colonne gauche : identité + onglets données (sans répéter la carte « entreprise ») */}
          <aside className="flex flex-col border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white xl:border-b-0 xl:border-r">
            <div className="flex gap-3 border-b border-slate-100 p-4">
              <img
                src={contact.avatar || undefined}
                alt=""
                className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200/80 object-cover shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('crm_contact_detail_title')}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{t('crm_contact_detail_coords_hint')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pres.mailHref && (
                    <a
                      href={pres.mailHref}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                      title={t('work_email')}
                    >
                      <i className="fas fa-envelope text-xs" aria-hidden />
                    </a>
                  )}
                  {pres.telHref && (
                    <a
                      href={pres.telHref}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                      title={t('office_phone')}
                    >
                      <i className="fas fa-phone text-xs" aria-hidden />
                    </a>
                  )}
                  {pres.waHref && (
                    <a
                      href={pres.waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 shadow-sm hover:bg-emerald-50"
                      title={t('whatsapp_number')}
                    >
                      <i className="fab fa-whatsapp text-sm" aria-hidden />
                    </a>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onRequestEdit(contact)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                      title={t('crm_contact_detail_edit')}
                    >
                      <i className="fas fa-ellipsis-h text-xs" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <nav className="flex border-b border-slate-100 px-2">{tabBtn('crm', t('crm_contact_detail_section_crm'))}{tabBtn('collecte', t('crm_contact_detail_section_collecte'))}</nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {profileTab === 'crm' && (
                <div className="space-y-4">
                  <section className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('crm_contact_detail_coords_title')}</p>
                    {pres.emails.length === 0 && pres.phones.length === 0 ? (
                      <p className="text-xs text-slate-500">{t('crm_contact_detail_coords_empty')}</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-slate-800">
                        {pres.emails.map((e) => (
                          <li key={e.label + e.value} className="flex flex-col rounded-lg bg-slate-50/80 px-2.5 py-2">
                            <span className="text-[10px] font-semibold uppercase text-slate-400">{e.label}</span>
                            <a href={`mailto:${encodeURIComponent(e.value)}`} className="mt-0.5 break-all font-medium text-sky-700 hover:underline">
                              {e.value}
                            </a>
                          </li>
                        ))}
                        {pres.phones.map((p, i) => (
                          <li key={`${p.value}-${i}`} className="flex flex-col rounded-lg bg-slate-50/80 px-2.5 py-2">
                            <span className="text-[10px] font-semibold uppercase text-slate-400">{p.caption}</span>
                            <a href={`tel:${String(p.value).replace(/\s/g, '')}`} className="mt-0.5 font-mono text-[13px] font-semibold text-slate-900 hover:text-sky-800">
                              {p.value}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('crm_contact_detail_commercial_title')}</p>
                    {fieldRow(t('contact_category'), pres.categoryDisplay)}
                    {fieldRow(t('crm_contact_detail_source'), contact.source || '—')}
                    {fieldRow(t('crm_contact_detail_created_by'), contact.createdByName || contact.createdById || '—')}
                    {fieldRow(
                      t('crm_contact_detail_tags'),
                      contact.tags?.length ? (
                        <span className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {tag}
                            </span>
                          ))}
                        </span>
                      ) : (
                        '—'
                      ),
                    )}
                  </section>
                </div>
              )}

              {profileTab === 'collecte' && (
                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('crm_contact_detail_section_collecte')}</p>
                    {collection?.id && onGoToCollecteCampaign && (
                      <button
                        type="button"
                        onClick={() => onGoToCollecteCampaign(collection.id)}
                        className="text-[10px] font-semibold text-sky-700 hover:underline"
                      >
                        {t('crm_contact_detail_go_collecte')}
                      </button>
                    )}
                  </div>
                  {!submission ? (
                    <p className="text-xs text-slate-500">{t('crm_contact_detail_collecte_no_local')}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500">
                        {t('crm_contact_detail_collecte_submitted_at')}{' '}
                        <time className="font-medium text-slate-700">{new Date(submission.submittedAt).toLocaleString()}</time>
                      </p>
                      {collecteRows.length === 0 ? (
                        <p className="text-xs text-slate-500">{t('crm_contact_detail_collecte_empty_payload')}</p>
                      ) : (
                        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                          {collecteRows.map(([key, val]) => (
                            <div key={key} className="px-2 py-2 sm:grid sm:grid-cols-5 sm:gap-2">
                              <dt className="text-[10px] font-semibold text-slate-500 sm:col-span-2">{getCollectePayloadFieldLabel(key, isFr)}</dt>
                              <dd className="mt-0.5 break-words text-xs text-slate-900 sm:col-span-3 sm:mt-0">{val || '—'}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Centre — codification puis historique (pleine largeur, scrollable) */}
          <main className="flex min-h-[min(68vh,620px)] min-w-0 flex-col border-b border-slate-100 bg-white xl:border-b-0 xl:border-r">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">{t('crm_activity_main_title')}</h2>
              <p className="text-[11px] text-slate-500">{t('crm_activity_main_subtitle')}</p>
            </div>
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <ContactExchangePanel contact={contact} canEdit={canEdit} onUpdateContact={onUpdateContact} />
            </section>
          </main>

          {/* Droite : synthèse dossier (pas de doublon e-mail / téléphone) */}
          <aside className="flex flex-col gap-3 bg-slate-50/40 p-4">
            <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('crm_contact_detail_snapshot_title')}</p>
              <dl className="mt-3 space-y-2.5 text-xs">
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">{t('contact_company')}</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{contact.company}</dd>
                </div>
                {contact.organizationId && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-slate-400">{t('crm_contact_detail_snapshot_org')}</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-slate-600">{shortId(contact.organizationId)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">{t('crm_contact_detail_source')}</dt>
                  <dd className="mt-0.5 break-words text-slate-700">{contact.source || '—'}</dd>
                </div>
                {contact.sourceCollectionId && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-slate-400">{t('crm_contact_detail_snapshot_campaign')}</dt>
                    <dd className="mt-0.5 text-slate-700">{collection?.name ?? shortId(contact.sourceCollectionId)}</dd>
                  </div>
                )}
                {contact.sourceSubmissionId && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-slate-400">{t('crm_contact_detail_snapshot_submission')}</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-slate-600">{shortId(contact.sourceSubmissionId)}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{isFr ? 'À suivre' : 'Next steps'}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">CRM</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{t('crm_contact_detail_next_steps_hint')}</p>
            </section>

            {canEdit && contact.status !== 'Customer' && (
              <section className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">{isFr ? 'Conversion' : 'Conversion'}</p>
                <p className="mt-1 text-xs text-emerald-900">
                  {isFr ? 'Passez le contact en « Client » depuis la liste ou l’édition rapide lorsque l’affaire est conclue.' : 'Mark as Customer from the list or quick edit when the deal is won.'}
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CRMContactDetailPage;
