import { supabase } from './supabaseService';

const DAF_BUCKET = 'daf-service-files';

export type DafRequestCategory =
  | 'supplies'
  | 'logistics'
  | 'it_misc'
  | 'vehicle'
  | 'furniture'
  | 'travel'
  | 'other';

/** Type de circuit : général, remise de documents, réponse d'information, signature. */
export type DafRequestKind = 'general' | 'document_delivery' | 'information' | 'signature_workflow';

export type DafSignaturePhase = 'none' | 'original_provided' | 'sent_for_signature' | 'signed_returned';

export type DafRequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'awaiting_requester'
  | 'pending_external_signature'
  | 'approved'
  | 'rejected'
  | 'fulfilled'
  | 'cancelled';

export type DafMessageVisibility = 'public' | 'daf_internal';

export type DafAttachmentKind =
  | 'supporting'
  | 'daf_deliverable'
  | 'info_answer'
  | 'signature_original'
  | 'signature_signed';

export type DafServiceRequest = {
  id: string;
  organization_id: string;
  requester_profile_id: string;
  assignee_profile_id: string | null;
  title: string;
  description: string | null;
  category: DafRequestCategory;
  request_kind: DafRequestKind;
  signature_phase: DafSignaturePhase;
  status: DafRequestStatus;
  daf_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type DafRequestMessage = {
  id: string;
  request_id: string;
  organization_id: string;
  author_profile_id: string;
  body: string;
  link_url: string | null;
  visibility: DafMessageVisibility;
  created_at: string;
};

export type DafRequestAttachment = {
  id: string;
  request_id: string;
  organization_id: string;
  uploaded_by_profile_id: string;
  attachment_kind: DafAttachmentKind;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
};

export type DafProfileContext = {
  profileId: string;
  organizationId: string;
  role: string;
  isReviewer: boolean;
};

function mapRow(r: any): DafServiceRequest {
  return {
    id: r.id,
    organization_id: r.organization_id,
    requester_profile_id: r.requester_profile_id,
    assignee_profile_id: r.assignee_profile_id ?? null,
    title: r.title,
    description: r.description ?? null,
    category: r.category,
    request_kind: (r.request_kind ?? 'general') as DafRequestKind,
    signature_phase: (r.signature_phase ?? 'none') as DafSignaturePhase,
    status: r.status,
    daf_comment: r.daf_comment ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function mapMessage(r: any): DafRequestMessage {
  return {
    id: r.id,
    request_id: r.request_id,
    organization_id: r.organization_id,
    author_profile_id: r.author_profile_id,
    body: r.body ?? '',
    link_url: r.link_url ?? null,
    visibility: (r.visibility ?? 'public') as DafMessageVisibility,
    created_at: r.created_at,
  };
}

function mapAttachment(r: any): DafRequestAttachment {
  return {
    id: r.id,
    request_id: r.request_id,
    organization_id: r.organization_id,
    uploaded_by_profile_id: r.uploaded_by_profile_id,
    attachment_kind: r.attachment_kind,
    storage_bucket: r.storage_bucket ?? DAF_BUCKET,
    storage_path: r.storage_path,
    file_name: r.file_name,
    mime_type: r.mime_type ?? null,
    created_at: r.created_at,
  };
}

async function getProfileContext(): Promise<{ data: DafProfileContext | null; error: Error | null }> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return { data: null, error: new Error('Non authentifié') };
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', uid)
    .maybeSingle();
  if (error || !profile) return { data: null, error: error ?? new Error('Profil introuvable') };
  const role = String((profile as any).role ?? '');
  const isReviewer = ['super_administrator', 'administrator', 'manager'].includes(role);
  return {
    data: {
      profileId: (profile as any).id,
      organizationId: (profile as any).organization_id,
      role,
      isReviewer,
    },
    error: null,
  };
}

export class DafService {
  static async getProfileContext() {
    return getProfileContext();
  }

  static async listMyRequests() {
    const ctx = await getProfileContext();
    if (ctx.error || !ctx.data) return { data: [] as DafServiceRequest[], error: ctx.error };

    const { data, error } = await supabase
      .from('daf_service_requests')
      .select('*')
      .eq('organization_id', ctx.data.organizationId)
      .order('created_at', { ascending: false });

    if (error) return { data: [] as DafServiceRequest[], error };
    return { data: (data || []).map(mapRow), error: null };
  }

  static async createRequest(params: {
    title: string;
    description?: string | null;
    category: DafRequestCategory;
    request_kind: DafRequestKind;
    status: 'draft' | 'submitted';
  }) {
    const ctx = await getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DafServiceRequest | null, error: ctx.error };

    const { data, error } = await supabase
      .from('daf_service_requests')
      .insert({
        organization_id: ctx.data.organizationId,
        requester_profile_id: ctx.data.profileId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        category: params.category,
        request_kind: params.request_kind,
        signature_phase: 'none',
        status: params.status,
      })
      .select('*')
      .single();

    if (error) return { data: null, error };
    return { data: mapRow(data), error: null };
  }

  static async updateRequest(
    id: string,
    patch: Partial<
      Pick<
        DafServiceRequest,
        'title' | 'description' | 'category' | 'request_kind' | 'signature_phase' | 'status' | 'daf_comment' | 'assignee_profile_id'
      >
    >,
  ) {
    const { data, error } = await supabase.from('daf_service_requests').update(patch).eq('id', id).select('*').single();
    if (error) return { data: null, error };
    return { data: mapRow(data), error: null };
  }

  static async deleteDraft(id: string) {
    const { error } = await supabase.from('daf_service_requests').delete().eq('id', id);
    return { error };
  }

  static async listMessages(requestId: string) {
    const { data, error } = await supabase
      .from('daf_service_request_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) return { data: [] as DafRequestMessage[], error };
    return { data: (data || []).map(mapMessage), error: null };
  }

  static async addMessage(params: {
    requestId: string;
    organizationId: string;
    body: string;
    linkUrl?: string | null;
    visibility?: DafMessageVisibility;
  }) {
    const ctx = await getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DafRequestMessage | null, error: ctx.error };

    const { data, error } = await supabase
      .from('daf_service_request_messages')
      .insert({
        request_id: params.requestId,
        organization_id: params.organizationId,
        author_profile_id: ctx.data.profileId,
        body: params.body.trim(),
        link_url: params.linkUrl?.trim() || null,
        visibility: params.visibility ?? 'public',
      })
      .select('*')
      .single();

    if (error) return { data: null, error };
    return { data: mapMessage(data), error: null };
  }

  static async listAttachments(requestId: string) {
    const { data, error } = await supabase
      .from('daf_service_request_attachments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) return { data: [] as DafRequestAttachment[], error };
    return { data: (data || []).map(mapAttachment), error: null };
  }

  static async uploadAttachment(params: {
    requestId: string;
    organizationId: string;
    file: File;
    attachmentKind: DafAttachmentKind;
  }) {
    const ctx = await getProfileContext();
    if (ctx.error || !ctx.data) return { data: null as DafRequestAttachment | null, error: ctx.error };

    const safeName = params.file.name.replace(/[^\w.\-()+ ]/g, '_').slice(0, 180) || 'file';
    const storagePath = `${params.organizationId}/${params.requestId}/${crypto.randomUUID()}_${safeName}`;

    const { error: upErr } = await supabase.storage.from(DAF_BUCKET).upload(storagePath, params.file, {
      upsert: false,
      contentType: params.file.type || undefined,
    });
    if (upErr) return { data: null, error: upErr };

    const { data, error } = await supabase
      .from('daf_service_request_attachments')
      .insert({
        request_id: params.requestId,
        organization_id: params.organizationId,
        uploaded_by_profile_id: ctx.data.profileId,
        attachment_kind: params.attachmentKind,
        storage_bucket: DAF_BUCKET,
        storage_path: storagePath,
        file_name: params.file.name,
        mime_type: params.file.type || null,
      })
      .select('*')
      .single();

    if (error) {
      await supabase.storage.from(DAF_BUCKET).remove([storagePath]).catch(() => undefined);
      return { data: null, error };
    }
    return { data: mapAttachment(data), error: null };
  }

  static async getAttachmentDownloadUrl(attachment: DafRequestAttachment, expiresInSeconds = 3600) {
    const { data, error } = await supabase.storage
      .from(attachment.storage_bucket)
      .createSignedUrl(attachment.storage_path, expiresInSeconds);
    return { url: data?.signedUrl ?? null, error };
  }

  static async deleteAttachmentRow(id: string) {
    const { data: row, error: fe } = await supabase
      .from('daf_service_request_attachments')
      .select('storage_bucket, storage_path')
      .eq('id', id)
      .maybeSingle();
    if (fe) return { error: fe };
    if (!row) return { error: new Error('Pièce jointe introuvable') };
    const { error: de } = await supabase.from('daf_service_request_attachments').delete().eq('id', id);
    if (de) return { error: de };
    await supabase.storage.from(row.storage_bucket).remove([row.storage_path]).catch(() => undefined);
    return { error: null };
  }
}
