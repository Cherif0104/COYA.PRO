import React, { useCallback, useEffect, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Contact, Translation } from '../types';
import OrganizationService from '../services/organizationService';
import {
  deleteContactDossierItem,
  insertContactDossierItem,
  listContactDossierItems,
  type ContactDossierItemRow,
  type ContactDossierKind,
} from '../services/contactDossierService';
import { useAuth } from '../contexts/AuthContextSupabase';

type TabId = 'timeline' | 'notes' | 'files';

type Props = {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  /** Panneau latéral (défaut) ou bloc intégré dans une page (ex. fiche contact). */
  variant?: 'drawer' | 'embedded';
};

const ContactDossierDrawer: React.FC<Props> = ({ contact, open, onClose, canEdit, variant = 'drawer' }) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>('timeline');
  const [items, setItems] = useState<ContactDossierItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fileLabel, setFileLabel] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const resolvedOrgId = contact?.organizationId ?? orgId;

  const embedded = variant === 'embedded';

  const load = useCallback(async () => {
    if (!contact) return;
    if (!embedded && !open) return;
    setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await listContactDossierItems(String(contact.id));
      if (error) {
        setMsg(error.message);
        setItems([]);
        return;
      }
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }, [contact, open, embedded]);

  useEffect(() => {
    if ((open || embedded) && !contact?.organizationId) {
      void OrganizationService.getCurrentUserOrganizationId().then(setOrgId);
    }
  }, [open, embedded, contact?.organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async (kind: ContactDossierKind, payload: { title: string; body?: string; metadata?: Record<string, unknown> }) => {
    if (!contact || !resolvedOrgId || !canEdit) return;
    setMsg(null);
    const { error } = await insertContactDossierItem({
      organizationId: resolvedOrgId,
      contactId: String(contact.id),
      kind,
      title: payload.title,
      body: payload.body ?? null,
      metadata: payload.metadata ?? {},
      createdByUserId: user?.id ?? null,
    });
    if (error) setMsg(error.message);
    else {
      if (kind === 'note') {
        setNoteTitle('');
        setNoteBody('');
      }
      if (kind === 'link') {
        setLinkTitle('');
        setLinkUrl('');
      }
      if (kind === 'file') {
        setFileLabel('');
        setFileUrl('');
      }
      await load();
    }
  };

  const onDelete = async (id: string) => {
    if (!canEdit || !window.confirm(String(t('crm_dossier_confirm_delete')))) return;
    const { error } = await deleteContactDossierItem(id);
    if (error) setMsg(error.message);
    else await load();
  };

  if (!contact) return null;
  if (!embedded && !open) return null;

  const timelineItems = items;
  const notesOnly = items.filter((i) => i.kind === 'note');
  const filesLinks = items.filter((i) => i.kind === 'link' || i.kind === 'file');

  const tabBtn = (id: TabId, labelKey: keyof Translation) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
        tab === id ? 'border-emerald-600 text-emerald-900 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {t(labelKey)}
    </button>
  );

  const nav = (
    <nav className="shrink-0 flex border-b border-slate-200 px-2 bg-slate-50/80">
      {tabBtn('timeline', 'crm_dossier_tab_timeline')}
      {tabBtn('notes', 'crm_dossier_tab_notes')}
      {tabBtn('files', 'crm_dossier_tab_files')}
    </nav>
  );

  const body = (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {msg && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{msg}</p>}

          {tab === 'timeline' && (
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">{t('loading')}</p>
              ) : timelineItems.length === 0 ? (
                <p className="text-sm text-slate-500">{t('crm_dossier_empty_timeline')}</p>
              ) : (
                <ul className="space-y-3">
                  {timelineItems.map((row) => (
                    <li key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.kind}</span>
                        <time className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleString()}</time>
                      </div>
                      {row.title && <p className="text-sm font-semibold text-slate-900 mt-1">{row.title}</p>}
                      {row.body && <pre className="text-xs text-slate-700 whitespace-pre-wrap mt-1 font-sans">{row.body}</pre>}
                      {row.kind === 'link' && row.metadata && typeof (row.metadata as any).url === 'string' && (
                        <a
                          href={String((row.metadata as any).url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-700 underline break-all"
                        >
                          {(row.metadata as any).url}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-4">
              {canEdit && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white">
                  <p className="text-xs font-semibold text-slate-700">{t('crm_dossier_add_note')}</p>
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder={String(t('crm_dossier_note_title_ph'))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={3}
                    placeholder={String(t('crm_dossier_note_body_ph'))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={!noteTitle.trim()}
                    onClick={() => void onAdd('note', { title: noteTitle.trim(), body: noteBody.trim() || undefined })}
                    className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50"
                  >
                    {t('crm_dossier_save_note')}
                  </button>
                </div>
              )}
              {notesOnly.length === 0 ? (
                <p className="text-sm text-slate-500">{t('crm_dossier_empty_notes')}</p>
              ) : (
                <ul className="space-y-2">
                  {notesOnly.map((row) => (
                    <li key={row.id} className="rounded-xl border border-slate-100 p-3 flex justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                        {row.body && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{row.body}</p>}
                        <p className="text-[10px] text-slate-400 mt-2">{new Date(row.created_at).toLocaleString()}</p>
                      </div>
                      {canEdit && (
                        <button type="button" onClick={() => void onDelete(row.id)} className="text-red-600 text-xs shrink-0">
                          {t('delete')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'files' && (
            <div className="space-y-4">
              {canEdit && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                  <p className="text-xs font-semibold text-slate-700">{t('crm_dossier_add_link')}</p>
                  <input
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder={String(t('crm_dossier_link_title_ph'))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={!linkTitle.trim() || !linkUrl.trim()}
                    onClick={() =>
                      void onAdd('link', {
                        title: linkTitle.trim(),
                        metadata: { url: linkUrl.trim() },
                      })
                    }
                    className="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50"
                  >
                    {t('crm_dossier_save_link')}
                  </button>
                  <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">{t('crm_dossier_add_file_ref')}</p>
                    <input
                      value={fileLabel}
                      onChange={(e) => setFileLabel(e.target.value)}
                      placeholder={String(t('crm_dossier_file_label_ph'))}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                    />
                    <input
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder={String(t('crm_dossier_file_url_ph'))}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                    />
                    <button
                      type="button"
                      disabled={!fileLabel.trim() || !fileUrl.trim()}
                      onClick={() =>
                        void onAdd('file', {
                          title: fileLabel.trim(),
                          metadata: { url: fileUrl.trim(), kind: 'external_ref' },
                        })
                      }
                      className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-800 font-medium disabled:opacity-50"
                    >
                      {t('crm_dossier_save_file_ref')}
                    </button>
                  </div>
                </div>
              )}
              {filesLinks.length === 0 ? (
                <p className="text-sm text-slate-500">{t('crm_dossier_empty_files')}</p>
              ) : (
                <ul className="space-y-2">
                  {filesLinks.map((row) => (
                    <li key={row.id} className="rounded-xl border border-slate-100 p-3 flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                        {(row.metadata as any)?.url && (
                          <a
                            href={String((row.metadata as any).url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-sky-700 underline break-all"
                          >
                            {(row.metadata as any).url}
                          </a>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">{row.kind}</p>
                      </div>
                      {canEdit && (
                        <button type="button" onClick={() => void onDelete(row.id)} className="text-red-600 text-xs shrink-0">
                          {t('delete')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-[320px] max-h-[min(70vh,640px)] shadow-sm">
        <header className="shrink-0 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t('crm_dossier_badge')}</p>
          <h2 className="text-base font-bold text-slate-900 truncate mt-0.5">{contact.name}</h2>
          {contact.company ? <p className="text-xs text-slate-500 truncate">{contact.company}</p> : null}
        </header>
        {nav}
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" aria-label="Close" onClick={onClose} />
      <aside className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-[slideIn_.2s_ease-out]">
        <style>{`@keyframes slideIn{from{transform:translateX(12px);opacity:.85}to{transform:translateX(0);opacity:1}}`}</style>
        <header className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t('crm_dossier_badge')}</p>
            <h2 className="text-lg font-bold text-slate-900 truncate">{contact.name}</h2>
            <p className="text-xs text-slate-500 truncate">{contact.company}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label={t('crm_email_close')}
          >
            ×
          </button>
        </header>
        {nav}
        {body}
      </aside>
    </div>
  );
};

export default ContactDossierDrawer;
