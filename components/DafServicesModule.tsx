import React, { useCallback, useEffect, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import {
  DafService,
  DafRequestCategory,
  DafServiceRequest,
  DafRequestKind,
  DafRequestStatus,
} from '../services/dafService';
import DafRequestDetailModal from './DafRequestDetailModal';

const CATEGORIES: { id: DafRequestCategory; labelFr: string }[] = [
  { id: 'supplies', labelFr: 'Fournitures' },
  { id: 'logistics', labelFr: 'Logistique' },
  { id: 'it_misc', labelFr: 'IT / divers' },
  { id: 'vehicle', labelFr: 'Véhicule / parc' },
  { id: 'furniture', labelFr: 'Mobilier / locaux' },
  { id: 'travel', labelFr: 'Déplacement / mission' },
  { id: 'other', labelFr: 'Autre' },
];

const KINDS: { id: DafRequestKind; labelKey: string }[] = [
  { id: 'general', labelKey: 'daf_kind_general' },
  { id: 'document_delivery', labelKey: 'daf_kind_document_delivery' },
  { id: 'information', labelKey: 'daf_kind_information' },
  { id: 'signature_workflow', labelKey: 'daf_kind_signature_workflow' },
];

const DafServicesModule: React.FC = () => {
  const { t, language } = useLocalization();
  const [requests, setRequests] = useState<DafServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DafRequestCategory>('other');
  const [requestKind, setRequestKind] = useState<DafRequestKind>('general');
  const [saving, setSaving] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);
  const [myProfileId, setMyProfileId] = useState('');
  const [detail, setDetail] = useState<DafServiceRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const ctx = await DafService.getProfileContext();
    if (ctx.error) setErrorMsg(String((ctx.error as any)?.message ?? ctx.error));
    else if (ctx.data) {
      setIsReviewer(ctx.data.isReviewer);
      setMyProfileId(ctx.data.profileId);
    }
    const res = await DafService.listMyRequests();
    if (res.error) setErrorMsg(String((res.error as any)?.message ?? res.error));
    else {
      setRequests(res.data);
      setDetail((d) => {
        if (!d) return d;
        const f = res.data!.find((x) => x.id === d.id);
        return f ?? d;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = (s: DafRequestStatus) => t(`daf_status_${s}`) || s;
  const kindLabel = (k: DafRequestKind) => t(`daf_kind_${k}`) || k;
  const assignmentLabel = (r: DafServiceRequest) => {
    if (!isReviewer) return null;
    if (!r.assignee_profile_id) return t('daf_assign_unassigned');
    if (r.assignee_profile_id === myProfileId) return t('daf_assign_me');
    return t('daf_assign_other');
  };

  const onSave = async (status: 'draft' | 'submitted') => {
    if (!title.trim()) {
      setErrorMsg(language === 'fr' ? 'Le titre est obligatoire.' : 'Title is required.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const res = await DafService.createRequest({
      title: title.trim(),
      description: description.trim() || null,
      category,
      request_kind: requestKind,
      status,
    });
    if (res.error) setErrorMsg(String((res.error as any)?.message ?? res.error));
    else {
      setTitle('');
      setDescription('');
      setCategory('other');
      setRequestKind('general');
      await load();
    }
    setSaving(false);
  };

  const onDeleteDraft = async (id: string) => {
    if (!confirm(language === 'fr' ? 'Supprimer ce brouillon ?' : 'Delete this draft?')) return;
    const { error } = await DafService.deleteDraft(id);
    if (error) setErrorMsg(String((error as any)?.message ?? error));
    else await load();
  };

  const submitDraft = async (id: string) => {
    const { error } = await DafService.updateRequest(id, { status: 'submitted' });
    if (error) setErrorMsg(String((error as any)?.message ?? error));
    else await load();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">{t('daf_services_title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('daf_services_subtitle')}</p>
          <p className="mt-2 text-xs text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{t('daf_intro_workflows')}</p>
        </header>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMsg}</div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('daf_new_request')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('daf_title_field')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('daf_request_kind')}</label>
              <select
                value={requestKind}
                onChange={(e) => setRequestKind(e.target.value as DafRequestKind)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={saving}
              >
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {t(k.labelKey)}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{t('daf_request_kind_help')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('daf_category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DafRequestCategory)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={saving}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.labelFr}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('daf_description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={saving}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSave('draft')}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('daf_save_draft')}
            </button>
            <button
              type="button"
              onClick={() => void onSave('submitted')}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {t('daf_submit')}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-3 font-semibold text-slate-900">
            {isReviewer ? t('daf_queue_org') : t('daf_my_requests')}
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">…</div>
          ) : (isReviewer ? requests.filter((r) => !r.assignee_profile_id || r.assignee_profile_id === myProfileId) : requests).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">{t('daf_empty_list')}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(isReviewer ? requests.filter((r) => !r.assignee_profile_id || r.assignee_profile_id === myProfileId) : requests).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full text-left px-6 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/80"
                    onClick={() => setDetail(r)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{r.title}</div>
                        {isReviewer && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                              !r.assignee_profile_id
                                ? 'bg-slate-50 text-slate-700 border-slate-200'
                                : r.assignee_profile_id === myProfileId
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                            title={assignmentLabel(r) || ''}
                          >
                            {assignmentLabel(r)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {kindLabel(r.request_kind)} · {CATEGORIES.find((c) => c.id === r.category)?.labelFr ?? r.category} ·{' '}
                        {statusLabel(r.status)} · {new Date(r.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-GB')}
                      </div>
                      {r.daf_comment && (
                        <div className="text-xs text-indigo-700 mt-1">
                          {t('daf_daf_comment')}: {r.daf_comment}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {r.status === 'draft' && r.requester_profile_id === myProfileId && (
                        <>
                          <button
                            type="button"
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                            onClick={() => void submitDraft(r.id)}
                          >
                            {t('daf_submit')}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => void onDeleteDraft(r.id)}
                          >
                            {t('delete')}
                          </button>
                        </>
                      )}
                      <span className="text-xs text-slate-400">{t('daf_open_detail')}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DafRequestDetailModal
        request={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        onUpdated={() => void load()}
        language={language === Language.EN ? 'en' : 'fr'}
        t={t}
        isReviewer={isReviewer}
        myProfileId={myProfileId}
      />
    </div>
  );
};

export default DafServicesModule;
