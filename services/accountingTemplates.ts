import { ChartAccountType } from '../types';

export type AccountTemplate = {
  code: string;
  label: string;
  accountType: ChartAccountType;
  framework: 'syscohada' | 'sycebnl' | 'both';
  isCashFlowRegister?: boolean;
};

const SYSCOHADA_GENERAL: AccountTemplate[] = [
  { code: '10', label: 'Capital', accountType: 'equity', framework: 'syscohada' },
  { code: '16', label: 'Emprunts et dettes assimilées', accountType: 'liability', framework: 'syscohada' },
  { code: '20', label: 'Immobilisations incorporelles', accountType: 'asset', framework: 'syscohada' },
  { code: '21', label: 'Immobilisations corporelles', accountType: 'asset', framework: 'syscohada' },
  { code: '28', label: 'Amortissements', accountType: 'asset', framework: 'syscohada' },
  { code: '30', label: 'Stocks', accountType: 'asset', framework: 'syscohada' },
  { code: '40', label: 'Fournisseurs', accountType: 'liability', framework: 'syscohada' },
  { code: '41', label: 'Clients', accountType: 'asset', framework: 'syscohada' },
  { code: '42', label: 'Personnel', accountType: 'liability', framework: 'syscohada' },
  { code: '43', label: 'Organismes sociaux', accountType: 'liability', framework: 'syscohada' },
  { code: '44', label: 'État et collectivités publiques', accountType: 'liability', framework: 'syscohada' },
  { code: '47', label: 'Comptes transitoires ou d’attente', accountType: 'liability', framework: 'syscohada' },
  { code: '50', label: 'Valeurs mobilières de placement', accountType: 'asset', framework: 'syscohada' },
  { code: '51', label: 'Banques', accountType: 'asset', framework: 'syscohada', isCashFlowRegister: true },
  { code: '52', label: 'Établissements financiers', accountType: 'asset', framework: 'syscohada', isCashFlowRegister: true },
  { code: '53', label: 'Caisse', accountType: 'asset', framework: 'syscohada', isCashFlowRegister: true },
  { code: '57', label: 'Virements internes', accountType: 'asset', framework: 'syscohada', isCashFlowRegister: true },
  { code: '60', label: 'Achats', accountType: 'expense', framework: 'syscohada' },
  { code: '61', label: 'Transports', accountType: 'expense', framework: 'syscohada' },
  { code: '62', label: 'Services extérieurs', accountType: 'expense', framework: 'syscohada' },
  { code: '63', label: 'Impôts et taxes', accountType: 'expense', framework: 'syscohada' },
  { code: '64', label: 'Charges de personnel', accountType: 'expense', framework: 'syscohada' },
  { code: '65', label: 'Autres charges', accountType: 'expense', framework: 'syscohada' },
  { code: '66', label: 'Charges financières', accountType: 'expense', framework: 'syscohada' },
  { code: '67', label: 'Charges exceptionnelles', accountType: 'expense', framework: 'syscohada' },
  { code: '70', label: 'Ventes', accountType: 'income', framework: 'syscohada' },
  { code: '73', label: 'Subventions d’exploitation', accountType: 'income', framework: 'syscohada' },
  { code: '75', label: 'Autres produits', accountType: 'income', framework: 'syscohada' },
  { code: '76', label: 'Produits financiers', accountType: 'income', framework: 'syscohada' },
  { code: '77', label: 'Produits exceptionnels', accountType: 'income', framework: 'syscohada' },
];

const SYCEBNL_GENERAL: AccountTemplate[] = [
  { code: '10', label: 'Fonds associatifs', accountType: 'equity', framework: 'sycebnl' },
  { code: '13', label: 'Fonds dédiés', accountType: 'equity', framework: 'sycebnl' },
  { code: '16', label: 'Emprunts et dettes assimilées', accountType: 'liability', framework: 'sycebnl' },
  { code: '20', label: 'Immobilisations incorporelles', accountType: 'asset', framework: 'sycebnl' },
  { code: '21', label: 'Immobilisations corporelles', accountType: 'asset', framework: 'sycebnl' },
  { code: '40', label: 'Fournisseurs', accountType: 'liability', framework: 'sycebnl' },
  { code: '41', label: 'Usagers/clients', accountType: 'asset', framework: 'sycebnl' },
  { code: '44', label: 'État et collectivités publiques', accountType: 'liability', framework: 'sycebnl' },
  { code: '51', label: 'Banques', accountType: 'asset', framework: 'sycebnl', isCashFlowRegister: true },
  { code: '53', label: 'Caisse', accountType: 'asset', framework: 'sycebnl', isCashFlowRegister: true },
  { code: '60', label: 'Achats', accountType: 'expense', framework: 'sycebnl' },
  { code: '61', label: 'Services extérieurs', accountType: 'expense', framework: 'sycebnl' },
  { code: '62', label: 'Autres services extérieurs', accountType: 'expense', framework: 'sycebnl' },
  { code: '64', label: 'Charges de personnel', accountType: 'expense', framework: 'sycebnl' },
  { code: '65', label: 'Autres charges de gestion courante', accountType: 'expense', framework: 'sycebnl' },
  { code: '66', label: 'Charges financières', accountType: 'expense', framework: 'sycebnl' },
  { code: '67', label: 'Charges exceptionnelles', accountType: 'expense', framework: 'sycebnl' },
  { code: '70', label: 'Produits des activités', accountType: 'income', framework: 'sycebnl' },
  { code: '73', label: 'Dons et libéralités', accountType: 'income', framework: 'sycebnl' },
  { code: '74', label: 'Subventions d’exploitation', accountType: 'income', framework: 'sycebnl' },
  { code: '75', label: 'Autres produits', accountType: 'income', framework: 'sycebnl' },
  { code: '76', label: 'Produits financiers', accountType: 'income', framework: 'sycebnl' },
  { code: '77', label: 'Produits exceptionnels', accountType: 'income', framework: 'sycebnl' },
];

export function getGeneralAccountsTemplate(framework: 'syscohada' | 'sycebnl'): AccountTemplate[] {
  return framework === 'sycebnl' ? SYCEBNL_GENERAL : SYSCOHADA_GENERAL;
}
