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
          <span class="eyebrow">{{ signingUp ? 'GET STARTED' : 'SECURE ACCESS' }}</span>
          <h1>
            {{
              signingUp
                ? 'Create your account'
                : loginStep === 1
                  ? 'Welcome back'
                  : 'Sign in to continue'
            }}
          </h1>
          <p>
            {{
              signingUp
                ? 'Register to access the property inventory system.'
                : loginStep === 1
                  ? 'Choose your personnel type to get started.'
                  : 'Enter your account details below.'
            }}
          </p>
        </header>

        <div class="mode-switch" role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            :aria-selected="!signingUp"
            :class="{ active: !signingUp }"
            @click="switchToLogin"
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="signingUp"
            :class="{ active: signingUp }"
            @click="switchToSignup"
          >
            Sign Up
          </button>
        </div>

        <form class="auth-form" @submit.prevent="login">
          <template v-if="!signingUp && loginStep === 1">
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
                <span class="role-icon"><i class="bi bi-person-gear"></i></span>
                <span class="role-label">Administrator</span>
                <i class="bi bi-check-circle-fill role-check"></i>
              </button>
              <button
                type="button"
                class="role-button"
                :class="{ selected: preferredRole === 'Personnel' }"
                :aria-pressed="preferredRole === 'Personnel'"
                @click="selectRole('Personnel')"
              >
                <span class="role-icon"><i class="bi bi-person-badge"></i></span>
                <span class="role-label">Personnel</span>
                <i class="bi bi-check-circle-fill role-check"></i>
              </button>
              <button
                type="button"
                class="role-button"
                :class="{ selected: preferredRole === 'Teacher' }"
                :aria-pressed="preferredRole === 'Teacher'"
                @click="selectRole('Teacher')"
              >
                <span class="role-icon"><i class="bi bi-mortarboard"></i></span>
                <span class="role-label">Teaching</span>
                <i class="bi bi-check-circle-fill role-check"></i>
              </button>
              <button
                type="button"
                class="role-button"
                :class="{ selected: preferredRole === 'Non-Teaching Staff' }"
                :aria-pressed="preferredRole === 'Non-Teaching Staff'"
                @click="selectRole('Non-Teaching Staff')"
              >
                <span class="role-icon"><i class="bi bi-people"></i></span>
                <span class="role-label">Non-Teaching</span>
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

          <template v-if="!signingUp && loginStep === 2">
            <div class="selected-role">
              <span><i class="bi bi-shield-check"></i> Signing in as</span>
              <strong>{{ preferredRole }}</strong>
            </div>

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

            <button type="submit" class="primary-button" :disabled="loading">
              {{ loading ? 'Please wait...' : 'Sign In' }}
              <i v-if="!loading" class="bi bi-arrow-right"></i>
            </button>
            <button type="button" class="text-button" @click="goBackToRoles">
              <i class="bi bi-arrow-left"></i>
              Change personnel type
            </button>
          </template>

          <template v-if="signingUp">
            <label for="signup-name">Full name</label>
            <div class="input-wrap">
              <i class="bi bi-person"></i>
              <input
                id="signup-name"
                v-model="fullName"
                type="text"
                autocomplete="name"
                placeholder="Enter your full name"
                required
              >
            </div>

            <label for="signup-email">Email address</label>
            <div class="input-wrap">
              <i class="bi bi-envelope"></i>
              <input
                id="signup-email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                required
              >
            </div>

            <label for="signup-password">Password</label>
            <div class="input-wrap">
              <i class="bi bi-lock"></i>
              <input
                id="signup-password"
                v-model="password"
                type="password"
                autocomplete="new-password"
                placeholder="Create a password"
                required
              >
            </div>

            <label for="signup-role">Personnel type</label>
            <div class="input-wrap select-wrap">
              <i class="bi bi-people"></i>
              <select id="signup-role" v-model="role" required>
                <option value="">Choose personnel type</option>
                <option value="Personnel">Personnel</option>
                <option value="Teacher">Teacher</option>
                <option value="Non-Teaching Staff">Non-Teaching Staff</option>
              </select>
            </div>

            <button type="submit" class="primary-button" :disabled="loading">
              {{ loading ? 'Please wait...' : 'Create Account' }}
              <i v-if="!loading" class="bi bi-arrow-right"></i>
            </button>
          </template>
        </form>

        <footer class="login-footer">
          <i class="bi bi-lock-fill"></i>
          Your account is protected by NVSU secure access.
        </footer>
      </section>
    </main>
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
          `/api/auth/${this.signingUp ? 'signup' : 'login'}`,
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

        const redirect = this.$route.query.redirect
        const destination =
          typeof redirect === 'string' &&
          redirect.startsWith('/') &&
          !redirect.startsWith('//')
            ? redirect
            : '/'

        await this.$router.push(destination)
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
  --forest: #2f5d3a;
  --green: #2f5d3a;
  --leaf: #4f7f52;
  --gold: #e8c547;
  --mint: #f7f5e8;
  --ink: #26332a;
  --muted: #717a72;

  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  place-items: center;
  padding: clamp(16px, 4vw, 48px);
  background: #f7f5e8;
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(300px, .88fr) minmax(400px, 1.12fr);
  width: min(960px, 100%);
  min-height: min(620px, calc(100dvh - 64px));
  overflow: hidden;
  border: 1px solid #e6e7dc;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(47, 93, 58, .1);
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
  position: absolute;
  top: 39%;
  left: 50%;
  display: grid;
  width: clamp(200px, 22vw, 270px);
  aspect-ratio: 1;
  place-items: center;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(232, 197, 71, .76);
  border-radius: 50%;
  background: rgba(255, 255, 255, .08);
}

.logo-medallion {
  display: grid;
  width: 60%;
  aspect-ratio: 1;
  place-items: center;
  border: 4px solid #e8c547;
  border-radius: 50%;
  background: #f7f5e8;
}

.logo-medallion img {
  display: block;
  width: 68%;
  height: 68%;
  object-fit: contain;
}

.visual-copy {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 360px;
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
  margin-bottom: 16px;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.role-button {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 66px;
  align-items: center;
  gap: 11px;
  padding: 13px;
  border: 1px solid #e1e5db;
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
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
  border-radius: 8px;
  background: #f7f5e8;
  color: var(--green);
  font-size: 18px;
}

.role-label {
  padding-right: 16px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.3;
}

.role-check {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--green);
  opacity: 0;
  transform: scale(.8);
  transition: opacity .18s ease, transform .18s ease;
}

.role-button.selected {
  border-color: #d4b43e;
  background: #fffdf4;
}

.role-button.selected .role-icon {
  background: var(--gold);
  color: var(--forest);
}

.role-button.selected .role-check {
  opacity: 1;
  transform: scale(1);
}

.auth-form label {
  display: block;
  margin: 16px 0 7px;
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
  margin-top: 24px;
  border: 0;
  border-radius: 7px;
  background: #e8c547;
  color: #2f5d3a;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  transition: background .18s ease;
}

.primary-button:hover:not(:disabled) {
  background: #d9b536;
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
  padding: 10px;
  margin: 8px auto 0;
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
    box-shadow: none;
  }

  .login-visual {
    min-height: 238px;
    flex: 0 0 238px;
    padding: 18px 22px 24px;
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
    top: 78px;
    width: 114px;
    transform: translate(-50%, -50%);
  }

  .logo-medallion {
    width: 76%;
  }

  .visual-copy {
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
    width: min(100%, 520px);
    flex: 1 0 auto;
    padding: 30px 24px 28px;
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
    min-height: 218px;
    flex-basis: 218px;
  }

  .login-panel {
    padding: 26px 18px 24px;
  }

  .role-options {
    gap: 8px;
  }

  .role-button {
    min-height: 70px;
    gap: 8px;
    padding: 10px 8px;
  }

  .role-icon {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
    font-size: 16px;
  }

  .role-label {
    font-size: 12px;
  }
}
</style>