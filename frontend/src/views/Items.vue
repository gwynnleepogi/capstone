<template>
  <div class="container-fluid">
    <!-- HEADER -->
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

    <!-- SEARCH AND FILTERS -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-12 col-md">
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-search"></i>
              </span>
              <input v-model="search" type="text" class="form-control" placeholder="Search property number or description">
            </div>
          </div>
          <div class="col-12 col-md-3">
            <select v-model="selectedClassification" class="form-select">
              <option value="">All Classification</option>
              <option value="PAR">PAR</option>
              <option value="ICS High">ICS High</option>
              <option value="ICS Low">ICS Low</option>
            </select>
          </div>
          <div class="col-12 col-md-3">
            <select v-model="selectedStatus" class="form-select">
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

    <!-- SUMMARY -->
    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">Total Items</small>
          <h4 class="mb-0 mt-1">{{ items.length }}</h4>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">PAR</small>
          <h4 class="mb-0 mt-1">{{ countClassification('PAR') }}</h4>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">ICS High</small>
          <h4 class="mb-0 mt-1">{{ countClassification('ICS High') }}</h4>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">ICS Low</small>
          <h4 class="mb-0 mt-1">{{ countClassification('ICS Low') }}</h4>
        </div>
      </div>
    </div>

    <!-- ADD ITEM FORM -->
    <div v-if="showAddForm" class="card mb-4">
      <div class="card-header bg-white">
        <strong>Add New Item</strong>
      </div>
      <form @submit.prevent="addItem">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Property Number</label>
              <input v-model="newItem.property_number" type="text" class="form-control">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Product Number</label>
              <input v-model="newItem.product_number" type="text" class="form-control">
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <input v-model="newItem.description" type="text" class="form-control" required>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Brand</label>
              <input v-model="newItem.brand" type="text" class="form-control">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Model</label>
              <input v-model="newItem.model" type="text" class="form-control">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Date of Purchase</label>
              <input v-model="newItem.date_of_purchase" type="date" class="form-control">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Purchase Order Number</label>
              <input v-model="newItem.purchase_order_number" type="text" class="form-control">
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Price</label>
              <div class="input-group">
                <span class="input-group-text">₱</span>
                <input v-model="newItem.price" type="number" min="0" step="0.01" class="form-control" required>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Classification</label>
              <select v-model="newItem.classification" class="form-select">
                <option value="PAR">PAR</option>
                <option value="ICS High">ICS High</option>
                <option value="ICS Low">ICS Low</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Condition</label>
              <select v-model="newItem.condition" class="form-select">
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Status</label>
              <select v-model="newItem.status" class="form-select">
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
          <button type="button" class="btn btn-secondary me-2" @click="cancelAdd">Cancel</button>
          <button type="submit" class="btn btn-success" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Item' }}
          </button>
        </div>
      </form>
    </div>

    <!-- ITEMS TABLE -->
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
              <th>Brand</th>
              <th>Model</th>
              <th>Price</th>
              <th>Classification</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center py-5">Loading items...</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="9" class="text-center text-danger py-5">{{ error }}</td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="9" class="text-center text-secondary py-5">No items found.</td>
            </tr>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>{{ item.property_number || '-' }}</td>
              <td>{{ item.description || '-' }}</td>
              <td>{{ item.brand || '-' }}</td>
              <td>{{ item.model || '-' }}</td>
              <td>₱{{ item.price || 0 }}</td>
              <td>
                <span class="badge bg-success">
                  {{ item.classification || '-' }}
                </span>
              </td>
              <td>{{ item.condition || '-' }}</td>
              <td>
                <span class="badge" :class="getStatusClass(item.status)">
                  {{ item.status || '-' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-success me-1" @click="startEdit(item)">
                  <i class="bi bi-pencil"></i>
                  Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="deleteItem(item)">
                  <i class="bi bi-trash"></i>
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- EDIT SIDEBAR -->
    <div v-if="editingItem" class="edit-overlay" @click="cancelEdit">
      <div class="edit-sidebar" @click.stop>
        <div class="edit-sidebar-header">
          <h5 class="mb-0">Edit Item</h5>
          <button type="button" class="btn-close" @click="cancelEdit"></button>
        </div>

        <form @submit.prevent="updateItem" class="edit-sidebar-form">
          <div class="edit-sidebar-body">
            <div class="mb-3">
              <label class="form-label">Property Number</label>
              <input v-model="editForm.property_number" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label">Product Number</label>
              <input v-model="editForm.product_number" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label">Description</label>
              <input v-model="editForm.description" type="text" class="form-control" required>
            </div>

            <div class="mb-3">
              <label class="form-label">Brand</label>
              <input v-model="editForm.brand" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label">Model</label>
              <input v-model="editForm.model" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label">Date of Purchase</label>
              <input v-model="editForm.date_of_purchase" type="date" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label">Purchase Order Number</label>
              <input v-model="editForm.purchase_order_number" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label">Price</label>
              <div class="input-group">
                <span class="input-group-text">₱</span>
                <input v-model="editForm.price" type="number" min="0" step="0.01" class="form-control" required>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Classification</label>
              <select v-model="editForm.classification" class="form-select">
                <option value="PAR">PAR</option>
                <option value="ICS High">ICS High</option>
                <option value="ICS Low">ICS Low</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Condition</label>
              <select v-model="editForm.condition" class="form-select">
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Status</label>
              <select v-model="editForm.status" class="form-select">
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
            <button type="button" class="btn btn-secondary" @click="cancelEdit">
              Cancel
            </button>
            <button type="submit" class="btn btn-success" :disabled="updating">
              {{ updating ? 'Updating...' : 'Update Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TOAST -->
    <div v-if="toast.show" class="toast-container position-fixed bottom-0 end-0 p-3">
      <div class="toast show" :class="'toast-' + toast.type" role="alert">
        <div class="toast-body">
          <i v-if="toast.type === 'success'" class="bi bi-check-circle me-2"></i>
          <i v-else class="bi bi-exclamation-circle me-2"></i>
          {{ toast.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
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

      toast: {
        show: false,
        message: '',
        type: 'success'
      },

      newItem: {
        property_number: '',
        product_number: '',
        description: '',
        brand: '',
        model: '',
        date_of_purchase: '',
        purchase_order_number: '',
        price: 0,
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available'
      },

      editForm: {
        property_number: '',
        product_number: '',
        description: '',
        brand: '',
        model: '',
        date_of_purchase: '',
        purchase_order_number: '',
        price: 0,
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available'
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
          String(item.product_number || '').toLowerCase().includes(search) ||
          String(item.description || '').toLowerCase().includes(search) ||
          String(item.brand || '').toLowerCase().includes(search) ||
          String(item.model || '').toLowerCase().includes(search) ||
          String(item.condition || '').toLowerCase().includes(search) ||
          String(item.status || '').toLowerCase().includes(search) ||
          String(item.classification || '').toLowerCase().includes(search)

        const matchesClassification =
          !this.selectedClassification ||
          item.classification === this.selectedClassification

        const matchesStatus =
          !this.selectedStatus ||
          item.status === this.selectedStatus

        return matchesSearch && matchesClassification && matchesStatus
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
        const response = await fetch('http://localhost:5000/api/items')

        if (!response.ok) {
          throw new Error('Failed to get items')
        }

        this.items = await response.json()
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    countClassification(classification) {
      return this.items.filter(
        item => item.classification === classification
      ).length
    },

    async addItem() {
      this.saving = true

      try {
        const response = await fetch(
          'http://localhost:5000/api/items',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
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

        this.showToast(
          'Item added successfully.',
          'success'
        )
      } catch (error) {
        console.log(error)

        this.showToast(
          error.message,
          'danger'
        )
      } finally {
        this.saving = false
      }
    },

    startEdit(item) {
      this.editingItem = item

      this.editForm = {
        property_number: item.property_number || '',
        product_number: item.product_number || '',
        description: item.description || '',
        brand: item.brand || '',
        model: item.model || '',
        date_of_purchase: item.date_of_purchase || '',
        purchase_order_number: item.purchase_order_number || '',
        price: item.price || 0,
        classification: item.classification || 'PAR',
        condition: item.condition || 'Serviceable',
        status: item.status || 'Available'
      }
    },

    async updateItem() {
      if (!this.editingItem) {
        return
      }

      this.updating = true

      try {
        const response = await fetch(
          'http://localhost:5000/api/items/' +
          this.editingItem.id,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
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

        this.showToast(
          'Item updated successfully.',
          'success'
        )
      } catch (error) {
        console.log(error)

        this.showToast(
          error.message,
          'danger'
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
        const response = await fetch(
          'http://localhost:5000/api/items/' + item.id,
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

        this.showToast(
          'Item deleted successfully.',
          'success'
        )
      } catch (error) {
        console.log(error)

        this.showToast(
          error.message,
          'danger'
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
        product_number: '',
        description: '',
        brand: '',
        model: '',
        date_of_purchase: '',
        purchase_order_number: '',
        price: 0,
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available'
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
    },

    showToast(message, type) {
      this.toast.message = message
      this.toast.type = type
      this.toast.show = true

      setTimeout(() => {
        this.toast.show = false
      }, 3000)
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

/* EDIT SIDEBAR */
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

.toast-container {
  z-index: 9999;
}

.toast {
  min-width: 300px;
  border: none;
  border-radius: 8px;
}

.toast-success {
  background-color: #2F5D3A;
  color: white;
}

.toast-danger {
  background-color: #dc3545;
  color: white;
}

@media (max-width: 576px) {
  .edit-sidebar {
    width: 100%;
  }
}
</style>