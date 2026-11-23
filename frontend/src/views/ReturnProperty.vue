<template>
  <div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <div>
        <h2>Return Property</h2>
        <p class="text-muted mb-0">
          Submit unserviceable properties for return and monitor the status of your submitted return requests.
        </p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
      <button type="button" class="btn btn-warning d-flex align-items-center gap-2" @click="openPropertySelectionModal">
        <i class="bi bi-arrow-return-left"></i>
        Request to Return Property
      </button>
      </div>
    </div>

    <!-- Property selection modal -->
    <div v-if="showPropertySelectionModal" class="return-overlay" tabindex="-1" @keydown.esc="closePropertySelectionModal">
      <section class="return-dialog return-selection-dialog card" role="dialog" aria-modal="true" aria-labelledby="property-selection-title">
        <div class="card-header bg-white d-flex justify-content-between align-items-center gap-2">
          <div>
            <strong id="property-selection-title">Property issued to you</strong>
            <div class="small text-muted">Select the properties you want to return.</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-warning btn-sm" :disabled="selectedEligible.length === 0 || loading" @click="openReturnForm">
              Return Selected ({{ selectedEligible.length }})
            </button>
            <button type="button" class="btn-close" aria-label="Close" @click="closePropertySelectionModal"></button>
          </div>
        </div>
        <div class="card-body p-0 overflow-auto">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="text-center">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      aria-label="Select all eligible properties"
                      :checked="allEligibleSelected"
                      :disabled="eligible.length === 0"
                      @change="selectAllEligible($event.target.checked)"
                    />
                  </th>
                  <th>Property No.</th>
                  <th>Property</th>
                  <th>Serial No.</th>
                  <th>Receipt No.</th>
                  <th>Qty</th>
                  <th>Date Issued</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center text-muted py-4">Loading...</td>
                </tr>
                <tr v-else-if="!eligible.length">
                  <td colspan="7" class="text-center text-muted py-4">
                    You have no issued property that can be returned.
                  </td>
                </tr>
                <tr v-for="receipt in eligible" :key="receipt.id">
                  <td class="text-center">
                    <input
                      v-model="selectedReceiptIds"
                      type="checkbox"
                      class="form-check-input"
                      :value="String(receipt.id)"
                      :aria-label="'Select ' + (receipt.items?.description || 'property')"
                    />
                  </td>
                  <td>{{ receipt.items?.property_number || '-' }}</td>
                  <td>{{ receipt.items?.description || '-' }}</td>
                  <td>{{ receipt.items?.serial_number || '-' }}</td>
                  <td>{{ receipt.receipt_number || '-' }}</td>
                  <td>{{ receipt.quantity }}</td>
                  <td>{{ formatDate(receipt.date_issued) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- My Return Requests -->
    <div class="card mb-4">
      <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>My Return Requests</strong>
          <div class="small text-muted">Returns you have submitted for unserviceable properties.</div>
        </div>
        <span class="badge bg-secondary">{{ requests.length }} request(s)</span>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Requested</th>
              <th>Property</th>
              <th>Condition</th>
              <th>Reason</th>
              <th>Properties For</th>
              <th>Status</th>
              <th>Property Office Note</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center text-muted py-4">Loading return requests...</td>
            </tr>
            <tr v-else-if="!requests.length">
              <td colspan="8" class="text-center text-muted py-4">
                You have not submitted any return requests yet.
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
              <td>{{ request.return_purpose || '-' }}</td>
              <td>
                <span class="badge" :class="statusClass(request.status)">{{ request.status }}</span>
              </td>
              <td>{{ request.review_remarks || '-' }}</td>
              <td class="text-end text-nowrap">
                <button type="button" class="btn btn-sm btn-outline-success me-1" @click="downloadReturnPaperwork(request)">
                  <i class="bi bi-download me-1"></i>Download ARRP
                </button>
                <button v-if="request.status === 'Pending'" type="button" class="btn btn-sm btn-outline-danger"
                  :disabled="busyId === request.id" @click="cancelRequest(request)">Cancel</button>
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
            <div class="alert alert-light border">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>Selected properties to return</strong>
                <span class="badge bg-warning text-dark">{{ selectedReceipts.length }} selected</span>
              </div>
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead><tr><th>Property No.</th><th>Property</th><th>Serial No.</th><th>Receipt No.</th><th>Qty</th></tr></thead>
                  <tbody>
                    <tr v-for="receipt in selectedReceipts" :key="receipt.id">
                      <td>{{ receipt.items?.property_number || '-' }}</td>
                      <td>{{ receipt.items?.description || '-' }}</td>
                      <td>{{ receipt.items?.serial_number || '-' }}</td>
                      <td>{{ receipt.receipt_number || '-' }}</td>
                      <td>{{ receipt.quantity }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Properties for <span class="text-muted">(Optional)</span></label>
              <div class="border rounded p-3 mb-3">
                <div class="form-check mb-2"><input id="purpose-reissue" v-model="form.return_purpose" class="form-check-input" type="radio" value="Property Utilization/Re-issuance" /><label class="form-check-label" for="purpose-reissue">Property Utilization / Re-issuance</label></div>
                <div class="form-check mb-2"><input id="purpose-repair" v-model="form.return_purpose" class="form-check-input" type="radio" value="Repair" /><label class="form-check-label" for="purpose-repair">Repair</label></div>
                <div class="form-check"><input id="purpose-disposal" v-model="form.return_purpose" class="form-check-input" type="radio" value="Disposal" /><label class="form-check-label" for="purpose-disposal">Disposal</label></div>
              </div>
              <label class="form-label">Return Date <span class="text-danger">*</span></label>
              <input v-model="form.return_date" type="date" class="form-control" required />
            </div>

            <div class="mb-3">
              <label class="form-label">Condition</label>
              <div class="form-control bg-light" aria-readonly="true">
                Unserviceable
              </div>
              <div class="form-text">All returned properties are recorded as unserviceable.</div>
            </div>

            <div>
              <label class="form-label">Reason for Unserviceable Condition <span class="text-danger">*</span></label>
              <textarea
                v-model.trim="form.remarks"
                class="form-control"
                rows="2"
                maxlength="1000"
                placeholder="Explain why this property is unserviceable."
                required
              ></textarea>
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
      selectedReceiptIds: [],
      selectedReceipts: [],
      loading: true,
      saving: false,
      busyId: null,
      showForm: false,
      showPropertySelectionModal: false,
      selected: null,
      form: {
        return_date: today(),
        return_purpose: '',
        condition_declared: 'Unserviceable',
        remarks: ''
      }
    }
  },

  computed: {
    selectedEligible() {
      return this.eligible.filter(receipt =>
        this.selectedReceiptIds.includes(String(receipt.id))
      )
    },

    allEligibleSelected() {
      return this.eligible.length > 0 &&
        this.eligible.every(receipt => this.selectedReceiptIds.includes(String(receipt.id)))
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
        const availableIds = this.eligible.map(receipt => String(receipt.id))
        this.selectedReceiptIds = this.selectedReceiptIds.filter(id => availableIds.includes(id))
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.loading = false
      }
    },

    openPropertySelectionModal() {
      this.showPropertySelectionModal = true
    },

    closePropertySelectionModal() {
      this.showPropertySelectionModal = false
    },

    selectAllEligible(checked) {
      this.selectedReceiptIds = checked
        ? this.eligible.map(receipt => String(receipt.id))
        : []
    },

    openReturnForm() {
      this.selectedReceipts = this.selectedEligible.slice()
      if (!this.selectedReceipts.length) {
        this.toast('Please select at least one property to return.')
        return
      }

      this.showPropertySelectionModal = false
      this.form = {
        return_date: today(),
        return_purpose: '',
        condition_declared: 'Unserviceable',
        remarks: ''
      }
      this.showForm = true
    },

    closeForm() {
      this.showForm = false
      this.selectedReceipts = []
    },

    async submitReturn() {
      if (!this.selectedReceipts.length || this.saving) return

      this.saving = true
      let submittedCount = 0

      try {
        for (const receipt of this.selectedReceipts) {
          await this.request('/api/return-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_receipt_id: receipt.id,
              ...this.form,
              condition_declared: 'Unserviceable',
              return_reason: this.form.remarks.trim()
            })
          })
          submittedCount += 1
        }

        this.toast(
          submittedCount === 1
            ? 'Return request sent. Please wait for the property office to review it.'
            : `${submittedCount} return requests sent. Please wait for the property office to review them.`
        )
        this.closeForm()
        this.selectedReceiptIds = []
        await this.loadAll()
      } catch (error) {
        if (submittedCount > 0) {
          this.toast(`${submittedCount} of ${this.selectedReceipts.length} return requests were sent. The remaining items were not submitted: ${error.message}`)
          this.closeForm()
          this.selectedReceiptIds = []
          await this.loadAll()
        } else {
          this.toast(error.message)
        }
      } finally {
        this.saving = false
      }
    },

    downloadReturnPaperwork(request) {
      const safe = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      const item = request.items || {}
      const receipt = request.property_receipts || {}
      const requester = request.requester?.full_name || ''
      const office = request.offices?.office_name || ''
      const date = value => {
        if (!value) return ''
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? safe(value) : parsed.toLocaleDateString('en-PH')
      }
      const purpose = request.return_purpose || ''
      const rows = Array.from({ length: 15 }, (_, index) => {
        const first = index === 0
        return '<tr><td>' + (index + 1) + '</td><td>' + (first ? safe(receipt.quantity || '') : '') +
          '</td><td>' + (first ? safe(item.unit || '') : '') + '</td><td class="description">' +
          (first ? safe(item.description || '') : '') + '</td><td>' +
          (first ? safe(item.code || item.account_code || '') : '') + '</td><td>' +
          (first ? safe(requester) : '') + '</td><td class="remarks">' +
          (first ? safe(request.return_reason || '') : '') + '</td></tr>'
      }).join('')
      const logo = new URL('../assets/LOGO.png', import.meta.url).href
      const documentContent = '<!doctype html><html><head><meta charset="UTF-8">' +
        '<title>Acknowledgement Receipt for Returned Property</title><style>' +
        '@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#111;font-family:Arial,sans-serif}' +
        'body{font-size:9px}.sheet{width:100%;min-height:280mm;border:1px solid #555;padding:5mm;display:flex;flex-direction:column}' +
        '.header{display:grid;grid-template-columns:24mm 1fr;grid-template-rows:13mm 11mm;border:1px solid #555;text-align:center;font-weight:bold}' +
        '.logo-cell{grid-column:1;grid-row:1/3;border-right:1px solid #555;display:flex;align-items:center;justify-content:center}' +
        '.logo{width:19mm;height:19mm;object-fit:contain}.school{grid-column:2;grid-row:1;display:flex;flex-direction:column;justify-content:center;font-size:12px;line-height:1.2;padding:1mm}' +
        '.form-title{grid-column:2;grid-row:2;border-top:1px solid #555;display:flex;justify-content:center;align-items:center;font-size:12px;white-space:nowrap}' +
        '.arrp-number{text-align:right;font-weight:bold;font-size:11px;margin:1mm 2mm 4mm}.blank-line{display:inline-block;border-bottom:1px solid #222;min-width:48mm;height:4mm;vertical-align:bottom}' +
        '.metadata{display:grid;grid-template-columns:1.2fr .8fr;border:1px solid #555}.metadata div{min-height:8mm;padding:2mm;border-bottom:1px solid #555;display:flex;align-items:center;gap:1mm}' +
        '.metadata div:nth-child(odd){border-right:1px solid #555}.metadata div:nth-last-child(-n+2){border-bottom:0}.metadata .blank-line{flex:1;min-width:15mm}' +
        '.items-for{border:1px solid #555;border-top:0;min-height:8mm;display:flex;justify-content:center;align-items:center;gap:5mm;font-weight:bold;font-size:10px;white-space:nowrap}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #555;text-align:center;vertical-align:middle;padding:1mm}' +
        'th{height:10mm;font-size:8px;line-height:1.1}td{height:7.5mm;font-size:8px}td.description,td.remarks{text-align:left;overflow-wrap:anywhere}' +
        '.return-signatures{display:grid;grid-template-columns:18% 42% 28% 12%;border:1px solid #555;border-top:0}.return-signatures>div{min-height:8mm;padding:2mm;border-right:1px solid #555}' +
        '.return-signatures>div:last-child{border-right:0}.return-signatures.heading>div{min-height:12mm;font-weight:bold}.return-signatures .instruction{font-style:italic;text-align:center;font-weight:bold}' +
        '.return-signatures .printed-name{text-align:center;font-weight:bold;text-transform:uppercase}.return-signatures .center{text-align:center}' +
        '.instructions{margin-top:2mm;padding:2mm 3mm;font-size:8.5px;line-height:1.25}.instructions h3{margin:1mm 0 3mm;text-align:center;text-decoration:underline;font-size:10px}' +
        '.instructions ol{margin:0;padding-left:7mm}.instructions li{padding:1mm 0;text-align:justify}.copies{text-align:center;margin-top:2mm}' +
        '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{break-inside:avoid}}' +
        '</style></head><body><div class="sheet">' +
        '<div class="header"><div class="logo-cell"><img class="logo" src="' + logo + '" alt="NVSU Logo"></div>' +
        '<div class="school"><span>Republic of the Philippines</span><span>NUEVA VIZCAYA STATE UNIVERSITY</span><span>Bayombong, Nueva Vizcaya</span></div>' +
        '<div class="form-title">ACKNOWLEDGEMENT RECEIPT FOR RETURNED PROPERTY</div></div>' +
        '<div class="arrp-number">ARRP No.: <span class="blank-line"></span></div>' +
        '<div class="metadata"><div><strong>Unit/Division/College:</strong> ' + safe(office) + '</div><div><strong>Date:</strong> ' + date(request.return_date) + '</div>' +
        '<div><strong>Place of Storage</strong><span class="blank-line"></span></div><div><strong>Tag No.:</strong><span class="blank-line"></span></div></div>' +
        '<div class="items-for"><span>Items for</span><span>' + (purpose === 'Property Utilization/Re-issuance' ? '☑' : '____') +
        'Property Utilization/Re-issuance</span><span>' + (purpose === 'Repair' ? '☑' : '____') + 'Repair</span><span>' +
        (purpose === 'Disposal' ? '☑' : '____') + 'Disposal</span></div>' +
        '<table><colgroup><col style="width:8%"><col style="width:8%"><col style="width:8%"><col style="width:35%"><col style="width:12%"><col style="width:16%"><col style="width:13%"></colgroup>' +
        '<thead><tr><th>Item<br>No.</th><th>Qty</th><th>UOM</th><th>DESCRIPTION</th><th>CODE</th><th>ACCOUNTABLE<br>EMPLOYEE</th><th>REMARKS</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="return-signatures heading"><div>Returned by:</div><div class="instruction">(Please indicate name and affix signature)</div><div>Received by:</div><div>Action Taken<br><small>(To be filled by the Property Officer)</small></div></div>' +
        '<div class="return-signatures"><div>Signature:</div><div></div><div></div><div></div></div>' +
        '<div class="return-signatures"><div>Printed Name:</div><div class="printed-name">' + safe(requester) + '</div><div></div><div></div></div>' +
        '<div class="return-signatures"><div>Designation:</div><div></div><div></div><div></div></div>' +
        '<div class="return-signatures"><div>Date:</div><div class="center">' + date(request.return_date) + '</div><div></div><div></div></div>' +
        '<div class="instructions"><h3>INSTRUCTIONS</h3><ol type="A">' +
        '<li>The ARFRP shall be used by the accountable employee to return property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Property Custodian for the acceptance and by the Property Officer for updating of data and records;</li>' +
        '<li>Before receipt, the property shall be inspected and accomplish the Property Checklist;</li>' +
        '<li>This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;</li>' +
        '<li>The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 69); and</li>' +
        '<li>This form shall be prepared in two(2) copies distributed as follows:<div class="copies">Original – Supply and/or Property Division/Unit’s file<br>Copy 2 – Accountable Employee</div></li>' +
        '</ol></div></div></body></html>'

      const blob = new Blob(['\ufeff', documentContent], { type: 'application/msword;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ARRP-' + String(request.id || 'returned-property') + '.doc'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      this.toast('Acknowledgement Receipt for Returned Property downloaded.')
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
.modal-wide-return-requests {
  width: 96vw;
  max-width: 1600px;
}

@media (max-width: 767.98px) {
  .modal-wide-return-requests {
    width: calc(100% - 1rem);
    max-width: none;
    margin: 0.5rem auto;
  }
}

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
.return-selection-dialog {
  width: min(1100px, 100%);
  max-height: 90vh;
}
.return-selection-dialog .card-body {
  min-height: 0;
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
