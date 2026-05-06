-- supabase/migrations/20260506150000_create_timetable_schema.sql

-- Enable RLS kaikille tauluille
alter table if exists public.teachers enable row level security;
alter table if exists public.school_classes enable row level security;
alter table if exists public.subjects enable row level security;
alter table if exists public.rooms enable row level security;
alter table if exists public.lesson_requirements enable row level security;
alter table if exists public.timetable_entries enable row level security;

-- 1. Opettajat
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  subjects text[] default '{}',           -- aineet jotka opettaa
  max_hours_per_week int default 25,
  preferences jsonb default '{}',         -- pehmeät toiveet (aamu/iltapäivät jne.)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Luokat / ryhmät
create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                     -- esim. "7A", "Lukio 1"
  level int,                              -- 1-9 peruskoulu, 10+ lukio
  student_count int default 20,
  special_needs boolean default false,
  created_at timestamptz default now()
);

-- 3. Aineet
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text,
  category text,                          -- 'teoria' / 'käytännön' / 'kielet' jne.
  requires_double_lesson boolean default false,
  created_at timestamptz default now()
);

-- 4. Tilat / luokkahuoneet
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,                     -- "Luokka 12", "Liikuntasali", "Labra"
  type text default 'classroom',
  capacity int default 30,
  created_at timestamptz default now()
);

-- 5. Viikkotuntivaatimukset (luokka + aine)
create table if not exists public.lesson_requirements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.school_classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  hours_per_week int not null check (hours_per_week > 0),
  unique(class_id, subject_id)
);

-- 6. Generoidut lukujärjestykset (tallennetaan myöhemmin)
create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id),
  class_id uuid references public.school_classes(id),
  subject_id uuid references public.subjects(id),
  room_id uuid references public.rooms(id),
  day_of_week int check (day_of_week between 1 and 5),
  period int check (period > 0),
  created_at timestamptz default now()
);

-- RLS-politiikat (peruskoulu-käyttöön – voit laajentaa myöhemmin)
create policy "Käyttäjät näkevät oman koulunsa datan" on public.teachers
  for all using (true);  -- TODO: lisää auth.uid() + school_id kun teet monikoulumallin

-- Samat RLS kaikille tauluille (helppo aloitus)
create policy "Enable all for authenticated users" on public.school_classes for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on public.subjects for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on public.rooms for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on public.lesson_requirements for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on public.timetable_entries for all using (auth.role() = 'authenticated');

-- Triggerit updated_at-kentälle (valinnainen)
create or replace function update_updated_at_column()
returns trigger as \[ begin
  new.updated_at = now();
  return new;
end; \] language plpgsql;

create trigger update_teachers_updated_at
  before update on public.teachers
  for each row execute function update_updated_at_column();
