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
    const res = await DriveService.listAllFolders();
    if (!res.error) setAllFoldersForMove(res.data.filter((f) => f.id !== item.id));
  }, []);

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{t('knowledge_base_title') || 'SENEGEL DRIVE'}</h1>
              <p className="text-emerald-50 text-sm max-w-2xl">
                {t('knowledge_base_subtitle') ||
                  "SENEGEL DRIVE : dossiers, envoi de fichiers, recherche et corbeille — espace d'équipe."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('browse')}
                className={`bg-white bg-opacity-15 hover:bg-opacity-25 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${view === 'browse' ? 'ring-2 ring-white ring-opacity-60' : ''}`}
              >
                <i className="fas fa-folder-tree mr-2"></i>
                Parcourir
              </button>
              <button
                onClick={() => setView('recent')}
                className={`bg-white bg-opacity-15 hover:bg-opacity-25 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${view === 'recent' ? 'ring-2 ring-white ring-opacity-60' : ''}`}
              >
                <i className="fas fa-clock-rotate-left mr-2"></i>
                Récents
              </button>
              <button
                onClick={() => setView('search')}
                className={`bg-white bg-opacity-15 hover:bg-opacity-25 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${view === 'search' ? 'ring-2 ring-white ring-opacity-60' : ''}`}
              >
                <i className="fas fa-magnifying-glass mr-2"></i>
                Recherche
              </button>
              <button
                onClick={() => setView('trash')}
                className={`bg-white bg-opacity-15 hover:bg-opacity-25 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${view === 'trash' ? 'ring-2 ring-white ring-opacity-60' : ''}`}
              >
                <i className="fas fa-trash mr-2"></i>
                Corbeille
              </button>
              {view === 'browse' && (
                <label className="bg-white text-emerald-700 font-bold py-2 px-4 rounded-lg hover:bg-emerald-50 flex items-center shadow-md transition-all cursor-pointer">
                  <i className="fas fa-upload mr-2"></i>
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          </div>

          {view === 'browse' && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={() => navigateToFolder(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => void onDropOnRoot(e)}
                className="bg-white bg-opacity-15 hover:bg-opacity-25 px-3 py-1.5 rounded-lg"
                title="Vous pouvez aussi déposer ici pour revenir à la racine"
              >
                <i className="fas fa-house mr-2"></i>Racine
              </button>
              {breadcrumbs.map((c) => (
                <React.Fragment key={c.id}>
                  <span className="opacity-70">/</span>
                  <button
                    onClick={() => navigateToFolder(c.id)}
                    className="bg-white bg-opacity-10 hover:bg-opacity-20 px-3 py-1.5 rounded-lg truncate max-w-[260px]"
                    title={c.name}
                  >
                    {c.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900">
            <i className="fas fa-triangle-exclamation mr-2"></i>
            {errorMsg}
          </div>
        )}

        {view === 'search' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dossiers & fichiers…"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'} mr-2`}></i>
              Chercher
            </button>
          </div>
        )}

        {view === 'browse' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px]">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => void onCreateFolder()}
              disabled={loading || !newFolderName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              <i className="fas fa-folder-plus mr-2"></i>Créer dossier
            </button>
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'} mr-2`}></i>
              Actualiser
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 font-semibold text-gray-800">
                <i className="fas fa-folder mr-2 text-amber-500"></i>Dossiers
              </div>
              {folders.length === 0 ? (
                <div className="p-5 text-sm text-gray-600">Aucun dossier.</div>
              ) : (
                <div className="divide-y">
                  {folders.map((f) => (
                    <div key={f.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => navigateToFolder(f.id)}
                        title="Ouvrir"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fas fa-folder text-amber-500"></i>
                          <span className="truncate font-medium text-gray-900">{f.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {f.created_by_name ? `Par ${f.created_by_name}` : '—'}
                        </div>
                      </button>
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                          onClick={() => void openActions(f)}
                          title="Actions"
                        >
                          <i className="fas fa-ellipsis-vertical"></i>
                        </button>
                        <div
                          className="p-2 rounded hover:bg-amber-50"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => void onDropOnFolder(e, f)}
                          title="Déposez ici pour déplacer"
                        >
                          <i className="fas fa-right-to-bracket text-amber-600"></i>
                        </div>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          onClick={() => void onTrash(f)}
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

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 font-semibold text-gray-800">
                <i className="fas fa-file mr-2 text-blue-500"></i>Fichiers
              </div>
              {files.length === 0 ? (
                <div className="p-5 text-sm text-gray-600">Aucun fichier.</div>
              ) : (
                <div className="divide-y">
                  {files.map((it) => (
                    <div key={it.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => void onOpenFile(it)}
                        draggable
                        onDragStart={(e) => onDragStart(e, it)}
                        title="Glissez-déposez vers un dossier"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fas fa-file text-blue-500"></i>
                          <span className="truncate font-medium text-gray-900">{it.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {(it.mime_type ? it.mime_type : 'type inconnu') + (it.size_bytes ? ` • ${formatSize(it.size_bytes)}` : '')}
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
    </div>
  );
};

export default Drive;

