
<template>
  <div class="container-fluid py-3">

    <!-- Page Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">Password Reset Requests</h2>
        <p class="text-muted mb-0">
          Review employee requests to reset their account passwords.
        </p>
      </div>

      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="loadRequests"
        :disabled="loading"
      >
        <i class="bi bi-arrow-clockwise me-1"></i>
        Refresh
      </button>
    </div>

    <!-- Temporary Password -->
    <div v-if="temporaryPassword" class="alert alert-success">
      <div class="fw-semibold mb-1">
        Temporary Password Generated
      </div>

      <p class="mb-2">
        Provide this temporary password to the user through a secure channel.
        It will only be displayed here once.
      </p>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <code class="fs-6 bg-white px-3 py-2 rounded">
          {{ temporaryPassword }}
        </code>

        <button
          class="btn btn-sm btn-success"
          type="button"
          @click="copyTemporaryPassword"
        >
          <i class="bi bi-clipboard me-1"></i>
          Copy
        </button>

        <button
          class="btn btn-sm btn-outline-secondary"
          type="button"
          @click="temporaryPassword = ''"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="pageError" class="alert alert-danger">
      {{ pageError }}
    </div>

    <!-- Requests Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-body">

        <div v-if="loading" class="text-center py-5 text-muted">
          Loading password reset requests...
        </div>

        <div
          v-else-if="requests.length === 0"
          class="text-center py-5 text-muted"
        >
          <i class="bi bi-shield-check fs-2 d-block mb-2"></i>
          No password reset requests found.
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle">

            <thead>
              <tr>
                <th>Employee</th>
                <th>Email</th>
                <th>Employee ID</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th>Reason</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="request in requests"
                :key="request.id"
              >
                <td class="fw-semibold">
                  {{ request.full_name || '—' }}
                </td>

                <td>{{ request.email }}</td>

                <td>{{ request.employee_id }}</td>

                <td>
                  {{ formatDate(request.created_at) }}
                </td>

                <!-- Status -->
                <td>
                  <span
                    class="badge"
                    :class="statusClass(request.status)"
                  >
                    {{ capitalizeStatus(request.status) }}
                  </span>
                </td>

                <!-- Reason only for disapproved requests -->
                <td class="reason-cell">
                  <span v-if="request.status === 'disapproved'">
                    {{ request.reason || '—' }}
                  </span>

                  <span v-else>—</span>
                </td>

                <!-- Action -->
                <td class="text-end">
                  <button
                    v-if="request.status === 'pending'"
                    class="btn btn-sm btn-warning"
                    type="button"
                    @click="openReview(request)"
                  >
                    Review
                  </button>

                  <span v-else class="text-muted small">
                    Reviewed
                  </span>
                </td>

              </tr>
            </tbody>

          </table>
        </div>

      </div>
    </div>

    <!-- Review Modal -->
    <div
      v-if="selectedRequest"
      class="review-backdrop"
      @click.self="closeReview"
    >
      <div class="review-dialog card shadow-lg">

        <!-- Modal Header -->
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Review Password Reset</h5>

          <button
            class="btn-close"
            type="button"
            aria-label="Close"
            @click="closeReview"
            :disabled="reviewing"
          ></button>
        </div>

        <!-- Modal Body -->
        <div class="card-body">

          <p class="mb-1">
            <strong>
              {{ selectedRequest.full_name || selectedRequest.email }}
            </strong>
          </p>

          <p class="text-muted small mb-3">
            {{ selectedRequest.email }}
            · Employee ID: {{ selectedRequest.employee_id }}
          </p>

          <!-- Decision Buttons -->
          <div class="mb-3">
            <label class="form-label">
              Select Action
            </label>

            <div class="d-flex gap-2">

              <button
                type="button"
                class="btn flex-fill"
                :class="decision === 'approved'
                  ? 'btn-success'
                  : 'btn-outline-success'"
                @click="selectDecision('approved')"
                :disabled="reviewing"
              >
                <i class="bi bi-check-circle me-1"></i>
                Approve
              </button>

              <button
                type="button"
                class="btn flex-fill"
                :class="decision === 'disapproved'
                  ? 'btn-danger'
                  : 'btn-outline-danger'"
                @click="selectDecision('disapproved')"
                :disabled="reviewing"
              >
                <i class="bi bi-x-circle me-1"></i>
                Disapprove
              </button>

            </div>
          </div>

          <!-- APPROVAL: NO REASON REQUIRED -->
          <div
            v-if="decision === 'approved'"
            class="alert alert-success mb-0"
          >
            <i class="bi bi-check-circle me-1"></i>
            You are about to approve this password reset request.

            A temporary password will automatically be generated.
          </div>

          <!-- DISAPPROVAL: REASON REQUIRED -->
          <div v-if="decision === 'disapproved'">

            <label
              class="form-label"
              for="review-reason"
            >
              Reason for Disapproval
              <span class="text-danger">*</span>
            </label>

            <textarea
              id="review-reason"
              v-model="reason"
              class="form-control"
              rows="3"
              maxlength="500"
              placeholder="Enter the reason for disapproving this request."
              :disabled="reviewing"
            ></textarea>

            <small class="text-muted">
              A reason is required when disapproving a request.
            </small>

          </div>

          <!-- Validation Error -->
          <div
            v-if="reviewError"
            class="alert alert-danger mt-3 mb-0"
          >
            {{ reviewError }}
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="card-footer bg-white d-flex flex-wrap justify-content-end gap-2">

          <button
            class="btn btn-outline-secondary"
            type="button"
            @click="closeReview"
            :disabled="reviewing"
          >
            Cancel
          </button>

          <button
            class="btn"
            :class="decision === 'disapproved' ? 'btn-danger' : 'btn-success'"
            type="button"
            @click="reviewRequest"
            :disabled="reviewing || !decision"
          >
            <span v-if="reviewing">
              Processing...
            </span>

            <span v-else-if="decision === 'approved'">
              <i class="bi bi-check-circle me-1"></i>
              Confirm Approval
            </span>

            <span v-else-if="decision === 'disapproved'">
              <i class="bi bi-x-circle me-1"></i>
              Confirm Disapproval
            </span>

            <span v-else>
              Select Action
            </span>
          </button>

        </div>

      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'PasswordResetRequests',

  data() {
    return {
      requests: [],
      loading: false,
      reviewing: false,

      selectedRequest: null,

      decision: '',
      reason: '',

      reviewError: '',
      pageError: '',

      temporaryPassword: ''
    }
  },

  mounted() {
    this.loadRequests()
  },

  methods: {

    // Load password reset requests
    async loadRequests() {
      this.loading = true
      this.pageError = ''

      try {
        const response = await fetch('/api/password-resets', {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('accessToken')
          }
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to load requests'
          )
        }

        if (!Array.isArray(result)) {
          throw new Error('Invalid password reset requests response')
        }

        this.requests = result

      } catch (error) {
        this.pageError =
          error.message || 'Unable to load password reset requests.'

      } finally {
        this.loading = false
      }
    },

    // Open review modal
    openReview(request) {
      this.selectedRequest = request
      this.decision = ''
      this.reason = ''
      this.reviewError = ''
    },

    // Select approval or disapproval
    selectDecision(decision) {
      this.decision = decision
      this.reviewError = ''

      // Clear reason when approving
      if (decision === 'approved') {
        this.reason = ''
      }
    },

    // Close review modal
    closeReview() {
      if (this.reviewing) return

      this.selectedRequest = null
      this.decision = ''
      this.reason = ''
      this.reviewError = ''
    },

    // Approve or disapprove request
    async reviewRequest() {

      if (!this.decision) {
        this.reviewError = 'Please select an action.'
        return
      }

      // Require reason only when disapproving
      if (
        this.decision === 'disapproved' &&
        this.reason.trim().length < 5
      ) {
        this.reviewError =
          'Please provide a reason with at least 5 characters.'
        return
      }

      this.reviewing = true
      this.reviewError = ''

      try {
        const reviewedDecision = this.decision

        const response = await fetch(
          '/api/password-resets/' +
          this.selectedRequest.id +
          '/review',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + localStorage.getItem('accessToken')
            },

            body: JSON.stringify({

              decision: reviewedDecision,

              // No reason for approval
              reason: reviewedDecision === 'disapproved'
                ? this.reason.trim()
                : null

            })
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to review request'
          )
        }

        // Show temporary password after approval
        if (
          reviewedDecision === 'approved' &&
          result.temporary_password
        ) {
          this.temporaryPassword = result.temporary_password
        }

        this.selectedRequest = null
        this.decision = ''
        this.reason = ''

        // Reload requests
        await this.loadRequests()

        // Update notification badge in App.vue
        window.dispatchEvent(
          new CustomEvent('password-reset-requests-updated')
        )

        // Show toast if supported by App.vue
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: reviewedDecision === 'approved'
              ? 'Password reset approved'
              : 'Password reset disapproved'
          })
        )

      } catch (error) {
        this.reviewError =
          error.message || 'Unable to review request.'

      } finally {
        this.reviewing = false
      }
    },

    // Copy temporary password
    async copyTemporaryPassword() {
      try {
        await navigator.clipboard.writeText(
          this.temporaryPassword
        )

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Temporary password copied'
          })
        )

      } catch (error) {
        this.pageError = 'Unable to copy temporary password.'
      }
    },

    // Format date
    formatDate(value) {
      return value
        ? new Date(value).toLocaleString()
        : '—'
    },

    // Capitalize status
    capitalizeStatus(status) {
      if (!status) return '—'

      return status.charAt(0).toUpperCase() +
        status.slice(1).toLowerCase()
    },

    // Status badge colors
    statusClass(status) {
      if (status === 'approved') {
        return 'bg-success'
      }

      if (status === 'disapproved') {
        return 'bg-danger'
      }

      return 'bg-warning text-dark'
    }

  }
}
</script>

<style scoped>
.reason-cell {
  min-width: 180px;
  max-width: 260px;
  white-space: normal;
}

.review-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.55);
}

.review-dialog {
  width: min(100%, 560px);
  border: 0;
  border-radius: 12px;
}

@media (max-width: 576px) {
  .review-backdrop {
    padding: 10px;
  }

  .review-dialog {
    width: 100%;
  }
}
</style>
