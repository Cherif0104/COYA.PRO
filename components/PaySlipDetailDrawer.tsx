import React from 'react';
import type { PaySlipWithLines } from '../types';
import { exportPayrollAccountingStubJson } from '../services/payrollAccountingExport';

interface PaySlipDetailDrawerProps {
  open: boolean;
  slip: PaySlipWithLines | null;
  displayName: string;
  fr: boolean;
  t: (key: string) => string;
  onClose: () => void;
}

const PaySlipDetailDrawer: React.FC<PaySlipDetailDrawerProps> = ({ open, slip, displayName, fr, t, onClose }) => {
  if (!open || !slip) return null;

  const handleExportJson = () => {
    const json = exportPayrollAccountingStubJson([slip], t('payroll_stub_disclaimer'));
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payroll_stub_${slip.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] bg-black/40"
        aria-label={fr ? 'Fermer' : 'Close'}
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[90] h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payslip-drawer-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 id="payslip-drawer-title" className="text-lg font-semibold text-slate-900">
            {t('payroll_slip_drawer_title')}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">
              {slip.periodStart} → {slip.periodEnd} · {slip.currencyCode || 'XOF'}
            </p>
            <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
              {t('payroll_stub_disclaimer')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <i className="fas fa-file-export mr-2" aria-hidden />
              {t('payroll_export_stub_json')}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">{fr ? 'Rubrique' : 'Rubric'}</th>
                  <th className="px-3 py-2">{fr ? 'Type' : 'Type'}</th>
                  <th className="px-3 py-2 text-right">{fr ? 'Montant' : 'Amount'}</th>
                  <th className="px-3 py-2">{t('payroll_slip_ohada_hint')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(slip.lines || []).map((l) => (
                  <tr key={`${l.rubriqueCode}-${l.orderIndex}`}>
                    <td className="px-3 py-2 text-slate-800">
                      <div className="font-medium">{l.label}</div>
                      <div className="text-xs text-slate-400">{l.rubriqueCode}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{l.side}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-900">{l.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{l.ohadaAccountSuggestion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </>
  );
};

export default PaySlipDetailDrawer;
