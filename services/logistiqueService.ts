import { supabase } from './supabaseService';
import OrganizationService from './organizationService';

export interface Equipment {
  id: string;
  organizationId: string;
  name: string;
  brand?: string;
  model?: string;
  location?: string;
  responsibleId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentRequest {
  id: string;
  organizationId: string;
  equipmentId: string;
  requesterId: string;
  status: 'requested' | 'validated' | 'allocated' | 'returned' | 'rejected';
  requestedAt?: string;
  validatedAt?: string;
  allocatedAt?: string;
  returnAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapEquipment(row: any): Equipment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    location: row.location ?? undefined,
    responsibleId: row.responsible_id ?? undefined,
    imageUrl: row.image_url ?? undefined,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequest(row: any): EquipmentRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    equipmentId: row.equipment_id,
    requesterId: row.requester_id,
    status: row.status ?? 'requested',
    requestedAt: row.requested_at,
    validatedAt: row.validated_at,
    allocatedAt: row.allocated_at,
    returnAt: row.return_at,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listEquipments(organizationId?: string | null): Promise<Equipment[]> {
  try {
    const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('equipments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');
    if (error) return [];
    return (data || []).map(mapEquipment);
  } catch {
    return [];
  }
}

export async function createEquipment(params: {
  name: string;
  brand?: string;
  model?: string;
  location?: string;
  responsibleId?: string;
}): Promise<Equipment | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('equipments')
      .insert({
        organization_id: orgId,
        name: params.name.trim(),
        brand: params.brand?.trim() || null,
        model: params.model?.trim() || null,
        location: params.location?.trim() || null,
        responsible_id: params.responsibleId || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return mapEquipment(data);
  } catch (e) {
    console.error('logistiqueService.createEquipment:', e);
    return null;
  }
}

export async function listEquipmentRequests(organizationId?: string | null): Promise<EquipmentRequest[]> {
  try {
    const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('equipment_requests')
      .select('*')
      .eq('organization_id', orgId)
      .order('requested_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapRequest);
  } catch {
    return [];
  }
}

export async function createEquipmentRequest(params: {
  equipmentId: string;
  notes?: string;
}): Promise<EquipmentRequest | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return null;
    const { data, error } = await supabase
      .from('equipment_requests')
      .insert({
        organization_id: orgId,
        equipment_id: params.equipmentId,
        requester_id: profile.id,
        status: 'requested',
        notes: params.notes || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return mapRequest(data);
  } catch (e) {
    console.error('logistiqueService.createEquipmentRequest:', e);
    return null;
  }
}

export async function updateEquipmentRequestStatus(
  id: string,
  status: 'validated' | 'allocated' | 'returned' | 'rejected'
): Promise<boolean> {
  try {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'validated') updates.validated_at = new Date().toISOString();
    if (status === 'allocated') updates.allocated_at = new Date().toISOString();
    if (status === 'returned') updates.return_at = new Date().toISOString();
    const { error } = await supabase.from('equipment_requests').update(updates).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
