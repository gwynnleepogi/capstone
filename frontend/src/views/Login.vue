<template>
  <div class="login-page">
    <div class="login-box">
      <h1>Property Inventory</h1>

      <p>
        {{
          signingUp
            ? 'Create an account'
            : loginStep === 1
              ? 'Choose your personnel type'
              : 'Sign in to continue'
        }}
      </p>

      <div class="mode-switch">
        <button
          type="button"
          :class="{ active: !signingUp }"
          @click="switchToLogin"
        >
          Sign In
        </button>

        <button
          type="button"
          :class="{ active: signingUp }"
          @click="switchToSignup"
        >
          Sign Up
        </button>
      </div>

      <form @submit.prevent="login">
        <template v-if="!signingUp && loginStep === 1">
          <label>Choose Personnel Type</label>

          <div class="role-options">
            <button
              type="button"
              class="role-button"
              :class="{ selected: preferredRole === 'Administrator' }"
              @click="selectRole('Administrator')"
            >
              <i class="bi bi-person-badge"></i>
              <span>Administrator</span>
            </button>

            <button
              type="button"
              class="role-button"
              :class="{ selected: preferredRole === 'Personnel' }"
              @click="selectRole('Personnel')"
            >
              <i class="bi bi-person"></i>
              <span>Personnel</span>
            </button>

            <button
              type="button"
              class="role-button"
              :class="{ selected: preferredRole === 'Teacher' }"
              @click="selectRole('Teacher')"
            >
              <i class="bi bi-mortarboard"></i>
              <span>Teaching</span>
            </button>

            <button
              type="button"
              class="role-button"
              :class="{ selected: preferredRole === 'Non-Teaching Staff' }"
              @click="selectRole('Non-Teaching Staff')"
            >
              <i class="bi bi-people"></i>
              <span>Non-Teaching</span>
            </button>
          </div>

          <button
            type="button"
            class="continue-button"
            :disabled="!preferredRole"
            @click="continueToLogin"
          >
            Continue
          </button>
        </template>

        <template v-if="!signingUp && loginStep === 2">
          <div class="selected-role">
            <span>Personnel Type:</span>
            <strong>{{ preferredRole }}</strong>
          </div>

          <label>Email</label>

          <input
            v-model="email"
            type="email"
            placeholder="Enter your Gmail"
            required
          >

          <label>Password</label>

          <input
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
          >

          <button
            type="submit"
            :disabled="loading"
          >
            {{ loading ? 'Please wait...' : 'Login' }}
          </button>

          <button
            type="button"
            class="back-button"
            @click="goBackToRoles"
          >
            Back to Personnel Types
          </button>
        </template>

        <template v-if="signingUp">
          <label>Full Name</label>

          <input
            v-model="fullName"
            type="text"
            placeholder="Enter your full name"
            required
          >

          <label>Email</label>

          <input
            v-model="email"
            type="email"
            placeholder="Enter your Gmail"
            required
          >

          <label>Password</label>

          <input
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
          >

          <label>Role</label>

          <select
            v-model="role"
            required
          >
            <option value="">
              Choose role
            </option>

            <option value="Personnel">
              Personnel
            </option>

            <option value="Teacher">
              Teacher
            </option>

            <option value="Non-Teaching Staff">
              Non-Teaching Staff
            </option>
          </select>

          <button
            type="submit"
            :disabled="loading"
          >
            {{ loading ? 'Please wait...' : 'Create Account' }}
          </button>
        </template>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',

  data() {
    return {
      email: '',
      password: '',
      fullName: '',
      role: '',
      signingUp: false,
      preferredRole: '',
      loginStep: 1,
      loading: false,
      error: ''
    }
  },

  methods: {
    switchToLogin() {
      this.signingUp = false
      this.loginStep = 1
      this.email = ''
      this.password = ''
      this.preferredRole = ''
      this.error = ''
    },

    switchToSignup() {
      this.signingUp = true
      this.loginStep = 1
      this.email = ''
      this.password = ''
      this.fullName = ''
      this.role = ''
      this.preferredRole = ''
      this.error = ''
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
      this.error = ''
    },

    async login() {
      this.loading = true
      this.error = ''

      try {
        const response = await fetch(
          `http://localhost:5000/api/auth/${this.signingUp ? 'signup' : 'login'}`,
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body: JSON.stringify(
              this.signingUp
                ? {
                    full_name: this.fullName,
                    email: this.email,
                    password: this.password,
                    role: this.role
                  }
                : {
                    email: this.email,
                    password: this.password,
                    preferred_role: this.preferredRole
                  }
            )
          }
        )

        const result = await response.json()

        if (!response.ok) {
          if (this.signingUp) {
            throw new Error(
              result.error || 'Unable to create account'
            )
          }

          throw new Error('Invalid email or password')
        }

        if (this.signingUp) {
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail:
                result.message ||
                'Account created successfully'
            })
          )

          this.signingUp = false
          this.loginStep = 1
          this.password = ''
          this.role = ''
          this.preferredRole = ''

          return
        }

        localStorage.setItem(
          'accessToken',
          result.access_token
        )

        localStorage.setItem(
          'user',
          JSON.stringify(result.user)
        )

        window.dispatchEvent(
          new CustomEvent('user-updated', {
            detail: result.user
          })
        )

        await this.$router.push('/')
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.signingUp
              ? error.message
              : 'Invalid email or password'
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
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #f7f5e8;
}

.login-box {
  width: min(100%, 400px);
  padding: 30px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.login-box h1 {
  color: #2f5d3a;
  text-align: center;
  margin-bottom: 8px;
}

.login-box p {
  text-align: center;
  color: #6c757d;
  margin-bottom: 20px;
}

.login-box label {
  display: block;
  margin-top: 15px;
  margin-bottom: 5px;
  font-weight: 500;
}

.login-box input,
.login-box select,
.login-box form > button {
  width: 100%;
  padding: 10px;
}

.login-box input,
.login-box select {
  border: 1px solid #ced4da;
  border-radius: 6px;
}

.login-box form > button {
  margin-top: 20px;
  border: 0;
  border-radius: 6px;
  background: #2f5d3a;
  color: white;
  cursor: pointer;
}

.login-box form > button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mode-switch {
  display: flex;
  gap: 8px;
  margin: 20px 0;
}

.mode-switch button {
  width: 100%;
  padding: 10px;
  margin-top: 0;
  border: 0;
  border-radius: 6px;
  background: #d9dfd3;
  color: #2f5d3a;
  cursor: pointer;
}

.mode-switch button.active {
  background: #2f5d3a;
  color: white;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.role-button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid #d9dfd3;
  border-radius: 8px;
  background: #ffffff;
  color: #2f5d3a;
  cursor: pointer;
  text-align: left;
}

.role-button i {
  font-size: 20px;
}

.role-button span {
  font-size: 15px;
}

.role-button:hover {
  background: #f0f4ed;
}

.role-button.selected {
  background: #2f5d3a;
  border-color: #2f5d3a;
  color: white;
}

.continue-button {
  margin-top: 20px !important;
}

.selected-role {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  margin-bottom: 15px;
  border-radius: 6px;
  background: #f0f4ed;
  color: #2f5d3a;
  font-size: 14px;
}

.back-button {
  background: #d9dfd3 !important;
  color: #2f5d3a !important;
  margin-top: 10px !important;
}

@media (max-width: 576px) {
  .login-box {
    padding: 24px;
  }
}
</style>