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


const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    message: 'Property Inventory API is running'
  })
})

app.use('/api/items', itemsRoutes)
app.use('/api/offices', officesRoutes)
app.use('/api/personnel', personnelRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/item-requests', itemRequestsRoutes)
app.use('/api/receipts', receiptsRoutes)
app.use('/api/returns', returnsRoutes)
app.use('/api/incidents', incidentsRoutes)
app.use('/api/audit-logs', auditLogsRoutes)

const PORT = 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})