<template>
  <div class="card return-requests-card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <strong>Return Requests</strong>
        <span v-if="pendingCount" class="badge bg-warning text-dark ms-2">
          {{ pendingCount }} pending
        </span>
        <div class="small text-muted">
          Teachers and Non-Teaching Staff submit property return requests here. View a request to record the return and add it to Returns.
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
              {{
                search || conditionFilter || dateFrom || dateTo || filter !== 'Pending'
                  ? 'No matching return requests.'
                  : 'No pending return requests.'
              }}
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
                  class="btn btn-sm btn-primary"
                  :disabled="saving"
                  @click="viewRequest(request)"
                >
                  <i class="bi bi-eye me-1"></i>
                  View
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
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
      filter: 'All',
      search: '',
      conditionFilter: '',
      dateFrom: '',
      dateTo: '',
      tabs: ['All', 'Pending', 'Accepted'],
    }
  },

  computed: {
    pendingCount() {
      return this.requests.filter(request => request.status === 'Pending').length
    },

    visibleRequests() {
      const search = this.search.toLowerCase()

      return this.requests.filter(request => {
        const statusMatches =
          this.filter === 'All' || request.status === this.filter
        const condition =
          request.status === 'Accepted'
            ? request.condition_after_return
            : request.condition_declared
        const conditionMatches =
          !this.conditionFilter || condition === this.conditionFilter
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

        return (
          statusMatches &&
          conditionMatches &&
          fromDateMatches &&
          toDateMatches &&
          (!search || searchableText.includes(search))
        )
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

    async viewRequest(request) {
      if (this.saving || request.status !== 'Pending') return

      this.saving = true

      try {
        const response = await fetch(`/api/return-requests/${request.id}/accept`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            condition_after_return: 'Unserviceable',
            review_remarks: null
          })
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Could not record the property return')
        }

        this.toast('Return recorded and added to Returns.')
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
