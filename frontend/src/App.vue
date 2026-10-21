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

        <div class="sidebar-user-info">
          <small class="sidebar-email">
            <i class="bi bi-envelope me-1" aria-hidden="true"></i>
            {{ currentUser?.email }}
          </small>
          <span class="sidebar-role">{{ currentUser?.role }}</span>
        </div>
      </div>

      <nav class="sidebar-nav d-flex flex-column">
        <div v-if="canAccess(['Administrator', 'Personnel'])" class="nav-section-label">
          Overview
        </div>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel'])"
          to="/"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-grid"></i>
          Dashboard
        </router-link>

        <div v-if="canAccess(['Administrator', 'Personnel'])" class="nav-section-label">
          Inventory
        </div>

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

        <div v-if="canAccess(['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'])" class="nav-section-label">
          Operations
        </div>

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
          to="/returns"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-arrow-return-left"></i>
          Returns &amp; Incidents
        </router-link>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'])"
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

        <div v-if="canAccess(['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'])" class="nav-section-label">
          Tools
        </div>

        <button
          type="button"
          class="nav-link scanner-nav-button"
          :class="{ active: showQrScanner }"
          :aria-pressed="showQrScanner"
          @click="openQrScanner"
        >
          <i class="bi bi-qr-code-scan"></i>
          Scan Item QR
        </button>

        <router-link
          v-if="canAccess(['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'])"
          to="/audit-logs"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-clock-history"></i>
          Audit Logs
        </router-link>

        <div v-if="canAccess(['Administrator'])" class="nav-section-label">
          Administration
        </div>

        <router-link
          v-if="canAccess(['Administrator'])"
          to="/personnel"
          class="nav-link"
          @click="menuOpen = false"
        >
          <i class="bi bi-people"></i>
          Personnel
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <button
          type="button"
          class="btn btn-sm sidebar-signout w-100"
          @click="logout"
        >
          <i class="bi bi-box-arrow-right"></i>
          <span>Sign out</span>
        </button>
      </div>
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
    clearTimeout(this.toastTimer)
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

        this.pendingRequestCount = data.filter(
          request => request.status === 'Pending'
        ).length
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

    openScannedItem({ id, token, destination }) {
      this.showQrScanner = false

      this.$router.push({
        name: 'Items',
        query: { item: id }
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
:root {
  /* 0.75 = looks like 75% browser zoom while the browser stays at 100% */
  --ui-zoom: .75;
  --app-forest: #4f7f52;
  --app-leaf: #6f9c70;
  --app-gold: #e8c547;
  --app-sage: #8dab91;
  --app-alert-red: #c93640;
  --app-alert-orange: #cf913d;
  --app-deep-red: #874b47;
  --app-status-gray: #858b84;
  --app-cream: #f7f5e8;
  --app-border: #e4e2d8;
  --app-ink: #26332a;
  --app-muted: #717a72;
  --bs-primary: #4f7f52;
  --bs-primary-rgb: 79, 127, 82;
  --bs-primary-text-emphasis: #315535;
  --bs-primary-bg-subtle: #dce8dc;
  --bs-primary-border-subtle: #a8c3aa;
  --bs-success: #4f7f52;
  --bs-success-rgb: 79, 127, 82;
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
  --bs-link-color: #4f7f52;
  --bs-link-hover-color: #315535;
  --bs-focus-ring-color: rgba(79, 127, 82, .25);
}

/* No shrinking on tablet and mobile */
@media (max-width: 991.98px) {
  :root {
    --ui-zoom: 1;
  }
}

* {
  box-sizing: border-box;
}

html {
  zoom: var(--ui-zoom);
  min-height: calc(100% / var(--ui-zoom));
  background: #f7f5e8;
}

body {
  margin: 0;
  padding: 0;
  min-height: calc(100vh / var(--ui-zoom));
  min-height: calc(100dvh / var(--ui-zoom));
  overflow-x: hidden;
  font-family: Arial, sans-serif;
  background: #f7f5e8;
}

/* Main Layout */

.layout {
  display: flex;
  width: 100%;
  min-height: calc(100vh / var(--ui-zoom));
  min-height: calc(100dvh / var(--ui-zoom));
  align-items: stretch;
  padding-left: 270px;
}

/* Sidebar */

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: 270px;
  height: calc(100vh / var(--ui-zoom));
  height: calc(100dvh / var(--ui-zoom));
  min-height: 0;
  padding: 16px 13px;
  overflow: hidden;
  background:
    radial-gradient(
      ellipse at 10% 0%,
      rgba(232, 197, 71, .15),
      transparent 38%
    ),
    linear-gradient(180deg, #75a477 0%, #56845b 100%);
  border-right: 1px solid rgba(255, 255, 255, .2);
}

.sidebar-title {
  flex: 0 0 auto;
  margin: 0 0 14px;
  padding: 14px 10px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 14px;
  background: rgba(255, 255, 255, .1);
}

.sidebar-logo {
  display: block;
  width: 66px;
  height: 66px;
  margin: 0 auto 10px;
  padding: 4px;
  border: 2px solid #e8c547;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .12);
  object-fit: contain;
}

.sidebar-title h2 {
  margin: 0 0 8px;
  color: #fff;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.3px;
}

.sidebar-user-info {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.sidebar-email {
  max-width: 100%;
  color: #fff;
  overflow-wrap: anywhere;
}

.sidebar-role {
  padding: 4px 11px;
  border: 1px solid rgba(255, 255, 255, .35);
  border-radius: 999px;
  background: rgba(255, 255, 255, .14);
  color: #fff8d5;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .05em;
}

/* Sidebar Navigation */

.sidebar-nav {
  flex: 1 1 auto;
  min-height: 0;
  gap: 5px;
  padding: 0 2px 12px 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, .5) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 5px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(255, 255, 255, .5);
}

.sidebar .nav-section-label {
  flex-shrink: 0;
  margin: 8px 10px 2px;
  padding: 8px 2px 4px;
  border-top: 1px solid rgba(255, 255, 255, .25);
  color: #f1f5e9;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.sidebar .nav-link {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 41px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #fff;
  font-size: 14px;
  font-weight: 550;
  text-decoration: none;
  transition:
    background-color .2s ease,
    border-color .2s ease,
    color .2s ease,
    transform .2s ease;
}

.sidebar .nav-link i {
  flex-shrink: 0;
  width: 22px;
  margin-right: 10px;
  color: #edf5e9;
  font-size: 16px;
  text-align: center;
}

.sidebar .nav-link:hover {
  transform: translateX(2px);
  border-color: rgba(255, 255, 255, .2);
  background: rgba(255, 255, 255, .15);
  color: #fff;
}

.sidebar .scanner-nav-button {
  width: 100%;
  flex-shrink: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.sidebar .request-count-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 21px;
  height: 21px;
  margin-left: auto;
  padding: 0 6px;
  border-radius: 999px;
  background: #c93640;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.sidebar .nav-link.router-link-active,
.sidebar .nav-link.active {
  border-color: #e8c547;
  background: linear-gradient(105deg, #f8e28b, #e8c547);
  color: #315535;
  box-shadow: 0 3px 10px rgba(0, 0, 0, .1);
}

.sidebar .nav-link.router-link-active i,
.sidebar .nav-link.active i {
  color: #315535;
}

/* Sign Out at Bottom */

.sidebar-bottom {
  flex: 0 0 auto;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, .3);
}

.sidebar .sidebar-signout {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 45px;
  margin: 0 !important;
  padding: 10px 12px;
  border: 1px solid #f06469;
  border-radius: 9px;
  background: linear-gradient(135deg, #c93640, #a91f2b);
  color: #fff !important;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  box-shadow: 0 4px 10px rgba(116, 14, 24, .15);
  transition:
    background .2s ease,
    transform .2s ease,
    box-shadow .2s ease;
}

.sidebar .sidebar-signout i,
.sidebar .sidebar-signout span {
  display: inline-flex;
  align-items: center;
  margin: 0;
  color: #fff !important;
}

.sidebar .sidebar-signout i {
  flex-shrink: 0;
  font-size: 17px;
}

.sidebar .sidebar-signout:hover,
.sidebar .sidebar-signout:focus-visible,
.sidebar .sidebar-signout:active {
  border-color: #ff8b8f;
  background: linear-gradient(135deg, #e34a53, #bd2935);
  color: #fff !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(116, 14, 24, .25);
}

.sidebar .sidebar-signout:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

/* Main Content */

.content {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: calc(100vh / var(--ui-zoom));
  min-height: calc(100dvh / var(--ui-zoom));
  padding: clamp(16px, 2vw, 28px);
  overflow-x: hidden;
  background: #f7f5e8;
  color: var(--app-ink);
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

/* Cards */

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

/* Tables */

.content .table {
  --bs-table-color: var(--app-ink);
  --bs-table-hover-bg: #fffdf6;
  --bs-table-border-color: #e9e7de;
}

.content .table > thead > tr > th,
.content .table > thead.table-dark > tr > th,
.content .table.table-dark > thead > tr > th {
  border-color: #6f9c70 !important;
  background-color: #6f9c70 !important;
  color: #fff !important;
}

.content .table > :not(caption) > * > * {
  border-color: #e9e7de;
}

.content .table-hover > tbody > tr:hover > * {
  background-color: #fffdf6;
}

.content .table-responsive {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.content .table-responsive > .table {
  max-width: 100%;
}

/* Buttons */

.content .btn-warning {
  border-color: var(--app-gold) !important;
  background-color: var(--app-gold) !important;
  color: #315535 !important;
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

.content .btn {
  touch-action: manipulation;
}

/* Pagination */

.content .pagination .page-link {
  border-color: var(--app-border);
  color: var(--app-forest) !important;
}

.content .pagination .page-item.active .page-link {
  border-color: var(--app-gold) !important;
  background-color: var(--app-gold) !important;
  color: #315535 !important;
}

.content .pagination .page-link:focus {
  box-shadow: 0 0 0 .2rem rgba(79, 127, 82, .18);
}

/* Forms */

.content .form-control,
.content .form-select,
.content .input-group-text {
  border-color: #dfe3d9;
  border-radius: 7px;
}

.content .form-control:focus,
.content .form-select:focus {
  border-color: var(--app-leaf);
  box-shadow: 0 0 0 .2rem rgba(79, 127, 82, .12);
}

.content input,
.content select,
.content textarea {
  max-width: 100%;
}

/* Modals */

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

.content .modal-dialog {
  max-width: min(500px, calc(100% - 2rem)) !important;
}

.content .modal-dialog.modal-lg,
.content .modal-dialog.modal-xl {
  max-width: min(680px, calc(100% - 2rem)) !important;
}

/* Audit Logs */

.content .audit-card {
  padding: 16px;
  border-color: var(--app-border);
  border-radius: 8px;
  box-shadow: none;
}

.content .audit-table td {
  padding-top: 10px;
  padding-bottom: 10px;
}

.content .audit-table thead th {
  background-color: #6f9c70;
}

.content .detail-field {
  border-color: var(--app-border);
  border-radius: 6px;
  background-color: #fffdf6;
}

.content .audit-page {
  padding: 0;
}

/* Toolbars and Footer */

.content .table-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
  margin-bottom: 14px;
}

.content .table-toolbar > * {
  min-width: 0;
}

.content .table-footer,
.content .pagination-controls {
  min-width: 0;
}

/* Page Transitions */

.dashboard-fade-enter-active,
.dashboard-fade-leave-active {
  transition: opacity .3s ease, transform .3s ease;
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
  background: #75a477;
}

.mobile-header .hamburger {
  border-radius: 8px;
  transition: background .2s ease;
}

.mobile-header .hamburger:hover {
  background: rgba(255, 255, 255, .15);
}

/* Toast Notification */

.toast-notification {
  position: fixed;
  right: 25px;
  bottom: 25px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 30px));
  padding: 14px 18px;
  border-radius: 8px;
  background: #4f7f52;
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, .2);
  font-size: 14px;
}

.toast-notification i {
  flex-shrink: 0;
  color: #e8c547;
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

/* Tablet and Mobile (zoom is 1 here, so the original values still work) */

@media (max-width: 991.98px) {
  .layout {
    display: block;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    padding-left: 0;
  }

  .mobile-header {
    position: sticky;
    top: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 60px;
    padding: 10px 18px;
  }

  .mobile-header h2 {
    margin: 0;
    color: #fff;
    font-size: 18px;
  }

  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .mobile-brand-logo {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    object-fit: contain;
  }

  .hamburger {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 42px;
    height: 42px;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 25px;
    cursor: pointer;
  }

  .sidebar {
    position: fixed;
    top: 60px;
    left: 0;
    bottom: 0;
    z-index: 1200;
    display: none;
    flex-direction: column;
    width: min(320px, 88vw);
    height: auto;
    min-height: 0;
    padding: 16px 14px 14px;
    overflow: hidden;
    box-shadow: 0 12px 24px rgba(0, 0, 0, .2);
  }

  .sidebar.show-menu {
    display: flex;
  }

  .sidebar-title {
    display: grid;
    flex: 0 0 auto;
    grid-template-columns: 46px minmax(0, 1fr);
    column-gap: 12px;
    align-items: center;
    margin: 0 0 14px;
    padding: 12px;
    text-align: left;
  }

  .sidebar-logo {
    grid-row: 1 / span 2;
    width: 46px;
    height: 46px;
    margin: 0;
  }

  .sidebar-title h2 {
    margin: 0;
    font-size: 17px;
  }

  .sidebar-user-info {
    justify-items: start;
    gap: 5px;
    min-width: 0;
  }

  .sidebar-email {
    overflow-wrap: anywhere;
  }

  .sidebar-nav {
    flex: 1 1 auto;
    min-height: 0;
    gap: 4px;
    padding-bottom: 10px;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .sidebar .nav-link {
    padding: 10px 12px;
  }

  .sidebar-bottom {
    flex: 0 0 auto;
    margin-top: 8px;
    padding-top: 12px;
  }

  .sidebar .sidebar-signout {
    min-height: 46px;
  }

  .content {
    width: 100%;
    min-width: 0;
    min-height: calc(100vh - 60px);
    min-height: calc(100dvh - 60px);
    margin: 0;
    padding: clamp(16px, 3vw, 26px);
  }

  .content .table-footer {
    display: flex;
    flex-wrap: wrap;
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
    width: auto;
    max-width: none;
  }
}

/* Small Mobile */

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
    bottom: 0;
    width: min(300px, 90vw);
    height: auto;
    padding: 12px;
  }

  .sidebar-title {
    margin-bottom: 10px;
    padding: 10px;
  }

  .sidebar-logo {
    width: 42px;
    height: 42px;
  }

  .sidebar-title h2 {
    font-size: 16px;
  }

  .sidebar .nav-link {
    min-height: 38px;
    padding: 8px 10px;
  }

  .sidebar .nav-section-label {
    margin-top: 5px;
    padding-top: 5px;
    color: #f1f5e9;
  }

  .sidebar-bottom {
    padding-top: 10px;
  }

  .content {
    min-height: calc(100vh - 54px);
    min-height: calc(100dvh - 54px);
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