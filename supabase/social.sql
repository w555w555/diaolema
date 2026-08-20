-- 渔获评论、群聊语音字段、关注列表可读以便统计粉丝。
-- 在 SQL Editor 跑一遍。已有 chat_messages / share_follows 时用 ALTER，可重复执行。

create table if not exists public.share_comments (
  id uuid primary key default gen_random_uuid(),
  report_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists share_comments_report_idx on public.share_comments (report_id, created_at);

alter table public.share_comments enable row level security;

drop policy if exists share_comments_select on public.share_comments;
create policy share_comments_select
  on public.share_comments for select to anon, authenticated using (true);

drop policy if exists share_comments_insert on public.share_comments;
create policy share_comments_insert
  on public.share_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and char_length(trim(body)) between 1 and 120
    and char_length(trim(author)) between 1 and 12
  );

grant select on table public.share_comments to anon, authenticated;
grant insert on table public.share_comments to authenticated;

alter table public.chat_messages add column if not exists kind text not null default 'text';
alter table public.chat_messages add column if not exists duration_ms integer;
alter table public.chat_messages add column if not exists media_url text;

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and room_id in ('room-lure', 'room-ji', 'room-gear', 'room-match')
    and char_length(trim(author)) between 1 and 12
    and char_length(trim(body)) between 1 and 200
    and kind in ('text', 'voice', 'sticker', 'share', 'image', 'video')
  );

drop policy if exists follows_select_public on public.share_follows;
create policy follows_select_public
  on public.share_follows for select to authenticated using (true);

grant select on table public.share_follows to authenticated;

create table if not exists public.user_blocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, author_name)
);

alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select
  on public.user_blocks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_blocks_write on public.user_blocks;
create policy user_blocks_write
  on public.user_blocks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and char_length(trim(author_name)) between 1 and 12);

grant select, insert, update, delete on table public.user_blocks to authenticated;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_reports_user_idx on public.user_reports (user_id, created_at);

alter table public.user_reports enable row level security;

drop policy if exists user_reports_select on public.user_reports;
create policy user_reports_select
  on public.user_reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_reports_insert on public.user_reports;
create policy user_reports_insert
  on public.user_reports for insert to authenticated
  with check (
    auth.uid() = user_id
    and char_length(trim(author_name)) between 1 and 12
    and reason in ('spam', 'abuse', 'fake', 'other')
  );

grant select, insert on table public.user_reports to authenticated;

do $$
begin
  if to_regclass('public.catch_reports') is not null then
    alter table public.catch_reports add column if not exists video_url text;
    alter table public.catch_reports add column if not exists image_urls text;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.chat_messages') is not null then
    alter table public.chat_messages add column if not exists reply_to_id text;
    alter table public.chat_messages add column if not exists reply_author text;
    alter table public.chat_messages add column if not exists reply_preview text;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.dm_messages') is not null then
    alter table public.dm_messages add column if not exists kind text not null default 'text';
    alter table public.dm_messages add column if not exists duration_ms integer;
    alter table public.dm_messages add column if not exists media_url text;
    alter table public.dm_messages add column if not exists reply_to_id text;
    alter table public.dm_messages add column if not exists reply_author text;
    alter table public.dm_messages add column if not exists reply_preview text;
  end if;
end
$$;

-- 短视频公开桶。登录用户只能写自己目录；任何人可读。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yj-media',
  'yj-media',
  true,
  8388608,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists yj_media_select on storage.objects;
create policy yj_media_select
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'yj-media');

drop policy if exists yj_media_insert on storage.objects;
create policy yj_media_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'yj-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists yj_media_update on storage.objects;
create policy yj_media_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'yj-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'yj-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists dm_messages_select on public.dm_messages;
create policy dm_messages_select on public.dm_messages
  for select to authenticated
  using (
    thread_id like ('dm:' || auth.uid()::text || ':%')
    or thread_id like ('dm:%:' || auth.uid()::text)
  );

do $$
begin
  if to_regclass('public.dm_messages') is null then
    return;
  end if;
  execute 'alter table public.dm_messages replica identity full';
  begin
    execute 'alter publication supabase_realtime add table public.dm_messages';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;
