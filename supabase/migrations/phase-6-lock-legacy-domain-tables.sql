-- Ruang 0.6.0: app_state adalah satu-satunya source of truth aplikasi.
-- Tabel domain lama belum dipakai client dan sengaja dikunci sampai migrasi
-- per-item mempunyai foreign key komposit (user_id, id) yang lengkap.

revoke all on table
  public.projects,
  public.tasks,
  public.subtasks,
  public.habits,
  public.habit_logs,
  public.prayer_logs,
  public.notes,
  public.accounts,
  public.transactions,
  public.budgets,
  public.weekly_reviews
from anon, authenticated;

comment on table public.app_state is
  'Source of truth Ruang 0.5.x. Domain tables are reserved for a future per-item migration.';
