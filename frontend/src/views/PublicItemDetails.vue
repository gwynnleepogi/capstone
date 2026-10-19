<template>
  <main class="public-item-page">
    <header class="public-item-header">
      <div class="public-item-brand">
        <span class="brand-mark"><i class="bi bi-box-seam"></i></span>
        <div>
          <p>NVSU PROPERTY INVENTORY</p>
          <h1>Property Item Details</h1>
        </div>
      </div>
    </header>

    <section class="public-item-card" aria-live="polite">
      <div v-if="loading" class="public-item-message">
        <span class="spinner-border spinner-border-sm text-success" role="status"></span>
        <p>Loading item details...</p>
      </div>

      <div v-else-if="error" class="public-item-message public-item-error">
        <i class="bi bi-exclamation-circle"></i>
        <h2>Details unavailable</h2>
        <p>{{ error }}</p>
      </div>

      <template v-else-if="item">
        <div class="item-heading">
          <div>
            <span class="item-property-number">{{ item.property_number || 'No property number' }}</span>
            <h2>{{ item.description || 'Unnamed item' }}</h2>
          </div>
          <span class="status-badge" :class="statusClass">{{ item.status || 'Unknown status' }}</span>
        </div>

        <dl class="item-details-grid">
          <div class="item-detail">
            <dt>Serial Number</dt>
            <dd>{{ item.serial_number || '-' }}</dd>
          </div>
          <div class="item-detail">
            <dt>Quantity</dt>
            <dd>{{ item.quantity ?? 0 }}</dd>
          </div>
          <div class="item-detail">
            <dt>Cost</dt>
            <dd>{{ formatCost(item.cost) }}</dd>
          </div>
          <div class="item-detail">
            <dt>Acquisition Date</dt>
            <dd>{{ item.acquisition_date || '-' }}</dd>
          </div>
          <div class="item-detail">
            <dt>Classification</dt>
            <dd>{{ displayClassification(item.classification) }}</dd>
          </div>
          <div class="item-detail">
            <dt>Condition</dt>
            <dd>{{ item.condition || '-' }}</dd>
          </div>
          <div class="item-detail">
            <dt>Accountable Employee</dt>
            <dd>{{ item.accountable_employee || '-' }}</dd>
          </div>
          <div class="item-detail">
            <dt>Responsibility Center</dt>
            <dd>{{ item.responsibility_center || '-' }}</dd>
          </div>
        </dl>

        <p class="public-item-note">
          <i class="bi bi-shield-check"></i>
          Read-only item information
        </p>
      </template>
    </section>
  </main>
</template>

<script>
export default {
  name: 'PublicItemDetails',

  data() {
    return {
      item: null,
      loading: true,
      error: ''
    }
  },

  computed: {
    statusClass() {
      const status = (this.item?.status || '').toLowerCase()

      if (status === 'available' || status === 'returned') return 'status-good'
      if (status === 'issued') return 'status-issued'
      if (status === 'lost' || status === 'stolen') return 'status-danger'
      if (status === 'damaged') return 'status-warning'

      return 'status-neutral'
    }
  },

  async mounted() {
    await this.loadItem()
  },

  methods: {
    async loadItem() {
      const token = this.$route.query.token

      if (typeof token !== 'string' || !token) {
        this.error = 'This item link is missing its access token.'
        this.loading = false
        return
      }

      try {
        const response = await fetch(
          `/api/item-documents/${encodeURIComponent(this.$route.params.id)}/${encodeURIComponent(token)}/details`
        )
        const contentType = response.headers.get('content-type') || ''

        if (!contentType.includes('application/json')) {
          throw new Error(
            'Restart the backend to enable QR links that open item details, then scan the QR code again.'
          )
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load item details.')
        }

        this.item = data
      } catch (error) {
        this.error = error.message || 'Unable to load item details.'
      } finally {
        this.loading = false
      }
    },

    displayClassification(classification) {
      const labels = {
        PAR: 'Property Acknowledgement Receipt',
        'ICS High': 'Inventory Custodian Slip - High Value',
        'ICS Low': 'Inventory Custodian Slip - Low Value'
      }

      return labels[classification] || classification || '-'
    },

    formatCost(cost) {
      const amount = Number(cost)

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
.public-item-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(18px, 5vw, 56px) 16px;
  background: #f7f5e8;
  color: #26332a;
}

.public-item-header,
.public-item-card {
  width: min(100%, 760px);
  margin: 0 auto;
}

.public-item-header {
  margin-bottom: 22px;
}

.public-item-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  background: #2f5d3a;
  color: #e8c547;
  font-size: 20px;
}

.public-item-brand p {
  margin: 0 0 2px;
  color: #6d786e;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
}

.public-item-brand h1 {
  margin: 0;
  color: #2f5d3a;
  font-size: 20px;
  font-weight: 650;
}

.public-item-card {
  padding: clamp(18px, 4vw, 30px);
  border: 1px solid #e4e2d8;
  border-radius: 10px;
  background: #fff;
}

.public-item-message {
  padding: 34px 12px;
  color: #717a72;
  text-align: center;
}

.public-item-message p {
  margin: 12px 0 0;
}

.public-item-error i {
  color: #b85c50;
  font-size: 28px;
}

.public-item-error h2 {
  margin: 10px 0 0;
  color: #2f5d3a;
  font-size: 20px;
}

.item-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9e7de;
}

.item-property-number {
  color: #717a72;
  font-size: 13px;
}

.item-heading h2 {
  margin: 5px 0 0;
  color: #2f5d3a;
  font-size: clamp(20px, 4vw, 26px);
  font-weight: 650;
  overflow-wrap: anywhere;
}

.status-badge {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 650;
}

.status-good {
  background: #e8f0e8;
  color: #385b3d;
}

.status-issued,
.status-warning {
  background: #fbf4d7;
  color: #5c4a0c;
}

.status-danger {
  background: #f8d7da;
  color: #842029;
}

.status-neutral {
  background: #e9ecef;
  color: #495057;
}

.item-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
  margin: 8px 0 0;
}

.item-detail {
  min-width: 0;
  padding: 14px 0;
  border-bottom: 1px solid #f0efe9;
}

.item-detail dt {
  margin-bottom: 4px;
  color: #717a72;
  font-size: 12px;
  font-weight: 500;
}

.item-detail dd {
  margin: 0;
  color: #26332a;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.public-item-note {
  margin: 20px 0 0;
  color: #717a72;
  font-size: 12px;
}

.public-item-note i {
  margin-right: 5px;
  color: #2f5d3a;
}

@media (max-width: 540px) {
  .item-heading {
    flex-direction: column;
  }

  .item-details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
