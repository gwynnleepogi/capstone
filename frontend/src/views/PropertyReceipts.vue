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
        + Add Receipt
      </button>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th>Receipt Number</th>
                <th>Type</th>
                <th>Item</th>
                <th>Issued To</th>
                <th>Date Issued</th>
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
                  {{ receipt.receipt_number }}
                </td>

                <td>
                  <span class="badge bg-secondary">
                    {{ receipt.receipt_type }}
                  </span>
                </td>

                <td>
                  {{ receipt.items?.description || '-' }}
                </td>

                <td>
                  {{ receipt.users?.full_name || '-' }}
                </td>

                <td>
                  {{ receipt.date_issued || '-' }}
                </td>

                <td>
                  {{ receipt.remarks || '-' }}
                </td>

                <td>
                  <button
                    class="btn btn-sm btn-outline-success me-2"
                    @click="editReceipt(receipt)"
                    title="Edit"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger me-2"
                    @click="deleteReceipt(receipt.id)"
                    title="Delete"
                  >
                    Delete
                  </button>

                  <button
                    class="btn btn-sm btn-outline-orange"
                    @click="printReceipt(receipt)"
                    title="Print"
                  >
                    Print
                  </button>
                </td>
              </tr>

              <tr v-if="receipts.length === 0">
                <td
                  colspan="7"
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

    <div
      class="modal fade"
      id="receiptModal"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editing ? 'Edit Receipt' : 'Add Receipt' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveReceipt">
            <div class="modal-body">

              <div class="mb-3">
                <label class="form-label">
                  Item Request
                </label>

                <select
                  class="form-select"
                  v-model="form.item_request_id"
                  required
                >
                  <option value="">
                    Select Approved or Delivered Request
                  </option>

                  <option
                    v-for="request in availableRequests"
                    :key="request.id"
                    :value="request.id"
                  >
                    {{ request.request_number || 'No Request Number' }}
                    -
                    {{ request.item_description || 'No Description' }}
                    ({{ request.status }})
                  </option>
                </select>

                <small class="text-muted">
                  Only approved or delivered requests without a receipt are shown.
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Receipt Type
                </label>

                <select
                  class="form-select"
                  v-model="form.receipt_type"
                  required
                >
                  <option value="PAR">
                    Property Acknowledgement Receipt
                  </option>

                  <option value="ICS">
                    Inventory Custodian Slip
                  </option>
                </select>
              </div>

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

              <div class="mb-3">
                <label class="form-label">
                  Item
                </label>

                <select
                  class="form-select"
                  v-model="form.item_id"
                  required
                >
                  <option value="">
                    Select Item
                  </option>

                  <option
                    v-for="item in items"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.description }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Issued To
                </label>

                <select
                  class="form-select"
                  v-model="form.issued_to"
                >
                  <option value="">
                    Select Personnel
                  </option>

                  <option
                    v-for="person in personnel"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.full_name }}
                  </option>
                </select>
              </div>

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
                class="btn btn-warning"
                :disabled="saving"
              >
                {{ saving ? 'Saving...' : 'Save Receipt' }}
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

const nvsuSeal = new URL(
  '../assets/nvsu-seal.png',
  import.meta.url
).href

export default {
  name: 'Receipts',

  data() {
    return {
      receipts: [],
      items: [],
      personnel: [],
      requests: [],
      editing: false,
      saving: false,

      form: {
        id: null,
        item_id: '',
        item_request_id: '',
        receipt_type: 'PAR',
        receipt_number: '',
        issued_to: '',
        date_issued: '',
        remarks: ''
      }
    }
  },

  computed: {
    availableRequests() {
      return this.requests.filter(request => {
        const alreadyHasReceipt = this.receipts.some(
          receipt =>
            receipt.item_request_id === request.id &&
            receipt.id !== this.form.id
        )

        const validStatus =
          request.status === 'Approved' ||
          request.status === 'Delivered'

        return validStatus && !alreadyHasReceipt
      })
    }
  },

  mounted() {
    this.getReceipts()
    this.getItems()
    this.getPersonnel()
    this.getRequests()
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

        this.receipts = data
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getRequests() {
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

        this.requests = data
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getItems() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/items'
        )

        const data = await response.json()

        if (response.ok) {
          this.items = data
        }
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

        if (response.ok) {
          this.personnel = data
        }
      } catch (error) {
        console.log(error)
      }
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        item_id: '',
        item_request_id: '',
        receipt_type: 'Property Acknowledgement Receipt',
        receipt_number: '',
        issued_to: '',
        date_issued: new Date().toISOString().split('T')[0],
        remarks: ''
      }

      const modal = Modal.getOrCreateInstance(
        document.getElementById('receiptModal')
      )

      modal.show()
    },

    editReceipt(receipt) {
      this.editing = true

      this.form = {
        id: receipt.id,
        item_id: receipt.item_id,
        item_request_id: receipt.item_request_id || '',
        receipt_type: receipt.receipt_type,
        receipt_number: receipt.receipt_number,
        issued_to: receipt.issued_to || '',
        date_issued: receipt.date_issued || '',
        remarks: receipt.remarks || ''
      }

      const modal = Modal.getOrCreateInstance(
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

        if (this.editing) {
          url =
            `http://localhost:5000/api/receipts/${this.form.id}`

          method = 'PUT'
        }

        const response = await fetch(url, {
          method: method,

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            item_id: this.form.item_id,
            item_request_id: this.form.item_request_id || null,
            receipt_type: this.form.receipt_type,
            receipt_number: this.form.receipt_number,
            issued_to: this.form.issued_to || null,
            date_issued: this.form.date_issued || null,
            remarks: this.form.remarks
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to save receipt'
          )
        }

        const modal = Modal.getOrCreateInstance(
          document.getElementById('receiptModal')
        )

        modal.hide()

        await this.getReceipts()
        await this.getRequests()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Receipt updated successfully'
              : 'Receipt added successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      } finally {
        this.saving = false
      }
    },

    async deleteReceipt(id) {
      if (
        !confirm(
          'Are you sure you want to delete this receipt?'
        )
      ) {
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
        await this.getRequests()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Receipt deleted successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    printReceipt(receipt) {
      const item = receipt.items || {}

      const escapeHtml = (value) => {
        return String(value ?? '-').replace(
          /[&<>"']/g,
          (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          })[character]
        )
      }

      const formatAmount = (value) => {
        const amount = Number(value)

        if (!Number.isFinite(amount)) {
          return '-'
        }

        return amount.toLocaleString('en-PH', {
          minimumFractionDigits: 2
        })
      }

      const receiptNumber =
        escapeHtml(receipt.receipt_number)

      const receiptType =
        escapeHtml(receipt.receipt_type)

      const personnelName =
        escapeHtml(
          receipt.users?.full_name || '-'
        )

      const description =
        escapeHtml(item.description)

      const propertyNumber =
        escapeHtml(item.property_number)

      const serialNumber =
        escapeHtml(item.serial_number)

      const dateAcquired =
        escapeHtml(item.acquisition_date)

      const amount =
        formatAmount(item.cost)

      const total =
        formatAmount(item.cost)

      const purpose =
        escapeHtml(
          receipt.remarks ||
          'PROPERTY INVENTORY ACCOUNTABILITY'
        )

      const office =
        escapeHtml(
          receipt.offices?.office_name ||
          item.office_name ||
          '________________________'
        )

      const dateIssued =
        escapeHtml(receipt.date_issued)

      const printWindow =
        window.open('', '_blank')

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

            html,
            body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              background: white;
              font-size: 10px;
            }

            .page {
              min-height: 277mm;
              display: flex;
              flex-direction: column;
            }

            .top-line {
              height: 7px;
              background: #2f5d3a;
              margin-bottom: 7px;
            }

            .appendix {
              text-align: right;
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 4px;
            }

            .header {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 76px;
              text-align: center;
              padding: 3px 80px 8px;
              border-bottom: 2px solid #2f5d3a;
            }

            .seal {
              position: absolute;
              left: 10px;
              width: 68px;
              height: 68px;
              object-fit: contain;
            }

            .header-text {
              line-height: 1.25;
            }

            .header h1 {
              margin: 0;
              color: #2f5d3a;
              font-size: 16px;
              font-weight: bold;
            }

            .header h2 {
              margin: 3px 0;
              color: #111;
              font-size: 12px;
              font-weight: bold;
            }

            .header p {
              margin: 2px 0;
              font-size: 10px;
            }

            .title {
              text-align: center;
              margin: 9px 0;
              padding: 7px;
              background: #2f5d3a;
              color: white;
              border-bottom: 4px solid #e8c547;
              font-size: 14px;
              font-weight: bold;
              letter-spacing: .4px;
            }

            .meta {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 7px;
            }

            .meta-box {
              width: 50%;
              padding: 6px 8px;
              border: 1px solid #2f5d3a;
              border-left: 5px solid #2f5d3a;
            }

            .meta strong {
              color: #2f5d3a;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th,
            td {
              border: 1px solid #222;
              padding: 5px;
              vertical-align: middle;
            }

            th {
              background: #2f5d3a;
              color: white;
              text-align: center;
              font-size: 9px;
            }

            td {
              height: 50px;
            }

            .sn {
              width: 7%;
              text-align: center;
            }

            .article {
              width: 28%;
            }

            .property {
              width: 17%;
              text-align: center;
            }

            .serial {
              width: 15%;
              text-align: center;
            }

            .date {
              width: 15%;
              text-align: center;
            }

            .amount {
              width: 18%;
              text-align: right;
            }

            .total td {
              height: 27px;
              font-weight: bold;
            }

            .total-label {
              text-align: right;
              background: #f1f1f1;
            }

            .highlight {
              background: #e8c547;
              color: #111;
            }

            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              margin-top: 8px;
            }

            .details-box {
              min-height: 115px;
              padding: 8px;
              border: 1px solid #222;
            }

            .details-box + .details-box {
              border-left: 0;
            }

            .details-title {
              margin: -8px -8px 8px;
              padding: 5px 6px;
              background: #2f5d3a;
              color: white;
              font-weight: bold;
            }

            .details p {
              margin: 0 0 7px;
            }

            .label {
              display: inline-block;
              min-width: 90px;
              color: #2f5d3a;
              font-weight: bold;
            }

            .signature-section {
              margin-top: auto;
              padding-top: 25px;
            }

            .signature-title {
              margin-bottom: 20px;
              padding: 6px;
              background: #2f5d3a;
              color: white;
              border-bottom: 4px solid #e8c547;
              text-align: center;
              font-weight: bold;
            }

            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 70px;
            }

            .signature-box {
              text-align: center;
            }

            .signature-space {
              height: 42px;
            }

            .signature-line {
              border-top: 1px solid #111;
              padding-top: 5px;
              font-weight: bold;
            }

            .signature-name {
              margin-top: 4px;
              font-weight: bold;
              text-transform: uppercase;
            }

            .signature-label {
              margin-top: 3px;
              font-size: 9px;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              margin-top: 18px;
              padding-top: 6px;
              border-top: 1px solid #2f5d3a;
              color: #444;
              font-size: 8px;
            }

            .footer strong {
              color: #2f5d3a;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }

          </style>

        </head>

        <body>

          <main class="page">

            <div class="top-line"></div>

            <div class="appendix">
              APPENDIX 71
            </div>

            <header class="header">

              <img
                src="${nvsuSeal}"
                class="seal"
                alt="NVSU Seal"
              >

              <div class="header-text">

                <h1>
                  NUEVA VIZCAYA STATE UNIVERSITY
                </h1>

                <h2>
                  BAMBANG CAMPUS
                </h2>

                <p>
                  Bambang, Nueva Vizcaya
                </p>

              </div>

            </header>

            <div class="title">
              PROPERTY ACKNOWLEDGEMENT RECEIPT
            </div>

            <div class="meta">

              <div class="meta-box">
                <strong>FUND CLUSTER:</strong>
                TF-2
              </div>

              <div class="meta-box">
                <strong>${receiptType} NO:</strong>
                ${receiptNumber}
              </div>

            </div>

            <table>

              <thead>

                <tr>

                  <th class="sn">
                    SN
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

                <tr class="total">

                  <td
                    colspan="5"
                    class="total-label"
                  >
                    TOTAL
                  </td>

                  <td class="amount highlight">
                    ${total}
                  </td>

                </tr>

              </tbody>

            </table>

            <div class="details">

              <div class="details-box">

                <div class="details-title">
                  PROPERTY INFORMATION
                </div>

                <p>
                  <span class="label">
                    UNIT/OFFICE:
                  </span>

                  ${office}
                </p>

                <p>
                  <span class="label">
                    SUPPLIER:
                  </span>

                  ______________________
                </p>

                <p>
                  <span class="label">
                    PO NO.:
                  </span>

                  ______________________
                </p>

                <p>
                  <span class="label">
                    IAR NO.:
                  </span>

                  ______________________
                </p>

              </div>

              <div class="details-box">

                <div class="details-title">
                  ACCOUNTABILITY
                </div>

                <p>
                  <span class="label">
                    PURPOSE:
                  </span>
                </p>

                <p>
                  ${purpose}
                </p>

                <p>
                  <span class="label">
                    DATE ISSUED:
                  </span>

                  ${dateIssued}
                </p>

              </div>

            </div>

            <div class="signature-section">

              <div class="signature-title">
                ACKNOWLEDGEMENT AND ACCEPTANCE
              </div>

              <div class="signatures">

                <div class="signature-box">

                  <div class="signature-space"></div>

                  <div class="signature-line">
                    ${personnelName}
                  </div>

                  <div class="signature-name">
                    ${personnelName}
                  </div>

                  <div class="signature-label">
                    Signature over Printed Name of Recipient
                  </div>

                </div>

                <div class="signature-box">

                  <div class="signature-space"></div>

                  <div class="signature-line">
                    Administrative Officer V
                  </div>

                  <div class="signature-name">
                    Administrative Officer V
                  </div>

                  <div class="signature-label">
                    Signature over Printed Name of Issuing Officer
                  </div>

                </div>

              </div>

            </div>

            <div class="footer">

              <span>
                <strong>NVSU</strong>
                | Property Inventory System
              </span>

              <span>
                Page 1 of 1
              </span>

            </div>

          </main>

          <script>
            window.onload = function() {
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

.btn-outline-orange {
  color: #fd7e14;
  border: 1px solid #fd7e14;
  background-color: transparent;
}

.btn-outline-orange:hover {
  color: white;
  background-color: #fd7e14;
  border-color: #fd7e14;
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
    margin: .5rem auto;
  }
}
</style>