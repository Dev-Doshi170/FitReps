-- Links each logged set to the plan session (plan_days row) so the app can show
-- "last performed" per Push / Pull / etc. Nullable for rows logged before this column existed.

alter table public.workout_logs
  add column if not exists plan_day_id uuid references public.plan_days (id) on delete set null;

comment on column public.workout_logs.plan_day_id is
  'Plan session this set was logged under; null for legacy logs or ad-hoc logging.';

create index if not exists idx_workout_logs_user_plan_day_date
  on public.workout_logs (user_id, plan_day_id, date desc);
