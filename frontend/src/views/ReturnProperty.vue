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

    async downloadReturnPaperwork(request) {
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
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      let logo = ''
      try {
        const response = await fetch(logoUrl)
        if (response.ok) {
          const imageBlob = await response.blob()
          logo = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => resolve('')
            reader.readAsDataURL(imageBlob)
          })
        }
      } catch (error) {
        console.warn('Could not embed NVSU logo in ARRP:', error)
      }

      const rows = Array.from({ length: 15 }, (_, index) => {
        const first = index === 0
        return '<tr>' +
          '<td style="width:6%;height:7mm;text-align:center">' + (index + 1) + '</td>' +
          '<td style="width:8%;text-align:center">' + (first ? safe(receipt.quantity || '') : '') + '</td>' +
          '<td style="width:7%;text-align:center">' + (first ? safe(item.unit || '') : '') + '</td>' +
          '<td style="width:34%">' + (first ? safe(item.description || '') : '') + '</td>' +
          '<td style="width:11%;text-align:center">' + (first ? safe(item.code || item.account_code || '') : '') + '</td>' +
          '<td style="width:17%;text-align:center">' + (first ? safe(requester) : '') + '</td>' +
          '<td style="width:17%">' + (first ? safe(request.return_reason || '') : '') + '</td>' +
          '</tr>'
      }).join('')

      const cell = 'border:1px solid #555;padding:5px;vertical-align:middle;'
      const labelCell = cell + 'font-weight:bold;'
      const signatureRow = (label, leftValue, rightValue, lastValue) =>
        '<tr><td style="' + labelCell + 'width:18%">' + label + '</td>' +
        '<td style="' + cell + 'width:42%;text-align:center">' + (leftValue || '') + '</td>' +
        '<td style="' + cell + 'width:28%">' + (rightValue || '') + '</td>' +
        '<td style="' + cell + 'width:12%">' + (lastValue || '') + '</td></tr>'

      const documentContent = '<!doctype html><html><head><meta charset="UTF-8"><title>ARRP</title>' +
        '<style>@page{size:A4 portrait;margin:8mm}body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:0}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{border:1px solid #555;padding:4px}th{font-size:9px;text-align:center;height:28px}' +
        '.sheet{border:1px solid #555;padding:12px}.instructions{font-size:9px;line-height:1.25}.instructions li{padding:3px 0;text-align:justify}' +
        '.center{text-align:center}.school{font-size:12px;font-weight:bold;line-height:1.25;text-align:center}.formtitle{font-size:13px;font-weight:bold;text-align:center}' +
        '</style></head><body><div class="sheet">' +

        '<table><tr>' +
        '<td rowspan="2" style="' + cell + 'width:18%;text-align:center;height:58px">' +
        (logo ? '<img src="' + logo + '" style="width:75px;height:65px;object-fit:contain" alt="NVSU Logo">' : '') +
        '</td><td class="school" style="' + cell + 'height:30px">Republic of the Philippines<br>NUEVA VIZCAYA STATE UNIVERSITY<br>Bayombong, Nueva Vizcaya</td></tr>' +
        '<tr><td class="formtitle" style="' + cell + 'height:28px">ACKNOWLEDGEMENT RECEIPT FOR RETURNED PROPERTY</td></tr></table>' +

        '<table style="border:0"><tr><td style="border:0;text-align:right;font-weight:bold;padding:7px 4px 12px">ARRP No.: __________________________</td></tr></table>' +

        '<table><tr><td style="' + labelCell + 'width:55%;height:28px">Unit/Division/College: ' + safe(office) +
        '</td><td style="' + labelCell + 'width:45%">Date: ' + date(request.return_date) + '</td></tr>' +
        '<tr><td style="' + labelCell + 'height:28px">Place of Storage</td><td style="' + labelCell + '">Tag No.: __________________</td></tr></table>' +

        '<table><tr><td colspan="4" class="center" style="' + labelCell + 'height:27px">Items for &nbsp;&nbsp; ' +
        (purpose === 'Property Utilization/Re-issuance' ? '☑' : '____') + ' Property Utilization/Re-issuance &nbsp;&nbsp;&nbsp; ' +
        (purpose === 'Repair' ? '☑' : '____') + ' Repair &nbsp;&nbsp;&nbsp; ' +
        (purpose === 'Disposal' ? '☑' : '____') + ' Disposal</td></tr></table>' +

        '<table><thead><tr>' +
        '<th style="width:6%">Item<br>No.</th><th style="width:8%">Qty</th><th style="width:7%">UOM</th>' +
        '<th style="width:34%">DESCRIPTION</th><th style="width:11%">CODE</th>' +
        '<th style="width:17%">ACCOUNTABLE<br>EMPLOYEE</th><th style="width:17%">REMARKS</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +

        '<table><tr>' +
        '<td style="' + labelCell + 'width:18%">Returned by:</td>' +
        '<td style="' + labelCell + 'width:42%;text-align:center;font-style:italic">(Please indicate name and affix signature)</td>' +
        '<td style="' + labelCell + 'width:28%">Received by:</td>' +
        '<td style="' + labelCell + 'width:12%;text-align:center">Action Taken<br><small>(To be filled by the Property Officer)</small></td>' +
        '</tr>' +
        signatureRow('Signature:', '', '', '') +
        signatureRow('Printed Name:', '<b>' + safe(requester).toLocaleUpperCase() + '</b>', '', '') +
        signatureRow('Designation:', '', '', '') +
        signatureRow('Date:', date(request.return_date), '', '') +
        '</table>' +

        '<div class="instructions"><h3 style="text-align:center;text-decoration:underline;margin:12px 0 8px">INSTRUCTIONS</h3>' +
        '<ol type="A">' +
        '<li>The ARFRP shall be used by the accountable employee to return property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Property Custodian for the acceptance and by the Property Officer for updating of data and records;</li>' +
        '<li>Before receipt, the property shall be inspected and accomplish the Property Checklist;</li>' +
        '<li>This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;</li>' +
        '<li>The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 69); and</li>' +
        '<li>This form shall be prepared in two(2) copies distributed as follows:<p style="text-align:center;margin:8px 0">Original – Supply and/or Property Division/Unit’s file<br>Copy 2 – Accountable Employee</p></li>' +
        '</ol></div></div></body></html>'

      const blob = new Blob(['\ufeff', documentContent], { type: 'application/msword;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ARRP-' + String(request.id || 'returned-property') + '.doc'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
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
