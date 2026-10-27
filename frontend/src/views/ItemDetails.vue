<template>
  <div class="item-details-page">
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <div>
        <h2 class="mb-1">Property Details</h2>
        <p class="text-muted mb-0">Read-only information for the scanned item</p>
      </div>

      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="goBack">
          <i class="bi bi-arrow-left me-1"></i>
          Back
        </button>
        <button type="button" class="btn btn-success" @click="scanAgain">
          <i class="bi bi-qr-code-scan me-1"></i>
          Scan Another
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5 text-muted">
          <span class="spinner-border spinner-border-sm text-success me-2" role="status"></span>
          Loading item details...
        </div>

        <div v-else-if="error" class="text-center py-5">
          <i class="bi bi-exclamation-circle fs-1 text-danger"></i>
          <h5 class="mt-2">Details unavailable</h5>
          <p class="text-muted mb-3">{{ error }}</p>
          <button type="button" class="btn btn-outline-success" @click="loadItem">
            Try again
          </button>
        </div>

        <template v-else-if="item">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <div class="property-number">{{ item.property_number || 'No property number' }}</div>
              <h4 class="mb-0">{{ item.description || 'Unnamed item' }}</h4>
            </div>
            <span class="badge fs-6" :class="statusBadgeClass">{{ item.status || 'Unknown' }}</span>
          </div>

          <dl class="row detail-list mb-0">
            <dt class="col-sm-4">Serial Number</dt>
            <dd class="col-sm-8">{{ item.serial_number || '-' }}</dd>

            <dt class="col-sm-4">Model Number</dt>
            <dd class="col-sm-8">{{ item.model_number || '-' }}</dd>

            <dt class="col-sm-4">Quantity</dt>
            <dd class="col-sm-8">{{ item.issued_quantity ?? item.quantity ?? 0 }}</dd>

            <dt class="col-sm-4">Unit of Measure</dt>
            <dd class="col-sm-8">{{ unitLabel }}</dd>

            <dt class="col-sm-4">Classification</dt>
            <dd class="col-sm-8">{{ displayClassification(item.classification) }}</dd>

            <dt class="col-sm-4">Condition</dt>
            <dd class="col-sm-8">{{ item.condition || '-' }}</dd>

            <dt class="col-sm-4">Cost</dt>
            <dd class="col-sm-8">{{ formatCost(item.cost) }}</dd>

            <dt class="col-sm-4">Acquisition Date</dt>
            <dd class="col-sm-8">{{ item.acquisition_date || '-' }}</dd>

            <dt class="col-sm-4">Fund Cluster</dt>
            <dd class="col-sm-8">{{ item.fund_cluster || '-' }}</dd>

            <dt class="col-sm-4">Accountable Employee</dt>
            <dd class="col-sm-8">{{ item.accountable_employee || '-' }}</dd>

            <dt class="col-sm-4">Responsibility Center</dt>
            <dd class="col-sm-8">{{ item.responsibility_center || '-' }}</dd>
          </dl>

          <div class="mt-4 d-flex flex-wrap gap-2 align-items-center">
            <router-link
              v-if="canRequest"
              to="/request"
              class="btn btn-warning"
            >
              <i class="bi bi-file-earmark-text me-1"></i>
              Go to Requests
            </router-link>

            <small class="text-muted">
              <i class="bi bi-shield-check me-1"></i>
              Read-only item information
            </small>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ItemDetails',

  data() {
    return {
      item: null,
      loading: true,
      error: ''
    }
  },

  computed: {
    currentRole() {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null')?.role || ''
      } catch {
        return ''
      }
    },

    canRequest() {
      return (
        ['Teacher', 'Non-Teaching Staff'].includes(this.currentRole) &&
        ['Available', 'Returned'].includes(this.item?.status)
      )
    },

    unitLabel() {
      const unit = String(this.item?.unit || '').trim()
      return unit && unit.toLowerCase() !== 'unit' ? unit : 'PC'
    },

    statusBadgeClass() {
      const status = String(this.item?.status || '').toLowerCase()

      if (status === 'available' || status === 'returned') return 'bg-success'
      if (status === 'assigned') return 'bg-warning text-dark'
      if (status === 'issued') return 'bg-primary'
      if (status === 'lost' || status === 'stolen') return 'bg-danger'
      if (status === 'damaged') return 'bg-warning text-dark'

      return 'bg-secondary'
    }
  },

  watch: {
    '$route.params.id'() {
      this.loadItem()
    }
  },

  mounted() {
    this.loadItem()
  },

  methods: {
    async loadItem() {
      this.loading = true
      this.error = ''
      this.item = null

      try {
        const response = await fetch(
          `/api/item-lookup/${encodeURIComponent(this.$route.params.id)}`
        )

        const contentType = response.headers.get('content-type') || ''

        if (!contentType.includes('application/json')) {
          throw new Error(
            'The server does not support item scanning yet. Restart the backend and try again.'
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

    scanAgain() {
      window.dispatchEvent(new CustomEvent('open-qr-scanner'))
    },

    goBack() {
      if (window.history.length > 1) {
        this.$router.back()
      } else {
        this.$router.push('/request')
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
        ? amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
        : '-'
    }
  }
}
</script>

<style scoped>
.property-number {
  color: #2f5d3a;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.detail-list dt {
  color: #717a72;
  font-weight: 600;
}

.detail-list dd {
  margin-bottom: 0.6rem;
}
</style>
