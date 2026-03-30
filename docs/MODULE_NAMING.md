# Nommage et structure des modules COYA

## Règle de nommage (gouvernance)

- **Langue** : français pour l’interface (FR).
- **Casse** : première lettre en majuscule, reste en minuscules sauf noms propres et sigles (IT, CRM).
- **Grands modules** : chaque module regroupe des **fonctionnalités** (sous-modules) ; éviter une longue liste de petits modules en barre latérale.

---

## Modules supprimés de la sidebar (fusionnés ou retirés)

| Ancien module   | Disposition |
|-----------------|-------------|
| **Tech / IT & Tech** | Supprimé. |
| **Analytics (Analyses)** | Supprimé. |
| **Tickets IT** | Supprimé. |
| **Talent Analytics** | Intégré au module **Ressources humaines** (onglet « Évaluations »). |
| **Offres d’emploi (Jobs)** | Intégré au module **Ressources humaines** (onglet « Offres d’emploi » → accès à la vue Jobs). |

---

## Renommages appliqués

| Clé technique   | Ancien libellé     | Nouveau libellé        |
|-----------------|--------------------|-------------------------|
| alerte_anonyme  | Alerte anonyme     | **Signalement**         |
| knowledge_base  | Base de connaissances | **Espace documentaire** |

**Espace documentaire** : base documentaire / système d’archivage (type Google Drive), avec administration, accès par département / équipe / pilier, traçabilité (qui a ajouté, modifié, etc.).

---

## Libellés de référence (sidebar actuelle)

| Clé technique   | Libellé affiché (FR)        |
|-----------------|----------------------------|
| dashboard       | Tableau de bord            |
| projects        | Projets                    |
| planning        | Planning                   |
| rh              | Ressources humaines        |
| comptabilite    | Comptabilité               |
| finance         | Finance                    |
| programme       | Programme & Budget         |
| courses         | Cours                      |
| crm_sales       | CRM & Ventes               |
| partenariat     | Partenariat                |
| conseil         | Conseil                    |
| qualite         | Qualité                    |
| juridique       | Juridique                  |
| studio          | Studio                     |
| collecte        | Collecte                   |
| trinite         | Trinité                    |
| logistique      | Logistique                 |
| parc_auto       | Parc automobile            |
| messagerie      | Messagerie                 |
| alerte_anonyme  | Signalement                |
| knowledge_base  | Espace documentaire        |
| notifications_center | Centre de notifications |
| activity_logs   | Historique des activités   |
| settings        | Paramètres                 |

---

## Module Ressources humaines (RH) – périmètre

Le module **Ressources humaines** regroupe :

- **Congés** (demandes, validation, SLA)
- **Fiche salarié** (liste des employés, fiche individuelle)
- **Fiche poste** (postes)
- **Organigramme**
- **Paie**
- **Évaluations** (Talent Analytics, sous-module)
- **Offres d’emploi** (accès à la vue Jobs, sous-module)
- **Planning** (lien vers le module Planning)

À terme : depuis la fiche salarié, politique de rémunération, dates de contrat, ajout de salariés, etc. (épuré, minimaliste et fonctionnel).

---

## Fusion Comptabilité / Finance (appliquée)

- **Une seule entrée** : **Comptabilité** dans la sidebar (entrée « Finance » supprimée).
- **Logique** : la vue `comptabilite` affiche le contenu du module Finance (facturation, dépenses, budgets, récurrents, analytics) avec le titre « Comptabilité » et le sous-titre « Facturation, dépenses, budgets et trésorerie. »
- **Compatibilité** : la route `finance` existe toujours (liens, favoris) et affiche le même écran avec le libellé par défaut.
- **Droits** : l’entrée Comptabilité est visible si l’utilisateur a accès au module `comptabilite` **ou** `finance`.

## À prévoir

- **Collecte (données)** : définir un module global pour la collecte de données (à préciser).
- **Espace documentaire** : mise en œuvre des accès par équipe/département/pilier et de la traçabilité (qui a fait quoi).
