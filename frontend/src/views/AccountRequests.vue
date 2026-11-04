<template>
  <section class="account-requests-page">
    <header class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Account Requests</h1>
        <p class="text-secondary mb-0">Review employee details before creating their account.</p>
      </div>
      <button class="btn btn-outline-success" type="button" @click="loadRequests">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Refresh
      </button>
    </header>

    <div v-if="error" class="alert alert-danger" role="alert">
      {{ error }}
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Personnel Type</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Date Requested</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-5">Loading account requests...</td>
            </tr>
            <tr v-else-if="requests.length === 0">
              <td colspan="8" class="text-center text-secondary py-5">
                There are no pending account requests.
              </td>
            </tr>
            <tr v-for="request in requests" :key="request.id">
              <td>{{ request.employee_id }}</td>
              <td>{{ request.full_name }}</td>
              <td>{{ request.email }}</td>
              <td>{{ request.role === 'Teacher' ? 'Teaching' : request.role }}</td>
              <td>{{ request.department }}</td>
              <td>{{ request.job_title }}</td>
              <td>{{ formatDate(request.created_at) }}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary" type="button" @click="review(request)">
                  <i class="bi bi-eye me-1"></i>
                  Review details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selectedRequest" class="review-backdrop" @click.self="closeReview">
      <section
        class="review-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-review-title"
      >
        <header class="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <h2 id="account-review-title" class="h5 mb-0">
              {{ step === 'edit' ? 'Review account request' : step === 'confirm' ? 'Confirm account details' : 'Reject account request' }}
            </h2>
            <small class="text-secondary">
              {{ step === 'edit' ? 'Review and edit the applicant information before approval.' : 'Check the details carefully before continuing.' }}
            </small>
          </div>
          <button type="button" class="btn-close" aria-label="Close" @click="closeReview"></button>
        </header>

        <form v-if="step === 'edit'" class="card-body" @submit.prevent="saveAndConfirm">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label" for="request-employee-id">Employee ID</label>
              <input id="request-employee-id" v-model.trim="editForm.employee_id" class="form-control" required>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="request-name">Full name</label>
              <input id="request-name" v-model.trim="editForm.full_name" class="form-control" required>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="request-email">Email</label>
              <input id="request-email" v-model.trim="editForm.email" type="email" class="form-control" required>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="request-role">Personnel type</label>
              <select id="request-role" v-model="editForm.role" class="form-select" required @change="clearReviewTitle">
                <option value="Teacher">Teaching</option>
                <option value="Non-Teaching Staff">Non-Teaching</option>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="request-title">Job title</label>
              <select id="request-title" v-model="editTitleSelection" class="form-select" required :disabled="!editForm.role">
                <option value="" disabled>Select a job title</option>
                <option v-for="position in positionsForRole(editForm.role)" :key="position" :value="position">{{ position }}</option>
                <option value="__other__">Others</option>
              </select>
            </div>
            <div v-if="editTitleSelection === '__other__'" class="col-12 col-md-6">
              <label class="form-label" for="request-other-title">Review or enter job title</label>
              <input
                id="request-other-title"
                v-model.trim="otherJobTitle"
                class="form-control"
                required
                maxlength="120"
              >
              <small class="form-text">If approved, this title will be available to future applicants with the same personnel type.</small>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="request-department">Department</label>
              <input
                id="request-department"
                v-model="editForm.department"
                class="form-control"
                required
                @blur="editForm.department = normalizeDepartment(editForm.department)"
              >
            </div>
          </div>
          <div class="d-flex justify-content-between flex-wrap gap-2 mt-4">
            <button type="button" class="btn btn-outline-danger" :disabled="saving" @click="step = 'reject'">
              Reject request
            </button>
            <div class="d-flex gap-2 ms-auto">
              <button type="button" class="btn btn-secondary" :disabled="saving" @click="closeReview">Cancel</button>
              <button type="submit" class="btn btn-success" :disabled="saving">
                {{ saving ? 'Saving...' : 'Continue to approval' }}
              </button>
            </div>
          </div>
        </form>

        <div v-else-if="step === 'confirm'" class="card-body">
          <div class="alert alert-warning">
            Are you sure these are the applicant's correct details? The account will be created with this information. If the department is new, it will be added to the office list during approval.
          </div>
          <dl class="row mb-0">
            <dt class="col-sm-4">Employee ID</dt><dd class="col-sm-8">{{ editForm.employee_id }}</dd>
            <dt class="col-sm-4">Full name</dt><dd class="col-sm-8">{{ editForm.full_name }}</dd>
            <dt class="col-sm-4">Email</dt><dd class="col-sm-8">{{ editForm.email }}</dd>
            <dt class="col-sm-4">Personnel type</dt><dd class="col-sm-8">{{ editForm.role === 'Teacher' ? 'Teaching' : editForm.role }}</dd>
            <dt class="col-sm-4">Department</dt><dd class="col-sm-8">{{ editForm.department }}</dd>
            <dt class="col-sm-4">Job title</dt><dd class="col-sm-8">{{ editForm.job_title }}</dd>
          </dl>
          <div class="d-flex justify-content-between flex-wrap gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="step = 'edit'">
              <i class="bi bi-arrow-left me-1"></i>
              Edit details
            </button>
            <button type="button" class="btn btn-success" :disabled="saving" @click="approve">
              {{ saving ? 'Approving...' : 'Yes, approve and create account' }}
            </button>
          </div>
        </div>

        <div v-else class="card-body">
          <div class="alert alert-danger">
            Reject the account request for <strong>{{ editForm.full_name }}</strong>? The temporary sign-in account will be removed.
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" :disabled="saving" @click="step = 'edit'">Go back</button>
            <button type="button" class="btn btn-danger" :disabled="saving" @click="reject">
              {{ saving ? 'Rejecting...' : 'Confirm rejection' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import { positionsForRole } from '@/data/positions'

export default {
  name: 'AccountRequests',

  data() {
    return {
      requests: [],
      loading: true,
      saving: false,
      error: '',
      selectedRequest: null,
      step: 'edit',
      editForm: {},
      editTitleSelection: '',
      otherJobTitle: ''
    }
  },

  mounted() {
    this.loadRequests()
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

    formatDate(value) {
      return value ? new Date(value).toLocaleString() : '-'
    },

    async loadRequests() {
      this.loading = true
      this.error = ''

      try {
        const response = await fetch('/api/personnel/account-requests')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load account requests')
        }

        this.requests = data
      } catch (error) {
        this.error = error.message || 'Failed to load account requests'
      } finally {
        this.loading = false
      }
    },

    review(request) {
      this.selectedRequest = request
      const standardTitles = positionsForRole(request.role)
      const usesOtherTitle = !standardTitles.includes(request.job_title)
      this.editForm = {
        employee_id: request.employee_id,
        full_name: request.full_name,
        email: request.email,
        role: request.role,
        department: request.department,
        job_title: request.job_title
      }
      this.editTitleSelection = usesOtherTitle ? '__other__' : request.job_title
      this.otherJobTitle = usesOtherTitle ? request.job_title : ''
      this.step = 'edit'
    },

    clearReviewTitle() {
      this.editTitleSelection = ''
      this.otherJobTitle = ''
      this.editForm.job_title = ''
    },

    closeReview() {
      if (this.saving) return
      this.selectedRequest = null
      this.step = 'edit'
    },

    async saveAndConfirm() {
      this.editForm.job_title = this.editTitleSelection === '__other__'
        ? this.otherJobTitle.trim()
        : this.editTitleSelection

      if (!this.editForm.job_title) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Select or enter a job title before continuing.'
        }))
        return
      }

      this.saving = true

      try {
        this.editForm.department = this.normalizeDepartment(this.editForm.department)
        const response = await fetch(
          `/api/personnel/account-requests/${this.selectedRequest.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.editForm)
          }
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to save request details')
        }

        this.editForm = {
          employee_id: result.data.employee_id,
          full_name: result.data.full_name,
          email: result.data.email,
          role: result.data.role,
          department: result.data.department,
          job_title: result.data.job_title
        }
        this.step = 'confirm'
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Failed to save request details'
        }))
      } finally {
        this.saving = false
      }
    },

    async approve() {
      this.saving = true

      try {
        const response = await fetch(
          `/api/personnel/account-requests/${this.selectedRequest.id}/approve`,
          { method: 'POST' }
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to approve account request')
        }

        this.selectedRequest = null
        this.step = 'edit'
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Account created successfully' }))
        window.dispatchEvent(new Event('account-requests-updated'))
        await this.loadRequests()
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Failed to approve account request'
        }))
      } finally {
        this.saving = false
      }
    },

    async reject() {
      this.saving = true

      try {
        const response = await fetch(
          `/api/personnel/account-requests/${this.selectedRequest.id}/reject`,
          { method: 'POST' }
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to reject account request')
        }

        this.selectedRequest = null
        this.step = 'edit'
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Account request rejected' }))
        window.dispatchEvent(new Event('account-requests-updated'))
        await this.loadRequests()
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Failed to reject account request'
        }))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.review-backdrop {
  position: fixed;
  z-index: 1100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  overflow-y: auto;
  background: rgba(15, 25, 18, .55);
}

.review-dialog {
  width: min(720px, 100%);
  max-height: min(90vh, 850px);
  overflow-y: auto;
  box-shadow: 0 16px 50px rgba(0, 0, 0, .22);
}
</style>
