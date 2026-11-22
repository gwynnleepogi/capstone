const express = require('express')
const cors = require('cors')
require('dotenv').config()

const itemsRoutes = require('./routes/items')
const itemDocumentsRoutes = require('./routes/itemDocuments')
const officesRoutes = require('./routes/offices')
const personnelRoutes = require('./routes/personnel')
const receiptsRoutes = require('./routes/receipts')
const returnsRoutes = require('./routes/returns')
const transfersRoutes = require('./routes/transfers')
const propertyTransferRequestsRoutes = require('./routes/propertyTransferRequests')
const returnRequestsRoutes = require('./routes/returnRequests')
const itemLookupRoutes = require('./routes/itemLookup')
const auditLogsRoutes = require('./routes/auditLogs')
const { requireAuth, requireRole } = require('./middleware/auth')
const authRoutes = require('./routes/auth')
const passwordResetRoutes = require('./routes/passwordResets')
const backupRoutes = require('./routes/backup')

const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use('/api/auth', authRoutes)
app.use('/api/password-resets', passwordResetRoutes)
app.use('/api/backup', requireAuth, requireRole('Administrator'), backupRoutes)
app.use('/api/item-documents', itemDocumentsRoutes)

app.get('/', (req, res) => {
  res.json({
    message: 'Property Inventory API is running'
  })
})

app.use('/api/offices', requireAuth, requireRole('Administrator'), officesRoutes)
app.use('/api/personnel', requireAuth, requireRole('Administrator', 'Teacher', 'Non-Teaching Staff'), personnelRoutes)
app.use('/api/receipts', requireAuth, requireRole('Administrator'), receiptsRoutes)
app.use('/api/returns', requireAuth, requireRole('Administrator'), returnsRoutes)
app.use('/api/return-requests', requireAuth, requireRole('Administrator', 'Teacher', 'Non-Teaching Staff'), returnRequestsRoutes)
app.use('/api/item-lookup', requireAuth, requireRole('Administrator', 'Teacher', 'Non-Teaching Staff'), itemLookupRoutes)
app.use('/api/transfers', requireAuth, requireRole('Administrator'), transfersRoutes)
app.use('/api/property-transfer-requests', requireAuth, requireRole('Administrator', 'Teacher', 'Non-Teaching Staff'), propertyTransferRequestsRoutes)
app.use('/api/audit-logs', requireAuth, requireRole('Administrator', 'Teacher', 'Non-Teaching Staff'), auditLogsRoutes)
app.use('/api/items', requireAuth, requireRole('Administrator'), itemsRoutes)

const PORT = 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})