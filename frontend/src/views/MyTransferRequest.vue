<template>
  <div>
    <div class="mb-4">
      <h2>Request for Property Transfer</h2>
      <p class="text-muted mb-0">Prepare and print a request to transfer property currently issued to you. Submit the signed form to the Property Office for checking and processing.</p>
    </div>

    <div class="card">
      <div class="card-header bg-white"><strong>Property to be transferred</strong></div>
      <div class="card-body">
        <div v-if="loading" class="text-muted">Loading your issued properties...</div>
        <div v-else-if="!properties.length" class="text-muted">You have no issued property available for a transfer request.</div>
        <form v-else @submit.prevent="printRequest">
          <div class="mb-3">
            <label class="form-label">Select Property <span class="text-danger">*</span></label>
            <select v-model="form.receiptId" class="form-select" required>
              <option value="">Select issued property</option>
              <option v-for="p in properties" :key="p.id" :value="String(p.id)">
                {{ p.items?.property_number || 'No property number' }} - {{ p.items?.description || 'Property' }} ({{ p.receipt_number }})
              </option>
            </select>
          </div>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Transfer To - Employee Name <span class="text-danger">*</span></label>
              <input v-model.trim="form.toName" class="form-control" required>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Receiving Office / Responsibility Center <span class="text-danger">*</span></label>
              <input v-model.trim="form.toOffice" class="form-control" required>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Reason for Transfer <span class="text-danger">*</span></label>
            <textarea v-model.trim="form.reason" class="form-control" rows="2" required></textarea>
          </div>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Date</label>
              <input v-model="form.date" type="date" class="form-control" required>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Paper Size</label>
              <select v-model="form.paperSize" class="form-select">
                <option value="long">Long (8.5 × 13 in)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="a4">A4</option>
              </select>
            </div>
          </div>
          <div class="alert alert-info small">
            Printing this form does not transfer the property automatically. The Property Office must review the request and process the transfer.
          </div>
          <button type="submit" class="btn btn-warning"><i class="bi bi-printer me-1"></i>Print Request for Property Transfer</button>
        </form>
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
      properties: [],
      form: {
        receiptId: '',
        toName: '',
        toOffice: '',
        reason: '',
        date: new Date().toISOString().slice(0, 10),
        paperSize: 'long'
      }
    }
  },
  mounted() {
    this.loadProperties()
  },
  methods: {
    async loadProperties() {
      try {
        const response = await fetch('/api/return-requests/eligible')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load issued properties.')
        this.properties = Array.isArray(data) ? data : []
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      } finally {
        this.loading = false
      }
    },
    escape(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    printRequest() {
      const property = this.properties.find(p => String(p.id) === String(this.form.receiptId))
      if (!property) return
      const user = JSON.parse(localStorage.getItem('user') || 'null') || {}
      const item = property.items || {}
      const esc = this.escape
      const paper = { long: '8.5in 13in', legal: '8.5in 14in', letter: '8.5in 11in', a4: '210mm 297mm' }
      const win = window.open('', '_blank', 'popup=yes,width=1100,height=900')
      if (!win) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please allow pop-ups to print the request.' }))
        return
      }
      const logo = new URL('../assets/LOGO.png', import.meta.url).href
      const date = new Date(this.form.date + 'T00:00:00').toLocaleDateString('en-PH')
      const amount = Number(item.cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Request for Property Transfer</title><style>
      @page{size:${paper[this.form.paperSize] || paper.long} portrait;margin:8mm}*{box-sizing:border-box}body{font:12px Arial;color:#111;margin:0}.sheet{width:100%;padding:4mm}.header{display:grid;grid-template-columns:22mm 1fr;text-align:center;border:1px solid #555}.logo{grid-row:span 2;border-right:1px solid #555;display:flex;align-items:center;justify-content:center}.logo img{width:18mm;height:18mm;object-fit:contain}.school{padding:3mm;font-weight:bold;line-height:1.4}.heading{border-top:1px solid #555;padding:3mm;font-weight:bold;font-size:14px}.rpt{text-align:right;font-weight:bold;margin:5mm 0}.date{margin:5mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:3mm 0}th,td{border:1px solid #555;padding:3mm;vertical-align:middle}th{text-align:center}.label{width:27%;font-weight:bold}.reason{min-height:22mm}.signatures{margin-top:12mm}.signatures td{height:18mm}.center{text-align:center}.code{margin-top:5mm;font-size:10px;font-weight:bold}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="sheet">
      <div class="header"><div class="logo"><img src="${logo}"></div><div class="school">Republic of the Philippines<br>NUEVA VIZCAYA STATE UNIVERSITY<br>Bambang, Nueva Vizcaya</div><div class="heading">REQUEST FOR PROPERTY TRANSFER</div></div>
      <div class="rpt">RPT No.: ____________________</div><div class="date">Date: ${esc(date)}</div>
      <table><tr><td class="label">From Accountable Employee / Responsibility Center:</td><td>${esc(user.full_name || '')} / ${esc(user.office_name || user.department || '')}</td></tr><tr><td class="label">To Accountable Employee / Responsibility Center:</td><td>${esc(this.form.toName)} / ${esc(this.form.toOffice)}</td></tr></table>
      <table><thead><tr><th>DATE ACQUIRED</th><th>PROPERTY NO.</th><th>DESCRIPTION</th><th>AMOUNT</th><th>CONDITION OF PPE</th></tr></thead><tbody><tr><td class="center">${esc(property.date_issued || '')}</td><td class="center">${esc(item.property_number || '')}</td><td>${esc(item.description || '')}</td><td class="center">${amount}</td><td class="center">${esc(item.condition || '')}</td></tr>${Array.from({length:7},()=>'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>
      <table><tr><td class="label">Reason for Transfer:</td><td class="reason">${esc(this.form.reason)}</td></tr></table>
      <table class="signatures"><tr><th></th><th>Requested by:</th><th>Approved by:</th><th>Concurred by:</th></tr><tr><td class="label">Signature:</td><td></td><td></td><td></td></tr><tr><td class="label">Printed Name:</td><td class="center">${esc(user.full_name || '')}</td><td></td><td></td></tr><tr><td class="label">Designation:</td><td></td><td></td><td></td></tr><tr><td class="label">Date:</td><td class="center">${esc(date)}</td><td></td><td></td></tr></table>
      <p class="code">NVSU-FR-SMO-02-00 (121421)</p></div><script>window.onload=()=>window.print()<\/script></body></html>`)
      win.document.close()
    }
  }
}
</script>
