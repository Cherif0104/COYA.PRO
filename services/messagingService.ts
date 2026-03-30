import { supabase } from './supabaseService';

export type ChatChannelType = 'public' | 'private' | 'announcement';
export type ChatMessageType = 'text' | 'link' | 'voice' | 'system';

export interface ChatChannel {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  type: ChatChannelType;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatDirectThread {
  id: string;
  organizationId: string;
  createdById: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  memberIds: string[];
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  channelId?: string | null;
  directThreadId?: string | null;
  senderId: string;
  content: string;
  messageType: ChatMessageType;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

type LocalStore = {
  channels: ChatChannel[];
  channelMembers: Array<{ channelId: string; profileId: string }>;
  directThreads: ChatDirectThread[];
  directMembers: Array<{ threadId: string; profileId: string }>;
  messages: ChatMessage[];
};

const TABLE_CHANNELS = 'chat_channels';
const TABLE_CHANNEL_MEMBERS = 'chat_channel_members';
const TABLE_DIRECT_THREADS = 'chat_direct_threads';
const TABLE_DIRECT_MEMBERS = 'chat_direct_members';
const TABLE_MESSAGES = 'chat_messages';
const LOCAL_KEY = 'coya_messaging_fallback_v1';

function isMissingTableError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    details.includes('does not exist')
  );
}

function makeId(prefix: string): string {
  try {
    const anyCrypto = (globalThis as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  } catch {
    // ignore
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readLocal(): LocalStore {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_KEY) : null;
    if (!raw) {
      return { channels: [], channelMembers: [], directThreads: [], directMembers: [], messages: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      channels: Array.isArray(parsed?.channels) ? parsed.channels : [],
      channelMembers: Array.isArray(parsed?.channelMembers) ? parsed.channelMembers : [],
      directThreads: Array.isArray(parsed?.directThreads) ? parsed.directThreads : [],
      directMembers: Array.isArray(parsed?.directMembers) ? parsed.directMembers : [],
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
    };
  } catch {
    return { channels: [], channelMembers: [], directThreads: [], directMembers: [], messages: [] };
  }
}

function writeLocal(store: LocalStore): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
    }
  } catch {
    // ignore
  }
}

function mapChannel(r: any): ChatChannel {
  return {
    id: String(r.id),
    organizationId: String(r.organization_id),
    name: r.name,
    description: r.description ?? null,
    type: (r.type || 'public') as ChatChannelType,
    isActive: r.is_active ?? true,
    createdById: String(r.created_by_id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMessage(r: any): ChatMessage {
  return {
    id: String(r.id),
    organizationId: String(r.organization_id),
    channelId: r.channel_id ?? null,
    directThreadId: r.direct_thread_id ?? null,
    senderId: String(r.sender_id),
    content: r.content ?? '',
    messageType: (r.message_type || 'text') as ChatMessageType,
    attachmentUrl: r.attachment_url ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listChannels(params: { organizationId: string; profileId: string }): Promise<ChatChannel[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_CHANNELS)
      .select('*')
      .eq('organization_id', params.organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) {
      if (!isMissingTableError(error)) return [];
      const local = readLocal();
      const memberIds = new Set(
        local.channelMembers.filter((m) => m.profileId === params.profileId).map((m) => m.channelId)
      );
      return local.channels
        .filter((c) => c.organizationId === params.organizationId && c.isActive && (c.type === 'public' || memberIds.has(c.id)))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return (data || []).map(mapChannel);
  } catch {
    return [];
  }
}

export async function listChannelMembers(channelId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.from(TABLE_CHANNEL_MEMBERS).select('profile_id').eq('channel_id', channelId);
    if (error) {
      if (!isMissingTableError(error)) return [];
      const local = readLocal();
      return local.channelMembers.filter((m) => m.channelId === channelId).map((m) => m.profileId);
    }
    return (data || []).map((r: any) => String(r.profile_id));
  } catch {
    return [];
  }
}

export async function createChannel(params: {
  organizationId: string;
  createdById: string;
  name: string;
  description?: string;
  type?: ChatChannelType;
  memberIds: string[];
}): Promise<ChatChannel> {
  const payload = {
    organization_id: params.organizationId,
    created_by_id: params.createdById,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    type: params.type || 'public',
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE_CHANNELS).insert(payload).select('*').single();
  if (error) {
    if (!isMissingTableError(error)) throw error;
    const local = readLocal();
    const now = new Date().toISOString();
    const created: ChatChannel = {
      id: makeId('chan'),
      organizationId: params.organizationId,
      name: payload.name,
      description: payload.description,
      type: (params.type || 'public') as ChatChannelType,
      isActive: true,
      createdById: params.createdById,
      createdAt: now,
      updatedAt: now,
    };
    local.channels.unshift(created);
    const members = Array.from(new Set([params.createdById, ...params.memberIds]));
    members.forEach((pid) => local.channelMembers.push({ channelId: created.id, profileId: pid }));
    writeLocal(local);
    return created;
  }

  const created = mapChannel(data);
  await setChannelMembers(created.id, Array.from(new Set([params.createdById, ...params.memberIds])));
  return created;
}

export async function updateChannel(
  channelId: string,
  updates: { name?: string; description?: string; type?: ChatChannelType; isActive?: boolean },
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name.trim();
  if (updates.description !== undefined) row.description = updates.description?.trim() || null;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  const { error } = await supabase.from(TABLE_CHANNELS).update(row).eq('id', channelId);
  if (error) {
    if (!isMissingTableError(error)) throw error;
    const local = readLocal();
    const idx = local.channels.findIndex((c) => c.id === channelId);
    if (idx < 0) return;
    local.channels[idx] = {
      ...local.channels[idx],
      name: updates.name !== undefined ? updates.name : local.channels[idx].name,
      description: updates.description !== undefined ? updates.description : local.channels[idx].description,
      type: updates.type !== undefined ? updates.type : local.channels[idx].type,
      isActive: updates.isActive !== undefined ? updates.isActive : local.channels[idx].isActive,
      updatedAt: row.updated_at,
    };
    writeLocal(local);
  }
}

export async function archiveChannel(channelId: string): Promise<void> {
  return updateChannel(channelId, { isActive: false });
}

export async function setChannelMembers(channelId: string, memberIds: string[]): Promise<void> {
  const unique = Array.from(new Set(memberIds.filter(Boolean)));
  const { error: delErr } = await supabase.from(TABLE_CHANNEL_MEMBERS).delete().eq('channel_id', channelId);
  if (delErr) {
    if (!isMissingTableError(delErr)) throw delErr;
    const local = readLocal();
    local.channelMembers = local.channelMembers.filter((m) => m.channelId !== channelId);
    unique.forEach((pid) => local.channelMembers.push({ channelId, profileId: pid }));
    writeLocal(local);
    return;
  }
  if (unique.length > 0) {
    const rows = unique.map((profileId) => ({
      channel_id: channelId,
      profile_id: profileId,
      created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from(TABLE_CHANNEL_MEMBERS).insert(rows);
    if (error) throw error;
  }
}

export async function listChannelMessages(channelId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_MESSAGES)
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
    if (error) {
      if (!isMissingTableError(error)) return [];
      const local = readLocal();
      return local.messages
        .filter((m) => m.channelId === channelId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return (data || []).map(mapMessage);
  } catch {
    return [];
  }
}

export async function sendChannelMessage(params: {
  organizationId: string;
  channelId: string;
  senderId: string;
  content: string;
  messageType?: ChatMessageType;
  attachmentUrl?: string | null;
}): Promise<ChatMessage> {
  const row = {
    organization_id: params.organizationId,
    channel_id: params.channelId,
    direct_thread_id: null,
    sender_id: params.senderId,
    content: params.content,
    message_type: params.messageType || 'text',
    attachment_url: params.attachmentUrl ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE_MESSAGES).insert(row).select('*').single();
  if (error) {
    if (!isMissingTableError(error)) throw error;
    const local = readLocal();
    const created: ChatMessage = {
      id: makeId('msg'),
      organizationId: params.organizationId,
      channelId: params.channelId,
      directThreadId: null,
      senderId: params.senderId,
      content: params.content,
      messageType: params.messageType || 'text',
      attachmentUrl: params.attachmentUrl ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    local.messages.push(created);
    writeLocal(local);
    return created;
  }
  return mapMessage(data);
}

export async function listDirectThreads(params: { organizationId: string; profileId: string }): Promise<ChatDirectThread[]> {
  try {
    const { data: memberships, error: mErr } = await supabase
      .from(TABLE_DIRECT_MEMBERS)
      .select('thread_id')
      .eq('profile_id', params.profileId);
    if (mErr) {
      if (!isMissingTableError(mErr)) return [];
      const local = readLocal();
      const threadIds = new Set(
        local.directMembers.filter((m) => m.profileId === params.profileId).map((m) => m.threadId)
      );
      return local.directThreads
        .filter((t) => t.organizationId === params.organizationId && t.isActive && threadIds.has(t.id))
        .map((t) => ({
          ...t,
          memberIds: local.directMembers.filter((m) => m.threadId === t.id).map((m) => m.profileId),
        }))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    }
    const threadIds = (memberships || []).map((r: any) => String(r.thread_id));
    if (threadIds.length === 0) return [];
    const { data: threads, error: tErr } = await supabase
      .from(TABLE_DIRECT_THREADS)
      .select('*')
      .in('id', threadIds)
      .eq('organization_id', params.organizationId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });
    if (tErr) return [];
    const { data: allMembers } = await supabase
      .from(TABLE_DIRECT_MEMBERS)
      .select('thread_id, profile_id')
      .in('thread_id', threadIds);
    return (threads || []).map((t: any) => ({
      id: String(t.id),
      organizationId: String(t.organization_id),
      createdById: String(t.created_by_id),
      isActive: t.is_active ?? true,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      memberIds: (allMembers || [])
        .filter((m: any) => String(m.thread_id) === String(t.id))
        .map((m: any) => String(m.profile_id)),
    }));
  } catch {
    return [];
  }
}

export async function createOrGetDirectThread(params: {
  organizationId: string;
  createdById: string;
  memberIds: string[];
}): Promise<ChatDirectThread> {
  const unique = Array.from(new Set(params.memberIds.filter(Boolean)));
  if (unique.length < 2) throw new Error('Direct thread requires at least two members.');

  const all = await listDirectThreads({ organizationId: params.organizationId, profileId: params.createdById });
  const existing = all.find((t) => {
    if (t.memberIds.length !== unique.length) return false;
    const set = new Set(t.memberIds);
    return unique.every((m) => set.has(m));
  });
  if (existing) return existing;

  const row = {
    organization_id: params.organizationId,
    created_by_id: params.createdById,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE_DIRECT_THREADS).insert(row).select('*').single();
  if (error) {
    if (!isMissingTableError(error)) throw error;
    const local = readLocal();
    const now = new Date().toISOString();
    const thread: ChatDirectThread = {
      id: makeId('dm'),
      organizationId: params.organizationId,
      createdById: params.createdById,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      memberIds: unique,
    };
    local.directThreads.unshift(thread);
    unique.forEach((profileId) => local.directMembers.push({ threadId: thread.id, profileId }));
    writeLocal(local);
    return thread;
  }
  const threadId = String(data.id);
  const memberRows = unique.map((profileId) => ({ thread_id: threadId, profile_id: profileId, created_at: new Date().toISOString() }));
  const { error: membersError } = await supabase.from(TABLE_DIRECT_MEMBERS).insert(memberRows);
  if (membersError) throw membersError;
  return {
    id: threadId,
    organizationId: String(data.organization_id),
    createdById: String(data.created_by_id),
    isActive: data.is_active ?? true,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    memberIds: unique,
  };
}

export async function listDirectMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_MESSAGES)
      .select('*')
      .eq('direct_thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) {
      if (!isMissingTableError(error)) return [];
      const local = readLocal();
      return local.messages
        .filter((m) => m.directThreadId === threadId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return (data || []).map(mapMessage);
  } catch {
    return [];
  }
}

export async function sendDirectMessage(params: {
  organizationId: string;
  directThreadId: string;
  senderId: string;
  content: string;
  messageType?: ChatMessageType;
  attachmentUrl?: string | null;
}): Promise<ChatMessage> {
  const row = {
    organization_id: params.organizationId,
    channel_id: null,
    direct_thread_id: params.directThreadId,
    sender_id: params.senderId,
    content: params.content,
    message_type: params.messageType || 'text',
    attachment_url: params.attachmentUrl ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE_MESSAGES).insert(row).select('*').single();
  if (error) {
    if (!isMissingTableError(error)) throw error;
    const local = readLocal();
    const created: ChatMessage = {
      id: makeId('msg'),
      organizationId: params.organizationId,
      channelId: null,
      directThreadId: params.directThreadId,
      senderId: params.senderId,
      content: params.content,
      messageType: params.messageType || 'text',
      attachmentUrl: params.attachmentUrl ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    local.messages.push(created);
    writeLocal(local);
    return created;
  }
  return mapMessage(data);
}
