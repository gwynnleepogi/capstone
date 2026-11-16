
<template>
  <div class="login-page">
    <main class="login-shell">
      <section class="login-visual" aria-label="Property Inventory">
        <div class="visual-circle">
          <div class="logo-medallion">
            <img src="../assets/LOGO.png" alt="NVSU logo">
          </div>
        </div>

        <div class="visual-copy">
          <span class="visual-kicker">NVSU PROPERTY INVENTORY</span>
          <h2>Welcome to<br>your workspace.</h2>
          <p>One place to manage university property with confidence.</p>
        </div>
      </section>

      <section class="login-panel">
        <header class="form-heading">

          <h1>
            {{
              signupComplete
                ? 'Request submitted'
                : signUpMode
                  ? 'Request an account'
                  : loginStep === 1
                    ? 'Welcome back'
                    : loginStep === 3
                      ? 'Set a new password'
                      : loginStep === 4
                        ? 'Request password reset'
                        : 'Sign in to continue'
            }}
          </h1>

          <p>
            {{
              signupComplete
                ? 'Your account will be available after administrator approval.'
                : signUpMode
                  ? 'Submit your employee details for administrator approval.'
                  : loginStep === 1
                    ? 'Choose your personnel type to get started.'
                    : loginStep === 3
                      ? 'Your temporary password must be changed before continuing.'
                      : loginStep === 4
                        ? 'Enter your registered email and Employee ID. The administrator will review your request.'
                        : 'Enter your account details below.'
            }}
          </p>
        </header>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <template v-if="signupComplete">
            <div class="signup-success">
              <i class="bi bi-check-circle-fill"></i>
              <strong>Request received</strong>
              <span>Save this temporary password. You can use it after an administrator approves your request.</span>
            </div>

            <div class="field">
              <label for="temporary-password">Your temporary password</label>
              <div class="input-wrap">
                <i class="bi bi-key"></i>
                <input id="temporary-password" :value="signupPassword" type="text" readonly>
              </div>
              <button type="button" class="text-button copy-password" @click="copySignupPassword">
                <i class="bi bi-clipboard"></i>
                Copy password
              </button>
            </div>

            <button type="button" class="primary-button" @click="finishSignup">
              Return to sign in
              <i class="bi bi-arrow-right"></i>
            </button>
          </template>

          <template v-else-if="signUpMode">
            <div class="field">
              <label for="signup-email">Email address</label>
              <div class="input-wrap">
                <i class="bi bi-envelope"></i>
                <input id="signup-email" v-model.trim="signupForm.email" type="email" autocomplete="email" required>
              </div>
            </div>

            <div class="field">
              <label for="signup-employee-id">Employee ID</label>
              <div class="input-wrap">
                <i class="bi bi-person-vcard"></i>
                <input id="signup-employee-id" v-model.trim="signupForm.employee_id" type="text" autocomplete="off" required>
              </div>
            </div>

            <div class="field">
              <label for="signup-name">Full name</label>
              <div class="input-wrap">
                <i class="bi bi-person"></i>
                <input id="signup-name" v-model.trim="signupForm.full_name" type="text" autocomplete="name" required>
              </div>
            </div>

            <div class="field">
              <label for="signup-role">Personnel type</label>
              <div class="input-wrap">
                <i class="bi bi-people"></i>
                <select id="signup-role" v-model="signupForm.role" required @change="clearSignupJobTitle">
                  <option value="" disabled>Select personnel type</option>
                  <option value="Teacher">Teaching</option>
                  <option value="Non-Teaching Staff">Non-Teaching</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="signup-department">Department</label>
              <div class="input-wrap searchable-select">
                <i class="bi bi-building"></i>
                <input
                  id="signup-department"
                  v-model="officeSearch"
                  type="text"
                  placeholder="Search or select an office"
                  autocomplete="off"
                  required
                  aria-autocomplete="list"
                  :aria-expanded="showOfficeOptions"
                  @focus="showOfficeOptions = true"
                  @input="onOfficeSearch"
                  @keydown.esc="showOfficeOptions = false"
                  @blur="hideOfficeOptions"
                >

                <div
                  v-if="showOfficeOptions"
                  class="job-title-options"
                  role="listbox"
                >
                  <div v-if="officesLoading" class="no-job-title-results">
                    Loading offices...
                  </div>
                  <button
                    v-for="office in filteredSignupOffices"
                    :key="office.id"
                    type="button"
                    role="option"
                    :aria-selected="signupForm.department === office.office_name"
                    @mousedown.prevent="selectSignupOffice(office)"
                  >
                    {{ office.office_name }}
                  </button>
                  <button
                    v-if="officeSearch.trim() && !signupOffices.some(office => office.office_name.toLowerCase() === officeSearch.trim().toLowerCase())"
                    type="button"
                    role="option"
                    :aria-selected="signupForm.department === officeSearch.trim()"
                    @mousedown.prevent="selectSignupDepartment(officeSearch)"
                  >
                    Use “{{ officeSearch.trim() }}” as a new department
                  </button>
                  <div
                    v-if="!officesLoading && !filteredSignupOffices.length && !officeSearch.trim()"
                    class="no-job-title-results"
                  >
                    {{ signupOfficesLoaded ? 'No offices are available.' : 'Office list is unavailable.' }}
                  </div>
                </div>
              </div>
              <small class="field-hint">Select an existing office or enter a new department. New departments are added after admin approval.</small>
            </div>

            <div v-if="!isCustomSignupTitle" class="field">
              <label for="signup-title">Job title</label>
              <div class="input-wrap searchable-select">
                <i class="bi bi-briefcase"></i>
                <input
                  id="signup-title"
                  v-model="jobTitleSearch"
                  type="text"
                  placeholder="Search or select job title"
                  autocomplete="off"
                  :disabled="!signupForm.role"
                  aria-autocomplete="list"
                  :aria-expanded="showJobTitleOptions"
                  @focus="showJobTitleOptions = true"
                  @input="onJobTitleSearch"
                  @keydown.esc="showJobTitleOptions = false"
                  @blur="hideJobTitleOptions"
                >

                <div
                  v-if="showJobTitleOptions && signupForm.role"
                  class="job-title-options"
                  role="listbox"
                >
                  <button
                    v-for="position in filteredSignupPositions"
                    :key="position"
                    type="button"
                    role="option"
                    :aria-selected="signupForm.job_title === position"
                    @mousedown.prevent="selectJobTitle(position)"
                  >
                    {{ position }}
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    @mousedown.prevent="selectOtherJobTitle"
                  >
                    Others
                  </button>

                  <div v-if="filteredSignupPositions.length === 0" class="no-job-title-results">
                    No matching job titles found.
                  </div>
                </div>
              </div>
              <small class="field-hint">Type to search, then select a job title from the list.</small>
            </div>

            <div v-else class="field">
              <label for="signup-custom-title">Other job title</label>
              <div class="input-wrap">
                <i class="bi bi-briefcase"></i>
                <input
                  id="signup-custom-title"
                  v-model.trim="customSignupTitle"
                  type="text"
                  autocomplete="organization-title"
                  placeholder="Enter your job title"
                  maxlength="120"
                  required
                >
              </div>
              <button type="button" class="text-button mt-1" @click="returnToSignupTitleList">
                <i class="bi bi-arrow-left"></i>
                Choose from the title list
              </button>
              <small class="field-hint">The administrator will review this title before it is added to the list.</small>
            </div>

            <button type="submit" class="primary-button" :disabled="loading">
              {{ loading ? 'Submitting...' : 'Submit account request' }}
              <i v-if="!loading" class="bi bi-arrow-right"></i>
            </button>

            <button type="button" class="text-button" @click="cancelSignup">
              <i class="bi bi-arrow-left"></i>
              Back to sign in
            </button>
          </template>

          <template v-else-if="loginStep === 1">
            <div class="section-heading">
              <h2>Choose personnel type</h2>
              <span>Select the account you use at NVSU</span>
            </div>

            <div class="role-options">
              <button
                type="button"
                class="role-button"
                :class="{ selected: preferredRole === 'Administrator' }"
                :aria-pressed="preferredRole === 'Administrator'"
                @click="selectRole('Administrator')"
              >
                <span class="role-icon">
                  <i class="bi bi-person-gear"></i>
                </span>
                <span class="role-label">Administrator</span>
                <i class="bi bi-check-circle-fill role-check"></i>
              </button>

              <button
                type="button"
                class="role-button"
                :class="{ selected: preferredRole === 'Teacher' }"
                :aria-pressed="preferredRole === 'Teacher'"
                @click="selectRole('Teacher')"
              >
                <span class="role-icon">
                  <i class="bi bi-mortarboard"></i>
                </span>
                <span class="role-label">Teaching Staff</span>
                <i class="bi bi-check-circle-fill role-check"></i>
              </button>

              <button
                type="button"
                class="role-button"
                :class="{ selected: preferredRole === 'Non-Teaching Staff' }"
                :aria-pressed="preferredRole === 'Non-Teaching Staff'"
                @click="selectRole('Non-Teaching Staff')"
              >
                <span class="role-icon">
                  <i class="bi bi-people"></i>
                </span>
                <span class="role-label">Non-Teaching Staff</span>
                <i class="bi bi-check-circle-fill role-check"></i>
              </button>
            </div>

            <button
              type="button"
              class="primary-button"
              :disabled="!preferredRole"
              @click="continueToLogin"
            >
              Continue
              <i class="bi bi-arrow-right"></i>
            </button>
          </template>

          <template v-else-if="loginStep === 2">
            <div class="selected-role">
              <span>
                <i class="bi bi-shield-check"></i>
                Signing in as
              </span>
              <strong>{{ preferredRole }}</strong>
            </div>

            <div class="field">
              <label for="login-email">Email address</label>

              <div class="input-wrap">
                <i class="bi bi-envelope"></i>
                <input
                  id="login-email"
                  v-model="email"
                  type="email"
                  autocomplete="username"
                  placeholder="you@example.com"
                  required
                >
              </div>
            </div>

            <div class="field">
              <label for="login-password">Password</label>

              <div class="input-wrap">
                <i class="bi bi-lock"></i>
                <input
                  id="login-password"
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  required
                >
              </div>
            </div>

            <button
              type="submit"
              class="primary-button"
              :disabled="loading"
            >
              {{ loading ? 'Please wait...' : 'Sign In' }}
              <i v-if="!loading" class="bi bi-arrow-right"></i>
            </button>

            <button type="button" class="text-button" @click="openForgotPassword">
              Forgot Password?
            </button>

            <button
              type="button"
              class="text-button"
              @click="goBackToRoles"
            >
              <i class="bi bi-arrow-left"></i>
              Change personnel type
            </button>
          </template>

          <template v-else-if="loginStep === 4">
            <div class="field">
              <label for="reset-email">Registered email address</label>
              <div class="input-wrap">
                <i class="bi bi-envelope"></i>
                <input id="reset-email" v-model.trim="resetForm.email" type="email" autocomplete="email" required placeholder="you@example.com">
              </div>
            </div>
            <div class="field">
              <label for="reset-employee-id">Employee ID</label>
              <div class="input-wrap">
                <i class="bi bi-person-vcard"></i>
                <input id="reset-employee-id" v-model.trim="resetForm.employee_id" type="text" autocomplete="off" required>
              </div>
            </div>
            <button type="submit" class="primary-button" :disabled="loading">
              {{ loading ? 'Submitting...' : 'Submit reset request' }}
              <i v-if="!loading" class="bi bi-arrow-right"></i>
            </button>
            <button type="button" class="text-button" @click="loginStep = 2">Back to sign in</button>
            <p v-if="resetSubmitted" class="text-success small mt-2">{{ resetSubmitted }}</p>
          </template>

          <template v-else-if="loginStep === 3">
            <div class="field">
              <label for="new-password">New password</label>
              <div class="input-wrap">
                <i class="bi bi-lock"></i>
                <input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required>
              </div>
              <small class="field-hint">Use at least 8 characters.</small>
            </div>

            <div class="field">
              <label for="confirm-password">Confirm new password</label>
              <div class="input-wrap">
                <i class="bi bi-lock-fill"></i>
                <input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required>
              </div>
            </div>

            <button type="submit" class="primary-button" :disabled="loading">
              {{ loading ? 'Updating...' : 'Change password and continue' }}
              <i v-if="!loading" class="bi bi-arrow-right"></i>
            </button>

            <button type="button" class="text-button" @click="signOutPasswordChange">
              <i class="bi bi-box-arrow-left"></i>
              Sign out
            </button>
          </template>
        </form>

        <button
          v-if="!signUpMode && !signupComplete && loginStep === 1"
          type="button"
          class="text-button signup-link"
          @click="openSignup"
        >
          Need an account? Request one
        </button>

        <footer class="login-footer">
          <i class="bi bi-lock-fill"></i>
          Your account is protected by NVSU secure access.
        </footer>
      </section>
    </main>
  </div>
</template>

<script>
import { positionsForRole } from '@/data/positions'

export default {
  name: 'Login',

  data() {
    return {
      email: '',
      password: '',
      preferredRole: '',
      loginStep: 1,
      loading: false,
      signUpMode: false,
      signupComplete: false,
      signupPassword: '',
      jobTitleSearch: '',
      showJobTitleOptions: false,
      customSignupTitle: '',
      isCustomSignupTitle: false,
      approvedSignupPositions: [],
      signupOffices: [],
      officeSearch: '',
      showOfficeOptions: false,
      officesLoading: false,
      signupOfficesLoaded: false,
      signupForm: {
        email: '',
        employee_id: '',
        full_name: '',
        role: '',
        department: '',
        job_title: ''
      },
      newPassword: '',
      confirmPassword: '',
      resetForm: { email: '', employee_id: '' },
      resetSubmitted: ''
    }
  },

  mounted() {
    if (localStorage.getItem('mustChangePassword') === 'true') {
      this.loginStep = 3
    }
  },

  computed: {
    availableSignupPositions() {
      return [...new Set([
        ...positionsForRole(this.signupForm.role),
        ...this.approvedSignupPositions
      ])].sort((first, second) =>
        first.localeCompare(second, undefined, { sensitivity: 'base' })
      )
    },

    filteredSignupPositions() {
      const search = this.jobTitleSearch.trim().toLowerCase()

      if (!search) {
        return this.availableSignupPositions
      }

      return this.availableSignupPositions.filter(position =>
        position.toLowerCase().includes(search)
      )
    },

    filteredSignupOffices() {
      const search = this.officeSearch.trim().toLowerCase()

      if (!search) {
        return this.signupOffices
      }

      return this.signupOffices.filter(office =>
        office.office_name.toLowerCase().includes(search)
      )
    }
  },

  methods: {
    handleSubmit() {
      if (this.signUpMode) {
        return this.submitSignup()
      }

      if (this.loginStep === 3) {
        return this.changeTemporaryPassword()
      }

      if (this.loginStep === 4) {
        return this.submitPasswordReset()
      }

      return this.login()
    },

    openForgotPassword() {
      this.resetForm.email = this.email || ''
      this.resetForm.employee_id = ''
      this.resetSubmitted = ''
      this.loginStep = 4
    },

    async submitPasswordReset() {
      this.loading = true
      this.resetSubmitted = ''
      try {
        const response = await fetch('/api/password-resets/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.resetForm)
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to submit request')
        this.resetSubmitted = result.message || 'Request submitted for administrator review.'
        this.resetForm.employee_id = ''
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message || 'Unable to submit request' }))
      } finally {
        this.loading = false
      }
    },

    openSignup() {
      this.signUpMode = true
      if (!this.signupOfficesLoaded) {
        this.loadSignupOffices()
      }
      this.$nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    },

    async loadSignupOffices() {
      this.officesLoading = true

      try {
        const response = await fetch('/api/auth/signup-offices')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load offices')
        }

        this.signupOffices = Array.isArray(result) ? result : []
        this.signupOfficesLoaded = true
      } catch (error) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message || 'Unable to load offices'
          })
        )
      } finally {
        this.officesLoading = false
      }
    },

    async loadApprovedSignupPositions(role) {
      try {
        const response = await fetch(
          `/api/auth/signup-job-titles?role=${encodeURIComponent(role)}`
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load approved job titles')
        }

        if (this.signupForm.role === role) {
          this.approvedSignupPositions = Array.isArray(result) ? result : []
        }
      } catch (error) {
        if (this.signupForm.role === role) {
          this.approvedSignupPositions = []
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: error.message || 'Unable to load approved job titles'
            })
          )
        }
      }
    },

    onOfficeSearch() {
      this.signupForm.department = this.officeSearch.trim()
      this.showOfficeOptions = true
    },

    selectSignupOffice(office) {
      this.signupForm.department = office.office_name
      this.officeSearch = office.office_name
      this.showOfficeOptions = false
    },

    selectSignupDepartment(value) {
      const department = value.trim()
      this.signupForm.department = department
      this.officeSearch = department
      this.showOfficeOptions = false
    },

    hideOfficeOptions() {
      setTimeout(() => {
        this.showOfficeOptions = false
      }, 150)
    },

    clearSignupJobTitle() {
      this.signupForm.job_title = ''
      this.jobTitleSearch = ''
      this.showJobTitleOptions = false
      this.customSignupTitle = ''
      this.isCustomSignupTitle = false
      this.approvedSignupPositions = []
      if (this.signupForm.role) {
        this.loadApprovedSignupPositions(this.signupForm.role)
      }
    },

    onJobTitleSearch() {
      this.signupForm.job_title = ''
      this.showJobTitleOptions = true
    },

    selectJobTitle(position) {
      this.signupForm.job_title = position
      this.jobTitleSearch = position
      this.showJobTitleOptions = false
      this.customSignupTitle = ''
      this.isCustomSignupTitle = false
    },

    selectOtherJobTitle() {
      this.signupForm.job_title = ''
      this.jobTitleSearch = ''
      this.customSignupTitle = ''
      this.isCustomSignupTitle = true
      this.showJobTitleOptions = false
    },

    returnToSignupTitleList() {
      this.signupForm.job_title = ''
      this.customSignupTitle = ''
      this.isCustomSignupTitle = false
      this.jobTitleSearch = ''
    },

    hideJobTitleOptions() {
      setTimeout(() => {
        this.showJobTitleOptions = false
      }, 150)
    },

    cancelSignup() {
      this.signUpMode = false
      this.signupForm = {
        email: '',
        employee_id: '',
        full_name: '',
        role: '',
        department: '',
        job_title: ''
      }
      this.officeSearch = ''
      this.showOfficeOptions = false
      this.jobTitleSearch = ''
      this.showJobTitleOptions = false
      this.customSignupTitle = ''
      this.isCustomSignupTitle = false
      this.approvedSignupPositions = []
      this.$nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    },

    async submitSignup() {
      this.signupForm.department = this.officeSearch.trim()

      if (!this.signupForm.department) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please enter or select a department.'
          })
        )
        return
      }

      const selectedJobTitle = this.isCustomSignupTitle
        ? this.customSignupTitle.trim()
        : this.signupForm.job_title

      if (
        !selectedJobTitle ||
        (!this.isCustomSignupTitle &&
          !this.availableSignupPositions.includes(selectedJobTitle))
      ) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please select or enter a valid job title.'
          })
        )
        return
      }

      this.signupForm.job_title = selectedJobTitle
      this.loading = true

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...this.signupForm
          })
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Unable to submit account request')
        }

        if (!result.temporary_password) {
          throw new Error('The server did not return a temporary password')
        }

        this.signupPassword = result.temporary_password
        this.signupComplete = true
        this.signUpMode = false
      } catch (error) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message || 'Unable to submit account request'
          })
        )
      } finally {
        this.loading = false
      }
    },

    async copySignupPassword() {
      try {
        await navigator.clipboard.writeText(this.signupPassword)
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: 'Temporary password copied' })
        )
      } catch (error) {
        console.error('Password copy failed:', error)
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: 'Unable to copy the password' })
        )
      }
    },

    finishSignup() {
      this.signupComplete = false
      this.signupPassword = ''
      this.cancelSignup()
      this.loginStep = 1
    },

    async changeTemporaryPassword() {
      if (this.newPassword.length < 8) {
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: 'Password must be at least 8 characters' })
        )
        return
      }

      if (this.newPassword !== this.confirmPassword) {
        window.dispatchEvent(
          new CustomEvent('show-toast', { detail: 'Passwords do not match' })
        )
        return
      }

      this.loading = true

      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('accessToken')
          },
          body: JSON.stringify({
            password: this.newPassword,
            refresh_token: localStorage.getItem('refreshToken')
          })
        })
        const result = await response.json()

        if (result.access_token && result.refresh_token) {
          localStorage.setItem('accessToken', result.access_token)
          localStorage.setItem('refreshToken', result.refresh_token)
        }

        if (!response.ok) {
          if (result.reauthentication_required) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('mustChangePassword')
            this.loginStep = 2
            this.password = ''
            this.newPassword = ''
            this.confirmPassword = ''
          }

          throw new Error(result.error || 'Unable to change password')
        }

        if (!result.access_token || !result.refresh_token) {
          throw new Error('The server did not return a valid sign-in session')
        }

        localStorage.setItem('accessToken', result.access_token)
        localStorage.setItem('refreshToken', result.refresh_token)
        localStorage.removeItem('mustChangePassword')
        window.dispatchEvent(
          new CustomEvent('user-updated', {
            detail: JSON.parse(localStorage.getItem('user') || 'null')
          })
        )
        const redirect = this.$route.query.redirect
        const destination =
          typeof redirect === 'string' &&
          redirect.startsWith('/') &&
          !redirect.startsWith('//')
            ? redirect
            : '/'
        await this.$router.push(destination)
      } catch (error) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message || 'Unable to change password'
          })
        )
      } finally {
        this.loading = false
      }
    },

    signOutPasswordChange() {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('mustChangePassword')
      this.loginStep = 1
      this.newPassword = ''
      this.confirmPassword = ''
      this.email = ''
      this.password = ''
    },

    selectRole(role) {
      this.preferredRole = role
    },

    continueToLogin() {
      if (!this.preferredRole) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please choose your personnel type'
          })
        )
        return
      }

      this.loginStep = 2
    },

    goBackToRoles() {
      this.loginStep = 1
      this.email = ''
      this.password = ''
    },

    async login() {
      this.loading = true

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
            preferred_role: this.preferredRole
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Invalid email or password'
          )
        }

        if (!result.access_token || !result.user) {
          throw new Error('Invalid login response from server')
        }

        localStorage.setItem('accessToken', result.access_token)
        if (result.refresh_token) {
          localStorage.setItem('refreshToken', result.refresh_token)
        } else {
          localStorage.removeItem('refreshToken')
        }
        localStorage.setItem('user', JSON.stringify(result.user))

        if (result.must_change_password) {
          localStorage.setItem('mustChangePassword', 'true')
          this.loginStep = 3
          this.password = ''
          this.newPassword = ''
          this.confirmPassword = ''
          return
        }

        localStorage.removeItem('mustChangePassword')

        window.dispatchEvent(
          new CustomEvent('user-updated', {
            detail: result.user
          })
        )

        const redirect = this.$route.query.redirect

        const destination =
          typeof redirect === 'string' &&
          redirect.startsWith('/') &&
          !redirect.startsWith('//')
            ? redirect
            : '/'

        await this.$router.push(destination)
      } catch (error) {
        console.error('Login error:', error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message || 'Unable to sign in'
          })
        )
      } finally {
        this.loading = false
      }
    }
  }
}
</script>


<style scoped>
.login-page {
  --forest: #2f5d3a;
  --green: #2f5d3a;
  --leaf: #4f7f52;
  --gold: #e8c547;
  --mint: #f7f5e8;
  --ink: #26332a;
  --muted: #717a72;

  display: flex;
  align-items: safe center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(16px, 4vw, 48px);
  background: var(--mint);
}

:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  background: #f7f5e8;
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(300px, .88fr) minmax(400px, 1.12fr);
  width: min(960px, 100%);
  margin: auto;
  min-height: min(620px, calc(100dvh - 64px));
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: none;
}

.login-visual {
  position: relative;
  display: flex;
  min-height: 540px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  padding: 42px 38px;
  isolation: isolate;
  background: #2f5d3a;
  color: #fff;
}

.login-visual::before,
.login-visual::after {
  position: absolute;
  z-index: -1;
  border: 1px solid rgba(232, 197, 71, .28);
  border-radius: 50%;
  content: '';
}

.login-visual::before {
  top: 8%;
  left: -36%;
  width: 138%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, .055);
}

.login-visual::after {
  top: 17%;
  left: -23%;
  width: 112%;
  aspect-ratio: 1;
  border-color: rgba(232, 197, 71, .22);
}

.visual-circle {
  position: relative;
  display: grid;
  width: min(100%, clamp(230px, 25vw, 310px));
  flex: 0 0 auto;
  margin: auto 0;
  aspect-ratio: 1;
  place-items: center;
  border: 2px solid rgba(232, 197, 71, .76);
  border-radius: 50%;
  background: rgba(255, 255, 255, .08);
}

.logo-medallion {
  display: grid;
  width: 72%;
  aspect-ratio: 1;
  place-items: center;
  border: 4px solid #e8c547;
  border-radius: 50%;
  background: #f7f5e8;
}

.logo-medallion img {
  display: block;
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.visual-copy {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 360px;
  margin-top: 28px;
}

.visual-kicker,
.eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: .16em;
}

.visual-kicker {
  margin-bottom: 14px;
  color: #e8c547;
}

.visual-copy h2 {
  margin: 0;
  font-size: clamp(32px, 3.5vw, 44px);
  font-weight: 700;
  letter-spacing: -.045em;
  line-height: 1.08;
}

.visual-copy p {
  max-width: 310px;
  margin: 17px 0 0;
  color: rgba(255, 255, 255, .76);
  font-size: 15px;
  line-height: 1.65;
}

.login-panel {
  display: flex;
  width: 100%;
  max-width: 560px;
  flex-direction: column;
  justify-content: center;
  align-self: center;
  margin: 0 auto;
  padding: clamp(28px, 4vw, 52px) clamp(28px, 4.5vw, 56px);
  border-radius: 0 16px 16px 0;
  background: #fff;
  box-shadow: 0 10px 28px rgba(47, 93, 58, .1);
}

.form-heading {
  margin-bottom: 26px;
}

.eyebrow {
  margin-bottom: 12px;
  color: var(--leaf);
}

.form-heading h1 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(28px, 3vw, 36px);
  font-weight: 750;
  letter-spacing: -.04em;
  line-height: 1.15;
}

.form-heading p {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  padding: 5px;
  margin-bottom: 26px;
  border: 1px solid #e6e7dc;
  border-radius: 8px;
  background: #f7f5e8;
}

.mode-switch button {
  min-height: 42px;
  padding: 9px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #69736c;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  transition: background .18s ease, color .18s ease;
}

.mode-switch button.active {
  background: #fff;
  color: var(--forest);
  box-shadow: none;
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 0;
}

.section-heading h2 {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
}

.section-heading span {
  color: var(--muted);
  font-size: 12px;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.role-button {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 116px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1px solid #e1e5db;
  border-radius: 12px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  text-align: center;
  transition: border-color .18s ease, background .18s ease;
}

.role-button:hover {
  border-color: #4f7f52;
  background: #fbfcf7;
}

.role-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 10px;
  background: #e6eee6;
  color: var(--green);
  font-size: 18px;
}

.role-label {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.3;
}

.role-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--green);
  opacity: 0;
  transform: scale(.8);
  transition: opacity .18s ease, transform .18s ease;
}

.role-button.selected {
  border-color: #4f7f52;
  background: #eaf2e9;
}

.role-button.selected .role-icon {
  background: #d4e5d4;
  color: var(--forest);
}

.role-button.selected .role-check {
  opacity: 1;
  transform: scale(1);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  min-width: 0;
}

.auth-form label {
  display: block;
  margin: 0 0 7px;
  color: #35453b;
  font-size: 13px;
  font-weight: 650;
}

.input-wrap {
  position: relative;
}

.input-wrap > i {
  position: absolute;
  top: 50%;
  left: 14px;
  color: #809087;
  font-size: 15px;
  pointer-events: none;
  transform: translateY(-50%);
}

.searchable-select {
  position: relative;
}

.searchable-select input {
  padding-right: 38px;
}

.job-title-options {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  z-index: 1000;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #dfe3d9;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, .10);
}

.job-title-options button {
  display: block;
  width: 100%;
  padding: 11px 14px;
  border: 0;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  text-align: left;
}

.job-title-options button:hover,
.job-title-options button[aria-selected="true"] {
  background: #f7f5e8;
}

.no-job-title-results {
  padding: 12px 14px;
  color: var(--muted);
  font-size: 13px;
}

.input-wrap input,
.input-wrap select {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 11px 14px 11px 42px;
  border: 1px solid #dfe3d9;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}

.input-wrap input::placeholder {
  color: #9aa49c;
}

.input-wrap input:focus,
.input-wrap select:focus {
  border-color: #4b8b62;
  background: #fff;
  box-shadow: none;
}

.select-wrap select {
  appearance: none;
  padding-right: 36px;
}

.select-wrap::after {
  position: absolute;
  top: 50%;
  right: 15px;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid #809087;
  border-bottom: 1.5px solid #809087;
  content: '';
  pointer-events: none;
  transform: translateY(-70%) rotate(45deg);
}

.primary-button {
  display: flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
  margin-top: 8px;
  border: 0;
  border-radius: 7px;
  background: #2f5d3a;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  transition: background .18s ease;
}

.primary-button:hover:not(:disabled) {
  background: #244a2e;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.selected-role {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 13px;
  border: 1px solid #e1e5db;
  border-radius: 7px;
  background: #f7f5e8;
  color: var(--forest);
  font-size: 13px;
}

.signup-link {
  display: block;
  margin: 18px auto 0;
  text-align: center;
}

.signup-success {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 18px;
  border: 1px solid #cfe4d2;
  border-radius: 12px;
  background: #f1f8f2;
  color: var(--ink);
  text-align: center;
}

.signup-success > i {
  color: var(--green);
  font-size: 1.8rem;
}

.signup-success span,
.field-hint {
  color: var(--muted);
  font-size: .82rem;
}

.copy-password {
  margin-top: 6px;
}

.selected-role span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #68766b;
}

.selected-role strong {
  text-align: right;
}

.text-button {
  display: block;
  padding: 8px 10px;
  margin: 0 auto;
  border: 0;
  background: transparent;
  color: var(--green);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
}

.text-button:hover {
  color: var(--forest);
  text-decoration: underline;
}

.text-button i {
  margin-right: 5px;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 30px;
  color: #859087;
  font-size: 11px;
  text-align: center;
}

.login-footer i {
  color: var(--leaf);
}

@media (max-width: 850px) {
  .login-page {
    padding: 24px;
  }

  .login-shell {
    grid-template-columns: minmax(220px, .78fr) minmax(0, 1.22fr);
  }

  .login-visual {
    min-height: 500px;
    padding: 34px 26px;
  }

  .login-panel {
    padding: 34px 28px;
  }
}

@media (max-width: 680px) {
  .login-page {
    display: block;
    padding: 0;
    background: #fff;
  }

  .login-shell {
    display: flex;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    flex-direction: column;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: var(--mint);
    box-shadow: none;
  }

  .login-visual {
    min-height: 0;
    flex: 0 0 auto;
    justify-content: center;
    padding: 28px 22px 26px;
  }

  .login-visual::before {
    top: -172px;
    left: 50%;
    width: 390px;
    transform: translateX(-50%);
  }

  .login-visual::after {
    top: -150px;
    left: 50%;
    width: 340px;
    transform: translateX(-50%);
  }

  .visual-circle {
    width: 124px;
    margin: 0;
  }

  .logo-medallion {
    width: 82%;
  }

  .visual-copy {
    margin-top: 16px;
    text-align: center;
  }

  .visual-kicker {
    margin-bottom: 6px;
    font-size: 9px;
  }

  .visual-copy h2 {
    font-size: 24px;
    line-height: 1.08;
  }

  .visual-copy h2 br {
    display: none;
  }

  .visual-copy p {
    margin: 6px auto 0;
    font-size: 12px;
  }

  .login-panel {
    width: min(calc(100% - 32px), 520px);
    flex: 0 0 auto;
    margin: 0 auto 20px;
    padding: 30px 24px 28px;
    border-radius: 0 0 16px 16px;
    background: #fff;
  }

  .form-heading {
    margin-bottom: 20px;
  }

  .mode-switch {
    margin-bottom: 22px;
  }

  .login-footer {
    margin-top: 24px;
  }
}

@media (max-width: 380px) {
  .login-visual {
    padding: 22px 18px;
  }

  .visual-circle {
    width: 108px;
  }

  .login-panel {
    padding: 26px 18px 24px;
  }

  .role-options {
    gap: 8px;
  }

  .role-button {
    min-height: 104px;
    gap: 7px;
    padding: 10px 5px;
  }

  .role-icon {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
    font-size: 16px;
  }

  .role-label {
    font-size: 11px;
  }
}
</style>