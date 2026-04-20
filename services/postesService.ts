import { supabase } from './supabaseService';
import { Poste } from '../types';

const TABLE = 'postes';

export async function listAllPostes(organizationId?: string | null): Promise<Poste[]> {
  try {
    let query = supabase.from(TABLE).select('*').order('name');
    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id ?? null,
      name: r.name,
      slug: r.slug ?? undefined,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function listPostes(organizationId?: string | null): Promise<Poste[]> {
  try {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id ?? null,
      name: r.name,
      slug: r.slug ?? undefined,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getPoste(id: string): Promise<Poste | null> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      organizationId: data.organization_id ?? null,
      name: data.name,
      slug: data.slug ?? undefined,
      isActive: data.is_active !== false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function createPoste(params: {
  organizationId?: string | null;
  name: string;
  slug?: string | null;
}): Promise<Poste> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      organization_id: params.organizationId ?? null,
      name: params.name.trim(),
      slug: params.slug ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    organizationId: data.organization_id ?? null,
    name: data.name,
    slug: data.slug ?? undefined,
    isActive: data.is_active !== false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updatePoste(
  id: string,
  params: {
    name?: string;
    slug?: string | null;
    isActive?: boolean;
  }
): Promise<Poste> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.name !== undefined) payload.name = params.name.trim();
  if (params.slug !== undefined) payload.slug = params.slug ?? null;
  if (params.isActive !== undefined) payload.is_active = params.isActive;

  const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return {
    id: data.id,
    organizationId: data.organization_id ?? null,
    name: data.name,
    slug: data.slug ?? undefined,
    isActive: data.is_active !== false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
