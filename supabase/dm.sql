create table if not exists public.dm_allows (
  user_id uuid not null references auth.users (id) on delete cascade,
  peer_key text not null,
  allowed boolean not null default false,
  primary key (user_id, peer_key)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  sender_id uuid not null references auth.users (id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, created_at);

alter table public.dm_allows enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists dm_allows_own on public.dm_allows;
create policy dm_allows_own on public.dm_allows
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists dm_messages_select on public.dm_messages;
create policy dm_messages_select on public.dm_messages
  for select to authenticated
  using (thread_id like ('dm:' || auth.uid()::text || ':%'));

drop policy if exists dm_messages_insert on public.dm_messages;
create policy dm_messages_insert on public.dm_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and thread_id like ('dm:' || auth.uid()::text || ':%')
    and char_length(trim(body)) between 1 and 200
  );

grant select, insert, update, delete on table public.dm_allows to authenticated;
grant select, insert on table public.dm_messages to authenticated;

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
