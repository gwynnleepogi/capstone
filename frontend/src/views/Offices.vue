<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Offices</h1>
        <p class="text-secondary mb-0">
          Manage offices and office records
        </p>
      </div>

      <div class="col-auto">
        <button class="btn btn-warning" @click="openAddForm">
          <i class="bi bi-plus-lg me-1"></i>
          Add Office
        </button>
      </div>
    </div>

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

    <div class="card">
      <div class="card-header bg-white">
        <div class="row g-3 align-items-center">
          <div class="col-12 col-md">
            <strong>Office Records</strong>
          </div>

          <div class="col-12 col-md-4">
            <input
              v-model="search"
              type="text"
              class="form-control"
              placeholder="Search offices..."
            >
          </div>

          <div class="col-12 col-md-auto">
            <select
              v-model="itemsPerPage"
              class="form-select"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card-body border-bottom">
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <label class="form-label mb-1">
              Filter by Office Name
            </label>

            <select
              v-model="officeNameFilter"
              class="form-select"
            >
              <option value="">All Office Names</option>

              <option
                v-for="name in officeNames"
                :key="name"
                :value="name"
              >
                {{ name }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-4">
            <label class="form-label mb-1">
              Filter by Office Code
            </label>

            <select
              v-model="officeCodeFilter"
              class="form-select"
            >
              <option value="">All Office Codes</option>

              <option
                v-for="code in officeCodes"
                :key="code"
                :value="code"
              >
                {{ code }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-4 d-flex align-items-end">
            <button
              class="btn btn-outline-secondary w-100"
              @click="clearFilters"
            >
              <i class="bi bi-arrow-counterclockwise me-1"></i>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th
                class="sortable"
                @click="sortBy('office_name')"
              >
                Office Name
                <i :class="getSortIcon('office_name')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('office_code')"
              >
                Office Code
                <i :class="getSortIcon('office_code')"></i>
              </th>

              <th
                class="sortable text-end"
                @click="sortBy('created_at')"
              >
                Created At
                <i :class="getSortIcon('created_at')"></i>
              </th>

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

            <tr v-else-if="filteredOffices.length === 0">
              <td colspan="4" class="text-center text-secondary py-5">
                No offices found.
              </td>
            </tr>

            <tr
              v-for="office in paginatedOffices"
              :key="office.id"
            >
              <td>
                {{ office.office_name }}
              </td>

              <td>
                {{ office.office_code || '-' }}
              </td>

              <td class="text-end">
                {{ formatDate(office.created_at) }}
              </td>

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

      <div
        v-if="!loading && !error && filteredOffices.length > 0"
        class="card-footer bg-white"
      >
        <div class="row align-items-center g-3">
          <div class="col-12 col-md">
            <small class="text-secondary">
              Showing {{ firstOfficeNumber }} to
              {{ lastOfficeNumber }} of
              {{ filteredOffices.length }} offices
            </small>
          </div>

          <div class="col-12 col-md-auto">
            <nav>
              <ul class="pagination mb-0">
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
                  :class="{
                    disabled: currentPage === totalPages
                  }"
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

      search: '',
      officeNameFilter: '',
      officeCodeFilter: '',

      currentPage: 1,
      itemsPerPage: 10,

      sortColumn: 'office_name',
      sortDirection: 'asc',

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

  computed: {
    officeNames() {
      const names = this.offices
        .map(office => office.office_name)
        .filter(name => name)

      return [...new Set(names)].sort()
    },

    officeCodes() {
      const codes = this.offices
        .map(office => office.office_code)
        .filter(code => code)

      return [...new Set(codes)].sort()
    },

    filteredOffices() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.offices.filter(office => {
        const officeName = (
          office.office_name || ''
        ).toLowerCase()

        const officeCode = (
          office.office_code || ''
        ).toLowerCase()

        const matchesSearch =
          !searchText ||
          officeName.includes(searchText) ||
          officeCode.includes(searchText)

        const matchesName =
          !this.officeNameFilter ||
          office.office_name === this.officeNameFilter

        const matchesCode =
          !this.officeCodeFilter ||
          office.office_code === this.officeCodeFilter

        return (
          matchesSearch &&
          matchesName &&
          matchesCode
        )
      })

      return filtered.sort((firstOffice, secondOffice) => {
        const firstValue = this.getSortValue(
          firstOffice,
          this.sortColumn
        )

        const secondValue = this.getSortValue(
          secondOffice,
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
    },

    totalPages() {
      return Math.max(
        1,
        Math.ceil(
          this.filteredOffices.length / this.itemsPerPage
        )
      )
    },

    paginatedOffices() {
      const start = (
        this.currentPage - 1
      ) * this.itemsPerPage

      const end = start + Number(this.itemsPerPage)

      return this.filteredOffices.slice(start, end)
    },

    firstOfficeNumber() {
      if (this.filteredOffices.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) *
        Number(this.itemsPerPage) +
        1
      )
    },

    lastOfficeNumber() {
      const lastNumber =
        this.currentPage * Number(this.itemsPerPage)

      return Math.min(
        lastNumber,
        this.filteredOffices.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    officeNameFilter() {
      this.currentPage = 1
    },

    officeCodeFilter() {
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
        this.error = ''
      } catch (error) {
        console.log(error)
        this.error = error.message

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      } finally {
        this.loading = false
      }
    },

    getSortValue(office, column) {
      let value = office[column]

      if (!value) {
        return ''
      }

      if (column === 'created_at') {
        return new Date(value).getTime()
      }

      return String(value).toLowerCase()
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
    },

    getSortIcon(column) {
      if (this.sortColumn !== column) {
        return 'bi bi-arrow-down-up ms-1'
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
      this.officeNameFilter = ''
      this.officeCodeFilter = ''
      this.currentPage = 1
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
        this.currentPage = 1

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Office added successfully'
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
          office =>
            office.id === this.editingOffice.id
        )

        if (index !== -1) {
          this.offices[index] = data
        }

        this.editingOffice = null

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Office updated successfully'
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

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Office deleted successfully'
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

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background-color: #244a2e;
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

  .pagination {
    flex-wrap: wrap;
  }
}
</style>