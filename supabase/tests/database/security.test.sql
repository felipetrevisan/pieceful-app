begin;

select plan(26);

select ok(has_schema_privilege('authenticated', 'pieceful', 'usage'), 'authenticated can use the API schema');
select ok(not has_table_privilege('authenticated', 'pieceful.profiles', 'insert'), 'profiles cannot be inserted directly');
select ok(not has_table_privilege('authenticated', 'pieceful.profiles', 'update'), 'profiles cannot be updated directly');
select ok(not has_table_privilege('authenticated', 'pieceful.profiles', 'delete'), 'profiles cannot be deleted directly');
select ok(not has_table_privilege('authenticated', 'pieceful.puzzles', 'insert'), 'puzzles cannot be inserted directly');
select ok(not has_table_privilege('authenticated', 'pieceful.puzzles', 'update'), 'puzzles cannot be updated directly');
select ok(not has_table_privilege('authenticated', 'pieceful.puzzles', 'delete'), 'puzzles cannot be deleted directly');
select ok(not has_table_privilege('authenticated', 'pieceful.user_achievements', 'insert'), 'achievements are server-owned');
select ok(not has_table_privilege('authenticated', 'pieceful.friendships', 'insert'), 'friendships use RPCs');
select ok(not has_column_privilege('authenticated', 'pieceful.profiles', 'friend_code', 'select'), 'friend codes are not bulk-readable');
select ok(has_column_privilege('authenticated', 'pieceful.profiles', 'display_name', 'select'), 'safe profile fields remain readable');
select ok(has_function_privilege('authenticated', 'pieceful.sync_my_puzzles(jsonb)', 'execute'), 'authenticated can sync through validated RPC');
select ok(has_function_privilege('authenticated', 'pieceful.delete_my_puzzles(text[])', 'execute'), 'authenticated can delete through scoped RPC');
select ok(not has_function_privilege('anon', 'pieceful.sync_my_puzzles(jsonb)', 'execute'), 'anonymous cannot sync puzzles');
select ok(has_function_privilege('authenticated', 'pieceful.update_my_profile(text,text,text)', 'execute'), 'profile mutation RPC is available');
select ok(has_function_privilege('authenticated', 'pieceful.delete_my_account()', 'execute'), 'account deletion remains user-scoped');
select ok(not has_function_privilege('anon', 'pieceful.search_players(text)', 'execute'), 'anonymous cannot search players');
select ok((select relrowsecurity from pg_class where oid = 'pieceful.profiles'::regclass), 'profile RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'pieceful.puzzles'::regclass), 'puzzle RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'pieceful.purchase_entitlements'::regclass), 'entitlement RLS is enabled');
select ok(not has_table_privilege('authenticated', 'pieceful.admin_sessions', 'select'), 'admin sessions are service-only');
select ok(not has_table_privilege('authenticated', 'pieceful.api_rate_limits', 'select'), 'API rate-limit state is service-only');
select ok((select not public from storage.buckets where id = 'image-packs'), 'paid image pack bucket is private');
select ok(not exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname in ('Players upload own avatar', 'Players update own avatar',
      'Players upload own puzzle images', 'Players update own puzzle images')
), 'mobile clients cannot upload directly to Storage');
select ok(not exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Players delete own puzzle images'
), 'mobile clients cannot delete Storage objects directly');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'pieceful.pack_images'::regclass
    and conname = 'pack_images_content_sha256_format'
), 'pack content digests are constrained');

select * from finish();
rollback;
