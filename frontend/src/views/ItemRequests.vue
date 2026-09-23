<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Item Requests</h1>
        <p class="text-secondary mb-0">
          {{ canManageRequests ? 'Manage item requests' : 'Submit and track your item requests' }}
        </p>
      </div>

      <div class="col-auto">
        <button class="btn btn-warning" @click="openAddModal">
          <i class="bi bi-plus-lg me-1"></i>
          Add Request
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header bg-white">
        <strong>Item Requests</strong>
      </div>

      <div class="card-body">
        <div class="table-toolbar">
          <input
            v-model="search"
            type="text"
            class="form-control search-input"
            placeholder="Search item requests..."
          />

          <select v-model="statusFilter" class="form-select filter-select">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Delivered">Delivered</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select v-model.number="itemsPerPage" class="form-select page-size-select">
            <option :value="5">5 per page</option>
            <option :value="10">10 per page</option>
            <option :value="25">25 per page</option>
            <option :value="50">50 per page</option>
          </select>
        </div>

        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th
                  v-if="canManageRequests"
                  class="sortable"
                  @click="sortBy('request_number')"
                >
                  Request Number
                  <i :class="getSortIcon('request_number')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('item_description')"
                >
                  Item Description
                  <i :class="getSortIcon('item_description')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('quantity')"
                >
                  Quantity
                  <i :class="getSortIcon('quantity')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('requested_by')"
                >
                  Requested By
                  <i :class="getSortIcon('requested_by')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('office_id')"
                >
                  Office
                  <i :class="getSortIcon('office_id')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('status')"
                >
                  Status
                  <i :class="getSortIcon('status')"></i>
                </th>

                <th v-if="canManageRequests">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="request in paginatedRequests"
                :key="request.id"
              >
                <td v-if="canManageRequests">
                  {{ request.request_number || '-' }}
                </td>

                <td>
                  {{ request.item_description || '-' }}
                </td>

                <td>
                  {{ request.quantity || 0 }}
                </td>

                <td>
                  {{
                    request.users?.full_name ||
                    request.personnel?.full_name ||
                    '-'
                  }}
                </td>

                <td>
                  {{ request.offices?.office_name || '-' }}
                </td>

                <td>
                  <span
                    class="badge"
                    :class="getStatusClass(request.status)"
                  >
                    {{ request.status || '-' }}
                  </span>
                </td>

                <td v-if="canManageRequests">
                  <button
                    class="btn btn-sm btn-outline-success me-1"
                    @click="editRequest(request)"
                  >
                    <i class="bi bi-pencil"></i>
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteRequest(request.id)"
                  >
                    <i class="bi bi-trash"></i>
                    Delete
                  </button>
                </td>
              </tr>

              <tr v-if="filteredRequests.length === 0">
                <td
                  :colspan="canManageRequests ? 7 : 6"
                  class="text-center text-secondary py-5"
                >
                  No item requests found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredRequests.length > 0"
          class="table-footer"
        >
          <span>
            Showing {{ firstRequestNumber }} to {{ lastRequestNumber }}
            of {{ filteredRequests.length }} requests
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
      id="requestModal"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editing ? 'Edit Request' : 'Add Request' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveRequest">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">
                  Request Number
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.request_number"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Item Description
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.item_description"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Quantity
                </label>

                <input
                  type="number"
                  class="form-control"
                  v-model="form.quantity"
                  min="1"
                  required
                >
              </div>

              <div class="mb-3">
                <label
                  v-if="canManageRequests"
                  class="form-label"
                >
                  Requested By
                </label>

                <select
                  v-if="canManageRequests"
                  class="form-select"
                  v-model="form.requested_by"
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
                <label
                  v-if="canManageRequests"
                  class="form-label"
                >
                  Office
                </label>

                <select
                  v-if="canManageRequests"
                  class="form-select"
                  v-model="form.office_id"
                >
                  <option value="">
                    Select Office
                  </option>

                  <option
                    v-for="office in offices"
                    :key="office.id"
                    :value="office.id"
                  >
                    {{ office.office_name }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Purpose
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.purpose"
                ></textarea>
              </div>

              <div
                v-if="canManageRequests"
                class="mb-3"
              >
                <label class="form-label">
                  Status
                </label>

                <select
                  class="form-select"
                  v-model="form.status"
                >
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Approved">
                    Approved
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Rejected">
                    Rejected
                  </option>

                </select>
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
                {{ saving ? 'Saving...' : 'Save Request' }}
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
  name: 'ItemRequests',

  data() {
    return {
      requests: [],
      personnel: [],
      offices: [],
      editing: false,
      saving: false,
      search: '',
      statusFilter: '',
      currentPage: 1,
      itemsPerPage: 10,
      sortColumn: 'request_number',
      sortDirection: 'asc',

      form: {
        id: null,
        request_number: '',
        requested_by: '',
        office_id: '',
        item_description: '',
        quantity: 1,
        purpose: '',
        status: 'Pending'
      }
    }
  },

  watch: {
    search() {
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
    currentUser() {
      return JSON.parse(
        localStorage.getItem('user') || 'null'
      )
    },

    canManageRequests() {
      return [
        'Administrator',
        'Personnel'
      ].includes(this.currentUser?.role)
    },

    filteredRequests() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.requests.filter(request => {
        const statusMatch =
          !this.statusFilter ||
          request.status === this.statusFilter

        const searchableText = [
          request.request_number,
          request.item_description,
          request.quantity,
          request.users?.full_name,
          request.personnel?.full_name,
          request.offices?.office_name,
          request.status,
          request.purpose
        ].join(' ').toLowerCase()

        return (
          statusMatch &&
          (
            !searchText ||
            searchableText.includes(searchText)
          )
        )
      })

      return [...filtered].sort((firstRequest, secondRequest) => {
        let firstValue = this.getSortValue(
          firstRequest,
          this.sortColumn
        )

        let secondValue = this.getSortValue(
          secondRequest,
          this.sortColumn
        )

        if (this.sortColumn === 'quantity') {
          firstValue = Number(firstValue) || 0
          secondValue = Number(secondValue) || 0
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
        this.filteredRequests.length / this.itemsPerPage
      ) || 1
    },

    paginatedRequests() {
      const start =
        (this.currentPage - 1) * this.itemsPerPage

      return this.filteredRequests.slice(
        start,
        start + this.itemsPerPage
      )
    },

    firstRequestNumber() {
      if (this.filteredRequests.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) * this.itemsPerPage + 1
      )
    },

    lastRequestNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredRequests.length
      )
    }
  },

  mounted() {
    this.getRequests()

    if (this.canManageRequests) {
      this.getPersonnel()
      this.getOffices()
    }
  },

  methods: {
    getSortValue(request, column) {
      if (column === 'requested_by') {
        return (
          request.users?.full_name ||
          request.personnel?.full_name ||
          ''
        )
      }

      if (column === 'office_id') {
        return request.offices?.office_name || ''
      }

      return request[column] || ''
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

    async getRequests() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/item-requests'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load requests'
          )
        }

        this.requests = data
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

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load personnel'
          )
        }

        this.personnel = data
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getOffices() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/offices'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load offices'
          )
        }

        this.offices = data
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
        request_number: '',
        requested_by: '',
        office_id: '',
        item_description: '',
        quantity: 1,
        purpose: '',
        status: 'Pending'
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('requestModal')
        )

      modal.show()
    },

    editRequest(request) {
      this.editing = true

      this.form = {
        id: request.id,
        request_number:
          request.request_number || '',
        requested_by:
          request.requested_by || '',
        office_id:
          request.office_id || '',
        item_description:
          request.item_description || '',
        quantity:
          request.quantity || 1,
        purpose:
          request.purpose || '',
        status:
          request.status || 'Pending'
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('requestModal')
        )

      modal.show()
    },

    async saveRequest() {
      this.saving = true

      try {
        let url =
          'http://localhost:5000/api/item-requests'

        let method = 'POST'

        if (this.editing) {
          url =
            `http://localhost:5000/api/item-requests/${this.form.id}`

          method = 'PUT'
        }

        const response = await fetch(url, {
          method: method,

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            request_number:
              this.form.request_number,

            requested_by:
              this.form.requested_by || null,

            office_id:
              this.form.office_id || null,

            item_description:
              this.form.item_description,

            quantity:
              Number(this.form.quantity),

            purpose:
              this.form.purpose,

            status:
              this.canManageRequests
                ? this.form.status
                : 'Pending'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to save request'
          )
        }

        const modal =
          Modal.getOrCreateInstance(
            document.getElementById('requestModal')
          )

        modal.hide()

        await this.getRequests()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Request updated successfully'
              : 'Request added successfully'
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

    async deleteRequest(id) {
      if (
        !confirm(
          'Are you sure you want to delete this request?'
        )
      ) {
        return
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/item-requests/${id}`,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete request'
          )
        }

        await this.getRequests()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Request deleted successfully'
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
    },

    getStatusClass(status) {
      if (status === 'Pending') {
        return 'bg-warning text-dark'
      }

      if (status === 'Approved') {
        return 'bg-success'
      }

      if (status === 'Procurement') {
        return 'bg-primary'
      }

      if (status === 'Ordered') {
        return 'bg-info'
      }

      if (status === 'Delivered') {
        return 'bg-success'
      }

      if (status === 'Rejected') {
        return 'bg-danger'
      }

      if (status === 'Cancelled') {
        return 'bg-secondary'
      }

      return 'bg-secondary'
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
  background-color: #244b30 !important;
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
  background: #2F5D3A;
  border-color: #2F5D3A;
  color: #ffffff;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

h1 {
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

.table td {
  white-space: nowrap;
  vertical-align: middle;
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