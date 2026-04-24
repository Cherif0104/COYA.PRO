import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Employee, PaySlipWithLines, PayrollMatrixRow, User } from '../types';
import * as payrollService from '../services/payrollService';
import * as payrollEngine from '../services/payrollEngine';
import OrganizationService from '../services/organizationService';
import { SN_MATRIX_COLUMN_CODES, type SnRubricCode } from '../services/payrollCatalogSN';
import PaySlipDetailDrawer from './PaySlipDetailDrawer';

interface PayrollMatrixProps {
  users: User[];
  employees: Employee[];
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  canWrite: boolean;
}

const colTranslationKey = (code: SnRubricCode): string => `payroll_matrix_col_${code}`;

const PayrollMatrix: React.FC<PayrollMatrixProps> = ({
  users,
  employees,
  periodStart,
  periodEnd,
  periodLabel,
  canWrite,
}) => {
  const { t, language } = useLocalization();
  const fr = language === 'fr';
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [slipsWithLines, setSlipsWithLines] = useState<PaySlipWithLines[]>([]);
  const [previewByProfile, setPreviewByProfile] = useState<Map<string, payrollEngine.PayrollComputationForProfile>>(new Map());
  const [drawerSlip, setDrawerSlip] = useState<PaySlipWithLines | null>(null);
  const [drawerName, setDrawerName] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('');

  const displayNameForProfile = useCallback(
    (profileId: string) => {
      const u = users.find((x: any) => String(x.profileId) === String(profileId));
      return u?.fullName || u?.name || u?.email || profileId.slice(0, 8);
    },
    [users]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const oid = await OrganizationService.getCurrentUserOrganizationId();
      setOrganizationId(oid || '');
      const swl = await payrollService.listPaySlipsWithLinesForPeriod(periodStart, periodEnd, oid || undefined);
      setSlipsWithLines(swl);
      if (oid) {
        const fullCtx = await payrollEngine.fetchPayrollEngineContext(oid, periodStart, periodEnd);
        const comps = payrollEngine.computePayrollsForContext(fullCtx);
        setPreviewByProfile(new Map(comps.map((c) => [c.profileId, c])));
      } else {
        setPreviewByProfile(new Map());
      }
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const slipByProfile = useMemo(() => {
    const m = new Map<string, PaySlipWithLines>();
    slipsWithLines.forEach((s) => m.set(String(s.profileId), s));
    return m;
  }, [slipsWithLines]);

  const rows: PayrollMatrixRow[] = useMemo(() => {
    return employees
      .filter((e) => e.profileId)
      .map((emp) => {
        const pid = String(emp.profileId);
        const slip = slipByProfile.get(pid) ?? null;
        const preview = previewByProfile.get(pid);
        const amountsByCode: Record<string, number> = {};
        if (slip && slip.lines && slip.lines.length > 0) {
          slip.lines.forEach((l) => {
            amountsByCode[l.rubriqueCode] = l.amount;
          });
        } else if (preview) {
          Object.assign(amountsByCode, preview.amountsByCode);
        }
        const slipStatus = slip?.status ?? ('none' as const);
        return {
          profileId: pid,
          displayName: displayNameForProfile(pid),
          paySlipId: slip?.id ?? null,
          slip,
          slipStatus,
          currencyCode: slip?.currencyCode || 'XOF',
          amountsByCode,
          paidHours: preview?.paidHours ?? amountsByCode.PAID_HOURS ?? 0,
          grossAmount: slip?.grossAmount ?? preview?.grossAmount ?? 0,
          netAmount: slip?.netAmount ?? preview?.netAmount ?? 0,
        };
      });
  }, [employees, slipByProfile, previewByProfile, displayNameForProfile]);

  const handleBulkFill = async () => {
    if (!canWrite) return;
    setBulkBusy(true);
    try {
      const res = await payrollService.bulkGenerateDraftPaySlipsForPeriod(periodStart, periodEnd);
      await load();
      const msg = fr
        ? `Bulletins : ${res.created} créés, ${res.updated} mis à jour, ${res.skipped} ignorés.`
        : `Pay slips: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`;
      if (typeof window !== 'undefined' && (window as any).Toast?.success) {
        (window as any).Toast.success(msg);
      } else {
        alert(msg);
      }
    } catch (e) {
      console.error(e);
      alert(fr ? 'Erreur lors du remplissage.' : 'Fill failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const openDrawerForRow = (row: PayrollMatrixRow) => {
    const preview = previewByProfile.get(row.profileId);
    if (row.slip && row.slip.lines && row.slip.lines.length > 0) {
      setDrawerSlip(row.slip);
      setDrawerName(row.displayName);
      return;
    }
    if (preview?.lines?.length) {
      setDrawerSlip({
        id: row.slip?.id || `preview-${row.profileId}`,
        organizationId: row.slip?.organizationId || organizationId || '',
        profileId: row.profileId,
        periodStart,
        periodEnd,
        grossAmount: preview.grossAmount,
        netAmount: preview.netAmount,
        currencyCode: row.slip?.currencyCode || 'XOF',
        status: row.slip?.status ?? 'draft',
        lines: preview.lines,
      });
      setDrawerName(row.displayName);
      return;
    }
    alert(fr ? 'Aucune ligne : exécutez « Remplir la période » ou créez un bulletin.' : 'No lines: run “Fill period” or create a pay slip.');
  };

  const totalsByCode = useMemo(() => {
    const acc: Record<string, number> = {};
    SN_MATRIX_COLUMN_CODES.forEach((c) => {
      acc[c] = rows.reduce((s, r) => s + (r.amountsByCode[c] ?? 0), 0);
    });
    return acc;
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        {fr ? 'Chargement matrice…' : 'Loading matrix…'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{t('payroll_matrix_title')}</h3>
          <p className="text-xs text-slate-500">
            {t('payroll_matrix_period')}: {periodLabel || `${periodStart} → ${periodEnd}`}
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={handleBulkFill}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {bulkBusy ? '…' : t('payroll_matrix_fill_period')}
            </button>
            <p className="max-w-md text-xs text-slate-500">{t('payroll_matrix_fill_hint')}</p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-max text-sm">
          <thead className="sticky top-0 z-[1] bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600 shadow-sm">
            <tr>
              <th className="sticky left-0 z-[2] bg-slate-100 px-3 py-2">{fr ? 'Salarié' : 'Employee'}</th>
              <th className="px-2 py-2">{fr ? 'Statut' : 'Status'}</th>
              {SN_MATRIX_COLUMN_CODES.map((code) => (
                <th key={code} className="whitespace-nowrap px-2 py-2 text-right">
                  {t(colTranslationKey(code))}
                </th>
              ))}
              <th className="px-3 py-2 text-right">{fr ? 'Actions' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.profileId} className="hover:bg-slate-50/80">
                <td className="sticky left-0 z-[1] bg-white px-3 py-2 font-medium text-slate-900 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                  {r.displayName}
                </td>
                <td className="px-2 py-2 text-xs text-slate-600">
                  {r.slipStatus === 'none'
                    ? t('payroll_matrix_status_none')
                    : r.slipStatus === 'paid'
                      ? fr
                        ? 'Payé'
                        : 'Paid'
                      : r.slipStatus === 'validated'
                        ? fr
                          ? 'Validé'
                          : 'Validated'
                        : fr
                          ? 'Brouillon'
                          : 'Draft'}
                </td>
                {SN_MATRIX_COLUMN_CODES.map((code) => (
                  <td key={code} className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-800">
                    {(r.amountsByCode[code] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                ))}
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => openDrawerForRow(r)}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    {t('payroll_matrix_view_slip')}
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="sticky left-0 z-[1] bg-slate-50 px-3 py-2">{fr ? 'Totaux' : 'Totals'}</td>
              <td className="px-2 py-2" />
              {SN_MATRIX_COLUMN_CODES.map((code) => (
                <td key={code} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {(totalsByCode[code] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <PaySlipDetailDrawer
        open={!!drawerSlip}
        slip={drawerSlip}
        displayName={drawerName}
        fr={fr}
        t={t}
        onClose={() => setDrawerSlip(null)}
      />
    </div>
  );
};

export default PayrollMatrix;
