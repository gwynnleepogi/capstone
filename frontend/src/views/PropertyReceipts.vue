
<template>
  <div>
    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Receipts</h2>
        <p class="text-muted">Manage property receipts</p>
      </div>

      <button class="btn btn-warning" @click="openAddModal">
        + Add Receipt
      </button>
    </div>

    <!-- RECEIPTS TABLE -->
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
                  {{ getItem(receipt).description || '-' }}
                </td>

                <td>
                  {{ receipt.users?.full_name || getPersonnelName(receipt.issued_to) }}
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
                    {{ receipt.status || 'Ready to Deliver' }}
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
                    class="btn btn-sm btn-outline-secondary"
                    @click="printReceipt(receipt)"
                  >
                    Print
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
                  <option value="PAR">
                    PAR
                  </option>

                  <option value="ICS">
                    ICS
                  </option>
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

              <!-- ITEM -->
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
                    -
                    {{ item.property_number || 'No Property Number' }}
                  </option>
                </select>
              </div>

              <!-- ISSUED TO -->
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

              <!-- STATUS -->
              <div class="mb-3">
                <label class="form-label">
                  Receipt Status
                </label>

                <select
                  class="form-select"
                  v-model="form.status"
                  required
                >
                  <option value="Ready to Deliver">
                    Ready to Deliver
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>
                </select>
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

export default {
  name: 'Receipts',

  data() {
    return {
      receipts: [],
      items: [],
      personnel: [],

      editing: false,
      saving: false,

      form: {
        id: null,
        item_id: '',
        receipt_type: 'PAR',
        receipt_number: '',
        issued_to: '',
        date_issued: '',
        status: 'Ready to Deliver',
        remarks: ''
      }
    }
  },

  mounted() {
    this.getReceipts()
    this.getItems()
    this.getPersonnel()
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
        alert(error.message)
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

        this.items = data
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

        this.personnel = data
      } catch (error) {
        console.log(error)
      }
    },

    getItem(receipt) {
      if (receipt.items) {
        return receipt.items
      }

      const item = this.items.find(
        item => item.id === receipt.item_id
      )

      return item || {}
    },

    getPersonnelName(personnelId) {
      const person = this.personnel.find(
        person => person.id === personnelId
      )

      return person?.full_name || '-'
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        item_id: '',
        receipt_type: 'PAR',
        receipt_number: '',
        issued_to: '',
        date_issued: new Date()
          .toISOString()
          .split('T')[0],
        status: 'Ready to Deliver',
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

        item_id:
          receipt.item_id ||
          receipt.items?.id ||
          '',

        receipt_type:
          receipt.receipt_type || 'PAR',

        receipt_number:
          receipt.receipt_number || '',

        issued_to:
          receipt.issued_to || '',

        date_issued:
          receipt.date_issued || '',

        status:
          receipt.status || 'Ready to Deliver',

        remarks:
          receipt.remarks || ''
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

            receipt_type:
              this.form.receipt_type,

            receipt_number:
              this.form.receipt_number,

            issued_to:
              this.form.issued_to || null,

            date_issued:
              this.form.date_issued || null,

            status:
              this.form.status,

            remarks:
              this.form.remarks || null
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
      } catch (error) {
        console.log(error)
        alert(error.message)
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
      } catch (error) {
        console.log(error)
        alert(error.message)
      }
    },

    printReceipt(receipt) {
      const item = this.getItem(receipt)

      const person =
        receipt.users ||
        this.personnel.find(
          person => person.id === receipt.issued_to
        ) ||
        {}

      const escapeHtml = value => {
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
      }

      const formatAmount = value => {
        const amount = Number(value)

        if (!Number.isFinite(amount)) {
          return '-'
        }

        return amount.toLocaleString(
          'en-PH',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )
      }

      const receiptType = escapeHtml(
        receipt.receipt_type || 'PAR'
      )

      const receiptNumber = escapeHtml(
        receipt.receipt_number || '-'
      )

      const description = escapeHtml(
        item.description ||
        receipt.item_description ||
        'No description'
      )

      const propertyNumber = escapeHtml(
        item.property_number ||
        '-'
      )

      const serialNumber = escapeHtml(
        item.serial_number ||
        '-'
      )

      const dateAcquired = escapeHtml(
        item.acquisition_date ||
        item.date_of_purchase ||
        '-'
      )

      const quantity = escapeHtml(
        item.quantity || 1
      )

      const unit = escapeHtml(
        item.unit || 'unit'
      )

      const cost = Number(
        item.cost ??
        item.price ??
        0
      )

      const amount = formatAmount(cost)

      const total = formatAmount(cost)

      const personnelName = escapeHtml(
        person.full_name ||
        '-'
      )

      const dateIssued = escapeHtml(
        receipt.date_issued ||
        '-'
      )

      const receiptStatus = escapeHtml(
        receipt.status ||
        'Ready to Deliver'
      )

      const purpose = escapeHtml(
        receipt.remarks ||
        'PROPERTY INVENTORY ACCOUNTABILITY'
      )

      const office = escapeHtml(
        receipt.offices?.office_name ||
        item.office_name ||
        '________________________'
      )

      const printWindow = window.open(
        '',
        '_blank'
      )

      if (!printWindow) {
        alert(
          'Please allow pop-ups to print the receipt.'
        )

        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${receiptType} - ${receiptNumber}</title>

          <style>
            @page {
              size: A4;
              margin: 12mm 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              color: #000;
              margin: 0;
              font-size: 10px;
            }

            .page {
              width: 100%;
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              text-align: center;
            }

            .seal {
              width: 54px;
              height: 54px;
              border: 1px solid #777;
              border-radius: 50%;
              display: grid;
              place-items: center;
              font-size: 7px;
              text-align: center;
            }

            .header h1 {
              margin: 0;
              font-size: 15px;
            }

            .header p {
              margin: 2px 0;
              font-size: 10px;
            }

            .appendix {
              position: absolute;
              right: 14mm;
              top: 10mm;
              font-weight: bold;
              font-size: 9px;
            }

            .title {
              margin: 17px 0 12px;
              text-align: center;
              font-size: 13px;
              font-weight: bold;
              text-decoration: underline;
            }

            .meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }

            .meta span {
              display: inline-block;
              min-width: 145px;
              border-bottom: 1px solid #000;
            }

            .meta strong {
              margin-right: 4px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th,
            td {
              border: 1px solid #000;
              padding: 5px 4px;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }

            th {
              font-size: 9px;
              text-align: center;
            }

            td {
              min-height: 42px;
            }

            .sn {
              width: 8%;
              text-align: center;
            }

            .qty {
              width: 7%;
              text-align: center;
            }

            .unit {
              width: 8%;
              text-align: center;
            }

            .article {
              width: 27%;
            }

            .property {
              width: 15%;
              text-align: center;
            }

            .serial {
              width: 15%;
              text-align: center;
            }

            .date {
              width: 13%;
              text-align: center;
            }

            .amount {
              width: 15%;
              text-align: right;
            }

            .total td {
              height: 28px;
              font-weight: bold;
            }

            .total-label {
              text-align: right;
            }

            .highlight {
              background: #fff200;
            }

            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              min-height: 110px;
            }

            .details > div {
              padding: 10px 7px;
              border: 1px solid #000;
              border-top: 0;
            }

            .details > div + div {
              border-left: 0;
            }

            .details p {
              margin: 0 0 7px;
            }

            .label {
              display: inline-block;
              min-width: 105px;
            }

            .signature {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 55px;
              margin-top: 65px;
            }

            .signature-box {
              text-align: center;
            }

            .signature-line {
              border-top: 1px solid #000;
              padding-top: 5px;
            }

            .signature-box small {
              display: block;
              margin-top: 3px;
            }

            .page-number {
              position: fixed;
              bottom: 0;
              right: 0;
              font-size: 9px;
            }
          </style>
        </head>

        <body>
          <main class="page">
            <div class="appendix">
              APPENDIX 71
            </div>

            <header class="header">
              <div class="seal">
                NVSU<br>
                SEAL
              </div>

              <div>
                <h1>
                  NUEVA VIZCAYA STATE UNIVERSITY
                </h1>

                <p>
                  Bambang Campus
                </p>

                <p>
                  Bambang, Nueva Vizcaya
                </p>
              </div>
            </header>

            <div class="title">
              PROPERTY ACKNOWLEDGEMENT RECEIPT
            </div>

            <div class="meta">
              <div>
                <strong>FUND CLUSTER:</strong>
                <span>TF-2</span>
              </div>

              <div>
                <strong>
                  ${receiptType === 'ICS' ? 'ICS No:' : 'PAR No:'}
                </strong>

                <span>
                  ${receiptNumber}
                </span>
              </div>
            </div>

            <table>
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
                    30000
                  </td>

                  <td class="qty">
                    ${quantity}
                  </td>

                  <td class="unit">
                    ${unit}
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
                    colspan="7"
                    class="total-label"
                  >
                    Total
                  </td>

                  <td class="amount highlight">
                    ${total}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="details">
              <div>
                <p>
                  <span class="label">
                    UNIT/OFFICE:
                  </span>

                  ${office}
                </p>

                <p>
                  <span class="label">
                    PO NO.:
                  </span>

                  ________________________
                </p>

                <p>
                  <span class="label">
                    UACS:
                  </span>

                  __________________________
                </p>

                <p>
                  <span class="label">
                    BUR NO.:
                  </span>

                  ________________________
                </p>

                <p>
                  <span class="label">
                    SUPPLIER:
                  </span>

                  _______________________
                </p>

                <p>
                  <span class="label">
                    IAR NO.:
                  </span>

                  ________________________
                </p>
              </div>

              <div>
                <p>
                  <strong>
                    PURPOSE:
                  </strong>
                </p>

                <p>
                  ${purpose}
                </p>

                <p>
                  <strong>
                    DATE ISSUED:
                  </strong>

                  ${dateIssued}
                </p>

                <p>
                  <strong>
                    STATUS:
                  </strong>

                  ${receiptStatus}
                </p>
              </div>
            </div>

            <div class="signature">
              <div class="signature-box">
                <div class="signature-line">
                  <strong>
                    RECEIVED BY:
                  </strong>
                </div>

                <small>
                  ${personnelName}
                </small>

                <small>
                  Signature over Printed Name
                </small>
              </div>

              <div class="signature-box">
                <div class="signature-line">
                  <strong>
                    RECEIVED FROM:
                  </strong>
                </div>

                <small>
                  Administrative Officer V
                </small>

                <small>
                  Signature over Printed Name
                </small>
              </div>
            </div>

            <div class="page-number">
              Page 1 of 1
            </div>
          </main>

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