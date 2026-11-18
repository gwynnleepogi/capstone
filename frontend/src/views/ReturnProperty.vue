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
              <td class="text-end text-nowrap">
                <button type="button" class="btn btn-sm btn-outline-success me-1" @click="printReturnPaperwork(request)">
                  <i class="bi bi-printer me-1"></i>Print ARRP
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
              <select v-model="form.return_reason" class="form-select" required>
                <option value="">Select a reason</option>
                <option value="End of Contract">End of Contract</option>
                <option value="Transfer of Agency">Transfer of Agency</option>
                <option value="Resignation">Resignation</option>
                <option value="Change of Designation">Change of Designation</option>
                <option value="Retirement">Retirement</option>
                <option value="Others">Others</option>
              </select>

              <input
                v-if="form.return_reason === 'Others'"
                v-model.trim="form.otherReason"
                type="text"
                class="form-control mt-2"
                placeholder="Enter reason"
                required
              />
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
        otherReason: '',
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
        otherReason: '',
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
            ...this.form,
            return_reason: this.form.return_reason === 'Others'
              ? `Others: ${this.form.otherReason.trim()}`
              : this.form.return_reason
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

    printReturnPaperwork(request) {
      const safe = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const item = request.items || {}
      const receipt = request.property_receipts || {}
      const requester = request.requester?.full_name || ''
      const office = request.offices?.office_name || ''
      const date = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-PH') : ''
      const rows = Array.from({ length: 15 }, (_, i) => i === 0
        ? `<tr><td>1</td><td>${safe(receipt.quantity || '')}</td><td></td><td>${safe(item.description)}</td><td></td><td>${safe(requester)}</td><td>${safe(request.return_reason)}</td></tr>`
        : `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')
      const logo = new URL('../assets/LOGO.png', import.meta.url).href
      const win = window.open('', '_blank', 'popup=yes,width=1100,height=900')
      if (!win) return this.toast('Please allow pop-ups to print the ARRP.')
      win.document.write(`<!doctype html><html><head><title>Acknowledgement Receipt for Returned Property</title><style>
      @page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font:9px Arial;margin:0;color:#111}.sheet{border:1px solid #555;padding:5mm;min-height:281mm}
      .head{display:grid;grid-template-columns:24mm 1fr;border:1px solid #555;text-align:center;font-weight:bold}.logo{grid-row:span 2;border-right:1px solid #555;height:25mm;display:flex;align-items:center;justify-content:center}.logo img{width:19mm;height:19mm;object-fit:contain}.school{font-size:12px;padding:2mm;line-height:1.25}.title{border-top:1px solid #555;padding:2mm;font-size:12px}
      .arrp{text-align:right;font-weight:bold;margin:2mm}.line{display:inline-block;border-bottom:1px solid #222;min-width:40mm;height:4mm}.meta{display:grid;grid-template-columns:1.2fr .8fr;border:1px solid #555}.meta div{padding:2mm;border-bottom:1px solid #555;min-height:8mm}.meta div:nth-child(odd){border-right:1px solid #555}
      .items{text-align:center;border:1px solid #555;padding:2mm;font-weight:bold}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #555;text-align:center;padding:1mm}th{height:10mm;font-size:8px}td{height:7.5mm;font-size:8px}
      .row{display:grid;grid-template-columns:18% 42% 28% 12%;border:1px solid #555;border-top:0}.row div{padding:2mm;border-right:1px solid #555;min-height:8mm}.row div:last-child{border:0}.row.headrow{font-weight:bold}.row.headrow div{min-height:12mm}
      .instructions{font-size:8.5px;line-height:1.25;margin-top:3mm}.instructions h3{text-align:center;text-decoration:underline;margin:2mm}.instructions ol{padding-left:7mm;margin:0}.instructions li{padding:1mm 0}.copy{text-align:center}
      @media print{.sheet{break-inside:avoid}}</style></head><body><div class="sheet">
      <div class="head"><div class="logo"><img src="${logo}"></div><div class="school">Republic of the Philippines<br>NUEVA VIZCAYA STATE UNIVERSITY<br>Bayombong, Nueva Vizcaya</div><div class="title">ACKNOWLEDGEMENT RECEIPT FOR RETURNED PROPERTY</div></div>
      <div class="arrp">ARRP No.: <span class="line"></span></div>
      <div class="meta"><div><b>Unit/Division/College:</b> ${safe(office)}</div><div><b>Date:</b> ${date(request.return_date)}</div><div><b>Place of Storage:</b> <span class="line"></span></div><div><b>Tag No.:</b> <span class="line"></span></div></div>
      <div class="items">Items for &nbsp; ____Property Utilization/Re-issuance &nbsp; ____Repair &nbsp; ____Disposal</div>
      <table><colgroup><col style="width:6%"><col style="width:8%"><col style="width:8%"><col style="width:35%"><col style="width:12%"><col style="width:16%"><col style="width:15%"></colgroup><thead><tr><th>Item<br>No.</th><th>Qty</th><th>UOM</th><th>DESCRIPTION</th><th>CODE</th><th>ACCOUNTABLE<br>EMPLOYEE</th><th>REMARKS</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="row headrow"><div>Returned by:</div><div><i>(Please indicate name and affix signature)</i></div><div>Received by:</div><div>Action Taken<br><small>(To be filled by the Property Officer)</small></div></div>
      <div class="row"><div>Signature:</div><div></div><div></div><div></div></div><div class="row"><div>Printed Name:</div><div>${safe(requester)}</div><div></div><div></div></div><div class="row"><div>Designation:</div><div></div><div></div><div></div></div><div class="row"><div>Date:</div><div>${date(request.return_date)}</div><div></div><div></div></div>
      <div class="instructions"><h3>INSTRUCTIONS</h3><ol type="A"><li>The ARFRP shall be used by the accountable employee to return property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Property Custodian for the acceptance and by the Property Officer for updating of data and records;</li><li>Before receipt, the property shall be inspected and accomplish the Property Checklist;</li><li>This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;</li><li>The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 69); and</li><li>This form shall be prepared in two(2) copies distributed as follows:<div class="copy">Original – Supply and/or Property Division/Unit’s file<br>Copy 2 – Accountable Employee</div></li></ol></div></div><script>window.onload=()=>window.print()<\/script></body></html>`)
      win.document.close()
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
