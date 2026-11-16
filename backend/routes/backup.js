const express = require('express')
const router = express.Router()

const {
  getSupabaseAdmin,
  isAdminAuthorizationError,
  adminCredentialsError
} = require('../supabaseAdmin')

// Keep this list aligned with the supplied NVSU database schema.
// Parent tables are placed before tables that refer to them.
const BACKUP_TABLES = [
  'offices',
  'suppliers',
  'users',
  'items',
  'item_requests',
  'property_receipts',
  'item_returns',
  'incidents',
  'item_transfers',
  'return_requests',
  'account_requests',
  'password_reset_requests',
  'audit_logs'
]

const BACKUP_FORMAT = 'nvsu-property-backup'
const BACKUP_VERSION = 1

async function readAllRows(client, table) {
  const rows = []
  const pageSize = 1000
  let start = 0

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(start, start + pageSize - 1)

    if (error) throw new Error(table + ': ' + error.message)

    const page = data || []
    rows.push(...page)

    if (page.length < pageSize) break
    start += pageSize
  }

  return rows
}

async function createBackup(client) {
  const tables = {}

  for (const table of BACKUP_TABLES) {
    tables[table] = await readAllRows(client, table)
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    created_by: 'NVSU Property and Supply Management System',
    tables
  }
}

function getAdminClient(res) {
  const client = getSupabaseAdmin()

  if (!client) {
    res.status(503).json({
      error: 'Backup and restore are unavailable. Configure SUPABASE_SERVICE_ROLE_KEY in the backend environment and restart the backend.'
    })
    return null
  }

  return client
}

// Download a complete JSON backup of the configured public tables.
router.get('/', async (req, res) => {
  const client = getAdminClient(res)
  if (!client) return

  try {
    const backup = await createBackup(client)

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="nvsu-property-backup-' +
        new Date().toISOString().slice(0, 10) +
        '.json"'
    )
    res.setHeader('Content-Type', 'application/json')
    return res.json(backup)
  } catch (error) {
    console.error('BACKUP ERROR:', error)
    return res.status(500).json({
      error: 'Backup failed: ' + error.message
    })
  }
})

// Restore is intentionally merge-only. Existing rows with the same ID are
// updated; rows not included in the file are not deleted.
router.post('/restore', async (req, res) => {
  const client = getAdminClient(res)
  if (!client) return

  const backup = req.body

  if (
    !backup ||
    backup.format !== BACKUP_FORMAT ||
    backup.version !== BACKUP_VERSION ||
    !backup.tables ||
    typeof backup.tables !== 'object' ||
    Array.isArray(backup.tables)
  ) {
    return res.status(400).json({
      error: 'Invalid backup file. Please select a JSON backup created by this system.'
    })
  }

  for (const table of BACKUP_TABLES) {
    if (
      backup.tables[table] !== undefined &&
      !Array.isArray(backup.tables[table])
    ) {
      return res.status(400).json({
        error: 'Invalid backup data for table: ' + table
      })
    }
  }

  const unknownTables = Object.keys(backup.tables).filter(
    table => !BACKUP_TABLES.includes(table)
  )

  if (unknownTables.length) {
    return res.status(400).json({
      error: 'The backup contains unsupported tables: ' + unknownTables.join(', ')
    })
  }

  // Validate every record before writing anything, so a malformed later
  // table does not cause an avoidable partial restore.
  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table] || []

    if (rows.some(row =>
      !row ||
      typeof row !== 'object' ||
      Array.isArray(row) ||
      !row.id
    )) {
      return res.status(400).json({
        error: 'The backup contains a record without an ID in table: ' + table
      })
    }
  }

  try {
    let restoredRecords = 0

    for (const table of BACKUP_TABLES) {
      const rows = backup.tables[table] || []

      if (!rows.length) continue

      for (let index = 0; index < rows.length; index += 500) {
        const batch = rows.slice(index, index + 500)

        const { error } = await client
          .from(table)
          .upsert(batch, { onConflict: 'id' })

        if (error) {
          if (isAdminAuthorizationError(error)) {
            return res.status(503).json({ error: adminCredentialsError })
          }

          console.error('RESTORE TABLE ERROR (' + table + '):', error)
          return res.status(500).json({
            error:
              'Restore stopped at table "' + table + '". ' +
              'Some earlier records may already have been restored. ' +
              'Your downloaded safety backup can be used to recover them. ' +
              error.message,
            failed_table: table,
            restored_records: restoredRecords
          })
        }

        restoredRecords += batch.length
      }
    }

    const { error: auditError } = await client
      .from('audit_logs')
      .insert({
        action: 'Restored',
        description: 'Administrator restored ' + restoredRecords +
          ' records from a system JSON backup.',
        user_id: req.profile.id,
        new_value: JSON.stringify({
          restored_records: restoredRecords,
          backup_created_at: backup.created_at || null
        })
      })

    if (auditError) {
      console.error('RESTORE AUDIT LOG ERROR:', auditError)
    }

    return res.json({
      message: 'Restore completed. Existing records were updated or added.',
      restored_records: restoredRecords,
      audit_log_saved: !auditError
    })
  } catch (error) {
    console.error('RESTORE ERROR:', error)
    return res.status(500).json({
      error: 'Restore failed: ' + error.message
    })
  }
})

module.exports = router
