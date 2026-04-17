-- ============================================================================
-- Rehab AI — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user cascade;
drop table if exists public.progress_logs     cascade;
drop table if exists public.session_exercises cascade;
drop table if exists public.sessions          cascade;
drop table if exists public.exercises         cascade;
drop table if exists public.profiles         cascade;

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  avatar_url        text,
  age               int,
  height_cm         int,
  weight_kg         int,
  injury_area       text,
  injury_type       text,
  injury_duration   text,
  limitations       text[],
  recovery_goal     text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  body_part     text,
  difficulty    text default 'beginner',
  video_url     text,
  image_url     text,
  instructions  text[],
  created_at    timestamptz default now()
);

create table public.sessions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  title                text,
  notes                text,
  started_at           timestamptz default now(),
  ended_at             timestamptz,
  duration_sec         int,
  status               text default 'in_progress',
  pain_level_before    int,
  soreness_areas       text[],
  sharp_pain           text,
  created_at           timestamptz default now()
);

create table public.session_exercises (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id) on delete cascade,
  sets          int,
  reps          int,
  hold_seconds  int,
  pain_level    int check (pain_level between 0 and 100),
  notes         text,
  completed     boolean default false,
  created_at    timestamptz default now()
);

create table public.progress_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date default current_date,
  pain_level    int check (pain_level between 0 and 10),
  mobility      int check (mobility between 0 and 100),
  strength      int check (strength between 0 and 100),
  notes         text,
  created_at    timestamptz default now()
);

alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.sessions          enable row level security;
alter table public.session_exercises enable row level security;
alter table public.progress_logs     enable row level security;

create policy "Users can view their own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Exercises are viewable by all" on public.exercises for select to authenticated using (true);

create policy "Users can view their own sessions"    on public.sessions for select using (auth.uid() = user_id);
create policy "Users can create their own sessions"   on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own sessions"   on public.sessions for update using (auth.uid() = user_id);
create policy "Users can delete their own sessions"   on public.sessions for delete using (auth.uid() = user_id);

create policy "Users can view their own session exercises"    on public.session_exercises for select using (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "Users can insert their own session exercises"   on public.session_exercises for insert with check (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "Users can update their own session exercises" on public.session_exercises for update using (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "Users can delete their own session exercises" on public.session_exercises for delete using (session_id in (select id from public.sessions where user_id = auth.uid()));

create policy "Users can view their own progress"    on public.progress_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own progress"  on public.progress_logs for insert with check (auth.uid() = user_id);
create policy "Users can update their own progress"  on public.progress_logs for update using (auth.uid() = user_id);
create policy "Users can delete their own progress"  on public.progress_logs for delete using (auth.uid() = user_id);

insert into public.exercises (name, description, body_part, difficulty, instructions) values
  ('Shoulder Flexion', 'Raise your arm forward and overhead while keeping it straight.', 'shoulder', 'beginner', array['Stand tall with arms at your sides', 'Slowly raise one arm forward', 'Go as high as comfortable', 'Hold for 2 seconds', 'Lower slowly']),
  ('Wall Slide', 'Slide your arms up a wall to improve shoulder mobility.', 'shoulder', 'beginner', array['Stand with back against a wall', 'Place arms in a goalpost position', 'Slowly slide arms upward', 'Return to start position']),
  ('Seated Knee Extension', 'Strengthen the quadriceps by extending the knee from a seated position.', 'knee', 'beginner', array['Sit in a sturdy chair', 'Slowly straighten one knee', 'Hold for 5 seconds', 'Lower slowly', 'Repeat on other side']),
  ('Hamstring Stretch', 'Stretch the back of the thigh to improve flexibility.', 'knee', 'beginner', array['Sit on the edge of a chair', 'Extend one leg forward with heel on floor', 'Lean forward from hips', 'Hold 20-30 seconds']),
  ('Cat-Cow Stretch', 'Alternating spinal flexion and extension for back mobility.', 'back', 'beginner', array['Start on hands and knees', 'Arch your back up (cat)', 'Hold 2 seconds', 'Drop belly down (cow)', 'Repeat slowly']),
  ('Bird Dog', 'Core stability exercise extending opposite arm and leg.', 'back', 'intermediate', array['Start on hands and knees', 'Extend right arm and left leg', 'Hold for 5 seconds', 'Return to start', 'Switch sides']),
  ('Ankle Alphabet', 'Trace the alphabet with your foot to improve ankle mobility.', 'ankle', 'beginner', array['Sit with one foot off the ground', 'Use your big toe to trace each letter of the alphabet', 'Switch feet']),
  ('Standing Calf Raise', 'Strengthen calf muscles by rising onto toes.', 'ankle', 'beginner', array['Stand behind a chair for balance', 'Rise up onto your toes', 'Hold for 2 seconds', 'Lower slowly']),
  ('Biceps Curl', 'Curl weights toward shoulders to strengthen arms.', 'arms', 'beginner', array['Stand with weights at your sides', 'Curl up toward shoulders', 'Lower slowly back down', 'Keep elbows at your sides']),
  ('Neck Rotation', 'Gentle head turns to improve neck mobility.', 'neck', 'beginner', array['Turn head slowly to look over left shoulder', 'Return to center', 'Turn to right shoulder', 'Move within comfortable range']),
  ('Chin Tuck', 'Tuck chin to strengthen neck muscles and posture.', 'neck', 'beginner', array['Gently tuck chin inward', 'Hold 3 seconds', 'Release and relax', 'Keep shoulders relaxed'])
on conflict do nothing;