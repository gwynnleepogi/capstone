<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1>Personnel</h1>
        <p class="text-muted">
          Manage system personnel and accounts
        </p>
      </div>
      <button
        type="button"
        class="btn btn-success"
        @click="openCreatePersonnelModal"
      >
        <i class="bi bi-person-plus me-1"></i>
        Add User
      </button>
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
              <th class="sortable" @click="sortBy('employee_id')">
                Employee ID
                <i :class="getSortIcon('employee_id')"></i>
              </th>

              <th
                class="sortable"
                @click="sortBy('full_name')"
              >
                Full Name
                <i :class="getSortIcon('full_name')"></i>
              </th>

              <th class="sortable" @click="sortBy('department')">
                Department
                <i :class="getSortIcon('department')"></i>
              </th>

              <th class="sortable" @click="sortBy('job_title')">
                Job Title
                <i :class="getSortIcon('job_title')"></i>
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
              <td colspan="9" class="text-center py-5">
                Loading personnel...
              </td>
            </tr>

            <tr v-else-if="error">
              <td colspan="9" class="text-center text-danger py-5">
                {{ error }}
              </td>
            </tr>

            <tr v-else-if="filteredPersonnel.length === 0">
              <td colspan="9" class="text-center text-muted py-5">
                No personnel found.
              </td>
            </tr>

            <tr
              v-for="person in paginatedPersonnel"
              :key="person.id"
            >
              <td>{{ person.employee_id || '-' }}</td>
              <td>
                {{ person.full_name }}
              </td>

              <td>{{ person.department || '-' }}</td>
              <td>{{ person.job_title || '-' }}</td>

              <td>
                {{ person.email }}
              </td>

              <td>
                <span
                  class="badge"
                  :class="getRoleClass(person.role)"
                >
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
                  class="btn btn-sm btn-outline-primary"
                  @click="viewPersonnelDetails(person)"
                  title="View personnel details"
                >
                  <i class="bi bi-eye me-1"></i>
                  Details
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

    <!-- ASSIGNED ITEMS MODAL -->

    <div
      v-if="showItemsModal"
      class="modal fade show d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5);"
    >
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">
              Assigned Properties -
              {{ selectedPersonnel.full_name }}
            </h5>

            <button
              type="button"
              class="btn-close"
              @click="closeItemsModal"
            ></button>
          </div>

          <div class="modal-body">

            <div
              v-if="itemsLoading"
              class="text-center py-4"
            >
              <div class="spinner-border text-primary"></div>

              <p class="mt-2">
                Loading assigned properties...
              </p>
            </div>

            <div
              v-else-if="assignedItems.length === 0"
              class="text-center py-4"
            >
              <i class="bi bi-box-seam fs-1 text-muted"></i>

              <p class="mt-2 text-muted">
                No assigned properties found for this personnel.
              </p>
            </div>

            <div
              v-else
              class="table-responsive"
            >
              <table
                class="table table-bordered table-hover align-middle table-assigned-items"
              >
                <thead class="table-light">
                  <tr>
                    <th>Property Number</th>
                    <th>Description</th>
                    <th>Serial Number</th>
                    <th>Classification</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Cost</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in assignedItems"
                    :key="item.id"
                  >
                    <td class="text-nowrap">
                      {{ item.property_number || '-' }}
                    </td>

                    <td>
                      {{ item.description || '-' }}
                    </td>

                    <td class="text-nowrap">
                      {{ item.serial_number || '-' }}
                    </td>

                    <td>
                      {{ item.classification || '-' }}
                    </td>

                    <td>
                      {{ item.condition || '-' }}
                    </td>
                    <td>
                      <span
                        class="badge"
                        :class="getStatusClass(item.status)"
                      >
                        {{ item.status || '-' }}
                      </span>
                    </td>

                    <td class="text-nowrap">
                      ₱{{ Number(item.cost || 0).toLocaleString() }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeItemsModal"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>

    <div class="modal fade" id="personnelCreateModal" tabindex="-1" aria-labelledby="personnelCreateModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="createPersonnel">
            <div class="modal-header">
              <h5 id="personnelCreateModalLabel" class="modal-title">Add User</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label for="newPersonnelEmployeeId" class="form-label">Employee ID</label>
                <input id="newPersonnelEmployeeId" v-model.trim="newPersonnelForm.employee_id" class="form-control" required>
              </div>
              <div class="mb-3">
                <label for="newPersonnelName" class="form-label">Full Name</label>
                <input id="newPersonnelName" v-model.trim="newPersonnelForm.full_name" class="form-control" autocomplete="name" required>
              </div>
              <div class="mb-3">
                <label for="newPersonnelEmail" class="form-label">Email</label>
                <input id="newPersonnelEmail" v-model.trim="newPersonnelForm.email" type="email" class="form-control" autocomplete="email" required>
              </div>
              <div class="mb-3">
                <label for="newPersonnelPassword" class="form-label">Temporary Password</label>
                <input id="newPersonnelPassword" v-model="newPersonnelForm.password" type="password" class="form-control" autocomplete="new-password" minlength="6" required>
                <div class="form-text">Must be at least 6 characters.</div>
              </div>
              <div class="mb-3">
                <label for="newPersonnelRole" class="form-label">User Type</label>
                <select id="newPersonnelRole" v-model="newPersonnelForm.role" class="form-select" required @change="clearNewPersonnelTitle">
                  <option value="" disabled>Select a user type</option>
                  <option value="Teacher">Teaching Staff</option>
                  <option value="Non-Teaching Staff">Non-Teaching Staff</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="newPersonnelTitle" class="form-label">Job Title</label>
                <SearchableSelect
                  input-id="newPersonnelTitle"
                  v-model="newTitleSelection"
                  :options="newPersonnelTitleOptions"
                  placeholder="Search or select a job title"
                  required
                  :disabled="!newPersonnelForm.role"
                />
              </div>
              <div v-if="newTitleSelection === '__other__'" class="mb-3">
                <label for="newPersonnelOtherTitle" class="form-label">Other Job Title</label>
                <input
                  id="newPersonnelOtherTitle"
                  v-model.trim="newOtherJobTitle"
                  class="form-control"
                  maxlength="120"
                  required
                  placeholder="Enter the job title"
                >
                <div class="form-text">This title will be available in signup after this user is created.</div>
              </div>
              <div class="mb-3">
                <label for="newPersonnelOffice" class="form-label">Office</label>
                <SearchableSelect
                  input-id="newPersonnelOffice"
                  v-model="newPersonnelForm.office_id"
                  :options="newPersonnelOfficeOptions"
                  placeholder="Search or select an office"
                  required
                />
                <div v-if="offices.length === 0" class="form-text text-danger">
                  No offices are available. Add an office before creating this user.
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success" :disabled="personnelCreating">
                <span v-if="personnelCreating" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                {{ personnelCreating ? 'Creating...' : 'Create User' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="personnelDetailsModal" tabindex="-1" aria-labelledby="personnelDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="personnelDetailsModalLabel" class="modal-title">Personnel Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div v-if="selectedPersonnel" class="modal-body">
            <div
              v-if="resetPasswordResult && resetPasswordResult.person_id === selectedPersonnel.id"
              class="alert alert-success border border-success-subtle shadow-sm p-3 mb-3"
              role="alert"
            >
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-check-circle-fill fs-4 me-2"></i>
                <strong class="fs-6">Temporary Password Ready</strong>
              </div>
              <p class="mb-2">
                Give this password to {{ selectedPersonnel.full_name }} through a secure channel. They must change it after signing in.
              </p>
              <label for="reset-temporary-password" class="form-label fw-semibold">Temporary password</label>
              <input
                id="reset-temporary-password"
                class="form-control font-monospace mb-2"
                :value="resetPasswordResult.password"
                readonly
                @focus="$event.target.select()"
              >
              <button type="button" class="btn btn-sm btn-success" @click="copyResetPassword">
                <i class="bi bi-clipboard me-1"></i>Copy Password
              </button>
            </div>

            <dl class="row mb-0">
              <dt class="col-sm-4">Employee ID</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.employee_id || '-' }}</dd>
              <dt class="col-sm-4">Full Name</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.full_name || '-' }}</dd>
              <dt class="col-sm-4">Email</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.email || '-' }}</dd>
              <dt class="col-sm-4">Role</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.role || '-' }}</dd>
              <dt class="col-sm-4">Department</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.department || '-' }}</dd>
              <dt class="col-sm-4">Job Title</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.job_title || '-' }}</dd>
              <dt class="col-sm-4">Office</dt>
              <dd class="col-sm-8">{{ selectedPersonnel.offices?.office_name || '-' }}</dd>
              <dt class="col-sm-4">Created</dt>
              <dd class="col-sm-8">{{ formatDate(selectedPersonnel.created_at) }}</dd>
            </dl>


            <div class="d-flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                class="btn btn-outline-info btn-sm"
                :disabled="resettingPasswordId === selectedPersonnel.id || !selectedPersonnel.auth_user_id"
                @click="resetPersonnelPassword(selectedPersonnel)"
                title="Issue a new temporary password"
              >
                <span
                  v-if="resettingPasswordId === selectedPersonnel.id"
                  class="spinner-border spinner-border-sm me-1"
                  aria-hidden="true"
                ></span>
                <i v-else class="bi bi-key me-1"></i>
                Reset Password
              </button>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                @click="deleteSelectedPersonnel"
              >
                <i class="bi bi-trash me-1"></i>Delete this personnel
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-outline-primary" @click="viewSelectedPersonnelItems">
              <i class="bi bi-box-seam me-1"></i>View Properties
            </button>
            <button type="button" class="btn btn-outline-warning" @click="editSelectedPersonnel">
              <i class="bi bi-pencil me-1"></i>Edit
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="personnelEditModal" tabindex="-1" aria-labelledby="personnelEditModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="savePersonnelEdit">
            <div class="modal-header">
              <h5 id="personnelEditModalLabel" class="modal-title">Edit Personnel</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Employee ID</label>
                <input v-model.trim="personnelForm.employee_id" class="form-control">
              </div>
              <div class="mb-3">
                <label class="form-label">Full Name</label>
                <input v-model.trim="personnelForm.full_name" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model.trim="personnelForm.email" type="email" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Role</label>
                <select
                  v-model="personnelForm.role"
                  class="form-select"
                  required
                  @change="clearPersonnelEditTitle"
                >
                  <option value="" disabled>Select a user type</option>
                  <option value="Teacher">Teaching Staff</option>
                  <option value="Non-Teaching Staff">Non-Teaching Staff</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Job Title</label>
                <SearchableSelect
                  input-id="editPersonnelJobTitle"
                  v-model="personnelForm.job_title"
                  :options="editPersonnelTitleOptions"
                  placeholder="Search or select a job title"
                  required
                  :disabled="!personnelForm.role"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Office</label>
                <SearchableSelect
                  input-id="editPersonnelOffice"
                  v-model="personnelForm.office_id"
                  :options="editPersonnelOfficeOptions"
                  placeholder="Search or select an office"
                  required
                  @update:model-value="updatePersonnelEditDepartment"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-outline-warning" :disabled="personnelSaving">
                <i class="bi bi-pencil me-1"></i>{{ personnelSaving ? 'Saving...' : 'Save Changes' }}
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
import { positionsForRole } from '@/data/positions'
import SearchableSelect from '@/components/SearchableSelect.vue'

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
  components: { SearchableSelect },

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
      sortDirection: 'asc',

      showItemsModal: false,
      selectedPersonnel: {},
      assignedItems: [],
      itemsLoading: false,
      personnelSaving: false,
      personnelCreating: false,
      resettingPasswordId: null,
      resetPasswordResult: null,
      newTitleSelection: '',
      newOtherJobTitle: '',
      newPersonnelForm: {
        full_name: '',
        email: '',
        password: '',
        role: '',
        employee_id: '',
        department: '',
        job_title: '',
        office_id: ''
      },
      personnelForm: {
        full_name: '',
        email: '',
        role: '',
        employee_id: '',
        department: '',
        job_title: '',
        office_id: ''
      }
    }
  },

  computed: {
    newPersonnelOfficeOptions() {
      return [...this.offices]
        .filter(office => office?.id && office.office_name)
        .sort((first, second) =>
          first.office_name.localeCompare(second.office_name, undefined, {
            sensitivity: 'base'
          })
        )
        .map(office => ({ value: office.id, label: office.office_name }))
    },

    newPersonnelTitleOptions() {
      if (!this.newPersonnelForm.role) return []

      const savedTitles = this.personnel
        .filter(person => person.role === this.newPersonnelForm.role)
        .map(person => String(person.job_title || '').trim())
        .filter(Boolean)

      const titles = [...new Set([
        ...positionsForRole(this.newPersonnelForm.role),
        ...savedTitles
      ])].sort((first, second) =>
        first.localeCompare(second, undefined, { sensitivity: 'base' })
      )

      return [
        ...titles.map(title => ({ value: title, label: title })),
        { value: '__other__', label: 'Others' }
      ]
    },

    editPersonnelOfficeOptions() {
      return [...this.offices]
        .filter(office => office?.id && office.office_name)
        .sort((first, second) =>
          first.office_name.localeCompare(second.office_name, undefined, {
            sensitivity: 'base'
          })
        )
        .map(office => ({ value: office.id, label: office.office_name }))
    },

    editPersonnelTitleOptions() {
      if (!this.personnelForm.role) return []

      const savedTitles = this.personnel
        .filter(person => person.role === this.personnelForm.role)
        .map(person => String(person.job_title || '').trim())
        .filter(Boolean)

      const titles = [...new Set([
        ...positionsForRole(this.personnelForm.role),
        ...savedTitles,
        String(this.personnelForm.job_title || '').trim()
      ])].filter(Boolean).sort((first, second) =>
        first.localeCompare(second, undefined, { sensitivity: 'base' })
      )

      return titles.map(title => ({ value: title, label: title }))
    },

    roles() {
      return ['Administrator', 'Teacher', 'Non-Teaching Staff']
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

        const employeeId = (person.employee_id || '').toLowerCase()
        const department = (person.department || '').toLowerCase()
        const jobTitle = (person.job_title || '').toLowerCase()

        const role = (
          person.role || ''
        ).toLowerCase()

        const office = (
          person.offices?.office_name || ''
        ).toLowerCase()

        const matchesSearch =
          !searchText ||
          employeeId.includes(searchText) ||
          fullName.includes(searchText) ||
          department.includes(searchText) ||
          jobTitle.includes(searchText) ||
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
      const lastNumber =        this.currentPage *
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
    positionsForRole,

    normalizeDepartment(value) {
      return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word === word.toUpperCase()
          ? word
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    },

    openCreatePersonnelModal() {
      this.newTitleSelection = ''
      this.newOtherJobTitle = ''
      this.newPersonnelForm = {
        full_name: '',
        email: '',
        password: '',
        role: '',
        employee_id: '',
        department: '',
        job_title: '',
        office_id: ''
      }
      Modal.getOrCreateInstance(
        document.getElementById('personnelCreateModal')
      ).show()
    },

    clearNewPersonnelTitle() {
      this.newTitleSelection = ''
      this.newOtherJobTitle = ''
      this.newPersonnelForm.job_title = ''
    },

    async createPersonnel() {
      const jobTitle = this.newTitleSelection === '__other__'
        ? this.newOtherJobTitle.trim()
        : this.newTitleSelection
      const selectedOffice = this.offices.find(
        office => String(office.id) === String(this.newPersonnelForm.office_id)
      )

      if (!jobTitle || jobTitle.length > 120) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: jobTitle
              ? 'Job title must be 120 characters or fewer'
              : 'Select or enter a job title'
          })
        )
        return
      }

      if (!selectedOffice) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Select an office before creating this user.'
          })
        )
        return
      }

      this.personnelCreating = true

      try {
        const response = await apiRequest('/api/personnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...this.newPersonnelForm,
            job_title: jobTitle,
            department: selectedOffice.office_name
          })
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user')
        }

        this.personnel.unshift(result.data)
        this.newTitleSelection = ''
        this.newOtherJobTitle = ''
        this.search = ''
        this.roleFilter = ''
        this.officeFilter = ''
        this.currentPage = 1
        Modal.getInstance(document.getElementById('personnelCreateModal'))?.hide()
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: 'User created successfully' })
        )
      } catch (error) {
        console.log(error)
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: error.message })
        )
      } finally {
        this.personnelCreating = false
      }
    },

    viewPersonnelDetails(person) {
      this.selectedPersonnel = person
      this.resetPasswordResult = null
      Modal.getOrCreateInstance(
        document.getElementById('personnelDetailsModal')
      ).show()
    },

    async resetPersonnelPassword(person) {
      if (!person?.id || !person.auth_user_id) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'This personnel record has no sign-in account to reset.'
        }))
        return
      }

      if (!window.confirm(
        `Reset the password for ${person.full_name}? Their current password will stop working and they will need to change the temporary password after signing in.`
      )) {
        return
      }

      this.resettingPasswordId = person.id

      try {
        const response = await apiRequest(
          `/api/personnel/${encodeURIComponent(person.id)}/reset-password`,
          { method: 'POST' }
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to reset password')
        }

        if (!result.temporary_password) {
          throw new Error('The server did not return a temporary password')
        }

        this.resetPasswordResult = {
          person_id: person.id,
          password: result.temporary_password
        }

        // Bring the new password notice into view immediately.
        this.$nextTick(() => {
          const modalBody = document.querySelector('#personnelDetailsModal .modal-body')
          if (modalBody) {
            modalBody.scrollTop = 0
          }
        })
      } catch (error) {
        console.error('Personnel password reset failed:', error)
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Failed to reset password'
        }))
      } finally {
        this.resettingPasswordId = null
      }
    },

    async copyResetPassword() {
      try {
        await navigator.clipboard.writeText(this.resetPasswordResult.password)
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Temporary password copied'
        }))
      } catch (error) {
        console.error('Temporary password copy failed:', error)
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Unable to copy the temporary password'
        }))
      }
    },

    viewSelectedPersonnelItems() {
      if (!this.selectedPersonnel?.id) return
      const person = this.selectedPersonnel
      Modal.getInstance(document.getElementById('personnelDetailsModal'))?.hide()
      this.viewItems(person)
    },

    editSelectedPersonnel() {
      const person = this.selectedPersonnel
      if (!person?.id) return
      const matchingOffice = this.offices.find(office =>
        String(office.id) === String(person.office_id)
      )
      this.personnelForm = {
        full_name: person.full_name || '',
        email: person.email || '',
        role: person.role || '',
        employee_id: person.employee_id || '',
        department: matchingOffice?.office_name || person.department || '',
        job_title: person.job_title || '',
        office_id: person.office_id || ''
      }
      Modal.getInstance(document.getElementById('personnelDetailsModal'))?.hide()
      Modal.getOrCreateInstance(
        document.getElementById('personnelEditModal')
      ).show()
    },

    clearPersonnelEditTitle() {
      this.personnelForm.job_title = ''
    },

    updatePersonnelEditDepartment(officeId) {
      const selectedOffice = this.offices.find(
        office => String(office.id) === String(officeId)
      )
      this.personnelForm.department = selectedOffice
        ? selectedOffice.office_name
        : ''
    },

    async savePersonnelEdit() {
      const personId = this.selectedPersonnel?.id
      if (!personId) return
      const selectedOffice = this.offices.find(
        office => String(office.id) === String(this.personnelForm.office_id)
      )
      if (!selectedOffice) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Select an office before saving personnel.'
        }))
        return
      }
      this.personnelForm.department = selectedOffice.office_name
      this.personnelSaving = true

      try {
        const response = await apiRequest(
          `/api/personnel/${personId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.personnelForm)
          }
        )
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update personnel')
        }

        const updatedPerson = result.data
        const office = this.offices.find(entry => entry.id === updatedPerson.office_id)
        updatedPerson.offices = office ? { office_name: office.office_name } : null
        const index = this.personnel.findIndex(entry => entry.id === personId)
        if (index !== -1) this.personnel[index] = updatedPerson
        this.selectedPersonnel = updatedPerson
        Modal.getInstance(document.getElementById('personnelEditModal'))?.hide()
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: 'Personnel updated successfully' })
        )
      } catch (error) {
        console.log(error)
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: error.message })
        )
      } finally {
        this.personnelSaving = false
      }
    },

    deleteSelectedPersonnel() {
      const personId = this.selectedPersonnel?.id
      if (!personId) return
      Modal.getInstance(document.getElementById('personnelDetailsModal'))?.hide()
      this.deletePersonnel(personId)
    },

    async getPersonnel() {
      this.loading = true

      try {
        const response = await apiRequest(
          '/api/personnel'
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
          '/api/offices'
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

    async viewItems(person) {
      this.selectedPersonnel = person
      this.assignedItems = []
      this.showItemsModal = true
      this.itemsLoading = true

      try {
        const employeeName = encodeURIComponent(
          person.full_name
        )

        const response = await apiRequest(
          '/api/items/assigned/' +
          employeeName
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load assigned properties'
          )
        }

        this.assignedItems = data
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      } finally {
        this.itemsLoading = false
      }
    },

    closeItemsModal() {
      this.showItemsModal = false
      this.selectedPersonnel = {}
      this.assignedItems = []
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

    clearFilters() {      this.search = ''
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
          '/api/personnel/' + id,
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

    getRoleClass(role) {
      const normalizedRole = String(role || '')
        .trim()
        .toLowerCase()
        .replace(/-/g, ' ')

      if (
        normalizedRole === 'admin' ||
        normalizedRole === 'administrator'
      ) {
        return 'role-admin'
      }

      if (normalizedRole === 'personnel') {
        return 'role-personnel'
      }

      if (
        normalizedRole === 'teacher' ||
        normalizedRole === 'teaching' ||
        normalizedRole === 'teaching staff' ||
        normalizedRole === 'non teaching' ||
        normalizedRole === 'non teaching staff'
      ) {
        return 'role-teaching'
      }

      return 'role-default'
    },

    getStatusClass(status) {
      const normalizedStatus = String(status || '')
        .trim()
        .toLowerCase()

      if (normalizedStatus === 'available') {
        return 'status-available'
      }

      if (normalizedStatus === 'issued') {
        return 'status-issued'
      }

      if (normalizedStatus === 'returned') {
        return 'status-returned'
      }

      if (normalizedStatus === 'lost') {
        return 'status-lost'
      }

      if (normalizedStatus === 'damaged') {
        return 'status-damaged'
      }

      if (normalizedStatus === 'stolen') {
        return 'status-stolen'
      }

      if (normalizedStatus === 'disposed') {
        return 'status-disposed'
      }

      return 'status-default'
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

.role-admin {
  background-color: #e7efe5;
  color: #2f5d3a;
}

.role-personnel {
  background-color: #fbf4d7;
  color: #5c4a0c;
}

.role-teaching {
  background-color: #e8f0e8;
  color: #385b3d;
}

.role-default {
  background-color: #6c757d;
  color: white;
}

.status-available {
  background-color: #d1e7dd;
  color: #0f5132;
}

.status-issued {
  background-color: #fbf4d7;
  color: #5c4a0c;
}

.status-returned {
  background-color: #e8f0e8;
  color: #385b3d;
}

.status-lost {
  background-color: #fff3cd;
  color: #664d03;
}

.status-damaged {
  background-color: #f8d7da;
  color: #842029;
}

.status-stolen {
  background-color: #f5c2c7;
  color: #842029;
}

.status-disposed {
  background-color: #e2e3e5;
  color: #41464b;
}

.status-default {
  background-color: #6c757d;
  color: white;
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

.table-assigned-items {
  min-width: 1050px;
  table-layout: auto;
}

.table-assigned-items th,
.table-assigned-items td {
  white-space: nowrap;
  vertical-align: middle;
}

.table-assigned-items th:nth-child(2),
.table-assigned-items td:nth-child(2) {
  min-width: 350px;
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

.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

.modal-content {
  border: none;
  border-radius: 12px;
}

.modal-header {
  background-color: #2F5D3A;
  color: white;
}

.modal-header .btn-close {
  filter: brightness(0) invert(1);
}

.modal-title {
  font-weight: 600;
}

.modal-body {
  max-height: calc(70vh / var(--ui-zoom));
  overflow-y: auto;
}

.modal .table thead th {
  background-color: #2F5D3A;
  color: white;
}

@media (max-width: 576px) {
  .pagination {
    flex-wrap: wrap;
  }

  .modal-dialog {
    margin: 10px;
  }

  .modal-body {
    padding: 10px;
  }
}
</style>