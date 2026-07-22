-- Ruang — Supabase schema Phase 3
-- Jalankan satu kali melalui Supabase SQL Editor setelah membuat project dan mengaktifkan Auth.
-- Aplikasi Phase 3 memakai public.app_state untuk sinkronisasi snapshot local-first.
-- Tabel terstruktur di bawah disiapkan untuk migrasi analitik pada fase berikutnya.

create extension if not exists pgcrypto;


create table if not exists public.app_state (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 0
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#005BAC',
  status text not null default 'active' check (status in ('active','paused','done')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  series_id uuid,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','waiting','done')),
  priority smallint not null default 2 check (priority between 1 and 4),
  due_at timestamptz,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes >= 0),
  labels text[] not null default '{}',
  recurrence jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  metric text not null check (metric in ('boolean','count','duration')),
  target_value numeric not null default 1,
  unit text not null default 'selesai',
  target_per_week integer not null default 1,
  days_of_week smallint[] not null default '{1,2,3,4,5}',
  reminder_time time,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create table if not exists public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prayer_date date not null,
  prayer text not null check (prayer in ('Subuh','Dzuhur','Ashar','Maghrib','Isya')),
  status text not null default 'belum' check (status in ('belum','selesai','tepat-waktu','berjamaah')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, prayer_date, prayer)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  content text not null default '',
  type text not null default 'note' check (type in ('note','decision','idea')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash','bank','ewallet')),
  opening_balance numeric(18,2) not null default 0,
  color text not null default '#005BAC',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(18,2) not null check (amount > 0),
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category text not null,
  note text not null default '',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfer_destination_required check (
    (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
    or (type <> 'transfer' and to_account_id is null)
  )
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  month date not null,
  amount_limit numeric(18,2) not null check (amount_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month)
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  wins text not null default '',
  obstacles text not null default '',
  stop_doing text not null default '',
  next_focus text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists tasks_user_due_idx on public.tasks(user_id, due_at);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, log_date desc);

alter table public.app_state enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.prayer_logs enable row level security;
alter table public.notes enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.weekly_reviews enable row level security;

-- Satu policy generik per tabel: pengguna hanya dapat mengakses baris miliknya.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_state','projects','tasks','subtasks','habits','habit_logs','prayer_logs',
    'notes','accounts','transactions','budgets','weekly_reviews'
  ] loop
    begin
      execute format(
        'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        table_name || '_owner_access', table_name
      );
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;


-- Hak akses Data API. RLS tetap menjadi pembatas utama per pengguna.
grant usage on schema public to authenticated;
grant select on table public.app_state to authenticated;
revoke insert, update, delete on table public.app_state from authenticated;

-- Menjaga user_id selalu berasal dari sesi, bukan nilai bebas dari client.
create or replace function public.enforce_app_state_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.user_id := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_state_owner_before_write on public.app_state;
create trigger app_state_owner_before_write
before insert or update on public.app_state
for each row execute function public.enforce_app_state_owner();


-- ============================================================
-- FASE 3: optimistic revision control dan backup cloud
-- Aman dijalankan pada project Phase 2 yang sudah berisi data.
-- ============================================================

alter table public.app_state
  add column if not exists revision bigint not null default 0;

create table if not exists public.app_state_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  revision bigint not null,
  data jsonb not null,
  reason text not null default 'Backup otomatis',
  created_at timestamptz not null default now()
);

create index if not exists app_state_backups_user_created_idx
  on public.app_state_backups(user_id, created_at desc);

alter table public.app_state_backups enable row level security;

do $$
begin
  begin
    create policy app_state_backups_owner_access
      on public.app_state_backups
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  exception when duplicate_object then
    null;
  end;
end $$;

grant select on table public.app_state_backups to authenticated;
revoke insert, update, delete on table public.app_state_backups from authenticated;

-- Menyimpan snapshot dengan optimistic concurrency control.
-- Jika expected revision tidak sama dengan revision cloud, data tidak ditimpa
-- dan function mengembalikan versi cloud sebagai konflik.
create or replace function public.save_app_state_v2(
  p_data jsonb,
  p_expected_revision bigint,
  p_backup_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_state public.app_state%rowtype;
  next_revision bigint;
  saved_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(p_data) <> 'object'
     or jsonb_typeof(p_data -> 'tasks') <> 'array'
     or jsonb_typeof(p_data -> 'projects') <> 'array'
     or jsonb_typeof(p_data -> 'habits') <> 'array'
     or jsonb_typeof(p_data -> 'prayers') <> 'array'
     or jsonb_typeof(p_data -> 'notes') <> 'array'
     or jsonb_typeof(p_data -> 'accounts') <> 'array'
     or jsonb_typeof(p_data -> 'transactions') <> 'array'
     or jsonb_typeof(p_data -> 'budgets') <> 'array'
     or jsonb_typeof(p_data -> 'reviews') <> 'array' then
    raise exception 'Invalid Ruang AppData payload';
  end if;

  select *
    into current_state
    from public.app_state
   where user_id = auth.uid()
   for update;

  if not found then
    if coalesce(p_expected_revision, 0) <> 0 then
      raise exception 'Cloud state no longer exists; refresh before saving';
    end if;

    insert into public.app_state (user_id, data, revision, created_at, updated_at)
    values (auth.uid(), p_data, 1, saved_at, saved_at);

    return jsonb_build_object(
      'status', 'saved',
      'revision', 1,
      'updated_at', saved_at
    );
  end if;

  if current_state.revision <> coalesce(p_expected_revision, 0) then
    return jsonb_build_object(
      'status', 'conflict',
      'revision', current_state.revision,
      'updated_at', current_state.updated_at,
      'data', current_state.data
    );
  end if;

  -- Maksimal satu backup otomatis per 24 jam. Backup eksplisit selalu dibuat.
  if p_backup_reason is not null or not exists (
    select 1
      from public.app_state_backups
     where user_id = auth.uid()
       and created_at >= now() - interval '24 hours'
  ) then
    insert into public.app_state_backups (user_id, revision, data, reason)
    values (
      auth.uid(),
      current_state.revision,
      current_state.data,
      coalesce(nullif(trim(p_backup_reason), ''), 'Backup otomatis harian')
    );
  end if;

  next_revision := current_state.revision + 1;

  update public.app_state
     set data = p_data,
         revision = next_revision,
         updated_at = saved_at
   where user_id = auth.uid()
   returning updated_at into saved_at;

  -- Simpan maksimum 20 backup cloud terbaru per pengguna.
  delete from public.app_state_backups
   where user_id = auth.uid()
     and id in (
       select id
         from public.app_state_backups
        where user_id = auth.uid()
        order by created_at desc
        offset 20
     );

  return jsonb_build_object(
    'status', 'saved',
    'revision', next_revision,
    'updated_at', saved_at
  );
end;
$$;

revoke all on function public.save_app_state_v2(jsonb, bigint, text) from public;
grant execute on function public.save_app_state_v2(jsonb, bigint, text) to authenticated;
