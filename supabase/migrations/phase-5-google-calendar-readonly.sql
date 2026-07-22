-- Ruang Phase 5A — Google Calendar read-only
-- Jalankan setelah schema/migration fase sebelumnya.

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_account_email text,
  refresh_token_ciphertext text not null,
  granted_scopes text[] not null default '{}',
  calendar_list_sync_token text,
  connection_status text not null default 'connected'
    check (connection_status in ('connected','reauthorization_required','error')),
  sync_error text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  return_to text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists google_calendar_oauth_states_expiry_idx
  on public.google_calendar_oauth_states(expires_at);

create table if not exists public.google_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.google_calendar_connections(user_id) on delete cascade,
  google_calendar_id text not null,
  summary text not null,
  description text,
  time_zone text,
  background_color text,
  foreground_color text,
  access_role text,
  is_primary boolean not null default false,
  is_visible boolean not null default true,
  sync_token text,
  last_synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_calendar_id)
);

create table if not exists public.google_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.google_calendars(id) on delete cascade,
  google_event_id text not null,
  title text not null default 'Tanpa judul',
  description text,
  location text,
  html_link text,
  conference_link text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  status text not null default 'confirmed',
  organizer_email text,
  attendees_count integer not null default 0,
  recurring_event_id text,
  original_start_at timestamptz,
  updated_at_google timestamptz,
  etag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, calendar_id, google_event_id)
);

create index if not exists google_calendars_user_visible_idx
  on public.google_calendars(user_id, is_visible)
  where deleted_at is null;

create index if not exists google_calendar_events_user_start_idx
  on public.google_calendar_events(user_id, start_at);

create index if not exists google_calendar_events_calendar_start_idx
  on public.google_calendar_events(calendar_id, start_at);

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
alter table public.google_calendars enable row level security;
alter table public.google_calendar_events enable row level security;

-- Token dan OAuth state hanya boleh disentuh Edge Functions dengan secret/service key.
revoke all on table public.google_calendar_connections from anon, authenticated;
revoke all on table public.google_calendar_oauth_states from anon, authenticated;

-- Metadata kalender dan event dapat dibaca oleh pemilik akun.
do $$
begin
  begin
    create policy google_calendars_owner_select
      on public.google_calendars for select
      using (auth.uid() = user_id);
  exception when duplicate_object then null;
  end;

  begin
    create policy google_calendars_owner_visibility
      on public.google_calendars for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  exception when duplicate_object then null;
  end;

  begin
    create policy google_calendar_events_owner_select
      on public.google_calendar_events for select
      using (auth.uid() = user_id);
  exception when duplicate_object then null;
  end;
end $$;

grant select on table public.google_calendars to authenticated;
grant update (is_visible) on table public.google_calendars to authenticated;
grant select on table public.google_calendar_events to authenticated;

-- Hapus OAuth state kedaluwarsa ketika migration dijalankan ulang.
delete from public.google_calendar_oauth_states where expires_at < now();
