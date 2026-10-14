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

    <div class="card shadow-sm">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-dark">
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
                    class="btn btn-sm btn-outline-primary me-1"
                    @click="editReceipt(receipt)"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger me-1"
                    @click="deleteReceipt(receipt.id)"
                  >
                    Delete
                  </button>

                  <button
                    class="btn btn-sm btn-outline-success me-1"
                    @click="printReceipt(receipt)"
                  >
                    Print
                  </button>

                  <button
                    class="btn btn-sm btn-outline-dark"
                    @click="openRISModal(receipt)"
                  >
                    Print RIS
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
                    Select Approved Item Request
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
      id="risDetailsModal"
      tabindex="-1"
      aria-labelledby="risDetailsModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <form @submit.prevent="confirmPrintRIS">
            <div class="modal-header">
              <h5 class="modal-title" id="risDetailsModalLabel">Complete RIS Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <p class="text-muted small">Existing request and item details will be filled in automatically. Complete the required fields before printing.</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Fund Cluster <span class="text-danger">*</span></label>
                  <input class="form-control" v-model.trim="risForm.fundCluster" required>
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
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success">Continue to Print</button>
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
  name: 'PropertyReceipts',

  data() {
    return {
      receipts: [],
      items: [],
      personnel: [],
      itemRequests: [],

      editing: false,
      saving: false,
      selectedRISReceipt: null,
      risForm: {
        fundCluster: '',
        requestedBy: '',
        requestedDesignation: '',
        approvedBy: '',
        approvedDesignation: '',
        issuedBy: '',
        issuedDesignation: '',
        receivedBy: '',
        receivedDesignation: ''
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
  },

  methods: {
    async getReceipts() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/receipts'
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
          'http://localhost:5000/api/items'
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
          'http://localhost:5000/api/personnel'
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
          'http://localhost:5000/api/item-requests'
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
          request =>
            request.status === 'Approved' &&
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
        receipt_type:
          receipt.receipt_type || 'PAR',
        receipt_number:
          receipt.receipt_number || '',
        date_issued:
          receipt.date_issued || '',
        remarks:
          receipt.remarks || ''
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('receiptModal')
        )

      modal.show()
    },

    async saveReceipt() {
      this.saving = true

      try {
        let url =
          'http://localhost:5000/api/receipts'

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
            `http://localhost:5000/api/receipts/${this.form.id}`

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
          `http://localhost:5000/api/receipts/${id}`,
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

    openRISModal(receipt) {
      const request = receipt.item_requests || {}
      const issuedTo = this.getIssuedToName(receipt)
      this.selectedRISReceipt = receipt
      this.risForm = {
        fundCluster: request.fund_cluster || receipt.fund_cluster || '',
        requestedBy: request.requested_by_name || request.users?.full_name || '',
        requestedDesignation: request.requested_by_designation || '',
        approvedBy: receipt.approved_by_name || '',
        approvedDesignation: receipt.approved_by_designation || '',
        issuedBy: receipt.issued_by_name || '',
        issuedDesignation: receipt.issued_by_designation || '',
        receivedBy: issuedTo === '-' ? '' : issuedTo,
        receivedDesignation: receipt.received_by_designation || ''
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

    printRIS(receipt, details = {}) {
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
      const officeName = escape(office.office_name || request.office_name || receipt.office_name)
      const division = escape(request.division || receipt.division)
      const responsibilityCenter = escape(request.responsibility_center || receipt.responsibility_center || item.responsibility_center)
      const fundCluster = escape(details.fundCluster || request.fund_cluster || receipt.fund_cluster)
      const description = escape(item.description || request.item_description)
      const stockNumber = escape(item.stock_number || item.property_number || item.stock_no)
      const unit = escape(item.unit || item.unit_of_measure)
      const quantityRequested = escape(request.quantity_requested || request.quantity || receipt.quantity_requested)
      const quantityIssued = escape(receipt.quantity_issued || request.quantity_issued || request.quantity_requested || request.quantity)
      const availableQuantity = Number(item.quantity_available ?? item.quantity ?? item.stock_balance)
      const requestedQuantity = Number(request.quantity_requested || request.quantity || receipt.quantity_requested)
      let stockAvailability = 'Not available'
      if (Number.isFinite(availableQuantity) && Number.isFinite(requestedQuantity)) {
        stockAvailability = availableQuantity >= requestedQuantity ? 'Available' : 'Not available'
      } else if (item.stock_available === true || item.available === true) {
        stockAvailability = 'Available'
      } else if (item.stock_available === false || item.available === false) {
        stockAvailability = 'Not available'
      }
      const purpose = escape(request.purpose || receipt.purpose || request.remarks)
      const remarks = escape(receipt.remarks || request.remarks)

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>RIS - ${receiptNumber}</title>
          <style>
            @page { size: 8.5in 13in portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 10px; margin: 0; }
            .form-frame { border: 1px solid #000; padding: 5px; }
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
            .purpose { border: 1px solid #000; border-top: 0; padding: 7px 5px; min-height: 35px; }
            .signature-table { margin-top: 7px; }
            .signature-table th { text-align: left; height: 23px; }
            .signature-table td { height: 48px; vertical-align: top; }
            .signature-space { margin-top: 20px; border-top: 1px solid #000; text-align: center; padding-top: 3px; }
            .small { font-size: 9px; }
            .instructions { margin-top: 6px; border: 1px solid #000; padding: 5px 6px; font-size: 7px; line-height: 1.2; }
            .instructions-title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 4px; }
            .instructions p { margin: 0 0 3px; }
            .instructions .copies { margin-left: 10px; }
            .form-code { margin-top: 3px; font-weight: bold; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="form-frame">
            <div class="letterhead">
              <div class="logo-box"><img class="logo" src="${logoUrl}" alt="NVSU Logo"></div>
              <div class="letterhead-text">
                <p>Republic of the Philippines</p>
                <p class="school-name">NUEVA VIZCAYA STATE UNIVERSITY</p>
                <p>3702 Bambang, Nueva Vizcaya</p>
              </div>
            </div>

            <div class="document-title">REQUISITION AND ISSUE SLIP (RIS)</div>

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
                <col style="width: 7%">
                <col style="width: 31%">
                <col style="width: 8%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 8%">
                <col style="width: 23%">
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2">Stock #</th>
                  <th rowspan="2">Unit</th>
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
                  <td class="center">${unit}</td>
                  <td>${description}</td>
                  <td class="center">${quantityRequested}</td>
                  <td class="center">${stockAvailability === 'Available' ? '✓' : ''}</td>
                  <td class="center">${stockAvailability !== 'Available' ? '✓' : ''}</td>
                  <td class="center">${quantityIssued}</td>
                  <td>${remarks}</td>
                </tr>
                <tr>
                  <td colspan="8" class="center"><strong>***Nothing Follows***</strong></td>
                </tr>
              </tbody>
            </table>

            <div class="purpose"><strong>Purpose:</strong> ${purpose}</div>

          <table class="signature-table">
            <tbody>
              <tr>
                <th colspan="2">Requested by:</th>
                <th colspan="2">Approved by:</th>
              </tr>
              <tr>
                <td colspan="2"><div class="signature-space"><strong>${escape(details.requestedBy)}</strong><br>${escape(details.requestedDesignation)}<br>Signature / Date</div></td>
                <td colspan="2"><div class="signature-space"><strong>${escape(details.approvedBy)}</strong><br>${escape(details.approvedDesignation)}<br>Signature / Date</div></td>
              </tr>
              <tr>
                <th colspan="2">Issued by:</th>
                <th colspan="2">Received by:</th>
              </tr>
              <tr>
                <td colspan="2"><div class="signature-space"><strong>${escape(details.issuedBy)}</strong><br>${escape(details.issuedDesignation)}<br>Signature / Date</div></td>
                <td colspan="2"><div class="signature-space"><strong>${escape(details.receivedBy)}</strong><br>${escape(details.receivedDesignation)}<br>Signature / Date</div></td>
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

    printReceipt(receipt) {
      const item = this.getReceiptItem(receipt)

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
          this.getIssuedToName(receipt)
        )

      const description =
        this.escapeHtml(
          item.description || '-'
        )

      const propertyNumber =
        this.escapeHtml(
          item.property_number || '-'
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
          item.responsibility_center || '-'
        )

      const cost =
        Number(item.cost || 0)

      const amount =
        this.formatAmount(cost)

      const remarks =
        this.escapeHtml(
          receipt.remarks || '-'
        )

      const receiptStatus =
        this.escapeHtml(
          receipt.status || 'Delivered'
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
            @page {
              size: A4;
              margin: 10mm 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #000;
              font-family: Arial, sans-serif;
              font-size: 10px;
            }

            .page {
              width: 100%;
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 14px;
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
            }

            .seal {
              width: 72px;
              height: 72px;
              border: 1px solid #000;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: 10px;
              font-weight: bold;
              color: #000;
              background: #fff;
            }

            .header h1 {
              margin: 0;
              font-size: 19px;
              color: #000;
              font-weight: bold;
            }

            .header h2 {
              margin: 3px 0;
              font-size: 13px;
              color: #000;
            }

            .header p {
              margin: 2px 0;
              font-size: 11px;
            }

            .appendix {
              text-align: right;
              margin-top: 5px;
              font-size: 10px;
              font-weight: bold;
            }

            .receipt-title {
              text-align: center;
              background: #fff;
              color: #000;
              font-size: 15px;
              font-weight: bold;
              padding: 9px;
              margin: 8px 0 10px;
              border: 1px solid #000;
            }

            .receipt-title span {
              color: #000;
            }

            /* FUND CLUSTER AND PAR NUMBER */
            .receipt-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 8px 0 5px;
              font-size: 12px;
              font-weight: bold;
            }

            .fund-cluster,
            .par-number {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .fund-cluster span,
            .par-number span {
              display: inline-block;
              min-width: 155px;
              border-bottom: 1px solid #000;
              padding: 2px 5px;
              font-weight: normal;
            }

            .par-number span {
              min-width: 120px;
            }

            .main-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-top: 5px;
            }

            .main-table th,
            .main-table td {
              border: 1px solid #000;
              padding: 5px 4px;
              vertical-align: middle;
              word-wrap: break-word;
            }

            .main-table th {
              background: #fff;
              color: #000;
              text-align: center;
              font-size: 9px;
            }

            .main-table td {
              height: 46px;
              font-size: 9px;
            }

            .sn {
              width: 7%;
              text-align: center;
            }

            .qty {
              width: 6%;
              text-align: center;
            }

            .unit {
              width: 7%;
              text-align: center;
            }

            .article {
              width: 23%;
            }

            .property {
              width: 14%;
              text-align: center;
            }

            .serial {
              width: 13%;
              text-align: center;
            }

            .date {
              width: 13%;
              text-align: center;
            }

            .amount {
              width: 17%;
              text-align: right;
            }

            .total-row td {
              height: 28px;
              font-weight: bold;
            }

            .total-label {
              text-align: right;
              background: #fff;
            }

            .total-amount {
              background: #fff;
              text-align: right;
            }

            .lower-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              border: 1px solid #000;
              border-top: none;
            }

            .lower-left,
            .lower-right {
              padding: 9px;
              min-height: 155px;
            }

            .lower-left {
              border-right: 1px solid #000;
            }

            .lower-details p {
              margin: 0 0 9px;
              line-height: 1.25;
            }

            .lower-details strong {
              color: #000;
            }

            .line {
              display: inline-block;
              border-bottom: 1px solid #000;
              width: 150px;
              height: 12px;
            }

            .acknowledgement {
              margin-top: 12px;
              border: 1px solid #000;
              padding: 8px;
              font-size: 10px;
              line-height: 1.5;
            }

            .acknowledgement strong {
              color: #000;
            }

            .signature {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 45px;
              margin-top: 65px;
            }

            .signature-box {
              text-align: center;
              font-size: 10px;
            }

            .signature-line {
              border-top: 1px solid #000;
              padding-top: 5px;
            }

            .signature-name {
              margin-top: 5px;
              font-weight: bold;
            }

            .signature-label {
              margin-top: 3px;
            }

            .footer {
              margin-top: 18px;
              padding-top: 5px;
              border-top: 3px solid #198754;
              text-align: center;
              font-size: 9px;
              color: #000;
              font-weight: bold;
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="header">
              <div class="seal">
                NVSU<br>
                SEAL
              </div>

              <div>
                <h1>
                  NUEVA VIZCAYA STATE UNIVERSITY
                </h1>

                <h2>
                  Bambang Campus
                </h2>

                <p>
                  Bambang, Nueva Vizcaya
                </p>
              </div>
            </div>

            <div class="appendix">
              APPENDIX 71
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
                <span>TF-2</span>
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

                  <th class="unit">
                    Unit
                  </th>

                  <th class="article">
                    Article and Description
                  </th>

                  <th class="property">
                    Property Number
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
                    1
                  </td>

                  <td class="unit">
                    unit
                  </td>

                  <td class="article">
                    ${description}
                  </td>

                  <td class="property">
                    ${propertyNumber}
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
                  <span class="line"></span>
                </p>

                <p>
                  <strong>PO NO.:</strong>
                  <span class="line"></span>
                </p>

                <p>
                  <strong>UACS:</strong>
                  <span class="line"></span>
                </p>

                <p>
                  <strong>BUR NO.:</strong>
                  <span class="line"></span>
                </p>

                <p>
                  <strong>SUPPLIER:</strong>
                  <span class="line"></span>
                </p>

                <p>
                  <strong>IAR NO.:</strong>
                  <span class="line"></span>
                </p>
              </div>

              <div class="lower-right">
                <p>
                  <strong>PURPOSE:</strong>
                </p>

                <p>
                  ${remarks}
                </p>

                <p>
                  <strong>DATE ISSUED:</strong>
                  ${dateIssued}
                </p>

                <p>
                  <strong>STATUS:</strong>
                  ${receiptStatus}
                </p>
              </div>
            </div>

            <!-- ACKNOWLEDGEMENT -->
            <div class="acknowledgement">
              <strong>
                ACKNOWLEDGEMENT:
              </strong>

              I hereby acknowledge receipt of the
              property/item described above and agree
              to take proper care of the assigned property.
            </div>

            <!-- SIGNATURES -->
            <div class="signature">
              <div class="signature-box">
                <div class="signature-line">
                  <strong>
                    RECEIVED BY:
                  </strong>
                </div>

                <div class="signature-name">
                  ${personnelName}
                </div>

                <div class="signature-label">
                  Signature over Printed Name
                </div>
              </div>

              <div class="signature-box">
                <div class="signature-line">
                  <strong>
                    RECEIVED FROM:
                  </strong>
                </div>

                <div class="signature-name">
                  Administrative Officer V
                </div>

                <div class="signature-label">
                  Signature over Printed Name
                </div>
              </div>
            </div>

            <div class="footer">
              NUEVA VIZCAYA STATE UNIVERSITY
              PROPERTY MANAGEMENT SYSTEM
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
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
.table th {
  white-space: nowrap;
}

.table td {
  vertical-align: middle;
}

@media (max-width: 576px) {
  .table {
    min-width: 0 !important;
    table-layout: fixed;
  }

  .table th,
  .table td {
    padding: 9px 5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: 0.5rem auto;
  }
}
</style>