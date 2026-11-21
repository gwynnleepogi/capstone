-- Add the NVSU offices and colleges to the Office dropdown.
-- Safe to run more than once: existing office names are not duplicated.

INSERT INTO public.offices (office_name, office_code)
SELECT seed.office_name, seed.office_code
FROM (
  VALUES
    ('Office of the Campus Administrator', 'OCA'),
    ('Cashier''s Office', 'CASH'),
    ('Human Resource Management Office', 'HRMO'),
    ('Records Management Office', 'RMO'),
    ('Office of the Registrar', 'REG'),
    ('Library Services', 'LIB'),
    ('Student Affairs and Services (SAS)', 'SAS'),
    ('Guidance and Counseling Unit', 'GCU'),
    ('University Educational Testing Center (UETC)', 'UETC'),
    ('Scholarship and Financial Assistance Unit', 'SFAU'),
    ('College of Arts and Sciences (CAS)', 'CAS'),
    ('College of Engineering (COE)', 'COE'),
    ('College of Industrial Technology (CIT)', 'CIT'),
    ('College of Teacher Education (CTE)', 'CTE'),
    ('Supply Management Office', 'SMO'),
    ('Procurement Office', 'PROC'),
    ('Accounting Office', 'ACCT'),
    ('Budget Office', 'BUD'),
    ('Management Information System (MIS)', 'MIS'),
    ('Physical Plant and Site Development', 'PPSD')
) AS seed(office_name, office_code)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.offices existing
  WHERE lower(trim(existing.office_name)) = lower(trim(seed.office_name))
);
