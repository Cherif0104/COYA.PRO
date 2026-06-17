# Manuel de procédures utilisateur et administrateur

## Plateforme COYA / SENEGEL

**Version du document :** 1.0  
**Public cible :** client, direction, administrateurs, responsables de département, utilisateurs finaux  
**Objectif :** fournir une procédure complète d'utilisation de la plateforme, module par module, avec les règles d'accès, les workflows et les paramètres d'administration.

---

## Table des matières

1. [Présentation générale de la plateforme](#1-présentation-générale-de-la-plateforme)
2. [Connexion, premier accès et navigation](#2-connexion-premier-accès-et-navigation)
3. [Rôles, droits et règles d'accès](#3-rôles-droits-et-règles-daccès)
4. [Procédures transverses](#4-procédures-transverses)
5. [Tableau de bord](#5-tableau-de-bord)
6. [Projets](#6-projets)
7. [Planning](#7-planning)
8. [Ressources humaines](#8-ressources-humaines)
9. [Comptabilité et Finance](#9-comptabilité-et-finance)
10. [Programme & Budget](#10-programme--budget)
11. [Cours et formations](#11-cours-et-formations)
12. [CRM & Ventes](#12-crm--ventes)
13. [Trinité](#13-trinité)
14. [Logistique](#14-logistique)
15. [Parc automobile](#15-parc-automobile)
16. [Messagerie](#16-messagerie)
17. [Ticket IT](#17-ticket-it)
18. [DOCS SENEGEL](#18-docs-senegel)
19. [Moyens généraux & DAF](#19-moyens-généraux--daf)
20. [Suivi du temps](#20-suivi-du-temps)
21. [Objectifs et OKR](#21-objectifs-et-okr)
22. [Analytics et Talent Analytics](#22-analytics-et-talent-analytics)
23. [Centre de notifications](#23-centre-de-notifications)
24. [Historique des activités](#24-historique-des-activités)
25. [Paramètres personnels](#25-paramètres-personnels)
26. [Administration de la plateforme](#26-administration-de-la-plateforme)
27. [Annexes : statuts, règles et référentiels](#27-annexes--statuts-règles-et-référentiels)

---

## 1. Présentation générale de la plateforme

La plateforme COYA / SENEGEL est un espace de pilotage intégré permettant de centraliser :

- la gestion des projets ;
- la planification ;
- les ressources humaines ;
- la comptabilité ;
- le suivi des programmes et budgets ;
- les formations ;
- le CRM et les ventes ;
- la gestion documentaire ;
- les demandes DAF ;
- la messagerie interne ;
- les tickets IT ;
- les paramètres d'administration et de sécurité.

La plateforme fonctionne par modules. Chaque utilisateur voit uniquement les modules auxquels il a accès selon :

1. son rôle ;
2. ses permissions individuelles ;
3. son ou ses départements ;
4. les droits de lecture, écriture, suppression et approbation définis par l'administrateur.

### 1.1 Principes clés

- **Une seule plateforme, plusieurs usages :** chaque direction ou département utilise les modules nécessaires à son activité.
- **Accès contrôlé :** un module non autorisé n'apparaît pas dans la barre latérale.
- **Traçabilité :** les actions importantes sont historisées.
- **Multi-organisation :** la plateforme peut gérer une organisation principale et, si configuré, plusieurs organisations hébergées.
- **Langues :** l'interface peut être utilisée en français ou en anglais.

---

## 2. Connexion, premier accès et navigation

### 2.1 Connexion

1. Ouvrir l'adresse de la plateforme dans le navigateur.
2. Saisir son adresse e-mail.
3. Saisir son mot de passe.
4. Cliquer sur **Se connecter**.

Si l'utilisateur n'a pas encore de compte actif, il doit contacter l'administrateur plateforme ou l'administrateur de son organisation.

### 2.2 Compte en attente

Certains rôles nécessitent une validation administrateur. Dans ce cas :

- l'utilisateur peut voir un écran indiquant que son accès est en attente ;
- l'administrateur doit approuver la demande ;
- un département doit être affecté si la règle départementale est active ;
- les droits de modules doivent être configurés.

### 2.3 Première connexion et statut de présence

Après connexion, la plateforme peut afficher un sélecteur de statut. L'utilisateur choisit son état de disponibilité :

- disponible / en ligne ;
- pause ;
- réunion ;
- absent ;
- autre statut configuré.

Ce statut permet d'alimenter les indicateurs RH, la présence et le planning.

### 2.4 Navigation principale

La navigation se fait depuis la barre latérale gauche. Les modules visibles dépendent des droits de l'utilisateur.

Modules principaux :

1. Tableau de bord
2. Projets
3. Planning
4. Ressources humaines
5. Comptabilité
6. Programme & Budget
7. Cours
8. CRM & Ventes
9. Trinité
10. Logistique
11. Parc automobile
12. Messagerie
13. Ticket IT
14. DOCS SENEGEL
15. Moyens généraux & DAF
16. Paramètres

### 2.5 Barre supérieure

La barre supérieure permet de :

- consulter les notifications ;
- accéder aux paramètres ;
- changer la langue ;
- ouvrir le profil ;
- se déconnecter ;
- accéder à l'historique ou à certaines vues internes selon les droits.

### 2.6 Assistant flottant

Un assistant flottant peut être disponible pour orienter l'utilisateur vers :

- la messagerie ;
- les tickets IT ;
- des raccourcis d'aide.

---

## 3. Rôles, droits et règles d'accès

### 3.1 Catégories de rôles

La plateforme distingue plusieurs familles de rôles.

#### Rôles de gestion

- super_administrator ;
- administrator ;
- manager ;
- supervisor ;
- intern.

#### Rôles RH, paie et recrutement

- hr_business_partner ;
- hr_officer ;
- recruiter ;
- payroll_specialist ;
- team_lead.

#### Rôles d'accompagnement

- trainer ;
- coach ;
- facilitator ;
- partner_facilitator ;
- mentor.

#### Rôles académiques et jeunesse

- student ;
- alumni.

#### Rôles économiques et partenaires

- entrepreneur ;
- employer ;
- implementer ;
- funder.

#### Rôles créatifs et médias

- publisher ;
- editor ;
- producer ;
- artist.

### 3.2 Droits par module

Chaque module dispose de quatre niveaux de droits :

| Droit | Signification |
|---|---|
| Voir | Accéder au module et consulter les données |
| Créer / Modifier | Ajouter ou modifier des données |
| Supprimer | Supprimer des données |
| Approuver | Valider ou refuser des demandes |

Règle importante : si le droit **Voir** est désactivé, les autres droits ne sont pas utilisables.

### 3.3 Règle des départements

Les départements servent à limiter le périmètre d'accès.

Règles principales :

- chaque département doit être rattaché à exactement **2 modules** ;
- un utilisateur ne voit que les modules autorisés par ses départements et ses droits ;
- une équipe département conforme doit contenir au minimum 2 personnes ;
- chaque département doit avoir 1 superviseur ;
- chaque département doit avoir au moins 1 manager ;
- le superviseur ne peut pas être manager du même département en même temps.

### 3.4 Super administrateur

Le super administrateur dispose d'un accès complet à la plateforme. Il peut :

- gérer les organisations ;
- gérer les départements ;
- gérer les utilisateurs ;
- modifier les libellés des modules ;
- configurer le tableau de bord ;
- définir certains paramètres globaux ;
- consulter les rubriques d'administration.

### 3.5 Utilisateur sans accès

Si un utilisateur ne dispose d'aucun module autorisé, il est dirigé vers un écran d'accès en attente ou d'accès insuffisant. L'administrateur doit alors vérifier :

1. son rôle ;
2. ses départements ;
3. ses droits par module ;
4. le statut actif du compte.

---

## 4. Procédures transverses

### 4.1 Créer un nouvel utilisateur

1. Aller dans **Paramètres**.
2. Ouvrir **Administration**.
3. Cliquer sur **Utilisateurs & droits**.
4. Cliquer sur **Nouvel utilisateur**.
5. Renseigner :
   - e-mail ;
   - nom complet ;
   - téléphone ;
   - organisation si applicable ;
   - rôle ;
   - poste si le référentiel des postes est actif.
6. Choisir si un e-mail de mot de passe doit être envoyé.
7. Enregistrer.
8. Si le rôle nécessite validation, traiter la demande dans **Demandes d'accès**.
9. Affecter l'utilisateur à un département.
10. Vérifier ses permissions.

### 4.2 Donner accès à un module

1. Vérifier que le module est autorisé dans le département de l'utilisateur.
2. Aller dans **Paramètres > Utilisateurs & droits > Permissions**.
3. Sélectionner l'utilisateur.
4. Activer le module.
5. Définir les droits :
   - Voir ;
   - Créer / Modifier ;
   - Supprimer ;
   - Approuver.
6. Attendre la sauvegarde automatique ou confirmer selon l'écran.
7. Demander à l'utilisateur de rafraîchir sa session si nécessaire.

### 4.3 Retirer l'accès à un module

1. Aller dans **Utilisateurs & droits**.
2. Sélectionner l'utilisateur.
3. Désactiver le droit **Voir** sur le module concerné.
4. Vérifier également les modules du département.
5. Enregistrer.

### 4.4 Modifier son mot de passe

1. Aller dans **Paramètres**.
2. Ouvrir **Mon compte > Profil**.
3. Saisir le nouveau mot de passe.
4. Confirmer le nouveau mot de passe.
5. Valider.

Règle : le mot de passe doit contenir au minimum 8 caractères.

### 4.5 Consulter les notifications

1. Cliquer sur l'icône de notification dans la barre supérieure.
2. Filtrer si nécessaire par type ou module.
3. Cliquer sur une notification pour accéder à l'élément concerné.
4. Marquer comme lu ou supprimer si nécessaire.

### 4.6 Consulter l'historique d'activité

1. Aller dans **Paramètres > Notifications & activité**.
2. Ouvrir **Historique des activités**.
3. Filtrer par module, action ou période.
4. Ouvrir les détails pour consulter les métadonnées d'une action.

---

## 5. Tableau de bord

### 5.1 Objectif

Le tableau de bord est la page d'accueil de pilotage. Il centralise les indicateurs, alertes et raccourcis utiles.

### 5.2 Contenu principal

Selon les droits et la configuration, l'utilisateur peut voir :

- indicateurs clés ;
- jours travaillés ;
- alertes ;
- objectifs du jour ;
- synthèse des projets ;
- synthèse des congés ;
- synthèse des factures ;
- tendances d'heures ;
- performance ;
- analytics prédictif ;
- raccourcis vers les modules.

### 5.3 Procédure d'utilisation

1. Ouvrir **Tableau de bord**.
2. Consulter les indicateurs prioritaires.
3. Cliquer sur un raccourci pour ouvrir le module correspondant.
4. Traiter les alertes visibles.
5. Vérifier les objectifs ou actions du jour.

### 5.4 Règles

- Les widgets visibles peuvent être configurés par le super administrateur.
- Les données affichées dépendent des modules autorisés.
- Les liens vers Finance, Projets, Suivi du temps ou Objectifs ne fonctionnent que si l'utilisateur a les droits associés.

---

## 6. Projets

### 6.1 Objectif

Le module **Projets** permet de créer, suivre, piloter et clôturer les projets. Il centralise les tâches, risques, objectifs, budgets, rapports et pièces jointes.

### 6.2 Écrans disponibles

- liste des projets ;
- création de projet ;
- détail projet ;
- tâches ;
- risques ;
- rapports ;
- historique ;
- objectifs ;
- pièces jointes ;
- budget.

### 6.3 Créer un projet

1. Ouvrir **Projets**.
2. Cliquer sur le bouton de création.
3. Renseigner les informations générales :
   - titre ;
   - description ;
   - type ;
   - statut ;
   - dates ;
   - responsables ou membres associés.
4. Enregistrer.

### 6.4 Gérer les tâches

1. Ouvrir le détail d'un projet.
2. Aller dans l'onglet **Tâches**.
3. Ajouter une tâche.
4. Définir :
   - titre ;
   - responsable ;
   - priorité ;
   - échéance ;
   - statut.
5. Mettre à jour la tâche au fil de l'avancement.
6. Ajouter un justificatif si la règle l'exige.

### 6.5 Gérer les risques

1. Ouvrir un projet.
2. Aller dans **Risques**.
3. Ajouter un risque.
4. Renseigner :
   - description ;
   - probabilité ;
   - impact ;
   - stratégie de mitigation.
5. Mettre à jour le risque selon son évolution.

### 6.6 Gérer le budget projet

1. Ouvrir le projet.
2. Aller dans **Budget**.
3. Ajouter ou consulter les lignes budgétaires.
4. Comparer le prévisionnel et le réel.
5. Surveiller les alertes de dépassement.

### 6.7 Clôturer un projet

Avant clôture, vérifier :

- les tâches critiques ;
- les justificatifs ;
- les risques ;
- le budget ;
- le rapport final ;
- les objectifs.

### 6.8 Règles du module Projets

Les règles peuvent être configurées dans **Paramètres > Module Projets** :

- types de projet ;
- statuts projet ;
- seuil d'alerte retard ;
- score par tâche réalisée ;
- score manager ;
- justificatif obligatoire ;
- gel automatique des tâches en retard ;
- date de démarrage des évaluations ;
- seuils budget warning / critique ;
- seuil objectif off-track.

---

## 7. Planning

### 7.1 Objectif

Le module **Planning** permet de suivre les créneaux, les absences, la présence, les réunions, les équipes et les conflits de planification.

### 7.2 Rubriques principales

- pilotage ;
- mon planning ;
- équipe & planning ;
- présence RH ;
- absences RH ;
- postes RH ;
- shifts & échanges ;
- conflits ;
- notifications.

### 7.3 Utiliser son planning

1. Ouvrir **Planning**.
2. Aller dans **Mon planning**.
3. Consulter ses créneaux.
4. Vérifier les réunions, absences ou modulations.
5. Utiliser les liens vers le suivi du temps si nécessaire.

### 7.4 Gérer le planning d'équipe

1. Ouvrir **Équipe & planning**.
2. Filtrer par collaborateur, département ou période.
3. Vérifier les disponibilités.
4. Identifier les conflits.
5. Coordonner les absences et réunions.

### 7.5 Types de créneaux

- présentiel ;
- télétravail ;
- congé ;
- réunion ;
- modulation ;
- autre.

### 7.6 Règles

- L'accès à la vue équipe dépend du rôle et des permissions.
- Les modules RH intégrés au Planning s'affichent seulement si l'utilisateur dispose des droits nécessaires.

---

## 8. Ressources humaines

### 8.1 Objectif

Le module **Ressources humaines** regroupe la gestion des salariés, de la présence, des congés, des postes, de l'organigramme, de la paie et des offres d'emploi.

### 8.2 Onglets disponibles

| Onglet | Utilisation |
|---|---|
| Salariés | consulter les collaborateurs et fiches individuelles |
| Présence | suivre les statuts, retards, pauses et temps de présence |
| Congés | déposer et suivre les demandes de congés |
| Fiche poste | consulter les postes |
| Organigramme | consulter la structure organisationnelle |
| Paie | consulter ou préparer les éléments de paie |
| Offres d'emploi | gérer ou consulter les offres |

### 8.3 Consulter une fiche salarié

1. Ouvrir **Ressources humaines**.
2. Aller dans **Salariés**.
3. Rechercher un collaborateur.
4. Ouvrir sa fiche.
5. Consulter les informations autorisées.

### 8.4 Suivre la présence

1. Aller dans **Présence**.
2. Consulter les statuts du jour.
3. Identifier les retards, pauses ou absences.
4. Vérifier l'historique si nécessaire.

### 8.5 Demander un congé

1. Aller dans **Congés**.
2. Cliquer sur **Nouvelle demande**.
3. Sélectionner le type de congé.
4. Renseigner les dates.
5. Ajouter un motif.
6. Soumettre la demande.

### 8.6 Valider un congé

1. Aller dans **Paramètres > Congés (validation)** ou dans la vue admin RH.
2. Filtrer les demandes en attente.
3. Ouvrir une demande.
4. Approuver ou rejeter.
5. Saisir une raison obligatoire.
6. Enregistrer.

### 8.7 Règles de présence

Règles de référence :

- seuil de retard : 15 minutes ;
- pause maximale indicative : 60 minutes ;
- durée hebdomadaire cible : 44 heures ;
- plage journalière indicative : 9h à 19h.

Ces règles peuvent être adaptées selon les politiques internes.

---

## 9. Comptabilité et Finance

### 9.1 Objectif

La plateforme distingue :

- **Comptabilité** : comptabilité générale, écritures, plan comptable, journaux, rapports ;
- **Finance** : factures, dépenses, budgets opérationnels, récurrents et analytics.

La barre latérale affiche principalement **Comptabilité**. Certaines vues internes ou anciens liens peuvent ouvrir **Finance**.

### 9.2 Module Comptabilité

#### Contenu

- plan comptable ;
- écritures ;
- rapports ;
- clôture ;
- paramètres ;
- journaux ;
- centres de coûts ;
- budgets ;
- fiscal ;
- lettrage ;
- rapprochement.

#### Modes

- **Essentiel** : accès aux fonctions principales ;
- **Avancé** : accès aux paramètres comptables et fonctions détaillées.

#### Procédure : consulter les écritures

1. Ouvrir **Comptabilité**.
2. Aller dans **Écritures**.
3. Filtrer par date, journal, compte ou statut.
4. Ouvrir une écriture pour consulter le détail.

#### Procédure : gérer le plan comptable

1. Aller dans **Plan comptable**.
2. Rechercher un compte.
3. Créer ou modifier un compte si le droit d'écriture est disponible.
4. Vérifier le cadre comptable applicable.

#### Règles

- L'utilisateur en lecture seule ne peut pas modifier les données.
- Les paramètres comptables sont réservés aux utilisateurs disposant des droits d'écriture.
- Les cadres comptables pris en charge peuvent inclure SYSCOHADA / SYCEBNL selon la configuration.

### 9.3 Vue Finance

#### Contenu

- factures ;
- dépenses ;
- factures récurrentes ;
- dépenses récurrentes ;
- budgets ;
- analytics.

#### Procédure : gérer une facture

1. Ouvrir la vue Finance si disponible.
2. Aller dans **Factures**.
3. Créer ou ouvrir une facture.
4. Renseigner client, montant, statut, date et informations associées.
5. Enregistrer.

#### Statuts de facture

Les statuts peuvent inclure :

- brouillon ;
- envoyée ;
- payée ;
- partiellement payée ;
- en retard ;
- annulée.

#### Règles

- La modification est réservée au créateur ou aux rôles de gestion.
- Les données financières doivent être vérifiées avant validation ou clôture.

---

## 10. Programme & Budget

### 10.1 Objectif

Le module **Programme & Budget** permet de suivre les programmes, bailleurs, budgets, projets terrain, bénéficiaires et actions associées.

### 10.2 Rubriques principales

- Programmes ;
- Bailleurs ;
- Résumé programme ;
- Budget ;
- Projets terrain ;
- Acteurs / collecte.

### 10.3 Créer ou consulter un programme

1. Ouvrir **Programme & Budget**.
2. Aller dans **Programmes**.
3. Créer un programme ou ouvrir un programme existant.
4. Renseigner :
   - nom ;
   - bailleur ;
   - dates ;
   - budget ;
   - objectifs ;
   - projets liés.

### 10.4 Gérer les bailleurs

1. Ouvrir l'onglet **Bailleurs**.
2. Ajouter un bailleur.
3. Renseigner les informations de contact.
4. Lier le bailleur aux programmes concernés.

### 10.5 Suivre le budget

1. Ouvrir le détail d'un programme.
2. Aller dans **Budget**.
3. Consulter les lignes budgétaires.
4. Comparer le prévisionnel au réel.
5. Identifier les écarts.

### 10.6 Suivre les projets terrain

1. Aller dans **Projets terrain**.
2. Consulter les projets liés au programme.
3. Vérifier les activités, tâches et dépenses associées.

### 10.7 Règles

- Certains profils peuvent être en lecture seule, notamment les auditeurs.
- Les dépenses et lignes budgétaires doivent être rattachées à un programme ou projet lorsque la règle métier l'impose.

---

## 11. Cours et formations

### 11.1 Objectif

Le module **Cours** permet de consulter les formations disponibles et de suivre les parcours d'apprentissage.

### 11.2 Utilisateur : consulter un cours

1. Ouvrir **Cours**.
2. Parcourir le catalogue.
3. Filtrer ou rechercher une formation.
4. Cliquer sur un cours.
5. Consulter les modules, leçons, documents et progression.

### 11.3 Administrateur : gérer le catalogue

1. Aller dans **Paramètres > Formations**.
2. Consulter la liste des cours.
3. Créer ou modifier un cours.
4. Définir :
   - titre ;
   - description ;
   - formateur ;
   - durée ;
   - niveau ;
   - catégorie ;
   - prix ;
   - statut ;
   - modules et leçons ;
   - documents ;
   - quiz ;
   - public cible.
5. Publier ou laisser en brouillon.

### 11.4 Statuts de cours

- brouillon ;
- publié ;
- archivé.

### 11.5 Règles

- Seuls les utilisateurs autorisés peuvent créer, modifier ou supprimer une formation.
- Un cours publié est visible aux utilisateurs ciblés selon la configuration.

---

## 12. CRM & Ventes

### 12.1 Objectif

Le module **CRM & Ventes** permet de gérer les contacts, prospects, clients, pipeline commercial et opérations de collecte.

### 12.2 Vues principales

- liste des contacts ;
- pipeline ;
- collecte ;
- dossier contact ;
- détails et échanges.

### 12.3 Créer un contact

1. Ouvrir **CRM & Ventes**.
2. Cliquer sur **Ajouter un contact**.
3. Renseigner les informations :
   - nom ;
   - e-mail ;
   - téléphone ;
   - organisation ;
   - statut ;
   - source ;
   - notes.
4. Enregistrer.

### 12.4 Gérer le pipeline

1. Aller dans **Pipeline**.
2. Identifier le contact ou prospect.
3. Modifier son statut selon l'évolution.
4. Ajouter les notes ou interactions nécessaires.

### 12.5 Statuts CRM

Statuts de référence :

- lead ;
- contacté ;
- injoignable ;
- rappel attendu ;
- prospect ;
- client.

### 12.6 Collecte

La collecte est intégrée au CRM. Elle permet de :

- créer des campagnes ou formulaires de collecte ;
- définir des champs participants ;
- rattacher la collecte à un programme, projet ou cours ;
- synchroniser certains participants vers le CRM ;
- enrichir les contacts.

### 12.7 Règles

- Le créateur d'un contact peut généralement gérer son contact.
- Les rôles de gestion peuvent disposer d'une vision plus large.
- Les actions de synchronisation ou webhook sont réservées aux profils autorisés.

---

## 13. Trinité

### 13.1 Objectif

Le module **Trinité** permet de suivre des indicateurs liés aux piliers internes : Ndiguel, Yar et Barké. Il peut servir à l'auto-évaluation, aux revues manager et à l'analyse de performance.

### 13.2 Procédure utilisateur

1. Ouvrir **Trinité**.
2. Sélectionner la période.
3. Consulter ses indicateurs.
4. Renseigner une auto-note si la fonctionnalité est ouverte.
5. Enregistrer.

### 13.3 Procédure manager

1. Ouvrir **Trinité**.
2. Sélectionner un collaborateur ou une équipe.
3. Consulter les scores.
4. Ajouter une revue manager.
5. Enregistrer.

### 13.4 Règles

- Les managers et superviseurs peuvent avoir accès aux données d'équipe.
- Les utilisateurs voient principalement leurs propres données, sauf droits étendus.
- Les périodes doivent être cohérentes avec le calendrier de suivi interne.

---

## 14. Logistique

### 14.1 Objectif

Le module **Logistique** permet de gérer les équipements et les demandes de matériel ou de ressources logistiques.

### 14.2 Contenu

- catalogue d'équipements ;
- demandes logistiques ;
- statuts de traitement.

### 14.3 Créer une demande logistique

1. Ouvrir **Logistique**.
2. Cliquer sur **Nouvelle demande**.
3. Sélectionner l'équipement ou la catégorie.
4. Renseigner le besoin, les dates et la justification.
5. Soumettre.

### 14.4 Traiter une demande

1. Ouvrir la demande.
2. Vérifier les informations.
3. Valider, rejeter ou mettre à disposition.
4. Mettre à jour le statut.

### 14.5 Statuts

- demandé ;
- validé ;
- mis à disposition ;
- retourné ;
- rejeté.

### 14.6 Règles

- La création ou modification du catalogue est réservée aux profils autorisés.
- Les demandes doivent être justifiées et rattachées à un besoin réel.

---

## 15. Parc automobile

### 15.1 Objectif

Le module **Parc automobile** permet de gérer les véhicules, disponibilités, affectations et demandes d'utilisation.

### 15.2 Contenu

- liste des véhicules ;
- demandes de véhicule ;
- suivi de mise à disposition ;
- retours.

### 15.3 Créer une demande de véhicule

1. Ouvrir **Parc automobile**.
2. Cliquer sur **Nouvelle demande**.
3. Indiquer le motif du déplacement.
4. Renseigner dates, horaires et destination.
5. Soumettre.

### 15.4 Traiter une demande

1. Ouvrir la demande.
2. Vérifier la disponibilité.
3. Valider ou refuser.
4. Affecter le véhicule si validé.
5. Mettre à jour le statut après retour.

### 15.5 Statuts

- demandé ;
- validé ;
- mis à disposition ;
- retourné ;
- rejeté.

---

## 16. Messagerie

### 16.1 Objectif

Le module **Messagerie** permet les échanges internes via canaux ou messages directs.

### 16.2 Rubriques

- canaux ;
- messages directs.

### 16.3 Utiliser un canal

1. Ouvrir **Messagerie**.
2. Aller dans **Canaux**.
3. Sélectionner un canal.
4. Lire les messages.
5. Envoyer un message si autorisé.
6. Ajouter une mention si nécessaire.

### 16.4 Envoyer un message direct

1. Aller dans **Messages directs**.
2. Sélectionner un utilisateur.
3. Rédiger le message.
4. Envoyer.

### 16.5 Règles

- Certains canaux peuvent être publics ou privés.
- Les droits d'administration des canaux sont réservés aux profils autorisés.
- Les pièces jointes et mentions doivent respecter les règles internes de confidentialité.

---

## 17. Ticket IT

### 17.1 Objectif

Le module **Ticket IT** permet de signaler un problème technique, une demande d'assistance ou une intervention informatique.

### 17.2 Créer un ticket

1. Ouvrir **Ticket IT**.
2. Cliquer sur **Nouveau ticket**.
3. Renseigner :
   - titre ;
   - description ;
   - priorité ;
   - type de problème ;
   - visibilité ;
   - capture ou pièce jointe si nécessaire.
4. Soumettre.

### 17.3 Workflow d'un ticket

Statuts possibles :

1. brouillon ;
2. en attente validation ;
3. reformulation demandée ;
4. validé ;
5. envoyé IT ;
6. en cours ;
7. résolu ;
8. refusé.

### 17.4 Traitement manager / IT

1. Ouvrir le ticket.
2. Vérifier la demande.
3. Demander une reformulation si nécessaire.
4. Valider ou refuser.
5. Affecter à un intervenant IT.
6. Mettre à jour l'avancement.
7. Marquer comme résolu.

### 17.5 Règles de visibilité

- le créateur voit ses tickets ;
- le manager peut voir les tickets de son périmètre ;
- l'intervenant affecté voit les tickets qui lui sont assignés ;
- le super administrateur peut voir l'ensemble.

---

## 18. DOCS SENEGEL

### 18.1 Objectif

**DOCS SENEGEL** est l'espace documentaire de la plateforme. Il permet de gérer dossiers, fichiers, droits d'accès et partage interne.

### 18.2 Actions principales

- créer un dossier ;
- importer un fichier ;
- renommer ;
- déplacer ;
- supprimer ;
- gérer les droits ;
- partager avec des utilisateurs.

### 18.3 Importer un document

1. Ouvrir **DOCS SENEGEL**.
2. Sélectionner le dossier cible.
3. Cliquer sur l'action d'import.
4. Choisir le fichier.
5. Vérifier le nom et les droits.
6. Enregistrer.

### 18.4 Créer un dossier

1. Aller dans le dossier parent.
2. Cliquer sur **Nouveau dossier**.
3. Nommer le dossier.
4. Définir la visibilité si disponible.
5. Enregistrer.

### 18.5 Gérer les droits

Les niveaux d'accès peuvent inclure :

- propriétaire ;
- administrateur ;
- éditeur ;
- lecteur ;
- aucun accès.

Procédure :

1. Ouvrir le dossier ou fichier.
2. Accéder aux options de partage.
3. Ajouter l'utilisateur.
4. Choisir le rôle : lecteur ou éditeur.
5. Valider.

### 18.6 Règles

- Les documents sensibles doivent rester en accès privé ou restreint.
- Les droits doivent être attribués selon le besoin réel.
- Les suppressions doivent être réalisées avec prudence.

---

## 19. Moyens généraux & DAF

### 19.1 Objectif

Le module **Moyens généraux & DAF** permet de gérer les demandes administratives, documents, signatures, informations ou moyens généraux.

### 19.2 Types de demandes

- demande générale ;
- remise ou livraison de document ;
- demande d'information ;
- workflow de signature.

### 19.3 Catégories

- fournitures ;
- logistique ;
- IT / divers ;
- véhicule ;
- mobilier ;
- déplacement ;
- autre.

### 19.4 Créer une demande DAF

1. Ouvrir **Moyens généraux & DAF**.
2. Cliquer sur **Nouvelle demande**.
3. Choisir le type.
4. Choisir la catégorie.
5. Renseigner le besoin.
6. Ajouter les pièces nécessaires.
7. Enregistrer en brouillon ou soumettre.

### 19.5 Traiter une demande DAF

1. Ouvrir la demande.
2. Vérifier les informations.
3. Affecter un responsable si nécessaire.
4. Échanger avec le demandeur.
5. Ajouter des pièces ou commentaires.
6. Approuver, rejeter, mettre en attente ou clôturer.

### 19.6 Statuts

- brouillon ;
- soumis ;
- en revue ;
- en attente demandeur ;
- en attente signature externe ;
- approuvé ;
- rejeté ;
- traité ;
- annulé.

### 19.7 Règles

- Le demandeur peut modifier ou supprimer ses brouillons.
- Les reviewers DAF traitent les demandes soumises.
- Les messages internes DAF ne doivent être utilisés que pour les échanges réservés.

---

## 20. Suivi du temps

### 20.1 Objectif

Le **Suivi du temps** permet de suivre les heures travaillées, réunions et temps associés aux projets ou activités.

Ce module peut être accessible depuis le tableau de bord, le planning ou certains liens internes.

### 20.2 Ajouter un temps

1. Ouvrir **Suivi du temps**.
2. Cliquer sur **Ajouter un temps**.
3. Choisir le projet, cours ou activité.
4. Renseigner la durée.
5. Ajouter une description.
6. Enregistrer.

### 20.3 Ajouter une réunion

1. Ouvrir l'onglet réunions si disponible.
2. Créer une réunion.
3. Renseigner date, heure, participants et sujet.
4. Enregistrer.

### 20.4 Règles

- Les managers peuvent avoir une vision plus large de l'équipe.
- Les utilisateurs standards consultent principalement leurs propres temps.
- Les temps doivent être saisis régulièrement pour alimenter les indicateurs.

---

## 21. Objectifs et OKR

### 21.1 Objectif

Les objectifs et OKR permettent de suivre les priorités, résultats clés et engagements. Dans l'état actuel, la gestion OKR est principalement accessible via le tableau de bord et les détails de projet.

### 21.2 Utilisation

1. Ouvrir **Tableau de bord** ou un **Projet**.
2. Consulter les objectifs associés.
3. Suivre les progrès.
4. Mettre à jour les résultats selon les droits.

### 21.3 Règles

- Les objectifs doivent être rattachés à un projet ou à une priorité claire.
- Un objectif doit être mesurable.
- Les écarts peuvent déclencher des alertes selon le paramétrage projet.

---

## 22. Analytics et Talent Analytics

### 22.1 Objectif

Les vues **Analytics** et **Talent Analytics** permettent d'accéder à des analyses détaillées. Elles ne sont pas nécessairement affichées dans la barre latérale, mais peuvent être accessibles selon les droits ou depuis certaines vues.

### 22.2 Analytics

Peut regrouper :

- activité plateforme ;
- projets ;
- cours ;
- emplois ;
- indicateurs globaux.

### 22.3 Talent Analytics

Peut regrouper :

- compétences ;
- talents ;
- candidatures ;
- évaluations ;
- prévisions RH.

### 22.4 Règles

- Ces vues sont réservées aux profils disposant des droits correspondants.
- Les données affichées doivent être interprétées comme des indicateurs d'aide à la décision.

---

## 23. Centre de notifications

### 23.1 Objectif

Le centre de notifications centralise les alertes et événements liés aux modules.

### 23.2 Accéder aux notifications

1. Cliquer sur la cloche dans la barre supérieure.
2. Consulter les notifications récentes.
3. Cliquer sur **Voir toutes les notifications** pour ouvrir la page complète.

### 23.3 Actions possibles

- ouvrir l'élément lié ;
- marquer comme lu ;
- marquer toutes comme lues ;
- supprimer ;
- filtrer par module ou état.

### 23.4 Types de notifications

- information ;
- succès ;
- avertissement ;
- erreur.

### 23.5 Modules concernés

Les notifications peuvent concerner :

- projets ;
- factures ;
- dépenses ;
- cours ;
- objectifs ;
- suivi du temps ;
- congés ;
- documents ;
- utilisateurs ;
- tickets IT ;
- messagerie ;
- système.

---

## 24. Historique des activités

### 24.1 Objectif

L'historique des activités permet de retracer les actions importantes effectuées dans la plateforme.

### 24.2 Accès

1. Aller dans **Paramètres**.
2. Ouvrir **Notifications & activité**.
3. Cliquer sur **Historique des activités**.

### 24.3 Informations visibles

- utilisateur ayant réalisé l'action ;
- module concerné ;
- type d'action ;
- date et heure ;
- résumé ;
- entité concernée ;
- détails techniques ou métier si disponibles.

### 24.4 Filtres

- module ;
- action ;
- recherche ;
- pagination.

### 24.5 Actions suivies

- création ;
- modification ;
- suppression ;
- lecture ;
- connexion ;
- déconnexion ;
- export ;
- notification ;
- action personnalisée.

---

## 25. Paramètres personnels

### 25.1 Accès

1. Cliquer sur **Paramètres** dans la barre latérale.
2. Ouvrir l'espace **Mon compte**.

### 25.2 Profil

Permet de consulter ou modifier :

- nom ;
- e-mail ;
- rôle ;
- téléphone ;
- localisation ;
- photo ;
- bio ;
- mot de passe.

### 25.3 Préférences

Permet de configurer :

- langue ;
- rappels d'échéances ;
- préférences d'interface.

### 25.4 Notifications & activité

Permet d'accéder :

- au centre de notifications ;
- à l'historique des activités.

### 25.5 Compétences

Permet de gérer la liste des compétences de l'utilisateur. Ces compétences peuvent être utilisées pour :

- le profil ;
- le matching emploi ;
- l'analyse des talents.

---

## 26. Administration de la plateforme

L'espace **Administration** est disponible dans **Paramètres** selon les droits de l'utilisateur.

### 26.1 Libellés des modules

#### Objectif

Renommer les modules pour une organisation.

#### Accès

Super administrateur uniquement.

#### Procédure

1. Aller dans **Paramètres > Administration > Libellés modules**.
2. Identifier la clé technique du module.
3. Saisir le libellé français.
4. Saisir le libellé anglais.
5. Enregistrer.

Règle : un champ vide utilise le libellé par défaut.

### 26.2 Widgets tableau de bord

#### Objectif

Activer ou désactiver les blocs visibles sur le tableau de bord.

#### Accès

Super administrateur uniquement.

#### Widgets configurables

- jours travaillés ;
- alertes ;
- objectifs du jour ;
- indicateurs ;
- performance ;
- analytics prédictif ;
- analyse intelligente ;
- raccourcis par module.

#### Procédure

1. Aller dans **Paramètres > Administration > Widgets tableau de bord**.
2. Activer ou désactiver les widgets.
3. Enregistrer ou attendre la sauvegarde selon l'interface.

### 26.3 Module Projets

#### Objectif

Configurer les règles du module Projets.

#### Paramètres disponibles

- types de projet ;
- statuts ;
- seuil alerte retard ;
- score tâche ;
- score manager ;
- justificatif obligatoire ;
- gel automatique ;
- date de démarrage des évaluations ;
- SLA congés ;
- seuil objectif off-track ;
- seuils budget.

### 26.4 Automatisation & observabilité

#### Objectif

Suivre les cycles d'automatisation et les actions générées automatiquement.

#### Indicateurs

- date du dernier cycle ;
- nombre total d'actions ;
- notifications générées ;
- mises à jour automatiques ;
- répartition par sévérité.

### 26.5 Organisations

#### Objectif

Gérer les organisations ou tenants.

#### Champs

- nom ;
- slug ;
- description ;
- site web ;
- e-mail de contact ;
- statut actif.

#### Procédure de création

1. Aller dans **Paramètres > Organisations**.
2. Cliquer sur **Créer**.
3. Renseigner les champs obligatoires.
4. Enregistrer.

#### Règles

- Le slug est immuable après création.
- L'organisation plateforme ne doit pas être désactivée ou supprimée.
- En mode organisation unique, la création de tenants peut être désactivée.

### 26.6 Départements

#### Objectif

Créer les périmètres d'accès par département.

#### Champs

- nom ;
- slug ;
- ordre ;
- statut ;
- modules autorisés ;
- membres ;
- superviseur ;
- managers.

#### Procédure de création

1. Aller dans **Paramètres > Départements**.
2. Cliquer sur **Créer**.
3. Renseigner le nom et le slug.
4. Sélectionner exactement 2 modules.
5. Enregistrer.
6. Affecter les membres.
7. Désigner le superviseur.
8. Désigner au moins un manager.
9. Vérifier le badge de conformité.

### 26.7 Postes & fiches de poste

#### Objectif

Gérer le référentiel des postes.

#### Champs

- nom ;
- slug ;
- portée globale ou organisation ;
- statut actif.

#### Procédure

1. Aller dans **Paramètres > Postes & fiches de poste**.
2. Créer ou modifier un poste.
3. Activer ou désactiver selon besoin.

### 26.8 Utilisateurs & droits

#### Objectif

Gérer les comptes, rôles, demandes d'accès, permissions, départements et postes.

#### Onglets

- Utilisateurs ;
- Demandes d'accès ;
- Permissions ;
- Départements ;
- Postes ;
- Super Admin.

#### Actions utilisateur

- activer / désactiver ;
- modifier le profil ;
- changer le rôle ;
- envoyer une réinitialisation de mot de passe ;
- supprimer ;
- configurer les permissions.

#### Règles de changement de rôle

- Ne pas retirer le dernier super administrateur.
- Seul un super administrateur peut approuver ou attribuer certains rôles sensibles.
- Modifier son propre rôle peut entraîner une perte d'accès.

### 26.9 Formations

Voir section [Cours et formations](#11-cours-et-formations).

### 26.10 Offres d'emploi

#### Objectif

Créer et publier les offres d'emploi.

#### Procédure

1. Aller dans **Paramètres > Offres d'emploi**.
2. Créer une offre.
3. Renseigner :
   - titre ;
   - entreprise ;
   - localisation ;
   - type de contrat ;
   - compétences requises ;
   - description ;
   - salaire ;
   - contact candidature ;
   - statut.
4. Publier ou enregistrer en brouillon.

#### Suivi des candidats

- consulter les candidats ;
- vérifier le score de matching ;
- identifier les meilleurs profils ;
- suivre la source de candidature.

### 26.11 Congés (validation)

Voir section [Ressources humaines](#8-ressources-humaines).

### 26.12 Évaluation

Cette rubrique peut être réservée à l'évaluation RH. Selon l'état de déploiement, elle peut être utilisée comme espace préparatoire ou rubrique à compléter.

---

## 27. Annexes : statuts, règles et référentiels

### 27.1 Modules assignables

Modules métier :

- dashboard ;
- projects ;
- goals_okrs ;
- time_tracking ;
- planning ;
- leave_management ;
- finance ;
- comptabilite ;
- knowledge_base ;
- daf_services ;
- courses ;
- jobs ;
- crm_sales ;
- analytics ;
- talent_analytics ;
- rh ;
- trinite ;
- programme ;
- collecte ;
- logistique ;
- parc_auto ;
- ticket_it ;
- messagerie ;
- settings.

Modules d'administration :

- organization_management ;
- department_management ;
- postes_management ;
- user_management ;
- course_management ;
- job_management ;
- leave_management_admin.

### 27.2 Statuts de congé

- pending / en attente ;
- approved / approuvé ;
- rejected / rejeté ;
- cancelled / annulé.

### 27.3 Statuts DAF

- draft ;
- submitted ;
- in_review ;
- awaiting_requester ;
- pending_external_signature ;
- approved ;
- rejected ;
- fulfilled ;
- cancelled.

### 27.4 Statuts Ticket IT

- draft ;
- pending_validation ;
- needs_reformulation ;
- validated ;
- sent_to_it ;
- in_progress ;
- resolved ;
- rejected.

### 27.5 Statuts CRM

- lead ;
- contacted ;
- unreachable ;
- callback_expected ;
- prospect ;
- customer.

### 27.6 Statuts logistique / parc auto

- requested ;
- approved ;
- provided ;
- returned ;
- rejected.

### 27.7 Bonnes pratiques d'administration

1. Toujours créer les départements avant d'attribuer massivement les droits.
2. Limiter les droits de suppression.
3. Ne donner le droit d'approbation qu'aux responsables identifiés.
4. Contrôler régulièrement les comptes inactifs.
5. Vérifier les membres et managers de chaque département.
6. Utiliser les notifications et l'historique pour suivre les actions sensibles.
7. Archiver ou restreindre les documents confidentiels.
8. Tester les accès d'un nouvel utilisateur avant mise en production complète.

### 27.8 Procédure de restitution client recommandée

Pour présenter la plateforme au client :

1. Présenter le tableau de bord et la logique générale.
2. Expliquer les rôles et droits.
3. Montrer la navigation module par module.
4. Démontrer un workflow complet :
   - création d'utilisateur ;
   - affectation département ;
   - création projet ;
   - demande de congé ;
   - ticket IT ;
   - document partagé ;
   - notification et historique.
5. Terminer par les Paramètres et l'administration.

---

## Conclusion

Ce manuel décrit l'utilisation opérationnelle de la plateforme COYA / SENEGEL pour les utilisateurs, managers et administrateurs. Il peut être transformé en document Word ou PDF pour la restitution client, complété par des captures d'écran et adapté aux procédures internes définitives du client.
