<template>
  <div class="container-fluid backup-page">
    <div class="mb-4">
      <h1 class="h3 mb-1">Backup &amp; Restore</h1>
      <p class="text-secondary mb-0">
        Download a copy of your system records or restore records from a backup file.
      </p>
    </div>

    <div v-if="message.text" class="alert" :class="message.type" role="alert">
      {{ message.text }}
    </div>

    <div class="row g-4">
      <div class="col-12 col-xl-6">
        <div class="card h-100">
          <div class="card-body p-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="backup-icon"><i class="bi bi-cloud-download"></i></div>
              <div>
                <h2 class="h5 mb-1">Create Backup</h2>
                <p class="text-secondary small mb-0">Download your current database records.</p>
              </div>
            </div>

            <p class="small text-secondary">
              The backup contains the configured public system tables, including properties,
              users, requests, receipts, returns, transfers, incidents and audit logs.
            </p>

            <button
              type="button"
              class="btn btn-success"
              :disabled="downloading || restoring"
              @click="downloadBackup"
            >
              <span v-if="downloading" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-download me-2"></i>
              {{ downloading ? 'Creating backup...' : 'Download Backup' }}
            </button>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-6">
        <div class="card h-100">
          <div class="card-body p-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="backup-icon"><i class="bi bi-cloud-upload"></i></div>
              <div>
                <h2 class="h5 mb-1">Restore Backup</h2>
                <p class="text-secondary small mb-0">Add or update records using a backup file.</p>
              </div>
            </div>

            <label for="backupFile" class="form-label">Select backup JSON file</label>
            <input
              id="backupFile"
              ref="backupFile"
              type="file"
              class="form-control mb-3"
              accept=".json,application/json"
              :disabled="restoring || downloading"
              @change="readBackupFile"
            >

            <div v-if="selectedBackup" class="alert alert-light border small">
              <strong>Selected backup</strong><br>
              Created: {{ formatDate(selectedBackup.created_at) }}<br>
              Records in file: {{ selectedRecordCount }}
            </div>

            <div class="alert alert-warning small">
              <strong>Important:</strong> Restore first downloads a safety backup of the current
              records. It then adds missing records and updates records with matching IDs.
              It does not delete records that are not in the selected file.
            </div>

            <button
              type="button"
              class="btn btn-warning"
              :disabled="!selectedBackup || restoring || downloading"
              @click="restoreBackup"
            >
              <span v-if="restoring" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-arrow-counterclockwise me-2"></i>
              {{ restoring ? 'Restoring...' : 'Restore Selected Backup' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-body p-4">
        <h2 class="h6">Please remember</h2>
        <ul class="small text-secondary mb-0">
          <li>Only an Administrator can open this page and use these actions.</li>
          <li>Keep backup files in a safe place. They may contain staff and system records.</li>
          <li>This feature backs up public database records only. It does not include Supabase Auth passwords, uploaded Storage files, database functions, triggers, indexes or RLS policies.</li>
          <li>For a full database backup, also use a PostgreSQL backup from a trusted administrator environment.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BackupRestore',

  data() {
    return {
      selectedBackup: null,
      selectedRecordCount: 0,
      downloading: false,
      restoring: false,
      message: {
        text: '',
        type: 'alert-info'
      }
    }
  },

  methods: {
    getHeaders() {
      return {
        Authorization: 'Bearer ' + localStorage.getItem('accessToken')
      }
    },

    showMessage(text, type) {
      this.message.text = text
      this.message.type = type || 'alert-info'
    },

    formatDate(value) {
      if (!value) return 'Not specified'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleString()
    },

    async readBackupFile(event) {
      this.selectedBackup = null
      this.selectedRecordCount = 0
      this.showMessage('', 'alert-info')

      const file = event.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const backup = JSON.parse(text)

        if (
          !backup ||
          backup.format !== 'nvsu-property-backup' ||
          backup.version !== 1 ||
          !backup.tables ||
          typeof backup.tables !== 'object' ||
          Array.isArray(backup.tables)
        ) {
          throw new Error('This is not a valid NVSU system backup file.')
        }

        const tables = Object.values(backup.tables)
        if (tables.some(rows => !Array.isArray(rows))) {
          throw new Error('The backup file contains invalid table data.')
        }

        this.selectedRecordCount = tables.reduce(
          (total, rows) => total + rows.length,
          0
        )
        this.selectedBackup = backup
        this.showMessage('Backup file loaded and ready to restore.', 'alert-success')
      } catch (error) {
        this.$refs.backupFile.value = ''
        this.showMessage(error.message || 'Could not read the selected backup file.', 'alert-danger')
      }
    },

    async downloadBackupFile() {
      const response = await fetch('/api/backup', {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        let data = {}
        try {
          data = await response.json()
        } catch {
          data = {}
        }
        throw new Error(data.error || 'Failed to create backup.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'nvsu-property-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    },

    async downloadBackup() {
      this.downloading = true
      this.showMessage('', 'alert-info')

      try {
        await this.downloadBackupFile()
        this.showMessage('Backup downloaded successfully.', 'alert-success')
      } catch (error) {
        this.showMessage(error.message, 'alert-danger')
      } finally {
        this.downloading = false
      }
    },

    async restoreBackup() {
      if (!this.selectedBackup) return

      const confirmed = window.confirm(
        'Before restoring, the system will download a safety backup of the current records. Continue?'
      )

      if (!confirmed) return

      this.restoring = true
      this.showMessage('Creating a safety backup before restore...', 'alert-info')

      try {
        await this.downloadBackupFile()

        this.showMessage('Safety backup downloaded. Restoring selected records...', 'alert-info')

        const response = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.selectedBackup)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Restore failed.')
        }

        this.showMessage(
          data.message + ' Records processed: ' + data.restored_records +
          (data.audit_log_saved ? '. Action recorded in Audit Logs.' : '. Warning: the restore action could not be written to Audit Logs.'),
          'alert-success'
        )

        window.dispatchEvent(new Event('item-requests-updated'))
        window.dispatchEvent(new Event('receipts-updated'))
        window.dispatchEvent(new Event('return-requests-updated'))
      } catch (error) {
        this.showMessage(error.message || 'Restore failed.', 'alert-danger')
      } finally {
        this.restoring = false
      }
    }
  }
}
</script>

<style scoped>
.backup-page {
  padding: 4px 0 24px;
}

.backup-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #edf4e9;
  color: #2f5d3a;
  font-size: 23px;
}

.backup-page .card {
  border-color: #e3e8df;
  border-radius: 10px;
}

.backup-page .alert {
  overflow-wrap: anywhere;
}
</style>
