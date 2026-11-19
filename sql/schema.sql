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
-- v2 additions — Content · Exams · Chemistry · Messaging · Audit
-- (matches the live project mxseuwlhhkqkpgofecoa)
-- ============================================================

-- Account status for approvals / suspensions (default: active)
alter table profiles add column if not exists status text not null default 'active';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table profiles add constraint profiles_status_check check (status in ('active','pending'));
  end if;
end $$;
-- Optional: phone login + unique partial index
alter table profiles add column if not exists phone text;
create unique index if not exists profiles_phone_key on profiles(phone) where phone is not null;

-- ---------- Curricula & units ----------
create table if not exists curricula (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  subject text,
  grade text,
  is_active boolean default true,
  position int default 0,
  created_at timestamptz default now()
);
create table if not exists curriculum_units (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid references curricula(id) on delete cascade,
  title_ar text not null,
  title_en text,
  position int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references curriculum_units(id) on delete cascade,
  title_ar text not null,
  title_en text,
  content_ar text,
  content_en text,
  video_url text,
  position int default 0,
  created_at timestamptz default now()
);
create table if not exists lesson_assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  title text not null,
  kind text default 'homework' check (kind in ('homework','reading','activity','file')),
  created_at timestamptz default now()
);

-- ---------- Question bank ----------
-- type: mcq | multi | tf | fill | short | order | match | essay
-- difficulty: 1 (easy) .. 3 (hard) ; points: numeric
-- options/answer jsonb shapes:
--   mcq:   options=[...]                     answer={"correct": 2}
--   multi: options=[...]                     answer={"correct": [0,2]}
--   tf:    options=null                      answer={"correct": true}
--   fill:  options=null                      answer={"accept": [...], "reference": "..."}
--   short: options=null                      answer={"accept": [...], "reference": "..."}
--   order: options={"steps": [...correct order]}  answer={"order": [0,1,2]}
--   match: options={"pairs": [{"a","b"}, ...]}     answer={}
--   essay: options=null                      answer={"reference": "..."}
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid references curricula(id) on delete set null,
  unit_id uuid references curriculum_units(id) on delete set null,
  type text not null check (type in ('mcq','multi','tf','fill','short','order','match','essay')),
  difficulty int default 2 check (difficulty between 1 and 3),
  prompt_ar text not null,
  prompt_en text,
  options jsonb,
  answer jsonb,
  points numeric default 1,
  position int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- Exams ----------
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  curriculum_id uuid references curricula(id) on delete set null,
  section_id uuid references sections(id) on delete set null,   -- null = all sections
  time_limit_min int default 30,
  max_attempts int default 1,
  is_active boolean default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);
create table if not exists exam_questions (
  exam_id uuid references exams(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  position int default 0,
  primary key (exam_id, question_id)
);
create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,  -- roster id
  answers jsonb default '{}'::jsonb,
  score numeric,
  max_score numeric,
  essay_scores jsonb default '{}'::jsonb,                      -- {question_id: points}
  submitted_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- Chemistry reference data ----------
create table if not exists chemistry_elements (
  id uuid primary key default gen_random_uuid(),
  atomic_number int not null,
  symbol text not null,
  name_ar text not null,
  name_en text,
  atomic_mass numeric,
  category text
);
create table if not exists chemistry_constants (
  id uuid primary key default gen_random_uuid(),
  category text,
  name_ar text not null,
  name_en text,
  value text not null,
  unit text,
  position int default 0
);
create table if not exists equations (
  id uuid primary key default gen_random_uuid(),
  equation text not null,
  note_ar text,
  note_en text
);

-- ---------- Messaging + read receipts ----------
-- audience: 'all' | 'teachers' | 'students' | 'section:<uuid>' | 'user:<uuid>'
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete set null,
  audience text not null default 'all',
  title text not null,
  body text not null,
  created_at timestamptz default now()
);
create table if not exists message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- ---------- Audit log (who changed what) ----------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- ---------- RLS for the new tables (permissive; app enforces roles) ----------
do $$
declare t text;
begin
  foreach t in array array['curricula','curriculum_units','lessons','lesson_assignments','questions','exams','exam_questions','exam_attempts','chemistry_elements','chemistry_constants','equations','messages','message_reads','audit_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "allow_all" on %I', t);
    execute format('create policy "allow_all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================
-- Seed data — REAL ACCOUNT ONLY
-- Demo accounts are intentionally NOT seeded. Create your admin:
--   1) pick a strong password and SHA-256 hash it:
--        SELECT encode(digest('<YOUR_PASSWORD>','sha256'),'hex');
--   2) insert:
--        insert into schools (name, code, plan, subscription_status)
--        values ('Al-Noor International School','NOOR001','pro','active');
--        insert into profiles (email, password_hash, name, role, phone, status)
--        values ('you@school.com', '<hash above>', 'MR. YOUR NAME', 'admin', '9665xxxxxxxx', 'active');
--   3) sign in at the deployed site with email or phone + password.
-- Optional demo CONTENT (curricula/chemistry reference) may be inserted separately;
-- the live project mxseuwlhhkqkpgofecoa already carries a Grade-12 chemistry pack.
-- ============================================================
