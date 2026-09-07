<template>
  <div class="container-fluid">

    <!-- HEADER -->
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Item Requests</h1>
        <p class="text-secondary mb-0">Manage item requests</p>
      </div>

      <div class="col-auto">
        <button
          class="btn btn-warning"
          @click="openAddModal"
        >
          <i class="bi bi-plus-lg me-1"></i>
          Add Request
        </button>
      </div>
    </div>


    <!-- TABLE -->
    <div class="card">

      <div class="card-header bg-white">
        <strong>Item Requests</strong>
      </div>

      <div class="table-responsive">

        <table class="table table-hover mb-0">

          <thead>
            <tr>
              <th>Request Number</th>
              <th>Item Description</th>
              <th>Quantity</th>
              <th>Requested By</th>
              <th>Office</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            <tr
              v-for="request in requests"
              :key="request.id"
            >

              <td>
                {{ request.request_number || '-' }}
              </td>

              <td>
                {{ request.item_description || '-' }}
              </td>

              <td>
                {{ request.quantity || 0 }}
              </td>

              <td>
                {{ request.personnel?.full_name || '-' }}
              </td>

              <td>
                {{ request.offices?.office_name || '-' }}
              </td>

              <td>
                <span
                  class="badge"
                  :class="getStatusClass(request.status)"
                >
                  {{ request.status || '-' }}
                </span>
              </td>

              <td>

                <button
                  class="btn btn-sm btn-outline-success me-1"
                  @click="editRequest(request)"
                >
                  <i class="bi bi-pencil"></i>
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteRequest(request.id)"
                >
                  <i class="bi bi-trash"></i>
                  Delete
                </button>

              </td>

            </tr>


            <tr v-if="requests.length === 0">

              <td
                colspan="7"
                class="text-center text-secondary py-5"
              >
                No item requests found.
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>


    <!-- ADD / EDIT MODAL -->

    <div
      class="modal fade"
      id="requestModal"
      tabindex="-1"
    >

      <div class="modal-dialog modal-lg">

        <div class="modal-content">

          <div class="modal-header">

            <h5 class="modal-title">
              {{ editing ? 'Edit Request' : 'Add Request' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>

          </div>


          <form @submit.prevent="saveRequest">

            <div class="modal-body">

              <!-- REQUEST NUMBER -->
              <div class="mb-3">

                <label class="form-label">
                  Request Number
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.request_number"
                  required
                >

              </div>


              <!-- ITEM DESCRIPTION -->
              <div class="mb-3">

                <label class="form-label">
                  Item Description
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.item_description"
                  required
                >

              </div>


              <!-- QUANTITY -->
              <div class="mb-3">

                <label class="form-label">
                  Quantity
                </label>

                <input
                  type="number"
                  class="form-control"
                  v-model="form.quantity"
                  min="1"
                  required
                >

              </div>


              <!-- REQUESTED BY -->
              <div class="mb-3">

                <label class="form-label">
                  Requested By
                </label>

                <select
                  class="form-select"
                  v-model="form.requested_by"
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


              <!-- PURPOSE -->
              <div class="mb-3">

                <label class="form-label">
                  Purpose
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.purpose"
                ></textarea>

              </div>


              <!-- STATUS -->
              <div class="mb-3">

                <label class="form-label">
                  Status
                </label>

                <select
                  class="form-select"
                  v-model="form.status"
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Approved">
                    Approved
                  </option>

                  <option value="Procurement">
                    Procurement
                  </option>

                  <option value="Ordered">
                    Ordered
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Rejected">
                    Rejected
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>

                </select>

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
                {{ saving ? 'Saving...' : 'Save Request' }}
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

  name: 'ItemRequests',

  data() {

    return {

      requests: [],

      personnel: [],

      offices: [],

      editing: false,

      saving: false,

      form: {
        id: null,
        request_number: '',
        requested_by: '',
        office_id: '',
        item_description: '',
        quantity: 1,
        purpose: '',
        status: 'Pending'
      }

    }

  },


  mounted() {

    this.getRequests()
    this.getPersonnel()
    this.getOffices()

  },


  methods: {

    async getRequests() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/item-requests'
        )

        const data = await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to load requests'
          )

        }

        this.requests = data

      } catch (error) {

        console.log(error)

        alert(error.message)

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

        alert(error.message)

      }

    },


    async getOffices() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/offices'
        )

        const data = await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to load offices'
          )

        }

        this.offices = data

      } catch (error) {

        console.log(error)

      }

    },


    openAddModal() {

      this.editing = false

      this.form = {
        id: null,
        request_number: '',
        requested_by: '',
        office_id: '',
        item_description: '',
        quantity: 1,
        purpose: '',
        status: 'Pending'
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('requestModal')
        )

      modal.show()

    },


    editRequest(request) {

      this.editing = true

      this.form = {
        id: request.id,
        request_number: request.request_number || '',
        requested_by: request.requested_by || '',
        office_id: request.office_id || '',
        item_description: request.item_description || '',
        quantity: request.quantity || 1,
        purpose: request.purpose || '',
        status: request.status || 'Pending'
      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('requestModal')
        )

      modal.show()

    },


    async saveRequest() {

      this.saving = true

      try {

        let url =
          'http://localhost:5000/api/item-requests'

        let method = 'POST'

        if (this.editing) {

          url =
            `http://localhost:5000/api/item-requests/${this.form.id}`

          method = 'PUT'

        }

        const response = await fetch(url, {

          method: method,

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({

            request_number:
              this.form.request_number,

            requested_by:
              this.form.requested_by || null,

            office_id:
              this.form.office_id || null,

            item_description:
              this.form.item_description,

            quantity:
              Number(this.form.quantity),

            purpose:
              this.form.purpose,

            status:
              this.form.status

          })

        })


        const data = await response.json()


        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to save request'
          )

        }


        const modal =
          Modal.getOrCreateInstance(
            document.getElementById('requestModal')
          )

        modal.hide()

        await this.getRequests()

      } catch (error) {

        console.log(error)

        alert(error.message)

      } finally {

        this.saving = false

      }

    },


    async deleteRequest(id) {

      if (
        !confirm(
          'Are you sure you want to delete this request?'
        )
      ) {
        return
      }


      try {

        const response = await fetch(
          `http://localhost:5000/api/item-requests/${id}`,
          {
            method: 'DELETE'
          }
        )


        const data = await response.json()


        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to delete request'
          )

        }


        await this.getRequests()

      } catch (error) {

        console.log(error)

        alert(error.message)

      }

    },


    getStatusClass(status) {

      if (status === 'Pending') {
        return 'bg-warning text-dark'
      }

      if (status === 'Approved') {
        return 'bg-success'
      }

      if (status === 'Procurement') {
        return 'bg-primary'
      }

      if (status === 'Ordered') {
        return 'bg-info'
      }

      if (status === 'Delivered') {
        return 'bg-success'
      }

      if (status === 'Rejected') {
        return 'bg-danger'
      }

      if (status === 'Cancelled') {
        return 'bg-secondary'
      }

      return 'bg-secondary'

    }

  }

}

</script>


<style scoped>

h1 {
  color: #2F5D3A;
}

.btn-warning {
  background-color: #E8C547;
  border-color: #E8C547;
  color: #2F5D3A;
}

.btn-warning:hover {
  background-color: #d8b638;
  border-color: #d8b638;
}

.table thead th {
  background-color: #2F5D3A;
  color: white;
  white-space: nowrap;
}

.table td {
  white-space: nowrap;
  vertical-align: middle;
}

</style>