-- RLS smoke test. Run against the project (SQL editor or MCP execute_sql) after
-- every migration. It creates throwaway users/discs, checks what anon, a signed-in
-- stranger and the owner can do, then ROLLS EVERYTHING BACK by raising at the end.
-- Expected result: ERROR "ALL_TESTS_PASSED (rolled back)". Any "FAIL ..." is a leak.
do $$
declare
  owner_id uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  n int; ok boolean;
begin
  insert into auth.users (id, email, aud, role) values
    (owner_id, 'owner@test.invalid', 'authenticated', 'authenticated'),
    (stranger, 'stranger@test.invalid', 'authenticated', 'authenticated');
  insert into public.owner (user_id) values (owner_id)
    on conflict (singleton) do update set user_id = excluded.user_id;
  insert into public.discs (owner_id, title, status, is_public) values
    (owner_id, 'showcased', 'shipped', true),
    (owner_id, 'shipped-hidden', 'shipped', false),
    (owner_id, 'wip-public', 'in_progress', true);

  -- anon: sees only showcased, cannot write, cannot read owner table
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.discs where title in ('showcased','shipped-hidden','wip-public');
  if n <> 1 then raise exception 'FAIL anon sees % test discs', n; end if;
  ok := false; begin insert into public.discs (title) values ('x'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL anon inserted'; end if;
  ok := false; begin perform 1 from public.owner; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL anon read owner table'; end if;

  -- signed-in stranger: same as anon, plus cannot touch storage
  execute 'reset role'; execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  select count(*) into n from public.discs where title in ('showcased','shipped-hidden','wip-public');
  if n <> 1 then raise exception 'FAIL stranger sees % test discs', n; end if;
  ok := false; begin insert into public.discs (title) values ('x'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL stranger inserted'; end if;
  update public.discs set title = 'hacked'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL stranger updated % rows', n; end if;
  delete from public.discs; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL stranger deleted % rows', n; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('covers', gen_random_uuid() || '.webp'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL stranger uploaded a cover'; end if;

  -- owner: sees all, can write discs and covers; bad URLs rejected
  execute 'reset role'; execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  select count(*) into n from public.discs where title in ('showcased','shipped-hidden','wip-public');
  if n <> 3 then raise exception 'FAIL owner sees % test discs', n; end if;
  insert into public.discs (title) values ('owner-new');
  insert into storage.objects (bucket_id, name, owner_id) values ('covers', gen_random_uuid() || '.webp', owner_id::text);
  ok := false; begin insert into public.discs (title, url) values ('bad', 'javascript:alert(1)'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL javascript: url accepted'; end if;

  raise exception 'ALL_TESTS_PASSED (rolled back)';
end $$;
