<template>
  <div class="container-fluid">
    <!-- HEADER -->
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Suppliers</h1>
        <p class="text-secondary mb-0">Manage suppliers</p>
      </div>
      <div class="col-auto">
        <button class="btn btn-warning" @click="openAddModal">
          <i class="bi bi-plus-lg me-1"></i>
          Add Supplier
        </button>
      </div>
    </div>

    <!-- SUPPLIERS TABLE -->
    <div class="card">
      <div class="card-header bg-white">
        <strong>Supplier Records</strong>
      </div>

      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Contact Number</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="supplier in suppliers" :key="supplier.id">
              <td>{{ supplier.supplier_name }}</td>
              <td>{{ supplier.contact_person || '-' }}</td>
              <td>{{ supplier.contact_number || '-' }}</td>
              <td>{{ supplier.email || '-' }}</td>
              <td>{{ supplier.address || '-' }}</td>
              <td>
                <button
                  class="btn btn-sm btn-outline-success me-1"
                  @click="editSupplier(supplier)"
                >
                  <i class="bi bi-pencil"></i>
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteSupplier(supplier.id)"
                >
                  <i class="bi bi-trash"></i>
                  Delete
                </button>
              </td>
            </tr>

            <tr v-if="suppliers.length === 0">
              <td colspan="6" class="text-center text-secondary py-5">
                No suppliers found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD / EDIT MODAL -->
    <div class="modal fade" id="supplierModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editing ? 'Edit Supplier' : 'Add Supplier' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveSupplier">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Supplier Name</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="form.supplier_name"
                  required
                >
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Contact Person</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="form.contact_person"
                  >
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label">Contact Number</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="form.contact_number"
                  >
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  class="form-control"
                  v-model="form.email"
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Address</label>
                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.address"
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
                <i class="bi bi-check-lg me-1"></i>
                {{ saving ? 'Saving...' : 'Save Supplier' }}
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
  name: 'Suppliers',

  data() {
    return {
      suppliers: [],
      editing: false,
      saving: false,

      form: {
        id: null,
        supplier_name: '',
        contact_person: '',
        contact_number: '',
        email: '',
        address: ''
      }
    }
  },

  mounted() {
    this.getSuppliers()
  },

  methods: {
    async getSuppliers() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/suppliers'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load suppliers'
          )
        }

        this.suppliers = data
      } catch (error) {
        console.log(error)
        alert(error.message)
      }
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        supplier_name: '',
        contact_person: '',
        contact_number: '',
        email: '',
        address: ''
      }

      const modal = Modal.getOrCreateInstance(
        document.getElementById('supplierModal')
      )

      modal.show()
    },

    editSupplier(supplier) {
      this.editing = true

      this.form = {
        id: supplier.id,
        supplier_name: supplier.supplier_name,
        contact_person: supplier.contact_person || '',
        contact_number: supplier.contact_number || '',
        email: supplier.email || '',
        address: supplier.address || ''
      }

      const modal = Modal.getOrCreateInstance(
        document.getElementById('supplierModal')
      )

      modal.show()
    },

    async saveSupplier() {
      this.saving = true

      try {
        let url = 'http://localhost:5000/api/suppliers'
        let method = 'POST'

        if (this.editing) {
          url =
            `http://localhost:5000/api/suppliers/${this.form.id}`

          method = 'PUT'
        }

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            supplier_name: this.form.supplier_name,
            contact_person: this.form.contact_person,
            contact_number: this.form.contact_number,
            email: this.form.email,
            address: this.form.address
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to save supplier'
          )
        }

        const modal = Modal.getOrCreateInstance(
          document.getElementById('supplierModal')
        )

        modal.hide()

        await this.getSuppliers()
      } catch (error) {
        console.log(error)
        alert(error.message)
      } finally {
        this.saving = false
      }
    },

    async deleteSupplier(id) {
      if (!confirm(
        'Are you sure you want to delete this supplier?'
      )) {
        return
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/suppliers/${id}`,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete supplier'
          )
        }

        await this.getSuppliers()
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