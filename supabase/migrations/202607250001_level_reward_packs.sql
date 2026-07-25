-- Optional level gate for packs awarded by the Pieceful progression system.
-- Keep is_free=true for these packs: the app verifies the earned level reward
-- before allowing the download.
alter table pieceful.image_packs
  add column if not exists reward_level integer;

alter table pieceful.image_packs
  drop constraint if exists image_packs_reward_level_check;
alter table pieceful.image_packs
  add constraint image_packs_reward_level_check
  check (reward_level is null or reward_level between 2 and 100);

create index if not exists image_packs_reward_level_idx
  on pieceful.image_packs(reward_level)
  where reward_level is not null;
