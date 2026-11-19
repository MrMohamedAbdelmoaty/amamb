-- ============================================================
-- AMAMB — Multi-school platform schema (Supabase / Postgres)
-- Roles: admin (platform owner) · teacher · student
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- Schools ----------
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  plan text default 'basic',
  subscription_status text default 'active' check (subscription_status in ('active','suspended','trial')),
  created_at timestamptz default now()
);

-- ---------- Users (profiles) ----------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('admin','teacher','student')),
  school_id uuid references schools(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------- Sections (classes) ----------
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete set null,
  grade text,
  name text,
  created_at timestamptz default now()
);

-- ---------- Students (roster) ----------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  pin text,
  parent_whatsapp text,
  created_at timestamptz default now()
);

-- ---------- Quick checks (formative checks after each lesson) ----------
create table if not exists exit_tickets (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade,
  title text,
  date date,
  max numeric default 10,
  scores jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Quizzes (q1 / q2 / final / standalone) ----------
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade,
  quarter int default 1,
  kind text,
  title text,
  date date,
  max numeric,
  scores jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Homework ----------
create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade,
  title text,
  due_date date,
  status jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Attendance sessions ----------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade,
  date date,
  start_ts timestamptz,
  end_ts timestamptz,
  is_open boolean default false,
  records jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Behavior notes ----------
create table if not exists behavior (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade,
  type text check (type in ('positive','negative','supplies')),
  text text,
  date date,
  created_at timestamptz default now()
);

-- ---------- Weekly schedule ----------
create table if not exists schedule (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  period int,
  subject text,
  time_start text,
  time_end text
);

-- ---------- Row Level Security (permissive; app enforces roles) ----------
alter table schools enable row level security;
alter table profiles enable row level security;
alter table sections enable row level security;
alter table students enable row level security;
alter table exit_tickets enable row level security;
alter table quizzes enable row level security;
alter table homework enable row level security;
alter table attendance enable row level security;
alter table behavior enable row level security;
alter table schedule enable row level security;

do $$
declare t text;
begin
  foreach t in array array['schools','profiles','sections','students','exit_tickets','quizzes','homework','attendance','behavior','schedule']
  loop
    execute format('drop policy if exists "allow_all" on %I', t);
    execute format('create policy "allow_all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================
-- Seed data
-- Passwords (SHA-256): admin123 / teacher123 / student123
-- ============================================================
insert into schools (id, name, code, plan, subscription_status)
values ('11111111-1111-1111-1111-111111111111', 'Al-Noor International School', 'NOOR001', 'pro', 'active')
on conflict (id) do nothing;

insert into profiles (id, email, password_hash, name, role, school_id)
values
('22222222-2222-2222-2222-222222222222', 'admin@amamb.com',   '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Platform Admin', 'admin', null),
('33333333-3333-3333-3333-333333333333', 'teacher@amamb.com', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'Omar Mohamed', 'teacher', '11111111-1111-1111-1111-111111111111')
on conflict (email) do nothing;

insert into sections (id, school_id, teacher_id, grade, name)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Grade 3', 'A')
on conflict (id) do nothing;

insert into students (id, school_id, section_id, name, pin, parent_whatsapp)
values
('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Ahmed Alharbi',   '1111', '966501111111'),
('50000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Layla Alotaibi',  '2222', '966502222222'),
('50000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Khalid Alqahtani','3333', '966503333333'),
('50000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Noura Aldossari', '4444', '966504444444'),
('50000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Faisal Alshammari','5555', '966505555555'),
('50000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Huda Almutairi',  '6666', '966506666666'),
('50000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Omar Alrashid',   '7777', '966507777777'),
('50000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Sara Alansari',   '8888', '966508888888'),
('50000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Yousef Alsaud',   '9999', '966509999999'),
('50000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Reem Aljaber',    '1010', '966501010101'),
('50000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tariq Alnuaimi',  '1112', '966501111222'),
('50000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Jana Alsubaie',   '1212', '966501212121')
on conflict (id) do nothing;

-- Link the demo student account to the first student
insert into profiles (id, email, password_hash, name, role, school_id)
values ('66666666-6666-6666-6666-666666666666', 'student@amamb.com', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'Ahmed Alharbi', 'student', '11111111-1111-1111-1111-111111111111')
on conflict (email) do nothing;

update students set user_id = '66666666-6666-6666-6666-666666666666'
where id = '50000000-0000-0000-0000-000000000001';

-- ---------- Sample grades / attendance / behavior ----------
do $$
declare
  st record;
  t record;
  sc numeric;
  i int;
  statuses text[] := array['present','present','present','present','present','present','present','present','late','absent','excused'];
begin
  -- Quick checks (6)
  for i in 1..6 loop
    insert into exit_tickets (section_id, title, date, max, scores)
    values ('44444444-4444-4444-4444-444444444444', 'Lesson ' || i || ' · Quick Check', current_date - (42 - i*7), 10, '{}');
  end loop;
  for t in select * from exit_tickets where section_id = '44444444-4444-4444-4444-444444444444' loop
    for st in select * from students where section_id = '44444444-4444-4444-4444-444444444444' loop
      if random() > 0.08 then
        sc := round((4 + random()*6)::numeric, 1);
        update exit_tickets set scores = scores || jsonb_build_object(st.id::text, sc) where id = t.id;
      end if;
    end loop;
  end loop;

  -- Quizzes: Q1, Q2 (/20), Final (/40)
  insert into quizzes (section_id, quarter, kind, title, date, max, scores)
  values ('44444444-4444-4444-4444-444444444444', 1, 'q1', 'Periodic Test 1', current_date - 28, 20, '{}'),
         ('44444444-4444-4444-4444-444444444444', 1, 'q2', 'Periodic Test 2', current_date - 14, 20, '{}'),
         ('44444444-4444-4444-4444-444444444444', 1, 'final', 'Final Exam', current_date - 7, 40, '{}');
  for t in select * from quizzes where section_id = '44444444-4444-4444-4444-444444444444' loop
    for st in select * from students where section_id = '44444444-4444-4444-4444-444444444444' loop
      if random() > 0.06 then
        sc := round((t.max*0.35 + random()*t.max*0.65)::numeric, 1);
        update quizzes set scores = scores || jsonb_build_object(st.id::text, sc) where id = t.id;
      end if;
    end loop;
  end loop;

  -- Homework (3)
  insert into homework (section_id, title, due_date, status)
  values ('44444444-4444-4444-4444-444444444444', 'Reading worksheet', current_date - 20, '{}'),
         ('44444444-4444-4444-4444-444444444444', 'Math practice', current_date - 13, '{}'),
         ('44444444-4444-4444-4444-444444444444', 'Vocabulary list', current_date - 6, '{}');
  for t in select * from homework where section_id = '44444444-4444-4444-4444-444444444444' loop
    for st in select * from students where section_id = '44444444-4444-4444-4444-444444444444' loop
      update homework set status = status || jsonb_build_object(st.id::text, case when random() < 0.82 then 'submitted' else 'missing' end) where id = t.id;
    end loop;
  end loop;

  -- Attendance (8 past days)
  for i in 7..0 by -1 loop
    insert into attendance (section_id, date, start_ts, end_ts, is_open, records)
    values ('44444444-4444-4444-4444-444444444444', current_date - i, now() - (i||' days')::interval, now() - (i||' days')::interval + interval '45 minutes', false, '{}');
  end loop;
  for t in select * from attendance where section_id = '44444444-4444-4444-4444-444444444444' loop
    for st in select * from students where section_id = '44444444-4444-4444-4444-444444444444' loop
      update attendance set records = records || jsonb_build_object(st.id::text,
        jsonb_build_object('status', statuses[1 + floor(random()*array_length(statuses,1))::int],
                           'participation', 1 + floor(random()*5)::int,
                           'via', case when random() < 0.5 then 'qr' else 'manual' end))
      where id = t.id;
    end loop;
  end loop;

  -- Behavior notes
  insert into behavior (student_id, section_id, type, text, date)
  select s.id, '44444444-4444-4444-4444-444444444444', b.type, b.text, current_date - floor(random()*30)::int
  from (values
    ('positive','Helped a classmate with the lesson'),
    ('positive','Excellent participation in discussion'),
    ('negative','Talking during the lesson'),
    ('positive','Finished homework early'),
    ('negative','Did not bring supplies'),
    ('supplies','Forgot notebook'),
    ('supplies','Forgot pen'),
    ('positive','Great presentation'),
    ('negative','Late to class without excuse'),
    ('positive','Volunteered to read aloud'),
    ('negative','Distracted classmates')
  ) as b(type, text)
  cross join lateral (select id from students where section_id = '44444444-4444-4444-4444-444444444444' order by random() limit 1) s;

  -- Sample weekly schedule
  insert into schedule (section_id, day_of_week, period, subject, time_start, time_end)
  values
  ('44444444-4444-4444-4444-444444444444', 1, 1, 'Mathematics', '08:00', '08:45'),
  ('44444444-4444-4444-4444-444444444444', 1, 2, 'English', '09:00', '09:45'),
  ('44444444-4444-4444-4444-444444444444', 2, 1, 'Science', '08:00', '08:45'),
  ('44444444-4444-4444-4444-444444444444', 2, 2, 'Mathematics', '09:00', '09:45'),
  ('44444444-4444-4444-4444-444444444444', 3, 1, 'Arabic', '08:00', '08:45'),
  ('44444444-4444-4444-4444-444444444444', 3, 2, 'English', '09:00', '09:45'),
  ('44444444-4444-4444-4444-444444444444', 4, 1, 'Mathematics', '08:00', '08:45'),
  ('44444444-4444-4444-4444-444444444444', 4, 2, 'Science', '09:00', '09:45'),
  ('44444444-4444-4444-4444-444444444444', 5, 1, 'English', '08:00', '08:45'),
  ('44444444-4444-4444-4444-444444444444', 5, 2, 'Arabic', '09:00', '09:45');
end $$;
