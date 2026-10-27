<template>
  <div class="card mb-4 return-requests-card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <strong>Return Requests</strong>
        <span v-if="pendingCount" class="badge bg-warning text-dark ms-2">
          {{ pendingCount }} pending
        </span>
        <div class="small text-muted">
          Teachers and Non-Teaching Staff ask to return property here. Accept to put the stock back, or reject with a reason.
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
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Requested</th>
            <th>Requested By</th>
            <th>Item</th>
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
              {{ filter === 'Pending' ? 'No pending return requests.' : 'No return requests found.' }}
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
                : request.condition_declared }}
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
              <div v-if="request.reviewer" class="small text-muted">by {{ request.reviewer.full_name }}</div>
            </td>
            <td class="text-end text-nowrap">
              <template v-if="request.status === 'Pending'">
                <button
                  type="button"
                  class="btn btn-sm btn-success me-1"
                  @click="openAccept(request)"
                >
                  <i class="bi bi-check-lg me-1"></i>
                  Accept
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="openReject(request)"
                >
                  <i class="bi bi-x-lg me-1"></i>
                  Reject
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Accept / Reject dialog -->
    <div v-if="dialog" class="rr-overlay" tabindex="-1" @keydown.esc="closeDialog">
      <section class="rr-dialog card" role="dialog" aria-modal="true" aria-labelledby="rr-title">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <strong id="rr-title">
            {{ dialog.mode === 'accept' ? 'Accept Return' : 'Reject Return' }}
          </strong>
          <button type="button" class="btn-close" aria-label="Close" @click="closeDialog"></button>
        </div>

        <form @submit.prevent="submitDialog">
          <div class="card-body">
            <div class="alert alert-light border small">
              <strong>{{ dialog.request.items?.description }}</strong>
              <div class="text-muted">
                {{ dialog.request.items?.property_number }} &middot;
                Qty {{ dialog.request.property_receipts?.quantity }} &middot;
                from {{ dialog.request.requester?.full_name }}
              </div>
              <div class="mt-1">Reason: {{ dialog.request.return_reason || '-' }}</div>
            </div>

            <template v-if="dialog.mode === 'accept'">
              <div class="mb-3">
                <label class="form-label">Condition after inspection</label>
                <select v-model="dialog.condition" class="form-select">
                  <option value="Serviceable">Serviceable</option>
                  <option value="Unserviceable">Unserviceable</option>
                </select>
                <div class="form-text">
                  The user said it is {{ dialog.request.condition_declared }}. Change it if your inspection differs.
                </div>
              </div>

              <div>
                <label class="form-label">Remarks (optional)</label>
                <textarea v-model.trim="dialog.remarks" class="form-control" rows="2"></textarea>
              </div>

              <p class="small text-muted mt-3 mb-0">
                Accepting records the return and puts the quantity back into stock.
              </p>
            </template>

            <template v-else>
              <div>
                <label class="form-label">Reason for rejecting <span class="text-danger">*</span></label>
                <textarea
                  v-model.trim="dialog.remarks"
                  class="form-control"
                  rows="3"
                  required
                  placeholder="e.g. Item was not brought in, wrong item, please bring it to the property office"
                ></textarea>
              </div>

              <p class="small text-muted mt-3 mb-0">
                Rejecting changes nothing in stock. The property stays issued to the user.
              </p>
            </template>
          </div>

          <div class="card-footer bg-white text-end">
            <button type="button" class="btn btn-outline-secondary me-2" @click="closeDialog">
              Cancel
            </button>
            <button
              type="submit"
              class="btn"
              :class="dialog.mode === 'accept' ? 'btn-success' : 'btn-danger'"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : dialog.mode === 'accept' ? 'Accept Return' : 'Reject Return' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReturnRequestsPanel',

  emits: ['changed'],

  data() {
    return {
      requests: [],
      loading: true,
      saving: false,
      filter: 'Pending',
      tabs: ['Pending', 'Accepted', 'Rejected', 'All'],
      dialog: null
    }
  },

  computed: {
    pendingCount() {
      return this.requests.filter(request => request.status === 'Pending').length
    },

    visibleRequests() {
      if (this.filter === 'All') return this.requests

      return this.requests.filter(request => request.status === this.filter)
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

    openAccept(request) {
      this.dialog = {
        mode: 'accept',
        request,
        condition: request.condition_declared || 'Serviceable',
        remarks: ''
      }
    },

    openReject(request) {
      this.dialog = { mode: 'reject', request, remarks: '' }
    },

    closeDialog() {
      this.dialog = null
    },

    async submitDialog() {
      if (!this.dialog || this.saving) return

      const { mode, request, condition, remarks } = this.dialog

      if (mode === 'reject' && !remarks) {
        this.toast('Please give a reason for rejecting this return.')
        return
      }

      this.saving = true

      try {
        const response = await fetch(`/api/return-requests/${request.id}/${mode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'accept'
              ? { condition_after_return: condition, review_remarks: remarks }
              : { review_remarks: remarks }
          )
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Could not update the return request')
        }

        this.toast(mode === 'accept' ? 'Return accepted and stock restored.' : 'Return request rejected.')
        this.closeDialog()
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
        : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }
}
</script>

<style scoped>
.rr-overlay {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.45);
}

.rr-dialog {
  width: min(520px, 100%);
  max-height: 100%;
  overflow-y: auto;
}
</style>
