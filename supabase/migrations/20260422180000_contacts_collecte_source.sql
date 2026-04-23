-- Liaison Collecte ↔ CRM : métadonnées d’origine sur les contacts + colonnes usuelles si schéma minimal.
begin;

alter table public.contacts add column if not exists source text;
alter table public.contacts add column if not exists source_collection_id text;
alter table public.contacts add column if not exists source_submission_id text;
alter table public.contacts add column if not exists organization_id uuid;
alter table public.contacts add column if not exists tags jsonb;
alter table public.contacts add column if not exists created_by_name text;
alter table public.contacts add column if not exists notes text;
alter table public.contacts add column if not exists category_id uuid;
alter table public.contacts add column if not exists position text;

create index if not exists contacts_source_collection_id_idx
  on public.contacts (source_collection_id)
  where source_collection_id is not null;

commit;
