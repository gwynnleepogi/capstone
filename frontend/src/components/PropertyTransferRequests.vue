<template>
  <section class="card mb-4">
    <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-3 py-3">
      <div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <strong class="fs-6">Property Transfer Requests</strong>
          <span class="badge bg-warning text-dark">{{ pendingRequests.length }} pending</span>
        </div>
        <div class="small text-muted mt-1">Review employee requests before changing property accountability.</div>
      </div>
      <button class="btn btn-sm btn-outline-secondary" @click="loadRequests" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>{{ loading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-muted">Loading transfer requests...</div>
      <div v-else-if="!pendingRequests.length" class="text-muted">No transfer requests have been submitted.</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0 transfer-requests-table">
          <thead class="table-light">
            <tr>
              <th>Request No.</th>
              <th>Requested By</th>
              <th>Properties</th>
              <th>Date Requested</th>
              <th>Reason</th>
              <th>Status</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="request in pendingRequests" :key="request.id">
              <td class="text-nowrap fw-semibold">{{ requestNumber(request) }}</td>
              <td>
                <div class="fw-semibold">{{ request.requester?.full_name || 'Unknown employee' }}</div>
                <div class="small text-muted">{{ request.from_responsibility_center || '' }}</div>
              </td>
              <td class="transfer-properties-cell">
                <div v-for="property in (request.properties || []).slice(0, 2)" :key="property.id" class="small">
                  {{ property.items?.description || property.items?.property_number || 'Property' }}
                </div>
                <div v-if="(request.properties || []).length > 2" class="small text-muted">
                  +{{ request.properties.length - 2 }} more
                </div>
                <span v-if="!(request.properties || []).length" class="text-muted">-</span>
              </td>
              <td class="text-nowrap">{{ formatDate(request.created_at) }}</td>
              <td class="transfer-reason-cell">{{ request.reason || '-' }}</td>
              <td><span class="badge rounded-pill" :class="statusClass(request.status)">{{ request.status }}</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary text-nowrap" @click="openReview(request)">
                  <i class="bi bi-eye me-1"></i>Review Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selected" class="transfer-review-backdrop" @click.self="closeReview">
      <div class="transfer-review-modal">
        <div class="d-flex justify-content-between align-items-center border-bottom p-3">
          <div><h5 class="mb-0">Review Property Transfer Request</h5><small class="text-muted">{{ requestNumber(selected) }}</small></div>
          <button class="btn-close" @click="closeReview"></button>
        </div>
        <div class="p-3">
          <div class="row g-3 mb-3">
            <div class="col-md-6"><small class="text-muted d-block">Requesting Employee</small><strong>{{ selected.requester?.full_name || '-' }}</strong></div>
            <div class="col-md-6"><small class="text-muted d-block">From Responsibility Center</small><strong>{{ selected.from_responsibility_center || '-' }}</strong></div>
            <div class="col-md-6"><small class="text-muted d-block">Date Submitted</small><strong>{{ formatDate(selected.created_at) }}</strong></div>
            <div class="col-md-6"><small class="text-muted d-block">Reason</small><strong>{{ selected.reason }}</strong></div>
            <div class="col-12" v-if="selected.remarks"><small class="text-muted d-block">Employee Remarks</small>{{ selected.remarks }}</div>
          </div>

          <h6>Requested Properties ({{ selected.properties?.length || 0 }})</h6>
          <div class="table-responsive border rounded mb-3">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light"><tr><th>Property No.</th><th>Description</th><th>Amount</th><th>Condition</th><th>Check</th></tr></thead>
              <tbody>
                <tr v-for="property in selected.properties || []" :key="property.id">
                  <td>{{ property.items?.property_number || '-' }}</td>
                  <td>{{ property.items?.description || '-' }}</td>
                  <td>₱{{ amount(property.items?.cost) }}</td>
                  <td>{{ property.items?.condition || '-' }}</td>
                  <td><span class="badge" :class="property.items?.condition === 'Serviceable' && property.status === 'Issued' ? 'bg-success' : 'bg-danger'">{{ property.items?.condition === 'Serviceable' && property.status === 'Issued' ? 'Eligible' : 'Check required' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="selected.status === 'Pending'">
            <hr>
            <h6>Assign Receiving Employee</h6>
            <label class="form-label">Receiving Employee <span class="text-danger">*</span></label>
            <div class="recipient-search-wrap mb-2">
              <input
                type="text"
                v-model="recipientSearch"
                class="form-control"
                placeholder="Search employee by name, title, or office..."
                autocomplete="off"
                @focus="showRecipientResults = true"
                @input="toUserId = ''; showRecipientResults = true"
              >
              <div v-if="showRecipientResults" class="recipient-search-results">
                <button
                  v-for="person in filteredPersonnel"
                  :key="person.id"
                  type="button"
                  class="recipient-search-option"
                  @mousedown.prevent="selectRecipient(person)"
                >
                  <strong>{{ person.full_name }}</strong>
                  <small>{{ person.job_title || person.role }}{{ person.office_name ? ' · ' + person.office_name : '' }}</small>
                </button>
                <div v-if="!filteredPersonnel.length" class="recipient-search-empty">No matching employee found.</div>
              </div>
            </div>
            <div v-if="selectedRecipient" class="alert alert-light border small mb-3">
              <strong>Title:</strong> {{ selectedRecipient.job_title || selectedRecipient.role || '-' }}<br>
              <strong>Receiving Office:</strong> {{ selectedRecipient.office_name || 'Not assigned' }}
            </div>
            <label class="form-label">Transfer Date</label>
            <input type="date" v-model="transferDate" class="form-control mb-3">
          </template>
          <div v-else class="alert alert-light border mb-0">
            <strong>Status:</strong> {{ selected.status }}
            <div v-if="selected.recipient"><strong>Receiving Employee:</strong> {{ selected.recipient.full_name }}</div>
            <div v-if="selected.review_remarks"><strong>Review Remarks:</strong> {{ selected.review_remarks }}</div>
          </div>
        </div>
        <div class="border-top p-3 d-flex justify-content-between gap-2 flex-wrap">
          <button class="btn btn-outline-secondary" @click="closeReview">Close</button>
          <div v-if="selected.status === 'Pending'" class="d-flex gap-2">
            <button class="btn btn-success" @click="approve" :disabled="saving || !toUserId">{{ saving ? 'Processing...' : 'Approve and Assign Property' }}</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'PropertyTransferRequests',
  data() {
    return {
      requests: [],
      personnel: [],
      loading: false,
      saving: false,
      selected: null,
      toUserId: '',
      recipientSearch: '',
      showRecipientResults: false,
      transferDate: new Date().toISOString().slice(0, 10),
    }
  },
  computed: {
    pendingRequests() {
      return this.requests.filter(request => request.status === 'Pending')
    },
    eligiblePersonnel() {
      return this.personnel.filter(person => String(person.id) !== String(this.selected?.requested_by))
    },
    selectedRecipient() {
      return this.personnel.find(person => String(person.id) === String(this.toUserId)) || null
    },
    filteredPersonnel() {
      const search = this.recipientSearch.trim().toLowerCase()
      return this.eligiblePersonnel.filter(person => {
        const searchable = [
          person.full_name,
          person.job_title,
          person.role,
          person.office_name
        ].join(' ').toLowerCase()
        return !search || searchable.includes(search)
      })
    }
  },
  mounted() {
    this.loadRequests()
    this.loadPersonnel()
  },
  methods: {
    authHeaders(includeJson = false) {
      const headers = {}
      const token = localStorage.getItem('accessToken')
      if (token) headers.Authorization = 'Bearer ' + token
      if (includeJson) headers['Content-Type'] = 'application/json'
      return headers
    },
    async loadRequests() {
      this.loading = true
      try {
        const response = await fetch('/api/property-transfer-requests', { headers: this.authHeaders() })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load transfer requests.')
        this.requests = Array.isArray(data) ? data : []
      } catch (error) { this.toast(error.message) }
      finally { this.loading = false }
    },
    async loadPersonnel() {
      try {
        const response = await fetch('/api/personnel/directory', { headers: this.authHeaders() })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load employee directory.')
        this.personnel = Array.isArray(data) ? data : []
      } catch (error) { this.toast(error.message) }
    },
    requestNumber(request) {
      return 'PTR-' + String(request.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()
    },
    formatDate(value) {
      return value ? new Date(value).toLocaleDateString('en-PH') : '-'
    },
    amount(value) {
      return Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    statusClass(status) {
      if (status === 'Approved') return 'bg-success'
      if (status === 'Disapproved') return 'bg-danger'
      if (status === 'Processing') return 'bg-info text-dark'
      return 'bg-warning text-dark'
    },
    openReview(request) {
      this.selected = request
      this.toUserId = ''
      this.recipientSearch = ''
      this.showRecipientResults = false
      this.transferDate = new Date().toISOString().slice(0, 10)
    },
    closeReview() { this.selected = null },
    selectRecipient(person) {
      this.toUserId = person.id
      this.recipientSearch = person.full_name
      this.showRecipientResults = false
    },
    toast(message) { window.dispatchEvent(new CustomEvent('show-toast', { detail: message })) },
    async approve() {
      if (!this.toUserId) return this.toast('Select the receiving employee.')
      this.saving = true
      try {
        const response = await fetch('/api/property-transfer-requests/' + this.selected.id + '/approve', {
          method: 'PATCH',
          headers: this.authHeaders(true),
          body: JSON.stringify({ to_user_id: this.toUserId, transfer_date: this.transferDate })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not approve transfer request.')
        this.toast('Request approved and properties assigned successfully.')
        this.closeReview()
        await this.loadRequests()
        this.$emit('updated')
      } catch (error) { this.toast(error.message) }
      finally { this.saving = false }
    },
  }
}
</script>

<style scoped>
section.card{width:100%;max-width:none}
.card-body{width:100%;min-width:0}
.card-body>.table-responsive{width:100%;max-width:100%}
.transfer-requests-table{width:100%;min-width:1200px;table-layout:auto}
.transfer-requests-table th{font-size:.78rem;font-weight:600;color:var(--bs-secondary-color);text-transform:uppercase;white-space:nowrap;padding:.85rem 1rem}
.transfer-requests-table td{padding:1rem;vertical-align:middle}
.transfer-requests-table th:nth-child(1),.transfer-requests-table td:nth-child(1){min-width:155px}
.transfer-requests-table th:nth-child(2),.transfer-requests-table td:nth-child(2){min-width:190px}
.transfer-requests-table th:nth-child(3),.transfer-requests-table td:nth-child(3){min-width:240px}
.transfer-requests-table th:nth-child(4),.transfer-requests-table td:nth-child(4){min-width:155px}
.transfer-requests-table th:nth-child(5),.transfer-requests-table td:nth-child(5){min-width:220px}
.transfer-requests-table th:nth-child(6),.transfer-requests-table td:nth-child(6){min-width:115px}
.transfer-requests-table th:nth-child(7),.transfer-requests-table td:nth-child(7){min-width:155px}
.transfer-properties-cell{min-width:240px;max-width:320px;white-space:normal;overflow-wrap:normal}
.transfer-properties-cell>div{white-space:normal;overflow-wrap:anywhere}
.transfer-reason-cell{min-width:220px;max-width:300px;white-space:normal;overflow-wrap:anywhere}
.recipient-search-wrap{position:relative}
.recipient-search-results{position:absolute;top:100%;left:0;right:0;z-index:20;max-height:240px;overflow-y:auto;background:#fff;border:1px solid #ced4da;border-radius:.375rem;box-shadow:0 .5rem 1rem rgba(0,0,0,.12)}
.recipient-search-option{display:flex;flex-direction:column;align-items:flex-start;width:100%;padding:.65rem .8rem;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left}
.recipient-search-option:last-child{border-bottom:0}
.recipient-search-option:hover{background:#f3f6f9}
.recipient-search-option small{color:#6c757d}
.recipient-search-empty{padding:.75rem;color:#6c757d;font-size:.9rem}
.transfer-review-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem}
.transfer-review-modal{background:#fff;width:min(1100px,100%);max-height:92vh;overflow:auto;border-radius:.75rem;box-shadow:0 1rem 3rem rgba(0,0,0,.2)}
@media(max-width:767.98px){.transfer-review-backdrop{padding:.5rem}.transfer-review-modal{max-height:95vh}.transfer-requests-table{min-width:1100px}.transfer-requests-table td{padding:.8rem}}
</style>
