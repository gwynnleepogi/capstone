<template>
  <div class="container-fluid">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">{{ pageTitle }}</h1>
        <p class="text-secondary mb-0">{{ pageDescription }}</p>
      </div>
      <button class="btn btn-warning" @click="openAddModal">
        <i class="bi bi-plus-lg me-1"></i> Add {{ singularLabel }}
      </button>
    </div>

    <div class="d-flex flex-wrap gap-2 mb-3">
      <router-link to="/colleges" class="btn btn-sm" :class="section === 'colleges' ? 'btn-success' : 'btn-outline-secondary'">Colleges</router-link>
      <router-link to="/departments" class="btn btn-sm" :class="section === 'departments' ? 'btn-success' : 'btn-outline-secondary'">Departments</router-link>
      <router-link to="/offices" class="btn btn-sm btn-outline-secondary">Offices</router-link>
      <router-link to="/responsibility-centers" class="btn btn-sm" :class="section === 'responsibility-centers' ? 'btn-success' : 'btn-outline-secondary'">Responsibility Centers</router-link>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-8">
            <label class="form-label">Search</label>
            <input v-model="search" class="form-control" :placeholder="'Search ' + pageTitle.toLowerCase() + '...'">
          </div>
          <div class="col-md-4">
            <label class="form-label">Status</label>
            <select v-model="statusFilter" class="form-select">
              <option value="all">All Records</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header bg-white d-flex justify-content-between">
        <strong>{{ pageTitle }} Records</strong>
        <span class="text-secondary small">{{ filteredRecords.length }} record(s)</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead><tr>
            <th>{{ codeLabel }}</th>
            <th>{{ nameLabel }}</th>
            <th v-if="section === 'departments'">College</th>
            <th v-if="section === 'responsibility-centers'">Assigned Unit</th>
            <th>Status</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td>{{ record[codeField] || '-' }}</td>
              <td>{{ record[nameField] }}</td>
              <td v-if="section === 'departments'">{{ record.colleges?.college_name || '-' }}</td>
              <td v-if="section === 'responsibility-centers'">{{ assignedUnit(record) }}</td>
              <td><span class="badge" :class="record.is_active ? 'bg-success' : 'bg-secondary'">{{ record.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="text-nowrap">
                <button class="btn btn-sm btn-outline-success me-1" @click="editRecord(record)">Edit</button>
                <button class="btn btn-sm" :class="record.is_active ? 'btn-outline-danger' : 'btn-outline-primary'" @click="toggleStatus(record)">{{ record.is_active ? 'Deactivate' : 'Activate' }}</button>
              </td>
            </tr>
            <tr v-if="!filteredRecords.length"><td :colspan="section === 'departments' || section === 'responsibility-centers' ? 6 : 4" class="text-center text-secondary py-4">No records found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.45)">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editing ? 'Edit' : 'Add' }} {{ singularLabel }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <form @submit.prevent="saveRecord">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">{{ codeLabel }} <span class="text-danger">*</span></label>
                  <input v-model.trim="form[codeField]" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">{{ nameLabel }} <span class="text-danger">*</span></label>
                  <input v-model.trim="form[nameField]" class="form-control" required>
                </div>
                <div v-if="section === 'departments'" class="col-12">
                  <label class="form-label">College <span class="text-danger">*</span></label>
                  <select v-model="form.college_id" class="form-select" required>
                    <option value="">Select College</option>
                    <option v-for="college in colleges" :key="college.id" :value="college.id">{{ college.college_name }}</option>
                  </select>
                </div>
                <template v-if="section === 'responsibility-centers'">
                  <div class="col-12">
                    <label class="form-label">Associated With</label>
                    <select v-model="form.unit_type" class="form-select">
                      <option value="">Not assigned to a specific unit</option>
                      <option value="college">College</option>
                      <option value="department">Department</option>
                      <option value="office">Office</option>
                    </select>
                  </div>
                  <div v-if="form.unit_type === 'college'" class="col-12">
                    <label class="form-label">College</label>
                    <select v-model="form.college_id" class="form-select">
                      <option value="">Select College</option>
                      <option v-for="college in colleges" :key="college.id" :value="college.id">{{ college.college_name }}</option>
                    </select>
                  </div>
                  <div v-if="form.unit_type === 'department'" class="col-12">
                    <label class="form-label">Department</label>
                    <select v-model="form.department_id" class="form-select">
                      <option value="">Select Department</option>
                      <option v-for="department in departments" :key="department.id" :value="department.id">{{ department.department_name }}</option>
                    </select>
                  </div>
                  <div v-if="form.unit_type === 'office'" class="col-12">
                    <label class="form-label">Office</label>
                    <select v-model="form.office_id" class="form-select">
                      <option value="">Select Office</option>
                      <option v-for="office in offices" :key="office.id" :value="office.id">{{ office.office_name }}</option>
                    </select>
                  </div>
                  <p class="small text-secondary mb-0">The responsibility center code is separate from property codes, office codes, and department codes.</p>
                </template>
              </div>
              <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-warning" :disabled="saving">{{ saving ? 'Saving...' : 'Save ' + singularLabel }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrganizationManagement',
  props: {
    section: { type: String, required: true }
  },
  data() {
    return {
      records: [],
      colleges: [],
      departments: [],
      offices: [],
      search: '',
      statusFilter: 'all',
      showModal: false,
      editing: false,
      saving: false,
      errorMessage: '',
      form: this.emptyForm()
    }
  },
  computed: {
    pageTitle() {
      if (this.section === 'colleges') return 'Colleges'
      if (this.section === 'departments') return 'Departments'
      return 'Responsibility Centers'
    },
    singularLabel() {
      if (this.section === 'colleges') return 'College'
      if (this.section === 'departments') return 'Department'
      return 'Responsibility Center'
    },
    codeField() {
      if (this.section === 'colleges') return 'college_code'
      if (this.section === 'departments') return 'department_code'
      return 'rc_code'
    },
    nameField() {
      if (this.section === 'colleges') return 'college_name'
      if (this.section === 'departments') return 'department_name'
      return 'rc_name'
    },
    codeLabel() {
      return this.section === 'responsibility-centers' ? 'Responsibility Center Code' : this.singularLabel + ' Code'
    },
    nameLabel() {
      return this.section === 'responsibility-centers' ? 'Responsibility Center Name' : this.singularLabel + ' Name'
    },
    pageDescription() {
      if (this.section === 'colleges') return 'Manage the colleges in the university.'
      if (this.section === 'departments') return 'Manage departments and connect each one to its college.'
      return 'Manage responsibility center codes and their assigned organizational units.'
    },
    filteredRecords() {
      let rows = this.records.filter(record => {
        const activeMatch = this.statusFilter === 'all' ||
          (this.statusFilter === 'active' && record.is_active) ||
          (this.statusFilter === 'inactive' && !record.is_active)
        const text = this.search.toLowerCase().trim()
        const searchMatch = !text ||
          String(record[this.codeField] || '').toLowerCase().includes(text) ||
          String(record[this.nameField] || '').toLowerCase().includes(text)
        return activeMatch && searchMatch
      })
      return rows
    }
  },
  watch: {
    section() {
      this.form = this.emptyForm()
      this.search = ''
      this.loadData()
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    emptyForm() {
      return {
        id: null, college_code: '', college_name: '',
        department_code: '', department_name: '', college_id: '',
        rc_code: '', rc_name: '', unit_type: '',
        office_id: '', department_id: ''
      }
    },
    async request(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
          ...(options.headers || {})
        }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Request failed')
      return data
    },
    async loadData() {
      try {
        const results = await Promise.all([
          this.request('/api/organization/' + this.section),
          this.request('/api/organization/colleges'),
          this.request('/api/organization/departments'),
          this.request('/api/offices')
        ])
        this.records = results[0]
        this.colleges = results[1]
        this.departments = results[2]
        this.offices = results[3]
      } catch (error) {
        this.errorMessage = error.message
        this.$emit('show-error', error.message)
      }
    },
    assignedUnit(record) {
      if (record.colleges?.college_name) return record.colleges.college_name
      if (record.departments?.department_name) return record.departments.department_name
      if (record.offices?.office_name) return record.offices.office_name
      return 'Not assigned'
    },
    openAddModal() {
      this.editing = false
      this.errorMessage = ''
      this.form = this.emptyForm()
      this.showModal = true
    },
    editRecord(record) {
      this.editing = true
      this.errorMessage = ''
      this.form = { ...this.emptyForm(), ...record }
      if (this.section === 'responsibility-centers') {
        if (record.college_id) this.form.unit_type = 'college'
        else if (record.department_id) this.form.unit_type = 'department'
        else if (record.office_id) this.form.unit_type = 'office'
      }
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.errorMessage = ''
    },
    async saveRecord() {
      this.saving = true
      this.errorMessage = ''
      try {
        const payload = { ...this.form }
        if (this.section === 'responsibility-centers') {
          if (payload.unit_type !== 'college') payload.college_id = null
          if (payload.unit_type !== 'department') payload.department_id = null
          if (payload.unit_type !== 'office') payload.office_id = null
          if (payload.unit_type === 'college' && !payload.college_id) throw new Error('Please select a college.')
          if (payload.unit_type === 'department' && !payload.department_id) throw new Error('Please select a department.')
          if (payload.unit_type === 'office' && !payload.office_id) throw new Error('Please select an office.')
        }
        delete payload.unit_type
        const url = '/api/organization/' + this.section + (this.editing ? '/' + this.form.id : '')
        await this.request(url, {
          method: this.editing ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        })
        this.closeModal()
        await this.loadData()
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.saving = false
      }
    },
    async toggleStatus(record) {
      const action = record.is_active ? 'deactivate' : 'activate'
      if (!confirm('Are you sure you want to ' + action + ' this record?')) return
      try {
        await this.request('/api/organization/' + this.section + '/' + record.id, {
          method: 'PUT',
          body: JSON.stringify({ ...record, is_active: !record.is_active })
        })
        await this.loadData()
      } catch (error) {
        alert(error.message)
      }
    }
  }
}
</script>