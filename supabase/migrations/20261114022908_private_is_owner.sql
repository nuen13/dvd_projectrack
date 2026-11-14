-- Security advisor 0028/0029: is_owner() was callable as /rest/v1/rpc/is_owner.
-- Move it into a schema PostgREST does not expose. Policies reference the
-- function by OID, so they keep working unchanged.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.is_owner() set schema private;

comment on table public.owner is
  'Single row: the owner''s auth user id. Intentionally has RLS with NO policies, so it is unreachable via the API; read only through private.is_owner().';
