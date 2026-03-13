-- Étendre les statuts de présence (sélecteur post-login COYA.PRO)
-- Valeurs existantes conservées : online, pause, in_meeting
-- Nouvelles valeurs : present, absent, pause_coffee, pause_lunch, away_mission, brief_team, technical_issue

ALTER TABLE public.presence_sessions
  DROP CONSTRAINT IF EXISTS presence_sessions_status_check;

ALTER TABLE public.presence_sessions
  ADD CONSTRAINT presence_sessions_status_check
  CHECK (status IN (
    'online', 'pause', 'in_meeting',
    'present', 'absent', 'pause_coffee', 'pause_lunch',
    'away_mission', 'brief_team', 'technical_issue'
  ));
