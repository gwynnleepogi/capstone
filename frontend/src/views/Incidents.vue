<template>
  <div>

    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Incidents</h2>
        <p class="text-muted">Manage property incidents</p>
      </div>

      <button class="btn btn-warning" @click="openAddModal">
        + Add Incident
      </button>
    </div>

    <div class="card">
      <div class="card-body">

        <div class="table-responsive">

          <table class="table table-hover align-middle">

            <thead>
              <tr>
                <th>Item</th>
                <th>Reported By</th>
                <th>Incident Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="incident in incidents"
                :key="incident.id"
              >

                <td>
                  {{ incident.items?.description || '-' }}
                </td>

                <td>
                  {{ incident.personnel?.full_name || incident.users?.full_name || '-' }}
                </td>

                <td>
                  {{ incident.incident_type || '-' }}
                </td>

                <td>
                  {{ incident.incident_date || '-' }}
                </td>

                <td>
                  <span class="badge bg-secondary">
                    {{ incident.status || '-' }}
                  </span>
                </td>

                <td>
                  {{ incident.description || '-' }}
                </td>

                <td>

                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="editIncident(incident)"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteIncident(incident.id)"
                  >
                    Delete
                  </button>

                </td>

              </tr>

              <tr v-if="incidents.length === 0">

                <td
                  colspan="7"
                  class="text-center text-muted py-4"
                >
                  No incidents found.
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>
    </div>


    <!-- MODAL -->

    <div
      class="modal fade"
      id="incidentModal"
      tabindex="-1"
    >

      <div class="modal-dialog modal-lg">

        <div class="modal-content">

          <div class="modal-header">

            <h5 class="modal-title">
              {{ editing ? 'Edit Incident' : 'Add Incident' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>

          </div>


          <form @submit.prevent="saveIncident">

            <div class="modal-body">

              <div class="mb-3">

                <label class="form-label">
                  Item
                </label>

                <select
                  class="form-select"
                  v-model="form.item_id"
                  required
                >

                  <option value="">
                    Select Item
                  </option>

                  <option
                    v-for="item in items"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.description }}
                  </option>

                </select>

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Reported By
                </label>

                <select
                  class="form-select"
                  v-model="form.reported_by"
                >

                  <option value="">
                    Select Personnel
                  </option>

                  <option
                    v-for="person in personnel"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.full_name }}
                  </option>

                </select>

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Incident Type
                </label>

                <select
                  class="form-select"
                  v-model="form.incident_type"
                  required
                >

                  <option value="Lost">
                    Lost
                  </option>

                  <option value="Damaged">
                    Damaged
                  </option>

                  <option value="Missing">
                    Missing
                  </option>

                  <option value="Stolen">
                    Stolen
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Incident Date
                </label>

                <input
                  type="date"
                  class="form-control"
                  v-model="form.incident_date"
                  required
                >

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Status
                </label>

                <select
                  class="form-select"
                  v-model="form.status"
                  required
                >

                  <option value="Open">
                    Open
                  </option>

                  <option value="Under Investigation">
                    Under Investigation
                  </option>

                  <option value="Resolved">
                    Resolved
                  </option>

                  <option value="Closed">
                    Closed
                  </option>

                </select>

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Description
                </label>

                <textarea
                  class="form-control"
                  rows="4"
                  v-model="form.description"
                  required
                ></textarea>

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Action Taken
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.action_taken"
                ></textarea>

              </div>


              <div class="mb-3">

                <label class="form-label">
                  Remarks
                </label>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.remarks"
                ></textarea>

              </div>

            </div>


            <div class="modal-footer">

              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-warning"
                :disabled="saving"
              >
                {{ saving ? 'Saving...' : 'Save Incident' }}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>

  </div>
</template>


<script>

import { Modal } from 'bootstrap'

export default {

  name: 'Incidents',

  data() {

    return {

      incidents: [],

      items: [],

      personnel: [],

      editing: false,

      saving: false,

      form: {

        id: null,

        item_id: '',

        reported_by: '',

        incident_type: 'Lost',

        incident_date: '',

        status: 'Open',

        description: '',

        action_taken: '',

        remarks: ''

      }

    }

  },


  mounted() {

    this.getIncidents()
    this.getItems()
    this.getPersonnel()

  },


  methods: {

    async getIncidents() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/incidents'
        )

        const data = await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to load incidents'
          )

        }

        this.incidents = data

      } catch (error) {

        console.log(error)
        alert(error.message)

      }

    },


    async getItems() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/items'
        )

        const data = await response.json()

        if (response.ok) {

          this.items = data

        }

      } catch (error) {

        console.log(error)

      }

    },


    async getPersonnel() {

      try {

        const response = await fetch(
          'http://localhost:5000/api/personnel'
        )

        const data = await response.json()

        if (response.ok) {

          this.personnel = data

        }

      } catch (error) {

        console.log(error)

      }

    },


    openAddModal() {

      this.editing = false

      this.form = {

        id: null,

        item_id: '',

        reported_by: '',

        incident_type: 'Lost',

        incident_date:
          new Date().toISOString().split('T')[0],

        status: 'Open',

        description: '',

        action_taken: '',

        remarks: ''

      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('incidentModal')
        )

      modal.show()

    },


    editIncident(incident) {

      this.editing = true

      this.form = {

        id: incident.id,

        item_id:
          incident.item_id,

        reported_by:
          incident.reported_by || '',

        incident_type:
          incident.incident_type,

        incident_date:
          incident.incident_date || '',

        status:
          incident.status,

        description:
          incident.description || '',

        action_taken:
          incident.action_taken || '',

        remarks:
          incident.remarks || ''

      }

      const modal =
        Modal.getOrCreateInstance(
          document.getElementById('incidentModal')
        )

      modal.show()

    },


    async saveIncident() {

      this.saving = true

      try {

        let url =
          'http://localhost:5000/api/incidents'

        let method = 'POST'

        if (this.editing) {

          url =
            `http://localhost:5000/api/incidents/${this.form.id}`

          method = 'PUT'

        }

        const response = await fetch(url, {

          method: method,

          headers: {

            'Content-Type':
              'application/json'

          },

          body: JSON.stringify({

            item_id:
              this.form.item_id,

            reported_by:
              this.form.reported_by || null,

            incident_type:
              this.form.incident_type,

            incident_date:
              this.form.incident_date,

            status:
              this.form.status,

            description:
              this.form.description,

            action_taken:
              this.form.action_taken,

            remarks:
              this.form.remarks

          })

        })

        const data =
          await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to save incident'
          )

        }

        const modal =
          Modal.getOrCreateInstance(
            document.getElementById('incidentModal')
          )

        modal.hide()

        await this.getIncidents()

      } catch (error) {

        console.log(error)
        alert(error.message)

      } finally {

        this.saving = false

      }

    },


    async deleteIncident(id) {

      if (
        !confirm(
          'Are you sure you want to delete this incident?'
        )
      ) {

        return

      }

      try {

        const response = await fetch(
          `http://localhost:5000/api/incidents/${id}`,
          {
            method: 'DELETE'
          }
        )

        const data =
          await response.json()

        if (!response.ok) {

          throw new Error(
            data.error || 'Failed to delete incident'
          )

        }

        await this.getIncidents()

      } catch (error) {

        console.log(error)
        alert(error.message)

      }

    }

  }

}

</script>

<style scoped>
@media (max-width: 576px) {
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

  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: .5rem auto;
  }
}
</style>