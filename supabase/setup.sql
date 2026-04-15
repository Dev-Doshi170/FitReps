-- FitReps — run this entire file in the Supabase Dashboard: SQL Editor → New query → Paste → Run
-- Order: extensions → table → index → RLS → policies → grants
-- Requires: Email auth enabled (auth.users) so sign-in works and user_id references resolve.
--
-- After this file, apply normalized workout catalog DDL + seed data:
--   1) supabase/workout_plans_schema.sql
--   2) supabase/workout_plan_seed.sql
--   3) supabase/migrations/*.sql (e.g. workout_logs.rpe, plan_day_id)
-- Regenerate seed from JSON via: node scripts/generate-workout-plan-seed.mjs

-- -----------------------------------------------------------------------------
-- 1) Optional: UUID generation (Postgres 13+ has gen_random_uuid() built in; no extension needed)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 2) Table: one row per set logged (matches src/store/slices/workoutSlice.ts)
-- -----------------------------------------------------------------------------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  date timestamptz not null default now(),
  set_number integer not null,
  reps integer,
  weight double precision
);

comment on table public.workout_logs is 'Per-set workout logs for FitReps; scoped by user_id via RLS.';

-- -----------------------------------------------------------------------------
-- 3) Index: history and “last performance” queries filter by user + exercise + date
-- -----------------------------------------------------------------------------
create index idx_workout_logs_user_exercise_date
  on public.workout_logs (user_id, exercise_name, date desc);

-- -----------------------------------------------------------------------------
-- 4) Row Level Security
-- -----------------------------------------------------------------------------
alter table public.workout_logs enable row level security;

-- -----------------------------------------------------------------------------
-- 5) Policies: each user only sees and writes their own rows
-- -----------------------------------------------------------------------------
create policy "workout_logs_select_own"
  on public.workout_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "workout_logs_insert_own"
  on public.workout_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "workout_logs_update_own"
  on public.workout_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_logs_delete_own"
  on public.workout_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6) Grants: let the Supabase API (PostgREST) use the table for logged-in users
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.workout_logs to authenticated;
grant all on public.workout_logs to service_role;

-- -----------------------------------------------------------------------------
-- 7) Body weight: one row per user per calendar day
-- -----------------------------------------------------------------------------
create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null,
  weight double precision not null,
  unique (user_id, logged_date)
);

comment on table public.body_weight_logs is 'Daily body weight; one entry per user per day.';

create index idx_body_weight_logs_user_date
  on public.body_weight_logs (user_id, logged_date desc);

alter table public.body_weight_logs enable row level security;

create policy "body_weight_logs_select_own"
  on public.body_weight_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "body_weight_logs_insert_own"
  on public.body_weight_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "body_weight_logs_update_own"
  on public.body_weight_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "body_weight_logs_delete_own"
  on public.body_weight_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.body_weight_logs to authenticated;
grant all on public.body_weight_logs to service_role;
