<template>
  <div class="audit-page">
    <div class="page-header">
      <div>
        <h2>Audit Logs</h2>
        <p>View system activity and changes.</p>
      </div>
    </div>

    <div class="audit-card">
      <div v-if="loading" class="loading">
        Loading audit logs...
      </div>

      <div v-else-if="logs.length === 0" class="empty">
        No audit logs found.
      </div>

      <div v-else class="table-responsive">
        <table class="table audit-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Item</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ formatDate(log.created_at) }}</td>

              <td>
                <span
                  class="action-badge"
                  :class="getActionClass(log.action)"
                >
                  {{ log.action }}
                </span>
              </td>

              <td>
                {{ getItemName(log) }}
              </td>

              <td>
                <div
                  v-if="isItemLog(log) && (log.old_value || log.new_value)"
                  class="details-dropdown"
                >
                  <button
                    type="button"
                    class="details-button"
                    @click="toggleDetails(log.id)"
                  >
                    <span>View item details</span>

                    <i
                      class="bi bi-chevron-down"
                      :class="{ rotated: openedLog === log.id }"
                    ></i>
                  </button>

                  <div
                    class="details-wrapper"
                    :class="{ open: openedLog === log.id }"
                  >
                    <div class="details-content">
                      <div v-if="log.old_value">
                        <strong>
                          {{ log.action === 'Deleted' ? 'Deleted item' : 'Before' }}
                        </strong>

                        <div class="detail-grid">
                          <div
                            v-for="entry in detailEntries(log.old_value)"
                            :key="entry.key"
                            class="detail-field"
                          >
                            <span>{{ formatLabel(entry.key) }}</span>
                            <strong>{{ entry.value }}</strong>
                          </div>
                        </div>
                      </div>

                      <div v-if="log.new_value">
                        <strong>
                          {{ log.action === 'Created' ? 'Added item' : 'After' }}
                        </strong>

                        <div class="detail-grid">
                          <div
                            v-for="entry in detailEntries(log.new_value)"
                            :key="entry.key"
                            class="detail-field"
                          >
                            <span>{{ formatLabel(entry.key) }}</span>
                            <strong>{{ entry.value }}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <span v-else class="no-details">
                  {{ log.description || '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="toast.show" class="toast-message">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuditLogs',

  data() {
    return {
      logs: [],
      loading: false,
      openedLog: null,

      toast: {
        show: false,
        message: ''
      }
    }
  },

  mounted() {
    this.getLogs()
  },

  methods: {
    async getLogs() {
      this.loading = true

      try {
        const token = localStorage.getItem('accessToken')

        const response = await fetch(
          'http://localhost:5000/api/audit-logs',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load audit logs')
        }

        this.logs = data
      } catch (error) {
        console.error(error)

        this.showToast(error.message)
      } finally {
        this.loading = false
      }
    },

    isItemLog(log) {
      const description = (log.description || '').toLowerCase()

      return description.includes('item')
    },

    getItemName(log) {
      if (log.item) {
        return (
          log.item.description ||
          log.item.property_number ||
          '-'
        )
      }

      if (log.description) {
        const description = log.description

        if (description.toLowerCase().includes('item:')) {
          return description.split(':')[1]?.trim() || '-'
        }
      }

      return '-'
    },

    detailEntries(value) {
      if (!value) {
        return []
      }

      let parsed = value

      try {
        parsed =
          typeof value === 'string'
            ? JSON.parse(value)
            : value
      } catch {
        return []
      }

      const allowedKeys = [
        'property_number',
        'description',
        'serial_number',
        'supplier_id',
        'cost',
        'acquisition_date',
        'classification',
        'condition',
        'status',
        'accountable_employee',
        'responsibility_center'
      ]

      return Object.entries(parsed)
        .filter(([key]) => allowedKeys.includes(key))
        .map(([key, value]) => ({
          key: key,
          value:
            value === null ||
            value === undefined ||
            value === ''
              ? '-'
              : value
        }))
    },

    formatLabel(key) {
      const labels = {
        property_number: 'Property No.',
        description: 'Description',
        serial_number: 'Serial Number',
        supplier_id: 'Supplier',
        cost: 'Cost',
        acquisition_date: 'Acquisition Date',
        classification: 'Classification',
        condition: 'Condition',
        status: 'Status',
        accountable_employee: 'Accountable Employee',
        responsibility_center: 'Responsibility Center'
      }

      return labels[key] || key
    },

    formatDate(date) {
      if (!date) {
        return '-'
      }

      return new Date(date).toLocaleString()
    },

    getActionClass(action) {
      if (action === 'Created') {
        return 'created'
      }

      if (action === 'Updated') {
        return 'updated'
      }

      if (action === 'Deleted') {
        return 'deleted'
      }

      return ''
    },

    toggleDetails(id) {
      if (this.openedLog === id) {
        this.openedLog = null
      } else {
        this.openedLog = id
      }
    },

    showToast(message) {
      this.toast.message = message
      this.toast.show = true

      setTimeout(() => {
        this.toast.show = false
      }, 3000)
    }
  }
}
</script>

<style scoped>
.audit-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #2f5d3a;
  font-size: 26px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: #6c757d;
  font-size: 14px;
}

.audit-card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.audit-table {
  width: 100%;
  margin: 0;
  vertical-align: middle;
}

.audit-table th {
  color: #2f5d3a;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: 2px solid #dee2e6;
}

.audit-table td {
  vertical-align: top;
  padding: 14px 10px;
}

.action-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
}

.action-badge.created {
  background: #e8f5e9;
  color: #2e7d32;
}

.action-badge.updated {
  background: #fff8e1;
  color: #8a6d00;
}

.action-badge.deleted {
  background: #fdecea;
  color: #c62828;
}

.details-dropdown {
  width: 100%;
  position: relative;
}

.details-button {
  width: 160px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  background: white;
  color: #2f5d3a;
  font-size: 13px;
  cursor: pointer;
}

.details-button:hover {
  background: #f8f9fa;
}

.details-button i {
  font-size: 11px;
  transition: transform 0.3s ease;
}

.details-button i.rotated {
  transform: rotate(180deg);
}

.details-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.35s ease,
    opacity 0.25s ease;
  width: 100%;
}

.details-wrapper.open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.details-wrapper > .details-content {
  overflow: hidden;
  min-width: 0;
}

.details-content {
  width: 100%;
  margin-top: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(130px, 1fr));
  gap: 8px;
  margin: 8px 0 14px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #f8f9fa;
}

.detail-field span {
  color: #6c757d;
  font-size: 11px;
}

.detail-field strong {
  overflow-wrap: anywhere;
  font-size: 13px;
}

.no-details {
  color: #6c757d;
  font-size: 13px;
}

.loading {
  padding: 30px;
  text-align: center;
  color: #6c757d;
}

.empty {
  padding: 30px;
  text-align: center;
  color: #6c757d;
}

.toast-message {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  padding: 12px 18px;
  background: #2f5d3a;
  color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
}

@media (max-width: 768px) {
  .audit-page {
    padding: 15px;
  }

  .audit-card {
    padding: 12px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .details-content {
    min-width: 500px;
  }
}
</style>