const { createClient } = require('@supabase/supabase-js')

let supabaseAdmin

function getSupabaseAdmin() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!serviceRoleKey) {
    return null
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  return supabaseAdmin
}

function isAdminAuthorizationError(error) {
  return error?.status === 401 ||
    error?.status === 403 ||
    /user not allowed|not authorized/i.test(error?.message || '')
}

const adminCredentialsError =
  'Supabase rejected the admin credentials. Set SUPABASE_SERVICE_ROLE_KEY in the backend environment to your project service-role or secret key, then restart the backend.'

module.exports = {
  getSupabaseAdmin,
  isAdminAuthorizationError,
  adminCredentialsError
}
