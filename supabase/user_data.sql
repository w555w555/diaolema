-- 用户资料 / 渔获 / 点赞关注 / 想买 / 评测。SQL Editor 跑一遍。
-- 须已登录才能写入；匿名可读渔获与资料。不要把 secret 放到前端。

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '沪上钓友',
  city text not null default '上海',
  bio text not null default '天气好就出门',
  avatar_url text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.catch_reports (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null,
  fish text not null,
  spot_name text not null,
  lon double precision not null,
  lat double precision not null,
  note text,
  title text,
  source text not null default 'user',
  caught_at timestamptz not null
);

alter table public.catch_reports add column if not exists video_url text;
alter table public.catch_reports add column if not exists image_urls text;

create table if not exists public.share_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id text not null,
  primary key (user_id, report_id)
);

create table if not exists public.share_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  primary key (user_id, author_name)
);

create table if not exists public.wish_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  primary key (user_id, product_id)
);

create table if not exists public.gear_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  gear_name text not null,
  author text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.spot_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id text not null,
  author text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.catch_reports enable row level security;
alter table public.share_likes enable row level security;
alter table public.share_follows enable row level security;
alter table public.wish_items enable row level security;
alter table public.gear_reviews enable row level security;
alter table public.spot_reviews enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists catch_select on public.catch_reports;
create policy catch_select on public.catch_reports for select to anon, authenticated using (true);
drop policy if exists catch_insert on public.catch_reports;
create policy catch_insert on public.catch_reports for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists catch_update on public.catch_reports;
create policy catch_update on public.catch_reports for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists catch_delete on public.catch_reports;
create policy catch_delete on public.catch_reports for delete to authenticated using (auth.uid() = user_id);

drop policy if exists likes_own on public.share_likes;
create policy likes_own on public.share_likes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists follows_own on public.share_follows;
create policy follows_own on public.share_follows for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists wish_own on public.wish_items;
create policy wish_own on public.wish_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists gear_select on public.gear_reviews;
create policy gear_select on public.gear_reviews for select to anon, authenticated using (true);
drop policy if exists gear_insert on public.gear_reviews;
create policy gear_insert on public.gear_reviews for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists gear_update on public.gear_reviews;
create policy gear_update on public.gear_reviews for update to authenticated using (auth.uid() = user_id);

drop policy if exists spot_select on public.spot_reviews;
create policy spot_select on public.spot_reviews for select to anon, authenticated using (true);
drop policy if exists spot_insert on public.spot_reviews;
create policy spot_insert on public.spot_reviews for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists spot_update on public.spot_reviews;
create policy spot_update on public.spot_reviews for update to authenticated using (auth.uid() = user_id);

grant select on table public.profiles, public.catch_reports, public.gear_reviews, public.spot_reviews to anon, authenticated;
create table if not exists public.venue_favs (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id text not null,
  primary key (user_id, venue_id)
);

alter table public.venue_favs enable row level security;
drop policy if exists venue_fav_own on public.venue_favs;
create policy venue_fav_own on public.venue_favs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.share_likes, public.share_follows, public.wish_items, public.venue_favs to authenticated;
grant insert, update, delete on table public.profiles, public.catch_reports, public.gear_reviews, public.spot_reviews to authenticated;
