<template>
  <div class="card return-requests-card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <strong>Return Requests</strong>
        <span v-if="pendingCount" class="badge bg-warning text-dark ms-2">
          {{ pendingCount }} pending
        </span>
        <div class="small text-muted">
          Teachers and Non-Teaching Staff submit property return requests here. Review requests to accept or reject them.
        </div>
      </div>

      <div class="btn-group btn-group-sm" role="group" aria-label="Filter return requests">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="btn"
          :class="filter === tab ? 'btn-success' : 'btn-outline-success'"
          @click="filter = tab"
        >
          {{ tab }}
        </button>
      </div>

      <div class="d-flex flex-wrap gap-2 w-100">
        <input
          v-model.trim="search"
          type="search"
          class="form-control form-control-sm flex-grow-1"
          style="min-width: 180px"
          aria-label="Search return requests"
          placeholder="Search requester, item, receipt, or reason"
        />
        <select
          v-model="conditionFilter"
          class="form-select form-select-sm"
          style="max-width: 180px"
          aria-label="Filter by item condition"
        >
          <option value="">All conditions</option>
          <option value="Serviceable">Serviceable</option>
          <option value="Unserviceable">Unserviceable</option>
        </select>
        <input
          v-model="dateFrom"
          type="date"
          class="form-control form-control-sm"
          style="max-width: 155px"
          aria-label="Filter requests from date"
        />
        <input
          v-model="dateTo"
          type="date"
          class="form-control form-control-sm"
          style="max-width: 155px"
          aria-label="Filter requests through date"
        />
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Requested</th>
            <th>Requested By</th>
            <th>Property</th>
            <th>Receipt No.</th>
            <th>Qty</th>
            <th>Condition</th>
            <th>Reason</th>
            <th>Status</th>
            <th class="text-end">Action</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="text-center text-muted py-4">Loading...</td>
          </tr>

          <tr v-else-if="!visibleRequests.length">
            <td colspan="9" class="text-center text-muted py-4">
              {{ search || conditionFilter || dateFrom || dateTo || filter !== 'Pending'
                ? 'No matching return requests.'
                : 'No pending return requests.' }}
            </td>
          </tr>

          <tr v-for="request in visibleRequests" :key="request.id">
            <td class="text-nowrap">{{ formatDate(request.created_at) }}</td>
            <td>
              {{ request.requester?.full_name || '-' }}
              <div class="small text-muted">{{ request.offices?.office_name || '' }}</div>
            </td>
            <td>
              {{ request.items?.description || '-' }}
              <div class="small text-muted">{{ request.items?.property_number || '' }}</div>
            </td>
            <td>{{ request.property_receipts?.receipt_number || '-' }}</td>
            <td>{{ request.property_receipts?.quantity ?? '-' }}</td>
            <td>
              {{ request.status === 'Accepted' && request.condition_after_return
                ? request.condition_after_return
                : request.condition_declared || '-' }}
            </td>
            <td>
              {{ request.return_reason || '-' }}
              <div v-if="request.remarks" class="small text-muted">{{ request.remarks }}</div>
              <div v-if="request.review_remarks" class="small text-muted">
                Review: {{ request.review_remarks }}
              </div>
            </td>
            <td>
              <span class="badge" :class="statusClass(request.status)">{{ request.status }}</span>
              <div v-if="request.reviewer" class="small text-muted">
                by {{ request.reviewer.full_name }}
              </div>
            </td>
            <td class="text-end">
              <div class="d-inline-flex gap-1">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="viewRequest(request)"
                >
                  <i class="bi bi-eye me-1"></i> View Details
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  :disabled="deletingRequestId === request.id"
                  @click="openDeleteModal(request)"
                  title="Delete return request"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Return Request Details Modal -->
  <div
    class="modal fade"
    id="returnRequestDetailsModal"
    tabindex="-1"
    aria-labelledby="returnRequestDetailsModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h5 id="returnRequestDetailsModalLabel" class="modal-title">Return Request Details</h5>
            <div class="small text-muted">Review the submitted information before processing the request.</div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div v-if="selectedRequest" class="modal-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="text-muted small">Request Status</span>
            <span class="badge" :class="statusClass(selectedRequest.status)">
              {{ selectedRequest.status }}
            </span>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <div class="detail-label">Requested Date</div>
              <div>{{ formatDate(selectedRequest.created_at) }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Requested By</div>
              <div>{{ selectedRequest.requester?.full_name || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="detail-label">Property</div>
              <div class="fw-semibold">{{ selectedRequest.items?.description || '-' }}</div>
              <div class="small text-muted">
                Property No.: {{ selectedRequest.items?.property_number || '-' }}
              </div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Receipt Number</div>
              <div>{{ selectedRequest.property_receipts?.receipt_number || '-' }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Quantity</div>
              <div>{{ selectedRequest.property_receipts?.quantity ?? '-' }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Office</div>
              <div>{{ selectedRequest.offices?.office_name || '-' }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Return Date</div>
              <div>{{ formatDate(selectedRequest.return_date) }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Declared Condition</div>
              <div>{{ selectedRequest.condition_declared || '-' }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Return Purpose</div>
              <div>{{ selectedRequest.return_purpose || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="detail-label">Reason</div>
              <div>{{ selectedRequest.return_reason || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="detail-label">Remarks</div>
              <div>{{ selectedRequest.remarks || '-' }}</div>
            </div>
            <div v-if="selectedRequest.review_remarks" class="col-12">
              <div class="detail-label">Review Remarks</div>
              <div>{{ selectedRequest.review_remarks }}</div>
            </div>
          </div>

          <div v-if="selectedRequest.status === 'Pending'" class="alert alert-info mt-4 mb-0">
            Accepting this request records the return and adds it to Returns. Rejecting it requires a reason.
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <template v-if="selectedRequest && selectedRequest.status === 'Pending'">
            <button type="button" class="btn btn-danger" :disabled="saving" @click="openRejectModal(selectedRequest)">
              Reject
            </button>
            <button type="button" class="btn btn-success" :disabled="saving" @click="acceptRequest(selectedRequest)">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ saving ? 'Accepting...' : 'Accept Return' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirm Delete Return Request Modal -->
  <div
    class="modal fade"
    id="deleteReturnRequestModal"
    tabindex="-1"
    aria-labelledby="deleteReturnRequestModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="deleteReturnRequestModalLabel" class="modal-title">Delete Return Request</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="deletingRequestId !== null"></button>
        </div>
        <div class="modal-body">
          <p class="mb-2">Are you sure you want to delete this return request?</p>
          <div v-if="requestToDelete" class="small text-muted">
            {{ requestToDelete.items?.description || 'Property' }} —
            {{ requestToDelete.status }} request
          </div>
          <div v-if="requestToDelete?.status === 'Accepted'" class="alert alert-info mt-3 mb-0">
            The accepted return record and inventory changes will be kept. Only the request entry will be deleted.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="deletingRequestId !== null">Cancel</button>
          <button type="button" class="btn btn-danger" :disabled="deletingRequestId !== null" @click="deleteRequest">
            <span v-if="deletingRequestId !== null" class="spinner-border spinner-border-sm me-1"></span>
            {{ deletingRequestId !== null ? 'Deleting...' : 'Delete Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Reject Return Request Modal -->
  <div
    class="modal fade"
    id="rejectReturnRequestModal"
    tabindex="-1"
    aria-labelledby="rejectReturnRequestModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form @submit.prevent="rejectRequest">
          <div class="modal-header">
            <h5 id="rejectReturnRequestModalLabel" class="modal-title">Reject Return Request</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-2">
              You are rejecting the return request for
              <strong>{{ selectedRequest?.items?.description || 'this property' }}</strong>.
            </p>
            <label for="returnRejectionReason" class="form-label">
              Reason for Rejection <span class="text-danger">*</span>
            </label>
            <textarea
              id="returnRejectionReason"
              v-model.trim="rejectionReason"
              class="form-control"
              rows="4"
              maxlength="1000"
              placeholder="Enter the reason for rejecting this request"
              required
            ></textarea>
            <div class="form-text">A reason is required only when rejecting a request.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="saving">
              Cancel
            </button>
            <button type="submit" class="btn btn-danger" :disabled="saving || !rejectionReason.trim()">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ saving ? 'Rejecting...' : 'Confirm Rejection' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'ReturnRequestsPanel',

  emits: ['changed'],

  data() {
    return {
      requests: [],
      selectedRequest: null,
      requestToDelete: null,
      deletingRequestId: null,
      loading: true,
      saving: false,
      filter: 'All',
      search: '',
      conditionFilter: '',
      dateFrom: '',
      dateTo: '',
      rejectionReason: '',
      tabs: ['All', 'Pending', 'Accepted', 'Rejected']
    }
  },

  computed: {
    pendingCount() {
      return this.requests.filter(request => request.status === 'Pending').length
    },

    visibleRequests() {
      const search = this.search.toLowerCase()

      return this.requests.filter(request => {
        const statusMatches = this.filter === 'All' || request.status === this.filter
        const condition = request.status === 'Accepted'
          ? request.condition_after_return
          : request.condition_declared
        const conditionMatches = !this.conditionFilter || condition === this.conditionFilter
        const requestDate = String(request.created_at || '').slice(0, 10)
        const fromDateMatches = !this.dateFrom || requestDate >= this.dateFrom
        const toDateMatches = !this.dateTo || requestDate <= this.dateTo
        const searchableText = [
          request.requester?.full_name,
          request.items?.description,
          request.items?.property_number,
          request.property_receipts?.receipt_number,
          request.return_reason,
          request.remarks,
          request.review_remarks,
          request.offices?.office_name
        ].join(' ').toLowerCase()

        return statusMatches &&
          conditionMatches &&
          fromDateMatches &&
          toDateMatches &&
          (!search || searchableText.includes(search))
      })
    }
  },

  mounted() {
    this.loadRequests()
  },

  methods: {
    toast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
    },

    async loadRequests() {
      this.loading = true

      try {
        const response = await fetch('/api/return-requests')
        const data = await response.json().catch(() => [])

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load return requests')
        }

        this.requests = Array.isArray(data) ? data : []
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.loading = false
      }
    },

    viewRequest(request) {
      this.selectedRequest = request
      const element = document.getElementById('returnRequestDetailsModal')
      if (element) Modal.getOrCreateInstance(element).show()
    },

    openDeleteModal(request) {
      if (!request || this.deletingRequestId !== null) return
      this.requestToDelete = request
      const element = document.getElementById('deleteReturnRequestModal')
      if (element) Modal.getOrCreateInstance(element).show()
    },

    async deleteRequest() {
      const request = this.requestToDelete
      if (!request || this.deletingRequestId !== null) return

      this.deletingRequestId = request.id

      try {
        const response = await fetch(`/api/return-requests/${request.id}`, {
          method: 'DELETE'
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete return request')
        }

        this.closeModal('deleteReturnRequestModal')
        this.requestToDelete = null
        this.toast(data.message || 'Return request deleted.')
        await this.loadRequests()
        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.$emit('changed')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.deletingRequestId = null
      }
    },

    closeModal(id) {
      const element = document.getElementById(id)
      if (element) Modal.getOrCreateInstance(element).hide()
    },

    async acceptRequest(request) {
      if (!request || this.saving || request.status !== 'Pending') return

      const confirmed = window.confirm(
        'Accept this property return request? The return will be recorded and added to Returns.'
      )
      if (!confirmed) return

      this.saving = true

      try {
        const response = await fetch(`/api/return-requests/${request.id}/accept`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_remarks: null })
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Could not record the property return')
        }

        this.toast('Return request accepted and added to Returns.')

        this.closeModal('returnRequestDetailsModal')
        this.selectedRequest = null

        await this.loadRequests()
        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.$emit('changed')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },

    openRejectModal(request) {
      if (!request || request.status !== 'Pending' || this.saving) return

      this.selectedRequest = request
      this.rejectionReason = ''

      const detailsModal = document.getElementById('returnRequestDetailsModal')
      if (detailsModal) {
        const instance = Modal.getOrCreateInstance(detailsModal)
        detailsModal.addEventListener('hidden.bs.modal', () => {
          const rejectModal = document.getElementById('rejectReturnRequestModal')
          if (rejectModal) Modal.getOrCreateInstance(rejectModal).show()
        }, { once: true })
        instance.hide()
      } else {
        const rejectModal = document.getElementById('rejectReturnRequestModal')
        if (rejectModal) Modal.getOrCreateInstance(rejectModal).show()
      }
    },

    async rejectRequest() {
      const request = this.selectedRequest
      const reason = this.rejectionReason.trim()

      if (!request || request.status !== 'Pending' || this.saving) return
      if (!reason) {
        this.toast('Please enter a reason for rejecting this request.')
        return
      }

      this.saving = true

      try {
        const response = await fetch(`/api/return-requests/${request.id}/reject`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_remarks: reason })
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Could not reject the return request')
        }

        this.toast('Return request rejected.')

        this.closeModal('rejectReturnRequestModal')
        this.selectedRequest = null
        this.rejectionReason = ''

        await this.loadRequests()
        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.$emit('changed')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },

    statusClass(status) {
      if (status === 'Accepted') return 'bg-success'
      if (status === 'Rejected') return 'bg-danger'
      if (status === 'Cancelled') return 'bg-secondary'
      return 'bg-warning text-dark'
    },

    formatDate(value) {
      if (!value) return '-'

      const date = new Date(value)

      return isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
    }
  }
}
</script>

<style scoped>
.detail-label {
  font-size: .78rem;
  color: var(--bs-secondary-color);
  margin-bottom: .2rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .02em;
}
</style>
