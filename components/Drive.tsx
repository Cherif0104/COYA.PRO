import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { DriveItem, DriveService } from '../services/driveService';

type ViewMode = 'browse' | 'recent' | 'search' | 'trash';

function formatSize(bytes?: number | null) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

const Drive: React.FC = () => {
  const { t } = useLocalization();
  const [view, setView] = useState<ViewMode>('browse');
  const [parentId, setParentId] = useState<string | null>(null);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [trashedItems, setTrashedItems] = useState<DriveItem[]>([]);
  const [recentItems, setRecentItems] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DriveItem[]>([]);
  const [activeItem, setActiveItem] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('__root__');
  const [allFoldersForMove, setAllFoldersForMove] = useState<DriveItem[]>([]);
  const [folderAclCap, setFolderAclCap] = useState<'owner' | 'editor' | 'viewer' | 'admin' | 'none'>('none');
  const [folderAclRows, setFolderAclRows] = useState<{ profile_id: string; permission: string }[]>([]);
  const [orgProfiles, setOrgProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [aclAddProfileId, setAclAddProfileId] = useState('');
  const [aclAddPermission, setAclAddPermission] = useState<'viewer' | 'editor'>('viewer');

  const folders = useMemo(() => items.filter((i) => i.item_type === 'folder'), [items]);
  const files = useMemo(() => items.filter((i) => i.item_type !== 'folder'), [items]);
  const folderById = useMemo(() => {
    const m = new Map<string, DriveItem>();
    allFoldersForMove.forEach((f) => m.set(f.id, f));
    return m;
  }, [allFoldersForMove]);

  const flattenedFolderOptions = useMemo(() => {
    const childrenByParent = new Map<string | null, DriveItem[]>();
    for (const f of allFoldersForMove) {
      const key = f.parent_id ?? null;
      const arr = childrenByParent.get(key) ?? [];
      arr.push(f);
      childrenByParent.set(key, arr);
    }
    for (const [k, arr] of childrenByParent.entries()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      childrenByParent.set(k, arr);
    }

    const out: Array<{ id: string; label: string }> = [];
    const walk = (pid: string | null, depth: number) => {
      const children = childrenByParent.get(pid) ?? [];
      for (const c of children) {
        const prefix = depth === 0 ? '' : `${'—'.repeat(Math.min(8, depth))} `;
        out.push({ id: c.id, label: `${prefix}${c.name}` });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [allFoldersForMove]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (view === 'trash') {
        const res = await DriveService.listTrashed();
        if (res.error) throw res.error;
        setTrashedItems(res.data);
        return;
      }
      if (view === 'recent') {
        const res = await DriveService.listRecent(40);
        if (res.error) throw res.error;
        setRecentItems(res.data);
        return;
      }
      if (view === 'search') {
        const res = await DriveService.search(searchQuery, 80);
        if (res.error) throw res.error;
        setSearchResults(res.data);
        return;
      }

      const [listRes, crumbRes, foldersRes] = await Promise.all([
        DriveService.list(parentId),
        DriveService.getBreadcrumbs(parentId),
        DriveService.listAllFolders(),
      ]);
      if (listRes.error) throw listRes.error;
      if (foldersRes.error) throw foldersRes.error;
      setItems(listRes.data);
      setBreadcrumbs(crumbRes.data);
      setAllFoldersForMove(foldersRes.data);
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [parentId, searchQuery, view]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeItem || activeItem.item_type !== 'folder') {
      setFolderAclCap('none');
      setFolderAclRows([]);
      setOrgProfiles([]);
      setAclAddProfileId('');
      return;
    }
    let cancelled = false;
    (async () => {
      const cap = await DriveService.getMyFolderCapability(activeItem.id);
      if (cancelled) return;
      setFolderAclCap(cap.level);
      const canManageAcl = cap.level === 'owner' || cap.level === 'admin' || cap.level === 'editor';
      if (!canManageAcl) {
        setFolderAclRows([]);
        setOrgProfiles([]);
        return;
      }
      const [aclRes, profRes] = await Promise.all([
        DriveService.listFolderAcl(activeItem.id),
        DriveService.listOrganizationProfiles(),
      ]);
      if (cancelled) return;
      if (aclRes.error) setFolderAclRows([]);
      else setFolderAclRows(aclRes.data);
      if (profRes.error) setOrgProfiles([]);
      else setOrgProfiles(profRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeItem]);

  useEffect(() => {
    if (view !== 'browse') return;
    // Quand on revient en navigation, on recharge l'arborescence pour move/dnd.
    void DriveService.listAllFolders().then((res) => {
      if (!res.error) setAllFoldersForMove(res.data);
    });
  }, [view]);

  const onCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await DriveService.createFolder({ parentId, name });
      if (res.error) throw res.error;
      setNewFolderName('');
      await refresh();
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [newFolderName, parentId, refresh]);

  const onUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.uploadFile({ parentId, file });
        if (res.error) throw res.error;
        await refresh();
      } catch (e: any) {
        setErrorMsg(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [parentId, refresh]
  );

  const onOpenFile = useCallback(async (item: DriveItem) => {
    const res = await DriveService.getDownloadUrl(item);
    if (res.error || !res.data) {
      setErrorMsg(res.error ? String(res.error.message ?? res.error) : 'Lien indisponible');
      return;
    }
    window.open(res.data, '_blank', 'noopener,noreferrer');
  }, []);

  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      setView('browse');
      setParentId(folderId);
    },
    [],
  );

  const onTrash = useCallback(
    async (item: DriveItem) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.trashItem(item.id);
        if (res.error) throw res.error;
        await refresh();
      } catch (e: any) {
        setErrorMsg(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const openActions = useCallback(async (item: DriveItem) => {
    setActiveItem(item);
    setRenameValue(item.name);
    setMoveTargetFolderId(item.parent_id ?? '__root__');
    setAclAddProfileId('');
    setAclAddPermission('viewer');
    const res = await DriveService.listAllFolders();
    if (!res.error) setAllFoldersForMove(res.data.filter((f) => f.id !== item.id));
  }, []);

  const onAddFolderAcl = useCallback(async () => {
    if (!activeItem || activeItem.item_type !== 'folder' || !aclAddProfileId) return;
    if (activeItem.owner_profile_id && aclAddProfileId === activeItem.owner_profile_id) {
      setErrorMsg('Le propriétaire du dossier a déjà tous les droits.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await DriveService.addFolderAcl(activeItem.id, aclAddProfileId, aclAddPermission);
      if (res.error) throw res.error;
      setAclAddProfileId('');
      const aclRes = await DriveService.listFolderAcl(activeItem.id);
      if (!aclRes.error) setFolderAclRows(aclRes.data);
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [activeItem, aclAddProfileId, aclAddPermission]);

  const onRemoveFolderAcl = useCallback(
    async (profileId: string) => {
      if (!activeItem || activeItem.item_type !== 'folder') return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.removeFolderAcl(activeItem.id, profileId);
        if (res.error) throw res.error;
        const aclRes = await DriveService.listFolderAcl(activeItem.id);
        if (!aclRes.error) setFolderAclRows(aclRes.data);
      } catch (e: any) {
        setErrorMsg(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [activeItem],
  );

  const onRename = useCallback(async () => {
    if (!activeItem) return;
    const name = renameValue.trim();
    if (!name) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await DriveService.renameItem(activeItem.id, name);
      if (res.error) throw res.error;
      setActiveItem(null);
      await refresh();
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [activeItem, renameValue, refresh]);

  const onMove = useCallback(async () => {
    if (!activeItem) return;
    const target = moveTargetFolderId === '__root__' ? null : moveTargetFolderId;
    if (target === activeItem.id) {
      setErrorMsg('Déplacement impossible: un dossier ne peut pas se contenir lui-même.');
      return;
    }
    if (activeItem.item_type === 'folder' && target) {
      // Anti-boucle: cible ne doit pas être un descendant.
      let cur: string | null = target;
      const guard = new Set<string>();
      while (cur) {
        if (guard.has(cur)) break;
        guard.add(cur);
        if (cur === activeItem.id) {
          setErrorMsg('Déplacement impossible: la destination est dans ce dossier.');
          return;
        }
        cur = folderById.get(cur)?.parent_id ?? null;
      }
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await DriveService.moveItem(activeItem.id, target);
      if (res.error) throw res.error;
      setActiveItem(null);
      await refresh();
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [activeItem, folderById, moveTargetFolderId, refresh]);

  const onRestore = useCallback(
    async (item: DriveItem) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.restoreItem(item.id);
        if (res.error) throw res.error;
        await refresh();
      } catch (e: any) {
        setErrorMsg(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const onDeleteForever = useCallback(
    async (item: DriveItem) => {
      const ok = window.confirm('Supprimer définitivement ? Cette action est irréversible.');
      if (!ok) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.deletePermanently(item);
        if (res.error) throw res.error;
        await refresh();
      } catch (e: any) {
        setErrorMsg(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const onDragStart = useCallback((e: React.DragEvent, item: DriveItem) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDropOnFolder = useCallback(
    async (e: React.DragEvent, targetFolder: DriveItem) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === targetFolder.id) return;
      // Anti-boucle pour les dossiers: si draggedId est ancêtre de targetFolder.
      let cur: string | null = targetFolder.id;
      const guard = new Set<string>();
      while (cur) {
        if (guard.has(cur)) break;
        guard.add(cur);
        if (cur === draggedId) {
          setErrorMsg('Déplacement impossible: la destination est dans ce dossier.');
          return;
        }
        cur = folderById.get(cur)?.parent_id ?? null;
      }

      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.moveItem(draggedId, targetFolder.id);
        if (res.error) throw res.error;
        await refresh();
      } catch (err: any) {
        setErrorMsg(String(err?.message ?? err));
      } finally {
        setLoading(false);
      }
    },
    [folderById, refresh],
  );

  const onDropOnRoot = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await DriveService.moveItem(draggedId, null);
        if (res.error) throw res.error;
        await refresh();
      } catch (err: any) {
        setErrorMsg(String(err?.message ?? err));
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left navigation (Drive-like) */}
          <aside className="lg:w-64">
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white font-black text-xs">
                  DS
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{t('knowledge_base_title') || 'DOCS SENEGEL'}</div>
                  <div className="text-xs text-slate-500 truncate">{t('knowledge_base_subtitle') || "Espace d'équipe"}</div>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setView('browse')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    view === 'browse' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-folder-open w-4 text-center"></i>
                  {t('drive_my_drive') || 'Mon Drive'}
                </button>
                <button
                  onClick={() => setView('recent')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    view === 'recent' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-clock w-4 text-center"></i>
                  {t('drive_recent') || 'Récents'}
                </button>
                <button
                  onClick={() => setView('search')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    view === 'search' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-magnifying-glass w-4 text-center"></i>
                  {t('drive_search') || 'Recherche'}
                </button>
                <button
                  onClick={() => setView('trash')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    view === 'trash' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-trash w-4 text-center"></i>
                  {t('drive_trash') || 'Corbeille'}
                </button>
              </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                {view === 'browse' && (
                  <div className="space-y-2">
                    <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer">
                      <i className="fas fa-upload"></i>
                      {t('drive_upload') || 'Uploader'}
                      <input type="file" className="hidden" onChange={(e) => void onUpload(e.target.files?.[0] ?? null)} />
                    </label>
                    <p className="text-[10px] text-slate-500 leading-snug">{t('drive_office_only_hint')}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900">{t('knowledge_base_title') || 'DOCS SENEGEL'}</div>
                  <div className="text-xs text-slate-500">
                    {view === 'browse'
                      ? (breadcrumbs.length ? 'Navigation' : 'Racine')
                      : view === 'recent'
                        ? 'Éléments récents'
                        : view === 'trash'
                          ? 'Corbeille'
                          : 'Recherche'}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setView('search');
                      }}
                      placeholder={t('drive_search_placeholder') || 'Rechercher un dossier / fichier…'}
                      className="w-full sm:w-[360px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={() => void refresh()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`}></i>
                    {t('drive_refresh') || 'Actualiser'}
                  </button>
                </div>
              </div>

              {view === 'browse' && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <button
                    onClick={() => navigateToFolder(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => void onDropOnRoot(e)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800"
                    title="Vous pouvez aussi déposer ici pour revenir à la racine"
                  >
                    <i className="fas fa-house"></i>
                    {t('drive_root') || 'Racine'}
                  </button>
                  {breadcrumbs.map((c) => (
                    <React.Fragment key={c.id}>
                      <span className="text-slate-300">/</span>
                      <button
                        onClick={() => navigateToFolder(c.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 truncate max-w-[260px]"
                        title={c.name}
                      >
                        {c.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900">
            <i className="fas fa-triangle-exclamation mr-2"></i>
            {errorMsg}
          </div>
        )}

        {view === 'browse' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[220px]">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t('drive_new_folder') || 'Nouveau dossier…'}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => void onCreateFolder()}
              disabled={loading || !newFolderName.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              <i className="fas fa-folder-plus mr-2"></i>
              {t('drive_create_folder') || 'Créer'}
            </button>
          </div>
        )}

        {view === 'trash' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 font-semibold text-gray-800 flex items-center justify-between">
              <span>
                <i className="fas fa-trash mr-2 text-red-500"></i>Corbeille
              </span>
              <button
                onClick={() => void refresh()}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'} mr-2`}></i>
                Actualiser
              </button>
            </div>
            {trashedItems.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">Corbeille vide.</div>
            ) : (
              <div className="divide-y">
                {trashedItems.map((it) => (
                  <div key={it.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className={`fas ${it.item_type === 'folder' ? 'fa-folder' : 'fa-file'} text-gray-500`}></i>
                        <span className="truncate font-medium text-gray-900">{it.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {it.trashed_at ? `Supprimé le ${new Date(it.trashed_at).toLocaleString('fr-FR')}` : '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        onClick={() => void onRestore(it)}
                      >
                        Restaurer
                      </button>
                      <button
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        onClick={() => void onDeleteForever(it)}
                      >
                        Supprimer définitivement
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : view === 'recent' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 font-semibold text-gray-800 flex items-center justify-between">
              <span>
                <i className="fas fa-clock-rotate-left mr-2 text-indigo-600"></i>Récents
              </span>
              <button
                onClick={() => void refresh()}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'} mr-2`}></i>
                Actualiser
              </button>
            </div>
            {recentItems.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">Aucun élément récent.</div>
            ) : (
              <div className="divide-y">
                {recentItems.map((it) => (
                  <div key={it.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => {
                        if (it.item_type === 'folder') navigateToFolder(it.id);
                        else void onOpenFile(it);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <i className={`fas ${it.item_type === 'folder' ? 'fa-folder' : 'fa-file'} text-indigo-600`}></i>
                        <span className="truncate font-medium text-gray-900">{it.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {new Date(it.updated_at).toLocaleString('fr-FR')}
                        {it.item_type !== 'folder' ? ` • ${formatSize(it.size_bytes)}` : ''}
                      </div>
                    </button>
                    <button
                      className="ml-3 p-2 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => void openActions(it)}
                      title="Actions"
                    >
                      <i className="fas fa-ellipsis-vertical"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : view === 'search' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 font-semibold text-gray-800 flex items-center justify-between">
              <span>
                <i className="fas fa-magnifying-glass mr-2 text-emerald-600"></i>Résultats
              </span>
              <span className="text-sm font-normal text-gray-600">{searchResults.length} élément(s)</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">
                {searchQuery.trim() ? 'Aucun résultat.' : 'Saisissez une recherche.'}
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((it) => (
                  <div key={it.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => {
                        if (it.item_type === 'folder') navigateToFolder(it.id);
                        else void onOpenFile(it);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <i className={`fas ${it.item_type === 'folder' ? 'fa-folder' : 'fa-file'} text-emerald-600`}></i>
                        <span className="truncate font-medium text-gray-900">{it.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {it.item_type !== 'folder' ? `${it.mime_type || 'type inconnu'}${it.size_bytes ? ` • ${formatSize(it.size_bytes)}` : ''}` : 'Dossier'}
                      </div>
                    </button>
                    <div className="ml-3 flex items-center gap-2">
                      <button
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => void openActions(it)}
                        title="Actions"
                      >
                        <i className="fas fa-ellipsis-vertical"></i>
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        onClick={() => void onTrash(it)}
                        title="Mettre à la corbeille"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folder "classeur" cards */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-slate-900">
                  <i className="fas fa-folder mr-2 text-amber-500"></i>
                  {t('drive_folders') || 'Dossiers'}
                </div>
                <div className="text-xs text-slate-500">{folders.length} élément(s)</div>
              </div>

              {folders.length === 0 ? (
                <div className="text-sm text-slate-600">{t('drive_no_folders') || 'Aucun dossier.'}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      className="group relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm hover:shadow-md transition overflow-hidden"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => void onDropOnFolder(e, f)}
                      title="Déposez un fichier ici pour déplacer"
                    >
                      {/* Folder tab (binder-like) */}
                      <div className="absolute top-0 left-4 h-5 w-24 rounded-b-xl bg-amber-200/80 border-x border-b border-amber-300"></div>
                      <button
                        className="w-full text-left p-4 pt-6"
                        onClick={() => navigateToFolder(f.id)}
                        title="Ouvrir"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                            <i className="fas fa-folder"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">{f.name}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {f.created_by_name ? `Par ${f.created_by_name}` : '—'}
                            </div>
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-4 flex items-center justify-between">
                        <div className="text-[11px] text-slate-500 truncate">
                          {new Date(f.updated_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                          <button
                            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                            onClick={() => void openActions(f)}
                            title="Actions"
                          >
                            <i className="fas fa-ellipsis-vertical"></i>
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            onClick={() => void onTrash(f)}
                            title="Mettre à la corbeille"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files list */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-800 flex items-center justify-between">
                <span>
                  <i className="fas fa-file mr-2 text-indigo-600"></i>
                  {t('drive_files') || 'Fichiers'}
                </span>
                <span className="text-xs font-normal text-slate-500">{files.length} élément(s)</span>
              </div>
              {files.length === 0 ? (
                <div className="p-5 text-sm text-slate-600">{t('drive_no_files') || 'Aucun fichier.'}</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {files.map((it) => (
                    <div key={it.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => void onOpenFile(it)}
                        draggable
                        onDragStart={(e) => onDragStart(e, it)}
                        title="Glissez-déposez vers un dossier"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fas fa-file text-indigo-500"></i>
                          <span className="truncate font-medium text-slate-900">{it.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {(it.mime_type ? it.mime_type : 'type inconnu') + (it.size_bytes ? ` • ${formatSize(it.size_bytes)}` : '')}
                        </div>
                      </button>
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                          onClick={() => void openActions(it)}
                          title="Actions"
                        >
                          <i className="fas fa-ellipsis-vertical"></i>
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => void onTrash(it)}
                          title="Mettre à la corbeille"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-bold truncate">Actions</div>
                  <div className="text-xs text-blue-50 truncate">{activeItem.name}</div>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="text-white hover:text-gray-200"
                  aria-label="Fermer"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renommer</label>
                  <div className="flex gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                    <button
                      onClick={() => void onRename()}
                      disabled={loading || !renameValue.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                      OK
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Déplacer vers</label>
                  <div className="flex gap-2">
                    <select
                      value={moveTargetFolderId}
                      onChange={(e) => setMoveTargetFolderId(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    >
                      <option value="__root__">Racine</option>
                      {flattenedFolderOptions
                        .filter((o) => o.id !== activeItem.id)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => void onMove()}
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Déplacer
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Astuce: vous pouvez aussi glisser-déposer un fichier sur un dossier.</p>
                </div>

                {activeItem.item_type === 'folder' && (
                  <div className="border-t border-gray-100 pt-5 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">{t('drive_acl_title')}</div>
                    <p className="text-xs text-gray-500">{t('drive_acl_help')}</p>
                    {folderAclCap === 'owner' || folderAclCap === 'admin' || folderAclCap === 'editor' ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={aclAddProfileId}
                            onChange={(e) => setAclAddProfileId(e.target.value)}
                            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            disabled={loading}
                          >
                            <option value="">— {t('assignee') || 'Profil'} —</option>
                            {orgProfiles
                              .filter((p) => p.id !== activeItem.owner_profile_id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {(p.full_name || p.email || p.id).slice(0, 48)}
                                </option>
                              ))}
                          </select>
                          <select
                            value={aclAddPermission}
                            onChange={(e) => setAclAddPermission(e.target.value as 'viewer' | 'editor')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            disabled={loading}
                          >
                            <option value="viewer">{t('drive_acl_permission_viewer')}</option>
                            <option value="editor">{t('drive_acl_permission_editor')}</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => void onAddFolderAcl()}
                            disabled={loading || !aclAddProfileId}
                            className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                          >
                            {t('drive_acl_add')}
                          </button>
                        </div>
                        <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                          <li className="flex justify-between gap-2 text-gray-700">
                            <span className="truncate">
                              {t('drive_acl_owner')}{' '}
                              {orgProfiles.find((p) => p.id === activeItem.owner_profile_id)?.full_name ||
                                orgProfiles.find((p) => p.id === activeItem.owner_profile_id)?.email ||
                                '—'}
                            </span>
                          </li>
                          {folderAclRows.map((row) => (
                            <li key={row.profile_id} className="flex justify-between gap-2 items-center">
                              <span className="truncate text-gray-800">
                                {orgProfiles.find((p) => p.id === row.profile_id)?.full_name ||
                                  orgProfiles.find((p) => p.id === row.profile_id)?.email ||
                                  row.profile_id}{' '}
                                <span className="text-gray-400">({row.permission})</span>
                              </span>
                              <button
                                type="button"
                                className="text-red-600 text-xs shrink-0 hover:underline"
                                onClick={() => void onRemoveFolderAcl(row.profile_id)}
                              >
                                {t('drive_acl_remove')}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {folderAclCap === 'viewer'
                          ? 'Accès en lecture seule sur ce dossier.'
                          : 'Vous ne gérez pas les invitations sur ce dossier.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Drive;

