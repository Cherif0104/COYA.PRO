# Plan de finalisation – Projet COYA.PRO / EcosystIA

**Contexte :** Projet confié pour finalisation complète. Supabase Pro + MCP Supabase disponibles. Équipe multi-expertise (commercial, managérial, ingénierie, UX, etc.). Objectif : **toutes les fonctionnalités opérationnelles**, **consolidation** (éviter le morcellement 2–3 modules), **qualité produit** et **pilotage** par les métiers.

---

## 1. Comment je procède (méthodologie)

### 1.1 Principes directeurs

1. **Base de données d’abord (Supabase Pro + MCP)**  
   - Toutes les tables, RLS, index et politiques nécessaires sont appliqués via **migrations MCP** sur le **même projet** que l’app (éviter le décalage 404 qu’on a connu).  
   - Un seul référentiel de migrations : `coya-pro/scripts/` + `apply_migration` pour chaque lot.

2. **Résilience côté client**  
   - Les appels Supabase (listes, paramètres, modules optionnels) continuent de gérer les 404/400 sans crasher : retour `[]` / `null` et messages clairs ("Module non configuré", "Aucune donnée").

3. **Droits et administration transversaux**  
   - Chaque nouveau module ou sous-fonction est pensé **dès le départ** avec : accès par **rôle**, par **département**, par **utilisateur** (user_module_permissions + accounting_permissions, etc.).  
   - Pas de "tout le monde peut tout faire" sur des écrans sensibles (Comptabilité, RH, Programme, Tickets IT).

4. **Consolidation avant ajout**  
   - Regrouper ce qui doit être au même endroit (ex. Finance + Comptabilité + Programme/Budget dans un pôle "Administratif & Financier" cohérent).  
   - Éviter les doublons (deux écrans "budgets" différents, deux listes "projets" non synchronisées).

5. **Livraison par blocs livrables**  
   - Chaque bloc = schéma + service + UI + droits + tests de non-régression sur les flux critiques (login, dashboard, un module phare).

---

## 2. État des lieux rapide (ce qui existe vs à finaliser)

| Domaine | État | À faire |
|--------|------|--------|
| **Auth / Profil** | Login, Signup, AuthContext Supabase, permissions par module | Login fidèle REF-LOGIN ; rôle vs poste (Signup + référentiel Poste) ; réinitialisation MDP |
| **Dashboard** | KPI, graphiques, congés/factures, activités | Remplacer bloc "Analyse intelligente" par analytics prédictif (cabanes colorées, scoring, alertes) ; widgets configurables |
| **Projets** | Liste, détail, tâches, time logs | Budgets projet, tâches SMART/SWOT, gel auto, scoring 5 %/7 %, justificatifs obligatoires, assignation multi-user/département |
| **Planning** | Réunions, créneaux | Intégration objectifs hebdo/jour ; lien avec Projets et RH |
| **Finance** | Factures, dépenses, budgets (Finance) | Aligner avec Comptabilité (un seul référentiel "budget" si possible) ; rapports croisés |
| **Comptabilité** | Plan, journaux, écritures, bilans, analytique, flux, PJ, droits canRead/canWrite | Appliquer migrations P2 sur le bon projet Supabase ; exercices, statut écritures, audit log ; rôles métier (viewer/editor/validator/admin) |
| **Programme & Bailleur** | Module dédié (ProgrammeModule) | Données réelles (bailleurs, programmes) : migrations + RLS ; lignes budgétaires, bénéficiaires, lien Collecte ; pas de 404 programmes |
| **RH** | RhModule | Fiche poste, fiche employé, organigramme, paie (bulletin, politique), planning type My Timesquare, congés intégrés |
| **Formations / Emplois** | Courses, Jobs, CRUD | Déjà opérationnels ; renforcer liens avec Projets et RH |
| **CRM** | CRM composant | Partenaires, catégories extensibles ; droits par département |
| **Modules "stub" devenus vrais** | Partenariat, Collecte, Qualité, Conseil, Juridique, Studio, Tech, Trinité | Soit contenu minimal (liste + détail + CRUD générique), soit lien fort avec Projets/Programme (Collecte = formulaires rattachés) |
| **Nouveaux modules** | Logistique, Parc auto, Ticket IT, Alerte anonyme, Messagerie | Tables + workflow + UI ; Ticket IT = demande → validation manager → IT |
| **Admin** | UserManagement, Org, Départements, Postes, Permissions par module | Sélection multi-utilisateurs ; cohérence rôle/poste ; droits par département déjà partiellement là |
| **Supabase** | Pro, MCP disponible | Toutes les migrations sur **un seul projet** (celui de l’app) ; Storage (buckets) ; pas de 404 sur tables attendues |

---

## 3. Ce que je vais améliorer (par thème)

### 3.1 Base de données et migrations

- **Un seul projet Supabase** : s’assurer que le MCP pointe vers le projet utilisé par l’app (même URL/anon key). Appliquer **toutes** les migrations manquantes (comptabilité, programme/bailleurs, user_departments, presence_sessions, module_labels, dashboard_settings, accounting_permissions, fiscal_years, etc.).  
- **Scripts SQL de référence** : garder dans `coya-pro/scripts/` les fichiers `.sql` (create-comptabilite-tables, comptabilite-extensions, comptabilite-audit-p2, fix_404_*, etc.) et documenter dans README-MIGRATIONS l’ordre d’exécution et le fait que l’application des migrations se fait via MCP.  
- **RLS systématique** : chaque nouvelle table = RLS + politiques par organisation et par rôle (admin) ou par département si pertinent.

### 3.2 Expérience utilisateur (UX)

- **Login** : refonte fidèle à REF-LOGIN (charte COYA), message d’erreur clair, "Mot de passe oublié" opérationnel.  
- **Navigation** : pas de modules "vides" qui ouvrent une page "Contenu à venir" sans valeur ; soit contenu minimal (liste + actions), soit masquer le module jusqu’à ce qu’il soit prêt (paramétrable par admin).  
- **Feedback** : chargements, messages de succès/erreur, bannière "Accès lecture seule" (déjà fait en Comptabilité) sur les modules sensibles.  
- **Mobile / responsive** : vérifier les écrans clés (dashboard, projets, comptabilité, formulaire écriture) sur petit écran.

### 3.3 Consolidation (éviter 2–3 endroits pour la même chose)

- **Budget** :  
  - **Finance** : budgets "métier" (projets, formations, etc.) déjà en place.  
  - **Comptabilité** : budgets par exercice, lignes par compte/centre.  
  → Garder les deux **mais** : vocabulaire clair (Budget projet vs Budget comptable) ; si possible un écran "Synthèse budgets" qui croise les deux (optionnel).  

- **Projets** :  
  - Une seule source de vérité "projets" (Supabase `projects`) ; Programme = programmes/bailleurs avec **liaison** aux projets (programme_id ou équivalent), pas une deuxième liste "projets" désynchronisée.  

- **Utilisateurs / Rôles** :  
  - Un seul référentiel `profiles` + `user_module_permissions` + `user_departments` ; Poste = table `postes` avec lien depuis `profiles`. Pas de rôles en dur éparpillés dans les composants.  

- **Paramètres organisation** :  
  - Centraliser (Settings ou Admin) : cadre comptable, devise, exercice par défaut, features (analytique on/off, etc.) pour éviter d’aller dans 3 modules pour "paramétrer l’organisation".

### 3.4 Sécurité et droits

- **Comptabilité** : déjà avancé (canRead/canWrite, onglet Paramètres réservé). Compléter avec rôles métier (viewer/editor/validator/admin) et RLS si table `accounting_permissions` utilisée.  
- **Programme / Bailleur** : droits par rôle et par département (qui peut créer un programme, qui peut valider les lignes budgétaires).  
- **Ticket IT** : qui peut créer, qui peut valider (manager), qui peut traiter (IT).  
- **Alerte anonyme** : accès restreint (cellule de crise, admin) ; anonymat et audit tracés.

### 3.5 Performance et technique

- **Chargement initial** : déjà en deux phases (essentiel puis secondaire) ; garder et si besoin réduire les appels en parallèle (batch) ou paginer les grosses listes.  
- **Résilience 404** : généraliser la logique "try/catch + retour [] ou null" sur les services qui appellent des tables optionnelles ou pas encore déployées.  
- **Types TypeScript** : garder les types à jour avec le schéma (JournalEntry.status, AccountingPermission, FiscalYear, etc.) et importer partout où nécessaire (ex. JournalEntryStatus dans comptabiliteService).

---

## 4. Ce que je vais recréer ou regrouper (au même endroit)

- **Paramètres Comptabilité** : déjà dans le module Comptabilité (onglet Paramètres). Ne pas dupliquer dans Settings sauf un lien "Ouvrir la Comptabilité" pour les admins.  
- **Droits d’accès** : une seule interface (UserManagement ou "Droits d’accès / Utilisateurs") pour gérer user_module_permissions + départements + postes ; éventuellement un sous-onglet "Droits Comptabilité" (accounting_permissions) au même endroit ou depuis Comptabilité (admin only).  
- **Référentiels métier** :  
  - **Postes** : une table `postes`, un écran "Postes" (admin) ou dans Paramètres, utilisé dans Signup/Profil/RH.  
  - **Bailleurs / Programmes** : dans le module Programme uniquement ; pas de liste "bailleurs" éclatée ailleurs (sauf sélecteur dans Projets si lien programme).  
- **Rapports** :  
  - Rapports **comptables** (bilan, compte de résultat, flux, etc.) = dans Comptabilité.  
  - Rapports **projets / activité** (temps, objectifs, scoring) = dans Dashboard ou Analytics.  
  - Éviter un troisième "Rapports" générique vide ; soit on intègre des rapports dans chaque module, soit un hub "Rapports" qui redirige par type (compta, projet, RH).

---

## 5. Ordre d’exécution (comment je pilote le projet)

### Phase 0 – Fondations (priorité immédiate)

1. **Supabase** : Vérifier que le MCP et l’app utilisent le **même projet** Supabase Pro. Appliquer toutes les migrations manquantes (liste dans README-MIGRATIONS + comptabilite-audit-p2 + fix 404 programme/bailleurs/departments/presence/module_labels/dashboard_settings).  
2. **Login** : Refonte fidèle REF-LOGIN, charte COYA, mot de passe oublié si possible.  
3. **Rôle vs Poste** : Table `postes`, champ dans profil, Signup clarifié (rôle seul à l’inscription ; poste en édition profil ou RH).  
4. **Résilience** : Vérifier que tous les modules qui appellent des tables optionnelles ne crashent pas (Comptabilité déjà fait ; Programme, Dashboard, etc. à auditer).

### Phase 1 – Dashboard et pilotage

5. **Dashboard** : Conserver tout jusqu’à "Congés / Factures". Remplacer le bloc "Analyse intelligente" par le bloc analytics prédictif (cabanes colorées, scoring, alertes). Widgets activables par admin.  
6. **Scoring et alertes** : Règles métier (seuils, barème 5 %/7 %) en base ou config ; calcul à partir des tâches/objectifs/présence.

### Phase 2 – Cœur métier (Projets, Programme, Comptabilité)

7. **Projets** : Budgets projet, tâches SMART, gel auto, clôture manager, scoring, justificatifs obligatoires.  
8. **Programme & Bailleur** : Données réelles (migrations appliquées), écrans complets (programmes, bailleurs, lignes budgétaires, bénéficiaires), lien Collecte.  
9. **Comptabilité** : Migrations P2 appliquées ; exercices, statut des écritures, audit log ; rôles métier (optionnel mais recommandé).  
10. **Finance** : Aligner vocabulaire avec Comptabilité ; pas de doublon de logique "budget" si possible.

### Phase 3 – RH, CRM, Formations, Emplois

11. **RH** : Fiche poste, fiche employé, organigramme, paie (bulletin, politique), planning type My Timesquare, congés.  
12. **CRM** : Partenaires, catégories extensibles, droits par département.  
13. **Formations / Emplois** : Renforcer liens avec Projets et RH ; pas de refonte majeure si déjà stables.

### Phase 4 – Modules "métier" et nouveaux

14. **Modules stub → contenu minimal** : Partenariat, Qualité, Conseil, Juridique, Studio, Tech, Trinité : soit CRUD générique + champs métier, soit lien fort avec Projets/Programme (Collecte = formulaires).  
15. **Logistique** : Tables, workflow demande → validation → mise à disposition, fiche équipement.  
16. **Parc automobile** : Idem logique Logistique, dédié véhicules.  
17. **Ticket IT** : Demande → validation manager → envoi IT ; droits clairs.  
18. **Alerte anonyme** : Protocole, anonymat, cellule de crise, audit plateforme.  
19. **Messagerie / Discuss** : Canaux, conversations, centres d’assistance, appels (Phase 24).

### Phase 5 – Administration et polish

20. **Admin** : Sélection multi-utilisateurs, cohérence droits (user/département/rôle), un seul endroit pour "Droits d’accès".  
21. **Historique et évaluation** : Conserver l’historique ; date de démarrage du nouveau scoring si besoin.  
22. **Tests et recette** : Parcours critiques (login → dashboard → un projet → une écriture compta → un rapport) ; pas de 404 sur les appels Supabase des écrans utilisés.

---

## 6. Rôle de l’équipe multi-expertise (qui fait quoi)

- **Commercial / Product** : Priorisation des blocs (Programme vs RH vs Ticket IT), validation des parcours (création projet, saisie écriture, rapport bailleur).  
- **Managérial / RH** : Règles de scoring, seuils, barèmes, politique de congés/paie, organigramme.  
- **Ingénierie / Génie logiciel** : Architecture (migrations, services, résilience), consolidation (un seul référentiel projet/budget), performances.  
- **UX / Client** : Login, navigation, messages d’erreur, bannière lecture seule, responsive, "pas de page vide".  
- **Données / Admin** : Droits par user/département/rôle, paramétrage (exercice, cadre compta, features), sélection multi-utilisateurs.

Chaque livrable (phase ou sous-phase) est validé par au moins un représentant métier (commercial/RH) et un technique (ingénierie/UX) avant de passer à la suivante.

---

## 7. Résumé en une phrase

**Je fais en sorte que la base Supabase (Pro) soit complète et cohérente avec l’app (migrations MCP sur le bon projet), que chaque module soit soit opérationnel soit masqué/paramétrable, que les droits et la consolidation (budget, projets, paramètres) soient clairs et au bon endroit, et que le pilotage (dashboard, scoring, alertes) et les nouveaux modules (Ticket IT, Logistique, etc.) soient livrés par blocs en suivant le plan consolidé, avec une équipe multi-expertise pour valider les priorités et les parcours.**

---

*Document de référence pour la finalisation du projet COYA.PRO. À mettre à jour au fur et à mesure de l’avancement.*
