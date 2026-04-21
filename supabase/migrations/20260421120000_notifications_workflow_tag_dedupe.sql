-- Notifications générées par le cycle workflow : tag + anti-doublon côté base
-- (utile quand VITE_PERSIST_WORKFLOW_NOTIFICATIONS=true)

begin;

-- Index unique partiel : un même eventId workflow ne peut être inséré qu'une fois par destinataire (profiles.id).
create unique index if not exists idx_notifications_workflow_user_event
  on public.notifications (user_id, ((metadata ->> 'eventId')))
  where module = 'workflow'
    and action = 'automate'
    and (metadata ? 'eventId')
    and length(trim(metadata ->> 'eventId')) > 0;

commit;
