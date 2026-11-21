<template>
  <section class="card mb-4">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
      <div><strong>Property Transfer Requests</strong><div class="small text-muted">Review employee requests before changing property accountability.</div></div>
      <button class="btn btn-sm btn-outline-secondary" @click="loadRequests" :disabled="loading">Refresh</button>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-muted">Loading transfer requests...</div>
      <div v-else-if="!requests.length" class="text-muted">No transfer requests have been submitted.</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead><tr><th>Request No.</th><th>Requested By</th><th>Properties</th><th>Date Requested</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-for="request in requests" :key="request.id">
              <td class="text-nowrap">{{ requestNumber(request) }}</td>
              <td>{{ request.requester?.full_name || 'Unknown employee' }}<div class="small text-muted">{{ request.from_responsibility_center || '' }}</div></td>
              <td>{{ (request.properties || []).length }}</td>
              <td>{{ formatDate(request.created_at) }}</td>
              <td>{{ request.reason }}</td>
              <td><span class="badge" :class="statusClass(request.status)">{{ request.status }}</span></td>
              <td><button class="btn btn-sm btn-outline-primary" @click="openReview(request)">Review</button></td>
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
            <select v-model="toUserId" class="form-select mb-2">
              <option value="">Select receiving employee</option>
              <option v-for="person in eligiblePersonnel" :key="person.id" :value="person.id">{{ person.full_name }} — {{ person.job_title || person.role }}{{ person.office_name ? ' · '+person.office_name : '' }}</option>
            </select>
            <div v-if="selectedRecipient" class="alert alert-light border small mb-3">
              <strong>Title:</strong> {{ selectedRecipient.job_title || selectedRecipient.role || '-' }}<br>
              <strong>Receiving Office:</strong> {{ selectedRecipient.office_name || 'Not assigned' }}
            </div>
            <label class="form-label">Transfer Date</label>
            <input type="date" v-model="transferDate" class="form-control mb-3">
            <label class="form-label">Disapproval Reason <span class="text-muted">(Required only if disapproved)</span></label>
            <textarea v-model.trim="rejectReason" class="form-control" rows="2" placeholder="Enter reason if you disapprove this request"></textarea>
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
            <button class="btn btn-outline-danger" @click="disapprove" :disabled="saving">Disapprove</button>
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
      transferDate: new Date().toISOString().slice(0, 10),
      rejectReason: ''
    }
  },
  computed: {
    eligiblePersonnel() {
      return this.personnel.filter(person => String(person.id) !== String(this.selected?.requested_by))
    },
    selectedRecipient() {
      return this.personnel.find(person => String(person.id) === String(this.toUserId)) || null
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
      this.transferDate = new Date().toISOString().slice(0, 10)
      this.rejectReason = ''
    },
    closeReview() { this.selected = null },
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
      } catch (error) { this.toast(error.message) }
      finally { this.saving = false }
    },
    async disapprove() {
      if (!this.rejectReason) return this.toast('Enter a reason for disapproving this request.')
      this.saving = true
      try {
        const response = await fetch('/api/property-transfer-requests/' + this.selected.id + '/reject', {
          method: 'PATCH',
          headers: this.authHeaders(true),
          body: JSON.stringify({ review_remarks: this.rejectReason })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not disapprove transfer request.')
        this.toast('Transfer request disapproved. Property accountability was not changed.')
        this.closeReview()
        await this.loadRequests()
      } catch (error) { this.toast(error.message) }
      finally { this.saving = false }
    }
  }
}
</script>

<style scoped>
.transfer-review-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem}
.transfer-review-modal{background:#fff;width:min(900px,100%);max-height:90vh;overflow:auto;border-radius:.5rem;box-shadow:0 1rem 3rem rgba(0,0,0,.2)}
</style>
