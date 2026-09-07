<template>
  <div class="container-fluid">

    <!-- HEADER -->

    <div class="d-flex justify-content-between align-items-center mb-4">

      <div>
        <h1 class="h3 mb-1">Personnel</h1>
        <p class="text-secondary mb-0">
          Manage personnel records
        </p>
      </div>

      <button
        class="btn btn-warning"
        @click="openAddModal"
      >
        <i class="bi bi-plus-lg me-1"></i>
        Add Personnel
      </button>

    </div>


    <!-- TABLE -->

    <div class="card">

      <div class="card-body">

        <div class="table-responsive">

          <table class="table table-hover align-middle">

            <thead>

              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Office</th>
                <th>Actions</th>
              </tr>

            </thead>


            <tbody>

              <tr
                v-for="person in personnel"
                :key="person.id"
              >

                <td>
                  {{ person.full_name }}
                </td>

                <td>
                  {{ person.username }}
                </td>

                <td>
                  {{ person.email || '-' }}
                </td>

                <td>

                  <span class="badge bg-success">
                    {{ person.role }}
                  </span>

                </td>

                <td>
                  {{ person.offices?.office_name || '-' }}
                </td>

                <td>

                  <button
                    class="btn btn-sm btn-outline-success me-1"
                    @click="editPersonnel(person)"
                  >
                    <i class="bi bi-pencil"></i>
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deletePersonnel(person.id)"
                  >
                    <i class="bi bi-trash"></i>
                    Delete
                  </button>

                </td>

              </tr>


              <tr v-if="personnel.length === 0">

                <td
                  colspan="6"
                  class="text-center text-secondary py-4"
                >
                  No personnel found.
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
      id="personnelModal"
      tabindex="-1"
    >

      <div class="modal-dialog modal-lg">

        <div class="modal-content">


          <!-- MODAL HEADER -->

          <div class="modal-header">

            <h5 class="modal-title">
              {{ editing ? 'Edit Personnel' : 'Add Personnel' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>

          </div>


          <!-- FORM -->

          <form @submit.prevent="savePersonnel">

            <div class="modal-body">


              <!-- FULL NAME -->

              <div class="mb-3">

                <label class="form-label">
                  Full Name
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.full_name"
                  required
                >

              </div>


              <!-- USERNAME -->

              <div class="mb-3">

                <label class="form-label">
                  Username
                </label>

                <input
                  type="text"
                  class="form-control"
                  v-model="form.username"
                  required
                >

              </div>


              <!-- EMAIL -->

              <div class="mb-3">

                <label class="form-label">
                  Email
                </label>

                <input
                  type="email"
                  class="form-control"
                  v-model="form.email"
                >

              </div>


              <!-- ROLE -->

              <div class="mb-3">

                <label class="form-label">
                  Role
                </label>

                <select
                  class="form-select"
                  v-model="form.role"
                  required
                >

                  <option value="Staff">
                    Staff
                  </option>

                  <option value="Admin">
                    Admin
                  </option>

                  <option value="Property Custodian">
                    Property Custodian
                  </option>

                  <option value="Officer">
                    Officer
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
                    No Office
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
                {{ saving ? 'Saving...' : 'Save Personnel' }}
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

  name: 'Personnel',


  data() {

    return {

      personnel: [],

      offices: [],

      editing: false,

      saving: false,


      form: {

        id: null,

        full_name: '',

        username: '',

        email: '',

        role: 'Staff',

        office_id: ''

      }

    }

  },


  mounted() {

    this.getPersonnel()

    this.getOffices()

  },


  methods: {


    // GET PERSONNEL

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


    // GET OFFICES

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


    // OPEN ADD MODAL

    openAddModal() {

      this.editing = false

      this.form = {

        id: null,

        full_name: '',

        username: '',

        email: '',

        role: 'Staff',

        office_id: ''

      }


      const modalElement =
        document.getElementById('personnelModal')


      const modal =
        Modal.getOrCreateInstance(modalElement)


      modal.show()

    },


    // EDIT PERSONNEL

    editPersonnel(person) {

      this.editing = true

      this.form = {

        id: person.id,

        full_name: person.full_name,

        username: person.username,

        email: person.email || '',

        role: person.role,

        office_id: person.office_id || ''

      }


      const modalElement =
        document.getElementById('personnelModal')


      const modal =
        Modal.getOrCreateInstance(modalElement)


      modal.show()

    },


    // SAVE PERSONNEL

    async savePersonnel() {

      this.saving = true

      try {

        let url =
          'http://localhost:5000/api/personnel'

        let method = 'POST'


        if (this.editing) {

          url =
            `http://localhost:5000/api/personnel/${this.form.id}`

          method = 'PUT'

        }


        const response = await fetch(url, {

          method: method,

          headers: {

            'Content-Type': 'application/json'

          },

          body: JSON.stringify({

            full_name: this.form.full_name,

            username: this.form.username,

            email: this.form.email,

            role: this.form.role,

            office_id:
              this.form.office_id || null

          })

        })


        const data = await response.json()


        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to save personnel'
          )

        }


        const modalElement =
          document.getElementById('personnelModal')


        const modal =
          Modal.getOrCreateInstance(modalElement)


        modal.hide()


        await this.getPersonnel()


      } catch (error) {

        console.log(error)

        alert(error.message)

      } finally {

        this.saving = false

      }

    },


    // DELETE PERSONNEL

    async deletePersonnel(id) {

      if (
        !confirm(
          'Are you sure you want to delete this personnel?'
        )
      ) {

        return

      }


      try {

        const response = await fetch(

          `http://localhost:5000/api/personnel/${id}`,

          {

            method: 'DELETE'

          }

        )


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to delete personnel'
          )

        }


        await this.getPersonnel()


      } catch (error) {

        console.log(error)

        alert(error.message)

      }

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