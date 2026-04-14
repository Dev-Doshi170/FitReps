-- progression_state: per-user per-exercise progressive overload tracking
-- workout_logs.rpe: optional per-set effort (easy | medium | hard)

create table public.progression_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  current_weight numeric,
  current_reps_target integer,
  rep_range_min integer not null,
  rep_range_max integer not null,
  consecutive_hard_sets integer default 0,
  consecutive_easy_sessions integer default 0,
  last_session_rpe text, -- 'easy' | 'medium' | 'hard'
  last_updated timestamptz default now(),
  unique (user_id, exercise_name)
);

comment on table public.progression_state is 'Double-progression tracking per user and exercise name; RLS scoped by user_id.';

create index idx_progression_state_user_updated
  on public.progression_state (user_id, last_updated desc);

alter table public.progression_state enable row level security;

create policy "Users can manage their own progression state"
  on public.progression_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.progression_state to authenticated;
grant all on public.progression_state to service_role;

-- Per-set effort; nullable when user skips RPE
alter table public.workout_logs
  add column if not exists rpe text;

comment on column public.workout_logs.rpe is 'Subjective effort: easy | medium | hard; optional.';
