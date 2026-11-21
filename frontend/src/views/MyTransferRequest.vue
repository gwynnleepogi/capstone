<template>
  <div>
    <div class="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <h2 class="mb-1">Request for Property Transfer</h2>
        <p class="text-muted mb-0">Submit properties for the Property Office to review for transfer.</p>
      </div>
      <button type="button" class="btn btn-warning" @click="openRequestModal">
        Request Property Transfer
      </button>
    </div>

    <div v-if="showRequestForm" class="transfer-modal-backdrop" @click.self="closeRequestModal">
      <div class="transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transferModalTitle">
        <div class="transfer-modal-header">
          <h5 id="transferModalTitle" class="mb-0">Request for Property Transfer</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="closeRequestModal" :disabled="saving"></button>
        </div>
        <div class="transfer-modal-body">
          <div class="mb-3"><strong>Property Transfer Details</strong></div>
        <div v-if="loading" class="text-muted py-3">Loading your issued properties...</div>
        <div v-else-if="!properties.length" class="text-muted py-3">You have no issued properties available for a transfer request.</div>
        <form v-else @submit.prevent="submitRequest">
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <label class="form-label fw-semibold">From Accountable Employee</label>
              <div class="form-control bg-light">{{ currentUser.full_name || 'Your account' }}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">From Responsibility Center</label>
              <div class="form-control bg-light">{{ selectedFromResponsibilityCenter || 'Select a property to display its responsibility center' }}</div>
            </div>
          </div>

          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0">Select Properties to Transfer <span class="text-danger">*</span></label>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleAllProperties">
                {{ allPropertiesSelected ? 'Clear Selection' : 'Select All' }}
              </button>
            </div>
            <input v-model.trim="propertySearch" type="search" class="form-control mb-2" placeholder="Search property number, description, receipt number, or condition">
            <div class="table-responsive border rounded">
              <table class="table table-hover align-middle mb-0 property-selection-table">
                <thead class="table-light">
                  <tr><th class="select-column">Select</th><th>Property No.</th><th>Description</th><th class="amount-column">Amount (₱)</th><th>Condition</th></tr>
                </thead>
                <tbody>
                  <tr v-for="property in filteredProperties" :key="property.id">
                    <td class="select-column"><input class="form-check-input" type="checkbox" v-model="form.receiptIds" :value="String(property.id)" :disabled="property.items?.condition !== 'Serviceable'"></td>
                    <td><strong>{{ property.items?.property_number || '-' }}</strong><div class="small text-muted">Receipt: {{ property.receipt_number || '-' }}</div></td>
                    <td class="description-cell">{{ property.items?.description || '-' }}</td>
                    <td class="amount-cell">{{ formatAmount(property) }}</td>
                    <td><span class="badge rounded-pill" :class="property.items?.condition === 'Serviceable' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'">{{ property.items?.condition || 'Not specified' }}</span></td>
                  </tr>
                  <tr v-if="filteredProperties.length === 0"><td colspan="5" class="text-center text-muted py-3">No properties match your search.</td></tr>
                </tbody>
              </table>
            </div>
            <div class="d-flex justify-content-between flex-wrap gap-2 mt-2">
              <small class="text-muted">{{ form.receiptIds.length }} {{ form.receiptIds.length === 1 ? 'property' : 'properties' }} selected</small>
              <strong class="small">Selected Total: ₱{{ selectedPropertiesTotal }}</strong>
            </div>
            <small class="form-text">Only serviceable properties can be requested for transfer. The Property Office will verify your selection.</small>
          </div>

          <hr>
          <div class="mb-3">
            <label class="form-label">Reason for Transfer <span class="text-danger">*</span></label>
            <select v-model="form.reason" class="form-select" required>
              <option value="">Select a reason</option>
              <option>End of Contract</option>
              <option>Transfer of Agency</option>
              <option>Resignation</option>
              <option>Change of Designation</option>
              <option>Retirement</option>
              <option>Others</option>
            </select>
            <input v-if="form.reason === 'Others'" v-model.trim="form.otherReason" class="form-control mt-2" placeholder="Enter reason" required>
          </div>
          <div class="transfer-modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeRequestModal" :disabled="saving">Cancel</button>
            <button type="submit" class="btn btn-warning" :disabled="saving || !form.receiptIds.length || !form.reason || (form.reason === 'Others' && !form.otherReason.trim())">
              {{ saving ? 'Submitting...' : 'Submit Transfer Request' }}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header bg-white"><strong>My Transfer Requests</strong></div>
      <div class="card-body">
        <div v-if="requestsLoading" class="text-muted">Loading your requests...</div>
        <div v-else-if="!requests.length" class="text-muted">You have not submitted any transfer requests.</div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Date Submitted</th><th>Properties</th><th>Reason</th><th>Receiving Employee</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>
              <tr v-for="request in requests" :key="request.id">
                <td>{{ formatDate(request.created_at) }}</td>
                <td>{{ (request.properties || []).length }}</td>
                <td>{{ request.reason }}</td>
                <td>{{ request.recipient?.full_name || (request.status === 'Pending' ? 'To be assigned by Property Office' : '-') }}</td>
                <td><span class="badge" :class="statusClass(request.status)">{{ request.status }}</span></td>
                <td>{{ request.review_remarks || request.remarks || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MyTransferRequest',
  data() {
    return {
      loading: true,
      requestsLoading: true,
      saving: false,
      showRequestForm: false,
      properties: [],
      requests: [],
      propertySearch: '',
      currentUser: JSON.parse(localStorage.getItem('user') || 'null') || {},
      form: { receiptIds: [], reason: '', otherReason: '', remarks: '' }
    }
  },
  computed: {
    filteredProperties() {
      const search = this.propertySearch.toLowerCase().trim()
      if (!search) return this.properties
      return this.properties.filter(property => {
        const item = property.items || {}
        return [item.property_number, item.description, property.receipt_number, item.condition]
          .some(value => String(value || '').toLowerCase().includes(search))
      })
    },
    allPropertiesSelected() {
      const available = this.properties.filter(property => property.items?.condition === 'Serviceable')
      return available.length > 0 && available.every(property => this.form.receiptIds.includes(String(property.id)))
    },
    selectedFromResponsibilityCenter() {
      const centers = [...new Set(this.properties
        .filter(property => this.form.receiptIds.includes(String(property.id)))
        .map(property => String(property.items?.responsibility_center || '').trim()).filter(Boolean))]
      if (!centers.length) return ''
      return centers.length === 1 ? centers[0] : 'Multiple responsibility centers'
    },
    selectedPropertiesTotal() {
      const total = this.properties.filter(property => this.form.receiptIds.includes(String(property.id)))
        .reduce((sum, property) => sum + Number(property.items?.cost || property.items?.unit_value || 0), 0)
      return total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  },
  mounted() {
    this.loadProperties()
    this.loadRequests()
  },
  methods: {
    formatAmount(property) {
      return Number(property.items?.cost || property.items?.unit_value || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      })
    },
    formatDate(value) {
      if (!value) return '-'
      return new Date(value).toLocaleDateString('en-PH')
    },
    statusClass(status) {
      if (status === 'Approved') return 'bg-success'
      if (status === 'Disapproved') return 'bg-danger'
      if (status === 'Processing') return 'bg-info text-dark'
      return 'bg-warning text-dark'
    },
    openRequestModal() {
      this.showRequestForm = true
    },
    closeRequestModal() {
      if (this.saving) return
      this.showRequestForm = false
    },
    toggleAllProperties() {
      const ids = this.properties.filter(property => property.items?.condition === 'Serviceable').map(property => String(property.id))
      this.form.receiptIds = this.allPropertiesSelected ? [] : ids
    },
    authHeaders(includeJson = false) {
      const headers = {}
      const token = localStorage.getItem('accessToken')
      if (token) headers.Authorization = 'Bearer ' + token
      if (includeJson) headers['Content-Type'] = 'application/json'
      return headers
    },
    async loadProperties() {
      try {
        const response = await fetch('/api/return-requests/eligible', {
          headers: this.authHeaders()
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load issued properties.')
        this.properties = Array.isArray(data) ? data : []
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.loading = false
      }
    },
    async loadRequests() {
      try {
        const response = await fetch('/api/property-transfer-requests/mine', {
          headers: this.authHeaders()
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load transfer requests.')
        this.requests = Array.isArray(data) ? data : []
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.requestsLoading = false
      }
    },
    async submitRequest() {
      if (!this.form.receiptIds.length) return this.toast('Please select at least one property.')
      this.saving = true
      try {
        const response = await fetch('/api/property-transfer-requests', {
          method: 'POST',
          headers: this.authHeaders(true),
          body: JSON.stringify({
            property_receipt_ids: this.form.receiptIds,
            from_responsibility_center: this.selectedFromResponsibilityCenter,
            reason: this.form.reason,
            other_reason: this.form.otherReason,
            remarks: this.form.remarks
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to submit transfer request.')
        this.toast('Transfer request submitted successfully.')
        this.form = { receiptIds: [], reason: '', otherReason: '', remarks: '' }
        this.showRequestForm = false
        await Promise.all([this.loadProperties(), this.loadRequests()])
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },
    toast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
    }
  }
}
</script>

<style scoped>
.transfer-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, .5);
}
.transfer-modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 1000px);
  max-height: 90vh;
  overflow: hidden;
  background: #fff;
  border-radius: .75rem;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, .2);
}
.transfer-modal-header,
.transfer-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #dee2e6;
}
.transfer-modal-footer {
  justify-content: flex-end;
  border-top: 1px solid #dee2e6;
  border-bottom: 0;
}
.transfer-modal-body {
  overflow-y: auto;
  padding: 1.25rem;
}
@media (max-width: 576px) {
  .transfer-modal-backdrop { padding: .5rem; }
  .transfer-modal { max-height: 95vh; }
  .transfer-modal-body { padding: 1rem; }
}
.property-selection-table { min-width: 760px; }
.property-selection-table thead th { color: #495057; font-size: .82rem; font-weight: 600; white-space: nowrap; padding: .85rem .75rem; }
.property-selection-table tbody td { padding: .8rem .75rem; }
.property-selection-table .description-cell { white-space: normal; min-width: 260px; }
.property-selection-table .amount-cell { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.property-selection-table .select-column { width: 76px; min-width: 76px; text-align: center; }
.property-selection-table .amount-column { min-width: 120px; text-align: right; }
.property-selection-table .form-check-input { display: inline-block; margin: 0; vertical-align: middle; }
</style>
