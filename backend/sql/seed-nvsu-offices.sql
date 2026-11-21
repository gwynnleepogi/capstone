-- Add the NVSU offices and colleges to the Office dropdown.
-- Safe to run more than once: existing office names are not duplicated.
-- The office_code column is intentionally not used.

INSERT INTO public.offices (office_name)
SELECT seed.office_name
FROM (
  VALUES
    ('Office of the Campus Administrator'),
    ('Cashier''s Office'),
    ('Human Resource Management Office'),
    ('Records Management Office'),
    ('Office of the Registrar'),
    ('Library Services'),
    ('Student Affairs and Services (SAS)'),
    ('Guidance and Counseling Unit'),
    ('University Educational Testing Center (UETC)'),
    ('Scholarship and Financial Assistance Unit'),
    ('College of Arts and Sciences (CAS)'),
    ('College of Engineering (COE)'),
    ('College of Industrial Technology (CIT)'),
    ('College of Teacher Education (CTE)'),
    ('Supply Management Office'),
    ('Procurement Office'),
    ('Accounting Office'),
    ('Budget Office'),
    ('Management Information System (MIS)'),
    ('Physical Plant and Site Development')
) AS seed(office_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.offices existing
  WHERE lower(trim(existing.office_name)) = lower(trim(seed.office_name))
);
