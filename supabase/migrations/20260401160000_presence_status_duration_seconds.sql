-- Durée fine des segments de statut (secondes) pour le pointage / historique RH
begin;

alter table if exists public.presence_status_events
  add column if not exists duration_seconds integer;

update public.presence_status_events
set duration_seconds = greatest(0, coalesce(duration_minutes, 0) * 60)
where duration_seconds is null and duration_minutes is not null;

commit;
