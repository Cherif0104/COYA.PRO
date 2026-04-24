import type { PaySlipLine, PaySlipWithLines } from '../types';
import { supabase } from './supabaseService';
import OrganizationService from './organizationService';
import DataAdapter from './dataAdapter';
import { DataService } from './dataService';
import * as hrAnalyticsService from './hrAnalyticsService';
import * as payrollEngine from './payrollEngine';

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
  projectId?: string | null;
  programmeId?: string | null;
  fundingSource?: string | null;
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
    projectId: row.project_id ?? undefined,
    programmeId: row.programme_id ?? undefined,
    fundingSource: row.funding_source ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLineRow(row: any): PaySlipLine {
  return {
    id: row.id,
    paySlipId: row.pay_slip_id,
    organizationId: row.organization_id,
    rubriqueCode: row.rubrique_code,
    label: row.label,
    side: row.side,
    amount: Number(row.amount ?? 0),
    orderIndex: row.order_index ?? 0,
    metadata: row.metadata ?? undefined,
    ohadaAccountSuggestion: row.ohada_account_suggestion ?? undefined,
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

export async function listPaySlipsForPeriod(
  periodStart: string,
  periodEnd: string,
  organizationId?: string | null
): Promise<PaySlip[]> {
  try {
    const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('pay_slips')
      .select('*')
      .eq('organization_id', orgId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .order('profile_id');
    if (error) return [];
    return (data || []).map(mapRow);
  } catch {
    return [];
  }
}

export async function listPaySlipLines(paySlipId: string): Promise<PaySlipLine[]> {
  try {
    const { data, error } = await supabase
      .from('pay_slip_lines')
      .select('*')
      .eq('pay_slip_id', paySlipId)
      .order('order_index', { ascending: true });
    if (error) return [];
    return (data || []).map(mapLineRow);
  } catch {
    return [];
  }
}

export async function listPaySlipsWithLinesForPeriod(
  periodStart: string,
  periodEnd: string,
  organizationId?: string | null
): Promise<PaySlipWithLines[]> {
  const slips = await listPaySlipsForPeriod(periodStart, periodEnd, organizationId);
  if (slips.length === 0) return [];
  const ids = slips.map((s) => s.id);
  const { data: lineRows, error } = await supabase.from('pay_slip_lines').select('*').in('pay_slip_id', ids);
  if (error) {
    return slips.map((s) => ({ ...s, lines: [] }));
  }
  const bySlip = new Map<string, PaySlipLine[]>();
  for (const row of lineRows || []) {
    const sid = String(row.pay_slip_id);
    if (!bySlip.has(sid)) bySlip.set(sid, []);
    bySlip.get(sid)!.push(mapLineRow(row));
  }
  return slips.map((s) => ({
    id: s.id,
    organizationId: s.organizationId,
    profileId: s.profileId,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    grossAmount: s.grossAmount,
    netAmount: s.netAmount,
    currencyCode: s.currencyCode,
    status: s.status,
    notes: s.notes,
    projectId: s.projectId,
    programmeId: s.programmeId,
    fundingSource: s.fundingSource,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    lines: bySlip.get(s.id) || [],
  }));
}

export async function replacePaySlipLines(paySlipId: string, organizationId: string, lines: PaySlipLine[]): Promise<boolean> {
  try {
    const { error: delErr } = await supabase.from('pay_slip_lines').delete().eq('pay_slip_id', paySlipId);
    if (delErr) throw delErr;
    if (lines.length === 0) return true;
    const rows = lines.map((l, i) => ({
      pay_slip_id: paySlipId,
      organization_id: organizationId,
      rubrique_code: l.rubriqueCode,
      label: l.label,
      side: l.side,
      amount: l.amount,
      order_index: l.orderIndex ?? i,
      metadata: l.metadata ?? null,
      ohada_account_suggestion: l.ohadaAccountSuggestion ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('pay_slip_lines').insert(rows);
    return !error;
  } catch (e) {
    console.error('payrollService.replacePaySlipLines:', e);
    return false;
  }
}

export async function createPaySlipWithLines(params: {
  profileId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  netAmount: number;
  currencyCode?: string;
  notes?: string;
  lines: PaySlipLine[];
}): Promise<PaySlip | null> {
  const slip = await createPaySlip({
    profileId: params.profileId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    grossAmount: params.grossAmount,
    netAmount: params.netAmount,
    currencyCode: params.currencyCode,
    notes: params.notes,
  });
  if (!slip) return null;
  const orgId = slip.organizationId;
  const ok = await replacePaySlipLines(slip.id, orgId, params.lines);
  if (!ok) return slip;
  return slip;
}

async function findPaySlipByProfilePeriod(
  orgId: string,
  profileId: string,
  periodStart: string,
  periodEnd: string
): Promise<PaySlip | null> {
  const { data, error } = await supabase
    .from('pay_slips')
    .select('*')
    .eq('organization_id', orgId)
    .eq('profile_id', profileId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

/** Crée ou met à jour des brouillons + lignes pour tous les salariés (ignore validés / payés). */
export async function bulkGenerateDraftPaySlipsForPeriod(
  periodStart: string,
  periodEnd: string,
  organizationId?: string | null
): Promise<{ created: number; updated: number; skipped: number }> {
  const orgId = organizationId || (await OrganizationService.getCurrentUserOrganizationId());
  if (!orgId) return { created: 0, updated: 0, skipped: 0 };
  const ctx = await payrollEngine.fetchPayrollEngineContext(orgId, periodStart, periodEnd);
  const results = payrollEngine.computePayrollsForContext(ctx);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const r of results) {
    const existing = await findPaySlipByProfilePeriod(orgId, r.profileId, periodStart, periodEnd);
    if (existing?.status === 'validated' || existing?.status === 'paid') {
      skipped += 1;
      continue;
    }
    if (existing) {
      const { error } = await supabase
        .from('pay_slips')
        .update({
          gross_amount: r.grossAmount,
          net_amount: r.netAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) {
        skipped += 1;
        continue;
      }
      const okLines = await replacePaySlipLines(existing.id, orgId, r.lines);
      if (okLines) updated += 1;
      else skipped += 1;
    } else {
      const slip = await createPaySlip({
        profileId: r.profileId,
        periodStart,
        periodEnd,
        grossAmount: r.grossAmount,
        netAmount: r.netAmount,
        currencyCode: 'XOF',
        notes: 'Généré depuis présence (moteur paie SN indicatif)',
      });
      if (!slip) {
        skipped += 1;
        continue;
      }
      const okLines = await replacePaySlipLines(slip.id, orgId, r.lines);
      if (okLines) created += 1;
      else skipped += 1;
    }
  }
  return { created, updated, skipped };
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
    const pc = payrollEngine.computePayrollFromCompliance(compliance);
    return {
      grossAmount: pc.grossAmount,
      netAmount: pc.netAmount,
      payableHours: pc.paidHours,
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

/** Calcul moteur paie (rubriques SN indicatives) pour un profil sur une période. */
export async function computePayrollForProfilePeriod(
  profileId: string,
  periodStart: string,
  periodEnd: string
): Promise<payrollEngine.PayrollComputationForProfile | null> {
  try {
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    if (!orgId) return null;
    const ctx = await payrollEngine.fetchPayrollEngineContext(orgId, periodStart, periodEnd);
    const comps = payrollEngine.computePayrollsForContext(ctx);
    return comps.find((c) => String(c.profileId) === String(profileId)) ?? null;
  } catch (e) {
    console.error('payrollService.computePayrollForProfilePeriod:', e);
    return null;
  }
}
