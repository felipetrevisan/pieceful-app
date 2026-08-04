-- Object mutations go through the validation API, including exact-path deletion.
drop policy if exists "Players delete own puzzle images" on storage.objects;

create or replace function pieceful.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function pieceful.delete_my_account() from public, anon;
grant execute on function pieceful.delete_my_account() to authenticated;
