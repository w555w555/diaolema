-- 渔见公网群聊。在 Supabase Dashboard → SQL Editor 跑一遍。
-- 匿名可读，登录可写自己的行。不要把 secret key 放到前端。

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at);

alter table public.chat_messages replica identity full;
alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select
  on public.chat_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and room_id in ('room-lure', 'room-ji', 'room-gear', 'room-match')
    and char_length(trim(body)) between 1 and 200
    and char_length(trim(author)) between 1 and 12
  );

grant select on table public.chat_messages to anon, authenticated;
grant insert on table public.chat_messages to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end
$$;
