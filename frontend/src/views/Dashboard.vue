
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
                ICS High Value
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
                ICS Low Value
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
    <div class="row g-4 mb-4">

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
                :style="{ background: classificationChartBackground }"
              >
                <div class="chart-center">
                  <strong>{{ items.length }}</strong>
                  <span>Total Items</span>
                </div>
              </div>

              <div class="chart-legend">

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
                :style="{ background: statusChartBackground }"
              >
                <div class="chart-center">
                  <strong>{{ items.length }}</strong>
                  <span>Total Items</span>
                </div>
              </div>

              <div class="chart-legend">

                <div class="legend-item">
                  <span class="legend-color available-color"></span>

                  <div>
                    <p class="mb-0">Available</p>
                    <strong>{{ countStatus('Available') }}</strong>
                  </div>
                </div>

                <div class="legend-item">
                  <span class="legend-color delivered-color"></span>

                  <div>
                    <p class="mb-0">Delivered</p>
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
                  <span class="legend-color damaged-color"></span>

                  <div>
                    <p class="mb-0">Damaged</p>
                    <strong>{{ countStatus('Damaged') }}</strong>
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

      error: ''

    }

  },

  computed: {

    classificationChartBackground() {

      const total = this.items.length

      if (total === 0) {
        return '#e5e5e5'
      }

      const par = this.countClassification('PAR')
      const icsHigh = this.countClassification('ICS High')
      const icsLow = this.countClassification('ICS Low')

      const parDegree = (par / total) * 360
      const icsHighDegree = (icsHigh / total) * 360

      const firstEnd = parDegree
      const secondEnd = parDegree + icsHighDegree

      return `conic-gradient(
        #2F5D3A 0deg ${firstEnd}deg,
        #E8C547 ${firstEnd}deg ${secondEnd}deg,
        #70A4ED ${secondEnd}deg 360deg
      )`

    },

    statusChartBackground() {

      const total = this.items.length

      if (total === 0) {
        return '#e5e5e5'
      }

      const available = this.countStatus('Available')
      const issued = this.countStatus('Issued')
      const returned = this.countStatus('Returned')
      const damaged = this.countStatus('Damaged')
      const lost = this.countStatus('Lost')
      const stolen = this.countStatus('Stolen')
      const disposed = this.countStatus('Disposed')

      const availableDegree = (available / total) * 360
      const issuedDegree = (issued / total) * 360
      const returnedDegree = (returned / total) * 360
      const damagedDegree = (damaged / total) * 360
      const lostDegree = (lost / total) * 360
      const stolenDegree = (stolen / total) * 360

      const firstEnd = availableDegree
      const secondEnd = firstEnd + issuedDegree
      const thirdEnd = secondEnd + returnedDegree
      const fourthEnd = thirdEnd + damagedDegree
      const fifthEnd = fourthEnd + lostDegree
      const sixthEnd = fifthEnd + stolenDegree

      return `conic-gradient(
        #2F5D3A 0deg ${firstEnd}deg,
        #E8C547 ${firstEnd}deg ${secondEnd}deg,
        #70A4ED ${secondEnd}deg ${thirdEnd}deg,
        #DC3545 ${thirdEnd}deg ${fourthEnd}deg,
        #6C757D ${fourthEnd}deg ${fifthEnd}deg,
        #343A40 ${fifthEnd}deg ${sixthEnd}deg,
        #9B59B6 ${sixthEnd}deg 360deg
      )`

    }

  },

  async mounted() {

    await this.getItems()

  },

  methods: {

    async getItems() {

      try {

        const token =
          localStorage.getItem('accessToken')

        const response = await fetch(
          'http://localhost:5000/api/items',
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

      if (status === 'Issued') {
        return 'Delivered'
      }

      return status || '-'

    }

  }

}

</script>

<style scoped>

h1 {
  color: #2F5D3A;
}

.summary-card {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
}

.summary-card .card-body {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
}

.icon-box {
  width: 50px;
  height: 50px;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: #E8C547;

  border-radius: 10px;

  font-size: 22px;

  color: #2F5D3A;
}

.summary-card h2 {
  color: #2F5D3A;
}

.card {
  border-radius: 10px;
}

.analytics-card {
  border: 1px solid #e5e5e5;
}

.analytics-card .card-header {
  color: #2F5D3A;
  padding: 16px 20px;
}

.chart-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 35px;
  flex-wrap: wrap;
}

.doughnut-chart {
  width: 220px;
  height: 220px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  position: relative;
  flex-shrink: 0;
}

.doughnut-chart::before {
  content: '';

  position: absolute;

  width: 135px;
  height: 135px;

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
  font-size: 30px;
  color: #2F5D3A;
}

.chart-center span {
  font-size: 12px;
  color: #6C757D;
}

.chart-legend {
  flex: 1;
  min-width: 180px;
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.legend-color {
  width: 14px;
  height: 14px;

  border-radius: 3px;

  margin-top: 4px;
  flex-shrink: 0;
}

.legend-item p {
  font-size: 13px;
  color: #6C757D;
  line-height: 1.4;
}

.legend-item strong {
  color: #2F5D3A;
}

.par-color {
  background-color: #2F5D3A;
}

.ics-high-color {
  background-color: #E8C547;
}

.ics-low-color {
  background-color: #70A4ED;
}

.available-color {
  background-color: green;
}

.delivered-color {
  background-color: blue;
}

.returned-color {
  background-color: yellow;
}

.damaged-color {
  background-color: orange;
}

.lost-color {
  background-color: red;
}

.stolen-color {
  background-color: red;
}

.disposed-color {
  background-color: gray;
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

@media (max-width: 576px) {

  .summary-card .card-body {
    padding: 14px;
  }

  .chart-layout {
    gap: 20px;
  }

  .doughnut-chart {
    width: 190px;
    height: 190px;
  }

  .doughnut-chart::before {
    width: 115px;
    height: 115px;
  }

  .chart-center strong {
    font-size: 26px;
  }

  .chart-legend {
    width: 100%;
  }

  .table {
    min-width: 0 !important;
    table-layout: fixed;
  }

  .table th,
  .table td {
    padding: 9px 5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

}

</style>