import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Language, User } from '../types';
import OrganizationService from '../services/organizationService';
import { FileService } from '../services/fileService';
import * as messagingService from '../services/messagingService';
import { NotificationService } from '../services/notificationService';
import type { NotificationAction, NotificationType } from '../services/notificationService';
import { DataService } from '../services/dataService';
import { supabase } from '../services/supabaseService';
import * as messagingMentions from '../services/messagingMentions';

type Tab = 'channels' | 'direct';

type MentionRow =
  | { kind: 'broadcast'; token: string; label: string }
  | { kind: 'user'; profile: messagingMentions.MentionProfile };
const TAB_PREF_KEY = 'coya_messaging_default_tab';
const DEEPLINK_KEY = 'coya.messaging.deeplink';

function snippetText(s: string, max = 140): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const linkRegex = /https?:\/\/\S+/i;

const MessagerieModule: React.FC = () => {
  const { language } = useLocalization();
  const { user: currentUser } = useAuth();
  const isFr = language === Language.FR;

  const [tab, setTab] = useState<Tab>(() => {
    try {
      const raw = localStorage.getItem(TAB_PREF_KEY);
      return raw === 'direct' ? 'direct' : 'channels';
    } catch {
      return 'channels';
    }
  });
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; email?: string; fullName?: string; role?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string>('');

  const isAdminMessaging = useMemo(
    () => ['super_administrator', 'administrator'].includes(String(currentUser?.role || '')),
    [currentUser?.role],
  );

  const [channels, setChannels] = useState<messagingService.ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [activeChannelMembers, setActiveChannelMembers] = useState<string[]>([]);
  const [channelMessages, setChannelMessages] = useState<messagingService.ChatMessage[]>([]);
  const [channelText, setChannelText] = useState('');
  const [channelVoiceFile, setChannelVoiceFile] = useState<File | null>(null);
  const [channelFile, setChannelFile] = useState<File | null>(null);

  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createType, setCreateType] = useState<messagingService.ChatChannelType>('public');
  const [createAudience, setCreateAudience] = useState<'all' | 'manual'>('all');
  const [createMemberIds, setCreateMemberIds] = useState<string[]>([]);
  const [savingChannel, setSavingChannel] = useState(false);

  const [threads, setThreads] = useState<messagingService.ChatDirectThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [directMessages, setDirectMessages] = useState<messagingService.ChatMessage[]>([]);
  const [directText, setDirectText] = useState('');
  const [directVoiceFile, setDirectVoiceFile] = useState<File | null>(null);
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [directSearch, setDirectSearch] = useState('');
  const [openingThread, setOpeningThread] = useState(false);
  const [channelMemberDraft, setChannelMemberDraft] = useState<string[]>([]);
  const [showChannelMembersEditor, setShowChannelMembersEditor] = useState(false);
  const [savingChannelMembers, setSavingChannelMembers] = useState(false);
  const [listSearch, setListSearch] = useState('');

  const channelInputRef = useRef<HTMLInputElement>(null);
  const directInputRef = useRef<HTMLInputElement>(null);
  const [channelCursor, setChannelCursor] = useState(0);
  const [directCursor, setDirectCursor] = useState(0);
  const [channelMentionIdx, setChannelMentionIdx] = useState(0);
  const [directMentionIdx, setDirectMentionIdx] = useState(0);

  const userByProfileId = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => {
      const pid = String((u as any).profileId || u.id || '');
      if (pid) m.set(pid, u);
    });
    return m;
  }, [users]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || null,
    [channels, activeChannelId],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const availableDirectUsers = useMemo(() => {
    const q = directSearch.trim().toLowerCase();
    const matches = (u: User) => {
      if (!q) return true;
      const n = String((u.fullName || u.name || '')).toLowerCase();
      const e = String(u.email || '').toLowerCase();
      return n.includes(q) || e.includes(q);
    };
    return users
      .filter(matches)
      .sort((a, b) => {
        const ap = String((a as any).profileId || a.id);
        const bp = String((b as any).profileId || b.id);
        const aSelf = ap === currentProfileId;
        const bSelf = bp === currentProfileId;
        if (aSelf !== bSelf) return aSelf ? -1 : 1;
        return String(a.fullName || a.email || '').localeCompare(String(b.fullName || b.email || ''));
      })
      .slice(0, 12);
  }, [users, currentProfileId, directSearch]);

  const getDisplayName = useCallback((profileId: string) => {
    const u = userByProfileId.get(profileId);
    if (u) return u.fullName || u.name || u.email || profileId;
    const p = profiles.find((x) => x.id === profileId);
    return p?.fullName || p?.email || profileId;
  }, [profiles, userByProfileId]);

  const dedupeIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

  const mentionProfiles = useMemo(
    (): messagingMentions.MentionProfile[] => profiles.map((p) => ({ id: p.id, fullName: p.fullName, email: p.email })),
    [profiles],
  );

  const channelMentionScope = useMemo(
    () => mentionProfiles.filter((p) => activeChannelMembers.includes(p.id)),
    [mentionProfiles, activeChannelMembers],
  );

  const directMentionScope = useMemo(() => {
    const ids = activeThread?.memberIds;
    if (ids?.length) return mentionProfiles.filter((p) => ids.includes(p.id));
    return mentionProfiles;
  }, [mentionProfiles, activeThread?.memberIds]);

  const channelMentionMeta = useMemo(() => {
    if (tab !== 'channels' || !activeChannelId) return null;
    return messagingMentions.getActiveMentionQuery(channelText, channelCursor);
  }, [tab, activeChannelId, channelText, channelCursor]);

  const directMentionMeta = useMemo(() => {
    if (tab !== 'direct' || !activeThreadId) return null;
    return messagingMentions.getActiveMentionQuery(directText, directCursor);
  }, [tab, activeThreadId, directText, directCursor]);

  const channelMentionRows = useMemo((): MentionRow[] => {
    if (!channelMentionMeta) return [];
    const q = channelMentionMeta.query.toLowerCase();
    const broadcast: MentionRow[] = [];
    const opts = isFr
      ? [
          { token: 'everyone', label: '@everyone — tout le canal' },
          { token: 'tous', label: '@tous — tout le canal' },
          { token: 'canal', label: '@canal — tout le canal' },
        ]
      : [
          { token: 'everyone', label: '@everyone — whole channel' },
          { token: 'channel', label: '@channel — whole channel' },
        ];
    for (const b of opts) {
      if (!q || b.token.startsWith(q) || b.label.toLowerCase().includes(q)) {
        broadcast.push({ kind: 'broadcast', ...b });
      }
    }
    const users = messagingMentions.filterProfilesForMentionPicker(mentionProfiles, channelMentionMeta.query, {
      onlyAmongIds: activeChannelMembers,
    });
    return [...broadcast, ...users.map((profile) => ({ kind: 'user' as const, profile }))];
  }, [channelMentionMeta, mentionProfiles, activeChannelMembers, isFr]);

  const directMentionRows = useMemo((): MentionRow[] => {
    if (!directMentionMeta) return [];
    const ids = activeThread?.memberIds?.length ? activeThread.memberIds : undefined;
    const users = messagingMentions.filterProfilesForMentionPicker(mentionProfiles, directMentionMeta.query, {
      onlyAmongIds: ids,
    });
    return users.map((profile) => ({ kind: 'user' as const, profile }));
  }, [directMentionMeta, mentionProfiles, activeThread?.memberIds]);

  useEffect(() => {
    setChannelMentionIdx(0);
  }, [channelMentionMeta?.start, channelMentionMeta?.query]);

  useEffect(() => {
    setDirectMentionIdx(0);
  }, [directMentionMeta?.start, directMentionMeta?.query]);

  useEffect(() => {
    setChannelMentionIdx((i) => (channelMentionRows.length === 0 ? 0 : Math.min(i, channelMentionRows.length - 1)));
  }, [channelMentionRows.length]);

  useEffect(() => {
    setDirectMentionIdx((i) => (directMentionRows.length === 0 ? 0 : Math.min(i, directMentionRows.length - 1)));
  }, [directMentionRows.length]);

  const applyChannelMention = useCallback(
    (row: MentionRow) => {
      const meta = messagingMentions.getActiveMentionQuery(channelText, channelCursor);
      if (!meta) return;
      const token = row.kind === 'broadcast' ? row.token : messagingMentions.mentionInsertToken(row.profile, channelMentionScope);
      const before = channelText.slice(0, meta.start);
      const after = channelText.slice(channelCursor);
      const insert = `@${token} `;
      const next = before + insert + after;
      const newPos = before.length + insert.length;
      setChannelText(next);
      setChannelCursor(newPos);
      requestAnimationFrame(() => {
        const el = channelInputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(newPos, newPos);
        }
      });
    },
    [channelText, channelCursor, channelMentionScope],
  );

  const applyDirectMention = useCallback(
    (row: MentionRow) => {
      if (row.kind !== 'user') return;
      const meta = messagingMentions.getActiveMentionQuery(directText, directCursor);
      if (!meta) return;
      const token = messagingMentions.mentionInsertToken(row.profile, directMentionScope);
      const before = directText.slice(0, meta.start);
      const after = directText.slice(directCursor);
      const insert = `@${token} `;
      const next = before + insert + after;
      const newPos = before.length + insert.length;
      setDirectText(next);
      setDirectCursor(newPos);
      requestAnimationFrame(() => {
        const el = directInputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(newPos, newPos);
        }
      });
    },
    [directText, directCursor, directMentionScope],
  );

  const stripChannelMentionFragment = useCallback(() => {
    const meta = messagingMentions.getActiveMentionQuery(channelText, channelCursor);
    if (!meta) return;
    const before = channelText.slice(0, meta.start);
    const after = channelText.slice(channelCursor);
    const next = before + after;
    const newPos = meta.start;
    setChannelText(next);
    setChannelCursor(newPos);
    requestAnimationFrame(() => {
      const el = channelInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    });
  }, [channelText, channelCursor]);

  const stripDirectMentionFragment = useCallback(() => {
    const meta = messagingMentions.getActiveMentionQuery(directText, directCursor);
    if (!meta) return;
    const before = directText.slice(0, meta.start);
    const after = directText.slice(directCursor);
    const next = before + after;
    const newPos = meta.start;
    setDirectText(next);
    setDirectCursor(newPos);
    requestAnimationFrame(() => {
      const el = directInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    });
  }, [directText, directCursor]);

  const handleChannelInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const cur = el.selectionStart ?? channelText.length;
      const meta = messagingMentions.getActiveMentionQuery(channelText, cur);
      if (e.key === 'Escape' && meta) {
        e.preventDefault();
        stripChannelMentionFragment();
        return;
      }
      if (!meta || channelMentionRows.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setChannelMentionIdx((i) => Math.min(i + 1, channelMentionRows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setChannelMentionIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const row = channelMentionRows[channelMentionIdx];
        if (row) applyChannelMention(row);
      }
    },
    [channelText, channelMentionRows, channelMentionIdx, applyChannelMention, stripChannelMentionFragment],
  );

  const handleDirectInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const cur = el.selectionStart ?? directText.length;
      const meta = messagingMentions.getActiveMentionQuery(directText, cur);
      if (e.key === 'Escape' && meta) {
        e.preventDefault();
        stripDirectMentionFragment();
        return;
      }
      if (!meta || directMentionRows.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDirectMentionIdx((i) => Math.min(i + 1, directMentionRows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDirectMentionIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const row = directMentionRows[directMentionIdx];
        if (row?.kind === 'user') applyDirectMention(row);
      }
    },
    [directText, directMentionRows, directMentionIdx, applyDirectMention, stripDirectMentionFragment],
  );

  const renderContentWithMentions = useCallback(
    (content: string) => {
      const parts = content.split(/(@[^\s@]+)/g);
      return (
        <>
          {parts.map((part, idx) => {
            if (/^@[^\s@]+$/.test(part)) {
              const raw = part.slice(1);
              let display = part;
              if (messagingMentions.MENTION_UUID_RE.test(raw)) {
                const prof = profiles.find((x) => x.id === raw);
                if (prof?.fullName || prof?.email) display = `@${prof.fullName || prof.email}`;
              }
              return (
                <span
                  key={`${part}-${idx}`}
                  className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800"
                >
                  {display}
                </span>
              );
            }
            return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>;
          })}
        </>
      );
    },
    [profiles],
  );
  const appendMessageUnique = useCallback((setter: React.Dispatch<React.SetStateAction<messagingService.ChatMessage[]>>, next: messagingService.ChatMessage) => {
    setter((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
  }, []);

  const notifyRecipients = useCallback(
    async (
      recipientIds: string[],
      action: NotificationAction,
      title: string,
      message: string,
      metadata?: Record<string, unknown>,
      notifType: NotificationType = 'info',
    ) => {
      const recipients = dedupeIds(recipientIds).filter((id) => id !== currentProfileId);
      if (recipients.length === 0) return;
      const entityId = metadata?.channelId || metadata?.threadId;
      await NotificationService.notifyUsers(recipients, notifType, 'messagerie', action, title, message, {
        entityType: 'messaging',
        entityId: entityId ? String(entityId) : undefined,
        metadata: { ...metadata, source: 'messagerie' },
      });
    },
    [currentProfileId],
  );

  const loadChannels = useCallback(async () => {
    if (!organizationId || !currentProfileId) return;
    const list = await messagingService.listChannels({ organizationId, profileId: currentProfileId });
    setChannels(list);
    if (!activeChannelId || !list.some((c) => c.id === activeChannelId)) {
      setActiveChannelId(list[0]?.id || '');
    }
  }, [organizationId, currentProfileId, activeChannelId]);

  const loadThreads = useCallback(async () => {
    if (!organizationId || !currentProfileId) return;
    const list = await messagingService.listDirectThreads({ organizationId, profileId: currentProfileId });
    setThreads(list);
    if (!activeThreadId || !list.some((t) => t.id === activeThreadId)) {
      setActiveThreadId(list[0]?.id || '');
    }
  }, [organizationId, currentProfileId, activeThreadId]);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError(null);
      try {
        const org = await OrganizationService.getCurrentUserOrganizationId();
        const authUserId = String((currentUser as any).id || currentUser.id || '');
        const { data: profile } = await DataService.getProfile(authUserId);
        let resolvedProfileId = String((currentUser as any)?.profileId || profile?.id || '');
        let orgResolved = org || profile?.organization_id || (currentUser as any).organizationId || null;
        if (!resolvedProfileId && authUserId) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            const uid = authData?.user?.id || authUserId;
            const { data: row } = await supabase.from('profiles').select('id, organization_id').eq('user_id', uid).maybeSingle();
            if (row?.id) {
              resolvedProfileId = String(row.id);
              if (!orgResolved && row.organization_id) orgResolved = row.organization_id;
            }
          } catch {
            /* ignore */
          }
        }
        setCurrentProfileId(resolvedProfileId);
        setOrganizationId(orgResolved);

        const { data: allProfiles } = await DataService.getProfiles();
        const currentOrg = orgResolved;
        const inOrg = (allProfiles || []).filter((p: any) => !currentOrg || p.organization_id === currentOrg);
        setProfiles(inOrg.map((p: any) => ({
          id: String(p.id),
          fullName: p.full_name || '',
          email: p.email || '',
          role: p.role || '',
        })));
        const mappedUsers: User[] = inOrg.map((p: any) => ({
          id: p.user_id || p.id,
          profileId: p.id,
          email: p.email || '',
          name: p.full_name || p.email || '',
          fullName: p.full_name || p.email || '',
          role: (p.role || 'user') as any,
          avatar: p.avatar_url || '',
          phone: p.phone_number || '',
          phoneNumber: p.phone_number || '',
          skills: [],
          bio: '',
          location: '',
          website: '',
          linkedinUrl: '',
          githubUrl: '',
          isActive: p.is_active ?? true,
          lastLogin: p.last_login || new Date().toISOString(),
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
        }));
        setUsers(mappedUsers);
      } catch (e: any) {
        setError(e?.message || (isFr ? 'Erreur de chargement messagerie.' : 'Messaging loading error.'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUser, isFr]);

  useEffect(() => {
    loadChannels();
    loadThreads();
  }, [loadChannels, loadThreads]);

  useEffect(() => {
    setChannelMemberDraft([...activeChannelMembers]);
  }, [activeChannelId, activeChannelMembers]);

  useEffect(() => {
    if (!organizationId || !currentProfileId || loading) return;
    try {
      const raw = sessionStorage.getItem(DEEPLINK_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { ts?: number; tab?: string; channelId?: string; threadId?: string };
      if (!d.ts || Date.now() - d.ts > 120000) {
        sessionStorage.removeItem(DEEPLINK_KEY);
        return;
      }
      if (d.tab === 'channels') setTab('channels');
      if (d.tab === 'direct') setTab('direct');
      if (d.channelId) setActiveChannelId(String(d.channelId));
      if (d.threadId) {
        setTab('direct');
        setActiveThreadId(String(d.threadId));
      }
      sessionStorage.removeItem(DEEPLINK_KEY);
      queueMicrotask(() => {
        if (d.threadId) directInputRef.current?.focus();
        else if (d.channelId) channelInputRef.current?.focus();
      });
    } catch {
      try {
        sessionStorage.removeItem(DEEPLINK_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [organizationId, currentProfileId, loading, channels.length, threads.length]);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_PREF_KEY, tab);
    } catch {
      // ignore
    }
  }, [tab]);

  useEffect(() => {
    const run = async () => {
      if (!activeChannelId) {
        setChannelMessages([]);
        setActiveChannelMembers([]);
        return;
      }
      const [msgs, members] = await Promise.all([
        messagingService.listChannelMessages(activeChannelId),
        messagingService.listChannelMembers(activeChannelId),
      ]);
      setChannelMessages(msgs);
      setActiveChannelMembers(members);
    };
    run();
  }, [activeChannelId]);

  useEffect(() => {
    const run = async () => {
      if (!activeThreadId) {
        setDirectMessages([]);
        return;
      }
      const msgs = await messagingService.listDirectMessages(activeThreadId);
      setDirectMessages(msgs);
    };
    run();
  }, [activeThreadId]);

  useEffect(() => {
    if (!organizationId || !currentProfileId) return;
    const channel = supabase.channel(`messagerie-${organizationId}-${currentProfileId}`);
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `organization_id=eq.${organizationId}`,
      }, async (payload: any) => {
        const row = payload?.new;
        if (!row) return;
        if (row.channel_id && String(row.channel_id) === activeChannelId) {
          const msgs = await messagingService.listChannelMessages(activeChannelId);
          setChannelMessages(msgs);
        }
        if (row.direct_thread_id && String(row.direct_thread_id) === activeThreadId) {
          const msgs = await messagingService.listDirectMessages(activeThreadId);
          setDirectMessages(msgs);
        }
        if (row.channel_id || row.direct_thread_id) {
          await Promise.all([loadChannels(), loadThreads()]);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_channels',
        filter: `organization_id=eq.${organizationId}`,
      }, async () => {
        await loadChannels();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_direct_threads',
        filter: `organization_id=eq.${organizationId}`,
      }, async () => {
        await loadThreads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, currentProfileId, activeChannelId, activeThreadId, loadChannels, loadThreads]);

  const handleCreateChannel = async () => {
    if (!organizationId || !currentProfileId || !createName.trim()) return;
    setSavingChannel(true);
    setError(null);
    try {
      const allMembers = users
        .map((u) => String((u as any).profileId || u.id || ''))
        .filter(Boolean);
      const memberIds = createAudience === 'all' ? allMembers : createMemberIds;
      const created = await messagingService.createChannel({
        organizationId,
        createdById: currentProfileId,
        name: createName.trim(),
        description: createDesc.trim(),
        type: createType,
        memberIds,
      });
      setCreateName('');
      setCreateDesc('');
      setCreateType('public');
      setCreateAudience('all');
      setCreateMemberIds([]);
      await loadChannels();
      setActiveChannelId(created.id);
      await notifyRecipients(
        memberIds,
        'created',
        isFr ? 'Nouveau canal créé' : 'New channel created',
        isFr ? `Vous avez été ajouté au canal « ${created.name} ».` : `You were added to channel "${created.name}".`,
        { channelId: created.id, channelName: created.name },
        'info',
      );
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.toLowerCase().includes('duplicate') || String(e?.code || '') === '23505') {
        setError(isFr ? 'Un canal avec ce nom existe déjà.' : 'A channel with this name already exists.');
      } else {
        setError(e?.message || (isFr ? 'Impossible de créer le canal.' : 'Unable to create channel.'));
      }
    } finally {
      setSavingChannel(false);
    }
  };

  const handleRenameActiveChannel = async () => {
    if (!activeChannel) return;
    const name = prompt(isFr ? 'Nouveau nom du canal' : 'New channel name', activeChannel.name);
    if (!name || !name.trim()) return;
    await messagingService.updateChannel(activeChannel.id, { name: name.trim() });
    await loadChannels();
  };

  const handleArchiveActiveChannel = async () => {
    if (!activeChannel) return;
    if (!confirm(isFr ? 'Archiver ce canal ?' : 'Archive this channel?')) return;
    await messagingService.archiveChannel(activeChannel.id);
    await loadChannels();
  };

  const persistChannelMembers = async () => {
    if (!activeChannelId || !isAdminMessaging) return;
    setSavingChannelMembers(true);
    setError(null);
    try {
      const withCreator = dedupeIds([currentProfileId, ...channelMemberDraft]);
      await messagingService.setChannelMembers(activeChannelId, withCreator);
      const members = await messagingService.listChannelMembers(activeChannelId);
      setActiveChannelMembers(members);
      setShowChannelMembersEditor(false);
    } catch (e: any) {
      setError(e?.message || (isFr ? 'Impossible de mettre à jour les membres.' : 'Could not update members.'));
    } finally {
      setSavingChannelMembers(false);
    }
  };

  const sendChannelText = async () => {
    if (!organizationId || !activeChannelId || !currentProfileId || !channelText.trim()) return;
    const content = channelText.trim();
    const messageType: messagingService.ChatMessageType = linkRegex.test(content) ? 'link' : 'text';
    setError(null);
    const created = await messagingService.sendChannelMessage({
      organizationId,
      channelId: activeChannelId,
      senderId: currentProfileId,
      content,
      messageType,
    });
    appendMessageUnique(setChannelMessages, created);
    setChannelText('');
    const mentionProfiles: messagingMentions.MentionProfile[] = profiles.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email,
    }));
    const broadcast = messagingMentions.isBroadcastMention(content);
    const mentionIds = messagingMentions.extractMentionedProfileIds(content, mentionProfiles, {
      onlyAmongMemberIds: activeChannelMembers,
    });
    const others = activeChannelMembers.filter((id) => id !== currentProfileId);
    const snip = snippetText(content);
    const senderLabel = getDisplayName(currentProfileId);
    const chName = activeChannel?.name || (isFr ? 'canal' : 'channel');
    const baseMeta = { channelId: activeChannelId, channelName: chName, messageId: created.id };

    if (broadcast) {
      await notifyRecipients(
        others,
        'updated',
        isFr ? `Canal « ${chName} » — @tous` : `Channel "${chName}" — @all`,
        `${senderLabel}: ${snip}`,
        { ...baseMeta, kind: 'channel_broadcast' },
        'info',
      );
    } else {
      const mentioned = mentionIds.filter((id) => id !== currentProfileId && activeChannelMembers.includes(id));
      const mentionSet = new Set(mentioned);
      const rest = others.filter((id) => !mentionSet.has(id));
      if (mentioned.length > 0) {
        await notifyRecipients(
          mentioned,
          'requested_changes',
          isFr ? 'Mention dans un canal' : 'Mention in channel',
          isFr ? `${senderLabel} dans #${chName} : ${snip}` : `${senderLabel} in #${chName}: ${snip}`,
          { ...baseMeta, kind: 'mention' },
          'warning',
        );
      }
      if (rest.length > 0) {
        await notifyRecipients(
          rest,
          'updated',
          isFr ? 'Nouveau message sur le canal' : 'New channel message',
          isFr ? `#${chName} — ${senderLabel} : ${snip}` : `#${chName} — ${senderLabel}: ${snip}`,
          { ...baseMeta, kind: 'channel_message' },
          'info',
        );
      }
    }
  };

  const sendChannelVoice = async () => {
    if (!organizationId || !activeChannelId || !currentProfileId || !channelVoiceFile) return;
    const path = `messaging/channels/${activeChannelId}/${Date.now()}-${channelVoiceFile.name}`;
    const { data } = await FileService.uploadFile('documents', channelVoiceFile, path);
    const created = await messagingService.sendChannelMessage({
      organizationId,
      channelId: activeChannelId,
      senderId: currentProfileId,
      content: isFr ? 'Message vocal' : 'Voice message',
      messageType: 'voice',
      attachmentUrl: data?.url || null,
    });
    appendMessageUnique(setChannelMessages, created);
    setChannelVoiceFile(null);
    await notifyRecipients(
      activeChannelMembers,
      'updated',
      isFr ? 'Nouveau vocal canal' : 'New channel voice message',
      isFr
        ? `${getDisplayName(currentProfileId)} — vocal dans « ${activeChannel?.name || 'canal'} »`
        : `${getDisplayName(currentProfileId)} — voice in "${activeChannel?.name || 'channel'}"`,
      { channelId: activeChannelId, messageId: created.id, kind: 'channel_voice' },
      'info',
    );
  };

  const sendChannelFile = async () => {
    if (!organizationId || !activeChannelId || !currentProfileId || !channelFile) return;
    const path = `messaging/channels/${activeChannelId}/${Date.now()}-${channelFile.name}`;
    const { data } = await FileService.uploadFile('documents', channelFile, path);
    const created = await messagingService.sendChannelMessage({
      organizationId,
      channelId: activeChannelId,
      senderId: currentProfileId,
      content: `${isFr ? 'Fichier' : 'File'}: ${channelFile.name}`,
      messageType: 'link',
      attachmentUrl: data?.url || null,
    });
    appendMessageUnique(setChannelMessages, created);
    setChannelFile(null);
    await notifyRecipients(
      activeChannelMembers,
      'updated',
      isFr ? 'Nouveau fichier canal' : 'New channel file',
      isFr
        ? `${getDisplayName(currentProfileId)} — fichier dans « ${activeChannel?.name || 'canal'} » : ${channelFile.name}`
        : `${getDisplayName(currentProfileId)} — file in "${activeChannel?.name || 'channel'}": ${channelFile.name}`,
      { channelId: activeChannelId, messageId: created.id, kind: 'channel_file' },
      'info',
    );
  };

  const openDirectThread = async (otherProfileId: string) => {
    setError(null);
    if (!organizationId) {
      setError(isFr ? 'Organisation introuvable. Vérifiez votre profil.' : 'Organization not found. Check your profile.');
      return;
    }
    if (!currentProfileId) {
      setError(isFr ? 'Profil utilisateur introuvable. Reconnectez-vous ou contactez un administrateur.' : 'User profile not found. Sign in again or contact an administrator.');
      return;
    }
    setOpeningThread(true);
    try {
      const thread = await messagingService.createOrGetDirectThread({
        organizationId,
        createdById: currentProfileId,
        memberIds: [currentProfileId, otherProfileId],
      });
      await loadThreads();
      setActiveThreadId(thread.id);
      setTab('direct');
    } catch (e: any) {
      console.error('openDirectThread', e);
      const msg = String(e?.message || e?.error_description || e || '');
      setError(
        msg
          ? (isFr ? `Impossible d’ouvrir la conversation : ${msg}` : `Could not open conversation: ${msg}`)
          : (isFr ? 'Impossible d’ouvrir la conversation directe.' : 'Could not open direct conversation.'),
      );
    } finally {
      setOpeningThread(false);
    }
  };

  const sendDirectText = async () => {
    if (!organizationId || !activeThreadId || !currentProfileId || !directText.trim()) return;
    const content = directText.trim();
    const messageType: messagingService.ChatMessageType = linkRegex.test(content) ? 'link' : 'text';
    const created = await messagingService.sendDirectMessage({
      organizationId,
      directThreadId: activeThreadId,
      senderId: currentProfileId,
      content,
      messageType,
    });
    appendMessageUnique(setDirectMessages, created);
    setDirectText('');
    const recipients = activeThread?.memberIds || [];
    const mp: messagingMentions.MentionProfile[] = profiles.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email,
    }));
    const mentionInThread = messagingMentions.extractMentionedProfileIds(content, mp, { onlyAmongMemberIds: recipients });
    const others = recipients.filter((id) => id !== currentProfileId);
    const mentionHit = others.some((id) => mentionInThread.includes(id));
    await notifyRecipients(
      recipients,
      mentionHit ? 'requested_changes' : 'updated',
      mentionHit
        ? isFr
          ? 'Mention — message direct'
          : 'Mention — direct message'
        : isFr
          ? 'Nouveau message direct'
          : 'New direct message',
      `${getDisplayName(currentProfileId)}: ${snippetText(content)}`,
      { threadId: activeThreadId, messageId: created.id, kind: 'direct_text' },
      mentionHit ? 'warning' : 'info',
    );
  };

  const sendDirectVoice = async () => {
    if (!organizationId || !activeThreadId || !currentProfileId || !directVoiceFile) return;
    const path = `messaging/direct/${activeThreadId}/${Date.now()}-${directVoiceFile.name}`;
    const { data } = await FileService.uploadFile('documents', directVoiceFile, path);
    const created = await messagingService.sendDirectMessage({
      organizationId,
      directThreadId: activeThreadId,
      senderId: currentProfileId,
      content: isFr ? 'Message vocal' : 'Voice message',
      messageType: 'voice',
      attachmentUrl: data?.url || null,
    });
    appendMessageUnique(setDirectMessages, created);
    setDirectVoiceFile(null);
    const recipients = activeThread?.memberIds || [];
    await notifyRecipients(
      recipients,
      'updated',
      isFr ? 'Nouveau vocal direct' : 'New direct voice message',
      `${getDisplayName(currentProfileId)} — ${isFr ? 'message vocal' : 'voice message'}`,
      { threadId: activeThreadId, messageId: created.id, kind: 'direct_voice' },
      'info',
    );
  };

  const sendDirectFile = async () => {
    if (!organizationId || !activeThreadId || !currentProfileId || !directFile) return;
    const path = `messaging/direct/${activeThreadId}/${Date.now()}-${directFile.name}`;
    const { data } = await FileService.uploadFile('documents', directFile, path);
    const created = await messagingService.sendDirectMessage({
      organizationId,
      directThreadId: activeThreadId,
      senderId: currentProfileId,
      content: `${isFr ? 'Fichier' : 'File'}: ${directFile.name}`,
      messageType: 'link',
      attachmentUrl: data?.url || null,
    });
    appendMessageUnique(setDirectMessages, created);
    setDirectFile(null);
    const recipients = activeThread?.memberIds || [];
    await notifyRecipients(
      recipients,
      'updated',
      isFr ? 'Nouveau fichier direct' : 'New direct file',
      `${getDisplayName(currentProfileId)} — ${directFile.name}`,
      { threadId: activeThreadId, messageId: created.id, kind: 'direct_file' },
      'info',
    );
  };

  const threadLabel = (thread: messagingService.ChatDirectThread) => {
    const others = thread.memberIds.filter((m) => m !== currentProfileId);
    if (others.length === 0 && thread.memberIds.length === 1 && thread.memberIds[0] === currentProfileId) {
      return isFr ? 'Moi — notes / brouillon' : 'Me — notes / draft';
    }
    const names = others.map((id) => userByProfileId.get(id)?.fullName || userByProfileId.get(id)?.email || id);
    return names.join(', ') || (isFr ? 'Conversation' : 'Conversation');
  };

  const formatMsgTime = useCallback((iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  }, [isFr]);

  const filteredChannels = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [channels, listSearch]);

  const filteredThreads = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const others = t.memberIds.filter((m) => m !== currentProfileId);
      let label: string;
      if (others.length === 0 && t.memberIds.length === 1 && t.memberIds[0] === currentProfileId) {
        label = isFr ? 'Moi — notes / brouillon' : 'Me — notes / draft';
      } else {
        const names = others.map((id) => userByProfileId.get(id)?.fullName || userByProfileId.get(id)?.email || id);
        label = names.join(', ') || (isFr ? 'Conversation' : 'Conversation');
      }
      return label.toLowerCase().includes(q);
    });
  }, [threads, listSearch, currentProfileId, userByProfileId, isFr]);

  const avatarForProfile = useCallback(
    (profileId: string) => {
      const u = userByProfileId.get(profileId);
      const url = u?.avatar;
      const label = getDisplayName(profileId).slice(0, 2).toUpperCase();
      if (url) {
        return (
          <img src={url} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0" />
        );
      }
      return (
        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center text-xs font-semibold shrink-0">
          {label}
        </div>
      );
    },
    [userByProfileId, getDisplayName],
  );

  const directThreadPreviewId = useMemo(() => {
    if (!activeThread || tab !== 'direct') return null;
    const others = activeThread.memberIds.filter((m) => m !== currentProfileId);
    return others[0] || activeThread.memberIds[0] || null;
  }, [activeThread, currentProfileId, tab]);

  return (
    <div className="text-slate-900 px-2 sm:px-4 py-4 sm:py-6 max-w-[1680px] mx-auto flex flex-col min-h-0 max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(100dvh-6rem)]">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-sm">
              <i className="fas fa-comments" />
            </span>
            {isFr ? 'Messagerie' : 'Messaging'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {isFr
              ? 'Canaux, messages directs et mentions — même esprit qu’une inbox moderne, aux couleurs COYA.'
              : 'Channels, direct messages and mentions — a modern inbox layout with COYA branding.'}
          </p>
        </div>
      </header>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shrink-0">
          {error}
        </div>
      )}

      {/* Mobile : onglets */}
      <div className="flex lg:hidden gap-2 mb-3 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
        {[
          { id: 'channels' as Tab, label: isFr ? 'Canaux' : 'Channels', icon: 'fa-hashtag' },
          { id: 'direct' as Tab, label: isFr ? 'Direct' : 'Direct', icon: 'fa-comment-dots' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600'
            }`}
          >
            <i className={`fas ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex-col lg:flex-row lg:min-h-[min(520px,calc(100dvh-11rem))] lg:max-h-full">
        {/* Rail — charte COYA : fond slate-900, actif emerald */}
        <nav
          className="hidden lg:flex flex-col items-center py-5 gap-1 w-[56px] shrink-0 bg-slate-900 border-r border-slate-800"
          aria-label={isFr ? 'Navigation messagerie' : 'Messaging navigation'}
        >
          <button
            type="button"
            onClick={() => setTab('channels')}
            title={isFr ? 'Canaux' : 'Channels'}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              tab === 'channels' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className="fas fa-hashtag text-lg" />
          </button>
          <button
            type="button"
            onClick={() => setTab('direct')}
            title={isFr ? 'Messages directs' : 'Direct messages'}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              tab === 'direct' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className="fas fa-comment-dots text-lg" />
          </button>
          <div className="flex-1 min-h-4" />
          <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-semibold text-slate-200">
            {getDisplayName(currentProfileId).slice(0, 2).toUpperCase() || '?'}
          </div>
        </nav>

        {/* Colonne navigation secondaire (style inbox) */}
        <aside className="hidden lg:flex flex-col w-[200px] shrink-0 border-r border-slate-200 bg-slate-50/90 min-h-0 max-h-full">
          <div className="p-4 border-b border-slate-200 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{isFr ? 'Espace' : 'Workspace'}</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">{isFr ? 'Boîte de réception' : 'Inbox'}</p>
          </div>
          <div className="p-2 space-y-0.5 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setTab('channels')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                tab === 'channels' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <i className="fas fa-hashtag w-5 text-slate-500" />
              {isFr ? 'Canaux' : 'Channels'}
            </button>
            <button
              type="button"
              onClick={() => setTab('direct')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                tab === 'direct' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <i className="fas fa-comment-dots w-5 text-slate-500" />
              {isFr ? 'Direct' : 'Direct'}
            </button>
            <div className="pt-3 mt-2 border-t border-slate-200/80">
              <p className="px-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide">{isFr ? 'Raccourcis' : 'Shortcuts'}</p>
              <p className="px-3 py-2 text-xs text-slate-500 leading-relaxed">
                {isFr ? 'Utilisez @prénom ou @everyone dans un canal pour notifier.' : 'Use @name or @everyone in channels to notify.'}
              </p>
            </div>
          </div>
          <div className="p-3 border-t border-slate-200 bg-white/50">
            <p className="text-[10px] font-semibold uppercase text-slate-400 mb-2">{isFr ? 'Équipe' : 'Team'}</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {users.slice(0, 6).map((u) => {
                const pid = String((u as any).profileId || u.id || '');
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => {
                      setTab('direct');
                      void openDirectThread(pid);
                    }}
                    className="w-full flex items-center gap-2 text-left rounded-lg px-1 py-1 hover:bg-slate-100"
                  >
                    {avatarForProfile(pid)}
                    <span className="text-xs text-slate-700 truncate">{u.fullName || u.email}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

      {tab === 'channels' && (
        <>
        <aside className="flex flex-col w-full lg:w-[300px] shrink-0 border-r border-slate-200 bg-slate-50/50 min-h-0 max-h-[min(42vh,22rem)] lg:max-h-full overflow-hidden lg:flex lg:flex-col">
            <div className="px-3 py-2.5 border-b border-slate-200 bg-white/90 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isFr ? 'Canaux' : 'Channels'}</span>
                <span className="text-[11px] text-slate-400 tabular-nums">{filteredChannels.length}</span>
              </div>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input
                  type="search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={isFr ? 'Rechercher un canal…' : 'Search channels…'}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
                />
              </div>
              {loading && (
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin" /> {isFr ? 'Chargement…' : 'Loading…'}
                </p>
              )}
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain divide-y divide-slate-100/80">
              {filteredChannels.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(c.id)}
                    className={`w-full text-left px-3 py-2.5 flex gap-3 transition-colors ${
                      activeChannelId === c.id
                        ? 'bg-emerald-50/90 border-l-[3px] border-emerald-600 pl-[calc(0.75rem-3px)]'
                        : 'border-l-[3px] border-transparent hover:bg-white/80'
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-200/90 text-slate-600 flex items-center justify-center shrink-0 text-sm font-bold">
                      #
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                        {c.updatedAt ? (
                          <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{formatMsgTime(c.updatedAt)}</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.description || (isFr ? 'Canal d’équipe' : 'Team channel')}</p>
                    </div>
                  </button>
                </li>
              ))}
              {filteredChannels.length === 0 && (
                <li className="px-4 py-8 text-sm text-slate-500 text-center">
                  {channels.length === 0 ? (isFr ? 'Aucun canal' : 'No channel') : isFr ? 'Aucun résultat' : 'No results'}
                </li>
              )}
            </ul>
            {isAdminMessaging && (
              <div className="border-t border-slate-200 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isFr ? 'Nouveau canal' : 'New channel'}</p>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={isFr ? 'Nom du canal' : 'Channel name'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder={isFr ? 'Description' : 'Description'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as messagingService.ChatChannelType)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="public">{isFr ? 'Public' : 'Public'}</option>
                  <option value="private">{isFr ? 'Privé' : 'Private'}</option>
                  <option value="announcement">{isFr ? 'Annonce' : 'Announcement'}</option>
                </select>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    className={`rounded-lg px-2 py-1 ${createAudience === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                    onClick={() => setCreateAudience('all')}
                  >
                    {isFr ? 'Tous' : 'All users'}
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-2 py-1 ${createAudience === 'manual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                    onClick={() => setCreateAudience('manual')}
                  >
                    {isFr ? 'Manuel' : 'Manual'}
                  </button>
                </div>
                {createAudience === 'manual' && (
                  <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1">
                    {users.map((u) => {
                      const pid = String((u as any).profileId || u.id || '');
                      const checked = createMemberIds.includes(pid);
                      return (
                        <label key={pid} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setCreateMemberIds((prev) =>
                                e.target.checked ? [...prev, pid] : prev.filter((id) => id !== pid)
                              )
                            }
                          />
                          <span>{u.fullName || u.name || u.email}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCreateChannel}
                  disabled={savingChannel || !createName.trim()}
                  className="w-full rounded-xl bg-slate-900 text-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  {savingChannel ? (isFr ? 'Création…' : 'Creating…') : (isFr ? 'Créer le canal' : 'Create channel')}
                </button>
              </div>
            )}
          </aside>

          <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 min-h-[240px] lg:min-h-0 lg:max-h-full">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{isFr ? 'Canal' : 'Channel'}</p>
                <p className="font-semibold text-slate-900 truncate">{activeChannel?.name || (isFr ? 'Canal' : 'Channel')}</p>
                <p className="text-xs text-slate-500">
                  {activeChannelMembers.length} {isFr ? 'membre(s)' : 'member(s)'}
                </p>
              </div>
              {isAdminMessaging && activeChannel && (
                <div className="flex gap-2">
                  <button type="button" onClick={handleRenameActiveChannel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700">
                    {isFr ? 'Renommer' : 'Rename'}
                  </button>
                  <button type="button" onClick={handleArchiveActiveChannel} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700">
                    {isFr ? 'Archiver' : 'Archive'}
                  </button>
                </div>
              )}
            </div>
            {activeChannel && isAdminMessaging && (
              <div className="border-b border-slate-200 px-4 py-2 bg-slate-50/90">
                <button
                  type="button"
                  onClick={() => setShowChannelMembersEditor((v) => !v)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  {showChannelMembersEditor ? '▼ ' : '▸ '}
                  {isFr ? 'Membres du canal' : 'Channel members'} ({activeChannelMembers.length})
                </button>
                {showChannelMembersEditor && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      {isFr
                        ? 'Cochez les personnes ayant accès au canal (les admins peuvent poster selon le type de canal).'
                        : 'Check people who belong to this channel.'}
                    </p>
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                      {users.map((u) => {
                        const pid = String((u as any).profileId || u.id || '');
                        return (
                          <label key={pid} className="flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={channelMemberDraft.includes(pid)}
                              onChange={(e) =>
                                setChannelMemberDraft((prev) =>
                                  e.target.checked ? dedupeIds([...prev, pid]) : prev.filter((x) => x !== pid),
                                )
                              }
                            />
                            <span>{u.fullName || u.name || u.email}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={persistChannelMembers}
                      disabled={savingChannelMembers}
                      className="rounded-lg bg-emerald-600 text-white text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      {savingChannelMembers ? (isFr ? 'Enregistrement…' : 'Saving…') : isFr ? 'Enregistrer les membres' : 'Save members'}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto overscroll-y-contain bg-slate-50/40 [scrollbar-gutter:stable]">
              {channelMessages.map((m) => {
                const isMe = m.senderId === currentProfileId;
                const sender = userByProfileId.get(m.senderId);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl px-3 py-2 max-w-[88%] text-sm shadow-sm ${
                      isMe
                        ? 'ml-auto bg-emerald-100 text-slate-900 border border-emerald-200/90'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`block text-[10px] uppercase font-medium mb-1 ${isMe ? 'text-emerald-900/65' : 'text-slate-500'}`}
                    >
                      {sender?.fullName || sender?.email || m.senderId}
                    </span>
                    {m.messageType === 'voice' && m.attachmentUrl ? (
                      <audio controls src={m.attachmentUrl} className="w-full" />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{renderContentWithMentions(m.content)}</p>
                    )}
                    {m.messageType !== 'voice' && m.attachmentUrl && (
                      <a
                        href={m.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs underline ${isMe ? 'text-emerald-800' : 'text-slate-700'}`}
                      >
                        {isFr ? 'Pièce jointe' : 'Attachment'}
                      </a>
                    )}
                  </div>
                );
              })}
              {channelMessages.length === 0 && (
                <p className="text-sm text-slate-500">{isFr ? 'Aucun message pour le moment.' : 'No message yet.'}</p>
              )}
            </div>
            <div className="p-3 border-t border-slate-200 space-y-2 shrink-0 bg-white">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1 min-w-0">
                  {channelMentionMeta && channelMentionRows.length > 0 ? (
                    <ul
                      className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
                      role="listbox"
                    >
                      {channelMentionRows.map((row, idx) => (
                        <li key={row.kind === 'broadcast' ? `b-${row.token}` : row.profile.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={idx === channelMentionIdx}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                              idx === channelMentionIdx ? 'bg-emerald-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onMouseEnter={() => setChannelMentionIdx(idx)}
                            onClick={() => applyChannelMention(row)}
                          >
                            {row.kind === 'broadcast' ? (
                              <>
                                <i className="fas fa-bullhorn w-5 text-center text-emerald-600 text-xs" />
                                <span className="font-medium">{row.label}</span>
                              </>
                            ) : (
                              <>
                                <span className="shrink-0 scale-90">{avatarForProfile(row.profile.id)}</span>
                                <span className="min-w-0 truncate">
                                  <span className="font-semibold">{row.profile.fullName || row.profile.email}</span>
                                  {row.profile.email ? (
                                    <span className="block text-[11px] text-slate-500 truncate">{row.profile.email}</span>
                                  ) : null}
                                </span>
                              </>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <input
                    ref={channelInputRef}
                    type="text"
                    value={channelText}
                    onChange={(e) => {
                      setChannelText(e.target.value);
                      setChannelCursor(e.target.selectionStart ?? e.target.value.length);
                    }}
                    onSelect={(e) => setChannelCursor((e.target as HTMLInputElement).selectionStart ?? 0)}
                    onClick={(e) => setChannelCursor((e.target as HTMLInputElement).selectionStart ?? 0)}
                    onKeyUp={(e) => setChannelCursor((e.target as HTMLInputElement).selectionStart ?? 0)}
                    onKeyDown={handleChannelInputKeyDown}
                    placeholder={isFr ? 'Écrivez votre message… (@ pour mentionner)' : 'Type your message… (@ to mention)'}
                    className="w-full min-w-0 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-inner shadow-slate-100/80"
                    disabled={!activeChannelId}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendChannelText}
                  disabled={!activeChannelId || !channelText.trim()}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 hover:bg-slate-800"
                >
                  <i className="fas fa-paper-plane sm:mr-2" />
                  <span className="hidden sm:inline">{isFr ? 'Envoyer' : 'Send'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {isFr
                  ? 'Mentions : @prénom, partie de l’e-mail avant @, ou @everyone / @canal / @tous pour notifier tout le canal. Chaque message envoie une notification aux membres (temps réel si activé sur la table notifications).'
                  : 'Mentions: @firstname, email local-part, or @everyone / @channel / @tous to ping the whole channel. Each message notifies members (real-time if notifications replication is on).'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <label className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 font-medium">
                  <i className="fas fa-paperclip mr-1.5" />
                  {isFr ? 'Ajouter fichier' : 'Add file'}
                  <input type="file" className="hidden" onChange={(e) => setChannelFile(e.target.files?.[0] || null)} />
                </label>
                <button type="button" onClick={sendChannelFile} disabled={!activeChannelId || !channelFile} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 font-medium">
                  {isFr ? 'Envoyer fichier' : 'Send file'}
                </button>
                <label className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 font-medium">
                  <i className="fas fa-microphone mr-1.5" />
                  {isFr ? 'Ajouter vocal' : 'Add voice'}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => setChannelVoiceFile(e.target.files?.[0] || null)} />
                </label>
                <button type="button" onClick={sendChannelVoice} disabled={!activeChannelId || !channelVoiceFile} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 font-medium">
                  {isFr ? 'Envoyer vocal' : 'Send voice'}
                </button>
              </div>
            </div>
          </main>

          <aside className="hidden xl:flex flex-col w-[260px] shrink-0 border-l border-slate-200 bg-slate-50/60 min-h-0">
            {activeChannel ? (
              <>
                <div className="p-4 border-b border-slate-200 shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{isFr ? 'À propos' : 'About'}</p>
                  <h2 className="text-lg font-semibold text-slate-900 mt-1 leading-tight">{activeChannel.name}</h2>
                  {activeChannel.description ? (
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{activeChannel.description}</p>
                  ) : null}
                  <span className="inline-block mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200/80">
                    {activeChannel.type === 'public'
                      ? isFr
                        ? 'Public'
                        : 'Public'
                      : activeChannel.type === 'private'
                        ? isFr
                          ? 'Privé'
                          : 'Private'
                        : isFr
                          ? 'Annonce'
                          : 'Announcement'}
                  </span>
                </div>
                <div className="p-4 flex-1 min-h-0 overflow-y-auto">
                  <p className="text-[11px] font-semibold uppercase text-slate-400 mb-3">
                    {isFr ? 'Membres' : 'Members'} ({activeChannelMembers.length})
                  </p>
                  <ul className="space-y-2.5">
                    {activeChannelMembers.slice(0, 14).map((pid) => (
                      <li key={pid} className="flex items-center gap-2.5 text-sm text-slate-800">
                        <div className="scale-90 origin-left">{avatarForProfile(pid)}</div>
                        <span className="truncate font-medium">{getDisplayName(pid)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="p-4 text-sm text-slate-500">{isFr ? 'Sélectionnez un canal dans la liste.' : 'Select a channel from the list.'}</div>
            )}
          </aside>
        </>
      )}

      {tab === 'direct' && (
        <>
          <aside className="flex flex-col w-full lg:w-[300px] shrink-0 border-r border-slate-200 bg-slate-50/50 min-h-0 max-h-[min(42vh,22rem)] lg:max-h-full overflow-hidden lg:flex lg:flex-col">
            <div className="px-3 py-2.5 border-b border-slate-200 bg-white/90 space-y-3 shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{isFr ? 'Nouveau message' : 'New message'}</p>
                <p className="text-[11px] text-slate-500 mb-2">{isFr ? 'Vous pouvez vous choisir pour des notes perso.' : 'Pick yourself for personal notes.'}</p>
                <input
                  type="text"
                  value={directSearch}
                  onChange={(e) => setDirectSearch(e.target.value)}
                  placeholder={isFr ? 'Rechercher une personne…' : 'Search people…'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="mt-2 max-h-28 overflow-y-auto space-y-0.5">
                  {availableDirectUsers.map((u) => {
                    const pid = String((u as any).profileId || u.id || '');
                    const isSelf = pid === currentProfileId;
                    return (
                      <button
                        key={pid}
                        type="button"
                        disabled={openingThread || !currentProfileId || !organizationId}
                        onClick={() => void openDirectThread(pid)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <span className="scale-75 origin-left shrink-0">{avatarForProfile(pid)}</span>
                        <span className="truncate">
                          {u.fullName || u.name || u.email}
                          {isSelf ? <span className="ml-1 text-emerald-600 font-semibold">{isFr ? '(moi)' : '(me)'}</span> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="relative pt-2 border-t border-slate-100">
                <i className="fas fa-search absolute left-3 top-[calc(50%+4px)] -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 pl-0.5">{isFr ? 'Conversations' : 'Conversations'}</p>
                <input
                  type="search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={isFr ? 'Filtrer les fils…' : 'Filter threads…'}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain divide-y divide-slate-100/80">
              {filteredThreads.map((t) => {
                const primary =
                  t.memberIds.filter((m) => m !== currentProfileId)[0] || t.memberIds[0] || currentProfileId;
                const active = activeThreadId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveThreadId(t.id)}
                      className={`w-full text-left px-3 py-2.5 flex gap-3 transition-colors ${
                        active
                          ? 'bg-emerald-50/90 border-l-[3px] border-emerald-600 pl-[calc(0.75rem-3px)]'
                          : 'border-l-[3px] border-transparent hover:bg-white/80'
                      }`}
                    >
                      {primary ? (
                        <div className="shrink-0">{avatarForProfile(primary)}</div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs shrink-0">?</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm truncate ${active ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
                            {threadLabel(t)}
                          </p>
                          {t.updatedAt ? (
                            <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{formatMsgTime(t.updatedAt)}</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {isFr ? 'Message direct' : 'Direct message'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredThreads.length === 0 && (
                <li className="px-4 py-8 text-sm text-slate-500 text-center">
                  {threads.length === 0
                    ? isFr
                      ? 'Aucune conversation'
                      : 'No conversation'
                    : isFr
                      ? 'Aucun résultat'
                      : 'No results'}
                </li>
              )}
            </ul>
          </aside>

          <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 min-h-[240px] lg:min-h-0 lg:max-h-full">
            <div className="px-4 py-3 border-b border-slate-200 shrink-0 bg-white">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{isFr ? 'Direct' : 'Direct'}</p>
              <p className="font-semibold text-slate-900 truncate">
                {activeThread ? threadLabel(activeThread) : isFr ? 'Conversation' : 'Conversation'}
              </p>
            </div>
            <div className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto overscroll-y-contain bg-slate-50/40 [scrollbar-gutter:stable]">
              {directMessages.map((m) => {
                const isMe = m.senderId === currentProfileId;
                const sender = userByProfileId.get(m.senderId);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl px-3 py-2 max-w-[88%] text-sm shadow-sm ${
                      isMe
                        ? 'ml-auto bg-emerald-100 text-slate-900 border border-emerald-200/90'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`block text-[10px] uppercase font-medium mb-1 ${isMe ? 'text-emerald-900/65' : 'text-slate-500'}`}
                    >
                      {sender?.fullName || sender?.email || m.senderId}
                    </span>
                    {m.messageType === 'voice' && m.attachmentUrl ? (
                      <audio controls src={m.attachmentUrl} className="w-full" />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{renderContentWithMentions(m.content)}</p>
                    )}
                  </div>
                );
              })}
              {directMessages.length === 0 && (
                <p className="text-sm text-slate-500">{isFr ? 'Pas encore de message.' : 'No message yet.'}</p>
              )}
            </div>
            <div className="p-3 border-t border-slate-200 space-y-2 shrink-0 bg-white">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1 min-w-0">
                  {directMentionMeta && directMentionRows.length > 0 ? (
                    <ul
                      className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
                      role="listbox"
                    >
                      {directMentionRows.map((row, idx) => (
                        <li key={row.profile.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={idx === directMentionIdx}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                              idx === directMentionIdx ? 'bg-emerald-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onMouseEnter={() => setDirectMentionIdx(idx)}
                            onClick={() => applyDirectMention(row)}
                          >
                            <span className="shrink-0 scale-90">{avatarForProfile(row.profile.id)}</span>
                            <span className="min-w-0 truncate">
                              <span className="font-semibold">{row.profile.fullName || row.profile.email}</span>
                              {row.profile.email ? (
                                <span className="block text-[11px] text-slate-500 truncate">{row.profile.email}</span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <input
                    ref={directInputRef}
                    type="text"
                    value={directText}
                    onChange={(e) => {
                      setDirectText(e.target.value);
                      setDirectCursor(e.target.selectionStart ?? e.target.value.length);
                    }}
                    onSelect={(e) => setDirectCursor((e.target as HTMLInputElement).selectionStart ?? 0)}
                    onClick={(e) => setDirectCursor((e.target as HTMLInputElement).selectionStart ?? 0)}
                    onKeyUp={(e) => setDirectCursor((e.target as HTMLInputElement).selectionStart ?? 0)}
                    onKeyDown={handleDirectInputKeyDown}
                    placeholder={isFr ? 'Écrivez votre message… (@ pour mentionner)' : 'Type your message… (@ to mention)'}
                    className="w-full min-w-0 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-inner shadow-slate-100/80"
                    disabled={!activeThreadId}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendDirectText}
                  disabled={!activeThreadId || !directText.trim()}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 hover:bg-slate-800"
                >
                  <i className="fas fa-paper-plane sm:mr-2" />
                  <span className="hidden sm:inline">{isFr ? 'Envoyer' : 'Send'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {isFr
                  ? 'Les messages directs notifient les autres participants. @prénom ou partie d’e-mail pour une mention prioritaire.'
                  : 'Direct messages notify others. @firstname or email local-part for a priority mention.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <label className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 font-medium">
                  <i className="fas fa-paperclip mr-1.5" />
                  {isFr ? 'Fichier' : 'File'}
                  <input type="file" className="hidden" onChange={(e) => setDirectFile(e.target.files?.[0] || null)} />
                </label>
                <button
                  type="button"
                  onClick={sendDirectFile}
                  disabled={!activeThreadId || !directFile}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 font-medium"
                >
                  {isFr ? 'Envoyer' : 'Send'}
                </button>
                <label className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 font-medium">
                  <i className="fas fa-microphone mr-1.5" />
                  {isFr ? 'Vocal' : 'Voice'}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => setDirectVoiceFile(e.target.files?.[0] || null)} />
                </label>
                <button
                  type="button"
                  onClick={sendDirectVoice}
                  disabled={!activeThreadId || !directVoiceFile}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 font-medium"
                >
                  {isFr ? 'Envoyer' : 'Send'}
                </button>
              </div>
            </div>
          </main>

          <aside className="hidden xl:flex flex-col w-[260px] shrink-0 border-l border-slate-200 bg-slate-50/60 min-h-0">
            {activeThread && directThreadPreviewId ? (
              <>
                <div className="p-4 border-b border-slate-200 flex flex-col items-center text-center shrink-0">
                  <div className="mb-3 scale-125 origin-center">{avatarForProfile(directThreadPreviewId)}</div>
                  <h2 className="text-base font-semibold text-slate-900 leading-tight px-1">{threadLabel(activeThread)}</h2>
                  <p className="text-xs text-slate-500 mt-1 break-all px-1">
                    {userByProfileId.get(directThreadPreviewId)?.email || ''}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-1 font-medium border border-emerald-200/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      {isFr ? 'Actif' : 'Active'}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto text-sm text-slate-600 space-y-3">
                  {activeThread.updatedAt ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">{isFr ? 'Dernière activité' : 'Last activity'}</p>
                      <p className="mt-1">{formatMsgTime(activeThread.updatedAt)}</p>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isFr
                      ? 'Les notifications in-app vous alertent des nouveaux messages et mentions.'
                      : 'In-app notifications alert you to new messages and mentions.'}
                  </p>
                </div>
              </>
            ) : activeThread ? (
              <div className="p-4 text-sm text-slate-600">{isFr ? 'Conversation personnelle (notes).' : 'Personal conversation (notes).'}</div>
            ) : (
              <div className="p-4 text-sm text-slate-500">{isFr ? 'Choisissez une conversation.' : 'Pick a conversation.'}</div>
            )}
          </aside>
        </>
      )}
      </div>
    </div>
  );
};

export default MessagerieModule;
