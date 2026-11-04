const accountRoles = ['Teacher', 'Non-Teaching Staff']

function normalizeDepartment(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (word === word.toUpperCase()) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

module.exports = {
  accountRoles,
  normalizeDepartment
}
