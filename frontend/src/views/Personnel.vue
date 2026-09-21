<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1>Personnel</h1>
        <p class="text-muted">
          Manage system personnel and accounts
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-header bg-white">
        <div class="row g-3 align-items-center">
          <div class="col-12 col-md">
            <strong>Personnel Records</strong>
          </div>

          <div class="col-12 col-md-4">
            <input
              v-model="search"
              type="text"
              class="form-control"
              placeholder="Search personnel..."
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
              Filter by Role
            </label>

            <select
              v-model="roleFilter"
              class="form-select"
            >
              <option value="">All Roles</option>

              <option
                v-for="role in roles"
                :key="role"
                :value="role"
              >
                {{ role }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-4">
            <label class="form-label mb-1">
              Filter by Office
            </label>

            <select
              v-model="officeFilter"
              class="form-select"
            >
              <option value="">All Offices</option>

              <option
                v-for="office in officeNames"
                :key="office"
                :value="office"
              >
                {{ office }}
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
                @click="sortBy('full_name')"
              >
                Full Name
                <i :class="getSortIcon('full_name')"></i>
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
                @click="sortBy('role')"
              >
                Role
                <i :class="getSortIcon('role')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('office')"
              >
                Office
                <i :class="getSortIcon('office')"></i>
              </th>

              <th
                class="sortable text-end"
                @click="sortBy('created_at')"
              >
                Date Created
                <i :class="getSortIcon('created_at')"></i>
              </th>

              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center py-5">
                Loading personnel...
              </td>
            </tr>

            <tr v-else-if="error">
              <td colspan="6" class="text-center text-danger py-5">
                {{ error }}
              </td>
            </tr>

            <tr v-else-if="filteredPersonnel.length === 0">
              <td colspan="6" class="text-center text-muted py-5">
                No personnel found.
              </td>
            </tr>

            <tr
              v-for="person in paginatedPersonnel"
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

              <td class="text-end">
                {{ formatDate(person.created_at) }}
              </td>

              <td>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deletePersonnel(person.id)"
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
        v-if="
          !loading &&
          !error &&
          filteredPersonnel.length > 0
        "
        class="card-footer bg-white"
      >
        <div class="row align-items-center g-3">
          <div class="col-12 col-md">
            <small class="text-secondary">
              Showing {{ firstPersonnelNumber }} to
              {{ lastPersonnelNumber }} of
              {{ filteredPersonnel.length }} personnel
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
      loading: true,
      error: '',

      search: '',
      roleFilter: '',
      officeFilter: '',

      currentPage: 1,
      itemsPerPage: 10,

      sortColumn: 'full_name',
      sortDirection: 'asc'
    }
  },

  computed: {
    roles() {
      const roleList = this.personnel
        .map(person => person.role)
        .filter(role => role)

      return [...new Set(roleList)].sort()
    },

    officeNames() {
      const officeList = this.personnel
        .map(person => person.offices?.office_name)
        .filter(office => office)

      return [...new Set(officeList)].sort()
    },

    filteredPersonnel() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.personnel.filter(person => {
        const fullName = (
          person.full_name || ''
        ).toLowerCase()

        const email = (
          person.email || ''
        ).toLowerCase()

        const role = (
          person.role || ''
        ).toLowerCase()

        const office = (
          person.offices?.office_name || ''
        ).toLowerCase()

        const matchesSearch =
          !searchText ||
          fullName.includes(searchText) ||
          email.includes(searchText) ||
          role.includes(searchText) ||
          office.includes(searchText)

        const matchesRole =
          !this.roleFilter ||
          person.role === this.roleFilter

        const matchesOffice =
          !this.officeFilter ||
          person.offices?.office_name === this.officeFilter

        return (
          matchesSearch &&
          matchesRole &&
          matchesOffice
        )
      })

      return filtered.sort((firstPerson, secondPerson) => {
        const firstValue = this.getSortValue(
          firstPerson,
          this.sortColumn
        )

        const secondValue = this.getSortValue(
          secondPerson,
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
          this.filteredPersonnel.length /
          Number(this.itemsPerPage)
        )
      )
    },

    paginatedPersonnel() {
      const start =
        (this.currentPage - 1) *
        Number(this.itemsPerPage)

      const end =
        start + Number(this.itemsPerPage)

      return this.filteredPersonnel.slice(start, end)
    },

    firstPersonnelNumber() {
      if (this.filteredPersonnel.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) *
        Number(this.itemsPerPage) +
        1
      )
    },

    lastPersonnelNumber() {
      const lastNumber =
        this.currentPage *
        Number(this.itemsPerPage)

      return Math.min(
        lastNumber,
        this.filteredPersonnel.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    roleFilter() {
      this.currentPage = 1
    },

    officeFilter() {
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
    await Promise.all([
      this.getPersonnel(),
      this.getOffices()
    ])
  },

  methods: {
    async getPersonnel() {
      this.loading = true

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

    getSortValue(person, column) {
      let value = person[column]

      if (column === 'office') {
        value = person.offices?.office_name || ''
      }

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
      this.roleFilter = ''
      this.officeFilter = ''
      this.currentPage = 1
    },

    async deletePersonnel(id) {
      if (
        !window.confirm(
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