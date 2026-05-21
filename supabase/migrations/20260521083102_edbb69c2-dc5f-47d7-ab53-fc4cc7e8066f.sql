
-- Internal helpers: no API access
revoke execute on function public._move_coins(uuid, bigint, tx_kind, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public._begin_wheel(uuid) from public, anon, authenticated;
revoke execute on function public._finalize_wheel(uuid) from public, anon, authenticated;
revoke execute on function public._abort_wheel(uuid, text) from public, anon, authenticated;

-- Public RPCs: authenticated only
do $$
declare fn text;
begin
  foreach fn in array array[
    'has_role(uuid, app_role)',
    'handle_new_user()',
    'create_wheel()',
    'join_wheel(uuid)',
    'start_wheel(uuid)',
    'tick_wheels()',
    'update_config(bigint, int, int, int, int, int, int)',
    'claim_admin_if_first()',
    'promote_to_admin(uuid)',
    'grant_coins(uuid, bigint)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end$$;
