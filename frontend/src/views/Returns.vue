<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Returns</h2>
        <p class="text-muted">Manage returned property items</p>
      </div>

      <button class="btn btn-warning" @click="openAddModal">
        <i class="bi bi-arrow-return-left me-1"></i>
        Add Return
      </button>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Search</label>

            <input
              type="text"
              class="form-control"
              v-model="search"
              placeholder="Search item, returned by, office..."
            >
          </div>

          <div class="col-md-3">
            <label class="form-label">Condition</label>

            <select
              class="form-select"
              v-model="conditionFilter"
            >
              <option value="">All Conditions</option>
              <option value="Serviceable">Serviceable</option>
              <option value="Unserviceable">Unserviceable</option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label">Office</label>

            <select
              class="form-select"
              v-model="officeFilter"
            >
              <option value="">All Offices</option>

              <option
                v-for="office in offices"
                :key="office.id"
                :value="office.office_name"
              >
                {{ office.office_name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th
                  class="sortable"
                  @click="sortBy('item')"
                >
                  Item
                  <i :class="getSortIcon('item')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('returned_by')"
                >
                  Returned By
                  <i :class="getSortIcon('returned_by')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('office')"
                >
                  Office
                  <i :class="getSortIcon('office')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('return_date')"
                >
                  Return Date
                  <i :class="getSortIcon('return_date')"></i>
                </th>

                <th
                  class="sortable"
                  @click="sortBy('condition')"
                >
                  Condition
                  <i :class="getSortIcon('condition')"></i>
                </th>

                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="itemReturn in paginatedReturns"
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
                    {{ itemReturn.condition_after_return || '-' }}
                  </span>
                </td>

                <td>
                  {{ itemReturn.return_reason || '-' }}
                </td>

                <td>
                  <button
                    class="btn btn-sm btn-outline-success me-2"
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

              <tr v-if="paginatedReturns.length === 0">
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

        <div
          v-if="filteredReturns.length > 0"
          class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3"
        >
          <div class="d-flex align-items-center gap-2">
            <label class="mb-0 text-muted small">
              Show
            </label>

            <select
              class="form-select form-select-sm"
              v-model.number="itemsPerPage"
              style="width: 75px"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>

            <span class="text-muted small">
              entries
            </span>
          </div>

          <div class="text-muted small">
            Showing {{ firstReturnNumber }} to {{ lastReturnNumber }}
            of {{ filteredReturns.length }} returns
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
    </div>

    <div
      class="modal fade"
      id="returnModal"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
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

          <form @submit.prevent="saveReturn">
            <div class="modal-body">
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

      search: '',
      conditionFilter: '',
      officeFilter: '',

      currentPage: 1,
      itemsPerPage: 10,

      sortColumn: 'return_date',
      sortDirection: 'desc',

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

  computed: {
    filteredReturns() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.returns.filter(itemReturn => {
        const itemName = String(
          itemReturn.items?.description || ''
        ).toLowerCase()

        const returnedBy = String(
          itemReturn.personnel?.full_name ||
          itemReturn.users?.full_name ||
          ''
        ).toLowerCase()

        const officeName = String(
          itemReturn.offices?.office_name || ''
        ).toLowerCase()

        const returnReason = String(
          itemReturn.return_reason || ''
        ).toLowerCase()

        const condition = String(
          itemReturn.condition_after_return || ''
        ).toLowerCase()

        const matchesSearch =
          !searchText ||
          itemName.includes(searchText) ||
          returnedBy.includes(searchText) ||
          officeName.includes(searchText) ||
          returnReason.includes(searchText) ||
          condition.includes(searchText)

        const matchesCondition =
          !this.conditionFilter ||
          itemReturn.condition_after_return === this.conditionFilter

        const matchesOffice =
          !this.officeFilter ||
          itemReturn.offices?.office_name === this.officeFilter

        return (
          matchesSearch &&
          matchesCondition &&
          matchesOffice
        )
      })

      return filtered.sort((a, b) => {
        const firstValue = this.getSortValue(
          a,
          this.sortColumn
        )

        const secondValue = this.getSortValue(
          b,
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
          this.filteredReturns.length / this.itemsPerPage
        )
      )
    },

    paginatedReturns() {
      const start =
        (this.currentPage - 1) * this.itemsPerPage

      const end = start + this.itemsPerPage

      return this.filteredReturns.slice(start, end)
    },

    firstReturnNumber() {
      if (this.filteredReturns.length === 0) {
        return 0
      }

      return (
        (this.currentPage - 1) * this.itemsPerPage + 1
      )
    },

    lastReturnNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredReturns.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    conditionFilter() {
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

  mounted() {
    this.getReturns()
    this.getItems()
    this.getPersonnel()
    this.getOffices()
  },

  methods: {
    getSortValue(itemReturn, column) {
      if (column === 'item') {
        return String(
          itemReturn.items?.description || ''
        ).toLowerCase()
      }

      if (column === 'returned_by') {
        return String(
          itemReturn.personnel?.full_name ||
          itemReturn.users?.full_name ||
          ''
        ).toLowerCase()
      }

      if (column === 'office') {
        return String(
          itemReturn.offices?.office_name || ''
        ).toLowerCase()
      }

      if (column === 'return_date') {
        return String(
          itemReturn.return_date || ''
        ).toLowerCase()
      }

      if (column === 'condition') {
        return String(
          itemReturn.condition_after_return || ''
        ).toLowerCase()
      }

      return ''
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
        return 'bi bi-arrow-down-up text-muted ms-1'
      }

      if (this.sortDirection === 'asc') {
        return 'bi bi-arrow-up ms-1'
      }

      return 'bi bi-arrow-down ms-1'
    },

    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
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
        return_date: new Date()
          .toISOString()
          .split('T')[0],
        condition_after_return: 'Serviceable',
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
        item_id: itemReturn.item_id,
        returned_by: itemReturn.returned_by || '',
        office_id: itemReturn.office_id || '',
        return_date: itemReturn.return_date || '',
        condition_after_return:
          itemReturn.condition_after_return,
        return_reason: itemReturn.return_reason || '',
        remarks: itemReturn.remarks || ''
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
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            item_id: this.form.item_id,
            returned_by: this.form.returned_by || null,
            office_id: this.form.office_id || null,
            return_date: this.form.return_date || null,
            condition_after_return:
              this.form.condition_after_return,
            return_reason: this.form.return_reason,
            remarks: this.form.remarks
          })
        })

        const data = await response.json()

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

        const data = await response.json()

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
.sortable {
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.sortable:hover {
  background-color: #f8f9fa;
}

.page-link {
  color: #856404;
}

.page-item.active .page-link {
  background-color: #ffc107;
  border-color: #ffc107;
  color: #212529;
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

  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: .5rem auto;
  }
}
</style>

