# Paie COYA — export comptable OHADA / analytique (phase 2)

## État actuel (stub)

- Le service [`payrollAccountingExport.ts`](../services/payrollAccountingExport.ts) expose `buildPayrollAccountingStub` et `exportPayrollAccountingStubJson` : export JSON des bulletins avec **lignes de rubriques** et suggestions de comptes OHADA (champ `ohada_account_suggestion` sur chaque ligne, alimenté par le catalogue SN indicatif).
- Le tiroir **Détail bulletin** (`PaySlipDetailDrawer`) permet de télécharger ce JSON pour un bulletin sélectionné.

## Prochaines étapes métier

1. **Valider le plan de comptes** : remplacer les suggestions fixes (ex. 661, 4212, 422) par une table `payroll_rubric_definitions` remplie par organisation (déjà créée côté Supabase), ou par synchronisation avec le module Finance / Odoo (`coya_payroll`).
2. **Axes analytiques** : utiliser les colonnes optionnelles `project_id`, `programme_id`, `funding_source` sur `pay_slips` pour ventiler la masse salariale (projets, programmes, bailleurs).
3. **Écritures doubles** : à partir des lignes, générer des **écritures équilibrées** (débit/crédit) par journal « Paie » — aujourd’hui le JSON liste les montants par rubrique sans contrepartie automatique ; un moteur d’écritures devra appliquer les règles SYSCOHADA validées par votre expert-comptable.
4. **Intégration Finance.tsx / ERP** : importer le JSON ou appeler une API Edge pour poster les écritures.

## Avertissement

Les taux IPRES / CSS / IRPP du fichier `payrollCatalogSN.ts` sont **indicatifs** et ne constituent pas un conseil juridique ou fiscal.
