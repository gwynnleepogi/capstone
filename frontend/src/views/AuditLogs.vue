<template>
  <div class="login-page">
    <div class="login-box">
      <h1>Property Inventory</h1>
      <p>Sign in to continue</p>

      <form @submit.prevent="login">
        <label>Email</label>

        <input
          v-model="email"
          type="email"
          required
        >

        <label>Password</label>

        <input
          v-model="password"
          type="password"
          required
        >

        <p v-if="error" class="text-danger">
          {{ error }}
        </p>

        <button type="submit">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: ''
    }
  },

  methods: {
    async login() {
      this.loading = true
      this.error = ''

      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            email: this.email,
            password: this.password
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        this.error = result.error
        this.loading = false
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

      this.$router.push('/')

      this.loading = false
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

.login-box input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.login-box button {
  width: 100%;
  margin-top: 20px;
  padding: 10px;
  border: none;
  border-radius: 5px;
  background: #2f5d3a;
  color: white;
}
</style>