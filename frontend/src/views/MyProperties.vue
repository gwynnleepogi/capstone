<template>
  <div class="my-properties-page">
    <header class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">My Properties</h1>
        <p class="text-secondary mb-0">Select a property to view its full details and QR code.</p>
      </div>
      <button type="button" class="btn btn-outline-success" :disabled="loading" @click="loadProperties">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Refresh
      </button>
    </header>

    <div v-if="loading" class="card">
      <div class="card-body text-center py-5 text-muted">
        <span class="spinner-border spinner-border-sm text-success me-2" role="status"></span>
        Loading your issued properties...
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger" role="alert">
      {{ error }}
      <button type="button" class="btn btn-sm btn-outline-danger ms-2" @click="loadProperties">
        Try again
      </button>
    </div>

    <div v-else-if="!properties.length" class="card">
      <div class="card-body text-center py-5 text-muted">
        <i class="bi bi-box-seam fs-1 d-block mb-2"></i>
        No issued properties are currently assigned to you.
      </div>
    </div>

    <div v-else>
      <div v-if="properties.length" class="card mb-3">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-md">
              <label for="property-search" class="form-label">Search properties</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input
                  id="property-search"
                  v-model.trim="searchQuery"
                  type="search"
                  class="form-control"
                  placeholder="Search by ID, article, or name"
                >
              </div>
            </div>
            <div class="col-12 col-md-4">
              <label for="property-classification" class="form-label">Classification</label>
              <select id="property-classification" v-model="selectedClassification" class="form-select">
                <option value="">All classifications</option>
                <option v-for="classification in classifications" :key="classification" :value="classification">
                  {{ classification }}
                </option>
              </select>
            </div>
            <div class="col-12 col-md-auto d-flex align-items-center">
              <span class="text-secondary small">
                Showing {{ filteredProperties.length }} of {{ properties.length }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="properties.length && !filteredProperties.length" class="card">
        <div class="card-body text-center py-4 text-muted">
          No properties match your search or classification filter.
        </div>
      </div>

      <div v-else class="row g-3">
        <div v-for="receipt in filteredProperties" :key="receipt.id" class="col-12 col-md-6 col-xl-4">
          <article class="card property-card">
          <button
            type="button"
            class="property-summary"
            @click="toggleDetails(receipt.id)"
          >
            <span class="property-tile-top">
              <span class="property-id">
                <i class="bi bi-box-seam me-1"></i>
                {{ receipt.items?.property_number || receipt.items?.id || 'No property number' }}
              </span>
              <i class="bi bi-arrow-up-right tile-chevron" aria-hidden="true"></i>
            </span>
            <span class="property-article">Article: {{ receipt.items?.article || '-' }}</span>
            <span class="property-name">{{ receipt.items?.description || 'Unnamed property' }}</span>
            <span class="property-tile-bottom">
              <span class="badge classification-badge">{{ receipt.items?.classification || 'Unclassified' }}</span>
              <span class="badge condition-badge">{{ receipt.items?.condition || 'Condition not set' }}</span>
            </span>
            <span class="property-tile-hint">View property details <i class="bi bi-arrow-right ms-1"></i></span>
          </button>


          <div
            v-if="expandedReceiptId === receipt.id"
            class="property-modal-backdrop"
            role="presentation"
            @click.self="toggleDetails(receipt.id)"
          >
            <section
              class="property-modal"
              role="dialog"
              aria-modal="true"
              :aria-label="`Details for ${receipt.items?.property_number || 'property'}`"
            >
              <div class="property-modal-header">
                <div>
                  <div class="text-muted small">Property No. {{ receipt.items?.property_number || '-' }}</div>
                  <h2 class="h5 mb-0">{{ receipt.items?.description || 'Unnamed property' }}</h2>
                    </div>
            </section>
          </div>
                <button type="button" class="btn-close" aria-label="Close" @click="toggleDetails(receipt.id)"></button>
              </div>
              <div class="property-modal-body">
            <div class="row g-3 align-items-center">
              <div class="col-12 col-md">
                <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
                  <div>
                    <div class="text-muted small">
                      Property No. {{ receipt.items?.property_number || '-' }}
                    </div>
                    <h2 class="h5 mb-0">{{ receipt.items?.description || 'Unnamed property' }}</h2>
                  </div>
                  <span class="badge bg-primary">{{ receipt.status || 'Issued' }}</span>
                </div>

                <dl class="row property-details mb-0">
                  <dt class="col-sm-4">Property ID</dt>
                  <dd class="col-sm-8">{{ receipt.items?.id || receipt.item_id || '-' }}</dd>
                  <dt class="col-sm-4">Article</dt>
                  <dd class="col-sm-8">{{ receipt.items?.article || '-' }}</dd>
                  <dt class="col-sm-4">Receipt Number</dt>
                  <dd class="col-sm-8">{{ receipt.receipt_number || '-' }}</dd>
                  <dt class="col-sm-4">Date Issued</dt>
                  <dd class="col-sm-8">{{ formatDate(receipt.date_issued) }}</dd>
                  <dt class="col-sm-4">Quantity</dt>
                  <dd class="col-sm-8">{{ receipt.quantity ?? '-' }}</dd>
                  <dt class="col-sm-4">Serial Number</dt>
                  <dd class="col-sm-8">{{ receipt.items?.serial_number || '-' }}</dd>
                  <dt class="col-sm-4">Model Number</dt>
                  <dd class="col-sm-8">{{ receipt.items?.model_number || '-' }}</dd>
                  <dt class="col-sm-4">Unit of Measure</dt>
                  <dd class="col-sm-8">{{ receipt.items?.unit || '-' }}</dd>
                  <dt class="col-sm-4">Classification</dt>
                  <dd class="col-sm-8">{{ receipt.items?.classification || '-' }}</dd>
                  <dt class="col-sm-4">Condition</dt>
                  <dd class="col-sm-8">{{ receipt.items?.condition || '-' }}</dd>
                  <dt class="col-sm-4">Cost</dt>
                  <dd class="col-sm-8">{{ formatCost(receipt.items?.cost) }}</dd>
                  <dt class="col-sm-4">Acquisition Date</dt>
                  <dd class="col-sm-8">{{ formatDate(receipt.items?.acquisition_date) }}</dd>
                  <dt class="col-sm-4">Responsibility Center</dt>
                  <dd class="col-sm-8">{{ receipt.items?.responsibility_center || '-' }}</dd>
                  <dt class="col-sm-4">Accountable Employee</dt>
                  <dd class="col-sm-8">{{ receipt.items?.accountable_employee || '-' }}</dd>
                  <dt class="col-sm-4">Fund Cluster</dt>
                  <dd class="col-sm-8">{{ receipt.items?.fund_cluster || '-' }}</dd>
                </dl>
              </div>

              <div class="col-12 col-md-auto text-center qr-panel">
                <img
                  v-if="qrCodes[receipt.id]"
                  :src="qrCodes[receipt.id]"
                  :alt="`QR code for ${receipt.items?.property_number || receipt.items?.description || 'issued property'}`"
                  class="property-qr"
                >
                <div v-else-if="qrErrors[receipt.id]" class="small text-danger">
                  {{ qrErrors[receipt.id] }}
                </div>
                <div v-else class="small text-muted">Preparing QR code...</div>
                <div class="small text-muted mt-1">Scan for property details</div>
              </div>
            </div>
          </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'

export default {
  name: 'MyProperties',

  data() {
    return {
      properties: [],
      qrCodes: {},
      qrErrors: {},
      expandedReceiptId: null,
      searchQuery: '',
      selectedClassification: '',
      loading: false,
      error: ''
    }
  },

  computed: {
    classifications() {
      return [...new Set(
        this.properties
          .map(receipt => receipt.items?.classification)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b))
    },

    filteredProperties() {
      const query = this.searchQuery.toLocaleLowerCase()

      return this.properties.filter(receipt => {
        const item = receipt.items || {}
        const matchesSearch = !query || [
          item.id,
          item.property_number,
          item.article,
          item.description
        ].some(value => String(value || '').toLocaleLowerCase().includes(query))
        const matchesClassification = !this.selectedClassification ||
          item.classification === this.selectedClassification

        return matchesSearch && matchesClassification
      })
    }
  },

  mounted() {
    this.loadProperties()
  },

  methods: {
    async loadProperties() {
      this.loading = true
      this.error = ''

      try {
        const response = await fetch('/api/item-lookup/mine')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load your issued properties.')
        }

        if (!Array.isArray(data)) {
          throw new Error('The issued properties response was invalid.')
        }

        this.properties = data
        this.qrCodes = {}
        this.qrErrors = {}
        await Promise.all(data.map(receipt => this.generateQrCode(receipt)))
      } catch (error) {
        console.error('Failed to load your issued properties:', error)
        this.error = error.message || 'Unable to load your issued properties.'
      } finally {
        this.loading = false
      }
    },

    async generateQrCode(receipt) {
      const itemId = receipt.items?.id

      if (!itemId) {
        this.qrErrors[receipt.id] = 'Item details are unavailable for this QR code.'
        return
      }

      try {
        const itemUrl = new URL(
          `/items?item=${encodeURIComponent(itemId)}`,
          window.location.origin
        ).toString()
        this.qrCodes[receipt.id] = await QRCode.toDataURL(itemUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 240
        })
      } catch (error) {
        console.error('Failed to generate property QR code:', error)
        this.qrErrors[receipt.id] = 'Unable to generate this QR code.'
      }
    },

    toggleDetails(receiptId) {
      this.expandedReceiptId = this.expandedReceiptId === receiptId ? null : receiptId
    },

    formatDate(value) {
      if (!value) return '-'

      const date = new Date(`${value}T00:00:00`)
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
    },

    formatCost(value) {
      const amount = Number(value)
      return Number.isFinite(amount)
        ? amount.toLocaleString('en-PH', {
            style: 'currency',
            currency: 'PHP'
          })
        : '-'
    }
  }
}
</script>

<style scoped>
.property-card {
  height: 100%;
  border: 1px solid #e4e2d8;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.property-card:hover {
  border-color: #9db9a2;
  box-shadow: 0 6px 18px rgba(32, 70, 42, 0.08);
  transform: translateY(-2px);
}

.property-summary {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.7rem;
  width: 100%;
  min-height: 190px;
  padding: 1.15rem;
  border: 0;
  background: #fff;
  color: inherit;
  text-align: left;
}

.property-summary:hover,
.property-summary:focus-visible {
  background: #fbfcfa;
}

.property-tile-top,
.property-tile-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.property-id {
  color: #2f5d3a;
  font-size: 0.9rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.tile-chevron {
  color: #6c757d;
  flex: 0 0 auto;
}

.property-article {
  color: #6c757d;
  font-size: 0.8rem;
}

.property-name {
  min-height: 2.8rem;
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.classification-badge {
  color: #245b38;
  background: #e8f2e9;
  font-weight: 600;
}

.condition-badge {
  color: #555;
  background: #f0f1f2;
  font-weight: 600;
}

.property-tile-hint {
  margin-top: auto;
  padding-top: 0.65rem;
  border-top: 1px solid #edf0ec;
  color: #47734e;
  font-size: 0.8rem;
  font-weight: 600;
}


.property-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(18, 28, 20, 0.55);
}

.property-modal {
  width: min(900px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.22);
}

.property-modal-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid #e9ecef;
  background: #fff;
}

.property-modal-body {
  padding: 1.25rem;
}

.property-details dt,
.property-details dd {
  margin-bottom: 0.4rem;
}

.property-qr {
  display: block;
  width: 180px;
  height: 180px;
  margin: 0 auto;
  padding: 8px;
  border: 1px solid #e4e2d8;
  border-radius: 8px;
  background: #fff;
}

.qr-panel {
  min-width: 210px;
}
</style>
