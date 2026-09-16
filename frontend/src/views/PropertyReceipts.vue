<template>
  <div>

    <!-- HEADER -->

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


    <!-- TABLE -->

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
                v-for="receipt in receiptRows"
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
                  {{ receipt.items?.description || receipt.item?.description || '-' }}
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
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="receipt.isDraft ? createReceiptForItem(receipt.item) : editReceipt(receipt)"
                    title="Edit"
                  >
                    {{ receipt.isDraft ? 'Create' : 'Edit' }}
                  </button>


                  <button
                    class="btn btn-sm btn-outline-danger me-2"
                    @click="deleteReceipt(receipt.id)"
                    title="Delete"
                    v-if="!receipt.isDraft"
                  >
                    Delete
                  </button>


                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="printReceipt(receipt)"
                    title="Print Receipt"
                  >
                    Print
                  </button>

                </td>

              </tr>


              <tr v-if="receiptRows.length === 0">

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


    <!-- ADD / EDIT MODAL -->

    <div
      class="modal fade"
      id="receiptModal"
      tabindex="-1"
    >

      <div class="modal-dialog modal-lg">

        <div class="modal-content">


          <!-- MODAL HEADER -->

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


          <!-- FORM -->

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


            <!-- MODAL FOOTER -->

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

        remarks: ''

      }

    }

  },


  mounted() {

    this.getReceipts()

    this.getItems()

    this.getPersonnel()

  },

  computed: {
    receiptRows() {
      const savedItemIds = new Set(this.receipts.map(receipt => receipt.item_id))
      const draftReceipts = this.items
        .filter(item => !savedItemIds.has(item.id))
        .map(item => ({
          id: `draft-${item.id}`,
          item_id: item.id,
          item,
          items: item,
          receipt_number: item.property_number || `ITEM-${String(item.id).slice(0, 8)}`,
          receipt_type: 'PAR',
          issued_to: null,
          date_issued: '',
          remarks: 'Draft receipt - ready to print',
          isDraft: true
        }))

      return [...this.receipts, ...draftReceipts]
    }
  },


  methods: {


    // GET RECEIPTS

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


    // GET ITEMS

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


    // GET PERSONNEL

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


    // OPEN ADD MODAL

    openAddModal() {

      this.editing = false


      this.form = {

        id: null,

        item_id: '',

        receipt_type: 'PAR',

        receipt_number: '',

        issued_to: '',

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


    // EDIT RECEIPT

    createReceiptForItem(item) {
      this.editing = false
      this.form = {
        id: null,
        item_id: item.id,
        receipt_type: 'PAR',
        receipt_number: item.property_number || '',
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

        item_id: receipt.item_id || receipt.items?.id || '',

        receipt_type: receipt.receipt_type || 'PAR',

        receipt_number: receipt.receipt_number || '',

        issued_to:
          receipt.issued_to || '',

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

    if (this.editing) {
      url =
        `http://localhost:5000/api/receipts/${this.form.id}`
      method = 'PUT'
    }

    const response = await fetch(url, {
      method: method,
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        item_id:
          this.form.item_id,

        receipt_type:
          this.form.receipt_type,

        receipt_number:
          this.form.receipt_number,

        issued_to:
          this.form.issued_to || null,

        date_issued:
          this.form.date_issued || null,

        remarks:
          this.form.remarks
      })
    })

    const data =
      await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
        'Failed to save receipt'
      )
    }

    const modal =
      Modal.getOrCreateInstance(
        document.getElementById('receiptModal')
      )

    modal.hide()
    this.cleanupReceiptModal()

    const existingReceipt = this.receipts.find(
      receipt => receipt.id === data.id
    )

    if (this.editing) {
      this.receipts = this.receipts.map(receipt =>
        receipt.id === data.id
          ? { ...existingReceipt, ...data }
          : receipt
      )
    } else {
      this.receipts.unshift(data)
    }

    this.saving = false
    this.getReceipts()

  } catch (error) {
    console.log(error)
    alert(error.name === 'TimeoutError'
      ? 'Saving the receipt took too long. Please check that the backend and Supabase are running.'
      : error.message)

  } finally {
    this.saving = false
  }
},

    cleanupReceiptModal() {
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove()
      })

      document.body.classList.remove('modal-open')
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
    },

    // DELETE RECEIPT

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


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.error ||
            'Failed to delete receipt'
          )

        }


        await this.getReceipts()


      } catch (error) {

        console.log(error)

        alert(error.message)

      }

    },


    // PRINT RECEIPT

    printReceipt(receipt) {
      const item = receipt.items || {}
      const escapeHtml = (value) => String(value ?? '-').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character])
      const formatAmount = (value) => {
        const amount = Number(value)
        return Number.isFinite(amount) ? amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '-'
      }

      const receiptNumber = escapeHtml(receipt.receipt_number)
      const personnelName = escapeHtml(receipt.users?.full_name || '-')
      const description = escapeHtml(item.description)
      const propertyNumber = escapeHtml(item.property_number)
      const serialNumber = escapeHtml(item.serial_number)
      const accountableEmployee = escapeHtml(item.accountable_employee)
      const responsibilityCenter = escapeHtml(item.responsibility_center)
      const dateAcquired = escapeHtml(item.acquisition_date || item.date_of_purchase || '-')
      const quantity = escapeHtml(item.quantity || 1)
      const unit = escapeHtml(item.unit || 'unit')
      const amount = formatAmount(item.cost ?? item.price)
      const total = formatAmount(item.cost ?? item.price)
      const supplier = escapeHtml(item.suppliers?.supplier_name || '-')
      const purpose = escapeHtml(receipt.remarks || 'PROPERTY INVENTORY ACCOUNTABILITY')
      const office = escapeHtml(receipt.offices?.office_name || item.office_name || '________________________')
      const dateIssued = escapeHtml(receipt.date_issued)

      const printWindow = window.open('', '_blank')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PAR - ${receiptNumber}</title>
          <style>
            @page { size: A4; margin: 12mm 14mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #24352a; margin: 0; font-size: 10px; }
            .page { width: 100%; }
            .header { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: center; }
            .seal { width: 54px; height: 54px; border: 2px solid #2f5d3a; border-radius: 50%; display: grid; place-items: center; color: #2f5d3a; font-size: 7px; }
            .header h1 { margin: 0; font-size: 15px; }
            .header p { margin: 2px 0; font-size: 10px; }
            .appendix { position: absolute; right: 14mm; top: 10mm; font-weight: bold; font-size: 9px; }
            .title { margin: 17px 0 12px; text-align: center; font-size: 13px; font-weight: bold; text-decoration: underline; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .meta span { display: inline-block; min-width: 145px; border-bottom: 1px solid #2f5d3a; }
            .meta strong { margin-right: 4px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #8ba393; padding: 5px 4px; vertical-align: middle; }
            th { background: #2f5d3a; color: #fff; font-size: 9px; text-align: center; }
            td { height: 42px; }
            .sn { width: 8%; text-align: center; }
            .qty { width: 7%; text-align: center; }
            .unit { width: 8%; text-align: center; }
            .article { width: 31%; }
            .property { width: 15%; text-align: center; }
            .date { width: 14%; text-align: center; }
            .amount { width: 17%; text-align: right; }
            .total td { height: 28px; font-weight: bold; }
            .total-label { text-align: right; }
            .highlight { background: #f4d35e; color: #24352a; }
            .details { display: grid; grid-template-columns: 1fr 1fr; min-height: 110px; }
            .details > div { padding: 10px 7px; border: 1px solid #8ba393; border-top: 0; }
            .details > div + div { border-left: 0; }
            .details p { margin: 0 0 7px; }
            .label { display: inline-block; min-width: 105px; }
            .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 55px; margin-top: 65px; }
            .signature-box { text-align: center; }
            .signature-line { border-top: 1px solid #2f5d3a; padding-top: 5px; }
            .signature-box small { display: block; margin-top: 3px; }
            .page-number { position: fixed; bottom: 0; right: 0; font-size: 9px; }
          </style>
        </head>
        <body>
          <main class="page">
            <div class="appendix">APPENDIX 71</div>
            <header class="header">
              <div class="seal">NVSU<br>SEAL</div>
              <div>
                <h1>NUEVA VIZCAYA STATE UNIVERSITY</h1>
                <p>Bambang Campus</p>
                <p>Bambang, Nueva Vizcaya</p>
              </div>
            </header>
            <div class="title">PROPERTY ACKNOWLEDGEMENT RECEIPT</div>
            <div class="meta">
              <div><strong>FUND CLUSTER:</strong> <span>TF-2</span></div>
              <div><strong>PAR No:</strong> <span>${receiptNumber}</span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="sn">SN</th><th class="qty">Qty.</th><th class="unit">Unit</th>
                  <th class="article">Article and Description</th><th class="property">Property Number</th>
                  <th class="date">Date Acquired</th><th class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="sn">${serialNumber}</td><td class="qty">${quantity}</td><td class="unit">${unit}</td>
                  <td class="article">${description}</td><td class="property">${propertyNumber}</td>
                  <td class="date">${dateAcquired}</td><td class="amount">${amount}</td>
                </tr>
                <tr class="total"><td colspan="6" class="total-label">Total</td><td class="amount highlight">${total}</td></tr>
              </tbody>
            </table>
            <div class="details">
              <div>
                <p><span class="label">ACCOUNTABLE EMPLOYEE:</span> ${accountableEmployee}</p>
                <p><span class="label">RESPONSIBILITY CENTER:</span> ${responsibilityCenter}</p>
                <p><span class="label">SUPPLIER:</span> ${supplier}</p>
              </div>
              <div>
                <p><strong>PURPOSE:</strong></p>
                <p>${purpose}</p>
                <p><strong>DATE ISSUED:</strong> ${dateIssued}</p>
              </div>
            </div>
            <div class="signature">
              <div class="signature-box"><div class="signature-line"><strong>RECEIVED BY:</strong></div><small>${personnelName}</small><small>Signature over Printed Name</small></div>
              <div class="signature-box"><div class="signature-line"><strong>RECEIVED FROM:</strong></div><small>Administrative Officer V</small><small>Signature over Printed Name</small></div>
            </div>
            <div class="page-number">Page 1 of 1</div>
          </main>
          <script>window.onload = function () { window.print(); };<\/script>
        </body>
        </html>
      `)
      printWindow.document.close()
    },

    printReceiptLegacy(receipt) {

      const itemName =
        receipt.items?.description || '-'


      const personnelName =
        receipt.users?.full_name || '-'


      const receiptType =
        receipt.receipt_type || '-'


      const receiptNumber =
        receipt.receipt_number || '-'


      const dateIssued =
        receipt.date_issued || '-'

      const remarks =
        receipt.remarks || '-'


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

            body {

              font-family: Arial, sans-serif;

              margin: 40px;

              color: #24352a;

            }


            .container {

              max-width: 800px;

              margin: auto;

            }


            .header {

              text-align: center;

              margin-bottom: 30px;

            }


            .header h1 {

              margin: 0;

              font-size: 24px;

            }


            .header h2 {

              margin: 8px 0;

              font-size: 20px;

            }


            .header p {

              margin: 4px 0;

              font-size: 14px;

            }


            .receipt-title {

              text-align: center;

              border: 2px solid #2f5d3a;

              padding: 10px;

              margin-bottom: 25px;

              font-weight: bold;

              font-size: 18px;

            }


            table {

              width: 100%;

              border-collapse: collapse;

              margin-bottom: 25px;

            }


            th,
            td {

              border: 1px solid #8ba393;

              padding: 12px;

              text-align: left;

            }


            th {

              width: 35%;

              background: #e8f0e8;
              color: #2f5d3a;

            }


            .signature {

              margin-top: 70px;

              display: flex;

              justify-content: space-between;

            }


            .signature-box {

              width: 40%;

              text-align: center;

            }


            .line {

              border-top: 1px solid #2f5d3a;

              margin-bottom: 8px;

            }


            .footer {

              margin-top: 40px;

              text-align: center;

              font-size: 12px;

            }


            @media print {

              body {

                margin: 20px;

              }


              .no-print {

                display: none;

              }

            }

          </style>

        </head>


        <body>


          <div class="container">


            <div class="header">

              <h1>
                PROPERTY MANAGEMENT SYSTEM
              </h1>

              <p>
                Property Receipt
              </p>

            </div>


            <div class="receipt-title">

              ${receiptType}

              &nbsp;&nbsp;|

              &nbsp;&nbsp;

              Receipt No.
              ${receiptNumber}

            </div>


            <table>

              <tr>

                <th>
                  Receipt Type
                </th>

                <td>
                  ${receiptType}
                </td>

              </tr>


              <tr>

                <th>
                  Receipt Number
                </th>

                <td>
                  ${receiptNumber}
                </td>

              </tr>


              <tr>

                <th>
                  Item
                </th>

                <td>
                  ${itemName}
                </td>

              </tr>


              <tr>

                <th>
                  Issued To
                </th>

                <td>
                  ${personnelName}
                </td>

              </tr>


              <tr>

                <th>
                  Date Issued
                </th>

                <td>
                  ${dateIssued}
                </td>
              </tr>

              <tr>

                <th>
                  Remarks
                </th>

                <td>
                  ${remarks}
                </td>

              </tr>

            </table>


            <p>

              I acknowledge receipt of the property/item
              described above and agree to take proper
              care of the assigned property.

            </p>


            <div class="signature">


              <div class="signature-box">

                <div class="line"></div>

                <strong>
                  Issued By
                </strong>

              </div>


              <div class="signature-box">

                <div class="line"></div>

                <strong>
                  Received By
                </strong>

              </div>


            </div>


            <div class="footer">

              Printed from Property Management System

            </div>


          </div>


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
.container-fluid > .d-flex h2 {
  color: #2f5d3a;
}

.card {
  border: 1px solid #d7e3d8;
  box-shadow: 0 3px 12px rgba(47, 93, 58, .08);
}

.table thead th {
  background: #2f5d3a;
  color: white;
  border-color: #2f5d3a;
  white-space: nowrap;
}

.table tbody tr:hover {
  background: #f2f7f2;
}

.btn-warning {
  background: #e8c547;
  border-color: #e8c547;
  color: #2f5d3a;
}

.btn-warning:hover,
.btn-warning:focus {
  background: #d8b638;
  border-color: #d8b638;
  color: #24352a;
}

.btn-outline-primary {
  color: #2f5d3a;
  border-color: #2f5d3a;
}

.btn-outline-primary:hover {
  background: #2f5d3a;
  border-color: #2f5d3a;
}

.btn-outline-secondary {
  color: #8a6d1d;
  border-color: #d8b638;
}

.btn-outline-secondary:hover {
  background: #e8c547;
  border-color: #d8b638;
  color: #24352a;
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