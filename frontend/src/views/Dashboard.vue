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
      <div class="col-12 col-sm-6 col-lg-4">

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
      <div class="col-12 col-sm-6 col-lg-4">

        <div class="card summary-card">

          <div class="card-body">

            <div class="icon-box">
              <i class="bi bi-file-earmark-text"></i>
            </div>

            <div>
              <p class="text-secondary mb-1">
                PAR
              </p>

              <h2 class="mb-0">
                {{ countClassification('PAR') }}
              </h2>
            </div>

          </div>

        </div>

      </div>


      <!-- ICS Low -->
      <div class="col-12 col-sm-6 col-lg-4">

        <div class="card summary-card">

          <div class="card-body">

            <div class="icon-box">
              <i class="bi bi-clipboard"></i>
            </div>

            <div>
              <p class="text-secondary mb-1">
                ICS Low
              </p>

              <h2 class="mb-0">
                {{ countClassification('ICS Low') }}
              </h2>
            </div>

          </div>

        </div>

      </div>

    </div>


    <!-- Inventory Overview -->
    <div class="card">

      <div class="card-header bg-white">

        <strong>
          Inventory Overview
        </strong>

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


        <div v-else class="table-responsive">

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
                  {{ item.description }}
                </td>

                <td>
                  {{ item.classification || '-' }}
                </td>

                <td>
                  {{ item.condition || '-' }}
                </td>

                <td>
                  {{ item.status || '-' }}
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


  async mounted() {

    await this.getItems()

  },


  methods: {

  async getItems() {
  try {
    const token = localStorage.getItem('accessToken')

    const response = await fetch(
      'http://localhost:5000/api/items',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error || 'Failed to load dashboard data'
      )
    }

    this.items = data
  } catch (error) {
    console.log(error)
    this.error = error.message
  } finally {
    this.loading = false
  }
},


    countClassification(classification) {

      return this.items.filter(
        item => item.classification === classification
      ).length

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