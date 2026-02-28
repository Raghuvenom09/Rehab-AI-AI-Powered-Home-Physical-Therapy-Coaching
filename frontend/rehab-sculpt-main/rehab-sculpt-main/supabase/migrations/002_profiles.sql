-- Drop and recreate cleanly
drop table if exists public.profiles cascade;

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  age             int,
  height_cm       numeric,
  weight_kg       numeric,
  injury_area     text,          -- e.g. "Knee", "Shoulder"
  injury_type     text,          -- e.g. "Sprain", "Post-Surgery"
  injury_duration text,          -- e.g. "1–3 months"
  limitations     text[]  default '{}',
  recovery_goal   text,
  onboarding_completed boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Users can only see and edit their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Auto-create a profile row when a new user signs up ──────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
