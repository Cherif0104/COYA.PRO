import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Language, User } from '../types';
import OrganizationService from '../services/organizationService';
import { FileService } from '../services/fileService';
import * as messagingService from '../services/messagingService';
import { NotificationService } from '../services/notificationService';
import { DataService } from '../services/dataService';
import { supabase } from '../services/supabaseService';

type Tab = 'channels' | 'direct';
const TAB_PREF_KEY = 'coya_messaging_default_tab';

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
    return users
      .filter((u) => String((u as any).profileId || u.id) !== currentProfileId)
      .filter((u) => {
        if (!q) return true;
        const n = String((u.fullName || u.name || '')).toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes(q) || e.includes(q);
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
  const renderContentWithMentions = useCallback((content: string) => {
    const parts = content.split(/(\s+)/);
    return (
      <>
        {parts.map((part, idx) => {
          if (/^@[a-zA-Z0-9._-]+$/.test(part.trim())) {
            return (
              <span key={`${part}-${idx}`} className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 mr-1">
                {part}
              </span>
            );
          }
          return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>;
        })}
      </>
    );
  }, []);
  const appendMessageUnique = useCallback((setter: React.Dispatch<React.SetStateAction<messagingService.ChatMessage[]>>, next: messagingService.ChatMessage) => {
    setter((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
  }, []);

  const extractMentionedProfileIds = useCallback((content: string) => {
    const mentionTokens = Array.from(content.matchAll(/@([a-zA-Z0-9._-]+)/g)).map((m) => m[1].toLowerCase());
    if (mentionTokens.length === 0) return [];
    const mentioned = profiles
      .filter((p) => {
        const full = String(p.fullName || '').toLowerCase().replace(/\s+/g, '');
        const emailPrefix = String(p.email || '').toLowerCase().split('@')[0];
        return mentionTokens.some((t) => t === full || t === emailPrefix);
      })
      .map((p) => p.id);
    return dedupeIds(mentioned);
  }, [profiles]);

  const notifyRecipients = useCallback(async (
    recipientIds: string[],
    action: 'created' | 'updated' | 'assigned' | 'requested_changes',
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) => {
    const recipients = dedupeIds(recipientIds).filter((id) => id !== currentProfileId);
    if (recipients.length === 0) return;
    await NotificationService.notifyUsers(
      recipients,
      'info',
      'system',
      action,
      title,
      message,
      { entityType: 'messaging', metadata },
    );
  }, [currentProfileId]);

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
        isFr ? `Vous avez été ajouté au canal "${created.name}".` : `You were added to channel "${created.name}".`,
        { channelId: created.id, channelName: created.name },
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
    const mentionIds = extractMentionedProfileIds(content);
    await notifyRecipients(
      dedupeIds([...activeChannelMembers, ...mentionIds]),
      mentionIds.length > 0 ? 'requested_changes' : 'updated',
      mentionIds.length > 0 ? (isFr ? 'Vous avez été mentionné' : 'You were mentioned') : (isFr ? 'Nouveau message canal' : 'New channel message'),
      isFr ? `Nouveau message dans "${activeChannel?.name || 'canal'}".` : `New message in "${activeChannel?.name || 'channel'}".`,
      { channelId: activeChannelId, messageId: created.id },
    );
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
      isFr ? `Un message vocal a été envoyé dans "${activeChannel?.name || 'canal'}".` : `A voice message was sent in "${activeChannel?.name || 'channel'}".`,
      { channelId: activeChannelId, messageId: created.id },
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
      isFr ? `Un fichier a été partagé dans "${activeChannel?.name || 'canal'}".` : `A file was shared in "${activeChannel?.name || 'channel'}".`,
      { channelId: activeChannelId, messageId: created.id },
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
    await notifyRecipients(
      recipients,
      'updated',
      isFr ? 'Nouveau message direct' : 'New direct message',
      isFr ? `Vous avez un nouveau message de ${getDisplayName(currentProfileId)}.` : `You have a new message from ${getDisplayName(currentProfileId)}.`,
      { threadId: activeThreadId, messageId: created.id },
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
      isFr ? `Vous avez un nouveau message vocal de ${getDisplayName(currentProfileId)}.` : `You have a new voice message from ${getDisplayName(currentProfileId)}.`,
      { threadId: activeThreadId, messageId: created.id },
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
      isFr ? `Vous avez reçu un fichier de ${getDisplayName(currentProfileId)}.` : `You received a file from ${getDisplayName(currentProfileId)}.`,
      { threadId: activeThreadId, messageId: created.id },
    );
  };

  const threadLabel = (thread: messagingService.ChatDirectThread) => {
    const others = thread.memberIds.filter((m) => m !== currentProfileId);
    const names = others.map((id) => userByProfileId.get(id)?.fullName || userByProfileId.get(id)?.email || id);
    return names.join(', ') || (isFr ? 'Conversation' : 'Conversation');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-900">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <i className="fas fa-envelope text-slate-600" />
          {isFr ? 'Messagerie' : 'Messaging'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {isFr
            ? 'Canaux dynamiques, conversations directes, messages texte/liens/vocaux.'
            : 'Dynamic channels, direct threads, text/link/voice messaging.'}
        </p>
      </header>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 mb-6 inline-flex gap-1">
        {[
          { id: 'channels' as Tab, label: isFr ? 'Canaux' : 'Channels', icon: 'fa-hashtag' },
          { id: 'direct' as Tab, label: isFr ? 'Direct' : 'Direct', icon: 'fa-comment-dots' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className={`fas ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <aside className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isFr ? 'Canaux' : 'Channels'}</span>
              {loading && <i className="fas fa-spinner fa-spin text-slate-400" />}
            </div>
            <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {channels.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(c.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      activeChannelId === c.id ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {c.name}
                    <span className="block text-xs text-slate-500 font-normal mt-0.5">{c.description || '—'}</span>
                  </button>
                </li>
              ))}
              {channels.length === 0 && (
                <li className="px-4 py-6 text-sm text-slate-500">{isFr ? 'Aucun canal' : 'No channel'}</li>
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

          <main className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col min-h-[520px]">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{activeChannel?.name || (isFr ? 'Canal' : 'Channel')}</p>
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
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {channelMessages.map((m) => {
                const isMe = m.senderId === currentProfileId;
                const sender = userByProfileId.get(m.senderId);
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 max-w-[88%] text-sm ${isMe ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
                  >
                    <span className="block text-[10px] uppercase opacity-70 mb-1">{sender?.fullName || sender?.email || m.senderId}</span>
                    {m.messageType === 'voice' && m.attachmentUrl ? (
                      <audio controls src={m.attachmentUrl} className="w-full" />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{renderContentWithMentions(m.content)}</p>
                    )}
                    {m.messageType !== 'voice' && m.attachmentUrl && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={`text-xs underline ${isMe ? 'text-white/90' : 'text-slate-700'}`}>
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
            <div className="p-3 border-t border-slate-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={channelText}
                  onChange={(e) => setChannelText(e.target.value)}
                  placeholder={isFr ? 'Écrire un message…' : 'Write a message…'}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  disabled={!activeChannelId}
                />
                <button type="button" onClick={sendChannelText} disabled={!activeChannelId || !channelText.trim()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-emerald-700">
                  <i className="fas fa-paper-plane mr-2" />
                  {isFr ? 'Messager' : 'Message'}
                </button>
              </div>
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
        </div>
      )}

      {tab === 'direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <aside className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{isFr ? 'Nouveau direct' : 'New direct'}</p>
              <input
                type="text"
                value={directSearch}
                onChange={(e) => setDirectSearch(e.target.value)}
                placeholder={isFr ? 'Rechercher un utilisateur…' : 'Search user…'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {availableDirectUsers.map((u) => {
                  const pid = String((u as any).profileId || u.id || '');
                  return (
                    <button
                      key={pid}
                      type="button"
                      disabled={openingThread || !currentProfileId || !organizationId}
                      onClick={() => openDirectThread(pid)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {u.fullName || u.name || u.email}
                    </button>
                  );
                })}
              </div>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(t.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      activeThreadId === t.id ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {threadLabel(t)}
                  </button>
                </li>
              ))}
              {threads.length === 0 && (
                <li className="px-4 py-6 text-sm text-slate-500">{isFr ? 'Aucune conversation directe' : 'No direct conversation'}</li>
              )}
            </ul>
          </aside>
          <main className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col min-h-[520px]">
            <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">
              {activeThread ? threadLabel(activeThread) : (isFr ? 'Conversation directe' : 'Direct conversation')}
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {directMessages.map((m) => {
                const isMe = m.senderId === currentProfileId;
                const sender = userByProfileId.get(m.senderId);
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 max-w-[88%] text-sm ${isMe ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
                  >
                    <span className="block text-[10px] uppercase opacity-70 mb-1">{sender?.fullName || sender?.email || m.senderId}</span>
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
            <div className="p-3 border-t border-slate-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  placeholder={isFr ? 'Écrire un message…' : 'Write a message…'}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  disabled={!activeThreadId}
                />
                <button type="button" onClick={sendDirectText} disabled={!activeThreadId || !directText.trim()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-emerald-700">
                  <i className="fas fa-paper-plane mr-2" />
                  {isFr ? 'Messager' : 'Message'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <label className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 font-medium">
                  <i className="fas fa-paperclip mr-1.5" />
                  {isFr ? 'Ajouter fichier' : 'Add file'}
                  <input type="file" className="hidden" onChange={(e) => setDirectFile(e.target.files?.[0] || null)} />
                </label>
                <button type="button" onClick={sendDirectFile} disabled={!activeThreadId || !directFile} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 font-medium">
                  {isFr ? 'Envoyer fichier' : 'Send file'}
                </button>
                <label className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 font-medium">
                  <i className="fas fa-microphone mr-1.5" />
                  {isFr ? 'Ajouter vocal' : 'Add voice'}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => setDirectVoiceFile(e.target.files?.[0] || null)} />
                </label>
                <button type="button" onClick={sendDirectVoice} disabled={!activeThreadId || !directVoiceFile} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 font-medium">
                  {isFr ? 'Envoyer vocal' : 'Send voice'}
                </button>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default MessagerieModule;
