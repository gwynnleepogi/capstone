<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Returns &amp; Incidents</h2>
        <p class="text-muted mb-0">
          Returned, damaged, lost, missing and stolen property
        </p>
      </div>

      <button class="btn btn-warning" @click="openAddModal">
        <i class="bi bi-plus-lg me-1"></i>
        Add Record
      </button>
    </div>

    <div class="alert alert-warning py-2">
      <i class="bi bi-info-circle me-1"></i>
      Items that are returned, damaged, lost, missing or stolen are
      marked <strong>Unserviceable</strong> automatically and cannot be
      requested or issued until their condition is set back to
      <strong>Serviceable</strong> in the Items page.
    </div>

    <div class="card">
      <div class="card-body">
        <div class="row g-2 mb-3">
          <div class="col-12 col-md">
            <input
              v-model="search"
              type="text"
              class="form-control"
              placeholder="Search item, person, office, details..."
            >
          </div>

          <div class="col-6 col-md-3">
            <select v-model="typeFilter" class="form-select">
              <option value="">All Types</option>
              <option
                v-for="type in allTypes"
                :key="type"
                :value="type"
              >
                {{ type }}
              </option>
            </select>
          </div>

          <div class="col-6 col-md-2">
            <select v-model.number="itemsPerPage" class="form-select">
              <option :value="5">5 per page</option>
              <option :value="10">10 per page</option>
              <option :value="25">25 per page</option>
              <option :value="50">50 per page</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th class="sortable" @click="sortBy('item')">
                  Item <i :class="getSortIcon('item')"></i>
                </th>
                <th class="sortable" @click="sortBy('person')">
                  Reported / Returned By <i :class="getSortIcon('person')"></i>
                </th>
                <th class="sortable" @click="sortBy('type')">
                  Type <i :class="getSortIcon('type')"></i>
                </th>
                <th class="sortable" @click="sortBy('date')">
                  Date <i :class="getSortIcon('date')"></i>
                </th>
                <th>Office</th>
                <th>Item Condition</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="text-center py-4">Loading...</td>
              </tr>

              <tr
                v-for="record in paginatedRecords"
                :key="record.key"
              >
                <td>{{ record.item }}</td>
                <td>{{ record.person }}</td>

                <td>
                  <span class="badge" :class="typeClass(record.type)">
                    {{ record.type }}
                  </span>
                </td>

                <td>{{ record.date }}</td>
                <td>{{ record.office }}</td>

                <td>
                  <span
                    class="badge"
                    :class="record.itemCondition === 'Serviceable'
                      ? 'bg-success'
                      : 'bg-danger'"
                  >
                    {{ record.itemCondition }}
                  </span>
                </td>

                <td>{{ record.details }}</td>

                <td class="text-nowrap">
                  <button
                    class="btn btn-sm btn-outline-success me-2"
                    title="Edit"
                    @click="editRecord(record)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    title="Delete"
                    @click="deleteRecord(record)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>

              <tr v-if="!loading && filteredRecords.length === 0">
                <td colspan="8" class="text-center text-muted py-4">
                  No records found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredRecords.length > 0"
          class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2"
        >
          <div class="text-muted small">
            Showing {{ firstNumber }} to {{ lastNumber }}
            of {{ filteredRecords.length }} records
          </div>

          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="goToPage(currentPage - 1)">
                Previous
              </button>
            </li>

            <li
              v-for="page in totalPages"
              :key="page"
              class="page-item"
              :class="{ active: currentPage === page }"
            >
              <button class="page-link" @click="goToPage(page)">
                {{ page }}
              </button>
            </li>

            <li
              class="page-item"
              :class="{ disabled: currentPage === totalPages }"
            >
              <button class="page-link" @click="goToPage(currentPage + 1)">
                Next
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="modal fade" id="recordModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editing ? 'Edit Record' : 'Add Record' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveRecord">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label class="form-label">Type</label>

                  <select
                    v-model="form.type"
                    class="form-select"
                    required
                  >
                    <option
                      v-for="type in typeChoices"
                      :key="type"
                      :value="type"
                    >
                      {{ type }}
                    </option>
                  </select>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label">Date</label>

                  <input
                    v-model="form.date"
                    type="date"
                    class="form-control"
                    required
                  >
                </div>

                <div class="col-12">
                  <label class="form-label">Item</label>

                  <select
                    v-model="form.item_id"
                    class="form-select"
                    required
                  >
                    <option value="" disabled>Select item</option>

                    <option
                      v-for="item in items"
                      :key="item.id"
                      :value="item.id"
                    >
                      {{ item.property_number }} -
                      {{ item.description }}
                      ({{ item.status }}, {{ item.condition }})
                    </option>
                  </select>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label">
                    {{ isReturn ? 'Returned By' : 'Reported By' }}
                  </label>

                  <select
                    v-model="form.person_id"
                    class="form-select"
                    @change="autoFillOffice"
                  >
                    <option value="">Select personnel</option>

                    <option
                      v-for="person in personnel"
                      :key="person.id"
                      :value="person.id"
                    >
                      {{ person.full_name }}
                    </option>
                  </select>
                </div>

                <div v-if="isReturn" class="col-12 col-md-6">
                  <label class="form-label">Office</label>

                  <select v-model="form.office_id" class="form-select">
                    <option value="">Select office</option>

                    <option
                      v-for="office in offices"
                      :key="office.id"
                      :value="office.id"
                    >
                      {{ office.office_name }}
                    </option>
                  </select>
                </div>

                <div v-else class="col-12 col-md-6">
                  <label class="form-label">Incident Status</label>

                  <select v-model="form.status" class="form-select">
                    <option value="Open">Open</option>
                    <option value="Under Investigation">
                      Under Investigation
                    </option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div class="col-12">
                  <label class="form-label">
                    {{ isReturn ? 'Return Reason' : 'Description' }}
                  </label>

                  <textarea
                    v-model="form.description"
                    class="form-control"
                    rows="3"
                    :required="!isReturn"
                  ></textarea>
                </div>

                <div v-if="!isReturn" class="col-12">
                  <label class="form-label">Action Taken</label>

                  <textarea
                    v-model="form.action_taken"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>

                <div class="col-12">
                  <label class="form-label">Remarks</label>

                  <textarea
                    v-model="form.remarks"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>

                <div v-if="affectsItem" class="col-12">
                  <div class="alert alert-warning mb-0 py-2">
                    Saving will mark the item as
                    <strong>Unserviceable</strong> with status
                    <strong>{{ resultingStatus }}</strong>. It cannot be
                    assigned again until it is set to Serviceable in the
                    Items page.
                  </div>
                </div>
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
                {{ saving ? 'Saving...' : 'Save Record' }}
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

const API = 'http://localhost:5000/api'

const INCIDENT_TYPES = ['Damaged', 'Lost', 'Missing', 'Stolen', 'Other']
const ALL_TYPES = ['Returned', ...INCIDENT_TYPES]

// keep in sync with backend/middleware/itemCondition.js
const STATUS_BY_TYPE = {
  Returned: 'Returned',
  Damaged: 'Damaged',
  Lost: 'Lost',
  Missing: 'Lost',
  Stolen: 'Stolen'
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  const text = await response.text()

  let data

  try {
    data = JSON.parse(text)
  } catch (error) {
    throw new Error('Server did not return JSON for ' + url)
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

function toast(message) {
  window.dispatchEvent(
    new CustomEvent('show-toast', { detail: message })
  )
}

function blankForm() {
  return {
    kind: 'incident',
    id: null,
    type: 'Damaged',
    date: new Date().toISOString().split('T')[0],
    item_id: '',
    person_id: '',
    office_id: '',
    status: 'Open',
    description: '',
    action_taken: '',
    remarks: ''
  }
}

export default {
  name: 'ReturnsIncidents',

  data() {
    return {
      returns: [],
      incidents: [],
      items: [],
      personnel: [],
      offices: [],

      loading: true,
      saving: false,
      editing: false,

      search: '',
      typeFilter: '',
      currentPage: 1,
      itemsPerPage: 10,
      sortColumn: 'date',
      sortDirection: 'desc',

      allTypes: ALL_TYPES,
      form: blankForm()
    }
  },

  computed: {
    isReturn() {
      return this.form.type === 'Returned'
    },

    affectsItem() {
      return Object.prototype.hasOwnProperty.call(
        STATUS_BY_TYPE,
        this.form.type
      )
    },

    resultingStatus() {
      return STATUS_BY_TYPE[this.form.type] || ''
    },

    // a return cannot be turned into an incident (and vice versa)
    // when editing, because they are stored separately
    typeChoices() {
      if (!this.editing) {
        return ALL_TYPES
      }

      return this.form.kind === 'return'
        ? ['Returned']
        : INCIDENT_TYPES
    },

    records() {
      const itemById = id =>
        this.items.find(item => item.id === id)

      const returnRows = this.returns.map(row => ({
        key: 'return-' + row.id,
        kind: 'return',
        raw: row,
        item: row.items?.description || '-',
        itemCondition:
          itemById(row.item_id)?.condition || 'Unserviceable',
        person:
          row.users?.full_name || '-',
        type: 'Returned',
        date: row.return_date || '',
        office: row.offices?.office_name || '-',
        details: row.return_reason || '-'
      }))

      const incidentRows = this.incidents.map(row => ({
        key: 'incident-' + row.id,
        kind: 'incident',
        raw: row,
        item: row.items?.description || '-',
        itemCondition:
          itemById(row.item_id)?.condition || '-',
        person: row.users?.full_name || '-',
        type: row.incident_type || '-',
        date: row.incident_date || '',
        office: '-',
        details: row.description || '-'
      }))

      return [...returnRows, ...incidentRows]
    },

    filteredRecords() {
      const text = this.search.toLowerCase().trim()

      const filtered = this.records.filter(record => {
        const matchesType =
          !this.typeFilter || record.type === this.typeFilter

        const matchesText =
          !text ||
          [
            record.item,
            record.person,
            record.type,
            record.office,
            record.details,
            record.date
          ].join(' ').toLowerCase().includes(text)

        return matchesType && matchesText
      })

      const direction = this.sortDirection === 'asc' ? 1 : -1

      return filtered.sort((a, b) => {
        const first = String(a[this.sortColumn] || '').toLowerCase()
        const second = String(b[this.sortColumn] || '').toLowerCase()

        if (first < second) return -1 * direction
        if (first > second) return 1 * direction
        return 0
      })
    },

    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredRecords.length / this.itemsPerPage)
      )
    },

    paginatedRecords() {
      const start = (this.currentPage - 1) * this.itemsPerPage

      return this.filteredRecords.slice(
        start,
        start + this.itemsPerPage
      )
    },

    firstNumber() {
      return this.filteredRecords.length === 0
        ? 0
        : (this.currentPage - 1) * this.itemsPerPage + 1
    },

    lastNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredRecords.length
      )
    }
  },

  watch: {
    search() { this.currentPage = 1 },
    typeFilter() { this.currentPage = 1 },
    itemsPerPage() { this.currentPage = 1 },

    totalPages(value) {
      if (this.currentPage > value) {
        this.currentPage = value
      }
    },

    // switching type while adding keeps the form tidy
    'form.type'(type) {
      if (type === 'Returned') {
        this.form.kind = 'return'
      } else {
        this.form.kind = 'incident'
      }
    }
  },

  async mounted() {
    await Promise.all([
      this.getRecords(),
      this.getItems(),
      this.getOptions()
    ])

    this.loading = false
  },

  methods: {
    typeClass(type) {
      if (type === 'Returned') return 'bg-info text-dark'
      if (type === 'Damaged') return 'bg-warning text-dark'
      if (type === 'Other') return 'bg-secondary'
      return 'bg-danger'
    },

    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection =
          this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }
    },

    getSortIcon(column) {
      if (this.sortColumn !== column) {
        return 'bi bi-arrow-down-up text-muted ms-1'
      }

      return this.sortDirection === 'asc'
        ? 'bi bi-arrow-up ms-1'
        : 'bi bi-arrow-down ms-1'
    },

    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
      }
    },

    async getRecords() {
      try {
        const [returns, incidents] = await Promise.all([
          fetchJson(API + '/returns'),
          fetchJson(API + '/incidents')
        ])

        this.returns = Array.isArray(returns) ? returns : []
        this.incidents = Array.isArray(incidents) ? incidents : []
      } catch (error) {
        console.log(error)
        toast(error.message)
      }
    },

    async getItems() {
      try {
        const data = await fetchJson(API + '/items')
        this.items = Array.isArray(data) ? data : []
      } catch (error) {
        console.log(error)
        toast(error.message)
      }
    },

    async getOptions() {
      try {
        const data = await fetchJson(API + '/items/options')

        this.personnel = data.personnel || []
        this.offices = data.offices || []

        return
      } catch (error) {
        console.log('Options route failed, using fallback:', error)
      }

      const [people, offices] = await Promise.allSettled([
        fetchJson(API + '/personnel'),
        fetchJson(API + '/offices')
      ])

      if (people.status === 'fulfilled') this.personnel = people.value
      if (offices.status === 'fulfilled') this.offices = offices.value
    },

    autoFillOffice() {
      if (!this.isReturn || this.form.office_id) return

      const person = this.personnel.find(
        p => p.id === this.form.person_id
      )

      if (person?.office_id) {
        this.form.office_id = person.office_id
      }
    },

    showModal() {
      Modal.getOrCreateInstance(
        document.getElementById('recordModal')
      ).show()
    },

    hideModal() {
      Modal.getOrCreateInstance(
        document.getElementById('recordModal')
      ).hide()
    },

    openAddModal() {
      this.editing = false
      this.form = blankForm()
      this.showModal()
    },

    editRecord(record) {
      const row = record.raw
      this.editing = true

      if (record.kind === 'return') {
        this.form = {
          ...blankForm(),
          kind: 'return',
          id: row.id,
          type: 'Returned',
          date: row.return_date || '',
          item_id: row.item_id,
          person_id: row.returned_by || '',
          office_id: row.office_id || '',
          description: row.return_reason || '',
          remarks: row.remarks || ''
        }
      } else {
        this.form = {
          ...blankForm(),
          kind: 'incident',
          id: row.id,
          type: row.incident_type,
          date: row.incident_date || '',
          item_id: row.item_id,
          person_id: row.reported_by || '',
          status: row.status || 'Open',
          description: row.description || '',
          action_taken: row.action_taken || '',
          remarks: row.remarks || ''
        }
      }

      this.showModal()
    },

    async saveRecord() {
      this.saving = true

      try {
        const isReturn = this.form.kind === 'return'
        const base = API + (isReturn ? '/returns' : '/incidents')

        const url = this.editing
          ? base + '/' + this.form.id
          : base

        const body = isReturn
          ? {
              item_id: this.form.item_id,
              returned_by: this.form.person_id || null,
              office_id: this.form.office_id || null,
              return_date: this.form.date || null,
              condition_after_return: 'Unserviceable',
              return_reason: this.form.description,
              remarks: this.form.remarks
            }
          : {
              item_id: this.form.item_id,
              reported_by: this.form.person_id || null,
              incident_type: this.form.type,
              incident_date: this.form.date,
              status: this.form.status,
              description: this.form.description,
              action_taken: this.form.action_taken,
              remarks: this.form.remarks
            }

        await fetchJson(url, {
          method: this.editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        this.hideModal()

        // item status/condition changed on the server, so reload both
        await Promise.all([this.getRecords(), this.getItems()])

        toast(
          this.editing
            ? 'Record updated successfully'
            : 'Record added. Item marked Unserviceable.'
        )
      } catch (error) {
        console.log(error)
        toast(error.message)
      } finally {
        this.saving = false
      }
    },

    async deleteRecord(record) {
      if (!confirm('Are you sure you want to delete this record?')) {
        return
      }

      try {
        const base =
          API + (record.kind === 'return' ? '/returns/' : '/incidents/')

        await fetchJson(base + record.raw.id, { method: 'DELETE' })

        await this.getRecords()

        toast('Record deleted successfully')
      } catch (error) {
        console.log(error)
        toast(error.message)
      }
    }
  }
}
</script>

<style scoped>
h2 {
  color: #2F5D3A;
}

.btn-warning {
  background-color: #E8C547;
  border-color: #E8C547;
  color: #2F5D3A;
}

.btn-warning:hover {
  background-color: #d8b638;
  border-color: #d8b638;
}

.table thead th {
  background-color: #2F5D3A;
  color: white;
  white-space: nowrap;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.page-item.active .page-link {
  background-color: #2F5D3A;
  border-color: #2F5D3A;
}

.page-link {
  color: #2F5D3A;
}
</style>