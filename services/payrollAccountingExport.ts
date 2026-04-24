import type { PaySlipWithLines } from '../types';

/** Ligne d’écriture indicative pour rattachement OHADA / analytique (stub). */
export interface PayrollAccountingStubLine {
  rubriqueCode: string;
  label: string;
  amount: number;
  side: string;
  ohadaAccountSuggestion?: string | null;
}

export interface PayrollAccountingStub {
  version: 1;
  generatedAt: string;
  organizationId?: string;
  periodStart?: string;
  periodEnd?: string;
  slips: Array<{
    paySlipId: string;
    profileId: string;
    status: string;
    projectId?: string | null;
    programmeId?: string | null;
    fundingSource?: string | null;
    lines: PayrollAccountingStubLine[];
  }>;
  disclaimer: string;
}

export function buildPayrollAccountingStub(slips: PaySlipWithLines[], disclaimer: string): PayrollAccountingStub {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    organizationId: slips[0]?.organizationId,
    periodStart: slips[0]?.periodStart,
    periodEnd: slips[0]?.periodEnd,
    slips: slips.map((s) => ({
      paySlipId: s.id,
      profileId: s.profileId,
      status: s.status,
      projectId: s.projectId,
      programmeId: s.programmeId,
      fundingSource: s.fundingSource,
      lines: (s.lines || []).map((l) => ({
        rubriqueCode: l.rubriqueCode,
        label: l.label,
        amount: l.amount,
        side: l.side,
        ohadaAccountSuggestion: l.ohadaAccountSuggestion,
      })),
    })),
    disclaimer,
  };
}

export function exportPayrollAccountingStubJson(slips: PaySlipWithLines[], disclaimer: string): string {
  return JSON.stringify(buildPayrollAccountingStub(slips, disclaimer), null, 2);
}
