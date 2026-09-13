<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Offices</h1>
        <p class="text-secondary mb-0">Manage offices and office records</p>
      </div>
      <div class="col-auto">
        <button class="btn btn-warning" @click="openAddForm">
          <i class="bi bi-plus-lg me-1"></i>
          Add Office
        </button>
      </div>
    </div>

    <!-- ADD OFFICE FORM -->
    <div v-if="showAddForm" class="card mb-4">
      <div class="card-header bg-white">
        <strong>Add New Office</strong>
      </div>

      <form @submit.prevent="saveOffice">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Office Name</label>
              <input
                v-model="form.office_name"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Office Code</label>
              <input
                v-model="form.office_code"
                type="text"
                class="form-control"
              >
            </div>
          </div>
        </div>

        <div class="card-footer bg-white">
          <button
            type="button"
            class="btn btn-secondary me-2"
            @click="cancelAdd"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-success"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save Office' }}
          </button>
        </div>
      </form>
    </div>

    <!-- EDIT OFFICE FORM -->
    <div v-if="editingOffice" class="card mb-4 border-success">
      <div class="card-header bg-success text-white">
        <strong>Edit Office</strong>
      </div>

      <form @submit.prevent="updateOffice">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Office Name</label>
              <input
                v-model="editForm.office_name"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Office Code</label>
              <input
                v-model="editForm.office_code"
                type="text"
                class="form-control"
              >
            </div>
          </div>
        </div>

        <div class="card-footer bg-white">
          <button
            type="button"
            class="btn btn-secondary me-2"
            @click="cancelEdit"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-success"
            :disabled="updating"
          >
            {{ updating ? 'Updating...' : 'Update Office' }}
          </button>
        </div>
      </form>
    </div>

    <!-- OFFICES TABLE -->
    <div class="card">
      <div class="card-header bg-white">
        <strong>Office Records</strong>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Office Name</th>
              <th>Office Code</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center py-5">
                Loading offices...
              </td>
            </tr>

            <tr v-else-if="error">
              <td colspan="4" class="text-center text-danger py-5">
                {{ error }}
              </td>
            </tr>

            <tr v-else-if="offices.length === 0">
              <td colspan="4" class="text-center text-secondary py-5">
                No offices found.
              </td>
            </tr>

            <tr v-for="office in offices" :key="office.id">
              <td>{{ office.office_name }}</td>
              <td>{{ office.office_code || '-' }}</td>
              <td>{{ formatDate(office.created_at) }}</td>
              <td>
                <button
                  class="btn btn-sm btn-outline-success me-1"
                  @click="startEdit(office)"
                >
                  <i class="bi bi-pencil"></i>
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteOffice(office)"
                >
                  <i class="bi bi-trash"></i>
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TOAST -->
    <div
      v-if="toast.show"
      class="toast-container position-fixed bottom-0 end-0 p-3"
    >
      <div
        class="toast show"
        :class="'toast-' + toast.type"
        role="alert"
      >
        <div class="toast-body">
          <i
            v-if="toast.type === 'success'"
            class="bi bi-check-circle me-2"
          ></i>
          <i
            v-else
            class="bi bi-exclamation-circle me-2"
          ></i>
          {{ toast.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Offices',

  data() {
    return {
      offices: [],
      loading: true,
      saving: false,
      updating: false,
      error: '',
      showAddForm: false,
      editingOffice: null,

      toast: {
        show: false,
        message: '',
        type: 'success'
      },

      form: {
        office_name: '',
        office_code: ''
      },

      editForm: {
        office_name: '',
        office_code: ''
      }
    }
  },

  async mounted() {
    await this.getOffices()
  },

  methods: {
    async getOffices() {
      this.loading = true

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
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    openAddForm() {
      this.showAddForm = true
      this.editingOffice = null

      this.form = {
        office_name: '',
        office_code: ''
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    },

    startEdit(office) {
      this.editingOffice = office
      this.showAddForm = false

      this.editForm = {
        office_name: office.office_name || '',
        office_code: office.office_code || ''
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    },

    async saveOffice() {
      this.saving = true

      try {
        const response = await fetch(
          'http://localhost:5000/api/offices',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.form)
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to save office'
          )
        }

        this.offices.unshift(data)
        this.showAddForm = false
        this.resetForm()

        this.showToast(
          'Office added successfully.',
          'success'
        )
      } catch (error) {
        console.log(error)

        this.showToast(
          error.message,
          'danger'
        )
      } finally {
        this.saving = false
      }
    },

    async updateOffice() {
      if (!this.editingOffice) {
        return
      }

      this.updating = true

      try {
        const response = await fetch(
          'http://localhost:5000/api/offices/' +
          this.editingOffice.id,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.editForm)
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to update office'
          )
        }

        const index = this.offices.findIndex(
          office => office.id === this.editingOffice.id
        )

        if (index !== -1) {
          this.offices[index] = data
        }

        this.editingOffice = null

        this.showToast(
          'Office updated successfully.',
          'success'
        )
      } catch (error) {
        console.log(error)

        this.showToast(
          error.message,
          'danger'
        )
      } finally {
        this.updating = false
      }
    },

    async deleteOffice(office) {
      const confirmed = window.confirm(
        'Delete ' +
        (office.office_name || 'this office') +
        '?'
      )

      if (!confirmed) {
        return
      }

      try {
        const response = await fetch(
          'http://localhost:5000/api/offices/' +
          office.id,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete office'
          )
        }

        this.offices = this.offices.filter(
          currentOffice =>
            currentOffice.id !== office.id
        )

        if (
          this.editingOffice &&
          this.editingOffice.id === office.id
        ) {
          this.editingOffice = null
        }

        this.showToast(
          'Office deleted successfully.',
          'success'
        )
      } catch (error) {
        console.log(error)

        this.showToast(
          error.message,
          'danger'
        )
      }
    },

    cancelAdd() {
      this.showAddForm = false
      this.resetForm()
    },

    cancelEdit() {
      this.editingOffice = null
    },

    resetForm() {
      this.form = {
        office_name: '',
        office_code: ''
      }
    },

    formatDate(date) {
      if (!date) {
        return '-'
      }

      return new Date(date).toLocaleDateString()
    },

    showToast(message, type) {
      this.toast.message = message
      this.toast.type = type
      this.toast.show = true

      setTimeout(() => {
        this.toast.show = false
      }, 3000)
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
}

.toast-container {
  z-index: 9999;
}

.toast {
  min-width: 300px;
  border: none;
  border-radius: 8px;
}

.toast-success {
  background-color: #2F5D3A;
  color: white;
}

.toast-danger {
  background-color: #dc3545;
  color: white;
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