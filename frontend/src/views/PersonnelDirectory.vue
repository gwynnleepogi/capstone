<template>
  <div class="container-fluid">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Personnel Directory</h1>
        <p class="text-secondary mb-0">Manage employees who may be accountable for university properties. They do not need a system account.</p>
      </div>
      <button class="btn btn-warning" type="button" @click="openAddForm">
        <i class="bi bi-person-plus me-1"></i>Add Personnel
      </button>
    </div>

    <div v-if="showForm" class="card mb-3">
      <div class="card-header bg-white">
        <strong>{{ editingId ? 'Edit Personnel' : 'Add Personnel' }}</strong>
      </div>
      <form @submit.prevent="savePersonnel">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input v-model.trim="form.full_name" class="form-control" required maxlength="160" placeholder="Enter employee full name">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Employee ID</label>
              <input v-model.trim="form.employee_id" class="form-control" maxlength="80" placeholder="Optional">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Job Title / Position</label>
              <input v-model.trim="form.job_title" class="form-control" maxlength="120" placeholder="Optional">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Office / Responsibility Center</label>
              <select v-model="form.office_id" class="form-select">
                <option value="">Select office (optional)</option>
                <option v-for="office in offices" :key="office.id" :value="office.id">{{ office.office_name }}</option>
              </select>
            </div>
          </div>
          <p class="form-text mb-0 mt-3">No email address, password, or system account is needed for this record.</p>
        </div>
        <div class="card-footer bg-white text-end">
          <button type="button" class="btn btn-secondary me-2" @click="cancelForm">Cancel</button>
          <button type="submit" class="btn btn-success" :disabled="saving">{{ saving ? 'Saving...' : (editingId ? 'Update Personnel' : 'Save Personnel') }}</button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header bg-white">
        <div class="row g-2 align-items-center">
          <div class="col"><strong>Directory Records</strong></div>
          <div class="col-12 col-md-5">
            <input v-model="search" class="form-control" placeholder="Search name, employee ID, position, or office">
          </div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Employee ID</th><th>Full Name</th><th>Job Title / Position</th><th>Office</th><th>System Account</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="6" class="text-center py-4">Loading personnel directory...</td></tr>
            <tr v-else-if="filteredPersonnel.length === 0"><td colspan="6" class="text-center text-secondary py-4">No personnel records found.</td></tr>
            <tr v-for="person in filteredPersonnel" :key="person.id">
              <td>{{ person.employee_id || '-' }}</td>
              <td class="fw-semibold">{{ person.full_name }}</td>
              <td>{{ person.job_title || '-' }}</td>
              <td>{{ person.offices?.office_name || '-' }}</td>
              <td><span class="badge bg-secondary">Not required</span></td>
              <td class="text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1" type="button" @click="editPersonnel(person)">Edit</button>
                <button class="btn btn-sm btn-outline-danger" type="button" @click="deletePersonnel(person)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PersonnelDirectory',
  data() {
    return {
      personnel: [],
      offices: [],
      search: '',
      loading: false,
      saving: false,
      showForm: false,
      editingId: null,
      form: { full_name: '', employee_id: '', job_title: '', office_id: '' }
    }
  },
  computed: {
    filteredPersonnel() {
      const term = this.search.trim().toLowerCase()
      return this.personnel.filter(person => {
        const office = person.offices?.office_name || ''
        return !term || [
          person.full_name, person.employee_id, person.job_title, office
        ].some(value => String(value || '').toLowerCase().includes(term))
      })
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async request(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Request failed.')
      return data
    },
    async loadData() {
      this.loading = true
      try {
        const results = await Promise.all([
          this.request('/api/personnel-directory'),
          this.request('/api/offices')
        ])
        this.personnel = results[0]
        this.offices = results[1]
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      } finally {
        this.loading = false
      }
    },
    resetForm() {
      this.form = { full_name: '', employee_id: '', job_title: '', office_id: '' }
      this.editingId = null
    },
    openAddForm() {
      this.resetForm()
      this.showForm = true
    },
    editPersonnel(person) {
      this.form = {
        full_name: person.full_name || '',
        employee_id: person.employee_id || '',
        job_title: person.job_title || '',
        office_id: person.office_id || ''
      }
      this.editingId = person.id
      this.showForm = true
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    cancelForm() {
      this.showForm = false
      this.resetForm()
    },
    async savePersonnel() {
      this.saving = true
      const wasEditing = Boolean(this.editingId)
      try {
        const url = this.editingId
          ? '/api/personnel-directory/' + encodeURIComponent(this.editingId)
          : '/api/personnel-directory'
        const data = await this.request(url, {
          method: this.editingId ? 'PUT' : 'POST',
          body: JSON.stringify(this.form)
        })
        if (wasEditing) {
          this.personnel = this.personnel.map(person => person.id === data.id ? data : person)
        } else {
          this.personnel.push(data)
        }
        this.personnel.sort((a, b) => a.full_name.localeCompare(b.full_name))
        this.cancelForm()
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: wasEditing ? 'Personnel updated successfully.' : 'Personnel added successfully.'
        }))
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      } finally {
        this.saving = false
      }
    },
    async deletePersonnel(person) {
      if (!window.confirm('Delete ' + person.full_name + ' from the personnel directory? Existing property records will keep the saved employee name.')) return
      try {
        await this.request('/api/personnel-directory/' + encodeURIComponent(person.id), { method: 'DELETE' })
        this.personnel = this.personnel.filter(item => item.id !== person.id)
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Personnel record deleted.' }))
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message }))
      }
    }
  }
}
</script>
