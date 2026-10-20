<template>
  <router-view v-if="$route.name === 'Login' || $route.meta.public" />

  <div v-else class="layout">

    <div class="mobile-header">
      <div class="mobile-brand">
        <img :src="logo" alt="NVSU logo" class="mobile-brand-logo">
        <h2>Property Inventory</h2>
      </div>

      <button
        class="hamburger"
        type="button"
        aria-label="Toggle navigation"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <i :class="menuOpen ? 'bi bi-x-lg' : 'bi bi-list'"></i>
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

        <button
          type="button"
          class="nav-link scanner-nav-button"
          @click="openQrScanner"
        >
          <i class="bi bi-qr-code-scan"></i>
          Scan Item QR
        </button>

        <router-link
          v-if="canAccess(['Administrator','Personnel',  'Teacher', 'Non-Teaching Staff'])"
          to="/request"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-file-earmark-text"></i>
          Requests
          <span
            v-if="canAccess(['Administrator', 'Personnel']) && pendingRequestCount > 0"
            class="request-count-badge"
            :aria-label="`${pendingRequestCount} pending requests`"
          >
            {{ pendingRequestCount > 99 ? '99+' : pendingRequestCount }}
          </span>
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
          v-if="canAccess(['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'])"
          to="/audit-logs"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-clock-history"></i>
          Audit Logs
        </router-link>

      </nav>

    </aside>

    <ItemQrScanner
      v-if="showQrScanner"
      @close="showQrScanner = false"
      @scanned="openScannedItem"
    />

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
import { defineAsyncComponent } from 'vue'
import logo from './assets/LOGO.png'

const ItemQrScanner = defineAsyncComponent(
  () => import('./components/ItemQrScanner.vue')
)

export default {

  name: 'App',

  components: {
    ItemQrScanner
  },

  data() {
    return {
      logo,
      menuOpen: false,
      currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
      pendingRequestCount: 0,
      showQrScanner: false,
      requestCountTimer: null,
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
    window.addEventListener('item-requests-updated', this.refreshPendingRequestCount)
    this.refreshPendingRequestCount()
    this.requestCountTimer = setInterval(this.refreshPendingRequestCount, 30000)
  },

  beforeUnmount() {
    window.removeEventListener('user-updated', this.handleUserUpdated)
    window.removeEventListener('show-toast', this.handleToast)
    window.removeEventListener('storage', this.handleStorageChange)
    window.removeEventListener('item-requests-updated', this.refreshPendingRequestCount)
    clearInterval(this.requestCountTimer)
  },

  watch: {
    '$route.fullPath'() {
      this.refreshPendingRequestCount()
    }
  },

  methods: {

    handleUserUpdated(event) {
      this.currentUser = event.detail
      this.refreshPendingRequestCount()

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
        this.refreshPendingRequestCount()
      }
    },

    async refreshPendingRequestCount() {
      if (
        !this.canAccess(['Administrator', 'Personnel']) ||
        !localStorage.getItem('accessToken')
      ) {
        this.pendingRequestCount = 0
        return
      }

      try {
        const response = await fetch('/api/item-requests')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load pending request count')
        }

        if (!Array.isArray(data)) {
          throw new Error('The requests response was not a list')
        }

        this.pendingRequestCount = data.filter(request => request.status === 'Pending').length
      } catch (error) {
        console.error('Pending request count error:', error)
      }
    },

    canAccess(roles) {
      return roles.includes(this.currentUser?.role)
    },

    openQrScanner() {
      this.menuOpen = false
      this.showQrScanner = true
    },

    openScannedItem({ id, token }) {
      this.showQrScanner = false
      this.$router.push({
        name: 'PublicItemDetails',
        params: { id },
        query: { token }
      })
    },

    logout() {
      this.currentUser = null
      this.pendingRequestCount = 0
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

:root {
  --ui-zoom: .8;
  --app-forest: #2f5d3a;
  --app-leaf: #4f7f52;
  --app-gold: #e8c547;
  --app-sage: #8dab91;
  --app-alert-red: #b85c50;
  --app-alert-orange: #cf913d;
  --app-deep-red: #874b47;
  --app-status-gray: #858b84;
  --app-cream: #f7f5e8;
  --app-border: #e4e2d8;
  --app-ink: #26332a;
  --app-muted: #717a72;
  --bs-primary: #2f5d3a;
  --bs-primary-rgb: 47, 93, 58;
  --bs-primary-text-emphasis: #1b3823;
  --bs-primary-bg-subtle: #dce8dc;
  --bs-primary-border-subtle: #a8c3aa;
  --bs-success: #2f5d3a;
  --bs-success-rgb: 47, 93, 58;
  --bs-info: var(--app-sage);
  --bs-info-rgb: 141, 171, 145;
  --bs-info-text-emphasis: #385b3d;
  --bs-info-bg-subtle: #e8f0e8;
  --bs-info-border-subtle: #bfd1c1;
  --bs-warning: #e8c547;
  --bs-warning-rgb: 232, 197, 71;
  --bs-warning-text-emphasis: #5c4a0c;
  --bs-warning-bg-subtle: #fbf4d7;
  --bs-warning-border-subtle: #eedb8b;
  --bs-link-color: #2f5d3a;
  --bs-link-hover-color: #1f4129;
  --bs-focus-ring-color: rgba(47, 93, 58, .25);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: #f7f5e8;
}

body {
  font-family: Arial, sans-serif;
  min-height: 125vh;
  min-height: 125dvh;
  overflow-x: hidden;
  background: #f7f5e8;
  zoom: var(--ui-zoom);
}


/* Layout */

.layout {
  display: flex;
  min-height: 125vh;
  min-height: 125dvh;
  align-items: flex-start;
}


/* Sidebar */

.sidebar {
  position: sticky;
  top: 0;
  left: 0;

  width: 250px;
  height: 125vh;
  height: 125dvh;
  min-height: 125vh;
  min-height: 125dvh;

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

.sidebar .scanner-nav-button {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
}

.sidebar .request-count-badge {
  display: inline-flex;
  min-width: 21px;
  height: 21px;
  margin-left: 8px;
  padding: 0 6px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #b85c50;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  vertical-align: middle;
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
  min-height: 125vh;
  min-height: 125dvh;
  padding: clamp(16px, 2vw, 28px);

  background: #F7F5E8;
}

.content .row > * {
  min-width: 0;
}

.content .card,
.content .card-body {
  min-width: 0;
}

.content .card-body {
  padding: 15px;
}

.content .card > .card-header {
  padding: 11px 16px;
}

.content .table th,
.content .table td {
  padding-top: 9px;
  padding-bottom: 9px;
}

.content {
  color: var(--app-ink);
}

.content h1,
.content h2,
.content h3 {
  color: var(--app-forest);
}

.content h1 {
  font-weight: 650;
  letter-spacing: -.025em;
}

.content h2,
.content h3 {
  font-weight: 600;
}

.content .text-muted,
.content .text-secondary {
  color: var(--app-muted) !important;
}

.content .card:not(.modal-content) {
  border-color: var(--app-border) !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

.content .card:not(.modal-content) > .card-header {
  border-color: var(--app-border) !important;
  background-color: #fffdf6 !important;
  color: var(--app-forest);
}

.content .table {
  --bs-table-color: var(--app-ink);
  --bs-table-hover-bg: #fffdf6;
  --bs-table-border-color: #e9e7de;
}

.content .table > thead > tr > th,
.content .table > thead.table-dark > tr > th,
.content .table.table-dark > thead > tr > th {
  border-color: #54785b !important;
  background-color: var(--app-forest) !important;
  color: #fff !important;
}

.content .table > :not(caption) > * > * {
  border-color: #e9e7de;
}

.content .table-hover > tbody > tr:hover > * {
  background-color: #fffdf6;
}

.content .btn-warning {
  border-color: var(--app-gold) !important;
  background-color: var(--app-gold) !important;
  color: var(--app-forest) !important;
}

.content .btn-warning:hover:not(:disabled) {
  border-color: #d9b536 !important;
  background-color: #d9b536 !important;
}

.content .btn-outline-primary {
  --bs-btn-color: var(--app-forest);
  --bs-btn-border-color: var(--app-forest);
  --bs-btn-hover-bg: var(--app-forest);
  --bs-btn-hover-border-color: var(--app-forest);
  --bs-btn-active-bg: var(--app-forest);
  --bs-btn-active-border-color: var(--app-forest);
}

.content .pagination .page-link {
  border-color: var(--app-border);
  color: var(--app-forest) !important;
}

.content .pagination .page-item.active .page-link {
  border-color: var(--app-gold) !important;
  background-color: var(--app-gold) !important;
  color: var(--app-forest) !important;
}

.content .pagination .page-link:focus {
  box-shadow: 0 0 0 .2rem rgba(47, 93, 58, .18);
}

.content .form-control,
.content .form-select,
.content .input-group-text {
  border-color: #dfe3d9;
  border-radius: 7px;
}

.content .form-control:focus,
.content .form-select:focus {
  border-color: var(--app-leaf);
  box-shadow: 0 0 0 .2rem rgba(47, 93, 58, .12);
}

.content .modal-content {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  box-shadow: none;
}

.content .modal-header:not(.bg-success) {
  border-bottom-color: var(--app-border);
  background-color: #fffdf6;
}

.content .modal-header:not(.bg-success) .modal-title {
  color: var(--app-forest);
}

.content .modal-footer {
  border-top-color: var(--app-border);
  background-color: #fffdf6;
}

.content .audit-card {
  border-color: var(--app-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: none;
}

.content .audit-table td {
  padding-top: 10px;
  padding-bottom: 10px;
}

.content .table-toolbar {
  gap: 10px;
  margin-bottom: 14px;
}

.content .audit-table thead th {
  background-color: var(--app-forest);
}

.content .detail-field {
  border-color: var(--app-border);
  border-radius: 6px;
  background-color: #fffdf6;
}

.content .audit-page {
  padding: 0;
}

.content .table-responsive {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.content .table-toolbar {
  flex-wrap: wrap;
}

.content .table-toolbar,
.content .table-footer,
.content .pagination-controls {
  min-width: 0;
}

.content input,
.content select,
.content textarea {
  max-width: 100%;
}

.content button,
.content .btn {
  touch-action: manipulation;
}

.content .modal-dialog {
  max-width: min(500px, calc(100% - 2rem)) !important;
}

.content .modal-dialog.modal-lg,
.content .modal-dialog.modal-xl {
  max-width: min(680px, calc(100% - 2rem)) !important;
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


@media (max-width: 991.98px) {

  .layout {
    display: block;
    min-height: 125vh;
    min-height: 125dvh;
  }

  .mobile-header {
    position: sticky;
    top: 0;

    display: flex;
    align-items: center;
    justify-content: space-between;

    background: #2F5D3A;

    min-height: 60px;
    padding: 10px 18px;

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
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    font-size: 25px;
    cursor: pointer;
  }

  .sidebar {
    position: sticky;
    top: 60px;

    display: none;

    width: 100%;
    height: auto;
    min-height: auto;

    max-height: calc(100vh - 60px);
    max-height: calc(100dvh - 60px);

    padding: 16px 20px 20px;

    overflow-y: auto;

    z-index: 1000;
    box-shadow: 0 12px 20px rgba(0, 0, 0, .16);
  }

  .sidebar.show-menu {
    display: block;
  }

  .sidebar-title {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    column-gap: 12px;
    align-items: center;
    margin-bottom: 18px;
    text-align: left;
  }

  .sidebar-logo {
    grid-row: 1 / span 3;
    width: 46px;
    height: 46px;
    margin: 0;
  }

  .sidebar-title h2 {
    font-size: 17px;
  }

  .sidebar-title small {
    overflow-wrap: anywhere;
  }

  .sidebar nav {
    gap: 4px !important;
  }

  .sidebar .nav-link {
    padding: 10px 12px;
  }

  .content {
    width: 100%;
    min-height: calc(125vh - 60px);
    min-height: calc(125dvh - 60px);
    padding: clamp(16px, 3vw, 26px);
  }

  .content .table-footer {
    gap: 12px;
  }

  .content .pagination-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .content .table-toolbar > * {
    min-width: min(100%, 180px);
  }

  .content .d-flex.justify-content-between {
    flex-wrap: wrap;
    gap: 12px;
  }

  .toast-notification {
    right: 15px;
    bottom: 15px;
    left: 15px;
  }

}


@media (max-width: 575.98px) {

  .mobile-header {
    min-height: 54px;
    padding: 8px 12px;
  }

  .mobile-header h2 {
    font-size: 15px;
  }

  .mobile-brand {
    gap: 7px;
  }

  .mobile-brand-logo {
    width: 32px;
    height: 32px;
  }

  .sidebar {
    top: 54px;
    max-height: calc(125vh - 54px);
    max-height: calc(125dvh - 54px);
  }

  .content {
    min-height: calc(125vh - 54px);
    min-height: calc(125dvh - 54px);
    padding: 14px 12px;
  }

  .content .row.align-items-center > .col-auto {
    flex: 0 0 100%;
    width: 100%;
  }

  .content .row.align-items-center > .col-auto .btn {
    flex: 1 1 auto;
  }

  .content .d-flex.gap-2 {
    flex-wrap: wrap;
  }

  .content :where(h1, h2, h3, h4, h5, p, label, span, strong, a, button) {
    overflow-wrap: anywhere;
  }

  .content :where(.row, .d-flex) > * {
    min-width: 0;
  }

  .content .table-responsive {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }

  .content .table-responsive > .table {
    width: max-content !important;
    min-width: 640px !important;
    table-layout: auto !important;
  }

  .content .table-responsive > .table th,
  .content .table-responsive > .table td {
    white-space: nowrap !important;
    overflow-wrap: normal;
    word-break: normal;
  }

  .content .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .content .table-toolbar > * {
    width: 100%;
    min-width: 0;
  }

  .content .table-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .content .modal-dialog {
    max-width: calc(100% - 1rem) !important;
    margin: .5rem auto;
  }

  .content .modal-dialog.modal-lg,
  .content .modal-dialog.modal-xl {
    max-width: calc(100% - 1rem) !important;
  }

  .content input,
  .content select,
  .content textarea {
    font-size: 16px;
  }

  .content .btn {
    min-height: 40px;
  }

  .toast-notification {
    right: 12px;
    bottom: 12px;
    left: 12px;
    padding: 12px 14px;
  }

}

</style>