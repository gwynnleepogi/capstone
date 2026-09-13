<template>
  <div>
    <h1>Login</h1>

    <form @submit.prevent="login">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
      >

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
      >

      <select v-model="role" required>
        <option value="">Choose your role</option>
        <option value="Administrator">Administrator</option>
        <option value="Personnel">Personnel</option>
        <option value="Teacher">Teacher</option>
        <option value="Non-Teaching Staff">Non-Teaching Staff</option>
      </select>

      <button type="submit">
        Login
      </button>

      <p v-if="error">
        {{ error }}
      </p>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      password: '',
      role: '',
      error: ''
    }
  },

  methods: {
    async login() {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.email,
              password: this.password,
              role: this.role
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        this.error = result.error
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
    }
  }
}
</script>