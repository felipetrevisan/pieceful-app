-- Personal puzzle photos are private and can only be read by their owner.
update storage.buckets set public = false where id = 'puzzle-images';

drop policy if exists "Public puzzle image access" on storage.objects;
drop policy if exists "Players read own puzzle images" on storage.objects;
drop policy if exists "Players delete own puzzle images" on storage.objects;

create policy "Players read own puzzle images"
on storage.objects for select to authenticated
using (bucket_id = 'puzzle-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Players delete own puzzle images"
on storage.objects for delete to authenticated
using (bucket_id in ('puzzle-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

-- Called only by the signed-in user. Cascades remove Pieceful schema rows;
-- storage objects are removed explicitly because they do not reference auth.users.
create or replace function pieceful.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from storage.objects
  where bucket_id in ('puzzle-images', 'avatars')
    and (storage.foldername(name))[1] = current_user_id::text;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function pieceful.delete_my_account() from public, anon;
grant execute on function pieceful.delete_my_account() to authenticated;
