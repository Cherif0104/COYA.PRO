# Réflexion : modules à intégrer ou à supprimer

Document d’analyse pour décider quels modules **intégrer dans d’autres** (sous-fonctionnalités) et quels modules **supprimer** parce que la logique ou les fonctionnalités existent déjà ailleurs.

---

## 1. Modules à intégrer dans d’autres (déjà fait ou à faire)

### Déjà intégrés (sidebar épurée)

| Module d’origine     | Intégré dans        | Commentaire |
|----------------------|---------------------|-------------|
| **Offres d’emploi (Jobs)** | **Ressources humaines** | Onglet « Offres d’emploi » dans RH ; la vue Jobs reste une page dédiée, accessible depuis RH. |
| **Talent Analytics** | **Ressources humaines** | Onglet « Évaluations » dans RH ; plus d’entrée directe dans la sidebar. |
| **Tech / IT & Tech** | —                   | Retiré de la sidebar (pas intégré ailleurs pour l’instant). |
| **Analytics**        | —                   | Retiré de la sidebar. |
| **Tickets IT**       | —                   | Retiré de la sidebar. |

### À intégrer (recommandations)

| Module              | Intégrer dans       | Justification |
|---------------------|---------------------|----------------|
| **Comptabilité**    | **Finance**         | Comptabilité et Finance partagent la même logique métier (flux financiers, écritures, rapports). Une seule entrée « Finance & Comptabilité » ou « Comptabilité & Finance » avec onglets (Facturation, Dépenses, Budgets, Écritures / Comptabilité) évite doublons et confusion. |
| **Programme & Budget** | **Finance** ou **Projets** | Si c’est surtout du budget par projet/programme, peut devenir un onglet dans **Projets** (budget par projet) ou dans **Finance** (vue programme/budget). À trancher selon l’usage métier. |
| **Conseil**         | **CRM & Ventes** ou **Qualité** | « Conseil » est souvent de la relation client ou du suivi mission. Soit sous-module CRM (missions / accompagnement), soit lien avec Qualité (audits, recommandations). Éviter un module isolé à faible contenu. |
| **Partenariat**     | **CRM & Ventes**    | Partenariats = relation avec des acteurs externes, souvent gérés comme des « contacts » ou « comptes » dans un CRM. Intégration en sous-section ou type de contact. |
| **Collecte**        | **Espace documentaire** ou module transverse | Si la collecte = récupération de données/documents, peut être une fonctionnalité de l’Espace documentaire (import, formulaires) ou un module transverse (à définir avec la direction). |

---

## 2. Modules qui peuvent être supprimés (logique déjà présente ailleurs)

### Suppression recommandée : doublon ou redondance

| Module              | Raison de suppression / fusion |
|---------------------|----------------------------------|
| **Comptabilité** (entrée séparée) | La vue **Finance** couvre déjà facturation, dépenses, récurrents, budgets et analytics. Une entrée « Comptabilité » séparée crée un doublon si elle ne fait pas plus qu’écritures comptables. **Action** : fusionner en une seule entrée **Finance** (ou « Comptabilité & Finance ») avec onglets internes. |
| **Analytics** (déjà retiré de la sidebar) | Les indicateurs globaux sont déjà présents dans le **Dashboard** (KPI, graphiques, tendances). Un module « Analytics » dédié en plus du Dashboard fait doublon sauf si besoin d’analyses avancées (export, rapports métier). **Action** : ne pas réintroduire en entrée directe ; garder la logique dans le Dashboard ou dans des sous-modules (ex. Analytics dans Finance, dans RH). |
| **Tech / Tickets IT** (déjà retirés) | Pas de périmètre métier distinct dans l’app actuelle ; support IT peut être géré ailleurs (outil dédié ou « Signalement »). **Action** : conserver la suppression. |

### À évaluer : contenu minimal ou placeholder

Ces modules sont en navigation (ou le sont encore) mais ont souvent un contenu **minimal ou placeholder**. À décider : les **réaliser** (donner une vraie logique métier) ou les **retirer / intégrer**.

| Module              | État actuel probable | Options |
|----------------------|----------------------|----------|
| **Conseil**          | Souvent placeholder  | Intégrer dans CRM ou Qualité, ou définir un périmètre métier clair (missions, livrables). |
| **Qualité**          | Peu industrialisé    | Soit le développer (indicateurs, audits, non-conformités), soit le lier à Projets (qualité livrables) ou RH (évaluations). |
| **Juridique**        | Souvent minimal      | Soit module léger (contrats, échéances), soit intégré à un module « Administration » ou « Documents » (Espace documentaire). |
| **Studio**           | Souvent minimal      | Si c’est production audiovisuelle : soit module dédié (workflow, livrables), soit sous-partie Projets ou Espace documentaire. |
| **Collecte**         | Périmètre flou       | Définir : formulaires, import de données, enquêtes ? Puis soit intégrer (Espace documentaire, CRM), soit module transverse. |
| **Trinité**          | Spécifique métier    | À garder seulement si usage réel ; sinon retirer ou intégrer comme « type de projet » ou vue dédiée dans Projets. |
| **Messagerie**       | Souvent Discuss / chat | Si non implémenté, retirer de la sidebar jusqu’à livraison ; sinon garder. |
| **Signalement (alerte anonyme)** | Souvent minimal | Garder comme entrée si la direction en a besoin ; sinon intégrer dans Paramètres (administration) ou retirer. |

---

## 3. Synthèse des actions proposées

### Intégrations à prioriser

1. **Comptabilité → Finance**  
   Une seule entrée **« Comptabilité & Finance »** (ou « Finance & Comptabilité ») avec onglets : Facturation, Dépenses, Budgets, Recurrents, et si besoin Écritures / Comptabilité.

2. **Programme & Budget**  
   Soit onglet dans **Finance**, soit section « Budget / Programme » dans **Projets**. À valider avec la direction (DAF / PMO).

3. **Partenariat → CRM & Ventes**  
   Partenariats gérés comme type de relation ou de compte dans le CRM.

4. **Conseil**  
   Intégrer dans **CRM & Ventes** (missions, accompagnement) ou dans **Qualité** (recommandations, audits), selon le métier.

### Suppressions / non-réintroduction

1. **Comptabilité** en entrée séparée → fusionner avec Finance.
2. **Analytics** en entrée directe → déjà retiré ; garder la logique dans Dashboard / sous-modules.
3. **Tech / Tickets IT** → déjà retirés ; pas de réintroduction sans périmètre métier clair.

### Modules à clarifier avant de garder ou supprimer

- **Collecte** : définir le périmètre (formulaires, données, enquêtes) puis soit intégrer (Espace documentaire, CRM), soit module transverse.
- **Trinité, Studio, Juridique, Qualité, Messagerie, Signalement** : décider pour chacun entre « développer », « intégrer ailleurs » ou « retirer de la sidebar » jusqu’à maturité.

---

## 4. Principes pour la suite

- **Grands modules, sous-fonctionnalités** : limiter les entrées sidebar ; regrouper par domaine (RH, Finance, Projets, CRM, etc.) avec onglets ou sous-pages.
- **Éviter les doublons** : une seule entrée par périmètre métier (ex. un seul module financier = Comptabilité & Finance).
- **Pas de placeholder en navigation** : ne garder en sidebar que les modules avec une vraie valeur métier ou les retirer jusqu’à livraison.
- **Valider avec la direction** : DRH, DAF, direction projet pour valider les fusions (Comptabilité/Finance, Programme/Budget) et les intégrations (Partenariat/CRM, Conseil).

Ce document peut être mis à jour au fur et à mesure des décisions et des évolutions métier.
