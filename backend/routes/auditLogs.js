const express = require('express')
const router = express.Router()

const supabase = require('../supabase')

// GET AUDIT LOGS
router.get('/', async (req, res) => {

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('AUDIT LOG ERROR:')
    console.log(error)

    return res.status(500).json({
      error: error.message
    })
  }

  res.json(data)
})

module.exports = router