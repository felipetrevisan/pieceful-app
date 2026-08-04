-- Enforce MIME and per-object size limits before Storage accepts uploads.
update storage.buckets
set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/webp']
where id = 'avatars';

update storage.buckets
set
  file_size_limit = 15 * 1024 * 1024,
  allowed_mime_types = array['image/webp']
where id = 'puzzle-images';

update storage.buckets
set
  public = false,
  file_size_limit = 15 * 1024 * 1024,
  allowed_mime_types = array['image/webp']
where id = 'image-packs';

-- Direct uploads are replaced by server-side validation and re-encoding.
drop policy if exists "Players upload own avatar" on storage.objects;
drop policy if exists "Players update own avatar" on storage.objects;
drop policy if exists "Players upload own puzzle images" on storage.objects;
drop policy if exists "Players update own puzzle images" on storage.objects;

create or replace function pieceful.update_my_profile(
  next_display_name text,
  next_avatar_url text,
  next_bio text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_prefix text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if next_display_name is null or char_length(trim(next_display_name)) not between 1 and 40 then
    raise exception 'invalid_display_name';
  end if;
  if char_length(coalesce(next_bio, '')) > 120 then raise exception 'invalid_bio'; end if;

  expected_prefix := '/storage/v1/object/public/avatars/' || auth.uid()::text || '/';
  if next_avatar_url is not null and (
    char_length(next_avatar_url) > 1000
    or position(expected_prefix in next_avatar_url) = 0
    or next_avatar_url like '%..%'
  ) then raise exception 'invalid_avatar_url'; end if;

  update pieceful.profiles
  set display_name = trim(next_display_name), avatar_url = next_avatar_url,
      bio = coalesce(next_bio, ''), updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function pieceful.update_my_profile(text, text, text) from public, anon;
grant execute on function pieceful.update_my_profile(text, text, text) to authenticated;
