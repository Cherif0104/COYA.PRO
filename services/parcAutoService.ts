import { supabase } from './supabaseService';
import OrganizationService from './organizationService';

export interface Vehicle {
  id: string;
  organizationId: string;
  name: string;
  brand?: string;
  model?: string;
  plateNumber?: string;
  location?: string;
  responsibleId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleRequest {
  id: string;
  organizationId: string;
  vehicleId: string;
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

function mapVehicle(row: any): Vehicle {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    plateNumber: row.plate_number ?? undefined,
    location: row.location ?? undefined,
    responsibleId: row.responsible_id ?? undefined,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequest(row: any): VehicleRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vehicleId: row.vehicle_id,
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

export async function listVehicles(organizationId?: string | null): Promise<Vehicle[]> {
  try {
    const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');
    if (error) return [];
    return (data || []).map(mapVehicle);
  } catch {
    return [];
  }
}

export async function createVehicle(params: {
  name: string;
  brand?: string;
  model?: string;
  plateNumber?: string;
  location?: string;
}): Promise<Vehicle | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        organization_id: orgId,
        name: params.name.trim(),
        brand: params.brand?.trim() || null,
        model: params.model?.trim() || null,
        plate_number: params.plateNumber?.trim() || null,
        location: params.location?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return mapVehicle(data);
  } catch (e) {
    console.error('parcAutoService.createVehicle:', e);
    return null;
  }
}

export async function listVehicleRequests(organizationId?: string | null): Promise<VehicleRequest[]> {
  try {
    const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('vehicle_requests')
      .select('*')
      .eq('organization_id', orgId)
      .order('requested_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapRequest);
  } catch {
    return [];
  }
}

export async function createVehicleRequest(params: {
  vehicleId: string;
  notes?: string;
}): Promise<VehicleRequest | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return null;
    const { data, error } = await supabase
      .from('vehicle_requests')
      .insert({
        organization_id: orgId,
        vehicle_id: params.vehicleId,
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
    console.error('parcAutoService.createVehicleRequest:', e);
    return null;
  }
}

export async function updateVehicleRequestStatus(
  id: string,
  status: 'validated' | 'allocated' | 'returned' | 'rejected'
): Promise<boolean> {
  try {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'validated') updates.validated_at = new Date().toISOString();
    if (status === 'allocated') updates.allocated_at = new Date().toISOString();
    if (status === 'returned') updates.return_at = new Date().toISOString();
    const { error } = await supabase.from('vehicle_requests').update(updates).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
