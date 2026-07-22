-- Ruang Phase 3 migration: revision control and cloud backups
-- Jalankan pada project Supabase yang sebelumnya memakai schema Phase 2.

-- ============================================================
-- FASE 3: optimistic revision control dan backup cloud
-- Aman dijalankan pada project Phase 2 yang sudah berisi data.
-- ============================================================

alter table public.app_state
  add column if not exists revision bigint not null default 0;

grant select on table public.app_state to authenticated;
revoke insert, update, delete on table public.app_state from authenticated;

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
