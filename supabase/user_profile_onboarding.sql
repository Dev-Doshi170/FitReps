-- Run in Supabase SQL editor (or via CLI). One row per user: onboarding + baseline stats.
-- RLS: users can only read/insert/update their own row.

create table if not exists public.user_profiles (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  -- Total inches (app accepts cm or ft/in like 5'7 and converts here)
  height_inches numeric not null check (height_inches > 0),
  body_weight_kg numeric not null check (body_weight_kg > 0),
  experience text not null
    check (experience in ('beginner', 'intermediate', 'advanced')),
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'Onboarding: height (in), body weight (kg), gym experience; used for first-session load hints.';

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_profiles to authenticated;

create index if not exists idx_user_profiles_experience
  on public.user_profiles (experience)
  where onboarding_complete = true;
