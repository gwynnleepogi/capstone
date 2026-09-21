<template v-if="false">
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

    <!-- SEARCH AND FILTERS -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <label class="form-label">Search</label>
            <input
              type="text"
              class="form-control"
              v-model="search"
              placeholder="Search supplier name, contact person, email..."
            >
          </div>

          <div class="col-md-3">
            <label class="form-label">Items per page</label>
            <select
              class="form-select"
              v-model.number="itemsPerPage"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>

          <div class="col-md-3">
            <button
              class="btn btn-secondary w-100"
              @click="clearFilters"
            >
              <i class="bi bi-arrow-counterclockwise me-1"></i>
              Clear Filters
            </button>
          </div>
        </div>
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
              <th
                class="sortable"
                @click="sortBy('supplier_name')"
              >
                Supplier Name
                <i :class="getSortIcon('supplier_name')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('contact_person')"
              >
                Contact Person
                <i :class="getSortIcon('contact_person')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('contact_number')"
              >
                Contact Number
                <i :class="getSortIcon('contact_number')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('email')"
              >
                Email
                <i :class="getSortIcon('email')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('address')"
              >
                Address
                <i :class="getSortIcon('address')"></i>
              </th>

              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="supplier in paginatedSuppliers"
              :key="supplier.id"
            >
              <td>{{ supplier.supplier_name }}</td>
              <td>{{ supplier.contact_person || '-' }}</td>
              <td>{{ supplier.contact_number || '-' }}</td>
              <td>{{ supplier.email || '-' }}</td>
              <td>{{ supplier.address || '-' }}</td>

              <td>
                <button
                  class="btn btn-sm btn-outline-success me-1"
                  @click="editSupplier(supplier)"
                  title="Edit"
                >
                  <i class="bi bi-pencil"></i>
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteSupplier(supplier.id)"
                  title="Delete"
                >
                  <i class="bi bi-trash"></i>
                  Delete
                </button>
              </td>
            </tr>

            <tr v-if="paginatedSuppliers.length === 0">
              <td
                colspan="6"
                class="text-center text-secondary py-5"
              >
                No suppliers found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      <div
        class="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center gap-3"
      >
        <div class="text-secondary small">
          Showing
          <strong>{{ firstSupplierNumber }}</strong>
          to
          <strong>{{ lastSupplierNumber }}</strong>
          of
          <strong>{{ filteredSuppliers.length }}</strong>
          suppliers
        </div>

        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li
              class="page-item"
              :class="{ disabled: currentPage === 1 }"
            >
              <button
                class="page-link"
                @click="previousPage"
                :disabled="currentPage === 1"
              >
                Previous
              </button>
            </li>

            <li
              v-for="page in totalPages"
              :key="page"
              class="page-item"
              :class="{ active: currentPage === page }"
            >
              <button
                class="page-link"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </li>

            <li
              class="page-item"
              :class="{ disabled: currentPage === totalPages }"
            >
              <button
                class="page-link"
                @click="nextPage"
                :disabled="currentPage === totalPages"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- ADD / EDIT MODAL -->
    <div
      class="modal fade"
      id="supplierModal"
      tabindex="-1"
    >
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

      search: '',
      currentPage: 1,
      itemsPerPage: 10,

      sortColumn: 'supplier_name',
      sortDirection: 'asc',

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

  computed: {
    filteredSuppliers() {
      let result = [...this.suppliers]

      if (this.search.trim() !== '') {
        const searchText = this.search.toLowerCase().trim()

        result = result.filter(supplier => {
          const supplierName = (
            supplier.supplier_name || ''
          ).toLowerCase()

          const contactPerson = (
            supplier.contact_person || ''
          ).toLowerCase()

          const contactNumber = (
            supplier.contact_number || ''
          ).toLowerCase()

          const email = (
            supplier.email || ''
          ).toLowerCase()

          const address = (
            supplier.address || ''
          ).toLowerCase()

          return (
            supplierName.includes(searchText) ||
            contactPerson.includes(searchText) ||
            contactNumber.includes(searchText) ||
            email.includes(searchText) ||
            address.includes(searchText)
          )
        })
      }

      result.sort((firstSupplier, secondSupplier) => {
        const firstValue = this.getSortValue(
          firstSupplier,
          this.sortColumn
        )

        const secondValue = this.getSortValue(
          secondSupplier,
          this.sortColumn
        )

        if (firstValue < secondValue) {
          return this.sortDirection === 'asc' ? -1 : 1
        }

        if (firstValue > secondValue) {
          return this.sortDirection === 'asc' ? 1 : -1
        }

        return 0
      })

      return result
    },

    totalPages() {
      return Math.max(
        1,
        Math.ceil(
          this.filteredSuppliers.length / this.itemsPerPage
        )
      )
    },

    paginatedSuppliers() {
      const start = (
        this.currentPage - 1
      ) * this.itemsPerPage

      const end = start + this.itemsPerPage

      return this.filteredSuppliers.slice(start, end)
    },

    firstSupplierNumber() {
      if (this.filteredSuppliers.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) * this.itemsPerPage
      ) + 1
    },

    lastSupplierNumber() {
      const lastNumber = (
        this.currentPage * this.itemsPerPage
      )

      return Math.min(
        lastNumber,
        this.filteredSuppliers.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    itemsPerPage() {
      this.currentPage = 1
    },

    totalPages(newTotalPages) {
      if (this.currentPage > newTotalPages) {
        this.currentPage = newTotalPages
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    getSortValue(supplier, column) {
      return String(
        supplier[column] || ''
      ).toLowerCase()
    },

    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection =
          this.sortDirection === 'asc'
            ? 'desc'
            : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }

      this.currentPage = 1
    },

    getSortIcon(column) {
      if (this.sortColumn !== column) {
        return 'bi bi-arrow-down-up text-secondary ms-1'
      }

      if (this.sortDirection === 'asc') {
        return 'bi bi-arrow-up ms-1'
      }

      return 'bi bi-arrow-down ms-1'
    },

    goToPage(page) {
      if (
        page >= 1 &&
        page <= this.totalPages
      ) {
        this.currentPage = page
      }
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },

    clearFilters() {
      this.search = ''
      this.currentPage = 1
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Supplier updated successfully'
              : 'Supplier added successfully'
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

    async deleteSupplier(id) {
      if (
        !confirm(
          'Are you sure you want to delete this supplier?'
        )
      ) {
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Supplier deleted successfully'
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

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background-color: #244b2f !important;
}

.page-link {
  color: #2F5D3A;
}

.page-item.active .page-link {
  background-color: #2F5D3A;
  border-color: #2F5D3A;
  color: white;
}

.page-link:focus {
  box-shadow: none;
}
</style>