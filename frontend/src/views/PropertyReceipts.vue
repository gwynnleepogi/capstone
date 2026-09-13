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
                    class="btn btn-sm btn-outline-primary me-2"
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
                    class="btn btn-sm btn-outline-secondary"
                    @click="printReceipt(receipt)"
                    title="Print Receipt"
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

    editReceipt(receipt) {

      this.editing = true


      this.form = {

        id: receipt.id,

        item_id: receipt.item_id,

        receipt_type: receipt.receipt_type,

        receipt_number: receipt.receipt_number,

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


    // SAVE RECEIPT

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


        await this.getReceipts()


      } catch (error) {

        console.log(error)

        alert(error.message)

      } finally {

        this.saving = false

      }

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

              color: #000;

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

              border: 2px solid #000;

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

              border: 1px solid #000;

              padding: 12px;

              text-align: left;

            }


            th {

              width: 35%;

              background: #f2f2f2;

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

              border-top: 1px solid #000;

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