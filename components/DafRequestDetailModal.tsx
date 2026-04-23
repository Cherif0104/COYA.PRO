import React, { useCallback, useEffect, useState } from 'react';
import {
  DafService,
  DafServiceRequest,
  DafRequestMessage,
  DafRequestAttachment,
  DafAttachmentKind,
  DafMessageVisibility,
} from '../services/dafService';

type Lang = 'fr' | 'en';

type Props = {
  request: DafServiceRequest | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  language: Lang;
  t: (key: string) => string;
  isReviewer: boolean;
  myProfileId: string;
};

const fmtStatus = (s: string, t: Props['t']) => t(`daf_status_${s}`) || s;
const fmtKind = (k: string, t: Props['t']) => t(`daf_kind_${k}`) || k;
const fmtAttach = (k: string, t: Props['t']) => t(`daf_attach_${k}`) || k;

const DafRequestDetailModal: React.FC<Props> = ({
  request,
  open,
  onClose,
  onUpdated,
  language,
  t,
  isReviewer,
  myProfileId,
}) => {
  const [messages, setMessages] = useState<DafRequestMessage[]>([]);
  const [attachments, setAttachments] = useState<DafRequestAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [msgBody, setMsgBody] = useState('');
  const [msgLink, setMsgLink] = useState('');
  const [msgVisibility, setMsgVisibility] = useState<DafMessageVisibility>('public');

  const [dafNote, setDafNote] = useState('');

  const loadThread = useCallback(async () => {
    if (!request) return;
    setLoading(true);
    setErr(null);
    const [m, a] = await Promise.all([DafService.listMessages(request.id), DafService.listAttachments(request.id)]);
    if (m.error) setErr(String((m.error as any)?.message ?? m.error));
    else setMessages(m.data);
    if (a.error) setErr(String((a.error as any)?.message ?? a.error));
    else setAttachments(a.data);
    setLoading(false);
  }, [request]);

  useEffect(() => {
    if (open && request) void loadThread();
    else {
      setMessages([]);
      setAttachments([]);
      setMsgBody('');
      setMsgLink('');
      setMsgVisibility('public');
      setDafNote('');
    }
  }, [open, request, loadThread]);

  const refreshAll = async () => {
    await loadThread();
    onUpdated();
  };

  const sendMessage = async () => {
    if (!request || !msgBody.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await DafService.addMessage({
      requestId: request.id,
      organizationId: request.organization_id,
      body: msgBody,
      linkUrl: msgLink.trim() || null,
      visibility: isReviewer ? msgVisibility : 'public',
    });
    if (error) setErr(String((error as any)?.message ?? error));
    else {
      setMsgBody('');
      setMsgLink('');
      setMsgVisibility('public');
      await refreshAll();
    }
    setBusy(false);
  };

  const patchRequest = async (patch: Parameters<typeof DafService.updateRequest>[1]) => {
    if (!request) return;
    setBusy(true);
    setErr(null);
    const { error } = await DafService.updateRequest(request.id, patch);
    if (error) setErr(String((error as any)?.message ?? error));
    else await refreshAll();
    setBusy(false);
  };

  const onUpload = async (file: File | null, kind: DafAttachmentKind) => {
    if (!request || !file) return;
    setBusy(true);
    setErr(null);
    const { error } = await DafService.uploadAttachment({
      requestId: request.id,
      organizationId: request.organization_id,
      file,
      attachmentKind: kind,
    });
    if (error) setErr(String((error as any)?.message ?? error));
    else await refreshAll();
    setBusy(false);
  };

  const downloadAtt = async (att: DafRequestAttachment) => {
    const { url, error } = await DafService.getAttachmentDownloadUrl(att);
    if (error || !url) {
      setErr(String((error as any)?.message ?? error ?? 'URL'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isRequester = request && request.requester_profile_id === myProfileId;
  const isAssignee = request && request.assignee_profile_id === myProfileId;

  if (!open || !request) return null;

  const wfHint =
    request.request_kind === 'document_delivery'
      ? t('daf_wf_hint_document')
      : request.request_kind === 'information'
        ? t('daf_wf_hint_information')
        : request.request_kind === 'signature_workflow'
          ? t('daf_wf_hint_signature')
          : t('daf_wf_hint_general');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between gap-3 items-start">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{request.title}</h2>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-2 gap-y-1">
              <span>{fmtKind(request.request_kind, t)}</span>
              <span>·</span>
              <span>{fmtStatus(request.status, t)}</span>
              {request.request_kind === 'signature_workflow' && (
                <>
                  <span>·</span>
                  <span>
                    {t('daf_signature_phase')}: {t(`daf_phase_${request.signature_phase}`) || request.signature_phase}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-indigo-700 mt-2 leading-snug">{wfHint}</p>
          </div>
          <button
            type="button"
            className="shrink-0 text-slate-500 hover:text-slate-800 text-sm font-semibold"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</div>}

          {request.description && (
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">{t('daf_description')}</div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {request.daf_comment && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm text-indigo-900">
              <span className="font-semibold">{t('daf_daf_comment')}:</span> {request.daf_comment}
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-slate-900 mb-2">{t('daf_thread_title')}</div>
            {loading ? (
              <p className="text-xs text-slate-500">…</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-500">{t('daf_thread_empty')}</p>
            ) : (
              <ul className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/80 max-h-48 overflow-y-auto">
                {messages.map((m) => (
                  <li key={m.id} className="text-xs border-b border-slate-200/80 last:border-0 pb-2 last:pb-0">
                    <div className="text-slate-400">
                      {new Date(m.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-GB')} —{' '}
                      {m.author_profile_id === myProfileId ? t('daf_you') : t('daf_participant')}
                      {m.visibility === 'daf_internal' ? ` (${t('daf_internal_note')})` : ''}
                    </div>
                    {m.body && <p className="text-slate-800 mt-1 whitespace-pre-wrap">{m.body}</p>}
                    {m.link_url && (
                      <a href={m.link_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline break-all">
                        {m.link_url}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900 mb-2">{t('daf_attachments_title')}</div>
            {attachments.length === 0 ? (
              <p className="text-xs text-slate-500">{t('daf_attachments_empty')}</p>
            ) : (
              <ul className="space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-slate-700 truncate">
                      {a.file_name}{' '}
                      <span className="text-slate-400">({fmtAttach(a.attachment_kind, t)})</span>
                    </span>
                    <button type="button" className="text-indigo-600 font-semibold hover:underline shrink-0" onClick={() => void downloadAtt(a)}>
                      {t('daf_download')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(isRequester || isReviewer) && request.status !== 'fulfilled' && request.status !== 'rejected' && request.status !== 'cancelled' && (
            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-900">{t('daf_add_message')}</div>
              <textarea
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                disabled={busy}
                placeholder={t('daf_message_placeholder')}
              />
              <input
                value={msgLink}
                onChange={(e) => setMsgLink(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                disabled={busy}
                placeholder={t('daf_link_placeholder')}
              />
              {isReviewer && (
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={msgVisibility === 'daf_internal'}
                    onChange={(e) => setMsgVisibility(e.target.checked ? 'daf_internal' : 'public')}
                  />
                  {t('daf_internal_only')}
                </label>
              )}
              <button
                type="button"
                disabled={busy || !msgBody.trim()}
                onClick={() => void sendMessage()}
                className="rounded-lg bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
              >
                {t('daf_post_message')}
              </button>
            </div>
          )}

          {isReviewer && !['draft', 'cancelled'].includes(request.status) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <div className="text-sm font-semibold text-amber-900">{t('daf_reviewer_actions')}</div>

              {request.assignee_profile_id == null && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void patchRequest({ assignee_profile_id: myProfileId })}
                  className="rounded-lg bg-amber-900 text-white text-xs font-semibold px-3 py-1.5"
                >
                  {t('daf_action_take_ownership')}
                </button>
              )}

              {request.status === 'submitted' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void patchRequest({ status: 'in_review' })}
                  className="mr-2 rounded-lg bg-amber-700 text-white text-xs font-semibold px-3 py-1.5"
                >
                  {t('daf_action_take_in_review')}
                </button>
              )}

              {request.status === 'in_review' && (isAssignee || request.assignee_profile_id == null) && (
                <div className="flex flex-wrap gap-2 items-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ status: 'awaiting_requester', daf_comment: dafNote || request.daf_comment })}
                    className="rounded-lg border border-amber-800 text-amber-950 text-xs font-semibold px-3 py-1.5"
                  >
                    {t('daf_action_await_requester')}
                  </button>
                  <input
                    value={dafNote}
                    onChange={(e) => setDafNote(e.target.value)}
                    placeholder={t('daf_optional_comment')}
                    className="flex-1 min-w-[120px] rounded-lg border border-amber-200 px-2 py-1 text-xs"
                  />
                </div>
              )}

              {request.status === 'in_review' && request.request_kind === 'document_delivery' && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-900">{t('daf_upload_deliverable')}</p>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                    <span className="rounded-lg bg-amber-700 text-white px-3 py-1.5">{t('daf_choose_file')}</span>
                    <input type="file" className="hidden" disabled={busy} onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'daf_deliverable')} />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ status: 'fulfilled' })}
                    className="block rounded-lg bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 mt-1"
                  >
                    {t('daf_action_close_document')}
                  </button>
                </div>
              )}

              {request.status === 'in_review' && request.request_kind === 'information' && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-900">{t('daf_info_upload_hint')}</p>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                    <span className="rounded-lg bg-amber-700 text-white px-3 py-1.5">{t('daf_attach_info_file')}</span>
                    <input type="file" className="hidden" disabled={busy} onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'info_answer')} />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ status: 'fulfilled' })}
                    className="block rounded-lg bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 mt-1"
                  >
                    {t('daf_action_close_information')}
                  </button>
                </div>
              )}

              {request.status === 'in_review' && request.request_kind === 'signature_workflow' && (
                <div className="space-y-2">
                  <p className="text-xs text-amber-900">{t('daf_signature_reviewer_hint')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void patchRequest({ status: 'pending_external_signature', signature_phase: 'sent_for_signature' })
                      }
                      className="rounded-lg bg-amber-800 text-white text-xs font-semibold px-3 py-1.5"
                    >
                      {t('daf_action_mark_sent_sign')}
                    </button>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                      <span className="rounded-lg bg-slate-700 text-white px-3 py-1.5">{t('daf_upload_signed_return')}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'signature_signed')}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patchRequest({ signature_phase: 'signed_returned', status: 'fulfilled' })}
                      className="rounded-lg bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5"
                    >
                      {t('daf_action_close_after_signature')}
                    </button>
                  </div>
                </div>
              )}

              {request.status === 'pending_external_signature' && request.request_kind === 'signature_workflow' && (
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                    <span className="rounded-lg bg-slate-700 text-white px-3 py-1.5">{t('daf_upload_signed_return')}</span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'signature_signed')}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ signature_phase: 'signed_returned', status: 'in_review' })}
                    className="rounded-lg bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5"
                  >
                    {t('daf_action_signed_received')}
                  </button>
                </div>
              )}

              {request.status === 'in_review' && request.request_kind === 'general' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ status: 'approved' })}
                    className="rounded-lg bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5"
                  >
                    {t('daf_action_approve')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ status: 'rejected' })}
                    className="rounded-lg bg-red-600 text-white text-xs font-semibold px-3 py-1.5"
                  >
                    {t('daf_action_reject')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchRequest({ status: 'fulfilled' })}
                    className="rounded-lg bg-slate-700 text-white text-xs font-semibold px-3 py-1.5"
                  >
                    {t('daf_action_fulfill')}
                  </button>
                </div>
              )}
            </div>
          )}

          {isRequester && request.status === 'awaiting_requester' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <p className="text-xs text-blue-900 font-semibold">{t('daf_requester_reply_hint')}</p>
              <p className="text-xs text-blue-800">{t('daf_requester_upload_support')}</p>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-900 cursor-pointer">
                <span className="rounded-lg bg-blue-700 text-white px-3 py-1.5">{t('daf_choose_file')}</span>
                <input type="file" className="hidden" disabled={busy} onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'supporting')} />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void patchRequest({ status: 'in_review' })}
                className="rounded-lg bg-blue-800 text-white text-xs font-semibold px-3 py-1.5"
              >
                {t('daf_action_requester_done')}
              </button>
            </div>
          )}

          {isRequester && ['draft', 'submitted', 'awaiting_requester'].includes(request.status) && (
            <div className="rounded-xl border border-slate-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-700">{t('daf_requester_files')}</p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <span className="rounded-lg bg-slate-200 px-3 py-1.5">{t('daf_attach_supporting')}</span>
                <input type="file" className="hidden" disabled={busy} onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'supporting')} />
              </label>
              {request.request_kind === 'signature_workflow' && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <span className="rounded-lg bg-slate-200 px-3 py-1.5">{t('daf_attach_signature_original')}</span>
                  <input
                    type="file"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => void onUpload(e.target.files?.[0] ?? null, 'signature_original')}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button type="button" className="text-sm font-semibold text-slate-600 hover:text-slate-900" onClick={onClose}>
            {t('daf_close_detail')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DafRequestDetailModal;
