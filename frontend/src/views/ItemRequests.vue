
<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Item Requests</h1>
        <p class="text-secondary mb-0">
          {{
            canManageRequests
              ? 'Manage item requests'
              : 'Submit and track your item requests'
          }}
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

                <th class="sortable" @click="sortBy('item_description')">
                  Property Description
                  <i :class="getSortIcon('item_description')"></i>
                </th>

                <th class="sortable" @click="sortBy('quantity')">
                  Quantity
                  <i :class="getSortIcon('quantity')"></i>
                </th>

                <th class="sortable" @click="sortBy('requested_by')">
                  Requested By
                  <i :class="getSortIcon('requested_by')"></i>
                </th>

                <th class="sortable" @click="sortBy('office_id')">
                  Office
                  <i :class="getSortIcon('office_id')"></i>
                </th>

                <th class="sortable" @click="sortBy('status')">
                  Status
                  <i :class="getSortIcon('status')"></i>
                </th>

                <th>Actions</th>
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

                <td>{{ request.item_description || '-' }}</td>
                <td>{{ request.quantity || 0 }}</td>

                <td>
                  {{
                    request.users?.full_name ||
                    request.personnel?.full_name ||
                    '-'
                  }}
                </td>

                <td>{{ request.offices?.office_name || '-' }}</td>

                <td>
                  <span
                    class="badge"
                    :class="getStatusClass(request.status)"
                  >
                    {{ request.status || '-' }}
                  </span>
                </td>

                <td class="request-actions-cell">
                  <div class="request-actions">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="viewRequestDetails(request)"
                      title="View request details"
                    >
                      <i class="bi bi-eye me-1"></i>
                      Details
                    </button>

                    <template
                      v-if="
                        canManageRequests &&
                        request.status === 'Pending'
                      "
                    >
                      <button
                        class="btn btn-sm btn-outline-success"
                        :disabled="updatingRequestId === request.id"
                        @click="updateRequestStatus(request, 'Approved')"
                        title="Accept request"
                      >
                        <i class="bi bi-check-lg me-1"></i>
                        Accept
                      </button>

                      <button
                        class="btn btn-sm btn-outline-danger"
                        :disabled="updatingRequestId === request.id"
                        @click="updateRequestStatus(request, 'Rejected')"
                        title="Reject request"
                      >
                        <i class="bi bi-x-lg me-1"></i>
                        Reject
                      </button>
                    </template>
                  </div>
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

        <div v-if="filteredRequests.length > 0" class="table-footer">
          <span>
            Showing {{ firstRequestNumber }} to
            {{ lastRequestNumber }} of
            {{ filteredRequests.length }} requests
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

    <div class="modal fade" id="requestModal" tabindex="-1">
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
                <label class="form-label">Request Number</label>
                <input
                  v-model="form.request_number"
                  type="text"
                  class="form-control"
                  placeholder="Enter request number"
                  required
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Item (from Inventory)</label>

                <select
                  v-model="form.item_id"
                  class="form-select"
                  required
                >
                  <option value="">Select Inventory Item</option>

                  <option
                    v-for="item in items"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ formatItem(item) }}
                  </option>
                </select>

                <small v-if="items.length === 0" class="text-danger">
                  No available inventory items found.
                </small>

                <div
                  v-if="selectedItem"
                  class="border rounded p-2 mt-2 small bg-light"
                >
                  <div><strong>{{ selectedItem.description }}</strong></div>
                  <div>
                    Property No.: {{ selectedItem.property_number || '-' }}
                  </div>
                  <div>
                    Serial No.: {{ selectedItem.serial_number || '-' }}
                  </div>
                  <div>
                    Classification: {{ selectedItem.classification || '-' }}
                  </div>
                  <div>
                    Condition: {{ selectedItem.condition || '-' }}
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Quantity</label>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  class="form-control"
                  min="1"
                  required
                />
              </div>

              <div v-if="canManageRequests" class="mb-3">
                <label class="form-label">Requested By</label>

                <select v-model="form.requested_by" class="form-select">
                  <option value="">Select Personnel</option>

                  <option
                    v-for="person in personnel"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.full_name }}
                  </option>
                </select>
              </div>

              <div v-if="canManageRequests" class="mb-3">
                <label class="form-label">Office</label>

                <select v-model="form.office_id" class="form-select">
                  <option value="">Select Office</option>

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
                <label class="form-label">Purpose</label>
                <textarea
                  v-model="form.purpose"
                  class="form-control"
                  rows="3"
                  placeholder="Enter the purpose of the request"
                  required
                ></textarea>
              </div>

              <div v-if="canManageRequests" class="mb-3">
                <label class="form-label">Status</label>

                <select v-model="form.status" class="form-select">
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Rejected">Rejected</option>
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
                :disabled="saving || items.length === 0"
              >
                {{ saving ? 'Saving...' : 'Save Request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      id="requestDetailsModal"
      tabindex="-1"
      aria-labelledby="requestDetailsModalLabel"
      aria-hidden="true"
    >
      <div
        class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="requestDetailsModalLabel" class="modal-title">
              Request Details
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>

          <div v-if="requestDetails" class="modal-body">
            <dl class="row mb-0">
              <dt class="col-sm-4">Request Number</dt>
              <dd class="col-sm-8">
                {{ requestDetails.request_number || '-' }}
              </dd>

              <dt class="col-sm-4">Property</dt>
              <dd class="col-sm-8">
                {{
                  requestDetails.item_description ||
                  requestDetails.items?.description ||
                  '-'
                }}
              </dd>

              <dt class="col-sm-4">Quantity</dt>
              <dd class="col-sm-8">
                {{ requestDetails.quantity ?? 0 }}
              </dd>

              <dt class="col-sm-4">Requested By</dt>
              <dd class="col-sm-8">
                {{
                  requestDetails.users?.full_name ||
                  requestDetails.personnel?.full_name ||
                  '-'
                }}
              </dd>

              <dt class="col-sm-4">Office</dt>
              <dd class="col-sm-8">
                {{ requestDetails.offices?.office_name || '-' }}
              </dd>

              <dt class="col-sm-4">Purpose</dt>
              <dd class="col-sm-8">
                {{ requestDetails.purpose || '-' }}
              </dd>

              <dt class="col-sm-4">Status</dt>
              <dd class="col-sm-8">
                {{ requestDetails.status || '-' }}
              </dd>

              <dt class="col-sm-4">Created</dt>
              <dd class="col-sm-8">
                {{ requestDetails.created_at || '-' }}
              </dd>
            </dl>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Close
            </button>

            <template v-if="canManageRequests">
              <button
                type="button"
                class="btn btn-outline-warning"
                @click="editSelectedRequest"
              >
                <i class="bi bi-pencil me-1"></i>Edit
              </button>

              <button
                type="button"
                class="btn btn-outline-danger"
                @click="deleteSelectedRequest"
              >
                <i class="bi bi-trash me-1"></i>Delete
              </button>
            </template>
          </div>
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
      items: [],

      editing: false,
      saving: false,
      updatingRequestId: null,
      requestDetails: null,

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
        item_id: '',
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

    selectedItem() {
      return (
        this.items.find(
          item => item.id === this.form.item_id
        ) || null
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
        ]
          .join(' ')
          .toLowerCase()

        return (
          statusMatch &&
          (
            !searchText ||
            searchableText.includes(searchText)
          )
        )
      })

      return [...filtered].sort(
        (firstRequest, secondRequest) => {
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
            firstValue = String(
              firstValue || ''
            ).toLowerCase()

            secondValue = String(
              secondValue || ''
            ).toLowerCase()
          }

          if (firstValue < secondValue) {
            return this.sortDirection === 'asc' ? -1 : 1
          }

          if (firstValue > secondValue) {
            return this.sortDirection === 'asc' ? 1 : -1
          }

          return 0
        }
      )
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

  async mounted() {
    await this.getRequests()
    await this.getItems()

    if (this.canManageRequests) {
      await this.getPersonnel()
      await this.getOffices()
    }
  },

  methods: {
    viewRequestDetails(request) {
      this.requestDetails = request

      Modal.getOrCreateInstance(
        document.getElementById('requestDetailsModal')
      ).show()
    },

    editSelectedRequest() {
      if (!this.requestDetails || !this.canManageRequests) return

      const request = this.requestDetails

      Modal.getInstance(
        document.getElementById('requestDetailsModal')
      )?.hide()

      this.editRequest(request)
    },

    deleteSelectedRequest() {
      if (!this.requestDetails || !this.canManageRequests) return

      const id = this.requestDetails.id

      Modal.getInstance(
        document.getElementById('requestDetailsModal')
      )?.hide()

      this.deleteRequest(id)
    },

    async updateRequestStatus(request, status) {
      if (
        !this.canManageRequests ||
        request.status !== 'Pending'
      ) {
        return
      }

      if (
        status === 'Rejected' &&
        !window.confirm(
          `Reject request ${request.request_number || ''}?`
        )
      ) {
        return
      }

      this.updatingRequestId = request.id

      try {
        const response = await fetch(
          `/api/item-requests/${request.id}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
            `Failed to ${status.toLowerCase()} request`
          )
        }

        await this.getRequests()
        await this.getItems()

        this.notifyRequestCountChanged()

        window.dispatchEvent(
          new Event('items-updated')
        )

        window.dispatchEvent(
          new Event('property-status-updated')
        )

        this.showToast(
          status === 'Approved'
            ? 'Request approved successfully. The property inventory has been refreshed.'
            : 'Request rejected successfully.'
        )
      } catch (error) {
        console.log(
          'Update request status error:',
          error
        )

        this.showToast(error.message)
      } finally {
        this.updatingRequestId = null
      }
    },

    formatItem(item) {
      let text = item.description || 'Unnamed item'

      if (item.property_number) {
        text += ' - ' + item.property_number
      }

      const details = [
        item.classification,
        item.condition
      ].filter(Boolean)

      if (details.length) {
        text += ' (' + details.join(', ') + ')'
      }

      return text
    },

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

    async getRequests() {
      try {
        const response = await fetch('/api/item-requests')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load requests'
          )
        }

        this.requests = Array.isArray(data) ? data : []
      } catch (error) {
        console.log('Requests error:', error)
        this.showToast(error.message)
      }
    },

    async getItems() {
      try {
        const response = await fetch(
          '/api/item-requests/available-items'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load inventory items'
          )
        }

        const availableItems = Array.isArray(data) ? data : []

        const selectedItem = this.editing
          ? this.items.find(
              item => item.id === this.form.item_id
            )
          : null

        if (
          selectedItem &&
          !availableItems.some(
            item => item.id === selectedItem.id
          )
        ) {
          availableItems.push(selectedItem)
        }

        this.items = availableItems
      } catch (error) {
        console.log('Inventory items error:', error)
        this.items = []
        this.showToast(error.message)
      }
    },

    async getPersonnel() {
      try {
        const response = await fetch('/api/personnel')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load personnel'
          )
        }

        this.personnel = Array.isArray(data) ? data : []
      } catch (error) {
        console.log('Personnel error:', error)
        this.showToast(error.message)
      }
    },

    async getOffices() {
      try {
        const response = await fetch('/api/offices')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load offices'
          )
        }

        this.offices = Array.isArray(data) ? data : []
      } catch (error) {
        console.log('Offices error:', error)
        this.showToast(error.message)
      }
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        request_number: '',
        requested_by: '',
        office_id: '',
        item_id: '',
        quantity: 1,
        purpose: '',
        status: 'Pending'
      }

      Modal.getOrCreateInstance(
        document.getElementById('requestModal')
      ).show()
    },

    editRequest(request) {
      this.editing = true

      this.form = {
        id: request.id,
        request_number: request.request_number || '',
        requested_by: request.requested_by || '',
        office_id: request.office_id || '',
        item_id: request.item_id || '',
        quantity: request.quantity || 1,
        purpose: request.purpose || '',
        status: request.status || 'Pending'
      }

      if (
        request.items &&
        !this.items.some(
          item => item.id === request.items.id
        )
      ) {
        this.items.push(request.items)
      }

      Modal.getOrCreateInstance(
        document.getElementById('requestModal')
      ).show()
    },

    async saveRequest() {
      this.saving = true

      try {
        let url = '/api/item-requests'
        let method = 'POST'

        if (this.editing) {
          url = `/api/item-requests/${this.form.id}`
          method = 'PUT'
        }

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            request_number: this.form.request_number,
            requested_by: this.form.requested_by || null,
            office_id: this.form.office_id || null,
            item_id: this.form.item_id,
            quantity: Number(this.form.quantity),
            purpose: this.form.purpose,
            status: this.canManageRequests
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

        Modal.getOrCreateInstance(
          document.getElementById('requestModal')
        ).hide()

        await this.getRequests()
        await this.getItems()
        this.notifyRequestCountChanged()

        this.showToast(
          this.editing
            ? 'Request updated successfully'
            : 'Request added successfully'
        )
      } catch (error) {
        console.log('Save request error:', error)
        this.showToast(error.message)
      } finally {
        this.saving = false
      }
    },

    async deleteRequest(id) {
      if (
        !window.confirm(
          'Are you sure you want to delete this request?'
        )
      ) {
        return
      }

      try {
        const response = await fetch(
          `/api/item-requests/${id}`,
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
        await this.getItems()
        this.notifyRequestCountChanged()

        this.showToast('Request deleted successfully')
      } catch (error) {
        console.log('Delete request error:', error)
        this.showToast(error.message)
      }
    },

    showToast(message) {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: message
        })
      )
    },

    notifyRequestCountChanged() {
      window.dispatchEvent(
        new Event('item-requests-updated')
      )
    },

    getStatusClass(status) {
      if (status === 'Pending') {
        return 'bg-warning text-dark'
      }

      if (status === 'Approved') {
        return 'bg-success'
      }

      if (status === 'Delivered') {
        return 'bg-success'
      }

      if (status === 'Rejected') {
        return 'bg-danger'
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

.request-actions-cell {
  min-width: 230px;
}

.request-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.request-actions .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  background: #2f5d3a;
  border-color: #2f5d3a;
  color: #ffffff;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

h1 {
  color: #2f5d3a;
}

.btn-warning {
  background-color: #e8c547;
  border-color: #e8c547;
  color: #2f5d3a;
}

.form-label {
  font-weight: 500;
}

.modal-content {
  border-radius: 10px;
}

.card {
  border-radius: 10px;
  overflow: hidden;
}
</style>
