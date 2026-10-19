<template>
  <div class="container-fluid">

    <!-- Header -->
    <div class="mb-4">
      <h1 class="h3 mb-1">Dashboard</h1>
      <p class="text-secondary mb-0">
        Property and inventory overview
      </p>
    </div>

    <!-- Summary Cards -->
    <div class="row g-3 mb-4">

      <!-- Total Items -->
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card summary-card">
          <div class="card-body">
            <div class="icon-box">
              <i class="bi bi-box-seam"></i>
            </div>

            <div>
              <p class="text-secondary mb-1">
                Total Items
              </p>

              <h2 class="mb-0">
                {{ items.length }}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <!-- PAR -->
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card summary-card">
          <div class="card-body">
            <div class="icon-box">
              <i class="bi bi-file-earmark-text"></i>
            </div>

            <div>
              <p class="text-secondary mb-1">
                Property Acknowledgement Receipt
              </p>

              <h2 class="mb-0">
                {{ countClassification('PAR') }}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <!-- ICS High -->
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card summary-card">
          <div class="card-body">
            <div class="icon-box">
              <i class="bi bi-clipboard-check"></i>
            </div>

            <div>
              <p class="text-secondary mb-1">
                Inventory Custodian Slip - High Value
              </p>

              <h2 class="mb-0">
                {{ countClassification('ICS High') }}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <!-- ICS Low -->
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card summary-card">
          <div class="card-body">
            <div class="icon-box">
              <i class="bi bi-clipboard"></i>
            </div>

            <div>
              <p class="text-secondary mb-1">
                Inventory Custodian Slip - Low Value
              </p>

              <h2 class="mb-0">
                {{ countClassification('ICS Low') }}
              </h2>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Analytics Charts -->
    <div class="row g-3 mb-4">

      <!-- Classification Doughnut Chart -->
      <div class="col-12 col-lg-6">
        <div class="card analytics-card h-100">

          <div class="card-header bg-white">
            <strong>Inventory Classification</strong>
          </div>

          <div class="card-body">

            <div class="chart-layout">

              <div
                class="doughnut-chart classification-chart"
                role="img"
                aria-label="Inventory classification chart"
              >
                <svg class="chart-ring" viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="chart-track" cx="50" cy="50" r="44" />
                  <circle
                    v-for="segment in classificationChartSegments"
                    :key="segment.name"
                    class="chart-ring-segment"
                    :class="segment.className"
                    cx="50"
                    cy="50"
                    r="44"
                    :style="{
                      strokeDasharray: `${segment.length} ${chartCircumference}`,
                      strokeDashoffset: -segment.offset
                    }"
                  />
                </svg>
                <div class="chart-center">
                  <strong>{{ items.length }}</strong>
                  <span>Total Items</span>
                </div>
              </div>

              <div class="chart-legend classification-legend">

                <div class="legend-item">
                  <span class="legend-color par-color"></span>

                  <div>
                    <p class="mb-0">
                      Property Acknowledgement Receipt
                    </p>

                    <strong>
                      {{ countClassification('PAR') }}
                    </strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color ics-high-color"></span>

                  <div>
                    <p class="mb-0">
                      Inventory Custodian Slip - High Value
                    </p>

                    <strong>
                      {{ countClassification('ICS High') }}
                    </strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color ics-low-color"></span>

                  <div>
                    <p class="mb-0">
                      Inventory Custodian Slip - Low Value
                    </p>

                    <strong>
                      {{ countClassification('ICS Low') }}
                    </strong>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

      <!-- Status Doughnut Chart -->
      <div class="col-12 col-lg-6">
        <div class="card analytics-card h-100">

          <div class="card-header bg-white">
            <strong>Inventory Status</strong>
          </div>

          <div class="card-body">

            <div class="chart-layout">

              <div
                class="doughnut-chart status-chart"
                role="img"
                aria-label="Inventory status chart"
              >
                <svg class="chart-ring" viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="chart-track" cx="50" cy="50" r="44" />
                  <circle
                    v-for="segment in statusChartSegments"
                    :key="segment.name"
                    class="chart-ring-segment"
                    :class="segment.className"
                    cx="50"
                    cy="50"
                    r="44"
                    :style="{
                      strokeDasharray: `${segment.length} ${chartCircumference}`,
                      strokeDashoffset: -segment.offset
                    }"
                  />
                </svg>
                <div class="chart-center">
                  <strong>{{ items.length }}</strong>
                  <span>Total Items</span>
                </div>
              </div>

              <div class="chart-legend status-legend">

                <div class="legend-item">
                  <span class="legend-color available-color"></span>

                  <div>
                    <p class="mb-0">Available</p>
                    <strong>{{ countStatus('Available') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color issued-color"></span>

                  <div>
                    <p class="mb-0">Issued</p>
                    <strong>{{ countStatus('Issued') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color returned-color"></span>

                  <div>
                    <p class="mb-0">Returned</p>
                    <strong>{{ countStatus('Returned') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color lost-color"></span>

                  <div>
                    <p class="mb-0">Lost</p>
                    <strong>{{ countStatus('Lost') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color damaged-color"></span>

                  <div>
                    <p class="mb-0">Damaged</p>
                    <strong>{{ countStatus('Damaged') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color stolen-color"></span>

                  <div>
                    <p class="mb-0">Stolen</p>
                    <strong>{{ countStatus('Stolen') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color disposed-color"></span>

                  <div>
                    <p class="mb-0">Disposed</p>
                    <strong>{{ countStatus('Disposed') }}</strong>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

    </div>

    <!-- Inventory Overview -->
    <div class="card">

      <div class="card-header bg-white">
        <strong>Inventory Overview</strong>
      </div>

      <div class="card-body">

        <div
          v-if="loading"
          class="text-center py-4"
        >
          Loading dashboard...
        </div>

        <div
          v-else-if="error"
          class="text-center text-danger py-4"
        >
          {{ error }}
        </div>

        <div
          v-else-if="items.length === 0"
          class="text-center text-secondary py-4"
        >
          No items recorded yet.
        </div>

        <div
          v-else
          class="table-responsive"
        >

          <table class="table table-hover mb-0">

            <thead>
              <tr>
                <th>Property No.</th>
                <th>Description</th>
                <th>Classification</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="item in items.slice(0, 5)"
                :key="item.id"
              >

                <td>
                  {{ item.property_number || '-' }}
                </td>

                <td>
                  {{ item.description || '-' }}
                </td>

                <td>
                  {{ displayClassification(item.classification) }}
                </td>

                <td>
                  {{ item.condition || '-' }}
                </td>

                <td>
                  {{ displayStatus(item.status) }}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>

  </div>
</template>

<script>

export default {

  name: 'Dashboard',

  data() {

    return {

      items: [],

      loading: true,

      error: '',

      chartCircumference: 2 * Math.PI * 44

    }

  },

  computed: {

    classificationChartSegments() {
      return this.buildChartSegments([
        { name: 'PAR', className: 'par-segment', count: this.countClassification('PAR') },
        { name: 'ICS High', className: 'ics-high-segment', count: this.countClassification('ICS High') },
        { name: 'ICS Low', className: 'ics-low-segment', count: this.countClassification('ICS Low') }
      ])
    },

    statusChartSegments() {
      return this.buildChartSegments([
        { name: 'Available', className: 'available-segment', count: this.countStatus('Available') },
        { name: 'Issued', className: 'issued-segment', count: this.countStatus('Issued') },
        { name: 'Returned', className: 'returned-segment', count: this.countStatus('Returned') },
        { name: 'Lost', className: 'lost-segment', count: this.countStatus('Lost') },
        { name: 'Damaged', className: 'damaged-segment', count: this.countStatus('Damaged') },
        { name: 'Stolen', className: 'stolen-segment', count: this.countStatus('Stolen') },
        { name: 'Disposed', className: 'disposed-segment', count: this.countStatus('Disposed') }
      ])
    }

  },

  async mounted() {

    await this.getItems()

  },

  methods: {

    buildChartSegments(definitions) {
      const total = definitions.reduce(
        (sum, definition) => sum + definition.count,
        0
      )
      let offset = 0

      return definitions.map(definition => {
        const length = total
          ? (definition.count / total) * this.chartCircumference
          : 0
        const segment = {
          ...definition,
          length,
          offset
        }

        offset += length
        return segment
      })
    },

    async getItems() {

      try {

        const token =
          localStorage.getItem('accessToken')

        const response = await fetch(
          '/api/items',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data =
          await response.json()

        if (!response.ok) {

          throw new Error(
            data.error ||
            'Failed to load dashboard data'
          )

        }

        this.items = Array.isArray(data)
          ? data
          : data.items || []

      } catch (error) {

        console.log(error)

        this.error = error.message

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )

      } finally {

        this.loading = false

      }

    },

    countClassification(classification) {

      return this.items.filter(
        item => {

          if (classification === 'PAR') {

            return item.classification === 'PAR' ||
              item.classification === 'Property Acknowledgement Receipt'

          }

          if (classification === 'ICS High') {

            return item.classification === 'ICS High' ||
              item.classification === 'Inventory Custodian Slip - High Value'

          }

          if (classification === 'ICS Low') {

            return item.classification === 'ICS Low' ||
              item.classification === 'Inventory Custodian Slip - Low Value'

          }

          return item.classification === classification

        }
      ).length

    },

    countStatus(status) {

      return this.items.filter(
        item => item.status === status
      ).length

    },

    displayClassification(classification) {

      if (classification === 'PAR') {
        return 'Property Acknowledgement Receipt'
      }

      if (classification === 'ICS High') {
        return 'Inventory Custodian Slip - High Value'
      }

      if (classification === 'ICS Low') {
        return 'Inventory Custodian Slip - Low Value'
      }

      return classification || '-'

    },

    displayStatus(status) {

      return status || '-'

    }

  }

}

</script>

<style scoped>

h1 {
  color: #2F5D3A;
}

.container-fluid > .mb-4 > h1 {
  font-size: 1.5rem;
}

.summary-card {
  height: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
}

.summary-card .card-body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  padding: 10px 12px;
}

.icon-box {
  width: 34px;
  height: 34px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: #E8C547;

  border-radius: 10px;

  font-size: 18px;

  color: #2F5D3A;
}

.summary-card h2 {
  color: #2F5D3A;
  font-size: 1.15rem;
  line-height: 1.1;
}

.summary-card p {
  font-size: 13px;
  line-height: 1.25;
}

.card {
  border-radius: 10px;
}

.analytics-card {
  border: 1px solid #e5e5e5;
}

.analytics-card .card-header {
  color: #2F5D3A;
  padding: 11px 14px;
}

.chart-layout {
  display: grid;
  grid-template-columns: minmax(110px, .7fr) minmax(0, 1.3fr);
  align-items: center;
  gap: 12px;
}

.doughnut-chart {
  width: min(100%, 136px);
  aspect-ratio: 1;
  justify-self: center;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  position: relative;
  flex-shrink: 0;
}

.chart-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform: rotate(-90deg);
}

.chart-track,
.chart-ring-segment {
  fill: none;
  stroke-width: 17;
}

.chart-track {
  stroke: #e5e5e5;
}

.chart-ring-segment {
  stroke-dasharray: 0 276.46;
  transition:
    stroke-dasharray 900ms cubic-bezier(.22, 1, .36, 1),
    stroke-dashoffset 900ms cubic-bezier(.22, 1, .36, 1);
}

.par-segment,
.available-segment {
  stroke: var(--app-forest);
}

.ics-high-segment,
.issued-segment {
  stroke: var(--app-gold);
}

.ics-low-segment,
.returned-segment {
  stroke: var(--app-sage);
}

.lost-segment {
  stroke: var(--app-alert-red);
}

.damaged-segment {
  stroke: var(--app-alert-orange);
}

.stolen-segment {
  stroke: var(--app-deep-red);
}

.disposed-segment {
  stroke: var(--app-status-gray);
}

.doughnut-chart::before {
  content: '';

  position: absolute;

  width: 62%;
  height: 62%;

  background-color: white;

  border-radius: 50%;
}

.chart-center {
  position: relative;
  z-index: 1;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  text-align: center;
}

.chart-center strong {
  font-size: 20px;
  color: #2F5D3A;
}

.chart-center span {
  font-size: 12px;
  color: #6C757D;
}

.chart-legend {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 9px;
  align-items: start;
}

.classification-legend {
  grid-template-columns: 1fr;
}

.status-legend {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  margin-bottom: 0;
}

.legend-color {
  width: 9px;
  height: 9px;

  border-radius: 50%;

  flex-shrink: 0;
  margin-top: 4px;
}

.legend-item div {
  min-width: 0;
}

.legend-item p {
  font-size: 12px;
  color: #6C757D;
  line-height: 1.4;
  margin: 0;
  overflow-wrap: anywhere;
}

.legend-item strong {
  color: #2F5D3A;
}

.par-color {
  background-color: var(--app-forest);
}

.ics-high-color {
  background-color: var(--app-gold);
}

.ics-low-color {
  background-color: var(--app-sage);
}

.available-color {
  background-color: var(--app-forest);
}

.issued-color {
  background-color: var(--app-gold);
}

.returned-color {
  background-color: var(--app-sage);
}

.lost-color {
  background-color: var(--app-alert-red);
}

.damaged-color {
  background-color: var(--app-alert-orange);
}

.stolen-color {
  background-color: var(--app-deep-red);
}

.disposed-color {
  background-color: var(--app-status-gray);
}

.table thead th {
  background-color: #2F5D3A;
  color: white;
  white-space: nowrap;
}

.table td {
  white-space: nowrap;
  vertical-align: middle;
}

@media (max-width: 1200px) {

  .status-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 992px) {

  .chart-layout {
    grid-template-columns: 1fr;
  }

  .doughnut-chart {
    width: min(100%, 148px);
  }

  .status-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 576px) {

  .summary-card .card-body {
    min-height: 76px;
    padding: 11px;
  }

  .chart-layout {
    gap: 18px;
  }

  .doughnut-chart::before {
    width: 62%;
    height: 62%;
  }

  .chart-center strong {
    font-size: 24px;
  }

  .chart-legend {
    width: 100%;
  }

  .status-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 8px;
  }

  .classification-legend {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .legend-item {
    gap: 5px;
  }

  .legend-item p {
    font-size: 12px;
  }

  .table {
    min-width: 640px;
    table-layout: auto;
  }

  .table th,
  .table td {
    padding: 9px 8px;
    white-space: nowrap;
  }

}

@media (prefers-reduced-motion: reduce) {
  .chart-ring-segment {
    transition: none;
  }
}

</style>