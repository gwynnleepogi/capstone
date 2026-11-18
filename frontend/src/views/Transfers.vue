
<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Transfers</h2>
        <p class="text-muted">Transfer issued property to another employee</p>
      </div>

      <button class="btn btn-warning" @click="openAddModal">
        <i class="bi bi-arrow-left-right me-1"></i>
        New Transfer
      </button>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Search</label>
            <input
              type="text"
              class="form-control"
              v-model="search"
              placeholder="Search item, property no., employee, office..."
            >
          </div>

          <div class="col-md-3">
            <label class="form-label">Transfer Type</label>
            <select class="form-select" v-model="typeFilter">
              <option value="">All Types</option>
              <option value="To Employee">To Employee</option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label">Result</label>
            <select class="form-select" v-model="resultFilter">
              <option value="">All Results</option>
              <option value="Issued">Issued</option>
              <option value="Available">Available</option>
              <option value="Returned">Returned and Unserviceable</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Date</th>
                <th>Condition</th>
                <th>Property Status</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="transfer in paginatedTransfers" :key="transfer.id">
                <td>
                  <div>{{ transfer.items?.description || '-' }}</div>
                  <small class="text-muted">{{ transfer.items?.property_number || '' }}</small>
                </td>

                <td>{{ transfer.transfer_type }}</td>

                <td>
                  {{ transfer.from_user?.full_name || '-' }}
                  <div v-if="transfer.from_user?.job_title" class="small text-muted">
                    {{ transfer.from_user.job_title }}
                  </div>
                </td>

                <td>
                  <template v-if="transfer.transfer_type === 'To Employee'">
                    {{ transfer.to_user?.full_name || '-' }}
                    <div v-if="transfer.to_user?.job_title" class="small text-muted">
                      {{ transfer.to_user.job_title }}
                    </div>
                  </template>
                  <template v-else>Property Office</template>

                  <div v-if="transfer.offices?.office_name" class="small text-muted">
                    {{ transfer.offices.office_name }}
                  </div>
                </td>

                <td>{{ transfer.transfer_date || '-' }}</td>

                <td>
                  <span
                    class="badge"
                    :class="transfer.condition_after_transfer === 'Serviceable' ? 'bg-success' : 'bg-danger'"
                  >
                    {{ transfer.condition_after_transfer || '-' }}
                  </span>
                </td>

                <td>
                  <span class="badge" :class="getResultClass(transfer)">
                    {{ getResultLabel(transfer) }}
                  </span>
                </td>

                <td>{{ transfer.reason || '-' }}</td>
              </tr>

              <tr v-if="paginatedTransfers.length === 0">
                <td colspan="8" class="text-center text-muted py-4">
                  No transfers found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredTransfers.length > 0"
          class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3"
        >
          <div class="d-flex align-items-center gap-2">
            <label class="mb-0 text-muted small">Show</label>
            <select
              class="form-select form-select-sm"
              v-model.number="itemsPerPage"
              style="width: 75px"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span class="text-muted small">entries</span>
          </div>

          <div class="text-muted small">
            Showing {{ firstNumber }} to {{ lastNumber }} of {{ filteredTransfers.length }} transfers
          </div>

          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button
                  class="page-link"
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                >
                  Previous
                </button>
              </li>

              <li class="page-item active">
                <span class="page-link">{{ currentPage }} / {{ totalPages }}</span>
              </li>

              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button
                  class="page-link"
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- New Transfer Modal -->
    <div class="modal fade" id="transferModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Transfer</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              @click="resetEmployeeSearch"
            ></button>
          </div>

          <form @submit.prevent="saveTransfer">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">From Accountable Employee</label>
                <select class="form-select" v-model="form.from_user_id" required>
                  <option value="">Select current accountable employee</option>
                  <option v-for="person in sourceEmployees" :key="person.id" :value="person.id">{{ person.full_name }}</option>
                </select>
                <div v-if="sourceEmployees.length === 0" class="form-text text-warning">No issued properties are currently available for transfer.</div>
              </div>

              <div v-if="form.from_user_id" class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label mb-0">Select Properties to Transfer</label>
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleAllProperties" :disabled="selectableReceipts.length === 0">
                    {{ allPropertiesSelected ? 'Clear Selection' : 'Select All' }}
                  </button>
                </div>
                <div class="table-responsive border rounded">
                  <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr><th style="width:42px">Select</th><th>Property No.</th><th>Description</th><th>Amount</th><th>Condition</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="receipt in sourceReceipts" :key="receipt.id">
                        <td><input class="form-check-input" type="checkbox" v-model="form.property_receipt_ids" :value="receipt.id" :disabled="receipt.items?.condition !== 'Serviceable'"></td>
                        <td>{{ receipt.items?.property_number || '-' }}<div class="small text-muted">{{ receipt.receipt_number }}</div></td>
                        <td>{{ receipt.items?.description || '-' }}</td>
                        <td>₱{{ Number(receipt.items?.cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                        <td>
                          <span class="badge" :class="receipt.items?.condition === 'Serviceable' ? 'bg-success' : 'bg-danger'">{{ receipt.items?.condition || '-' }}</span>
                          <div v-if="receipt.items?.condition !== 'Serviceable'" class="small text-danger">Cannot transfer</div>
                        </td>
                      </tr>
                      <tr v-if="sourceReceipts.length === 0"><td colspan="5" class="text-center text-muted py-3">No issued properties found for this employee.</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="form-text">{{ form.property_receipt_ids.length }} property/properties selected. Only serviceable properties can be transferred.</div>
              </div>

              <div v-if="selectedSourceEmployee" class="alert alert-light border">
                <strong>From:</strong> {{ selectedSourceEmployee.full_name }}
                <div><strong>Current Responsibility Center:</strong> {{ selectedSourceResponsibilityCenter || 'Not specified' }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label d-block">Transfer To</label>
                <div class="text-muted small">
                  Another employee only
                </div>
              </div>

              <!-- Searchable Receiving Employee -->
              <div class="mb-3">
                <label class="form-label">Receiving Employee</label>

                <div class="position-relative">
                  <input
                    type="text"
                    class="form-control"
                    v-model="employeeSearch"
                    placeholder="Search employee name or job title..."
                    autocomplete="off"
                    @focus="showEmployeeOptions = true"
                    @input="showEmployeeOptions = true"
                  >

                  <div
                    v-if="showEmployeeOptions"
                    class="list-group position-absolute w-100 shadow"
                    style="max-height: 200px; overflow-y: auto; z-index: 1056;"
                  >
                    <button
                      v-for="person in filteredReceivingEmployees"
                      :key="person.id"
                      type="button"
                      class="list-group-item list-group-item-action"
                      :class="{ active: form.to_user_id === person.id }"
                      @click="selectReceivingEmployee(person)"
                    >
                      <div>{{ person.full_name }}</div>
                      <small
                        v-if="person.job_title"
                        :class="form.to_user_id === person.id ? 'text-white' : 'text-muted'"
                      >
                        {{ person.job_title }}
                      </small>
                    </button>

                    <div
                      v-if="filteredReceivingEmployees.length === 0"
                      class="list-group-item text-muted"
                    >
                      No employee found.
                    </div>
                  </div>
                </div>

                <div v-if="selectedReceivingEmployee" class="mt-2">
                  <label class="form-label">Title</label>
                  <input
                    class="form-control"
                    :value="selectedReceivingEmployee.job_title || ''"
                    readonly
                  >
                </div>

              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">
                    Office <span class="text-muted">(optional)</span>
                  </label>

                  <select class="form-select" v-model="form.office_id">
                    <option value="">None</option>
                    <option
                      v-for="office in offices"
                      :key="office.id"
                      :value="office.id"
                    >
                      {{ office.office_name }}
                    </option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Transfer Date</label>
                  <input
                    type="date"
                    class="form-control"
                    v-model="form.transfer_date"
                    required
                  >
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Reason for Transfer</label>
                <select class="form-select" v-model="form.reason" required>
                  <option value="">Select a reason</option>
                  <option value="End of Contract">End of Contract</option>
                  <option value="Transfer of Agency">Transfer of Agency</option>
                  <option value="Resignation">Resignation</option>
                  <option value="Change of Designation">Change of Designation</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Others">Others</option>
                </select>

                <input
                  v-if="form.reason === 'Others'"
                  type="text"
                  class="form-control mt-2"
                  v-model.trim="form.otherReason"
                  placeholder="Enter reason"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Remarks</label>
                <textarea
                  class="form-control"
                  rows="2"
                  v-model="form.remarks"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
                @click="resetEmployeeSearch"
              >
                Cancel
              </button>

              <button type="submit" class="btn btn-warning" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Transfer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal fade" id="transferPrintModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Property Acknowledgement Receipt - Transfer</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">Complete these details before printing the transfer receipt.</p>
            <div class="mb-3">
              <label class="form-label">RPT No.</label>
              <input class="form-control" v-model.trim="printDetails.rptNumber" placeholder="Enter RPT number">
            </div>
            <div class="mb-3">
              <label class="form-label d-block">Acknowledgement Classification</label>
              <div class="row g-2">
                <div class="col-md-6" v-for="classification in acknowledgementClassifications" :key="classification">
                  <label class="form-check">
                    <input class="form-check-input" type="checkbox" v-model="printDetails.classifications" :value="classification">
                    <span class="form-check-label">{{ classification }}</span>
                  </label>
                </div>
              </div>
            </div>
            <hr>
            <h6>Received by</h6>
            <div class="row g-3 mb-3">
              <div class="col-md-6"><label class="form-label">Printed Name</label><input class="form-control" v-model.trim="printDetails.receivedBy.name"></div>
              <div class="col-md-6"><label class="form-label">Designation</label><input class="form-control" v-model.trim="printDetails.receivedBy.designation"></div>
              <div class="col-md-6"><label class="form-label">Date</label><input type="date" class="form-control" v-model="printDetails.receivedBy.date"></div>
            </div>
            <hr>
            <h6>Issued by</h6>
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">Printed Name</label><input class="form-control" v-model.trim="printDetails.issuedBy.name"></div>
              <div class="col-md-6"><label class="form-label">Designation</label><input class="form-control" v-model.trim="printDetails.issuedBy.designation"></div>
              <div class="col-md-6"><label class="form-label">Date</label><input type="date" class="form-control" v-model="printDetails.issuedBy.date"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-warning" @click="printTransferReceipt">Print Receipt</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'Transfers',

  data() {
    return {
      transfers: [],
      receipts: [],
      personnel: [],
      offices: [],

      search: '',
      typeFilter: '',
      resultFilter: '',

      currentPage: 1,
      itemsPerPage: 10,
      saving: false,
      transferPrintData: null,
      acknowledgementClassifications: [
        'NEW', 'RENEWAL', 'UPDATING', 'TRANSFER',
        'CLEARANCE-w/ Retain Accountability',
        'RETURNED Unserviceable', 'RETURNED Serviceable', 'RETURNED for Repair'
      ],
      printDetails: this.emptyPrintDetails(),

      // Receiving employee search
      employeeSearch: '',
      showEmployeeOptions: false,

      form: this.emptyForm()
    }
  },

  computed: {
    sourceEmployees() {
      const unique = new Map()
      this.receipts.forEach(receipt => {
        if (receipt.issued_to && receipt.users?.full_name) unique.set(receipt.issued_to, { id: receipt.issued_to, full_name: receipt.users.full_name })
      })
      return [...unique.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' }))
    },

    sourceReceipts() {
      return this.receipts.filter(receipt => receipt.issued_to === this.form.from_user_id)
    },

    selectableReceipts() {
      return this.sourceReceipts.filter(receipt => receipt.items?.condition === 'Serviceable')
    },

    allPropertiesSelected() {
      return this.selectableReceipts.length > 0 && this.selectableReceipts.every(receipt => this.form.property_receipt_ids.includes(receipt.id))
    },

    selectedSourceEmployee() {
      return this.sourceEmployees.find(person => person.id === this.form.from_user_id) || null
    },

    selectedSourceResponsibilityCenter() {
      const selected = this.sourceReceipts.find(receipt => this.form.property_receipt_ids.includes(receipt.id)) || this.sourceReceipts[0]
      return selected?.items?.responsibility_center || ''
    },

    receivingEmployees() {
      const holderId = this.form.from_user_id

      return this.personnel
        .filter(person => person.id !== holderId)
        .sort((first, second) =>
          first.full_name.localeCompare(second.full_name, undefined, {
            sensitivity: 'base'
          })
        )
    },

    // Employees matching the search input
    filteredReceivingEmployees() {
      const search = this.employeeSearch.toLowerCase().trim()

      return this.receivingEmployees.filter(person => {
        const name = (person.full_name || '').toLowerCase()
        const title = (person.job_title || '').toLowerCase()

        return name.includes(search) || title.includes(search)
      })
    },

    selectedReceivingEmployee() {
      return this.receivingEmployees.find(
        person => person.id === this.form.to_user_id
      ) || null
    },

    filteredTransfers() {
      const text = this.search.toLowerCase().trim()

      return this.transfers.filter(transfer => {
        const haystack = [
          transfer.items?.description,
          transfer.items?.property_number,
          transfer.from_user?.full_name,
          transfer.to_user?.full_name,
          transfer.offices?.office_name,
          transfer.reason
        ].join(' ').toLowerCase()

        return (
          (!text || haystack.includes(text)) &&
          (!this.typeFilter || transfer.transfer_type === this.typeFilter) &&
          (!this.resultFilter || transfer.resulting_status === this.resultFilter)
        )
      })
    },

    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredTransfers.length / this.itemsPerPage)
      )
    },

    paginatedTransfers() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      return this.filteredTransfers.slice(start, start + this.itemsPerPage)
    },

    firstNumber() {
      return this.filteredTransfers.length === 0
        ? 0
        : (this.currentPage - 1) * this.itemsPerPage + 1
    },

    lastNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredTransfers.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    typeFilter() {
      this.currentPage = 1
    },

    resultFilter() {
      this.currentPage = 1
    },

    itemsPerPage() {
      this.currentPage = 1
    },

    totalPages(value) {
      if (this.currentPage > value) {
        this.currentPage = value
      }
    },

    'form.from_user_id'() {
      this.form.property_receipt_ids = []
      this.form.to_user_id = ''
      this.employeeSearch = ''
      this.showEmployeeOptions = false
    },

    'form.to_user_id'() {
      if (!this.form.to_user_id) {
        this.employeeSearch = ''
      }
    }
  },

  mounted() {
    this.getTransfers()
    this.getReceipts()
    this.getPersonnel()
    this.getOffices()
  },

  methods: {
    emptyPrintDetails() {
      const today = new Date().toISOString().split('T')[0]
      return {
        rptNumber: '',
        classifications: ['TRANSFER'],
        receivedBy: { name: '', designation: '', date: today },
        issuedBy: { name: '', designation: '', date: today }
      }
    },

    emptyForm() {
      return {
        from_user_id: '',
        property_receipt_ids: [],
        transfer_type: 'To Employee',
        to_user_id: '',
        office_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        condition_after_transfer: 'Serviceable',
        reason: '',
        otherReason: '',
        remarks: ''
      }
    },

    toast(message) {
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: message })
      )
    },

    async load(url, fallbackMessage) {
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || fallbackMessage)
      }

      return Array.isArray(data) ? data : []
    },

    async getTransfers() {
      try {
        this.transfers = await this.load(
          '/api/transfers',
          'Failed to load transfers'
        )
      } catch (error) {
        this.toast(error.message)
      }
    },

    async getReceipts() {
      try {
        this.receipts = await this.load(
          '/api/transfers/eligible-receipts',
          'Failed to load issued property'
        )
      } catch (error) {
        this.toast(error.message)
      }
    },

    async getPersonnel() {
      try {
        this.personnel = await this.load(
          '/api/personnel',
          'Failed to load personnel'
        )
      } catch (error) {
        console.log(error)
      }
    },

    async getOffices() {
      try {
        this.offices = await this.load(
          '/api/offices',
          'Failed to load offices'
        )
      } catch (error) {
        console.log(error)
      }
    },

    openAddModal() {
      this.form = this.emptyForm()
      this.employeeSearch = ''
      this.showEmployeeOptions = false

      Modal.getOrCreateInstance(
        document.getElementById('transferModal')
      ).show()
    },

    toggleAllProperties() {
      this.form.property_receipt_ids = this.allPropertiesSelected
        ? []
        : this.selectableReceipts.map(receipt => receipt.id)
    },

    selectReceivingEmployee(person) {
      this.form.to_user_id = person.id
      this.employeeSearch = person.full_name
      this.showEmployeeOptions = false
    },

    resetEmployeeSearch() {
      this.employeeSearch = ''
      this.showEmployeeOptions = false
      this.form.to_user_id = ''
    },

    async saveTransfer() {
      if (!this.form.property_receipt_ids.length) {
        this.toast('Please select at least one property to transfer.')
        return
      }
      if (!this.form.to_user_id) {
        this.toast('Please select the receiving employee.')
        return
      }

      this.saving = true
      let transferredCount = 0
      const selectedReceipts = this.sourceReceipts.filter(receipt =>
        this.form.property_receipt_ids.includes(receipt.id)
      )
      const transferInfo = {
        receipts: selectedReceipts,
        fromEmployee: this.selectedSourceEmployee,
        toEmployee: this.selectedReceivingEmployee,
        officeName: this.offices.find(item => item.id === this.form.office_id)?.office_name || '',
        transferDate: this.form.transfer_date,
        remarks: this.form.reason === 'Others' ? `Others: ${this.form.otherReason.trim()}` : this.form.reason,
        notes: this.form.remarks
      }

      try {
        for (const receiptId of this.form.property_receipt_ids) {
          const response = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_receipt_id: receiptId,
              transfer_type: 'To Employee',
              to_user_id: this.form.to_user_id,
              office_id: this.form.office_id || null,
              transfer_date: this.form.transfer_date,
              condition_after_transfer: null,
              reason: transferInfo.remarks,
              remarks: this.form.remarks
            })
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Failed to transfer a selected property')
          transferredCount++
        }

        this.transferPrintData = transferInfo
        this.printDetails = this.emptyPrintDetails()
        Modal.getOrCreateInstance(document.getElementById('transferModal')).hide()
        this.employeeSearch = ''
        this.showEmployeeOptions = false
        await Promise.all([this.getTransfers(), this.getReceipts()])
        this.form = this.emptyForm()
        this.toast(`${transferredCount} propert${transferredCount === 1 ? 'y' : 'ies'} transferred successfully.`)
        this.$nextTick(() => {
          Modal.getOrCreateInstance(document.getElementById('transferPrintModal')).show()
        })
      } catch (error) {
        if (transferredCount > 0) {
          await Promise.all([this.getTransfers(), this.getReceipts()])
          this.toast(`${transferredCount} propert${transferredCount === 1 ? 'y' : 'ies'} transferred. Remaining transfer stopped: ${error.message}`)
          this.form = this.emptyForm()
        } else {
          this.toast(error.message)
        }
      } finally {
        this.saving = false
      }
    },

    escapePrint(value) {
      return String(value === null || value === undefined || value === '' ? '-' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    },

    printTransferReceipt() {
      if (!this.transferPrintData) {
        this.toast('Transfer details are not available for printing.')
        return
      }
      const data = this.transferPrintData
      const details = this.printDetails
      const esc = this.escapePrint
      const total = data.receipts.reduce((sum, receipt) =>
        sum + Number(receipt.items?.cost || 0) * Number(receipt.quantity || 1), 0
      )
      const classifications = this.acknowledgementClassifications.map(label =>
        `<span>${details.classifications.includes(label) ? '☑' : '☐'} ${esc(label)}</span>`
      ).join('')
      const rows = data.receipts.map(receipt => {
        const item = receipt.items || {}
        const qty = Number(receipt.quantity || 1)
        const unitValue = Number(item.cost || 0)
        return `<tr>
          <td class="center">${qty}</td><td class="center">unit</td><td>${esc(item.description)}</td>
          <td class="center">${esc(item.property_number)}</td>
          <td class="center">${esc(item.acquisition_date || receipt.date_issued)}</td>
          <td class="number">${unitValue.toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
          <td class="number">${(unitValue*qty).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
        </tr>`
      }).join('')
      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.toast('Please allow pop-ups to print the transfer receipt.')
        return
      }
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      const responsibilityCenter = data.officeName || data.receipts[0]?.items?.responsibility_center || '-'
      const formatDate = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}) : ''
      printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Property Acknowledgement Receipt - Transfer</title>
<style>
@page{size:8.5in 13in portrait;margin:12mm}*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:10px;margin:0}
.header{display:grid;grid-template-columns:58px 1fr 85px;align-items:center;text-align:center;margin-bottom:5px}
.logo{width:48px;height:48px;object-fit:contain}.school{font-size:15px;font-weight:bold}
.campus{font-size:10px;line-height:1.3}.appendix{text-align:right;font-weight:bold;align-self:start}
h1{text-align:center;font-size:13px;margin:5px 0 8px}
.meta{display:flex;justify-content:space-between;border-bottom:1px solid #000;padding:3px 0 5px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border-bottom:1px solid #777;padding:4px 3px;vertical-align:top;overflow-wrap:anywhere}
th{text-align:center;border-top:1px solid #000;border-bottom:1px solid #000}
.items th{font-size:9px}.items td{font-size:9px}.center{text-align:center}.number{text-align:right;white-space:nowrap}
.total td{border-top:1px solid #000;font-weight:bold}.nothing{text-align:center;border-bottom:1px solid #000;padding:5px}
.remarks{border-bottom:1px solid #000;padding:6px 0;min-height:25px}
.classification{margin-top:245px;border-top:1px solid #000;padding-top:12px}
.classification-title{font-size:12px;font-weight:bold;text-decoration:underline;margin-bottom:10px}
.classification-list{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px 10px;font-size:10px}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:38px}
.sign-block{text-align:center;min-height:90px}.sign-heading{text-align:left;font-weight:bold;margin-bottom:42px}
.sign-name{font-weight:bold;text-transform:uppercase}.sign-designation{font-size:9px;margin-top:2px}
.sign-date{font-size:9px;margin-top:3px}.page-number{text-align:right;border-top:1px solid #000;padding-top:5px;margin-top:120px;font-size:10px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="header"><img class="logo" src="${logoUrl}" alt="NVSU Logo">
<div><div>Republic of the Philippines</div><div class="school">NUEVA VIZCAYA STATE UNIVERSITY</div><div class="campus">Bambang Campus<br>Bambang, Nueva Vizcaya</div></div>
<div class="appendix">Appendix 71</div></div>
<h1>PROPERTY ACKNOWLEDGEMENT RECEIPT - TRANSFER</h1>
<div class="meta"><div><strong>Responsibility Center:</strong> ${esc(responsibilityCenter)}</div><div><strong>RPT NO:</strong> ${esc(details.rptNumber)}</div></div>
<table class="items"><colgroup><col style="width:5%"><col style="width:7%"><col style="width:39%"><col style="width:14%"><col style="width:11%"><col style="width:12%"><col style="width:12%"></colgroup>
<thead><tr><th>Qty</th><th>Unit</th><th>Article and Description</th><th>Property Number</th><th>Date Acquired</th><th>Unit Value</th><th>Total Value</th></tr></thead>
<tbody>${rows}<tr class="total"><td colspan="5" class="number">Total</td><td></td><td class="number">${total.toLocaleString('en-PH',{minimumFractionDigits:2})}</td></tr></tbody></table>
<div class="nothing">NOTHING FOLLOWS</div><div class="remarks"><strong>Remarks:</strong> ${esc(data.notes || data.remarks || '')}</div>
<div class="classification"><div class="classification-title">ACKNOWLEDGEMENT CLASSIFICATION</div><div class="classification-list">${classifications}</div></div>
<div class="signatures">
<div class="sign-block"><div class="sign-heading">Received by:</div><div class="sign-name">${esc(details.receivedBy.name)}</div><div class="sign-designation">${esc(details.receivedBy.designation)}</div><div class="sign-date">${esc(formatDate(details.receivedBy.date))}</div></div>
<div class="sign-block"><div class="sign-heading">Issued by:</div><div class="sign-name">${esc(details.issuedBy.name)}</div><div class="sign-designation">${esc(details.issuedBy.designation)}</div><div class="sign-date">${esc(formatDate(details.issuedBy.date))}</div></div>
</div><div class="page-number">Page 1 of 1</div>
<script>window.onload=function(){const logo=document.querySelector('.logo');if(logo&&!logo.complete){logo.onload=function(){window.print()};logo.onerror=function(){window.print()}}else{window.print()}}<\/script>
</body></html>`)
      printWindow.document.close()
    },

    getResultLabel(transfer) {
      if (
        transfer.resulting_status === 'Returned' &&
        transfer.condition_after_transfer === 'Unserviceable'
      ) {
        return 'Returned and Unserviceable'
      }

      return transfer.resulting_status || '-'
    },

    getResultClass(transfer) {
      if (transfer.resulting_status === 'Available') return 'bg-success'
      if (transfer.resulting_status === 'Issued') return 'bg-warning text-dark'
      if (transfer.resulting_status === 'Returned') return 'bg-danger'

      return 'bg-secondary'
    }
  }
}
</script>

<style scoped>
.page-link {
  color: #856404;
}

.page-item.active .page-link {
  background-color: var(--app-gold);
  border-color: var(--app-gold);
  color: var(--app-forest);
}

@media (max-width: 576px) {
  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: .5rem auto;
  }
}
</style>
