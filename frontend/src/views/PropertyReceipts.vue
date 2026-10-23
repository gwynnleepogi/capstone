<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Receipts</h2>
        <p class="text-muted">Manage property receipts</p>
      </div>

      <button
        class="btn btn-warning"
        @click="openAddModal"
      >
        <i class="bi bi-plus-lg"></i>
        Add Receipt
      </button>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="receipt-table-header">
              <tr>
                <th>Receipt Number</th>
                <th>Type</th>
                <th>Item</th>
                <th>Issued To</th>
                <th>Date Issued</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="receipt in receipts"
                :key="receipt.id"
              >
                <td>
                  {{ receipt.receipt_number || '-' }}
                </td>

                <td>
                  <span class="badge bg-secondary">
                    {{ receipt.receipt_type || '-' }}
                  </span>
                </td>

                <td>
                  {{ getReceiptItem(receipt).description || '-' }}
                </td>

                <td>
                  {{ getIssuedToName(receipt) }}
                </td>

                <td>
                  {{ receipt.date_issued || '-' }}
                </td>

                <td>
                  <span
                    class="badge"
                    :class="
                      receipt.status === 'Delivered'
                        ? 'bg-success'
                        : 'bg-warning text-dark'
                    "
                  >
                    {{ receipt.status || 'Delivered' }}
                  </span>
                </td>

                <td>
                  {{ receipt.remarks || '-' }}
                </td>

                <td>
                  <button
                    class="btn btn-sm btn-outline-success"
                    @click="viewReceiptDetails(receipt)"
                    title="View receipt details"
                  >
                    <i class="bi bi-eye me-1"></i>
                    Details
                  </button>
                </td>
              </tr>

              <tr v-if="receipts.length === 0">
                <td
                  colspan="8"
                  class="text-center text-muted py-4"
                >
                  No receipts found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ADD / EDIT MODAL -->
    <div
      class="modal fade"
      id="receiptModal"
      tabindex="-1"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              {{ editing ? 'Edit Receipt' : 'Add Receipt' }}
            </h5>

            <button
              type="button"
              class="btn-close btn-close-white"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveReceipt">
            <div class="modal-body">
              <!-- RECEIPT TYPE -->
              <div class="mb-3">
                <label class="form-label">
                  Receipt Type
                </label>

                <select
                  class="form-select"
                  v-model="form.receipt_type"
                  required
                >
                  <option value="PAR">PAR</option>
                  <option value="ICS">ICS</option>
                </select>
              </div>

              <!-- RECEIPT NUMBER -->
              <div class="mb-3">
                <label class="form-label">
                  Receipt Number
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.receipt_number"
                  required
                >
              </div>

              <!-- ITEM REQUEST -->
              <div
                class="mb-3"
                v-if="!editing"
              >
                <label class="form-label">
                  Approved Item Request
                </label>

                <select
                  class="form-select"
                  v-model="form.item_request_id"
                  required
                >
                  <option value="">
                    {{
                      itemRequests.length
                        ? 'Select Approved Item Request'
                        : 'No approved requests available'
                    }}
                  </option>

                  <option
                    v-for="request in itemRequests"
                    :key="request.id"
                    :value="request.id"
                  >
                    {{ request.request_number }} -
                    {{ request.item_description }}
                  </option>
                </select>
                <small class="text-muted">
                  Only approved requests with an assigned inventory item can be issued. Delivered requests already have a receipt.
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 ms-1"
                    @click="getItemRequests"
                  >
                    Refresh list
                  </button>
                </small>
              </div>

              <!-- SELECTED ITEM DETAILS -->
              <div
                v-if="selectedRequest && !editing"
                class="alert alert-light border"
              >
                <h6 class="fw-bold text-success">
                  Selected Item Details
                </h6>

                <p class="mb-1">
                  <strong>Item:</strong>
                  {{
                    getRequestItem(selectedRequest).description ||
                    selectedRequest.item_description ||
                    '-'
                  }}
                </p>

                <p class="mb-1">
                  <strong>Property Number:</strong>
                  {{
                    getRequestItem(selectedRequest).property_number ||
                    '-'
                  }}
                </p>

                <p class="mb-1">
                  <strong>Model Number:</strong>
                  {{
                    getRequestItem(selectedRequest).model_number ||
                    '-'
                  }}
                </p>

                <p class="mb-1">
                  <strong>Serial Number:</strong>
                  {{
                    getRequestItem(selectedRequest).serial_number ||
                    '-'
                  }}
                </p>

                <p class="mb-1">
                  <strong>Requested By:</strong>
                  {{
                    selectedRequest.users?.full_name ||
                    selectedRequest.requested_by_name ||
                    '-'
                  }}
                </p>

                <p class="mb-0">
                  <strong>Cost:</strong>
                  ₱{{
                    formatAmount(
                      getRequestItem(selectedRequest).cost
                    )
                  }}
                </p>
              </div>

              <!-- EDIT ITEM DETAILS -->
              <div
                v-if="editing"
                class="alert alert-light border"
              >
                <h6 class="fw-bold text-success">
                  Receipt Item
                </h6>

                <p class="mb-1">
                  <strong>Item:</strong>
                  {{ editingItem.description || '-' }}
                </p>

                <p class="mb-1">
                  <strong>Property Number:</strong>
                  {{ editingItem.property_number || '-' }}
                </p>

                <p class="mb-0">
                  <strong>Issued To:</strong>
                  {{ editingIssuedTo || '-' }}
                </p>
              </div>

              <!-- DATE ISSUED -->
              <div class="mb-3">
                <label class="form-label">
                  Date Issued
                </label>

                <input
                  type="date"
                  class="form-control"
                  v-model="form.date_issued"
                >
              </div>

              <!-- REMARKS -->
              <div class="mb-3">
                <label class="form-label">
                  Remarks
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.remarks"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-success"
                :disabled="saving"
              >
                {{ saving ? 'Saving...' : 'Save Receipt' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      id="receiptPrintDetailsModal"
      tabindex="-1"
      aria-labelledby="receiptPrintDetailsModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <form class="receipt-print-details-form" @submit.prevent="confirmPrintReceipt">
            <div class="modal-header">
              <h5 class="modal-title" id="receiptPrintDetailsModalLabel">Complete PAR / ICS Print Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted small">Complete the details below before printing. The item information will be filled in automatically.</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Fund Cluster</label>
                  <select class="form-select" v-model="receiptPrintForm.fundCluster">
                    <option value="">Select Fund Cluster</option>
                    <option v-if="receiptPrintForm.fundCluster && !fundClusterOptions.includes(receiptPrintForm.fundCluster)" :value="receiptPrintForm.fundCluster">{{ receiptPrintForm.fundCluster }}</option>
                    <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Purpose</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.purpose">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Unit / Office</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.unitOffice">
                </div>
                <div class="col-md-6">
                  <label class="form-label">PO No.</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.poNumber">
                </div>
                <div class="col-md-6">
                  <label class="form-label">UACS</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.uacs">
                </div>
                <div class="col-md-6">
                  <label class="form-label">BUR No.</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.burNumber">
                </div>
                <div class="col-md-6">
                  <label class="form-label">IAR No.</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.iarNumber">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Appendix</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.appendix" required>
                </div>
                <div class="col-12">
                  <strong>Received By</strong>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Received By Name <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="receiptPrintForm.receivedBy" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Designation</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.receivedByDesignation">
                </div>
                <div class="col-12">
                  <strong>Received From</strong>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Received From Name</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.receivedFrom">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Designation</label>
                  <input class="form-control" v-model.trim="receiptPrintForm.receivedFromDesignation">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Paper Size</label>
                  <select class="form-select" v-model="receiptPrintForm.paperSize">
                    <option value="short">Short (8.5 × 11 in)</option>
                    <option value="long">Long (8.5 × 13 in)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <template v-if="receiptPrintForm.paperSize === 'custom'">
                  <div class="col-md-3">
                    <label class="form-label">Paper Width (in)</label>
                    <input class="form-control" type="number" min="1" step="0.1" v-model.number="receiptPrintForm.paperWidth" required>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Paper Height (in)</label>
                    <input class="form-control" type="number" min="1" step="0.1" v-model.number="receiptPrintForm.paperHeight" required>
                  </div>
                </template>
              </div>
              <p class="text-muted small mt-3 mb-0">Choose the same paper size in your printer settings.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success">Continue to Print</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      id="risDetailsModal"
      tabindex="-1"
      aria-labelledby="risDetailsModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <form class="receipt-print-details-form" @submit.prevent="confirmPrintRIS">
            <div class="modal-header">
              <h5 class="modal-title" id="risDetailsModalLabel">Complete RIS Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <p class="text-muted small">Existing request and item details will be filled in automatically. Complete the required fields before printing.</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Fund Cluster <span class="text-danger">*</span></label>
                  <select class="form-select" v-model="risForm.fundCluster" required>
                    <option value="" disabled>Select Fund Cluster</option>
                    <option v-if="risForm.fundCluster && !fundClusterOptions.includes(risForm.fundCluster)" :value="risForm.fundCluster">{{ risForm.fundCluster }}</option>
                    <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Division</label>
                  <input class="form-control" v-model.trim="risForm.division">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Office</label>
                  <input class="form-control" v-model.trim="risForm.officeName">
                </div>
                <div class="col-12">
                  <label class="form-label">Purpose</label>
                  <textarea class="form-control" v-model.trim="risForm.purpose" rows="2"></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Requested By <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.requestedBy" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Requested By Designation <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.requestedDesignation" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Approved By <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.approvedBy" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Approved By Designation <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.approvedDesignation" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Issued By <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.issuedBy" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Issued By Designation <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.issuedDesignation" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Received By <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.receivedBy" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Received By Designation <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.receivedDesignation" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Paper Size</label>
                  <select class="form-select" v-model="risForm.paperSize">
                    <option value="short">Short (8.5 × 11 in)</option>
                    <option value="long">Long (8.5 × 13 in)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <template v-if="risForm.paperSize === 'custom'">
                  <div class="col-md-3">
                    <label class="form-label">Paper Width (in)</label>
                    <input class="form-control" type="number" min="1" step="0.1" v-model.number="risForm.paperWidth" required>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Paper Height (in)</label>
                    <input class="form-control" type="number" min="1" step="0.1" v-model.number="risForm.paperHeight" required>
                  </div>
                </template>
              </div>
              <p class="text-muted small mt-3 mb-0">Choose the same paper size in your printer settings.</p>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success">Continue to Print</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="receiptDetailsModal" tabindex="-1" aria-labelledby="receiptDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="receiptDetailsModalLabel" class="modal-title">Receipt Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div v-if="selectedDetailsReceipt" class="modal-body">
            <dl class="row mb-0">
              <dt class="col-sm-4">Receipt Number</dt>
              <dd class="col-sm-8">{{ selectedDetailsReceipt.receipt_number || '-' }}</dd>
              <dt class="col-sm-4">Type</dt>
              <dd class="col-sm-8">{{ selectedDetailsReceipt.receipt_type || '-' }}</dd>
              <dt class="col-sm-4">Property</dt>
              <dd class="col-sm-8">{{ getReceiptItem(selectedDetailsReceipt).description || '-' }}</dd>
              <dt class="col-sm-4">Property Number</dt>
              <dd class="col-sm-8">{{ getReceiptItem(selectedDetailsReceipt).property_number || '-' }}</dd>
              <dt class="col-sm-4">Quantity Issued</dt>
              <dd class="col-sm-8">{{ selectedDetailsReceipt.quantity ?? '-' }}</dd>
              <dt class="col-sm-4">Issued To</dt>
              <dd class="col-sm-8">{{ getIssuedToName(selectedDetailsReceipt) }}</dd>
              <dt class="col-sm-4">Date Issued</dt>
              <dd class="col-sm-8">{{ selectedDetailsReceipt.date_issued || '-' }}</dd>
              <dt class="col-sm-4">Status</dt>
              <dd class="col-sm-8">{{ selectedDetailsReceipt.status || '-' }}</dd>
              <dt class="col-sm-4">Remarks</dt>
              <dd class="col-sm-8">{{ selectedDetailsReceipt.remarks || '-' }}</dd>
            </dl>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-outline-warning" @click="editSelectedReceipt">
              <i class="bi bi-pencil me-1"></i>Edit
            </button>
            <button type="button" class="btn btn-outline-danger" @click="deleteSelectedReceipt">
              <i class="bi bi-trash me-1"></i>Delete
            </button>
            <button type="button" class="btn btn-outline-success" @click="printSelectedReceipt">
              <i class="bi bi-printer me-1"></i>Print PAR / ICS
            </button>
            <button type="button" class="btn btn-outline-dark" @click="printSelectedRIS">
              <i class="bi bi-file-earmark-text me-1"></i>Print RIS
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'PropertyReceipts',

  data() {
    return {
      receipts: [],
      items: [],
      personnel: [],
      itemRequests: [],

      fundClusterOptions: [
        'AF-1', 'AF-2', 'AF-3', 'AF-DBM PS/BID',
        'GF-1', 'GF-2', 'GF-3', 'GF-DBM PS/BID',
        'RF-1', 'RF-2', 'RF-DBM PS/BID',
        'STF-1', 'STF-2', 'STF-3', 'STF-DBM PS/BID',
        'TF-1', 'TF-2', 'TF-3', 'TF-DBM PS/BID',
        'TR-1', 'TR-2', 'TR-DBM PS/BID'
      ],

      editing: false,
      saving: false,
      selectedRISReceipt: null,
      selectedPrintReceipt: null,
      selectedDetailsReceipt: null,
      receiptPrintForm: {
        fundCluster: 'TF-2',
        appendix: '71',
        purpose: '',
        unitOffice: '',
        poNumber: '',
        uacs: '',
        burNumber: '',
        iarNumber: '',
        receivedBy: '',
        receivedByDesignation: '',
        receivedFrom: '',
        receivedFromDesignation: '',
        paperSize: 'short',
        paperWidth: 8.5,
        paperHeight: 11
      },
      risForm: {
        fundCluster: '',
        requestedBy: '',
        requestedDesignation: '',
        approvedBy: '',
        approvedDesignation: '',
        issuedBy: '',
        issuedDesignation: '',
        receivedBy: '',
        receivedDesignation: '',
        paperSize: 'long',
        paperWidth: 8.5,
        paperHeight: 13
      },

      form: {
        id: null,
        item_request_id: '',
        receipt_type: 'PAR',
        receipt_number: '',
        date_issued: '',
        remarks: ''
      }
    }
  },

  computed: {
    selectedRequest() {
      return this.itemRequests.find(
        request =>
          request.id === this.form.item_request_id
      ) || null
    },

    editingItem() {
      const receipt = this.receipts.find(
        receipt =>
          receipt.id === this.form.id
      )

      return this.getReceiptItem(receipt || {})
    },

    editingIssuedTo() {
      const receipt = this.receipts.find(
        receipt =>
          receipt.id === this.form.id
      )

      return this.getIssuedToName(receipt || {})
    }
  },

  mounted() {
    this.getReceipts()
    this.getItems()
    this.getPersonnel()
    this.getItemRequests()
    window.addEventListener('focus', this.getItemRequests)
    window.addEventListener('item-requests-updated', this.getItemRequests)
  },

  beforeUnmount() {
    window.removeEventListener('focus', this.getItemRequests)
    window.removeEventListener('item-requests-updated', this.getItemRequests)
  },

  methods: {
    viewReceiptDetails(receipt) {
      this.selectedDetailsReceipt = receipt
      Modal.getOrCreateInstance(
        document.getElementById('receiptDetailsModal')
      ).show()
    },

    editSelectedReceipt() {
      if (!this.selectedDetailsReceipt) return
      const receipt = this.selectedDetailsReceipt
      Modal.getInstance(document.getElementById('receiptDetailsModal'))?.hide()
      this.editReceipt(receipt)
    },

    deleteSelectedReceipt() {
      if (!this.selectedDetailsReceipt) return
      const id = this.selectedDetailsReceipt.id
      Modal.getInstance(document.getElementById('receiptDetailsModal'))?.hide()
      this.deleteReceipt(id)
    },

    printSelectedReceipt() {
      if (!this.selectedDetailsReceipt) return
      const receipt = this.selectedDetailsReceipt
      Modal.getInstance(document.getElementById('receiptDetailsModal'))?.hide()
      this.openReceiptPrintModal(receipt)
    },

    printSelectedRIS() {
      if (!this.selectedDetailsReceipt) return
      const receipt = this.selectedDetailsReceipt
      Modal.getInstance(document.getElementById('receiptDetailsModal'))?.hide()
      this.openRISModal(receipt)
    },

    async getReceipts() {
      try {
        const response = await fetch(
          '/api/receipts'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load receipts'
          )
        }

        this.receipts = Array.isArray(data)
          ? data
          : data.receipts || []
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      }
    },

    async getItems() {
      try {
        const response = await fetch(
          '/api/items'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load items'
          )
        }

        this.items = Array.isArray(data)
          ? data
          : data.items || []
      } catch (error) {
        console.log(error)
      }
    },

    async getPersonnel() {
      try {
        const response = await fetch(
          '/api/personnel'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load personnel'
          )
        }

        this.personnel = Array.isArray(data)
          ? data
          : data.personnel || []
      } catch (error) {
        console.log(error)
      }
    },

    async getItemRequests() {
      try {
        const response = await fetch(
          '/api/item-requests'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load item requests'
          )
        }

        const requests = Array.isArray(data)
          ? data
          : data.itemRequests ||
            data.requests ||
            []

        this.itemRequests = requests.filter(
          request => String(request.status || '').trim().toLowerCase() === 'approved' &&
            request.item_id
        )
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      }
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        item_request_id: '',
        receipt_type: 'PAR',
        receipt_number: '',
        date_issued:
          new Date().toISOString().split('T')[0],
        remarks: ''
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('receiptModal')
        )

      modal.show()
    },

    editReceipt(receipt) {
      this.editing = true

      this.form = {
        id: receipt.id,
        item_request_id: '',
        receipt_type: receipt.receipt_type || 'PAR',
        receipt_number: receipt.receipt_number || '',
        date_issued: receipt.date_issued || '',
        remarks: receipt.remarks || ''
      }

this.$nextTick(() => {
        const modalElement = document.getElementById('receiptModal')

        if (modalElement) {
          const modalInstance = Modal.getOrCreateInstance(modalElement)
          modalInstance.show()
        }
      })
    },

    async saveReceipt() {
      this.saving = true

      try {
        let url =
          '/api/receipts'

        let method = 'POST'

        const body = {
          receipt_type:
            this.form.receipt_type,

          receipt_number:
            this.form.receipt_number,

          date_issued:
            this.form.date_issued || null,

          remarks:
            this.form.remarks || null
        }

        if (this.editing) {
          url =
            `/api/receipts/${this.form.id}`

          method = 'PUT'
        } else {
          body.item_request_id =
            this.form.item_request_id
        }

        const response = await fetch(url, {
          method: method,

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify(body)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to save receipt'
          )
        }

        const modal =
          Modal.getOrCreateInstance(
            document.getElementById('receiptModal')
          )

        modal.hide()

        await this.getReceipts()
        await this.getItems()
        await this.getItemRequests()

        this.showToast(
          this.editing
            ? 'Receipt updated successfully'
            : 'Receipt created successfully'
        )
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      } finally {
        this.saving = false
      }
    },

    async deleteReceipt(id) {
      const confirmed = confirm(
        'Are you sure you want to delete this receipt?'
      )

      if (!confirmed) {
        return
      }

      try {
        const response = await fetch(
          `/api/receipts/${id}`,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete receipt'
          )
        }

        await this.getReceipts()
        await this.getItems()
        await this.getItemRequests()

        this.showToast(
          'Receipt deleted successfully'
        )
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      }
    },

    getReceiptItem(receipt) {
      if (!receipt) {
        return {}
      }

      if (receipt.items) {
        return Array.isArray(receipt.items)
          ? receipt.items[0] || {}
          : receipt.items
      }

      if (receipt.item) {
        return receipt.item
      }

      if (receipt.item_requests?.items) {
        return Array.isArray(
          receipt.item_requests.items
        )
          ? receipt.item_requests.items[0] || {}
          : receipt.item_requests.items
      }

      if (receipt.item_id) {
        return this.items.find(
          item =>
            item.id === receipt.item_id
        ) || {}
      }

      return {}
    },

    getRequestItem(request) {
      if (!request) {
        return {}
      }

      if (request.items) {
        return Array.isArray(request.items)
          ? request.items[0] || {}
          : request.items
      }

      if (request.item) {
        return request.item
      }

      return this.items.find(
        item =>
          item.id === request.item_id
      ) || {}
    },

    getIssuedToName(receipt) {
      if (!receipt) {
        return '-'
      }

      if (receipt.users?.full_name) {
        return receipt.users.full_name
      }

      if (
        receipt.item_requests?.users?.full_name
      ) {
        return receipt.item_requests.users.full_name
      }

      if (receipt.issued_to) {
        const person = this.personnel.find(
          person =>
            person.id === receipt.issued_to
        )

        return person?.full_name || '-'
      }

      return '-'
    },

    formatAmount(value) {
      const amount = Number(value)

      if (!Number.isFinite(amount)) {
        return '0.00'
      }

      return amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },

    escapeHtml(value) {
      return String(value ?? '-').replace(
        /[&<>"']/g,
        character => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[character]
      )
    },

    showToast(message) {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: message
        })
      )
    },

    openReceiptPrintModal(receipt) {
      this.selectedPrintReceipt = receipt
      const item = this.getReceiptItem(receipt)
      this.receiptPrintForm = {
        fundCluster: receipt.fund_cluster || 'TF-2',
        appendix: receipt.appendix || '71',
        purpose: receipt.remarks || '',
        unitOffice: item.responsibility_center || receipt.offices?.office_name || '',
        poNumber: receipt.po_number || '',
        uacs: receipt.uacs || '',
        burNumber: receipt.bur_number || '',
        iarNumber: receipt.iar_number || '',
        receivedBy: this.getIssuedToName(receipt) === '-' ? '' : this.getIssuedToName(receipt),
        receivedByDesignation: receipt.received_by_designation || '',
        receivedFrom: receipt.received_from_name || '',
        receivedFromDesignation: receipt.received_from_designation || 'Administrative Officer V',
        paperSize: 'short',
        paperWidth: 8.5,
        paperHeight: 11
      }
      const modal = Modal.getOrCreateInstance(document.getElementById('receiptPrintDetailsModal'))
      modal.show()
    },

    confirmPrintReceipt() {
      if (!this.selectedPrintReceipt) return
      const modal = Modal.getOrCreateInstance(document.getElementById('receiptPrintDetailsModal'))
      modal.hide()
      this.printReceipt(this.selectedPrintReceipt, { ...this.receiptPrintForm })
    },

    openRISModal(receipt) {
      const request = receipt.item_requests || {}
      const issuedTo = this.getIssuedToName(receipt)
      this.selectedRISReceipt = receipt
      this.risForm = {
        fundCluster: request.fund_cluster || receipt.fund_cluster || '',
        division: request.division || receipt.division || '',
        officeName: request.offices?.office_name || receipt.offices?.office_name || request.office_name || receipt.office_name || '',
        purpose: request.purpose || receipt.purpose || request.remarks || '',
        requestedBy: request.requested_by_name || request.users?.full_name || '',
        requestedDesignation: request.requested_by_designation || '',
        approvedBy: receipt.approved_by_name || '',
        approvedDesignation: receipt.approved_by_designation || '',
        issuedBy: receipt.issued_by_name || '',
        issuedDesignation: receipt.issued_by_designation || '',
        receivedBy: issuedTo === '-' ? '' : issuedTo,
        receivedDesignation: receipt.received_by_designation || '',
        paperSize: 'long',
        paperWidth: 8.5,
        paperHeight: 13
      }
      const modal = Modal.getOrCreateInstance(document.getElementById('risDetailsModal'))
      modal.show()
    },

    confirmPrintRIS() {
      if (!this.selectedRISReceipt) return
      const modal = Modal.getOrCreateInstance(document.getElementById('risDetailsModal'))
      modal.hide()
      this.printRIS(this.selectedRISReceipt, { ...this.risForm })
    },

    getPrintPageSize(details) {
      if (details.paperSize === 'short') {
        return { width: 8.5, height: 11 }
      }

      if (details.paperSize !== 'custom') {
        return { width: 8.5, height: 13 }
      }

      const width = Number(details.paperWidth)
      const height = Number(details.paperHeight)

      if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
        this.showToast('Enter a valid custom paper width and height of at least 1 inch.')
        return null
      }

      return { width, height }
    },

    printRIS(receipt, details = {}) {
      const pageSize = this.getPrintPageSize(details)
      if (!pageSize) return

      const item = this.getReceiptItem(receipt)
      const request = receipt.item_requests || {}
      const office = request.offices || receipt.offices || {}
      const escape = value => this.escapeHtml(value === null || value === undefined || value === '' ? '-' : value)
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        this.showToast('Please allow pop-ups to print the RIS')
        return
      }

      const receiptNumber = escape(receipt.receipt_number)
      const dateIssued = escape(receipt.date_issued)
      const officeName = escape(details.officeName || office.office_name || request.office_name || receipt.office_name)
      const division = escape(details.division || request.division || receipt.division)
      const responsibilityCenter = escape(request.responsibility_center || receipt.responsibility_center || item.responsibility_center)
      const fundCluster = escape(details.fundCluster || request.fund_cluster || receipt.fund_cluster)
      const description = escape(item.description || request.item_description)
      const stockNumber = escape(item.stock_number || item.property_number || item.stock_no)
      const quantityRequested = escape(request.quantity ?? request.quantity_requested ?? receipt.quantity_requested ?? receipt.quantity)
      const quantityIssued = escape(receipt.quantity ?? receipt.quantity_issued ?? request.quantity_issued ?? request.quantity)
      const requestedQuantity = Number(request.quantity ?? request.quantity_requested ?? receipt.quantity_requested)
      const availableQuantity = Number(item.quantity_available ?? item.quantity ?? item.stock_balance)
      const stockWasAvailableWhenIssued =
        ['Issued', 'Delivered'].includes(receipt.status) ||
        request.status === 'Delivered'
      const stockIsAvailable = stockWasAvailableWhenIssued || (
        item.status === 'Available' &&
        Number.isFinite(availableQuantity) &&
        Number.isFinite(requestedQuantity) &&
        availableQuantity >= requestedQuantity
      )
      const purpose = escape(details.purpose || request.purpose || receipt.purpose || request.remarks)
      const remarks = escape(receipt.remarks || request.remarks)

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>RIS - ${receiptNumber}</title>
          <style>
            @page { size: ${pageSize.width}in ${pageSize.height}in portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 10px; margin: 0; }
            .header-frame { border: 1px solid #000; margin-bottom: 0; }
            .content-frame { border: 1px solid #000; padding: 0; }
            .letterhead { display: grid; grid-template-columns: 72px 1fr; align-items: center; text-align: center; border-bottom: 1px solid #000; min-height: 72px; }
            .logo-box { border-right: 1px solid #000; height: 72px; display: flex; align-items: center; justify-content: center; }
            .logo { width: 58px; height: 58px; object-fit: contain; }
            .letterhead-text { line-height: 1.25; padding: 3px; }
            .letterhead-text p { margin: 1px 0; }
            .school-name { font-size: 14px; font-weight: bold; }
            .document-title { text-align: center; font-size: 14px; font-weight: bold; padding: 5px 0; border-bottom: 1px solid #000; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 4px 4px; vertical-align: middle; overflow-wrap: anywhere; }
            th { text-align: center; font-weight: bold; }
            .meta td { height: 23px; }
            .items { margin-top: 0; }
            .items th { height: 29px; }
            .items td { height: 30px; }
            .center { text-align: center; }
            .purpose { border: 1px solid #000; border-top: 0; border-bottom: 0; padding: 7px 5px; min-height: 35px; }
            .signature-table { margin: 0; border-collapse: collapse; }
            .signature-table td { width: 25%; border: 0.5px solid #777; padding: 4px; vertical-align: top; }
            .signature-table tr:first-child td { border-top: 0.5px solid #777; }
            .signature-heading { font-weight: bold; }
            .signature-space { margin: 15px 2px 0; text-align: center; }
            .signature-line { border-top: 0.5px solid #777; margin: 2px 0; }
            .small { font-size: 9px; }
            .instructions { margin-top: 0; padding: 5px 6px; font-size: 7px; line-height: 1.2; }
            .instructions-title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 4px; }
            .instructions p { margin: 0 0 3px; }
            .instructions .copies { margin-left: 10px; }
            .form-code { margin-top: 3px; font-weight: bold; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header-frame">
            <div class="letterhead">
              <div class="logo-box"><img class="logo" src="${logoUrl}" alt="NVSU Logo"></div>
              <div class="letterhead-text">
                <p>Republic of the Philippines</p>
                <p class="school-name">NUEVA VIZCAYA STATE UNIVERSITY</p>
                <p>3702 Bambang, Nueva Vizcaya</p>
              </div>
            </div>

            <div class="document-title">REQUISITION AND ISSUE SLIP (RIS)</div>
          </div>

          <div class="content-frame">
            <table class="meta">
              <tbody>
                <tr>
                  <td colspan="2"><strong>Fund Cluster:</strong> ${fundCluster}</td>
                  <td colspan="2"><strong>Responsibility Center Code:</strong> ${responsibilityCenter}</td>
                  <td><strong>RIS No.:</strong> ${receiptNumber}</td>
                  <td><strong>Date:</strong> ${dateIssued}</td>
                </tr>
                <tr>
                  <td colspan="2"><strong>Division:</strong> ${division}</td>
                  <td colspan="4"><strong>Office:</strong> ${officeName}</td>
                </tr>
              </tbody>
            </table>

            <table class="items">
              <colgroup>
                <col style="width: 9%">
                <col style="width: 31%">
                <col style="width: 8%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 8%">
                <col style="width: 30%">
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2">Stock #</th>
                  <th rowspan="2">Description</th>
                  <th rowspan="2">QTY</th>
                  <th colspan="2">Stock Available?</th>
                  <th colspan="2">Issue</th>
                </tr>
                <tr>
                  <th>Yes</th>
                  <th>No</th>
                  <th>QTY</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="center">${stockNumber}</td>
                  <td>${description}</td>
                  <td class="center">${quantityRequested}</td>
                  <td class="center">${stockIsAvailable ? '✓' : ''}</td>
                  <td class="center">${stockIsAvailable ? '' : '✓'}</td>
                  <td class="center">${quantityIssued}</td>
                  <td>${remarks}</td>
                </tr>
                <tr>
                  <td colspan="7" class="center"><strong>***Nothing Follows***</strong></td>
                </tr>
              </tbody>
            </table>

            <div class="purpose"><strong>Purpose:</strong> ${purpose}</div>

          <table class="signature-table">
            <tbody>
              <tr>
                <td>
                  <div class="signature-heading">Requested by:</div>
                  <div class="signature-space"><strong>${escape(details.requestedBy)}</strong><div class="signature-line"></div><div class="small">${escape(details.requestedDesignation)}</div></div>
                </td>
                <td>
                  <div class="signature-heading">Approved by:</div>
                  <div class="signature-space"><strong>${escape(details.approvedBy)}</strong><div class="signature-line"></div><div class="small">${escape(details.approvedDesignation)}</div></div>
                </td>
                <td>
                  <div class="signature-heading">Issued by:</div>
                  <div class="signature-space"><strong>${escape(details.issuedBy)}</strong><div class="signature-line"></div><div class="small">${escape(details.issuedDesignation)}</div></div>
                </td>
                <td>
                  <div class="signature-heading">Received by:</div>
                  <div class="signature-space"><strong>${escape(details.receivedBy)}</strong><div class="signature-line"></div><div class="small">${escape(details.receivedDesignation)}</div></div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="instructions">
            <div class="instructions-title">INSTRUCTIONS</div>
            <p><strong>A.</strong> The RIS shall be prepared by the authorized officer or employee to request needed Property/Supply, by the Supervisor of the requesting unit to approve the request, by the Property/Supply Custodian to verify the availability of stocks and issuance of the item/s, and by the end user or authorized personnel of the requesting unit to receive the item/s as an accountable/responsible officer or employee.</p>
            <p><strong>B.</strong> For requested item/s other than the category of consumable property/supply, the approved RIS (GAM Appendix 63) shall be the basis of the SMO Staff in preparing and processing the Inventory Custodian Slip (GAM Appendix 69) for semi-expendable property and/or Property Acknowledgement Receipt (GAM Appendix 71) for non-expendable property prior to issuance if the item/s is available on stock; and</p>
            <p><strong>C.</strong> This form shall be prepared in three (3) copies and in 8.5&quot; x 13&quot; paper. It will be distributed as follows:</p>
            <div class="copies">Original - Accounting Office</div>
            <div class="copies">Copy 2 - Requesting Office</div>
            <div class="copies">Copy 3 - Supply Management Office</div>
            <div class="form-code">NVSU-FR-SMO-08-00 (031022)</div>
          </div>
          </div>

          <script>
            window.onload = function () {
              const logo = document.querySelector('.logo')
              if (logo && !logo.complete) {
                logo.onload = function () { window.print() }
                logo.onerror = function () { window.print() }
              } else {
                window.print()
              }
            }
          <\/script>
        </body>
        </html>
      `)
      printWindow.document.close()
    },

    printReceipt(receipt, details = {}) {
      const pageSize = this.getPrintPageSize(details)
      if (!pageSize) return

      const item = this.getReceiptItem(receipt)
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href

      const receiptType =
        this.escapeHtml(
          receipt.receipt_type || 'PAR'
        )

      const receiptNumber =
        this.escapeHtml(
          receipt.receipt_number || '-'
        )

      const personnelName =
        this.escapeHtml(
          details.receivedBy || this.getIssuedToName(receipt)
        )

      const description =
        this.escapeHtml(
          item.description || '-'
        )

      const quantity =
        this.escapeHtml(
          receipt.quantity ?? 1
        )

      const propertyNumber =
        this.escapeHtml(
          item.property_number || '-'
        )

      const modelNumber =
        this.escapeHtml(
          item.model_number || '-'
        )

      const serialNumber =
        this.escapeHtml(
          item.serial_number || '-'
        )

      const dateAcquired =
        this.escapeHtml(
          item.acquisition_date ||
          item.date_acquired ||
          '-'
        )

      const dateIssued =
        this.escapeHtml(
          receipt.date_issued || '-'
        )

      const classification =
        this.escapeHtml(
          item.classification ||
          receipt.receipt_type ||
          '-'
        )

      const condition =
        this.escapeHtml(
          item.condition || '-'
        )

      const responsibilityCenter =
        this.escapeHtml(
          details.unitOffice || item.responsibility_center || '-'
        )

      const cost =
        Number(item.cost || 0)

      const amount =
        this.formatAmount(cost * Number(receipt.quantity ?? 1))

      const remarks =
        this.escapeHtml(
          details.purpose || receipt.remarks || '-'
        )

      const officeName =
        this.escapeHtml(
          receipt.item_requests?.offices?.office_name ||
          receipt.offices?.office_name ||
          '-'
        )

      const printWindow = window.open(
        '',
        '_blank'
      )

      if (!printWindow) {
        this.showToast(
          'Please allow pop-ups to print the receipt'
        )

        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>
            ${receiptType} - ${receiptNumber}
          </title>

          <style>
            @page { size: ${pageSize.width}in ${pageSize.height}in portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
            .page { width: 100%; min-height: calc(${pageSize.height}in - 16mm); padding: 5px; display: flex; flex-direction: column; }
            .header { display: grid; grid-template-columns: 72px 1fr; align-items: center; text-align: center; min-height: 72px; }
            .logo-box { height: 72px; display: flex; align-items: center; justify-content: center; }
            .logo { width: 58px; height: 58px; object-fit: contain; }
            .header-text { line-height: 1.25; padding: 3px; }
            .header-text p { margin: 1px 0; }
            .header h1 { margin: 1px 0; font-size: 14px; color: #000; font-weight: bold; }
            .header h2 { margin: 1px 0; font-size: 10px; color: #000; font-weight: normal; }
            .header p { margin: 1px 0; font-size: 10px; }
            .appendix { text-align: right; margin-top: 4px; font-size: 9px; font-weight: bold; }
            .receipt-title { text-align: center; color: #000; font-size: 14px; font-weight: bold; padding: 6px 0; margin: 0; }
            .receipt-title span { color: #000; }
            .receipt-info { display: grid; grid-template-columns: 1fr 1fr; margin: 0; font-size: 10px; font-weight: normal; }
            .fund-cluster, .par-number { display: flex; align-items: center; gap: 6px; padding: 6px; min-height: 28px; }
            .fund-cluster span, .par-number span { display: inline-block; flex: 1; padding: 2px 4px; font-weight: normal; min-width: 0; }
            .par-number span { color: #b22222; font-weight: bold; }
            .main-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 0; }
            .main-table th, .main-table td { border: 0; padding: 4px; vertical-align: middle; overflow-wrap: anywhere; }
            .main-table th { background: #fff; color: #000; text-align: center; font-size: 9px; font-weight: bold; border-bottom: 0.5px solid #000; }
            .main-table td { height: 35px; font-size: 9px; }
            .main-table tbody tr:first-child td { border-bottom: 0.5px solid #000; }
            .sn { width: 6%; text-align: center; }
            .qty { width: 5%; text-align: center; }
            .article { width: 24%; }
            .property { width: 13%; text-align: center; }
            .model { width: 12%; text-align: center; }
            .serial { width: 12%; text-align: center; }
            .date { width: 12%; text-align: center; }
            .amount { width: 16%; text-align: right; }
            .total-row td { height: 28px; font-weight: bold; }
            .total-label, .total-amount { color: #b22222; font-weight: bold; }
            .total-label { text-align: right; }
            .total-amount { text-align: right; background: #ffeb3b; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .lower-details { display: grid; grid-template-columns: 1fr 1fr; }
            .lower-left, .lower-right { padding: 7px; min-height: 125px; }
            .lower-details p { margin: 0 0 7px; line-height: 1.25; }
            .lower-details strong { color: #000; }
            .line { display: inline-block; border-bottom: 1px solid #000; width: 125px; height: 12px; }
            .print-footer { width: 100%; margin: auto 0 0; padding-bottom: 0; }
            .page-number { margin: 0 2px 5px; text-align: right; font-size: 8px; }
            .signature { display: grid; grid-template-columns: 38% 38%; justify-content: space-between; gap: 12px; min-height: 78px; border-top: 1px solid #000; padding: 5px 0 0; }
            .signature-box { display: flex; flex-direction: column; font-size: 9px; }
            .signature-heading { font-weight: bold; }
            .signature-name { margin-top: 18px; text-align: center; font-weight: bold; }
            .signature-label, .signature-date { text-align: center; }
            .signature-label { margin-top: 2px; }
            .signature-date { margin-top: 2px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="header">
              <div class="logo-box"><img class="logo" src="${logoUrl}" alt="NVSU Logo"></div>
              <div class="header-text">
                <p>Republic of the Philippines</p>
                <h1>NUEVA VIZCAYA STATE UNIVERSITY</h1>
                <h2>3702 Bambang, Nueva Vizcaya</h2>
              </div>
            </div>

            <div class="appendix">
              APPENDIX ${this.escapeHtml(details.appendix || '71')}
            </div>

            <div class="receipt-title">
              <span>
                ${
                  receipt.receipt_type === 'ICS'
                    ? 'INVENTORY CUSTODIAN SLIP'
                    : 'PROPERTY ACKNOWLEDGEMENT RECEIPT'
                }
              </span>
            </div>

            <!-- FUND CLUSTER AND PAR NUMBER -->
            <div class="receipt-info">
              <div class="fund-cluster">
                <strong>FUND CLUSTER:</strong>
                <span>${this.escapeHtml(details.fundCluster || 'TF-2')}</span>
              </div>

              <div class="par-number">
                <strong>${receiptType} No.</strong>
                <span>${receiptNumber}</span>
              </div>
            </div>

            <!-- MAIN PROPERTY TABLE -->
            <table class="main-table">
              <thead>
                <tr>
                  <th class="sn">
                    SN
                  </th>

                  <th class="qty">
                    Qty.
                  </th>

                  <th class="article">
                    Article and Description
                  </th>

                  <th class="property">
                    Property Number
                  </th>

                  <th class="model">
                    Model Number
                  </th>

                  <th class="serial">
                    Serial Number
                  </th>

                  <th class="date">
                    Date Acquired
                  </th>

                  <th class="amount">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td class="sn">
                    1
                  </td>

                  <td class="qty">
                    ${quantity}
                  </td>

                  <td class="article">
                    ${description}
                  </td>

                  <td class="property">
                    ${propertyNumber}
                  </td>

                  <td class="model">
                    ${modelNumber}
                  </td>

                  <td class="serial">
                    ${serialNumber}
                  </td>

                  <td class="date">
                    ${dateAcquired}
                  </td>

                  <td class="amount">
                    ${amount}
                  </td>
                </tr>

                <tr class="total-row">
                  <td
                    colspan="7"
                    class="total-label"
                  >
                    Total
                  </td>

                  <td class="total-amount">
                    ${amount}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- DETAILS BELOW THE MAIN TABLE -->
            <div class="lower-details">
              <div class="lower-left">
                <p>
                  <strong>UNIT/OFFICE:</strong>
                  ${this.escapeHtml(details.unitOffice || responsibilityCenter || '-')}
                </p>

                <p>
                  <strong>PO NO.:</strong>
                  ${this.escapeHtml(details.poNumber || '-')}
                </p>

                <p>
                  <strong>UACS:</strong>
                  ${this.escapeHtml(details.uacs || '-')}
                </p>

                <p>
                  <strong>BUR NO.:</strong>
                  ${this.escapeHtml(details.burNumber || '-')}
                </p>

                <p>
                  <strong>IAR NO.:</strong>
                  ${this.escapeHtml(details.iarNumber || '-')}
                </p>
              </div>

              <div class="lower-right">
                <p>
                  <strong>PURPOSE:</strong>
                </p>

                <p>
                  ${remarks}
                </p>

              </div>
            </div>

            <div class="print-footer">
              <div class="page-number">Page 1 of 1</div>
              <div class="signature">
                <div class="signature-box">
                  <div class="signature-heading">RECEIVED BY</div>
                  <div class="signature-name">${personnelName}</div>
                  <div class="signature-label">${this.escapeHtml(details.receivedByDesignation || '')}</div>
                  <div class="signature-label">Signature over Printed Name</div>
                  <div class="signature-date">${dateIssued}</div>
                </div>

                <div class="signature-box">
                  <div class="signature-heading">RECEIVED FROM:</div>
                  <div class="signature-name">${this.escapeHtml(details.receivedFrom || '-')}</div>
                  <div class="signature-label">${this.escapeHtml(details.receivedFromDesignation || '')}</div>
                  <div class="signature-label">Signature over Printed Name</div>
                  <div class="signature-date">${dateIssued}</div>
                </div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function () {
              const logo = document.querySelector('.logo')
              if (logo && !logo.complete) {
                logo.onload = function () { window.print() }
                logo.onerror = function () { window.print() }
              } else {
                window.print()
              }
            }
          <\/script>
        </body>
        </html>
      `)

      printWindow.document.close()
    }
  }
}
</script>

<style scoped>
.receipt-print-details-form .modal-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.receipt-print-details-form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.table th {
  white-space: nowrap;
}

.table td {
  vertical-align: middle;
}

.receipt-table-header th {
  background-color: #2f5d3a;
  color: #fff;
  white-space: nowrap;
}

.card {
  border-color: #e4e2d8;
  border-radius: 8px;
  box-shadow: none;
}

@media (max-width: 576px) {
  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: 0.5rem auto;
  }
}
</style>