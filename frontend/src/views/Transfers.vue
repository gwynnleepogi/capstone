
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
                <th class="text-center">Action</th>
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
                <td class="text-center">
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="openTransferDetails(transfer)">
                    <i class="bi bi-eye me-1"></i>Details
                  </button>
                </td>
              </tr>

              <tr v-if="paginatedTransfers.length === 0">
                <td colspan="9" class="text-center text-muted py-4">
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
    <div class="modal fade" id="transferDetailsModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Transfer Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="selectedTransferDetails">
            <div class="row g-3">
              <div class="col-md-6">
                <small class="text-muted d-block">Property</small>
                <strong>{{ selectedTransferDetails.items?.description || '-' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">Property Number</small>
                <strong>{{ selectedTransferDetails.items?.property_number || '-' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">From Accountable Employee</small>
                <strong>{{ selectedTransferDetails.from_user?.full_name || selectedTransferDetails.items?.accountable_employee || '-' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">To Accountable Employee / Office</small>
                <strong>{{ selectedTransferDetails.to_user?.full_name || selectedTransferDetails.offices?.office_name || 'Property Office' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">Transfer Date</small>
                <strong>{{ selectedTransferDetails.transfer_date || '-' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">Condition</small>
                <strong>{{ selectedTransferDetails.condition_after_transfer || '-' }}</strong>
              </div>
              <div class="col-12">
                <small class="text-muted d-block">Reason for Transfer</small>
                <strong>{{ selectedTransferDetails.reason || '-' }}</strong>
              </div>
              <div class="col-12" v-if="selectedTransferDetails.remarks">
                <small class="text-muted d-block">Remarks</small>
                <strong>{{ selectedTransferDetails.remarks }}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer justify-content-between">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <div class="d-flex gap-2 flex-wrap">
              <button type="button" class="btn btn-outline-primary" @click="printRPTFromDetails">
                <i class="bi bi-printer me-1"></i>Print RPT
              </button>
              <button type="button" class="btn btn-success" @click="printReceiptFromDetails">
                <i class="bi bi-receipt me-1"></i>Print Property Acknowledgement Receipt - Transfer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="propertyTransferRequestModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Print Request for Property Transfer</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">Complete the approval and signatory details before printing the Request for Property Transfer form.</p>
            <div class="mb-3">
              <label class="form-label">RPT No.</label>
              <input class="form-control" v-model.trim="requestPrintDetails.rptNumber" placeholder="Enter RPT number">
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Requested by - Printed Name</label>
                <input class="form-control" v-model.trim="requestPrintDetails.requestedBy.name">
              </div>
              <div class="col-md-6">
                <label class="form-label">Requested by - Designation</label>
                <input class="form-control" v-model.trim="requestPrintDetails.requestedBy.designation">
              </div>
              <div class="col-md-6">
                <label class="form-label">Approved by - Printed Name</label>
                <input class="form-control" v-model.trim="requestPrintDetails.approvedBy.name">
              </div>
              <div class="col-md-6">
                <label class="form-label">Approved by - Designation</label>
                <input class="form-control" v-model.trim="requestPrintDetails.approvedBy.designation">
              </div>
              <div class="col-md-6">
                <label class="form-label">Concurred by - Printed Name</label>
                <input class="form-control" v-model.trim="requestPrintDetails.concurredBy.name">
              </div>
              <div class="col-md-6">
                <label class="form-label">Concurred by - Designation</label>
                <input class="form-control" v-model.trim="requestPrintDetails.concurredBy.designation">
              </div>
              <div class="col-12">
                <label class="form-label">Action Taken (Property Officer)</label>
                <textarea class="form-control" rows="2" v-model.trim="requestPrintDetails.actionTaken"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="printPropertyTransferRequest">
              <i class="bi bi-printer me-1"></i>Print Request
            </button>
          </div>
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
      selectedRequestTransfer: null,
      selectedTransferDetails: null,
      requestPrintDetails: this.emptyRequestPrintDetails(),
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
    emptyRequestPrintDetails() {
      return {
        rptNumber: '',
        requestedBy: { name: '', designation: '' },
        approvedBy: { name: '', designation: '' },
        concurredBy: { name: '', designation: '' },
        actionTaken: ''
      }
    },

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

    openTransferDetails(transfer) {
      this.selectedTransferDetails = transfer
      Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).show()
    },

    printRPTFromDetails() {
      const transfer = this.selectedTransferDetails
      Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).hide()
      this.openTransferRequestPrint(transfer)
    },

    printReceiptFromDetails() {
      const transfer = this.selectedTransferDetails
      Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).hide()
      this.openExistingTransferReceipt(transfer)
    },

    openExistingTransferReceipt(transfer) {
      if (!transfer || !transfer.items) {
        this.toast('The property details for this transfer are not available.')
        return
      }

      this.transferPrintData = {
        receipts: [{
          items: transfer.items,
          quantity: transfer.property_receipts?.quantity || 1,
          date_issued: transfer.property_receipts?.date_issued || transfer.transfer_date
        }],
        fromEmployee: transfer.from_user || null,
        toEmployee: transfer.to_user || null,
        officeName: transfer.offices?.office_name || transfer.items.responsibility_center || '',
        transferDate: transfer.transfer_date,
        remarks: transfer.reason || '',
        notes: transfer.remarks || ''
      }

      this.printDetails = this.emptyPrintDetails()
      this.printDetails.rptNumber = transfer.rpt_number || transfer.rpt_no || ''
      Modal.getOrCreateInstance(document.getElementById('transferPrintModal')).show()
    },

    openTransferRequestPrint(transfer) {
      this.selectedRequestTransfer = transfer
      this.requestPrintDetails = this.emptyRequestPrintDetails()
      this.requestPrintDetails.requestedBy.name = transfer.from_user?.full_name || ''
      this.requestPrintDetails.requestedBy.designation = transfer.from_user?.job_title || ''
      Modal.getOrCreateInstance(document.getElementById('propertyTransferRequestModal')).show()
    },

    printPropertyTransferRequest() {
      const transfer = this.selectedRequestTransfer
      if (!transfer) {
        this.toast('Transfer details are not available.')
        return
      }

      const details = this.requestPrintDetails
      const esc = this.escapePrint
      const item = transfer.items || {}
      const receipt = transfer.property_receipts || {}
      const fromName = transfer.from_user?.full_name || item.accountable_employee || '-'
      const toName = transfer.to_user?.full_name || '-'
      const fromCenter = item.responsibility_center || '-'
      const toCenter = transfer.offices?.office_name || transfer.to_user?.office_name || '-'
      const quantity = Number(receipt.quantity || 1)
      const amount = Number(item.cost || 0) * quantity
      const condition = transfer.condition_after_transfer || item.condition || '-'
      const formatDate = value => {
        if (!value) return ''
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' })
      }
      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.toast('Please allow pop-ups to print the request.')
        return
      }

      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      const blankRows = Array.from({ length: 9 }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('')
      printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Request for Property Transfer</title>
<style>
@page{size:8.5in 13in portrait;margin:9mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;color:#111;font-family:Arial,Helvetica,sans-serif}
body{font-size:10px}
.sheet{width:100%;min-height:12.25in;border:1px solid #888;padding:8px 10px 12px;position:relative}
.header{height:66px;border:1px solid #999;display:grid;grid-template-columns:68px 1fr;align-items:center;text-align:center}
.logo-cell{height:100%;border-right:1px solid #999;display:flex;align-items:center;justify-content:center}
.logo{width:48px;height:48px;object-fit:contain}
.header-text{font-size:11px;line-height:1.2;font-weight:bold}
.header-text .school{font-size:13px}
.title{font-size:14px;font-weight:bold;text-align:center;margin:8px 0 0}
.rpt{font-weight:bold;text-align:right;padding:4px 18% 4px 0;border-bottom:1px solid #777;font-size:11px}
.date{margin:13px 0 5px 8px}
.info,.items,.reason,.approvals{width:100%;border-collapse:collapse;table-layout:fixed}
.info td{border:1px solid #888;padding:4px 6px;height:25px;font-size:10px}
.info .label{width:29%}
.items th,.items td{border:1px solid #888;padding:4px 3px}
.items th{text-align:center;font-weight:bold;height:34px;font-size:10px}
.items td{height:26px}
.items tbody tr:first-child td{height:31px}
.center{text-align:center}.right{text-align:right}
.reason td{border:1px solid #888;padding:5px 7px;height:42px}
.approvals th,.approvals td{border:1px solid #888;padding:4px 5px}
.approvals th{text-align:center;height:36px;font-size:10px}
.approvals td{height:24px}
.approvals .row-label{font-weight:bold;width:12%}
.approvals .action{vertical-align:top}
.instructions{border:1px solid #888;padding:8px 12px 10px;font-size:10px;line-height:1.35}
.instructions h2{text-align:center;text-decoration:underline;font-size:12px;margin:2px 0 9px}
.instructions p{margin:0 0 8px}
.instructions .copies{text-align:center;margin-top:10px}
.form-code{position:absolute;left:10px;bottom:5px;font-size:10px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{min-height:12.25in}}
</style></head><body>
<div class="sheet">
<div class="header"><div class="logo-cell"><img class="logo" src="${logoUrl}" alt="NVSU"></div><div class="header-text">Republic of the Philippines<br><span class="school">NUEVA VIZCAYA STATE UNIVERSITY</span><br>Bambang, Nueva Vizcaya</div></div>
<div class="title">REQUEST FOR PROPERTY TRANSFER</div>
<div class="rpt">RPT No.: ${esc(details.rptNumber)}</div>
<div class="date">Date: ${esc(formatDate(transfer.transfer_date))}</div>
<table class="info">
<tr><td class="label">From Accountable Employee /<br>Responsibility Center:</td><td>${esc(fromName)} / ${esc(fromCenter)}</td></tr>
<tr><td class="label">To Accountable Employee /<br>Responsibility Center:</td><td>${esc(toName)} / ${esc(toCenter)}</td></tr>
</table>
<table class="items">
<thead><tr><th style="width:12%">DATE<br>ACQUIRED</th><th style="width:17%">PROPERTY NO.</th><th style="width:37%">DESCRIPTION</th><th style="width:15%">AMOUNT</th><th style="width:19%">CONDITION OF<br>PPE</th></tr></thead>
<tbody><tr><td class="center">${esc(formatDate(item.acquisition_date))}</td><td class="center">${esc(item.property_number || '')}</td><td>${esc(item.description || '')}</td><td class="right">${amount.toLocaleString('en-PH',{minimumFractionDigits:2})}</td><td class="center">${esc(condition)}</td></tr>${blankRows}</tbody>
</table>
<table class="reason"><tr><td style="width:13%;font-weight:bold">Reason for<br>Transfer:</td><td>${esc(transfer.reason || transfer.remarks || '')}</td></tr></table>
<table class="approvals">
<tr><th style="width:12%"></th><th style="width:19%">Requested by:</th><th style="width:19%">Approved by:</th><th style="width:19%">Concurred by:</th><th>Action Taken (to be<br>filled by the Property Officer)</th></tr>
<tr><td class="row-label">Signature:</td><td></td><td></td><td></td><td class="action" rowspan="4">${esc(details.actionTaken)}</td></tr>
<tr><td class="row-label">Printed Name:</td><td>${esc(details.requestedBy.name)}</td><td>${esc(details.approvedBy.name)}</td><td>${esc(details.concurredBy.name)}</td></tr>
<tr><td class="row-label">Designation:</td><td>${esc(details.requestedBy.designation)}</td><td>${esc(details.approvedBy.designation)}</td><td>${esc(details.concurredBy.designation)}</td></tr>
<tr><td class="row-label">Date:</td><td>${esc(formatDate(transfer.transfer_date))}</td><td></td><td></td></tr>
</table>
<div class="instructions">
<h2>INSTRUCTIONS</h2>
<p><strong>A.</strong> The RPT shall be used by the accountable employee to request transfer of property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Immediate Supervisor for the approval, by the personnel who will receive the property and the Property Officer to act on the request;</p>
<p><strong>B.</strong> The property to be transferred shall be inspected/checked first by the assigned receiving employee/user before affixing his/her signature on the "concurred" portion of this form;</p>
<p><strong>C.</strong> This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;</p>
<p><strong>D.</strong> The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 69); and</p>
<p><strong>E.</strong> This form shall be prepared in two(2) copies distributed as follows:</p>
<div class="copies">Original – Supply and/or Property Division/Unit's file<br>Copy 2 – Accounting Division/Unit (to be attached to Property Transfer Report)</div>
</div>
<div class="form-code">NVSU-FR-SMO-02-00 (121421)</div>
</div>
<script>window.onload=function(){const logo=document.querySelector('.logo');if(logo&&!logo.complete){logo.onload=function(){window.print()};logo.onerror=function(){window.print()}}else{window.print()}}<\/script>
</body></html>`)
      printWindow.document.close()
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
      const firstItem = data.receipts[0]?.items || {}
      const isICS = Number(firstItem.cost || 0) < 50000
      const receiptTitle = isICS ? 'INVENTORY CUSTODIAN SLIP - TRANSFER' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT - TRANSFER'
      const appendix = isICS ? '69' : '71'
      const total = data.receipts.reduce((sum, receipt) => sum + Number(receipt.items?.cost || 0) * Number(receipt.quantity || 1), 0)
      const amount = value => Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const date = value => {
        if (!value) return '-'
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric', year: 'numeric' })
      }
      const classifications = this.acknowledgementClassifications.map(label =>
        `<span>${details.classifications.includes(label) ? '____' : '____'}${esc(label)}</span>`
      ).join('')
      const rows = data.receipts.map(receipt => {
        const item = receipt.items || {}
        const qty = Number(receipt.quantity || 1)
        const unitValue = Number(item.cost || 0)
        return `<tr><td class="center">${qty}</td><td class="center">${esc(item.unit || 'unit')}</td><td class="description">${esc(item.description)}</td><td class="center">${esc(item.property_number)}</td><td class="center">${esc(date(item.acquisition_date || receipt.date_issued))}</td><td class="number">${amount(unitValue)}</td><td class="number">${amount(unitValue * qty)}</td></tr>`
      }).join('')
      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.toast('Please allow pop-ups to print the transfer receipt.')
        return
      }
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      const responsibilityCenter = data.officeName || firstItem.responsibility_center || '-'
      printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${esc(receiptTitle)}</title>
<style>
@page{size:8.5in 13in portrait;margin:10mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;color:#111;font-family:Arial,Helvetica,sans-serif}
body{font-size:10px}
.page{width:100%;height:12.2in;display:flex;flex-direction:column}
.header{display:grid;grid-template-columns:62px 1fr 85px;align-items:center;text-align:center;margin-bottom:7px;min-height:52px}
.logo{width:48px;height:48px;object-fit:contain}
.school{font-size:15px;font-weight:bold;line-height:1.2}
.campus{font-size:10px;line-height:1.25;font-weight:bold}
.appendix{text-align:right;font-weight:bold;align-self:start;font-size:10px;padding-top:2px}
h1{text-align:center;font-size:13px;margin:3px 0 8px}
.meta{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #111;padding:3px 5px 5px;font-size:10px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
.items th,.items td{padding:4px 3px;vertical-align:top;overflow-wrap:anywhere}
.items th{text-align:center;border-bottom:1px solid #111;border-top:1px solid #111;font-size:9px;line-height:1.15}
.items td{font-size:9px;line-height:1.12}
.items tbody tr{border-bottom:1px solid #aaa}
.items .description{white-space:pre-line}
.center{text-align:center}.number{text-align:right;white-space:nowrap}
.total td{border-top:1px solid #111;border-bottom:1px solid #111;font-weight:bold;padding-top:5px;padding-bottom:5px}
.nothing{text-align:center;border-bottom:1px solid #111;padding:5px 0}
.remarks{border-bottom:1px solid #111;padding:5px 2px;min-height:25px}
.spacer{flex:1;min-height:2.2in}
.page-number{text-align:right;border-top:1px solid #111;padding-top:5px;margin-bottom:12px;font-size:10px}
.classification{padding-top:5px}
.classification-title{font-size:12px;font-weight:bold;text-decoration:underline;margin-bottom:10px}
.classification-list{display:grid;grid-template-columns:1fr 1fr 1fr 1.5fr;gap:4px 8px;font-size:10px;line-height:1.15}
.classification-list span{white-space:nowrap}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:75px;margin-top:30px;min-height:115px;padding:0 12px}
.sign-block{text-align:center;min-height:110px}
.sign-heading{text-align:left;font-weight:bold;margin-bottom:42px}
.sign-name{font-weight:bold;text-transform:uppercase;font-size:12px}
.sign-designation{font-size:10px;margin-top:2px}
.sign-date{font-size:10px;margin-top:4px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
<div class="header"><img class="logo" src="${logoUrl}" alt="NVSU Logo"><div><div class="school">NUEVA VIZCAYA STATE UNIVERSITY</div><div class="campus">Bambang Campus<br>Bambang, Nueva Vizcaya</div></div><div class="appendix">Appendix ${appendix}</div></div>
<h1>${esc(receiptTitle)}</h1>
<div class="meta"><div><strong>Responsibility Center:</strong> ${esc(responsibilityCenter)}</div><div><strong>RPT NO:</strong> ${esc(details.rptNumber)}</div></div>
<table class="items"><colgroup><col style="width:5%"><col style="width:6%"><col style="width:39%"><col style="width:15%"><col style="width:10%"><col style="width:12%"><col style="width:13%"></colgroup>
<thead><tr><th>Qty</th><th>Unit</th><th>Article and Description</th><th>Property<br>Number</th><th>Date<br>Acquired</th><th>Unit<br>Value</th><th>Total<br>Value</th></tr></thead>
<tbody>${rows}<tr class="total"><td colspan="5"></td><td class="number">Total</td><td class="number">${amount(total)}</td></tr></tbody></table>
<div class="nothing">NOTHING FOLLOWS</div>
<div class="remarks"><strong>Remarks:</strong> ${esc(data.notes || data.remarks || '')}</div>
<div class="spacer"></div>
<div class="page-number">Page 1 of 1</div>
<div class="classification"><div class="classification-title">ACKNOWLEDGEMENT CLASSIFICATION</div><div class="classification-list">${classifications}</div></div>
<div class="signatures">
<div class="sign-block"><div class="sign-heading">Received by:</div><div class="sign-name">${esc(details.receivedBy.name)}</div><div class="sign-designation">${esc(details.receivedBy.designation)}</div><div class="sign-date">${esc(date(details.receivedBy.date))}</div></div>
<div class="sign-block"><div class="sign-heading">Issued by:</div><div class="sign-name">${esc(details.issuedBy.name)}</div><div class="sign-designation">${esc(details.issuedBy.designation)}</div><div class="sign-date">${esc(date(details.issuedBy.date))}</div></div>
</div></div>
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
