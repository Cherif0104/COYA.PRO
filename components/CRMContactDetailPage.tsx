import React, { useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Contact } from '../types';
import { Language } from '../types';
import * as dataCollectionService from '../services/dataCollectionService';
import { getCollectePayloadFieldLabel } from '../utils/collecteParticipantFields';
import ContactDossierDrawer from './ContactDossierDrawer';

const statusStyles: Record<Contact['status'], string> = {
  Lead: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Prospect: 'bg-purple-100 text-purple-800',
  Customer: 'bg-green-100 text-green-800',
};

type Props = {
  contact: Contact;
  onBack: () => void;
  onRequestEdit: (c: Contact) => void;
  onRequestDelete: (id: string | number) => void;
  onDraftEmail: (c: Contact) => void;
  /** Ouvre l’onglet Collecte avec la campagne présélectionnée (sessionStorage déjà géré par le parent si besoin). */
  onGoToCollecteCampaign?: (collectionId: string) => void;
  canEdit: boolean;
};

function fieldRow(label: string, value: React.ReactNode) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-900 mt-0.5 break-words">{value ?? '—'}</p>
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
}) => {
  const { t, language } = useLocalization();
  const isFr = language === Language.FR;

  const { submission, collection } = useMemo(() => dataCollectionService.resolveCollecteContext(contact), [contact]);

  const collecteRows = useMemo(() => {
    if (!submission?.payload) return [];
    return Object.entries(submission.payload).sort(([a], [b]) => a.localeCompare(b));
  }, [submission]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-900">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 w-fit"
        >
          <i className="fas fa-arrow-left" aria-hidden />
          {t('crm_contact_detail_back')}
        </button>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => onDraftEmail(contact)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
          >
            <i className="fas fa-magic" aria-hidden />
            {t('crm_contact_detail_draft_email')}
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => onRequestEdit(contact)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50"
              >
                <i className="fas fa-edit" aria-hidden />
                {t('crm_contact_detail_edit')}
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(contact.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50"
              >
                <i className="fas fa-trash" aria-hidden />
                {t('crm_contact_detail_delete')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
          <img
            src={contact.avatar || undefined}
            alt=""
            className="w-24 h-24 rounded-2xl object-cover border border-slate-100 shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('crm_contact_detail_title')}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 truncate">{contact.name}</h1>
            <p className="text-slate-600 mt-1">{contact.company}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[contact.status]}`}>
                {t(contact.status.toLowerCase())}
              </span>
              {contact.sourceCollectionId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-900 border border-sky-100">
                  {collection?.name ?? `${String(contact.sourceCollectionId).slice(0, 8)}…`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">{t('crm_contact_detail_section_crm')}</h2>
            <div>
              {fieldRow(t('work_email'), contact.workEmail)}
              {fieldRow(t('personal_email'), contact.personalEmail)}
              {fieldRow(t('office_phone'), contact.officePhone)}
              {fieldRow(t('mobile_phone'), contact.mobilePhone)}
              {fieldRow(t('whatsapp_number'), contact.whatsappNumber)}
              {fieldRow(t('contact_category'), contact.categoryName || contact.categoryId || '—')}
              {fieldRow(t('crm_contact_detail_source'), contact.source || '—')}
              {fieldRow(t('crm_contact_detail_created_by'), contact.createdByName || contact.createdById || '—')}
              {fieldRow(t('crm_contact_detail_notes'), contact.notes ? <span className="whitespace-pre-wrap">{contact.notes}</span> : '—')}
              {fieldRow(
                t('crm_contact_detail_tags'),
                contact.tags?.length ? (
                  <span className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  '—'
                ),
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('crm_contact_detail_section_collecte')}</h2>
              {collection?.id && onGoToCollecteCampaign && (
                <button
                  type="button"
                  onClick={() => onGoToCollecteCampaign(collection.id)}
                  className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap"
                >
                  {t('crm_contact_detail_go_collecte')}
                </button>
              )}
            </div>
            {!submission ? (
              <p className="text-sm text-slate-500">{t('crm_contact_detail_collecte_no_local')}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {t('crm_contact_detail_collecte_submitted_at')}{' '}
                  <time className="font-medium text-slate-700">{new Date(submission.submittedAt).toLocaleString()}</time>
                </p>
                {collecteRows.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('crm_contact_detail_collecte_empty_payload')}</p>
                ) : (
                  <dl className="rounded-xl border border-slate-100 divide-y divide-slate-100">
                    {collecteRows.map(([key, val]) => (
                      <div key={key} className="px-3 py-2.5 sm:grid sm:grid-cols-5 sm:gap-3">
                        <dt className="text-xs font-semibold text-slate-500 sm:col-span-2">{getCollectePayloadFieldLabel(key, isFr)}</dt>
                        <dd className="text-sm text-slate-900 sm:col-span-3 mt-1 sm:mt-0 break-words">{val || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-5 min-h-0">
          <ContactDossierDrawer
            variant="embedded"
            contact={contact}
            open
            onClose={() => {}}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default CRMContactDetailPage;
