<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Transfers</h2>
        <p class="text-muted">Transfer issued property to another employee or back to the Property Office</p>
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
              <option value="To Property Office">To Property Office</option>
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
                <td>{{ transfer.from_user?.full_name || '-' }}</td>
                <td>
                  <template v-if="transfer.transfer_type === 'To Employee'">
                    {{ transfer.to_user?.full_name || '-' }}
                  </template>
                  <template v-else>Property Office</template>
                  <div v-if="transfer.offices?.office_name" class="small text-muted">
                    {{ transfer.offices.office_name }}
                  </div>
                </td>
                <td>{{ transfer.transfer_date || '-' }}</td>
                <td>
                  <span class="badge" :class="transfer.condition_after_transfer === 'Serviceable' ? 'bg-success' : 'bg-danger'">
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
                <td colspan="8" class="text-center text-muted py-4">No transfers found.</td>
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
            <select class="form-select form-select-sm" v-model.number="itemsPerPage" style="width: 75px">
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
                <button class="page-link" @click="currentPage--">Previous</button>
              </li>
              <li class="page-item active">
                <span class="page-link">{{ currentPage }} / {{ totalPages }}</span>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button class="page-link" @click="currentPage++">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <div class="modal fade" id="transferModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Transfer</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <form @submit.prevent="saveTransfer">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Issued Property</label>
                <select class="form-select" v-model="form.property_receipt_id" required>
                  <option value="">Select issued property</option>
                  <option v-for="receipt in receipts" :key="receipt.id" :value="receipt.id">
                    {{ receipt.receipt_number }} - {{ receipt.items?.description || 'Item' }}
                    ({{ receipt.users?.full_name || 'Unknown holder' }})
                  </option>
                </select>
                <div v-if="receipts.length === 0" class="form-text text-warning">
                  No issued property is available to transfer.
                </div>
              </div>

              <div v-if="selectedReceipt" class="alert alert-light border">
                <strong>{{ selectedReceipt.items?.description || 'Item' }}</strong>
                <div>Property No.: {{ selectedReceipt.items?.property_number || '-' }}</div>
                <div>Currently held by: {{ selectedReceipt.users?.full_name || '-' }}</div>
                <div>Quantity issued: {{ selectedReceipt.quantity }}</div>
                <div>Current condition: {{ selectedReceipt.items?.condition || '-' }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label d-block">Transfer To</label>
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="radio" id="typeEmployee" value="To Employee" v-model="form.transfer_type">
                  <label class="form-check-label" for="typeEmployee">Another Employee</label>
                </div>
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="radio" id="typeOffice" value="To Property Office" v-model="form.transfer_type">
                  <label class="form-check-label" for="typeOffice">Property Office (return to stock)</label>
                </div>
              </div>

              <div v-if="form.transfer_type === 'To Employee'" class="mb-3">
                <label class="form-label">Receiving Employee</label>
                <select class="form-select" v-model="form.to_user_id" required>
                  <option value="">Select employee</option>
                  <option v-for="person in receivingEmployees" :key="person.id" :value="person.id">
                    {{ person.full_name }}
                  </option>
                </select>
                <div v-if="selectedReceipt && selectedReceipt.items?.condition !== 'Serviceable'" class="form-text text-danger">
                  This property is Unserviceable. It can only be transferred to the Property Office.
                </div>
              </div>

              <div v-else class="mb-3">
                <label class="form-label">Condition of Property</label>
                <select class="form-select" v-model="form.condition_after_transfer" required>
                  <option value="Serviceable">Serviceable</option>
                  <option value="Unserviceable">Unserviceable</option>
                </select>
                <div class="form-text">
                  <template v-if="form.condition_after_transfer === 'Serviceable'">
                    The property will be marked <strong>Available</strong> again.
                  </template>
                  <template v-else>
                    The property will show as <strong>Returned and Unserviceable</strong> in the Properties tab.
                  </template>
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Office <span class="text-muted">(optional)</span></label>
                  <select class="form-select" v-model="form.office_id">
                    <option value="">None</option>
                    <option v-for="office in offices" :key="office.id" :value="office.id">
                      {{ office.office_name }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Transfer Date</label>
                  <input type="date" class="form-control" v-model="form.transfer_date" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Reason</label>
                <input type="text" class="form-control" v-model="form.reason" placeholder="e.g. Reassignment, end of use">
              </div>

              <div class="mb-3">
                <label class="form-label">Remarks</label>
                <textarea class="form-control" rows="2" v-model="form.remarks"></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-warning" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Transfer' }}
              </button>
            </div>
          </form>
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

      form: this.emptyForm()
    }
  },

  computed: {
    selectedReceipt() {
      return this.receipts.find(r => r.id === this.form.property_receipt_id) || null
    },

    receivingEmployees() {
      const holderId = this.selectedReceipt?.issued_to
      return this.personnel.filter(person => person.id !== holderId)
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
      return Math.max(1, Math.ceil(this.filteredTransfers.length / this.itemsPerPage))
    },

    paginatedTransfers() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      return this.filteredTransfers.slice(start, start + this.itemsPerPage)
    },

    firstNumber() {
      return this.filteredTransfers.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1
    },

    lastNumber() {
      return Math.min(this.currentPage * this.itemsPerPage, this.filteredTransfers.length)
    }
  },

  watch: {
    search() { this.currentPage = 1 },
    typeFilter() { this.currentPage = 1 },
    resultFilter() { this.currentPage = 1 },
    itemsPerPage() { this.currentPage = 1 },
    totalPages(value) {
      if (this.currentPage > value) this.currentPage = value
    },
    'form.property_receipt_id'() {
      this.form.to_user_id = ''
    }
  },

  mounted() {
    this.getTransfers()
    this.getReceipts()
    this.getPersonnel()
    this.getOffices()
  },

  methods: {
    emptyForm() {
      return {
        property_receipt_id: '',
        transfer_type: 'To Property Office',
        to_user_id: '',
        office_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        condition_after_transfer: 'Serviceable',
        reason: '',
        remarks: ''
      }
    },

    toast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
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
        this.transfers = await this.load('/api/transfers', 'Failed to load transfers')
      } catch (error) {
        this.toast(error.message)
      }
    },

    async getReceipts() {
      try {
        this.receipts = await this.load('/api/transfers/eligible-receipts', 'Failed to load issued property')
      } catch (error) {
        this.toast(error.message)
      }
    },

    async getPersonnel() {
      try {
        this.personnel = await this.load('/api/personnel', 'Failed to load personnel')
      } catch (error) {
        console.log(error)
      }
    },

    async getOffices() {
      try {
        this.offices = await this.load('/api/offices', 'Failed to load offices')
      } catch (error) {
        console.log(error)
      }
    },

    openAddModal() {
      this.form = this.emptyForm()
      Modal.getOrCreateInstance(document.getElementById('transferModal')).show()
    },

    async saveTransfer() {
      this.saving = true

      try {
        const response = await fetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_receipt_id: this.form.property_receipt_id,
            transfer_type: this.form.transfer_type,
            to_user_id: this.form.transfer_type === 'To Employee' ? this.form.to_user_id : null,
            office_id: this.form.office_id || null,
            transfer_date: this.form.transfer_date,
            condition_after_transfer:
              this.form.transfer_type === 'To Property Office' ? this.form.condition_after_transfer : null,
            reason: this.form.reason,
            remarks: this.form.remarks
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save transfer')
        }

        Modal.getOrCreateInstance(document.getElementById('transferModal')).hide()

        await Promise.all([this.getTransfers(), this.getReceipts()])

        this.toast('Transfer recorded successfully')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },

    getResultLabel(transfer) {
      if (transfer.resulting_status === 'Returned' && transfer.condition_after_transfer === 'Unserviceable') {
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