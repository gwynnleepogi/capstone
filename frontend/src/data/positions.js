export const teachingPositions = [
  'Instructor I',
  'Instructor II',
  'Instructor III',
  'Assistant Professor I',
  'Assistant Professor II',
  'Assistant Professor III',
  'Assistant Professor IV',
  'Associate Professor I',
  'Associate Professor II',
  'Associate Professor III',
  'Associate Professor IV',
  'Associate Professor V',
  'Professor I',
  'Professor II',
  'Professor III',
  'Professor IV',
  'Professor V',
  'Professor VI',
  'College Professor',
  'University Professor'
]

export const nonTeachingPositions = [
  'Accountant II',
  'Administrative Officer I',
  'Administrative Officer II',
  'Administrative Officer III',
  'Administrative Officer IV',
  'Administrative Officer V',
  'Administrative Assistant I',
  'Administrative Assistant II',
  'Administrative Assistant III',
  'Administrative Aide VI',
  'Board Secretary I',
  'Information Systems Analyst I',
  'Information Systems Analyst II',
  'Information Officer III',
  'Internal Auditor I',
  'Internal Auditor II',
  'Internal Auditor III',
  'Legal Assistant III',
  'Nursing Attendant',
  'Agricultural Technologist',
  'Emergency Instructor'
]

export function positionsForRole(role) {
  if (role === 'Teacher') return teachingPositions
  if (role === 'Non-Teaching Staff') return nonTeachingPositions
  return []
}
