import { supabase } from './supabaseService';

export interface ReferentialValue {
  id: string;
  referentialType: string;
  organizationId: string | null;
  name: string;
  sequence: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const TABLE = 'referential_values';

function mapRow(r: any): ReferentialValue {
  return {
    id: r.id,
    referentialType: r.referential_type,
    organizationId: r.organization_id ?? null,
    name: r.name,
    sequence: r.sequence ?? 0,
    isActive: r.is_active ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listValues(
  referentialType: string,
  organizationId: string | null
): Promise<ReferentialValue[]> {
  try {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('referential_type', referentialType)
      .eq('is_active', true)
      .order('sequence', { ascending: true })
      .order('name');
    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      query = query.is('organization_id', null);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapRow);
  } catch {
    return [];
  }
}

export async function getValue(id: string): Promise<ReferentialValue | null> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export async function createValue(params: {
  referentialType: string;
  organizationId: string | null;
  name: string;
  sequence?: number;
}): Promise<ReferentialValue> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      referential_type: params.referentialType,
      organization_id: params.organizationId ?? null,
      name: params.name.trim(),
      sequence: params.sequence ?? 0,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateValue(
  id: string,
  updates: { name?: string; sequence?: number; isActive?: boolean }
): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.sequence !== undefined) row.sequence = updates.sequence;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  const { error } = await supabase.from(TABLE).update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteValue(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
