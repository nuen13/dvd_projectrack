-- ProjectRack initial schema.
-- Security model (ADR-0001..0004): the browser talks to Supabase directly, so
-- these policies ARE the security boundary. Deny by default; open only what is needed.

-------------------------------------------------------------------------------
-- Owner: exactly one row holding the owner's auth user id (ADR-0003).
-- Not exposed through the API at all; read only via is_owner().
-------------------------------------------------------------------------------
create table public.owner (
  singleton boolean primary key default true check (singleton),
  user_id   uuid not null unique references auth.users (id) on delete cascade
);

alter table public.owner enable row level security;
revoke all on table public.owner from anon, authenticated;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.owner o where o.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

-------------------------------------------------------------------------------
-- Discs
-------------------------------------------------------------------------------
create type public.disc_status as enum (
  'idea', 'planned', 'in_progress', 'shipped', 'paused', 'archived'
);

create table public.discs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- details
  title       text not null check (char_length(btrim(title)) between 1 and 60),
  spine_text  text check (char_length(spine_text) <= 24),
  kind        text check (char_length(kind) <= 30),          -- type / platform
  made_for    text check (char_length(made_for) <= 30),
  description text check (char_length(description) <= 900),
  tags        text[] not null default '{}' check (cardinality(tags) <= 20),
  url         text check (url ~* '^https?://[^\s]+$' and char_length(url) <= 400),

  -- lifecycle & visibility (ADR-0002)
  status      public.disc_status not null default 'idea',
  is_public   boolean not null default false,
  cover_tag   text check (char_length(cover_tag) <= 20),
  shipped_on  date,
  position    integer not null default 0,

  -- look (ADR-0006: width and gap are derived, not stored)
  cover_bg    text not null default '#3b3b3b' check (cover_bg ~* '^#[0-9a-f]{6}$'),
  cover_fg    text not null default '#ebe6d8' check (cover_fg ~* '^#[0-9a-f]{6}$'),
  pattern     text not null default 'dots' check (pattern in (
                'rings','checks','grid','bubbles','candles','chart',
                'lock','brackets','dots','nodes','stripes','none')),
  spine_wide  boolean not null default false,
  thickness   integer not null default 34 check (thickness between 16 and 64),
  height      integer not null default 340 check (height between 280 and 392),
  image_path  text check (image_path ~ '^[0-9a-f-]{36}\.webp$'),
  image_mode  text not null default 'art' check (image_mode in ('art', 'full')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index discs_position_idx on public.discs (position);
create index discs_owner_id_idx on public.discs (owner_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger discs_touch_updated_at
before update on public.discs
for each row execute function public.touch_updated_at();

-- RLS ------------------------------------------------------------------------
alter table public.discs enable row level security;

-- Visitors (and the owner) see showcased discs; the owner also sees everything else.
create policy "Showcased discs are readable by everyone; owner reads all"
on public.discs for select
to anon, authenticated
using (
  (status = 'shipped' and is_public)
  or (select public.is_owner())
);

create policy "Only the owner can insert discs"
on public.discs for insert
to authenticated
with check ((select public.is_owner()) and owner_id = (select auth.uid()));

create policy "Only the owner can update discs"
on public.discs for update
to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()) and owner_id = (select auth.uid()));

create policy "Only the owner can delete discs"
on public.discs for delete
to authenticated
using ((select public.is_owner()));

-- Defence in depth: anon can never write, whatever the policies say.
revoke insert, update, delete, truncate on table public.discs from anon;

-------------------------------------------------------------------------------
-- Covers bucket (ADR-0004): public read via public URLs, owner-only writes.
-- SELECT on storage.objects is owner-only (Storage needs it for update/delete),
-- so visitors cannot LIST the bucket; files are reachable only by exact UUID URL.
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/webp']);

create policy "Owner can list covers"
on storage.objects for select
to authenticated
using (bucket_id = 'covers' and (select public.is_owner()));

create policy "Owner can upload covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'covers' and (select public.is_owner()));

create policy "Owner can update covers"
on storage.objects for update
to authenticated
using (bucket_id = 'covers' and (select public.is_owner()))
with check (bucket_id = 'covers' and (select public.is_owner()));

create policy "Owner can delete covers"
on storage.objects for delete
to authenticated
using (bucket_id = 'covers' and (select public.is_owner()));
