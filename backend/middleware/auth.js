const supabase = require('../supabase')

async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
        return res.status(401).json({
            error: 'Please log in'
        })
    }

    const result = await supabase.auth.getUser(token)

    if (result.error || !result.data.user) {
        return res.status(401).json({
            error: 'Invalid login'
        })
    }

    const profileResult = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', result.data.user.id)
        .single()

    if (profileResult.error || !profileResult.data) {
        return res.status(403).json({
            error: 'User profile not found'
        })
    }

    req.user = result.data.user
    req.profile = profileResult.data
    req.role = profileResult.data.role

    next()
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.role)) {
            return res.status(403).json({
                error: 'You do not have permission to access this resource'
            })
        }

        next()
    }
}

module.exports = {
    requireAuth,
    requireRole
}


