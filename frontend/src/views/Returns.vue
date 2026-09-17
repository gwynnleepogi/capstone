<template>
  <div>

    <!-- HEADER -->

    <div class="d-flex justify-content-between align-items-center mb-4">

      <div>
        <h2>Returns</h2>
        <p class="text-muted">Manage returned property items</p>
      </div>

      <button
        class="btn btn-warning"
        @click="openAddModal"
      >
        <i class="bi bi-arrow-return-left me-1"></i>
        Add Return
      </button>

    </div>


    <!-- TABLE -->

    <div class="card">

      <div class="card-body">

        <div class="table-responsive">

          <table class="table table-hover align-middle">

            <thead>

              <tr>

                <th>Item</th>
                <th>Returned By</th>
                <th>Office</th>
                <th>Return Date</th>
                <th>Condition</th>
                <th>Reason</th>
                <th>Actions</th>

              </tr>

            </thead>


            <tbody>

              <tr
                v-for="itemReturn in returns"
                :key="itemReturn.id"
              >

                <td>
                  {{ itemReturn.items?.description || '-' }}
                </td>


                <td>
                  {{
                    itemReturn.personnel?.full_name ||
                    itemReturn.users?.full_name ||
                    '-'
                  }}
                </td>


                <td>
                  {{ itemReturn.offices?.office_name || '-' }}
                </td>


                <td>
                  {{ itemReturn.return_date || '-' }}
                </td>


                <td>

                  <span
                    class="badge"
                    :class="
                      itemReturn.condition_after_return === 'Serviceable'
                        ? 'bg-success'
                        : 'bg-danger'
                    "
                  >
                    {{ itemReturn.condition_after_return }}
                  </span>

                </td>


                <td>
                  {{ itemReturn.return_reason || '-' }}
                </td>


                <td>

                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="editReturn(itemReturn)"
                    title="Edit"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>


                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteReturn(itemReturn.id)"
                    title="Delete"
                  >
                    <i class="bi bi-trash"></i>
                  </button>

                </td>

              </tr>


              <tr v-if="returns.length === 0">

                <td
                  colspan="7"
                  class="text-center text-muted py-4"
                >
                  No returns found.
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
      id="returnModal"
      tabindex="-1"
    >

      <div class="modal-dialog modal-lg">

        <div class="modal-content">


          <!-- MODAL HEADER -->

          <div class="modal-header">

            <h5 class="modal-title">

              {{ editing ? 'Edit Return' : 'Add Return' }}

            </h5>


            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>

          </div>


          <!-- FORM -->

          <form @submit.prevent="saveReturn">

            <div class="modal-body">


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


              <!-- RETURNED BY -->

              <div class="mb-3">

                <label class="form-label">
                  Returned By
                </label>


                <select
                  class="form-select"
                  v-model="form.returned_by"
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


              <!-- OFFICE -->

              <div class="mb-3">

                <label class="form-label">
                  Office
                </label>


                <select
                  class="form-select"
                  v-model="form.office_id"
                >

                  <option value="">
                    Select Office
                  </option>


                  <option
                    v-for="office in offices"
                    :key="office.id"
                    :value="office.id"
                  >

                    {{ office.office_name }}

                  </option>

                </select>

              </div>


              <!-- RETURN DATE -->

              <div class="mb-3">

                <label class="form-label">
                  Return Date
                </label>


                <input
                  type="date"
                  class="form-control"
                  v-model="form.return_date"
                >

              </div>


              <!-- CONDITION -->

              <div class="mb-3">

                <label class="form-label">
                  Condition After Return
                </label>


                <select
                  class="form-select"
                  v-model="form.condition_after_return"
                  required
                >

                  <option value="Serviceable">
                    Serviceable
                  </option>


                  <option value="Unserviceable">
                    Unserviceable
                  </option>

                </select>

              </div>


              <!-- RETURN REASON -->

              <div class="mb-3">

                <label class="form-label">
                  Return Reason
                </label>


                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.return_reason"
                ></textarea>

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

                <i
                  v-if="!saving"
                  class="bi bi-check-lg me-1"
                ></i>

                {{ saving ? 'Saving...' : 'Save Return' }}

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

  name: 'Returns',

  data() {

    return {

      returns: [],

      items: [],

      personnel: [],

      offices: [],

      editing: false,

      saving: false,

      form: {

        id: null,

        item_id: '',

        returned_by: '',

        office_id: '',

        return_date: '',

        condition_after_return: 'Serviceable',

        return_reason: '',

        remarks: ''

      }

    }

  },


  mounted() {

    this.getReturns()

    this.getItems()

    this.getPersonnel()

    this.getOffices()

  },


  methods: {

    async getReturns() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/returns'
        )

        const data = await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to load returns'
          )

        }

        this.returns = data

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


    async getOffices() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/offices'
        )

        const data = await response.json()

        if (response.ok) {

          this.offices = data

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

        returned_by: '',

        office_id: '',

        return_date:
          new Date().toISOString().split('T')[0],

        condition_after_return:
          'Serviceable',

        return_reason: '',

        remarks: ''

      }

      const modalElement =
        document.getElementById('returnModal')

      const modal =
        Modal.getOrCreateInstance(modalElement)

      modal.show()

    },


    editReturn(itemReturn) {

      this.editing = true

      this.form = {

        id: itemReturn.id,

        item_id:
          itemReturn.item_id,

        returned_by:
          itemReturn.returned_by || '',

        office_id:
          itemReturn.office_id || '',

        return_date:
          itemReturn.return_date || '',

        condition_after_return:
          itemReturn.condition_after_return,

        return_reason:
          itemReturn.return_reason || '',

        remarks:
          itemReturn.remarks || ''

      }

      const modalElement =
        document.getElementById('returnModal')

      const modal =
        Modal.getOrCreateInstance(modalElement)

      modal.show()

    },


    async saveReturn() {

      this.saving = true

      try {

        let url =
          'http://localhost:5000/api/returns'

        let method = 'POST'

        if (this.editing) {

          url =
            `http://localhost:5000/api/returns/${this.form.id}`

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

            returned_by:
              this.form.returned_by || null,

            office_id:
              this.form.office_id || null,

            return_date:
              this.form.return_date || null,

            condition_after_return:
              this.form.condition_after_return,

            return_reason:
              this.form.return_reason,

            remarks:
              this.form.remarks

          })

        })

        const data =
          await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to save return'
          )

        }

        const modalElement =
          document.getElementById('returnModal')

        const modal =
          Modal.getOrCreateInstance(modalElement)

        modal.hide()

        await this.getReturns()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Return updated successfully'
              : 'Return added successfully'
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


    async deleteReturn(id) {

      if (
        !confirm(
          'Are you sure you want to delete this return?'
        )
      ) {

        return

      }

      try {

        const response = await fetch(

          `http://localhost:5000/api/returns/${id}`,

          {

            method: 'DELETE'

          }

        )

        const data =
          await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to delete return'
          )

        }

        await this.getReturns()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Return deleted successfully'
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