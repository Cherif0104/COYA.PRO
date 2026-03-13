# Spec – Extractions J+7 (présence)

**Phase 4 Bloc 1.3** – Rapports automatiques présence (retards, dépassements pause, heures sup).

## Objectif

Générer chaque semaine (ou à J+7) des extractions par organisation pour :
- **Retards** : dépassement du seuil (ex. 15 min) par utilisateur/jour
- **Dépassements de pause** : pause > durée max (ex. 60 min) par utilisateur/jour
- **Heures sup** : dépassement des heures hebdo/jour (ex. 44 h/semaine, 10 h/jour)
- **Résumé hebdo** : synthèse par utilisateur et par département

## Stockage

- Table Supabase : `presence_reports`
- Champs : `organization_id`, `report_type` (`delays` | `pause_excess` | `overtime` | `weekly_summary`), `period_start`, `period_end`, `generated_at`, `format` (csv | pdf), `file_path` (optionnel), `payload` (jsonb), `created_at`

## Format des rapports

- **CSV** : colonnes selon le type (user_id, user_name, date, delay_minutes | pause_excess_minutes | overtime_minutes ; ou agrégats par département). Fichier stocké en Storage Supabase ou contenu en base.
- **PDF** : génération côté Edge/backend à partir des mêmes données ; stockage du chemin dans `file_path`.

## Destinataires

- **Par défaut** : administrateurs de l’organisation (rôle `super_administrator`, `administrator`) et responsables RH / département selon paramétrage.
- Envoi optionnel par email (liste configurable par organisation) ou simple mise à disposition dans la plateforme (liste des rapports dans Paramètres / RH).

## Déclenchement

- **Cron** : Supabase pg_cron ou Edge Function schedulée (ex. chaque lundi 8h pour la semaine précédente).
- **Période** : `period_start` / `period_end` = dernière semaine complète (lundi–dimanche ou lundi–vendredi selon règle métier).

## Implémentation future

- Edge Function ou job backend : lire `presence_sessions` + `time_logs` sur la période, appliquer `PresencePolicy` (seuils), produire CSV/PDF, insérer une ligne dans `presence_reports` et optionnellement envoyer par email.
