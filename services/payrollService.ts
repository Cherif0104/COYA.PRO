import { supabase } from './supabaseService';
import OrganizationService from './organizationService';
import DataAdapter from './dataAdapter';
import { DataService } from './dataService';
import * as hrAnalyticsService from './hrAnalyticsService';

export interface PaySlip {
  id: string;
  organizationId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  netAmount: number;
  currencyCode?: string;
  status: 'draft' | 'validated' | 'paid';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapRow(row: any): PaySlip {
  return {
    id: row.id,
    organizationId: row.organization_id,
    profileId: row.profile_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    grossAmount: Number(row.gross_amount ?? 0),
    netAmount: Number(row.net_amount ?? 0),
    currencyCode: row.currency_code ?? 'XOF',
    status: row.status ?? 'draft',
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPaySlips(organizationId?: string | null): Promise<PaySlip[]> {
  try {
    const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('pay_slips')
      .select('*')
      .eq('organization_id', orgId)
      .order('period_start', { ascending: false });
    if (error) return [];
    return (data || []).map(mapRow);
  } catch {
    return [];
  }
}

export async function createPaySlip(params: {
  profileId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  netAmount: number;
  currencyCode?: string;
  notes?: string;
}): Promise<PaySlip | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('pay_slips')
      .insert({
        organization_id: orgId,
        profile_id: params.profileId,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        gross_amount: params.grossAmount,
        net_amount: params.netAmount,
        currency_code: params.currencyCode ?? 'XOF',
        status: 'draft',
        notes: params.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  } catch (e) {
    console.error('payrollService.createPaySlip:', e);
    return null;
  }
}

export async function updatePaySlipStatus(id: string, status: 'draft' | 'validated' | 'paid'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pay_slips')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function simulatePaySlipFromAttendance(profileId: string, periodStart: string, periodEnd: string): Promise<{
  grossAmount: number;
  netAmount: number;
  payableHours: number;
  delayMinutes: number;
  unauthorizedAbsenceMinutes: number;
  disconnectCount: number;
  hourlyRate: number;
} | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const [employees, sessions, absences, policy, statusEvents, profiles] = await Promise.all([
      DataAdapter.listEmployees(orgId),
      DataAdapter.getPresenceSessions({ organizationId: orgId, from: `${periodStart}T00:00:00.000Z`, to: `${periodEnd}T23:59:59.999Z` }),
      hrAnalyticsService.listHrAbsenceEvents(orgId),
      DataAdapter.getHrAttendancePolicy(orgId),
      DataAdapter.listPresenceStatusEvents({ organizationId: orgId, from: `${periodStart}T00:00:00.000Z`, to: `${periodEnd}T23:59:59.999Z` }),
      DataService.getProfiles(),
    ]);
    const employee = employees.find((e) => String(e.profileId) === String(profileId));
    if (!employee) return null;
    const userIdByProfile = (profiles.data || []).reduce<Record<string, string>>((acc, row: any) => {
      if (row?.id && row?.user_id) acc[String(row.id)] = String(row.user_id);
      return acc;
    }, {});
    const compliance = hrAnalyticsService.computePresenceCompliance({
      employees: [employee],
      sessions,
      statusEvents,
      absences,
      policy,
      userIdByProfile,
      periodStart,
      periodEnd,
    })[0];
    if (!compliance) return null;
    const grossAmount = Math.max(0, (compliance.totalWorkedMinutes / 60) * compliance.hourlyRate);
    const netAmount = Math.max(0, compliance.payableAmount);
    return {
      grossAmount,
      netAmount,
      payableHours: compliance.paidMinutes / 60,
      delayMinutes: compliance.delayMinutes,
      unauthorizedAbsenceMinutes: compliance.unauthorizedAbsenceMinutes,
      disconnectCount: compliance.disconnectCount,
      hourlyRate: compliance.hourlyRate,
    };
  } catch (e) {
    console.error('payrollService.simulatePaySlipFromAttendance:', e);
    return null;
  }
}
