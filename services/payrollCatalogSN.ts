/**
 * Catalogue paie Sénégal / XOF — **approximation paramétrable** (taux indicatifs).
 * Valider avec un expert métier avant usage légal (IPRES, CSS, IRPP, etc.).
 */

export type SnRubricCode =
  | 'PAID_HOURS'
  | 'GROSS_ATTENDANCE'
  | 'ASSIDUITY_DEDUCTION'
  | 'TAXABLE_BASE'
  | 'IPRES_SAL'
  | 'CSS_SAL'
  | 'IRPP_SAL'
  | 'IPRES_PAT'
  | 'CSS_PAT'
  | 'NET_PAYABLE';

export interface SnDefaultRateConfig {
  /** Part salariale IPRES (fraction, ex. 0.056) */
  ipresSalRate: number;
  /** Part salariale CSS / maladie (fraction) */
  cssSalRate: number;
  /** IRPP simplifié sur base imposable (fraction — ne remplace pas barème officiel) */
  irppSalRate: number;
  /** Charges patronales indicatives (non déduites du net salarié) */
  ipresPatRate: number;
  cssPatRate: number;
}

export const SN_DEFAULT_RATES: SnDefaultRateConfig = {
  ipresSalRate: 0.056,
  cssSalRate: 0.03,
  irppSalRate: 0.05,
  ipresPatRate: 0.084,
  cssPatRate: 0.06,
};

/** Ordre d’affichage colonnes matrice */
export const SN_MATRIX_COLUMN_CODES: SnRubricCode[] = [
  'PAID_HOURS',
  'GROSS_ATTENDANCE',
  'ASSIDUITY_DEDUCTION',
  'TAXABLE_BASE',
  'IPRES_SAL',
  'CSS_SAL',
  'IRPP_SAL',
  'IPRES_PAT',
  'CSS_PAT',
  'NET_PAYABLE',
];

/** Suggestions de comptes SYSCOHADA / OHADA (indicatif — paramétrable en base par org). */
export function ohadaSuggestionForRubric(code: SnRubricCode): string {
  const map: Record<SnRubricCode, string> = {
    PAID_HOURS: '—',
    GROSS_ATTENDANCE: '661',
    ASSIDUITY_DEDUCTION: '661',
    TAXABLE_BASE: '661',
    IPRES_SAL: '4212',
    CSS_SAL: '4212',
    IRPP_SAL: '4421',
    IPRES_PAT: '664',
    CSS_PAT: '664',
    NET_PAYABLE: '422',
  };
  return map[code] || '—';
}
