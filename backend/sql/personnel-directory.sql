-- Personnel who can be assigned as accountable employees without system accounts.
create table if not exists public.personnel_directory (
  id uuid primary key default gen_random_uuid(),
  employee_id text,
  full_name text not null,
  job_title text,
  office_id uuid references public.offices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists personnel_directory_employee_id_unique
  on public.personnel_directory (lower(employee_id))
  where employee_id is not null and btrim(employee_id) <> '';

create index if not exists personnel_directory_full_name_idx
  on public.personnel_directory (lower(full_name));

alter table public.personnel_directory enable row level security;

-- Keep direct table access blocked. The administrator-only backend API uses
-- the Supabase service-role key, which bypasses RLS.
