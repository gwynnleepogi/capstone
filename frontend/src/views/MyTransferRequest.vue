<template>
  <div>
    <div class="mb-4">
      <h2>Request for Property Transfer</h2>
      <p class="text-muted mb-0">Prepare a request to transfer property currently issued to you.</p>
    </div>
    <div class="card mb-4">
      <div class="card-header bg-white"><strong>Property Transfer Details</strong></div>
      <div class="card-body">
        <div v-if="loading" class="text-muted">Loading your issued properties...</div>
        <div v-else-if="!properties.length" class="text-muted">You have no issued property available for a transfer request.</div>
        <form v-else @submit.prevent="printRequest">
          <div class="mb-4">
            <label class="form-label">From Accountable Employee / Responsibility Center</label>
            <div class="form-control bg-light">
              <strong>{{ currentUser.full_name || 'Your account' }}</strong>
              <span class="text-muted"> / {{ currentUser.office_name || currentUser.department || 'Office not specified' }}</span>
            </div>
          </div>
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0">Select Properties to Transfer <span class="text-danger">*</span></label>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleAllProperties">
                {{ allPropertiesSelected ? 'Clear Selection' : 'Select All' }}
              </button>
            </div>
            <div class="mb-2">
              <input v-model.trim="propertySearch" type="search" class="form-control" placeholder="Search by property number, description, receipt number, or condition...">
            </div>
            <div class="table-responsive border rounded">
              <table class="table table-sm table-hover align-middle mb-0 property-selection-table">

                <thead class="table-light">
                  <tr><th class="select-column">Select</th><th>Property No.</th><th>Description</th><th class="amount-column">Amount</th><th>Condition</th></tr>
                </thead>
                <tbody>
                  <tr v-for="property in filteredProperties" :key="property.id">
                    <td class="select-column"><input class="form-check-input" type="checkbox" v-model="form.receiptIds" :value="String(property.id)"></td>
                    <td>{{ property.items?.property_number || '-' }}<div class="small text-muted">{{ property.receipt_number || '' }}</div></td>
                    <td>{{ property.items?.description || '-' }}</td>
                    <td>₱{{ Number(property.items?.cost || property.items?.unit_value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td><span class="badge" :class="property.items?.condition === 'Serviceable' ? 'bg-success' : 'bg-secondary'">{{ property.items?.condition || '-' }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div v-if="filteredProperties.length === 0" class="text-center text-muted small py-3">No properties match your search.</div>
            </div>
            <div class="form-text">{{ form.receiptIds.length }} property/properties selected.</div>
          </div>
          <hr>
          <h6 class="mb-3">Transfer To</h6>
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label">Receiving Employee <span class="text-danger">*</span></label>
              <div class="position-relative">
                <input type="text" class="form-control" v-model.trim="form.toName" placeholder="Search employee name or job title..." autocomplete="off" required @focus="showEmployeeOptions = true" @input="handleTransferEmployeeInput">
                <div v-if="showEmployeeOptions" class="list-group position-absolute w-100 shadow" style="max-height:220px;overflow-y:auto;z-index:1056;">
                  <button v-for="person in filteredPersonnel" :key="person.id" type="button" class="list-group-item list-group-item-action" @mousedown.prevent="selectTransferEmployee(person)">
                    <div>{{ person.full_name }}</div>
                    <small class="text-muted">{{ person.job_title || person.role || 'Employee' }}<span v-if="person.office_name"> · {{ person.office_name }}</span></small>
                  </button>
                  <div v-if="filteredPersonnel.length === 0" class="list-group-item text-muted">No matching employee. You can enter a new employee name manually.</div>
                </div>
              </div>
              <small class="form-text text-muted">Choose an employee account or enter a new employee name.</small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Title</label>
              <input class="form-control bg-light" :value="selectedEmployee ? (selectedEmployee.job_title || selectedEmployee.role || '') : ''" placeholder="Automatically filled when an employee is selected" readonly>
            </div>
            <div class="col-md-6">
              <label class="form-label">Receiving Office / Responsibility Center <span class="text-danger">*</span></label>
              <input v-model.trim="form.toOffice" class="form-control" list="transferOfficeOptions" placeholder="Search or enter receiving office" autocomplete="off" required>
              <datalist id="transferOfficeOptions"><option v-for="office in availableOffices" :key="office" :value="office"></option></datalist>
            </div>
            <div class="col-md-6">
              <label class="form-label">Transfer Date <span class="text-danger">*</span></label>
              <input v-model="form.date" type="date" class="form-control" required>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Reason for Transfer <span class="text-danger">*</span></label>
            <select v-model="form.reason" class="form-select" required>
              <option value="">Select a reason</option>
              <option value="End of Contract">End of Contract</option>
              <option value="Transfer of Agency">Transfer of Agency</option>
              <option value="Resignation">Resignation</option>
              <option value="Change of Designation">Change of Designation</option>
              <option value="Retirement">Retirement</option>
              <option value="Others">Others</option>
            </select>
            <input v-if="form.reason === 'Others'" v-model.trim="form.otherReason" class="form-control mt-2" placeholder="Enter reason" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Remarks</label>
            <textarea v-model.trim="form.remarks" class="form-control" rows="2" placeholder="Enter additional remarks (optional)"></textarea>
          </div>
          <div class="alert alert-light border small">Printing this form does not transfer the property automatically. The Property Office must review the request and process the transfer.</div>
          <div class="d-flex justify-content-end">
            <button type="submit" class="btn btn-warning"><i class="bi bi-printer me-1"></i>Print Request for Property Transfer</button>
          </div>
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
      propertySearch: '',
      personnel: [],
      showEmployeeOptions: false,
      currentUser: JSON.parse(localStorage.getItem('user') || 'null') || {},
      form: {
        receiptIds: [],
        toName: '',
        toOffice: '',
        officeAutoFilled: false,
        reason: '',
        otherReason: '',
        remarks: '',
        date: new Date().toISOString().slice(0, 10),
        paperSize: 'long'
      }
    }
  },
  mounted() {
    this.loadProperties()
    this.loadPersonnel()
  },
  computed: {
    filteredProperties() {
      const search = this.propertySearch.trim().toLowerCase()
      if (!search) return this.properties
      return this.properties.filter(property => {
        const item = property.items || {}
        const values = [
          item.property_number,
          item.description,
          property.receipt_number,
          item.condition,
          item.cost,
          item.unit_value
        ]
        return values.some(value => String(value == null ? '' : value).toLowerCase().includes(search))
      })
    },
    selectedEmployee() {
      return this.personnel.find(person =>
        String(person.full_name || '').trim().toLowerCase() === this.form.toName.trim().toLowerCase()
      ) || null
    },
    filteredPersonnel() {
      const search = this.form.toName.trim().toLowerCase()
      const currentId = this.currentUser.id
      return this.personnel
        .filter(person => person.id !== currentId)
        .filter(person => {
          const name = String(person.full_name || '').toLowerCase()
          const title = String(person.job_title || person.role || '').toLowerCase()
          return !search || name.includes(search) || title.includes(search)
        })
        .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), undefined, { sensitivity: 'base' }))
    },
    allPropertiesSelected() {
      return this.properties.length > 0 && this.properties.every(property => this.form.receiptIds.includes(String(property.id)))
    },
    availableOffices() {
      return [...new Set(this.personnel.map(person => person.office_name).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
    }
  },
  methods: {
    handleTransferEmployeeInput() {
      this.showEmployeeOptions = true
      const enteredName = this.form.toName.trim().toLowerCase()
      const matchedEmployee = this.personnel.find(person =>
        String(person.full_name || '').trim().toLowerCase() === enteredName
      )

      if (matchedEmployee) {
        this.form.toOffice = matchedEmployee.office_name || ''
        this.form.officeAutoFilled = Boolean(matchedEmployee.office_name)
      } else if (this.form.officeAutoFilled) {
        this.form.toOffice = ''
        this.form.officeAutoFilled = false
      }
    },

    selectTransferEmployee(person) {
      this.form.toName = person.full_name || ''
      this.form.toOffice = person.office_name || ''
      this.form.officeAutoFilled = Boolean(person.office_name)
      this.showEmployeeOptions = false
    },
    toggleAllProperties() {
      if (this.allPropertiesSelected) {
        this.form.receiptIds = []
      } else {
        this.form.receiptIds = this.properties.map(property => String(property.id))
      }
    },
    async loadPersonnel() {
      try {
        const response = await fetch('/api/personnel/directory')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load employee directory.')
        this.personnel = Array.isArray(data) ? data : []
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      }
    },
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
      const selectedProperties = this.properties.filter(p => this.form.receiptIds.includes(String(p.id)))
      if (!selectedProperties.length) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please select at least one property.' }))
        return
      }
      const user = this.currentUser
      const esc = this.escape
      const paper = { long: '8.5in 13in', legal: '8.5in 14in', letter: '8.5in 11in', a4: '210mm 297mm' }
      const win = window.open('', '_blank', 'popup=yes,width=1100,height=900')
      if (!win) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please allow pop-ups to print the request.' }))
        return
      }
      const logo = new URL('../assets/LOGO.png', import.meta.url).href
      const date = new Date(this.form.date + 'T00:00:00').toLocaleDateString('en-PH')
      const propertyRows = selectedProperties.map(property => {
        const item = property.items || {}
        const amount = Number(item.cost || item.unit_value || item.unitValue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
        const acquired = property.date_acquired || item.date_acquired || property.date_issued || ''
        return '<tr><td class="center">' + esc(acquired) + '</td><td class="center">' + esc(item.property_number || '') + '</td><td>' + esc(item.description || '') + '</td><td class="center">' + amount + '</td><td class="center">' + esc(item.condition || '') + '</td></tr>'
      }).join('')
      const blankRows = Array.from({ length: Math.max(0, 8 - selectedProperties.length) }, () => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('')
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Request for Property Transfer</title><style>
      @page{size:${paper[this.form.paperSize] || paper.long} portrait;margin:8mm}*{box-sizing:border-box}body{font:12px Arial;color:#111;margin:0}.sheet{width:100%;padding:4mm}.header{display:grid;grid-template-columns:22mm 1fr;text-align:center;border:1px solid #555}.logo{grid-row:span 2;border-right:1px solid #555;display:flex;align-items:center;justify-content:center}.logo img{width:18mm;height:18mm;object-fit:contain}.school{padding:3mm;font-weight:bold;line-height:1.4}.heading{border-top:1px solid #555;padding:3mm;font-weight:bold;font-size:14px}.rpt{text-align:right;font-weight:bold;margin:5mm 0}.date{margin:5mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:3mm 0}th,td{border:1px solid #555;padding:3mm;vertical-align:middle}th{text-align:center}.label{width:27%;font-weight:bold}.reason{min-height:22mm}.signatures{margin-top:12mm}.signatures td{height:18mm}.center{text-align:center}.code{margin-top:5mm;font-size:10px;font-weight:bold}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="sheet">
      <div class="header"><div class="logo"><img src="${logo}"></div><div class="school">Republic of the Philippines<br>NUEVA VIZCAYA STATE UNIVERSITY<br>Bambang, Nueva Vizcaya</div><div class="heading">REQUEST FOR PROPERTY TRANSFER</div></div>
      <div class="rpt">RPT No.: ____________________</div><div class="date">Date: ${esc(date)}</div>
      <table><tr><td class="label">From Accountable Employee / Responsibility Center:</td><td>${esc(user.full_name || '')} / ${esc(user.office_name || user.department || '')}</td></tr><tr><td class="label">To Accountable Employee / Responsibility Center:</td><td>${esc(this.form.toName)} / ${esc(this.form.toOffice)}</td></tr></table>
      <table><thead><tr><th>DATE ACQUIRED</th><th>PROPERTY NO.</th><th>DESCRIPTION</th><th>AMOUNT</th><th>CONDITION OF PPE</th></tr></thead><tbody>${propertyRows}${blankRows}</tbody></table>
      <table><tr><td class="label">Reason for Transfer:</td><td class="reason">${esc(this.form.reason === 'Others' ? this.form.otherReason : this.form.reason)}${this.form.remarks ? '<br><strong>Remarks:</strong> ' + esc(this.form.remarks) : ''}</td></tr></table>
      <table class="signatures"><tr><th></th><th>Requested by:</th><th>Approved by:</th><th>Concurred by:</th></tr><tr><td class="label">Signature:</td><td></td><td></td><td></td></tr><tr><td class="label">Printed Name:</td><td class="center">${esc(user.full_name || '')}</td><td></td><td></td></tr><tr><td class="label">Designation:</td><td></td><td></td><td></td></tr><tr><td class="label">Date:</td><td class="center">${esc(date)}</td><td></td><td></td></tr></table>
      <p class="code">NVSU-FR-SMO-02-00 (121421)</p></div><script>window.onload=()=>window.print()<\/script></body></html>`)
      win.document.close()
    }
  }
}
</script>

<style scoped>
.property-selection-table {
  min-width: 760px;
}
.property-selection-table th,
.property-selection-table td {
  white-space: nowrap;
}
.property-selection-table th:nth-child(3),
.property-selection-table td:nth-child(3) {
  white-space: normal;
  min-width: 260px;
}
.property-selection-table .select-column {
  width: 76px;
  min-width: 76px;
  text-align: center;
  white-space: nowrap;
}
.property-selection-table .amount-column {
  min-width: 120px;
  text-align: right;
}
.property-selection-table .form-check-input {
  display: inline-block;
  margin: 0;
  vertical-align: middle;
}
</style>
