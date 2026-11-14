-- Let the admin UI ask "am I the owner?" without exposing anything else:
-- a signed-in user can read the owner row only if it is their own.
-- Anyone else (anon, other accounts) still gets zero rows.
grant select on table public.owner to authenticated;

create policy "Owner can read their own owner row"
on public.owner for select
to authenticated
using (user_id = (select auth.uid()));
