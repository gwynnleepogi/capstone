<template>
  <router-view v-if="$route.name === 'Login'" />

  <div v-else class="layout">

    <div class="mobile-header">
      <div class="mobile-brand">
        <img :src="logo" alt="NVSU logo" class="mobile-brand-logo">
        <h2>Property Inventory</h2>
      </div>

      <button class="hamburger" @click="menuOpen = !menuOpen">
        <i class="bi bi-list"></i>
      </button>
    </div>

    <aside class="sidebar" :class="{ 'show-menu': menuOpen }">

      <div class="sidebar-title">
        <img :src="logo" alt="NVSU logo" class="sidebar-logo">
        <h2>Property Inventory</h2>
        <small class="text-white-50">{{ currentUser?.email }}</small>
        <small class="d-block text-white-50">{{ currentUser?.role }}</small>
      </div>

      <button class="btn btn-sm btn-outline-light w-100 mb-3" @click="logout">
        <i class="bi bi-box-arrow-right me-1"></i>
        Sign out
      </button>

      <nav class="d-flex flex-column gap-2">

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-grid"></i>
          Dashboard
        </router-link>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/items"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-box"></i>
          Properties
        </router-link>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/offices"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-building"></i>
          Offices
        </router-link>

        <!--
        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/suppliers"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-truck"></i>
          Suppliers
        </router-link>
        -->

        <router-link
          v-if="canAccess(['Administrator'])"
          to="/personnel"
          class="nav-link"cd f
          @click="menuOpen = false"
        >
          <i class="bi bi-people"></i>
          Personnel
        </router-link>

        <router-link
          v-if="canAccess(['Administrator','Personnel',  'Teacher', 'Non-Teaching Staff'])"
          to="/request"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-file-earmark-text"></i>
          Requests
        </router-link>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/receipts"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-receipt"></i>
          Acquisitions
        </router-link>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/returns-incidents"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-arrow-return-left"></i>
          Returns &amp; Incidents
        </router-link>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/audit-logs"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-clock-history"></i>
          Audit Logs
        </router-link>

      </nav>

    </aside>

    <main class="content">
      <router-view v-slot="{ Component }">
        <Transition name="dashboard-fade" mode="out-in">
          <component
            :is="Component"
            :key="`${$route.fullPath}:${currentUser?.auth_user_id || currentUser?.id || 'guest'}`"
          />
        </Transition>
      </router-view>
    </main>

  </div>

  <Transition name="toast">
    <div v-if="toast.show" class="toast-notification">
      <i class="bi bi-check-circle-fill"></i>
      <span>{{ toast.message }}</span>
    </div>
  </Transition>
</template>


<script>
import logo from './assets/LOGO.png'

export default {

  name: 'App',

  data() {
    return {
      logo,
      menuOpen: false,
      currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
      toast: {
        show: false,
        message: ''
      },
      toastTimer: null
    }
  },

  mounted() {
    window.addEventListener('user-updated', this.handleUserUpdated)
    window.addEventListener('show-toast', this.handleToast)
    window.addEventListener('storage', this.handleStorageChange)
  },

  beforeUnmount() {
    window.removeEventListener('user-updated', this.handleUserUpdated)
    window.removeEventListener('show-toast', this.handleToast)
    window.removeEventListener('storage', this.handleStorageChange)
  },

  methods: {

    handleUserUpdated(event) {
      this.currentUser = event.detail

      this.showToast('Welcome back, ' + event.detail.role + '!')

      if (
        this.$route.meta.roles &&
        !this.$route.meta.roles.includes(event.detail?.role)
      ) {
        const destination =
          event.detail?.role === 'Teacher' ||
          event.detail?.role === 'Non-Teaching Staff'
            ? '/request'
            : '/'

        this.$router.push(destination)
      }
    },

    handleToast(event) {
      this.showToast(event.detail)
    },

    showToast(message) {
      clearTimeout(this.toastTimer)

      this.toast.message = message
      this.toast.show = true

      this.toastTimer = setTimeout(() => {
        this.toast.show = false
      }, 3000)
    },

    handleStorageChange(event) {
      if (event.key === 'user') {
        this.currentUser = JSON.parse(event.newValue || 'null')
      }
    },

    canAccess(roles) {
      return roles.includes(this.currentUser?.role)
    },

    logout() {
      this.currentUser = null
      this.menuOpen = false

      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')

      this.showToast('Logged out successfully')

      this.$router.push('/login')
    }

  }

}
</script>


<style>

/* Global */

/* Display scale: makes 100% browser zoom look like ~90% */

:root {
  --ui-zoom: 1;
}

@media (min-width: 769px) {
  :root {
    --ui-zoom: 0.8;
  }

  html {
    zoom: var(--ui-zoom);
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  min-height: 100%;
}

body {
  font-family: Arial, sans-serif;
  min-height: 100%;
}


/* Layout */

.layout {
  display: flex;
  min-height: calc(100vh / var(--ui-zoom));
  align-items: flex-start;
}


/* Sidebar */

.sidebar {
  position: sticky;
  top: 0;
  left: 0;

  width: 250px;
  height: calc(100vh / var(--ui-zoom));
  min-height: calc(100vh / var(--ui-zoom));

  padding: 25px 15px;

  background: #2F5D3A;

  flex-shrink: 0;

  overflow-y: auto;
  z-index: 1000;
}

.sidebar-title {
  text-align: center;
  margin-bottom: 30px;
}

.sidebar-logo {
  display: block;
  width: 84px;
  height: 84px;
  margin: 0 auto 12px;
  object-fit: contain;
}

.sidebar-title h2 {
  color: white;
  font-size: 20px;
}

.sidebar .nav-link {
  color: white;
  text-decoration: none;
  padding: 11px 15px;
  border-radius: 6px;
  transition: .25s ease;
}

.sidebar .nav-link i {
  margin-right: 10px;
}

.sidebar .nav-link:hover {
  background: #4F7F52;
}

.sidebar .nav-link.router-link-active {
  background: #E8C547;
  color: #2F5D3A;
}


/* Content */

.content {
  flex: 1;
  min-width: 0;
  min-height: calc(100vh / var(--ui-zoom));

  padding: 30px;

  background: #F7F5E8;
}


/* Page Transition */

.dashboard-fade-enter-active,
.dashboard-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.dashboard-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dashboard-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}


/* Mobile Header */

.mobile-header {
  display: none;
}


/* Toast */

.toast-notification {
  position: fixed;
  right: 25px;
  bottom: 25px;

  z-index: 9999;

  display: flex;
  align-items: center;
  gap: 10px;

  padding: 14px 18px;

  background: #2F5D3A;
  color: white;

  border-radius: 8px;

  box-shadow: 0 4px 15px rgba(0, 0, 0, .2);

  font-size: 14px;
}

.toast-notification i {
  color: #E8C547;
  font-size: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity .35s ease, transform .35s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.toast-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.toast-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(15px);
}


/* Mobile */

@media (max-width: 768px) {

  .layout {
    display: block;
    min-height: calc(100vh / var(--ui-zoom));
  }

  .mobile-header {
    position: sticky;
    top: 0;

    display: flex;
    align-items: center;
    justify-content: space-between;

    background: #2F5D3A;

    padding: 12px 15px;

    z-index: 1100;
  }

  .mobile-header h2 {
    color: white;
    font-size: 18px;
    margin: 0;
  }

  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .mobile-brand-logo {
    width: 34px;
    height: 34px;
    object-fit: contain;
  }

  .hamburger {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
  }

  .sidebar {
    position: sticky;
    top: 57px;

    display: none;

    width: 100%;
    height: auto;
    min-height: auto;

    max-height: calc(100vh / var(--ui-zoom) - 57px);

    padding: 15px;

    overflow-y: auto;

    z-index: 1000;
  }

  .sidebar.show-menu {
    display: block;
  }

  .sidebar-title {
    display: none;
  }

  .sidebar nav {
    gap: 5px !important;
  }

  .sidebar .nav-link {
    padding: 10px 12px;
  }

  .content {
    width: 100%;
    min-height: calc(100vh / var(--ui-zoom) - 57px);

    padding: 15px;
  }

  .toast-notification {
    right: 15px;
    bottom: 15px;
    left: 15px;
  }

}


/* Small Phone */

@media (max-width: 480px) {

  .mobile-header {
    padding: 10px 12px;
  }

  .mobile-header h2 {
    font-size: 16px;
  }

  .mobile-brand {
    gap: 7px;
  }

  .mobile-brand-logo {
    width: 30px;
    height: 30px;
  }

  .hamburger {
    font-size: 26px;
  }

  .sidebar {
    top: 49px;
    max-height: calc(100vh / var(--ui-zoom) - 49px);
  }

  .content {
    padding: 12px;
  }

}

</style>