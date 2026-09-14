const express = require('express')
const cors = require('cors')
require('dotenv').config()

const itemsRoutes = require('./routes/items')
const officesRoutes = require('./routes/offices')
const personnelRoutes = require('./routes/personnel')
const suppliersRoutes = require('./routes/suppliers')
const itemRequestsRoutes = require('./routes/itemRequests')
const receiptsRoutes = require('./routes/receipts')
const returnsRoutes = require('./routes/returns')
const incidentsRoutes = require('./routes/incidents')
const auditLogsRoutes = require('./routes/auditLogs')
const { requireAuth, requireRole } = require('./middleware/auth')
const authRoutes = require('./routes/auth')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)

app.get('/', (req, res) => {
  res.json({
    message: 'Property Inventory API is running'
  })
})

app.use('/api/offices', requireAuth, requireRole('Administrator', 'Personnel'), officesRoutes)
app.use('/api/personnel', requireAuth, requireRole('Administrator'), personnelRoutes)
app.use('/api/suppliers', requireAuth, requireRole('Administrator', 'Personnel'), suppliersRoutes)
app.use('/api/item-requests', requireAuth, requireRole('Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'), itemRequestsRoutes)
app.use('/api/receipts', requireAuth, requireRole('Administrator', 'Personnel'), receiptsRoutes)
app.use('/api/returns', requireAuth, requireRole('Administrator', 'Personnel'), returnsRoutes)
app.use('/api/incidents', requireAuth, requireRole('Administrator', 'Personnel'), incidentsRoutes)
app.use('/api/audit-logs', requireAuth, requireRole('Administrator', 'Personnel'), auditLogsRoutes)
app.use('/api/items', requireAuth, requireRole('Administrator', 'Personnel'), itemsRoutes)

const PORT = 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})