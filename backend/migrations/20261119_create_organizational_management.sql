-- Organizational Management
-- Run this migration in the Supabase SQL Editor before using the new pages.

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  college_code text not null unique,
  college_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  department_code text not null unique,
  department_name text not null,
  college_id uuid not null references public.colleges(id) on update cascade on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.responsibility_centers (
  id uuid primary key default gen_random_uuid(),
  rc_code text not null unique,
  rc_name text not null,
  college_id uuid references public.colleges(id) on update cascade on delete restrict,
  department_id uuid references public.departments(id) on update cascade on delete restrict,
  office_id uuid references public.offices(id) on update cascade on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint responsibility_centers_one_unit check (
    num_nonnulls(college_id, department_id, office_id) <= 1
  )
);

create index if not exists departments_college_id_idx on public.departments(college_id);
create index if not exists responsibility_centers_college_id_idx on public.responsibility_centers(college_id);
create index if not exists responsibility_centers_department_id_idx on public.responsibility_centers(department_id);
create index if not exists responsibility_centers_office_id_idx on public.responsibility_centers(office_id);

alter table public.colleges enable row level security;
alter table public.departments enable row level security;
alter table public.responsibility_centers enable row level security;

drop policy if exists "Authenticated users can manage colleges" on public.colleges;
create policy "Authenticated users can manage colleges" on public.colleges for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage departments" on public.departments;
create policy "Authenticated users can manage departments" on public.departments for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage responsibility centers" on public.responsibility_centers;
create policy "Authenticated users can manage responsibility centers" on public.responsibility_centers for all to authenticated using (true) with check (true);