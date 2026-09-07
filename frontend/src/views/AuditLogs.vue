<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Audit Logs</h2>
        <p class="text-muted">System activity records</p>
      </div>

      <button
        class="btn btn-success"
        @click="getLogs"
      >
        Refresh
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">

        <div class="table-responsive">

          <table class="table table-hover mb-0">

            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Item ID</th>
                <th>Record ID</th>
                <th>Description</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="log in logs"
                :key="log.id"
              >

                <td>
                  {{ formatDate(log.created_at) }}
                </td>

                <td>
                  <span
                    class="badge"
                    :class="getActionClass(log.action)"
                  >
                    {{ log.action }}
                  </span>
                </td>

                <td>
                  {{ log.item_id || '-' }}
                </td>

                <td>
                  {{ log.record_id || log.item_id || '-' }}
                </td>

                <td>
                  {{ log.description || '-' }}
                </td>

              </tr>

              <tr v-if="logs.length === 0">

                <td
                  colspan="5"
                  class="text-center py-4"
                >
                  No audit logs found.
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

  name: 'AuditLogs',

  data() {

    return {
      logs: []
    }

  },


  mounted() {

    this.getLogs()

  },


  methods: {

    async getLogs() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/audit-logs'
        )

        const data = await response.json()

        console.log('AUDIT LOG DATA:', data)

        if (!response.ok) {

          throw new Error(
            data.error ||
            'Failed to get audit logs'
          )

        }

        this.logs = data

      } catch (error) {

        console.error(
          'AUDIT LOG ERROR:',
          error
        )

        console.log(
          'Could not fetch audit logs:',
          error.message
        )

      }

    },


    formatDate(date) {

      if (!date) {
        return '-'
      }

      return new Date(date).toLocaleString()

    },


    getActionClass(action) {

      if (action === 'Created') {
        return 'text-bg-success'
      }

      if (action === 'Updated') {
        return 'text-bg-primary'
      }

      if (action === 'Deleted') {
        return 'text-bg-danger'
      }

      return 'text-bg-secondary'

    }

  }

}

</script>


<style scoped>

.card {
  border-radius: 8px;
}

table {
  min-width: 1000px;
}

th {
  background: #2F5D3A;
  color: white;
}

td,
th {
  padding: 12px 15px;
}

</style>