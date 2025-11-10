-- Migration pour ajouter les champs de réunion virtuelle à la table meetings
-- Date: 2025-10-31
-- Description: Ajoute les champs meeting_url, access_code et meeting_platform pour les réunions virtuelles

ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS meeting_url TEXT,
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS meeting_platform TEXT;

COMMENT ON COLUMN public.meetings.meeting_url IS 'URL de la réunion virtuelle (Google Meet, Teams, Zoom, etc.)';
COMMENT ON COLUMN public.meetings.access_code IS 'Code d''accès PIN ou mot de passe pour rejoindre la réunion';
COMMENT ON COLUMN public.meetings.meeting_platform IS 'Plateforme utilisée: google_meet, microsoft_teams, zoom, other';

