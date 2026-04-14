-- FitReps — normalized workout catalog (exercises + plans + schedule + mappings)
-- Run in Supabase SQL Editor AFTER setup.sql (or merge into your migration pipeline).
-- Then run workout_plan_seed.sql to load "Dev's Plan" data.

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment text not null default '',
  type text not null,
  muscle_primary text not null default '',
  muscle_secondary text[] not null default array[]::text[],
  notes text
);

comment on table public.exercises is 'Global exercise library; reusable across plans.';

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text not null,
  level text not null,
  days_per_week smallint not null
);

comment on table public.plans is 'Workout plan metadata (e.g. Dev''s Plan).';

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  day text not null,
  type text not null,
  focus text not null,
  duration_minutes smallint not null,
  warmup text not null default '',
  cardio_title text not null default '',
  cardio_duration_minutes smallint,
  cardio_instructions text not null default '',
  unique (plan_id, day)
);

comment on table public.plan_days is 'One row per calendar day slot in a plan (Push, Pull, etc.).';

create table if not exists public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sort_order smallint not null,
  sets smallint not null,
  reps text not null,
  unique (plan_day_id, sort_order)
);

comment on table public.plan_exercises is 'Join: which exercises appear on a plan day, with prescription.';

create index if not exists idx_plan_days_plan_id on public.plan_days (plan_id);
create index if not exists idx_plan_exercises_plan_day_id on public.plan_exercises (plan_day_id);
create index if not exists idx_plan_exercises_exercise_id on public.plan_exercises (exercise_id);

-- -----------------------------------------------------------------------------
-- Row Level Security — read-only catalog for signed-in users
-- -----------------------------------------------------------------------------

alter table public.exercises enable row level security;
alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;

drop policy if exists "exercises_select_authenticated" on public.exercises;
drop policy if exists "plans_select_authenticated" on public.plans;
drop policy if exists "plan_days_select_authenticated" on public.plan_days;
drop policy if exists "plan_exercises_select_authenticated" on public.plan_exercises;

create policy "exercises_select_authenticated"
  on public.exercises for select to authenticated using (true);

create policy "plans_select_authenticated"
  on public.plans for select to authenticated using (true);

create policy "plan_days_select_authenticated"
  on public.plan_days for select to authenticated using (true);

create policy "plan_exercises_select_authenticated"
  on public.plan_exercises for select to authenticated using (true);

grant select on public.exercises to authenticated;
grant select on public.plans to authenticated;
grant select on public.plan_days to authenticated;
grant select on public.plan_exercises to authenticated;

grant all on public.exercises to service_role;
grant all on public.plans to service_role;
grant all on public.plan_days to service_role;
grant all on public.plan_exercises to service_role;
