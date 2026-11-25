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

      <div v-else class="audit-content">
        <div class="table-toolbar">
          <input
            v-model="search"
            type="text"
            class="form-control search-input"
            placeholder="Search audit logs..."
          />

          <select
            v-model="actionFilter"
            class="form-select filter-select"
          >
            <option value="">All Actions</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Accepted">Accepted</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Issued">Issued</option>
            <option value="Transferred">Transferred</option>
            <option value="Returned">Returned</option>
            <option value="Reported">Reported</option>
            <option value="Password Changed">Password Changed</option>
            <option value="Created">Created</option>
            <option value="Updated">Updated</option>
            <option value="Deleted">Deleted</option>
          </select>

          <select
            v-model.number="itemsPerPage"
            class="form-select page-size-select"
          >
            <option :value="5">5 per page</option>
            <option :value="10">10 per page</option>
            <option :value="25">25 per page</option>
            <option :value="50">50 per page</option>
          </select>
        </div>

        <div v-if="filteredLogs.length === 0" class="empty">
          No audit logs found.
        </div>

        <div v-else class="table-responsive">
          <table class="table audit-table">
            <thead>
              <tr>
                <th
                  class="sortable text-start"
                  @click="sortBy('created_at')"
                >
                  Date &amp; Time
                  <i :class="getSortIcon('created_at')"></i>
                </th>

                <th
                  class="sortable text-start"
                  @click="sortBy('action')"
                >
                  Action
                  <i :class="getSortIcon('action')"></i>
                </th>

                <th
                  class="sortable text-start"
                  @click="sortBy('item')"
                >
                  Item
                  <i :class="getSortIcon('item')"></i>
                </th>

                <th class="text-start">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="log in paginatedLogs"
                :key="log.id"
              >
                <td>
                  {{ formatDate(log.created_at) }}
                </td>

                <td>
                  <div class="audit-action-cell">
                    <span
                      class="action-badge"
                      :class="getActionClass(log.action)"
                    >
                      {{ formatAction(log.action) }}
                    </span>
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="viewLogDetails(log)"
                    >
                      <i class="bi bi-eye me-1"></i>
                      Details
                    </button>
                  </div>
                </td>

                <td>
                  {{ getItemName(log) }}
                </td>

                <td class="audit-summary-cell">
                  {{ log.description || 'Activity recorded' }}
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredLogs.length > 0"
          class="table-footer"
        >
          <span>
            Showing {{ firstLogNumber }} to {{ lastLogNumber }}
            of {{ filteredLogs.length }} logs
          </span>

          <div class="pagination-controls">
            <button
              class="page-button"
              :disabled="currentPage === 1"
              @click="previousPage"
            >
              Previous
            </button>

            <button
              v-for="page in totalPages"
              :key="page"
              class="page-button"
              :class="{ active: currentPage === page }"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>

            <button
              class="page-button"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="toast.show"
      class="toast-message"
    >
      {{ toast.message }}
    </div>

    <div class="modal fade" id="logDetailsModal" tabindex="-1" aria-labelledby="logDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="logDetailsModalLabel" class="modal-title">Audit Log Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div v-if="selectedLog" class="modal-body">
            <p><strong>Date:</strong> {{ formatDate(selectedLog.created_at) }}</p>
            <p><strong>Action:</strong> {{ formatAction(selectedLog.action) }}</p>
            <p><strong>Item:</strong> {{ getItemName(selectedLog) }}</p>
            <p><strong>Details:</strong> {{ selectedLog.description || '-' }}</p>
            <button
              v-if="canDeleteAuditLogs"
              type="button"
              class="btn btn-outline-danger btn-sm mb-3"
              title="Delete this audit log"
              @click="deleteSelectedLog"
            >
              <i class="bi bi-trash me-1"></i>Delete this audit log
            </button>
            <div v-if="detailEntries(selectedLog.old_value).length" class="mb-3">
              <strong>
                {{
                  formatAction(selectedLog.action) === 'Deleted'
                    ? 'Deleted record'
                    : 'Before'
                }}
              </strong>
              <div class="detail-grid">
                <div v-for="entry in detailEntries(selectedLog.old_value)" :key="entry.key" class="detail-field">
                  <span>{{ formatLabel(entry.key) }}</span>
                  <strong>{{ entry.value }}</strong>
                </div>
              </div>
            </div>
            <div v-if="detailEntries(selectedLog.new_value).length">
              <strong>{{ formatAction(selectedLog.action) === 'Created' ? 'Added record' : 'After' }}</strong>
              <div class="detail-grid">
                <div v-for="entry in detailEntries(selectedLog.new_value)" :key="entry.key" class="detail-field">
                  <span>{{ formatLabel(entry.key) }}</span>
                  <strong>{{ entry.value }}</strong>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'AuditLogs',

  data() {
    return {
      logs: [],
      selectedLog: null,
      loading: false,
      openedLog: null,

      search: '',
      actionFilter: '',
      currentPage: 1,
      itemsPerPage: 10,
      sortColumn: 'created_at',
      sortDirection: 'desc',

      toast: {
        show: false,
        message: ''
      }
    }
  },

  mounted() {
    this.getLogs()
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    actionFilter() {
      this.currentPage = 1
    },

    itemsPerPage() {
      this.currentPage = 1
    }
  },

  computed: {
    canDeleteAuditLogs() {
      const user = JSON.parse(
        localStorage.getItem('user') || 'null'
      )

      return user?.role === 'Administrator'
    },

    filteredLogs() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.logs.filter(log => {
        const actionMatch =
          !this.actionFilter ||
          this.formatAction(log.action) === this.actionFilter

        const searchableText = [
          this.formatDate(log.created_at),
          log.action,
          this.getItemName(log),
          log.description,
          ...this.detailEntries(log.old_value).map(entry => entry.value),
          ...this.detailEntries(log.new_value).map(entry => entry.value)
        ]
          .join(' ')
          .toLowerCase()

        return (
          actionMatch &&
          (
            !searchText ||
            searchableText.includes(searchText)
          )
        )
      })

      return [...filtered].sort((firstLog, secondLog) => {
        let firstValue = this.getSortValue(
          firstLog,
          this.sortColumn
        )

        let secondValue = this.getSortValue(
          secondLog,
          this.sortColumn
        )

        if (this.sortColumn === 'created_at') {
          firstValue = new Date(firstValue).getTime() || 0
          secondValue = new Date(secondValue).getTime() || 0
        } else {
          firstValue = String(firstValue || '').toLowerCase()
          secondValue = String(secondValue || '').toLowerCase()
        }

        if (firstValue < secondValue) {
          return this.sortDirection === 'asc' ? -1 : 1
        }

        if (firstValue > secondValue) {
          return this.sortDirection === 'asc' ? 1 : -1
        }

        return 0
      })
    },

    totalPages() {
      return Math.ceil(
        this.filteredLogs.length / this.itemsPerPage
      ) || 1
    },

    paginatedLogs() {
      const start =
        (this.currentPage - 1) * this.itemsPerPage

      return this.filteredLogs.slice(
        start,
        start + this.itemsPerPage
      )
    },

    firstLogNumber() {
      if (this.filteredLogs.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) * this.itemsPerPage
      ) + 1
    },

    lastLogNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredLogs.length
      )
    }
  },

  methods: {
    viewLogDetails(log) {
      this.selectedLog = log
      Modal.getOrCreateInstance(
        document.getElementById('logDetailsModal')
      ).show()
    },

    deleteSelectedLog() {
      if (!this.selectedLog || !this.canDeleteAuditLogs) return
      const id = this.selectedLog.id
      this.deleteLog(id)
    },

    async getLogs() {
      this.loading = true

      try {
        const token = localStorage.getItem('accessToken')

        const response = await fetch(
          '/api/audit-logs',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load audit logs'
          )
        }

        this.logs = data
      } catch (error) {
        console.error(error)
        this.showToast(error.message)
      } finally {
        this.loading = false
      }
    },

    async deleteLog(id) {
      if (
        !confirm(
          'Are you sure you want to delete this audit log?'
        )
      ) {
        return
      }

      try {
        const token = localStorage.getItem('accessToken')

        const response = await fetch(
          `/api/audit-logs/${id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        let data = {}

        try {
          data = await response.json()
        } catch {
          data = {}
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
            'Failed to delete audit log.'
          )
        }

        this.logs = this.logs.filter(log => log.id !== id)

        if (this.selectedLog?.id === id) {
          Modal.getInstance(
            document.getElementById('logDetailsModal')
          )?.hide()
          this.selectedLog = null
        }

        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages
        }

        this.showToast('Audit log deleted')
      } catch (error) {
        console.error(error)
        this.showToast(error.message)
      }
    },

    getSortValue(log, column) {
      if (column === 'created_at') {
        return log.created_at
      }

      if (column === 'action') {
        return log.action
      }

      if (column === 'item') {
        return this.getItemName(log)
      }

      return ''
    },

    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection =
          this.sortDirection === 'asc'
            ? 'desc'
            : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }

      this.currentPage = 1
    },

    getSortIcon(column) {
      if (this.sortColumn !== column) {
        return 'bi bi-arrow-down-up sort-icon'
      }

      return this.sortDirection === 'asc'
        ? 'bi bi-arrow-up sort-icon'
        : 'bi bi-arrow-down sort-icon'
    },

    goToPage(page) {
      if (
        page >= 1 &&
        page <= this.totalPages
      ) {
        this.currentPage = page
      }
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },

    hasStructuredDetails(log) {
      return this.detailEntries(log.old_value).length > 0 ||
        this.detailEntries(log.new_value).length > 0
    },

    getItemName(log) {
      if (log.item) {
        return (
          log.item.description ||
          log.item.property_number ||
          '-'
        )
      }

      const parsedValues = this.parseLogValue(log.new_value) ||
        this.parseLogValue(log.old_value)
      const values = Array.isArray(parsedValues)
        ? parsedValues[0]
        : parsedValues

      if (values?.description) {
        return values.description
      }

      if (values?.property_number) {
        return values.property_number
      }

      if (values?.item_description) {
        return values.item_description
      }

      if (values?.request_number) {
        return values.request_number
      }

      if (log.description && /property transfer request/i.test(log.description)) {
        return 'Property transfer request'
      }

      if (log.description) {
        const description = log.description

        if (
          description
            .toLowerCase()
            .includes('item:')
        ) {
          return (
            description.split(':')[1]?.trim() || '-'
          )
        }
      }

      return '-'
    },

    parseLogValue(value) {
      if (!value) {
        return null
      }

      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return null
      }
    },

    detailEntries(value) {
      if (!value) {
        return []
      }

      const parsedValue = this.parseLogValue(value)
      const records = Array.isArray(parsedValue) ? parsedValue : [parsedValue]
      const ignoredKeys = new Set([
        'id',
        'auth_user_id',
        'created_at',
        'updated_at',
        'reviewed_by',
        'request_id',
        'property_receipt_ids',
        'property_receipt_id'
      ])

      return records.flatMap((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          return []
        }

        const flatten = (value, prefix = '', depth = 0) => {
          if (!value || typeof value !== 'object') {
            return [{ key: prefix, value: this.formatDetailValue(value) }]
          }

          if (Array.isArray(value)) {
            return value.flatMap((entry, entryIndex) =>
              flatten(entry, `${prefix} ${entryIndex + 1}`, depth + 1)
            )
          }

          if (depth >= 2) {
            return [{ key: prefix, value: this.formatDetailValue(value) }]
          }

          return Object.entries(value).flatMap(([key, entry]) => {
            if (
              ignoredKeys.has(key.toLowerCase()) ||
              /(^id$|_id$|_ids$|password|token|secret|credential)/i.test(key)
            ) {
              return []
            }

            return flatten(entry, prefix ? `${prefix}.${key}` : key, depth + 1)
          })
        }

        return Object.entries(record).flatMap(([key, entry]) => {
          if (
            ignoredKeys.has(key.toLowerCase()) ||
            /(^id$|_id$|_ids$|password|token|secret|credential)/i.test(key)
          ) {
            return []
          }

          return flatten(
            entry,
            records.length > 1 ? `Record ${index + 1}.${key}` : key,
            1
          )
        })
      })
    },

    formatDetailValue(value) {
      if (value === null || value === undefined || value === '') {
        return '-'
      }

      if (typeof value === 'object') {
        return Array.isArray(value)
          ? value.map(entry => String(entry)).join(', ')
          : Object.keys(value).length
            ? '[Details]'
            : '-'
      }

      return String(value)
    },

    formatLabel(key) {
      const labels = {
        property_number: 'Property No.',
        records_count: 'Records',
        description: 'Description',
        serial_number: 'Serial Number',
        cost: 'Cost',
        acquisition_date: 'Acquisition Date',
        classification: 'Classification',
        condition: 'Condition',
        status: 'Status',
        accountable_employee: 'Accountable Employee',
        responsibility_center: 'Responsibility Center',
        request_number: 'Request Number',
        item_description: 'Requested Item',
        quantity: 'Quantity',
        old_quantity: 'Previous Quantity',
        new_quantity: 'Updated Quantity',
        purpose: 'Purpose',
        receipt_number: 'Receipt No.',
        receipt_type: 'Receipt Type',
        date_issued: 'Date Issued',
        return_date: 'Return Date',
        transfer_date: 'Transfer Date',
        transfer_type: 'Transfer Type',
        from_employee: 'From Employee',
        to_employee: 'To Employee',
        from_office: 'From Office',
        to_office: 'To Office',
        condition_declared: 'Reported Condition',
        condition_after_return: 'Condition After Return',
        condition_after_transfer: 'Condition After Transfer',
        resulting_status: 'Resulting Status',
        return_reason: 'Return Reason',
        reason: 'Reason',
        review_remarks: 'Review Remarks',
        remarks: 'Remarks',
        office_name: 'Office',
        supplier: 'Supplier'
      }

      return labels[key] || key
        .replace(/\./g, ' / ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, character => character.toUpperCase())
    },

    formatDate(date) {
      if (!date) {
        return '-'
      }

      return new Date(date).toLocaleString()
    },

    getActionClass(action) {
      const normalizedAction = this.formatAction(action)

      if ([
        'Created',
        'Requested',
        'Approved',
        'Accepted',
        'Issued',
        'Transferred',
        'Returned',
        'Reported'
      ].includes(normalizedAction)) {
        return 'created'
      }

      if (['Updated', 'Password Changed'].includes(normalizedAction)) {
        return 'updated'
      }

      if (['Deleted', 'Rejected', 'Cancelled'].includes(normalizedAction)) {
        return 'deleted'
      }

      return ''
    },

    formatAction(action) {
      const normalizedAction = String(action || '').trim().toLowerCase()
      const labels = {
        create: 'Created',
        created: 'Created',
        requested: 'Requested',
        approved: 'Approved',
        rejected: 'Rejected',
        accepted: 'Accepted',
        cancelled: 'Cancelled',
        canceled: 'Cancelled',
        issued: 'Issued',
        transferred: 'Transferred',
        returned: 'Returned',
        reported: 'Reported',
        'password changed': 'Password Changed',
        update: 'Updated',
        updated: 'Updated',
        delete: 'Deleted',
        deleted: 'Deleted'
      }

      return labels[normalizedAction] || action || '-'
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

.table-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 220px;
}

.filter-select {
  width: 180px;
}

.page-size-select {
  width: 150px;
}

.audit-table {
  width: 100%;
  margin: 0;
  vertical-align: middle;
}

.audit-table thead th {
  background-color: #2f5d3a;
  color: white;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: none;
}

.audit-table td {
  text-align: left;
  vertical-align: middle;
  padding: 14px 10px;
}

.sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.audit-table thead th.sortable:hover {
  background-color: #244a2e;
}

.sort-icon {
  margin-left: 5px;
  font-size: 12px;
}

.action-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
}

.action-badge.created {
  background: #2f5d3a;
  color: #ffffff;
}

.action-badge.updated {
  background: #e8c547;
  color: #2f5d3a;
}

.action-badge.deleted {
  background: #dc3545;
  color: #ffffff;
}

.audit-summary-cell{min-width:180px;max-width:360px;white-space:normal;overflow-wrap:anywhere}

.audit-action-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding-top: 18px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #6b7280;
}

.pagination-controls {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.page-button {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}

.page-button:hover:not(:disabled),
.page-button.active {
  background: #2f5d3a;
  border-color: #2f5d3a;
  color: #ffffff;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-input,
  .filter-select,
  .page-size-select {
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .details-content {
    min-width: 500px;
  }

  .table-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>