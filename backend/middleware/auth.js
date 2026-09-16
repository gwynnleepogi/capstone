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

    req.user = result.data.user//this saves the login account in supabase
    req.profile = profileResult.data//saves the user's information from the table user sa database
    req.role = profileResult.data.role//save the role for permission checking

    next()//if passed the authentication, it can continue to route
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

function requireFields(req, res, fields) {
    const missingFields = fields.filter(field => {
        const value = req.body[field]
        return value === undefined || value === null || value === ''
    })

    if (missingFields.length > 0) {
        res.status(400).json({
            error: `Required field(s) missing: ${missingFields.join(', ')}`
        })
        return false
    }

    return true
}

module.exports = {
    requireAuth,
    requireRole,
    requireFields
}


