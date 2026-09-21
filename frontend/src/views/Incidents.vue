<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Incidents</h2>
        <p class="text-muted">Manage property incidents</p>
      </div>

      <button class="btn btn-warning" @click="openAddModal">
        + Add Incident
      </button>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-toolbar">
          <input
            v-model="search"
            type="text"
            class="form-control search-input"
            placeholder="Search incidents..."
          />

          <select v-model="incidentTypeFilter" class="form-select filter-select">
            <option value="">All Incident Types</option>
            <option value="Lost">Lost</option>
            <option value="Damaged">Damaged</option>
            <option value="Missing">Missing</option>
            <option value="Stolen">Stolen</option>
            <option value="Other">Other</option>
          </select>

          <select v-model="statusFilter" class="form-select filter-select">
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select v-model.number="itemsPerPage" class="form-select page-size-select">
            <option :value="5">5 per page</option>
            <option :value="10">10 per page</option>
            <option :value="25">25 per page</option>
            <option :value="50">50 per page</option>
          </select>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th class="sortable" @click="sortBy('item')">
                  Item
                  <i :class="getSortIcon('item')"></i>
                </th>

                <th class="sortable" @click="sortBy('reported_by')">
                  Reported By
                  <i :class="getSortIcon('reported_by')"></i>
                </th>

                <th class="sortable" @click="sortBy('incident_type')">
                  Incident Type
                  <i :class="getSortIcon('incident_type')"></i>
                </th>

                <th class="sortable" @click="sortBy('incident_date')">
                  Date
                  <i :class="getSortIcon('incident_date')"></i>
                </th>

                <th class="sortable" @click="sortBy('status')">
                  Status
                  <i :class="getSortIcon('status')"></i>
                </th>

                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="incident in paginatedIncidents"
                :key="incident.id"
              >
                <td>
                  {{ incident.items?.description || '-' }}
                </td>

                <td>
                  {{ incident.personnel?.full_name || incident.users?.full_name || '-' }}
                </td>

                <td>
                  {{ incident.incident_type || '-' }}
                </td>

                <td>
                  {{ incident.incident_date || '-' }}
                </td>

                <td>
                  <span class="badge bg-secondary">
                    {{ incident.status || '-' }}
                  </span>
                </td>

                <td>
                  {{ incident.description || '-' }}
                </td>

                <td>
                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="editIncident(incident)"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteIncident(incident.id)"
                  >
                    Delete
                  </button>
                </td>
              </tr>

              <tr v-if="filteredIncidents.length === 0">
                <td colspan="7" class="text-center text-muted py-4">
                  No incidents found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredIncidents.length > 0" class="table-footer">
          <span>
            Showing {{ firstIncidentNumber }} to {{ lastIncidentNumber }}
            of {{ filteredIncidents.length }} incidents
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
      class="modal fade"
      id="incidentModal"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editing ? 'Edit Incident' : 'Add Incident' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveIncident">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">
                  Item
                </label>

                <select
                  class="form-select"
                  v-model="form.item_id"
                  required
                >
                  <option value="">
                    Select Item
                  </option>

                  <option
                    v-for="item in items"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.description }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Reported By
                </label>

                <select
                  class="form-select"
                  v-model="form.reported_by"
                >
                  <option value="">
                    Select Personnel
                  </option>

                  <option
                    v-for="person in personnel"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.full_name }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Incident Type
                </label>

                <select
                  class="form-select"
                  v-model="form.incident_type"
                  required
                >
                  <option value="Lost">Lost</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Missing">Missing</option>
                  <option value="Stolen">Stolen</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Incident Date
                </label>

                <input
                  type="date"
                  class="form-control"
                  v-model="form.incident_date"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Status
                </label>

                <select
                  class="form-select"
                  v-model="form.status"
                  required
                >
                  <option value="Open">Open</option>
                  <option value="Under Investigation">
                    Under Investigation
                  </option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Description
                </label>

                <textarea
                  class="form-control"
                  rows="4"
                  v-model="form.description"
                  required
                ></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Action Taken
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.action_taken"
                ></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Remarks
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.remarks"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-warning"
                :disabled="saving"
              >
                {{ saving ? 'Saving...' : 'Save Incident' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'Incidents',

  data() {
    return {
      incidents: [],
      items: [],
      personnel: [],
      editing: false,
      saving: false,
      search: '',
      incidentTypeFilter: '',
      statusFilter: '',
      currentPage: 1,
      itemsPerPage: 10,
      sortColumn: 'incident_date',
      sortDirection: 'desc',

      form: {
        id: null,
        item_id: '',
        reported_by: '',
        incident_type: 'Lost',
        incident_date: '',
        status: 'Open',
        description: '',
        action_taken: '',
        remarks: ''
      }
    }
  },

  mounted() {
    this.getIncidents()
    this.getItems()
    this.getPersonnel()
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    incidentTypeFilter() {
      this.currentPage = 1
    },

    statusFilter() {
      this.currentPage = 1
    },

    itemsPerPage() {
      this.currentPage = 1
    }
  },

  computed: {
    filteredIncidents() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.incidents.filter(incident => {
        const typeMatch =
          !this.incidentTypeFilter ||
          incident.incident_type === this.incidentTypeFilter

        const statusMatch =
          !this.statusFilter ||
          incident.status === this.statusFilter

        const searchableText = [
          incident.items?.description,
          incident.personnel?.full_name,
          incident.users?.full_name,
          incident.incident_type,
          incident.incident_date,
          incident.status,
          incident.description,
          incident.action_taken,
          incident.remarks
        ].join(' ').toLowerCase()

        return (
          typeMatch &&
          statusMatch &&
          (!searchText || searchableText.includes(searchText))
        )
      })

      return [...filtered].sort((firstIncident, secondIncident) => {
        let firstValue = this.getSortValue(
          firstIncident,
          this.sortColumn
        )

        let secondValue = this.getSortValue(
          secondIncident,
          this.sortColumn
        )

        if (this.sortColumn === 'incident_date') {
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
        this.filteredIncidents.length / this.itemsPerPage
      ) || 1
    },

    paginatedIncidents() {
      const start =
        (this.currentPage - 1) * this.itemsPerPage

      return this.filteredIncidents.slice(
        start,
        start + this.itemsPerPage
      )
    },

    firstIncidentNumber() {
      if (this.filteredIncidents.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) * this.itemsPerPage + 1
      )
    },

    lastIncidentNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredIncidents.length
      )
    }
  },

  methods: {
    getSortValue(incident, column) {
      if (column === 'item') {
        return incident.items?.description || ''
      }

      if (column === 'reported_by') {
        return (
          incident.personnel?.full_name ||
          incident.users?.full_name ||
          ''
        )
      }

      return incident[column] || ''
    },

    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection =
          this.sortDirection === 'asc' ? 'desc' : 'asc'
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
      if (page >= 1 && page <= this.totalPages) {
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

    async getIncidents() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/incidents'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load incidents'
          )
        }

        this.incidents = data
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getItems() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/items'
        )

        const data = await response.json()

        if (response.ok) {
          this.items = data
        } else {
          throw new Error(
            data.error || 'Failed to load items'
          )
        }
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getPersonnel() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/personnel'
        )

        const data = await response.json()

        if (response.ok) {
          this.personnel = data
        } else {
          throw new Error(
            data.error || 'Failed to load personnel'
          )
        }
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        item_id: '',
        reported_by: '',
        incident_type: 'Lost',
        incident_date:
          new Date().toISOString().split('T')[0],
        status: 'Open',
        description: '',
        action_taken: '',
        remarks: ''
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('incidentModal')
        )

      modal.show()
    },

    editIncident(incident) {
      this.editing = true

      this.form = {
        id: incident.id,
        item_id: incident.item_id,
        reported_by:
          incident.reported_by || '',
        incident_type:
          incident.incident_type,
        incident_date:
          incident.incident_date || '',
        status:
          incident.status,
        description:
          incident.description || '',
        action_taken:
          incident.action_taken || '',
        remarks:
          incident.remarks || ''
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('incidentModal')
        )

      modal.show()
    },

    async saveIncident() {
      this.saving = true

      try {
        let url =
          'http://localhost:5000/api/incidents'

        let method = 'POST'

        if (this.editing) {
          url =
            `http://localhost:5000/api/incidents/${this.form.id}`

          method = 'PUT'
        }

        const response = await fetch(url, {
          method: method,

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            item_id:
              this.form.item_id,

            reported_by:
              this.form.reported_by || null,

            incident_type:
              this.form.incident_type,

            incident_date:
              this.form.incident_date,

            status:
              this.form.status,

            description:
              this.form.description,

            action_taken:
              this.form.action_taken,

            remarks:
              this.form.remarks
          })
        })

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to save incident'
          )
        }

        const modal =
          Modal.getOrCreateInstance(
            document.getElementById('incidentModal')
          )

        modal.hide()

        await this.getIncidents()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Incident updated successfully'
              : 'Incident added successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      } finally {
        this.saving = false
      }
    },

    async deleteIncident(id) {
      if (
        !confirm(
          'Are you sure you want to delete this incident?'
        )
      ) {
        return
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/incidents/${id}`,
          {
            method: 'DELETE'
          }
        )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete incident'
          )
        }

        await this.getIncidents()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Incident deleted successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    }
  }
}
</script>

<style scoped>
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
  width: 190px;
}

.page-size-select {
  width: 150px;
}

.sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.sortable:hover {
  background: #f8f9fa;
}

.sort-icon {
  margin-left: 5px;
  font-size: 12px;
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
  background: #198754;
  border-color: #198754;
  color: #ffffff;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 576px) {
  .table {
    min-width: 0 !important;
    table-layout: fixed;
  }

  .table th,
  .table td {
    padding: 9px 5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: .5rem auto;
  }
}
</style>