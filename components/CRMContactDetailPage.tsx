import React, { useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Contact, Translation } from '../types';
import { Language } from '../types';
import * as dataCollectionService from '../services/dataCollectionService';
import { getCollectePayloadFieldLabel } from '../utils/collecteParticipantFields';
import ContactDossierDrawer from './ContactDossierDrawer';
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

  const { submission, collection } = useMemo(() => dataCollectionService.resolveCollecteContext(contact), [contact]);

  const collecteRows = useMemo(() => {
    if (!submission?.payload) return [];
    return Object.entries(submission.payload).sort(([a], [b]) => a.localeCompare(b));
  }, [submission]);

  const mailHref = contact.workEmail?.trim() ? `mailto:${encodeURIComponent(contact.workEmail.trim())}` : null;
  const telHref = (contact.mobilePhone || contact.officePhone)?.trim()
    ? `tel:${String(contact.mobilePhone || contact.officePhone).replace(/\s/g, '')}`
    : null;
  const waHref = contact.whatsappNumber?.trim()
    ? `https://wa.me/${String(contact.whatsappNumber).replace(/\D/g, '')}`
    : null;

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

  return (
    <div className="min-h-full bg-[#f7f8fa] text-slate-900">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <i className="fas fa-arrow-left text-[11px]" aria-hidden />
            {t('crm_contact_detail_back')}
          </button>
          <div className="min-w-0 hidden sm:block">
            <p className="truncate text-sm font-bold text-slate-900">{contact.name}</p>
            <p className="truncate text-xs text-slate-500">{contact.company}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onDraftEmail(contact)}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600"
          >
            <i className="fas fa-magic text-[11px]" aria-hidden />
            {t('crm_contact_detail_draft_email')}
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => onRequestEdit(contact)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <i className="fas fa-pen text-[10px]" aria-hidden />
                {t('crm_contact_detail_edit')}
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(contact.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <i className="fas fa-trash text-[10px]" aria-hidden />
                {t('crm_contact_detail_delete')}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="p-3 sm:p-4 lg:p-5">
        <div className="flex min-h-[min(70vh,720px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex-row">
          {/* Colonne profil (réf. CRM entreprise) */}
          <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-slate-50/60 xl:w-[280px] xl:border-b-0 xl:border-r">
            <div className="p-4">
              <div className="flex gap-3">
                <img
                  src={contact.avatar || undefined}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold leading-tight text-slate-900">{contact.name}</h1>
                  <p className="mt-0.5 truncate text-sm text-slate-600">{contact.company}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyles[contact.status]}`}>
                      {t(statusTranslationKey(contact.status))}
                    </span>
                    {contact.sourceCollectionId && (
                      <span className="inline-flex max-w-[140px] truncate rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900">
                        {collection?.name ?? `${String(contact.sourceCollectionId).slice(0, 8)}…`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {mailHref && (
                  <a
                    href={mailHref}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    title={t('work_email')}
                  >
                    <i className="fas fa-envelope text-xs" aria-hidden />
                  </a>
                )}
                {telHref && (
                  <a
                    href={telHref}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    title={t('office_phone')}
                  >
                    <i className="fas fa-phone text-xs" aria-hidden />
                  </a>
                )}
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    title={t('whatsapp_number')}
                  >
                    <i className="fab fa-whatsapp text-sm" aria-hidden />
                  </a>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRequestEdit(contact)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    title={t('crm_contact_detail_edit')}
                  >
                    <i className="fas fa-ellipsis-h text-xs" aria-hidden />
                  </button>
                )}
              </div>

              <nav className="mt-5 flex border-b border-slate-200">{tabBtn('crm', t('crm_contact_detail_section_crm'))}{tabBtn('collecte', t('crm_contact_detail_section_collecte'))}</nav>

              <div className="mt-3 max-h-[42vh] overflow-y-auto pr-1">
                {profileTab === 'crm' && (
                  <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    {fieldRow(t('work_email'), contact.workEmail)}
                    {fieldRow(t('personal_email'), contact.personalEmail)}
                    {fieldRow(t('office_phone'), contact.officePhone)}
                    {fieldRow(t('mobile_phone'), contact.mobilePhone)}
                    {fieldRow(t('whatsapp_number'), contact.whatsappNumber)}
                    {fieldRow(t('contact_category'), contact.categoryName || contact.categoryId || '—')}
                    {fieldRow(t('crm_contact_detail_source'), contact.source || '—')}
                    {fieldRow(t('crm_contact_detail_created_by'), contact.createdByName || contact.createdById || '—')}
                    {fieldRow(
                      t('crm_contact_detail_notes'),
                      contact.notes ? <span className="whitespace-pre-wrap">{contact.notes}</span> : '—',
                    )}
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
            </div>
          </aside>

          {/* Zone centrale — échanges structurés + dossier */}
          <main className="flex min-h-[320px] min-w-0 flex-1 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">{t('crm_activity_main_title')}</h2>
              <p className="text-[11px] text-slate-500">{t('crm_activity_main_subtitle')}</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <section className="max-h-[min(52vh,420px)] shrink-0 overflow-y-auto border-b border-slate-100 p-4 lg:max-h-none lg:w-[min(100%,380px)] lg:border-b-0 lg:border-r">
                <ContactExchangePanel contact={contact} canEdit={canEdit} onUpdateContact={onUpdateContact} />
              </section>
              <section className="flex min-h-[240px] min-w-0 flex-1 flex-col overflow-hidden">
                <ContactDossierDrawer variant="embedded_minimal" contact={contact} open onClose={() => {}} canEdit={canEdit} />
              </section>
            </div>
          </main>

          {/* Colonne droite — contexte entreprise */}
          <aside className="w-full shrink-0 bg-[#f7f8fa] p-4 xl:w-[300px]">
            <div className="space-y-3">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{isFr ? 'Entreprise' : 'Company'}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{contact.company}</p>
                {contact.workEmail && (
                  <p className="mt-2 text-xs text-slate-600">
                    <i className="fas fa-envelope mr-1.5 text-slate-400" aria-hidden />
                    {contact.workEmail}
                  </p>
                )}
                {(contact.officePhone || contact.mobilePhone) && (
                  <p className="mt-1 text-xs text-slate-600">
                    <i className="fas fa-phone mr-1.5 text-slate-400" aria-hidden />
                    {contact.mobilePhone || contact.officePhone}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{isFr ? 'À suivre' : 'Next steps'}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">CRM</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {isFr
                    ? 'Enrichissez le dossier depuis l’onglet central (notes, liens). Les webhooks et automatisations se configurent dans Paramètres.'
                    : 'Enrich the record from the center panel (notes, links). Webhooks are configured in Settings.'}
                </p>
              </section>

              {canEdit && contact.status !== 'Customer' && (
                <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">{isFr ? 'Conversion' : 'Conversion'}</p>
                  <p className="mt-1 text-xs text-emerald-900">
                    {isFr ? 'Passez le contact en « Client » depuis la liste ou l’édition rapide.' : 'Mark as Customer from the list or quick edit.'}
                  </p>
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CRMContactDetailPage;
