import type { Employee, HrAbsenceEvent, HrAttendancePolicy, PaySlipLine, PresenceSession, PresenceStatusEvent } from '../types';
import DataAdapter from './dataAdapter';
import { DataService } from './dataService';
import * as hrAnalyticsService from './hrAnalyticsService';
import type { PresenceComplianceMetric } from './hrAnalyticsService';
import {
  SN_DEFAULT_RATES,
  type SnDefaultRateConfig,
  type SnRubricCode,
  ohadaSuggestionForRubric,
} from './payrollCatalogSN';

export interface PayrollEngineContext {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  employees: Employee[];
  sessions: PresenceSession[];
  statusEvents: PresenceStatusEvent[];
  absences: HrAbsenceEvent[];
  policy: HrAttendancePolicy | null;
  userIdByProfile: Record<string, string>;
}

export interface PayrollComputationForProfile {
  profileId: string;
  grossAmount: number;
  netAmount: number;
  lines: PaySlipLine[];
  paidHours: number;
  amountsByCode: Record<string, number>;
}

const RUBRIC_LABELS_FR: Record<SnRubricCode, string> = {
  PAID_HOURS: 'Heures payantes',
  GROSS_ATTENDANCE: 'Brut temps (présence)',
  ASSIDUITY_DEDUCTION: 'Retenue assiduité (retards / abs. injust.)',
  TAXABLE_BASE: 'Base imposable (simplifiée)',
  IPRES_SAL: 'IPRES part salariale (indicatif)',
  CSS_SAL: 'CSS / maladie salariale (indicatif)',
  IRPP_SAL: 'IRPP (indicatif)',
  IPRES_PAT: 'IPRES part patronale (info)',
  CSS_PAT: 'CSS part patronale (info)',
  NET_PAYABLE: 'Net à payer',
};

function line(
  code: SnRubricCode,
  side: PaySlipLine['side'],
  amount: number,
  orderIndex: number,
  labelOverride?: string
): PaySlipLine {
  return {
    rubriqueCode: code,
    label: labelOverride ?? RUBRIC_LABELS_FR[code],
    side,
    amount: Math.round(amount * 100) / 100,
    orderIndex,
    ohadaAccountSuggestion: ohadaSuggestionForRubric(code),
  };
}

/**
 * À partir du résultat `computePresenceCompliance` pour un salarié,
 * construit lignes de bulletin + totaux (cotisations SN **indicatives** sur la base imposable simplifiée).
 */
export function computePayrollFromCompliance(
  compliance: PresenceComplianceMetric,
  rates: SnDefaultRateConfig = SN_DEFAULT_RATES
): PayrollComputationForProfile {
  const profileId = compliance.profileId;
  const hourlyRate = compliance.hourlyRate;
  const paidHours = compliance.paidMinutes / 60;
  const grossAttendance = (compliance.totalWorkedMinutes / 60) * hourlyRate;
  const assiduityDeduction = Math.max(0, grossAttendance - compliance.payableAmount);
  const taxableBase = Math.max(0, compliance.payableAmount);
  const ipresSal = taxableBase * rates.ipresSalRate;
  const cssSal = taxableBase * rates.cssSalRate;
  const irppSal = taxableBase * rates.irppSalRate;
  const ipresPat = taxableBase * rates.ipresPatRate;
  const cssPat = taxableBase * rates.cssPatRate;
  const netPayable = Math.max(0, taxableBase - ipresSal - cssSal - irppSal);

  const lines: PaySlipLine[] = [
    line('PAID_HOURS', 'info', paidHours, 0),
    line('GROSS_ATTENDANCE', 'gain', grossAttendance, 1),
    line('ASSIDUITY_DEDUCTION', 'deduction', assiduityDeduction, 2),
    line('TAXABLE_BASE', 'info', taxableBase, 3),
    line('IPRES_SAL', 'deduction', ipresSal, 4),
    line('CSS_SAL', 'deduction', cssSal, 5),
    line('IRPP_SAL', 'deduction', irppSal, 6),
    line('IPRES_PAT', 'info', ipresPat, 7),
    line('CSS_PAT', 'info', cssPat, 8),
    line('NET_PAYABLE', 'gain', netPayable, 9),
  ];

  const amountsByCode: Record<string, number> = {};
  for (const l of lines) {
    amountsByCode[l.rubriqueCode] = l.amount;
  }

  return {
    profileId,
    grossAmount: Math.round(grossAttendance * 100) / 100,
    netAmount: Math.round(netPayable * 100) / 100,
    lines,
    paidHours: Math.round(paidHours * 100) / 100,
    amountsByCode,
  };
}

/** Charge sessions / absences / politique / profils une seule fois pour la période. */
export async function fetchPayrollEngineContext(
  organizationId: string,
  periodStart: string,
  periodEnd: string
): Promise<PayrollEngineContext> {
  const [employees, sessions, absences, policy, statusEvents, profiles] = await Promise.all([
    DataAdapter.listEmployees(organizationId),
    DataAdapter.getPresenceSessions({
      organizationId,
      from: `${periodStart}T00:00:00.000Z`,
      to: `${periodEnd}T23:59:59.999Z`,
    }),
    hrAnalyticsService.listHrAbsenceEvents(organizationId),
    DataAdapter.getHrAttendancePolicy(organizationId),
    DataAdapter.listPresenceStatusEvents({
      organizationId,
      from: `${periodStart}T00:00:00.000Z`,
      to: `${periodEnd}T23:59:59.999Z`,
    }),
    DataService.getProfiles(),
  ]);
  const userIdByProfile = (profiles.data || []).reduce<Record<string, string>>((acc, row: any) => {
    if (row?.id && row?.user_id) acc[String(row.id)] = String(row.user_id);
    return acc;
  }, {});
  return {
    organizationId,
    periodStart,
    periodEnd,
    employees: employees.filter((e) => e.profileId),
    sessions,
    absences,
    policy,
    statusEvents,
    userIdByProfile,
  };
}

/** Calcule tous les bulletins détaillés pour les salariés de l’organisation sur la période (un passage compliance). */
export function computePayrollsForContext(
  ctx: PayrollEngineContext,
  rates: SnDefaultRateConfig = SN_DEFAULT_RATES
): PayrollComputationForProfile[] {
  if (ctx.employees.length === 0) return [];
  const complianceList = hrAnalyticsService.computePresenceCompliance({
    employees: ctx.employees,
    sessions: ctx.sessions,
    statusEvents: ctx.statusEvents,
    absences: ctx.absences,
    policy: ctx.policy,
    userIdByProfile: ctx.userIdByProfile,
    periodStart: ctx.periodStart,
    periodEnd: ctx.periodEnd,
  });
  return complianceList.map((c) => computePayrollFromCompliance(c, rates));
}
