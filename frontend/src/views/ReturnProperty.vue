<template>
  <div>
    <div class="mb-4">
      <h2>Return Property</h2>
      <p class="text-muted mb-0">
        Request to return property issued to you. The property office will accept or reject it.
      </p>
    </div>

    <!-- Property issued to me -->
    <div class="card mb-4">
      <div class="card-header bg-white">
        <strong>Property issued to you</strong>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Property No.</th>
              <th>Item</th>
              <th>Receipt No.</th>
              <th>Qty</th>
              <th>Date Issued</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center text-muted py-4">Loading...</td>
            </tr>

            <tr v-else-if="!eligible.length">
              <td colspan="6" class="text-center text-muted py-4">
                You have no issued property that can be returned.
              </td>
            </tr>

            <tr v-for="receipt in eligible" :key="receipt.id">
              <td>{{ receipt.items?.property_number || '-' }}</td>
              <td>{{ receipt.items?.description || '-' }}</td>
              <td>{{ receipt.receipt_number || '-' }}</td>
              <td>{{ receipt.quantity }}</td>
              <td>{{ formatDate(receipt.date_issued) }}</td>
              <td class="text-end">
                <button type="button" class="btn btn-sm btn-warning" @click="openReturnForm(receipt)">
                  <i class="bi bi-arrow-return-left me-1"></i>
                  Return
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- My return requests -->
    <div class="card">
      <div class="card-header bg-white">
        <strong>My return requests</strong>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Requested</th>
              <th>Item</th>
              <th>Condition</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Property Office Note</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="!loading && !requests.length">
              <td colspan="7" class="text-center text-muted py-4">
                You have not requested any returns yet.
              </td>
            </tr>

            <tr v-for="request in requests" :key="request.id">
              <td class="text-nowrap">{{ formatDate(request.created_at) }}</td>
              <td>
                {{ request.items?.description || '-' }}
                <div class="small text-muted">{{ request.items?.property_number || '' }}</div>
              </td>
              <td>{{ request.status === 'Accepted' && request.condition_after_return
                ? request.condition_after_return
                : request.condition_declared }}</td>
              <td>{{ request.return_reason || '-' }}</td>
              <td>
                <span class="badge" :class="statusClass(request.status)">{{ request.status }}</span>
              </td>
              <td>{{ request.review_remarks || '-' }}</td>
              <td class="text-end">
                <button
                  v-if="request.status === 'Pending'"
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  :disabled="busyId === request.id"
                  @click="cancelRequest(request)"
                >
                  Cancel
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Return form -->
    <div v-if="showForm" class="return-overlay" tabindex="-1" @keydown.esc="closeForm">
      <section class="return-dialog card" role="dialog" aria-modal="true" aria-labelledby="return-title">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <strong id="return-title">Request to Return Property</strong>
          <button type="button" class="btn-close" aria-label="Close" @click="closeForm"></button>
        </div>

        <form class="return-form" @submit.prevent="submitReturn">
          <div class="card-body">
            <div class="alert alert-light border small">
              <strong>{{ selected?.items?.description }}</strong>
              <div class="text-muted">
                {{ selected?.items?.property_number }} &middot; Receipt {{ selected?.receipt_number }} &middot;
                Qty {{ selected?.quantity }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Return Date <span class="text-danger">*</span></label>
              <input v-model="form.return_date" type="date" class="form-control" required />
            </div>

            <div class="mb-3">
              <label class="form-label">Condition <span class="text-danger">*</span></label>
              <select v-model="form.condition_declared" class="form-select" required>
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Reason for Return <span class="text-danger">*</span></label>
              <textarea
                v-model.trim="form.return_reason"
                class="form-control"
                rows="2"
                required
                placeholder="e.g. No longer needed, defective, end of use"
              ></textarea>
            </div>

            <div>
              <label class="form-label">Remarks</label>
              <textarea v-model.trim="form.remarks" class="form-control" rows="2"></textarea>
            </div>
          </div>

          <div class="card-footer bg-white text-end">
            <button type="button" class="btn btn-outline-secondary me-2" @click="closeForm">
              Cancel
            </button>
            <button type="submit" class="btn btn-warning" :disabled="saving">
              {{ saving ? 'Sending...' : 'Send Return Request' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
function today() {
  return new Date().toISOString().split('T')[0]
}

export default {
  name: 'ReturnProperty',

  data() {
    return {
      eligible: [],
      requests: [],
      loading: true,
      saving: false,
      busyId: null,
      showForm: false,
      selected: null,
      form: {
        return_date: today(),
        condition_declared: 'Serviceable',
        return_reason: '',
        remarks: ''
      }
    }
  },

  mounted() {
    this.loadAll()
  },

  methods: {
    toast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
    },

    async request(url, options) {
      const response = await fetch(url, options)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      return data
    },

    async loadAll() {
      this.loading = true

      try {
        const [eligible, requests] = await Promise.all([
          this.request('/api/return-requests/eligible'),
          this.request('/api/return-requests/mine')
        ])

        this.eligible = Array.isArray(eligible) ? eligible : []
        this.requests = Array.isArray(requests) ? requests : []
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.loading = false
      }
    },

    openReturnForm(receipt) {
      this.selected = receipt
      this.form = {
        return_date: today(),
        condition_declared: 'Serviceable',
        return_reason: '',
        remarks: ''
      }
      this.showForm = true
    },

    closeForm() {
      this.showForm = false
      this.selected = null
    },

    async submitReturn() {
      if (!this.selected || this.saving) return

      this.saving = true

      try {
        await this.request('/api/return-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_receipt_id: this.selected.id,
            ...this.form
          })
        })

        this.toast('Return request sent. Please wait for the property office to review it.')
        this.closeForm()
        await this.loadAll()
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },

    async cancelRequest(request) {
      if (!window.confirm('Cancel this return request?')) return

      this.busyId = request.id

      try {
        await this.request(`/api/return-requests/${request.id}/cancel`, { method: 'PATCH' })
        this.toast('Return request cancelled.')
        await this.loadAll()
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.busyId = null
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
.return-overlay {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.45);
}

.return-dialog {
  width: min(520px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.return-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}

.return-form .card-body {
  overflow-y: auto;
}
</style>
