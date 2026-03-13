# Récapitulatif Odoo et roadmap ERP 360° COYA.PRO

**Date** : Février 2025  
**Contexte** : Phase 1 (retrait ai_coach / Gen AI Lab) réalisée. Ce document consolide la référence Odoo 18 et la vision cible pour COYA.PRO.

---

## Contexte

- **COYA.PRO** : application from scratch (React, TypeScript, Vite, Supabase), en production (coya.pro). Base de données à conserver ; c'est la base de travail.
- **Odoo 18 (COYA CUSTOMISATION)** : 22 modules custom, 10 départements — référence fonctionnelle et métier à transposer dans COYA.PRO, pas comme base de déploiement.
- **Objectif** : ERP de gestion et pilotage 360°, multiorganisationnel, avec transparence, performance, conformité, KPIs/OKR, pointage, programmes/budgets, documents générés, sans casser l'existant. Tout modulable et extensible.

---

## 1. Les 10 départements (référence Odoo)

À reproduire comme entités configurables dans COYA.PRO (table `departments`, association utilisateur ↔ département(s)).

| # | Département (Odoo) | Besoins principaux | Écrans cibles COYA.PRO | Champs / données clés | Priorisation |
|---|--------------------|--------------------|------------------------|----------------------|--------------|
| 1 | **Administratif & Financier** | Budgets, dépenses, factures, validation multi-niveaux, rapports bailleur, ligne prévisionnel/réel | Finance (existant) ; Dépenses programmes ; Workflow validation ; Rapports | Budget, Ligne budgétaire, Poste dépense, Statut validation, Niveau approbation | Phase 2 (droits) + Phase 4 bloc 3 (Programme/Budget) |
| 2 | **Juridique** | Contrats, contentieux, risques juridiques | Module Juridique (à créer) : listes Contrats, Contentieux, Risques | Contrat (partenaire, dates, type), Contentieux (réf, statut), Risque (gravité, statut) | Phase 4 bloc 4 |
| 3 | **Audiovisuel / Production** | Projets média, production | Module Studio (à créer) : projets audiovisuel, livrables | Projet, Type production, Livrables, Planning | Phase 4 bloc 4 |
| 4 | **Formation & Bootcamp** | Cours, parcours, collecte, bootcamp | Courses (existant) ; Collecte ; Bootcamp (parcours, fiches) | Cours, Parcours, Fiche collecte, Session bootcamp | Phase 4 bloc 4 (étendre Courses + Collecte + Bootcamp) |
| 5 | **RH** | Pointage, présence, congés, paie, évaluations, attestations | Leave (existant) ; Pointage/Présence ; Paie ; Talent Analytics (évaluations) ; Génération documents (attestations, certificats) | Présence, Retard, Heures sup, Bulletin, Évaluation, Document généré | Phase 2 (droits par dept) + Phase 4 blocs 1 et 2 |
| 6 | **Project Management** | Projets, tâches, objectifs SMART, programmes, jalons | Projects, Goals (existant) ; Tâches hebdo ; Lien Programme/Projet/Budget | Projet, Programme, Tâche, OKR, Ligne budgétaire | Phase 4 blocs 3 et 5 (tâches, objectifs) |
| 7 | **Prospection & Partenariat** | CRM, opportunités, pipeline | CRM (existant) ; extension Partenariat (opportunités, pipeline) | Opportunité, Partenaire, Pipeline, Statut | Phase 4 bloc 4 |
| 8 | **Conseil consultatif** | Gouvernance, avis, suivi | Module Conseil (à créer) : dossiers conseil, avis | Dossier, Avis, Gouvernance | Phase 4 bloc 5 |
| 9 | **Qualité & Suivi performance** | Indicateurs, scores, conformité | Analytics (existant) ; extension Qualité (scores, conformité, alertes) | Indicateur, Score, Conformité, Alerte | Phase 4 bloc 5 |
| 10 | **IT & Tech Solutions** | Projets tech, interventions | Module Tech (à créer) ; lien avec Projects | Projet tech, Type intervention, Statut | Phase 4 bloc 4 |

**Implémentation cible** : entité **Département** (table Supabase) avec nom, slug, liste de modules autorisés (ModuleName), et association utilisateur ↔ département(s). Droits par module granulaires (read/write/delete/approve), croisés avec le département.

---

## 2. Mapping 22 modules Odoo → COYA.PRO

| Module Odoo | Module COYA.PRO actuel | Action |
|-------------|------------------------|--------|
| coya_departments | — | Introduire Départements (entité + droits par département). |
| sunugest_branding | — | Charte graphique (couleurs, navbar) ; centraliser dans CHARTE-GRAPHIQUE-COYA.md. |
| coya_planning | — | Créer Planning (créneaux, réunions, télétravail, congés, modulations). |
| coya_programme_budget | Finance + Projects | Étendre : Programmes (bailleur) → Projets → Lignes budgétaires prévisionnel/réel ; rapports bailleur. |
| coya_programme_budget_project | Projects | Lier projet à un programme et à des lignes budgétaires. |
| coya_time_tracking | Time Tracking | Conserver ; lier à Planning et Pointage (présence, retards, heures sup). |
| coya_trinite | Goals (OKRs) | Étendre : Trinité (Ndiguel / Yar / Barké), rythme hebdo, indicateurs. |
| coya_presence_policy | — | Créer : politique de présence, alertes, sanctions. |
| coya_presence_reporting | — | Créer : extractions présence (J+7), rapports. |
| coya_payroll | Finance | Créer : Paie (bulletins, taux horaire, cotisations CNSS/AMO/IR, primes Trinité). |
| coya_hr_trinite_appraisal | Talent Analytics | Étendre : évaluations RH liées à la Trinité. |
| coya_appraisal_manager | Talent Analytics | Étendre : évaluations managers. |
| coya_juridique | — | Créer : contrats, contentieux, risques juridiques. |
| coya_partenariat | CRM | Étendre : opportunités, partenariat, pipeline. |
| coya_tech | — | Créer : projets IT / tech. |
| coya_tech_project | Projects | Lier projet tech à module Tech. |
| coya_studio | — | Créer : projets audiovisuel / production. |
| coya_collecte | — | Créer : collecte (données, formulaires). |
| coya_bootcamp | Courses | Étendre : Bootcamp (parcours, collecte). |
| coya_conseil | — | Créer : conseil, gouvernance. |
| coya_qualite | Analytics | Étendre : qualité, scores, conformité. |
| coya_tasks_weekly | Projects / Goals | Étendre : tâches hebdo, objectifs SMART, lien projet/programme. |
| coya_modern_navbar | Header/Sidebar | Déjà présent ; aligner charte et UX. |

---

## 3. Vision ERP 360° et exigences transverses

- **Multi-organisations** : Super admin plateforme crée les organisations (SENEGEL = une org). Admin par org crée départements, postes, rôles, employés, assigne les modules par département.
- **Droits granulaires et modulaires** : par département (modules cochés) + par utilisateur (read/write/delete/approve). Même logique qu'Odoo, simplifiée.
- **Programmes et budgets** : Programme (bailleur) → Projets → Lignes budgétaires prévisionnel ; postes de dépenses réels ; rapprochement en fin de programme. Ligne budgétaire prévisionnel/réel aussi pour les dépenses hors programme.
- **Validation multi-niveaux des dépenses** : demande créée → envoyée → validations successives → validé. S'inspirer de LeaveRequest (status, approverId). Étendre le type Expense avec statuts (draft, submitted, level_1_approved, level_2_approved, approved, rejected, paid) et table ou JSON des approbations.
- **Tâches** : assignation, notification, pièces jointes, lien projet/programme ; vue "Tâches de la semaine" et objectifs SMART.
- **Pointage / traçabilité** : présence, retards, heures sup, réunions, dépassement de pause, problèmes techniques, briefs, pauses. Alimente indicateurs et extractions J+7.
- **Extractions J+7** : automatisation (cron ou Supabase Edge) pour retards, dépassements, rapports par module.
- **Documents générés** : factures, fiches de paie, attestations de travail, certificats, congés, notifications RH (templates + génération PDF).
- **KPIs / OKR** : par utilisateur (dashboard), par manager, par hiérarchie ; journalier, hebdo, mensuel.
- **Transparence, conformité, alertes** : traçabilité des actions, alertes sur risques/manques/erreurs, sanctions possibles (liées à politique de présence et règles métier).

---

## 4. Modularité et extensibilité

- **Listes expansibles** : postes, responsabilités, départements, types de congés, postes de dépenses, etc. éditables depuis le front (avec droits) et stockées en base.
- **Modules et départements** : possibilité d'ajouter de nouveaux modules ou départements depuis l'interface (super admin / admin org), avec définition des droits par rôle/département.

---

## 4b. Affinages implantés (règles et Paramètres)

- **Utilisateurs sans département (règle stricte)** : Tout utilisateur qui n'est pas super administrateur et qui n'est rattaché à **aucun** département n'a accès à **aucun** module (tous les modules sont en NO_ACCESS). Le super administrateur reste hors règle département (accès total). Implémentation dans `useModulePermissions` : si `allowedSlugs.length === 0` et rôle ≠ super_administrator, tous les modules sont mis à NO_ACCESS.
- **Paramètres : Administration et gestion** : Les entrées anciennement regroupées sous "COYA Management" (Gestion des organisations, Départements, Gestion des utilisateurs/droits, Gestion des formations, Gestion des jobs, Demandes de congés, Analytics, Talent Analytics) sont désormais des **sous-sections de Paramètres**. L'utilisateur ouvre "Paramètres" (Settings) et accède à "Administration et gestion" ; seules les sous-sections pour lesquelles il a le droit d'accès au module correspondant sont affichées. Les droits restent les mêmes (ModuleName et user_module_permissions) ; seul l'accès se fait via Paramètres.
- **Responsable de département et role_in_department** : La table `user_departments` comporte un champ optionnel `role_in_department` (ex. `"manager"`, `"directeur"`). Les **départements** sont créés uniquement par le super admin (ou l'admin d'organisation), pas depuis le module RH. Le responsable / directeur de département peut être identifié via `role_in_department` ; les droits métier (ex. validation des congés pour son département, vue équipe) pourront s'appuyer sur ce champ (canApprove, règles métier par département). **Règle générale** : l'accès est toujours donné explicitement (par département : modules cochés ; par utilisateur : read/write/delete/approve par module) ; pas d'accès par défaut sauf pour le super admin.

---

## 5. Plan de mise à jour par phases

- **Phase 1 – Nettoyage et fondations** : Retrait ai_coach et Gen AI Lab (fait). Création/mise à jour de ce récap (Départements, Modules, vision ERP 360°).
- **Phase 2 – Multi-org et départements** : Super admin (gestion des organisations, déjà partiellement en place). Entité Département (10 départements) + association utilisateur ↔ département(s). Droits par département (modules cochés) + granularité par utilisateur (read/write/delete/approve).
- **Phase 3 – Charte et UX** : Navbar / dashboard 360° (KPIs, OKR par user/manager). Alignement de tous les écrans avec la charte (variables CSS, composants communs).
- **Phase 4 – Modules métier par blocs** :  
  - Bloc 1 : RH / Présence / Planning (pointage, politique présence, extractions J+7).  
  - Bloc 2 : Trinité / Paie (bulletins, cotisations).  
  - Bloc 3 : Programme / Budget / Projets (programmes, projets, lignes budgétaires, rapports bailleur, validation multi-niveaux dépenses).  
  - Bloc 4 : Partenariat, Juridique, Studio, Tech, Collecte, Bootcamp.  
  - Bloc 5 : Conseil, Qualité.  
  Génération de documents (factures, paie, attestations) et alertes/conformité en transversal.

Chaque phase doit être testée (régression navigation, permissions, données existantes) avant la suivante.

---

## 6. Charte graphique

- Variables CSS COYA/SENEGEL dans `src/index.css` (`--coya-green`, `--coya-yellow`, `--coya-emeraude`, `--coya-ambre`, `--coya-or-barke`, etc.).
- Référence : `docs/CHARTE-GRAPHIQUE-COYA.md` si présent (couleurs, usage, Trinité Ndiguel / Yar / Barké).

---

## 7. Prochaines étapes suggérées

1. Valider ce récap et l'ordre des phases.
2. Indiquer l'email du compte super administrateur plateforme pour les tests et la doc.
3. Démarrer la Phase 2 : entité Département, association utilisateur ↔ département(s), droits par département et par utilisateur.
4. Détailler, si besoin, les écrans et champs par département pour prioriser les développements Phase 4 bloc par bloc.
