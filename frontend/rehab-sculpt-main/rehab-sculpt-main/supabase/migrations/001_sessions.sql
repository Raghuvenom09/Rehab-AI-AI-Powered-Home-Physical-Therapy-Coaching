-- ============================================================================
-- Rehab AI — Session Tables  (safe to re-run: drops existing objects first)
-- Paste the entire file into Supabase SQL Editor → New query → Run
-- ============================================================================

-- ─── Drop everything cleanly so re-runs never conflict ────────────────────────

drop function if exists public.update_session_totals(uuid);

-- Drop tables with CASCADE (handles policies + foreign keys automatically)
drop table if exists public.session_sets cascade;
drop table if exists public.sessions     cascade;
drop table if exists public.exercises    cascade;

-- ─── 1. Exercises catalog ─────────────────────────────────────────────────────

create table public.exercises (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  injury_type text        not null,
  difficulty  text        not null default 'medium'
                          check (difficulty in ('easy', 'medium', 'hard')),
  target_reps int         not null default 12,
  target_sets int         not null default 3,
  created_at  timestamptz not null default now()
);

-- ─── 2. Sessions (one per workout) ───────────────────────────────────────────

create table public.sessions (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,
  exercise_id        uuid        not null references public.exercises(id) on delete cascade,
  status             text        not null default 'in_progress'
                                 check (status in ('in_progress', 'completed', 'cancelled')),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  total_reps         int         not null default 0,
  total_sets         int         not null default 0,
  avg_accuracy       numeric(5,2),
  pain_level_before  int,
  soreness_areas     text[],
  sharp_pain         text,
  created_at         timestamptz not null default now()
);

-- ─── 3. Per-set data ─────────────────────────────────────────────────────────

create table public.session_sets (
  id             uuid        primary key default gen_random_uuid(),
  session_id     uuid        not null references public.sessions(id) on delete cascade,
  set_number     int         not null,
  reps_completed int         not null default 0,
  accuracy       numeric(5,2),
  joint_angles   jsonb,
  feedback       text,
  created_at     timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.exercises    enable row level security;
alter table public.sessions     enable row level security;
alter table public.session_sets enable row level security;

create policy "Exercises are viewable by everyone"
  on public.exercises for select using (true);

create policy "Users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update using (auth.uid() = user_id);

create policy "Users can view own session sets"
  on public.session_sets for select
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create policy "Users can insert own session sets"
  on public.session_sets for insert
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create policy "Users can update own session sets"
  on public.session_sets for update
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

-- ─── Seed starter exercises ───────────────────────────────────────────────────

insert into public.exercises (name, description, injury_type, difficulty, target_reps, target_sets) values
  ('Squat - Deep',        'Full depth squat for knee and hip mobility',         'Knee',         'medium', 12, 3),
  ('Squat - Partial',     'Quarter squat, easier on the joints',                'Knee',         'easy',   15, 3),
  ('Wall Sit',            'Isometric hold against the wall',                    'Knee',         'easy',    1, 3),
  ('Shoulder Press',      'Overhead pressing movement for shoulder rehab',      'Shoulder',     'medium', 10, 3),
  ('Shoulder Rotation',   'Internal and external rotation with band',           'Shoulder',     'easy',   15, 3),
  ('Cat-Cow Stretch',     'Spinal mobility exercise',                           'Back',         'easy',   10, 3),
  ('Bird Dog',            'Core stability and back strengthening',              'Back',         'medium', 10, 3),
  ('Dead Bug',            'Anti-extension core exercise',                       'Back',         'medium', 12, 3),
  ('Step Ups',            'Single leg strengthening for post-surgery recovery', 'Post-Surgery', 'medium', 10, 3),
  ('Heel Slides',         'Gentle knee flexion exercise post-surgery',          'Post-Surgery', 'easy',   15, 3);

-- ─── Helper RPC: recalculate session totals from its sets ────────────────────

create or replace function public.update_session_totals(p_session_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.sessions
  set
    total_reps = coalesce((
      select sum(reps_completed)
      from public.session_sets
      where session_id = p_session_id
    ), 0),
    total_sets = coalesce((
      select count(*)
      from public.session_sets
      where session_id = p_session_id
    ), 0),
    avg_accuracy = (
      select avg(accuracy)
      from public.session_sets
      where session_id = p_session_id and accuracy is not null
    )
  where id = p_session_id;
end;
$$;
