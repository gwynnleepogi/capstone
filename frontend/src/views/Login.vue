<template>
  <div class="login-page">
    <div class="login-box">
      <h1>Property Inventory</h1>
      <p>{{ signingUp ? 'Create an account' : 'Sign in to continue' }}</p>

      <div class="mode-switch">
        <button type="button" :class="{ active: !signingUp }" @click="signingUp = false">
          Sign In
        </button>
        <button type="button" :class="{ active: signingUp }" @click="signingUp = true">
          Sign Up
        </button>
      </div>

      <form @submit.prevent="login">
        <template v-if="signingUp">
          <label>Full Name</label>
          <input v-model="fullName" type="text" required>

          <label>Username</label>
          <input v-model="username" type="text" required>
        </template>

        <label>Email</label>
        <input v-model="email" type="email" required>

        <label>Password</label>
        <input v-model="password" type="password" required>

        <template v-if="signingUp">
          <label>Role</label>
          <select v-model="role" required>
            <option value="">Choose role</option>
            <option value="Personnel">Personnel</option>
            <option value="Teacher">Teacher</option>
            <option value="Non-Teaching Staff">Non-Teaching Staff</option>
          </select>
        </template>
        <template v-else>
          <label>Preferred access</label>
          <select v-model="preferredRole" required>
            <option value="">Choose access</option>
            <option value="Administrator">Administrator</option>
            <option value="Personnel">Personnel</option>
            <option value="Teacher">Teacher</option>
            <option value="Non-Teaching Staff">Non-Teaching Staff</option>
          </select>
        </template>

        <p v-if="error" class="text-danger">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Please wait...' : (signingUp ? 'Create Account' : 'Login') }}
        </button>
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
      username: '',
      role: '',
      signingUp: false,
      preferredRole: '',
      loading: false,
      error: ''
    }
  },

  methods: {
    async login() {
      this.loading = true
      this.error = ''

      try {
        const response = await fetch(`http://localhost:5000/api/auth/${this.signingUp ? 'signup' : 'login'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.signingUp
            ? {
                full_name: this.fullName,
                username: this.username,
                email: this.email,
                password: this.password,
                role: this.role
              }
            : {
                email: this.email,
                password: this.password,
                preferred_role: this.preferredRole
              })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Login failed')
        }

        if (this.signingUp) {
          this.error = result.message
          this.signingUp = false
          return
        }

        localStorage.setItem('accessToken', result.access_token)
        localStorage.setItem('user', JSON.stringify(result.user))
        await this.$router.push('/')
      } catch (error) {
        this.error = error.message
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
}

.login-box label {
  display: block;
  margin-top: 15px;
  margin-bottom: 5px;
}

.login-box input,
.login-box select,
.login-box button {
  width: 100%;
  padding: 10px;
}

.login-box button {
  margin-top: 20px;
  border: 0;
  background: #2f5d3a;
  color: white;
  cursor: pointer;
}

.mode-switch {
  display: flex;
  gap: 8px;
  margin: 20px 0;
}

.mode-switch button {
  margin-top: 0;
  background: #d9dfd3;
  color: #2f5d3a;
}

.mode-switch button.active {
  background: #2f5d3a;
  color: white;
}
</style>
