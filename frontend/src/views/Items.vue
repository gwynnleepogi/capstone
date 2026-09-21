
<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Items</h1>
        <p class="text-secondary mb-0">Property and inventory records</p>
      </div>

      <div class="col-auto">
        <button class="btn btn-warning" @click="showAddForm = true">
          <i class="bi bi-plus-lg me-1"></i>
          Add Item
        </button>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-12 col-md">
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-search"></i>
              </span>

              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search property number or description"
              >
            </div>
          </div>

          <div class="col-12 col-md-3">
            <select
              v-model="selectedClassification"
              class="form-select"
            >
              <option value="">All Classification</option>
              <option value="PAR">
                Property Acknowledgement Receipt
              </option>
              <option value="ICS High">Inventory Custodian Slip - High Value</option>
              <option value="ICS Low">Inventory Custodian Slip - Low Value</option>
            </select>
          </div>

          <div class="col-12 col-md-3">
            <select
              v-model="selectedStatus"
              class="form-select"
            >
              <option value="">All Status</option>
              <option value="Available">Available</option>
              <option value="Issued">Issued</option>
              <option value="Returned">Returned</option>
              <option value="Lost">Lost</option>
              <option value="Damaged">Damaged</option>
              <option value="Stolen">Stolen</option>
              <option value="Disposed">Disposed</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">Total Items</small>
          <h4 class="mb-0 mt-1">{{ items.length }}</h4>
        </div>
      </div>

      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">
            Property Acknowledgement Receipt
          </small>

          <h4 class="mb-0 mt-1">
            {{ countClassification('PAR') }}
          </h4>
        </div>
      </div>

      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">ICS High</small>

          <h4 class="mb-0 mt-1">
            {{ countClassification('ICS High') }}
          </h4>
        </div>
      </div>

      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">ICS Low</small>

          <h4 class="mb-0 mt-1">
            {{ countClassification('ICS Low') }}
          </h4>
        </div>
      </div>
    </div>

    <div v-if="showAddForm" class="card mb-4">
      <div class="card-header bg-white">
        <strong>Add New Item</strong>
      </div>

      <form @submit.prevent="addItem">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Property Number</label>

              <input
                v-model="newItem.property_number"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Serial Number</label>

              <input
                v-model="newItem.serial_number"
                type="text"
                class="form-control"
              >
            </div>

            <div class="col-12">
              <label class="form-label">Description</label>

              <input
                v-model="newItem.description"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Supplier</label>

              <input
                v-model="newItem.supplier_id"
                type="text"
                class="form-control"
              >
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Cost</label>

              <div class="input-group">
                <span class="input-group-text">₱</span>

                <input
                  v-model="newItem.cost"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control"
                  required
                >
              </div>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Acquisition Date</label>

              <input
                v-model="newItem.acquisition_date"
                type="date"
                class="form-control"
              >
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Accountable Employee</label>

              <input
                v-model="newItem.accountable_employee"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="col-12">
              <label class="form-label">Responsibility Center</label>

              <input
                v-model="newItem.responsibility_center"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Classification</label>

              <select
                v-model="newItem.classification"
                class="form-select"
                required
              >
                <option value="PAR">
                  Property Acknowledgement Receipt
                </option>

                <option value="ICS High">ICS High</option>
                <option value="ICS Low">ICS Low</option>
              </select>
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Condition</label>

              <select
                v-model="newItem.condition"
                class="form-select"
                required
              >
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Status</label>

              <select
                v-model="newItem.status"
                class="form-select"
                required
              >
                <option value="Available">Available</option>
                <option value="Issued">Issued</option>
                <option value="Returned">Returned</option>
                <option value="Lost">Lost</option>
                <option value="Damaged">Damaged</option>
                <option value="Stolen">Stolen</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card-footer bg-white">
          <button
            type="button"
            class="btn btn-secondary me-2"
            @click="cancelAdd"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-success"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save Item' }}
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header bg-white">
        <strong>Inventory Items</strong>
      </div>

      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>Property No.</th>
              <th>Description</th>
              <th>Serial No.</th>
              <th>Supplier</th>
              <th>Cost</th>
              <th>Acquisition Date</th>
              <th>Classification</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Accountable Employee</th>
              <th>Responsibility Center</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="12" class="text-center py-5">
                Loading items...
              </td>
            </tr>

            <tr v-else-if="error">
              <td colspan="12" class="text-center text-danger py-5">
                {{ error }}
              </td>
            </tr>

            <tr v-else-if="filteredItems.length === 0">
              <td colspan="12" class="text-center text-secondary py-5">
                No items found.
              </td>
            </tr>

            <tr
              v-for="item in filteredItems"
              :key="item.id"
            >
              <td>{{ item.property_number || '-' }}</td>
              <td>{{ item.description || '-' }}</td>
              <td>{{ item.serial_number || '-' }}</td>
              <td>{{ item.supplier_id || '-' }}</td>
              <td>₱{{ item.cost || 0 }}</td>
              <td>{{ item.acquisition_date || '-' }}</td>

              <td>
                <span
                  class="badge"
                  :class="getClassificationClass(item.classification)"
                >
                  {{ displayClassification(item.classification) }}
                </span>
              </td>

              <td>{{ item.condition || '-' }}</td>

              <td>
                <span
                  class="badge"
                  :class="getStatusClass(item.status)"
                >
                  {{ item.status || '-' }}
                </span>
              </td>

              <td>{{ item.accountable_employee || '-' }}</td>
              <td>{{ item.responsibility_center || '-' }}</td>

              <td>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-success me-1"
                  @click="startEdit(item)"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteItem(item)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="editingItem"
      class="edit-overlay"
      @click="cancelEdit"
    >
      <div
        class="edit-sidebar"
        @click.stop
      >
        <div class="edit-sidebar-header">
          <h5 class="mb-0">Edit Item</h5>

          <button
            type="button"
            class="btn-close"
            @click="cancelEdit"
          ></button>
        </div>

        <form
          @submit.prevent="updateItem"
          class="edit-sidebar-form"
        >
          <div class="edit-sidebar-body">
            <div class="mb-3">
              <label class="form-label">Property Number</label>

              <input
                v-model="editForm.property_number"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Serial Number</label>

              <input
                v-model="editForm.serial_number"
                type="text"
                class="form-control"
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Description</label>

              <input
                v-model="editForm.description"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Supplier</label>

              <input
                v-model="editForm.supplier_id"
                type="text"
                class="form-control"
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Cost</label>

              <div class="input-group">
                <span class="input-group-text">₱</span>

                <input
                  v-model="editForm.cost"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control"
                  required
                >
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Acquisition Date</label>

              <input
                v-model="editForm.acquisition_date"
                type="date"
                class="form-control"
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Accountable Employee</label>

              <input
                v-model="editForm.accountable_employee"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Responsibility Center</label>

              <input
                v-model="editForm.responsibility_center"
                type="text"
                class="form-control"
                required
              >
            </div>

            <div class="mb-3">
              <label class="form-label">Classification</label>

              <select
                v-model="editForm.classification"
                class="form-select"
                required
              >
                <option value="PAR">
                  Property Acknowledgement Receipt
                </option>

                <option value="ICS High">ICS High</option>
                <option value="ICS Low">ICS Low</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Condition</label>

              <select
                v-model="editForm.condition"
                class="form-select"
                required
              >
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Status</label>

              <select
                v-model="editForm.status"
                class="form-select"
                required
              >
                <option value="Available">Available</option>
                <option value="Issued">Issued</option>
                <option value="Returned">Returned</option>
                <option value="Lost">Lost</option>
                <option value="Damaged">Damaged</option>
                <option value="Stolen">Stolen</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
          </div>

          <div class="edit-sidebar-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="cancelEdit"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="btn btn-success"
              :disabled="updating"
            >
              {{ updating ? 'Updating...' : 'Update Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('accessToken')

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
}

export default {
  name: 'Items',

  data() {
    return {
      items: [],
      search: '',
      selectedClassification: '',
      selectedStatus: '',
      loading: true,
      saving: false,
      updating: false,
      error: '',
      showAddForm: false,
      editingItem: null,

      newItem: {
        property_number: '',
        description: '',
        serial_number: '',
        supplier_id: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: ''
      },

      editForm: {
        property_number: '',
        description: '',
        serial_number: '',
        supplier_id: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: ''
      }
    }
  },

  computed: {
    filteredItems() {
      const search = this.search.toLowerCase().trim()

      return this.items.filter(item => {
        const matchesSearch =
          !search ||
          String(item.property_number || '').toLowerCase().includes(search) ||
          String(item.description || '').toLowerCase().includes(search) ||
          String(item.serial_number || '').toLowerCase().includes(search) ||
          String(item.accountable_employee || '').toLowerCase().includes(search) ||
          String(item.responsibility_center || '').toLowerCase().includes(search) ||
          String(item.condition || '').toLowerCase().includes(search) ||
          String(item.status || '').toLowerCase().includes(search) ||
          String(item.classification || '').toLowerCase().includes(search)

        const matchesClassification =
          !this.selectedClassification ||
          item.classification === this.selectedClassification

        const matchesStatus =
          !this.selectedStatus ||
          item.status === this.selectedStatus

        return matchesSearch &&
          matchesClassification &&
          matchesStatus
      })
    }
  },

  async mounted() {
    await this.getItems()
  },

  methods: {
    async getItems() {
      this.loading = true

      try {
        const response = await apiRequest(
          'http://localhost:5000/api/items'
        )

        if (!response.ok) {
          throw new Error('Failed to get items')
        }

        this.items = await response.json()
        this.error = ''
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
        item => item.classification === classification
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

    getClassificationClass(classification) {
      if (classification === 'PAR') {
        return 'classification-par'
      }

      if (classification === 'ICS High') {
        return 'classification-high'
      }

      if (classification === 'ICS Low') {
        return 'classification-low'
      }

      return 'classification-default'
    },

    async addItem() {
      this.saving = true

      try {
        const response = await apiRequest(
          'http://localhost:5000/api/items',
          {
            method: 'POST',
            body: JSON.stringify(this.newItem)
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to add item'
          )
        }

        this.items.unshift(data)
        this.resetForm()
        this.showAddForm = false

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Item added successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      } finally {
        this.saving = false
      }
    },

    startEdit(item) {
      this.editingItem = item

      this.editForm = {
        property_number: item.property_number || '',
        description: item.description || '',
        serial_number: item.serial_number || '',
        supplier_id: item.supplier_id || '',
        cost: item.cost || 0,
        acquisition_date: item.acquisition_date || '',
        classification: item.classification || 'PAR',
        condition: item.condition || 'Serviceable',
        status: item.status || 'Available',
        accountable_employee: item.accountable_employee || '',
        responsibility_center: item.responsibility_center || ''
      }
    },

    async updateItem() {
      if (!this.editingItem) {
        return
      }

      this.updating = true

      try {
        const response = await apiRequest(
          'http://localhost:5000/api/items/' +
          this.editingItem.id,
          {
            method: 'PUT',
            body: JSON.stringify(this.editForm)
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to update item'
          )
        }

        const index = this.items.findIndex(
          item => item.id === this.editingItem.id
        )

        if (index !== -1) {
          this.items[index] = data
        }

        this.editingItem = null

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Item updated successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      } finally {
        this.updating = false
      }
    },

    async deleteItem(item) {
      const confirmed = window.confirm(
        'Delete ' +
        (item.description || 'this item') +
        '?'
      )

      if (!confirmed) {
        return
      }

      try {
        const response = await apiRequest(
          'http://localhost:5000/api/items/' +
          item.id,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete item'
          )
        }

        this.items = this.items.filter(
          currentItem => currentItem.id !== item.id
        )

        if (
          this.editingItem &&
          this.editingItem.id === item.id
        ) {
          this.editingItem = null
        }

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Item deleted successfully'
          })
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    cancelAdd() {
      this.showAddForm = false
      this.resetForm()
    },

    cancelEdit() {
      this.editingItem = null
    },

    resetForm() {
      this.newItem = {
        property_number: '',
        description: '',
        serial_number: '',
        supplier_id: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: ''
      }
    },

    getStatusClass(status) {
      if (status === 'Available') {
        return 'bg-success'
      }

      if (status === 'Issued') {
        return 'bg-primary'
      }

      if (status === 'Returned') {
        return 'bg-info'
      }

      if (status === 'Lost') {
        return 'bg-danger'
      }

      if (status === 'Damaged') {
        return 'bg-warning text-dark'
      }

      if (status === 'Stolen') {
        return 'bg-danger'
      }

      if (status === 'Disposed') {
        return 'bg-secondary'
      }

      return 'bg-secondary'
    }
  }
}
</script>

<style scoped>
h1 {
  color: #2F5D3A;
}

.btn-warning {
  background-color: #E8C547;
  border-color: #E8C547;
  color: #2F5D3A;
}

.btn-warning:hover {
  background-color: #d8b638;
  border-color: #d8b638;
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

.classification-par {
  background-color: #2F5D3A;
  color: white;
}

.classification-high {
  background-color: #E8C547;
  color: #2F5D3A;
}

.classification-low {
  background-color: #DCEBDC;
  color: #2F5D3A;
}

.classification-default {
  background-color: #6c757d;
  color: white;
}

.edit-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.35);
  z-index: 1050;
}

.edit-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 430px;
  max-width: 100%;
  height: 100%;
  background-color: white;
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.edit-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
  background-color: #2F5D3A;
  color: white;
}

.edit-sidebar-header .btn-close {
  filter: brightness(0) invert(1);
}

.edit-sidebar-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.edit-sidebar-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.edit-sidebar-footer {
  padding: 15px 20px;
  border-top: 1px solid #dee2e6;
  background-color: white;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 576px) {
  .edit-sidebar {
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

  .edit-sidebar-footer {
    flex-wrap: wrap;
  }

  .edit-sidebar-footer .btn {
    flex: 1 1 130px;
  }
}
</style>