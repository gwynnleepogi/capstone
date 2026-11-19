-- Organizational management tables.
-- Existing offices and property records are intentionally left unchanged.

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  college_name text not null unique,
  college_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  department_name text not null,
  department_code text,
  college_id uuid not null references public.colleges(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint departments_college_name_unique unique (college_id, department_name)
);

create table if not exists public.responsibility_centers (
  id uuid primary key default gen_random_uuid(),
  center_code text not null unique,
  center_name text not null,
  unit_type text not null check (unit_type in ('department', 'office')),
  department_id uuid references public.departments(id) on update cascade on delete restrict,
  office_id uuid references public.offices(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint responsibility_centers_one_parent check (
    (unit_type = 'department' and department_id is not null and office_id is null)
    or
    (unit_type = 'office' and office_id is not null and department_id is null)
  )
);

create index if not exists departments_college_id_idx
  on public.departments(college_id);

create index if not exists responsibility_centers_department_id_idx
  on public.responsibility_centers(department_id);

create index if not exists responsibility_centers_office_id_idx
  on public.responsibility_centers(office_id);

-- API access is protected by the Express authentication and Administrator role middleware.
