<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1>Personnel</h1>
        <p class="text-muted">Manage system personnel and accounts</p>
      </div>

      <!--
      <button
        class="btn btn-warning"
        @click="openAddModal"
      >
        + Add Personnel
      </button>
      -->
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Office</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="personnel.length === 0">
                <td colspan="6" class="text-center text-muted py-4">
                  No personnel found.
                </td>
              </tr>

              <tr
                v-for="person in personnel"
                :key="person.id"
              >
                <td>
                  {{ person.full_name }}
                </td>

                <td>
                  {{ person.email }}
                </td>

                <td>
                  <span class="badge bg-secondary">
                    {{ person.role }}
                  </span>
                </td>

                <td>
                  {{ person.offices?.office_name || '-' }}
                </td>

                <td>
                  {{ formatDate(person.created_at) }}
                </td>

                <td>
                  <!--
                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="editPersonnel(person)"
                  >
                    Edit
                  </button>
                  -->

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deletePersonnel(person.id)"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!--
    <div
      class="modal fade"
      id="personnelModal"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">

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

          <form @submit.prevent="savePersonnel">
            <div class="modal-body">
              <div class="row g-3">

                <div class="col-12">
                  <label class="form-label">
                    Full Name
                  </label>

                  <input
                    type="text"
                    class="form-control"
                    v-model="form.full_name"
                    placeholder="Enter full name"
                    required
                  >
                </div>

                <div class="col-md-6">
                  <label class="form-label">
                    Email
                  </label>

                  <input
                    type="email"
                    class="form-control"
                    v-model="form.email"
                    placeholder="Enter email"
                    required
                  >
                </div>

                <div
                  class="col-md-6"
                  v-if="!editing"
                >
                  <label class="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    class="form-control"
                    v-model="form.password"
                    placeholder="Enter password"
                    minlength="6"
                    required
                  >
                </div>

                <div
                  class="col-md-6"
                  v-if="editing"
                >
                  <label class="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    class="form-control"
                    placeholder="Password cannot be changed here"
                    disabled
                  >
                </div>

                <div class="col-md-6">
                  <label class="form-label">
                    Role
                  </label>

                  <select
                    class="form-select"
                    v-model="form.role"
                    required
                  >
                    <option value="Personnel">
                      Personnel
                    </option>

                    <option value="Teacher">
                      Teacher
                    </option>

                    <option value="Non-Teaching Staff">
                      Non-Teaching Staff
                    </option>
                  </select>
                </div>

                <div class="col-md-6">
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
                {{ saving ? 'Saving...' : (editing ? 'Update Personnel' : 'Create Account') }}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
    -->
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('accessToken')

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: 'Bearer ' + token
    }
  })
}

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
        email: '',
        password: '',
        role: 'Personnel',
        office_id: ''
      }
    }
  },

  mounted() {
    this.getPersonnel()
    this.getOffices()
  },

  methods: {
    async getPersonnel() {
      try {
        const response = await apiRequest(
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getOffices() {
      try {
        const response = await apiRequest(
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        full_name: '',
        email: '',
        password: '',
        role: 'Personnel',
        office_id: ''
      }

      const modalElement =
        document.getElementById('personnelModal')

      const modal =
        Modal.getOrCreateInstance(modalElement)

      modal.show()
    },

    editPersonnel(person) {
      this.editing = true

      this.form = {
        id: person.id,
        full_name: person.full_name,
        email: person.email || '',
        password: '',
        role: person.role,
        office_id: person.office_id || ''
      }

      const modalElement =
        document.getElementById('personnelModal')

      const modal =
        Modal.getOrCreateInstance(modalElement)

      modal.show()
    },

    async savePersonnel() {
      this.saving = true

      try {
        let url =
          'http://localhost:5000/api/personnel'

        let method = 'POST'

        if (this.editing) {
          url =
            'http://localhost:5000/api/personnel/' +
            this.form.id

          method = 'PUT'
        }

        const body = {
          full_name: this.form.full_name,
          email: this.form.email,
          role: this.form.role,
          office_id: this.form.office_id || null
        }

        if (!this.editing) {
          body.password = this.form.password
        }

        const response = await apiRequest(url, {
          method: method,

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify(body)
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Personnel updated successfully'
              : 'Personnel account created successfully'
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

    async deletePersonnel(id) {
      if (
        !confirm(
          'Are you sure you want to delete this personnel?'
        )
      ) {
        return
      }

      try {
        const response = await apiRequest(
          'http://localhost:5000/api/personnel/' + id,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete personnel'
          )
        }

        await this.getPersonnel()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Personnel deleted successfully'
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

    formatDate(date) {
      if (!date) {
        return '-'
      }

      return new Date(date).toLocaleDateString()
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
}
</style>