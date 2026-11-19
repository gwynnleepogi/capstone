<template>
  <div class="container-fluid organization-page">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Organizational Management</h1>
        <p class="text-secondary mb-0">Manage colleges, departments, offices, and responsibility centers in one place.</p>
      </div>
      <button class="btn btn-outline-secondary" type="button" @click="loadAll" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i> Refresh
      </button>
    </div>

    <div v-if="pageError" class="alert alert-danger">{{ pageError }}</div>

    <div class="card">
      <div class="card-header bg-white p-2">
        <div class="organization-tabs" role="tablist" aria-label="Organizational records">
          <button v-for="tab in tabs" :key="tab.key" type="button"
            class="organization-tab" :class="{ active: activeTab === tab.key }"
            @click="changeTab(tab.key)">
            {{ tab.label }}
            <span class="badge text-bg-light ms-1">{{ records[tab.key].length }}</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h2 class="h5 mb-1">{{ currentTab.label }}</h2>
            <small class="text-secondary">{{ currentTab.description }}</small>
          </div>
          <button class="btn btn-warning" type="button" @click="openAdd">
            <i class="bi bi-plus-lg me-1"></i> Add {{ currentTab.singular }}
          </button>
        </div>

        <form v-if="showForm" class="border rounded p-3 mb-4" @submit.prevent="saveRecord">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <strong>{{ editingId ? 'Edit' : 'Add' }} {{ currentTab.singular }}</strong>
            <button class="btn-close" type="button" aria-label="Close" @click="closeForm"></button>
          </div>

          <div v-if="activeTab === 'colleges'" class="row g-3">
            <div class="col-md-7">
              <label class="form-label">College Name <span class="text-danger">*</span></label>
              <input v-model.trim="form.college_name" class="form-control" required>
            </div>
            <div class="col-md-5">
              <label class="form-label">College Code</label>
              <input v-model.trim="form.college_code" class="form-control">
            </div>
          </div>

          <div v-else-if="activeTab === 'departments'" class="row g-3">
            <div class="col-md-5">
              <label class="form-label">Department Name <span class="text-danger">*</span></label>
              <input v-model.trim="form.department_name" class="form-control" required>
            </div>
            <div class="col-md-3">
              <label class="form-label">Department Code</label>
              <input v-model.trim="form.department_code" class="form-control">
            </div>
            <div class="col-md-4">
              <label class="form-label">College <span class="text-danger">*</span></label>
              <select v-model="form.college_id" class="form-select" required>
                <option value="" disabled>Select college</option>
                <option v-for="college in records.colleges" :key="college.id" :value="college.id">{{ college.college_name }}</option>
              </select>
              <small v-if="!records.colleges.length" class="text-danger">Add a college first.</small>
            </div>
          </div>

          <div v-else-if="activeTab === 'offices'" class="row g-3">
            <div class="col-md-7">
              <label class="form-label">Office Name <span class="text-danger">*</span></label>
              <input v-model.trim="form.office_name" class="form-control" required>
            </div>
            <div class="col-md-5">
              <label class="form-label">Office Code</label>
              <input v-model.trim="form.office_code" class="form-control">
            </div>
          </div>

          <div v-else class="row g-3">
            <div class="col-md-3">
              <label class="form-label">Responsibility Center Code <span class="text-danger">*</span></label>
              <input v-model.trim="form.center_code" class="form-control text-uppercase" placeholder="e.g. PRES" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">Responsibility Center Name <span class="text-danger">*</span></label>
              <input v-model.trim="form.center_name" class="form-control" required>
            </div>
            <div class="col-md-2">
              <label class="form-label">Belongs To <span class="text-danger">*</span></label>
              <select v-model="form.unit_type" class="form-select" required @change="clearUnitSelection">
                <option value="office">Office</option>
                <option value="department">Department</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">{{ form.unit_type === 'office' ? 'Office' : 'Department' }} <span class="text-danger">*</span></label>
              <select v-if="form.unit_type === 'office'" v-model="form.office_id" class="form-select" required>
                <option value="" disabled>Select office</option>
                <option v-for="office in records.offices" :key="office.id" :value="office.id">{{ office.office_name }}</option>
              </select>
              <select v-else v-model="form.department_id" class="form-select" required>
                <option value="" disabled>Select department</option>
                <option v-for="department in records.departments" :key="department.id" :value="department.id">{{ department.department_name }}</option>
              </select>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-3">
            <button class="btn btn-outline-secondary" type="button" @click="closeForm">Cancel</button>
            <button class="btn btn-success" type="submit" :disabled="saving || (activeTab === 'departments' && !records.colleges.length) || (activeTab === 'responsibilityCenters' && ((form.unit_type === 'office' && !records.offices.length) || (form.unit_type === 'department' && !records.departments.length)))">
              {{ saving ? 'Saving...' : editingId ? 'Update' : 'Save' }} {{ currentTab.singular }}
            </button>
          </div>
        </form>

        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <input v-model="search" class="form-control" :placeholder="'Search ' + currentTab.label.toLowerCase() + '...'" @input="currentPage = 1">
          </div>
          <div class="col-md-3">
            <select v-model="pageSize" class="form-select">
              <option :value="10">10 per page</option>
              <option :value="25">25 per page</option>
              <option :value="50">50 per page</option>
              <option :value="100">100 per page</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr v-if="activeTab === 'colleges'"><th>College Name</th><th>College Code</th><th>Departments</th><th>Actions</th></tr>
              <tr v-else-if="activeTab === 'departments'"><th>Department Name</th><th>Department Code</th><th>College</th><th>Responsibility Centers</th><th>Actions</th></tr>
              <tr v-else-if="activeTab === 'offices'"><th>Office Name</th><th>Office Code</th><th>Responsibility Centers</th><th>Actions</th></tr>
              <tr v-else><th>Center Code</th><th>Center Name</th><th>Organizational Unit</th><th>Unit Type</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td :colspan="columnCount" class="text-center py-4">Loading records...</td></tr>
              <tr v-else-if="filteredRecords.length === 0"><td :colspan="columnCount" class="text-center text-secondary py-4">No records found.</td></tr>
              <tr v-for="record in paginatedRecords" :key="record.id">
                <template v-if="activeTab === 'colleges'">
                  <td>{{ record.college_name }}</td><td>{{ record.college_code || '-' }}</td>
                  <td>{{ records.departments.filter(d => d.college_id === record.id).length }}</td>
                </template>
                <template v-else-if="activeTab === 'departments'">
                  <td>{{ record.department_name }}</td><td>{{ record.department_code || '-' }}</td>
                  <td>{{ collegeName(record.college_id) }}</td>
                  <td>{{ records.responsibilityCenters.filter(c => c.department_id === record.id).length }}</td>
                </template>
                <template v-else-if="activeTab === 'offices'">
                  <td>{{ record.office_name }}</td><td>{{ record.office_code || '-' }}</td>
                  <td>{{ records.responsibilityCenters.filter(c => c.office_id === record.id).length }}</td>
                </template>
                <template v-else>
                  <td><strong>{{ record.center_code }}</strong></td><td>{{ record.center_name }}</td>
                  <td>{{ unitName(record) }}</td><td>{{ record.unit_type === 'office' ? 'Office' : 'Department' }}</td>
                </template>
                <td class="text-nowrap">
                  <button class="btn btn-sm btn-outline-primary me-1" type="button" @click="startEdit(record)" title="Edit"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-sm btn-outline-danger" type="button" @click="deleteRecord(record)" title="Delete"><i class="bi bi-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredRecords.length" class="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <small class="text-secondary">Showing {{ firstRecord }} to {{ lastRecord }} of {{ filteredRecords.length }} records</small>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" :disabled="currentPage <= 1" @click="currentPage--">Previous</button>
            <button class="btn btn-outline-secondary" disabled>{{ currentPage }} / {{ totalPages }}</button>
            <button class="btn btn-outline-secondary" :disabled="currentPage >= totalPages" @click="currentPage++">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrganizationManagement',
  data() {
    return {
      tabs: [
        { key: 'colleges', label: 'Colleges', singular: 'College', description: 'Manage colleges.' },
        { key: 'departments', label: 'Departments', singular: 'Department', description: 'Connect each department to its college.' },
        { key: 'offices', label: 'Offices', singular: 'Office', description: 'Manage existing office records.' },
        { key: 'responsibilityCenters', label: 'Responsibility Centers', singular: 'Responsibility Center', description: 'Manage official center codes and connect them to an office or department.' }
      ],
      activeTab: 'colleges',
      records: { colleges: [], departments: [], offices: [], responsibilityCenters: [] },
      loading: false,
      saving: false,
      pageError: '',
      showForm: false,
      editingId: null,
      form: {},
      search: '',
      currentPage: 1,
      pageSize: 10
    }
  },
  computed: {
    currentTab() { return this.tabs.find(tab => tab.key === this.activeTab) },
    columnCount() {
      return this.activeTab === 'responsibilityCenters' ? 5 :
        this.activeTab === 'departments' ? 5 :
        this.activeTab === 'offices' ? 4 : 4
    },
    filteredRecords() {
      const rows = this.records[this.activeTab] || []
      const term = this.search.trim().toLowerCase()
      if (!term) return rows
      return rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(term)))
    },
    totalPages() { return Math.max(1, Math.ceil(this.filteredRecords.length / this.pageSize)) },
    paginatedRecords() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.filteredRecords.slice(start, start + this.pageSize)
    },
    firstRecord() { return this.filteredRecords.length ? (this.currentPage - 1) * this.pageSize + 1 : 0 },
    lastRecord() { return Math.min(this.currentPage * this.pageSize, this.filteredRecords.length) }
  },
  mounted() { this.loadAll() },
  methods: {
    async request(url, options = {}) {
      const headers = { ...(options.headers || {}) }
      const token = localStorage.getItem('accessToken')
      if (token) headers.Authorization = 'Bearer ' + token
      const response = await fetch(url, { ...options, headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Request failed.')
      return data
    },
    async loadAll() {
      this.loading = true
      this.pageError = ''
      try {
        const [colleges, departments, offices, responsibilityCenters] = await Promise.all([
          this.request('/api/organization/colleges'),
          this.request('/api/organization/departments'),
          this.request('/api/offices'),
          this.request('/api/organization/responsibility-centers')
        ])
        this.records = { colleges, departments, offices, responsibilityCenters }
      } catch (error) {
        this.pageError = error.message || 'Failed to load organizational records.'
      } finally {
        this.loading = false
      }
    },
    changeTab(key) { this.activeTab = key; this.search = ''; this.currentPage = 1; this.closeForm() },
    blankForm() {
      if (this.activeTab === 'colleges') return { college_name: '', college_code: '' }
      if (this.activeTab === 'departments') return { department_name: '', department_code: '', college_id: '' }
      if (this.activeTab === 'offices') return { office_name: '', office_code: '' }
      return { center_code: '', center_name: '', unit_type: 'office', office_id: '', department_id: '' }
    },
    openAdd() { this.editingId = null; this.form = this.blankForm(); this.showForm = true },
    closeForm() { this.showForm = false; this.editingId = null; this.form = {} },
    startEdit(record) {
      this.editingId = record.id
      this.form = { ...this.blankForm(), ...record }
      this.showForm = true
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    clearUnitSelection() { this.form.office_id = ''; this.form.department_id = '' },
    collegeName(id) { return this.records.colleges.find(row => row.id === id)?.college_name || 'College not found' },
    unitName(record) {
      if (record.unit_type === 'office') return this.records.offices.find(row => row.id === record.office_id)?.office_name || 'Office not found'
      return this.records.departments.find(row => row.id === record.department_id)?.department_name || 'Department not found'
    },
    async saveRecord() {
      this.saving = true
      try {
        let url = '/api/organization/' + this.activeTab.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
        if (this.activeTab === 'responsibilityCenters') url = '/api/organization/responsibility-centers'
        const method = this.editingId ? 'PUT' : 'POST'
        if (this.editingId) url += '/' + this.editingId
        const data = await this.request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.form) })
        const key = this.activeTab
        if (this.editingId) {
          this.records[key] = this.records[key].map(row => row.id === this.editingId ? data : row)
        } else {
          this.records[key].push(data)
        }
        this.closeForm()
        window.dispatchEvent(new CustomEvent('show-toast', { detail: currentTabToast(this.activeTab, method) }))
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      } finally {
        this.saving = false
      }
    },
    async deleteRecord(record) {
      const label = this.activeTab === 'colleges' ? record.college_name :
        this.activeTab === 'departments' ? record.department_name :
        this.activeTab === 'offices' ? record.office_name : record.center_code
      if (!window.confirm('Delete "' + label + '"?')) return
      try {
        let url = this.activeTab === 'responsibilityCenters'
          ? '/api/organization/responsibility-centers'
          : '/api/organization/' + this.activeTab
        if (this.activeTab === 'offices') url = '/api/offices'
        const data = await this.request(url + '/' + record.id, { method: 'DELETE' })
        this.records[this.activeTab] = this.records[this.activeTab].filter(row => row.id !== record.id)
        window.dispatchEvent(new CustomEvent('show-toast', { detail: data.message || 'Record deleted successfully.' }))
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      }
    }
  }
}
function currentTabToast(tab, method) {
  const names = { colleges: 'College', departments: 'Department', offices: 'Office', responsibilityCenters: 'Responsibility Center' }
  return names[tab] + (method === 'PUT' ? ' updated successfully.' : ' added successfully.')
}
</script>

<style scoped>
.organization-tabs { display: flex; flex-wrap: wrap; gap: .35rem; }
.organization-tab { border: 0; background: transparent; color: #5d675e; padding: .7rem .9rem; border-radius: .45rem; font-weight: 600; }
.organization-tab:hover { background: #f1f5ef; color: #315535; }
.organization-tab.active { background: #e5efe4; color: #315535; }
.organization-page .table thead th { white-space: nowrap; background: #f4f6f2; }
.organization-page .table td { vertical-align: middle; }
@media (max-width: 575.98px) {
  .organization-tab { padding: .55rem .65rem; font-size: .9rem; }
}
</style>
