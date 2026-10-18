
<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Items</h1>
        <p class="text-secondary mb-0">Property and inventory records</p>
      </div>
      <div class="col-auto d-flex gap-2">
        <button class="btn btn-success" @click="showMovementModal = true">
          <i class="bi bi-arrow-left-right me-1"></i>
          Track Inventory
        </button>
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
              <input v-model="search" type="text" class="form-control" placeholder="Search property number or description" />
            </div>
          </div>
          <div class="col-12 col-md-3">
            <select v-model="selectedClassification" class="form-select">
              <option value="">All Classification</option>
              <option value="PAR">Property Acknowledgement Receipt</option>
              <option value="ICS High">Inventory Custodian Slip - High Value</option>
              <option value="ICS Low">Inventory Custodian Slip - Low Value</option>
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

    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">Total Items</small>
          <h4 class="mb-0 mt-1">{{ items.length }}</h4>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">Property Acknowledgement Receipt</small>
          <h4 class="mb-0 mt-1">{{ countClassification('PAR') }}</h4>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">Inventory Custodian Slip - High Value</small>
          <h4 class="mb-0 mt-1">{{ countClassification('ICS High') }}</h4>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="border rounded p-3 bg-white">
          <small class="text-secondary">Inventory Custodian Slip - Low Value</small>
          <h4 class="mb-0 mt-1">{{ countClassification('ICS Low') }}</h4>
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
              <input v-model="newItem.property_number" type="text" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Serial Number</label>
              <input v-model="newItem.serial_number" type="text" class="form-control" />
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <input v-model="newItem.description" type="text" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Quantity in Stock</label>
              <input v-model.number="newItem.quantity" type="number" min="0" step="1" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Unit</label>
              <input v-model.trim="newItem.unit" type="text" class="form-control" placeholder="e.g., piece, pack, box" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Cost</label>
              <div class="input-group">
                <span class="input-group-text">₱</span>
                <input v-model="newItem.cost" type="number" min="0" step="0.01" class="form-control" required />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Acquisition Date</label>
              <input v-model="newItem.acquisition_date" type="date" class="form-control" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Accountable Employee</label>
              <select v-model="newItem.accountable_employee" class="form-select" @change="autoFillOffice(newItem)">
                <option value="">Select personnel (optional)</option>
                <option v-for="person in personnelOptions" :key="person.id" :value="person.full_name">
                  {{ person.full_name }}
                </option>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Responsibility Center</label>
              <select v-model="newItem.responsibility_center" class="form-select">
                <option value="">Select office (optional)</option>
                <option v-for="office in officeOptions" :key="office.id" :value="office.office_name">
                  {{ office.office_name }}
                </option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Classification</label>
              <select v-model="newItem.classification" class="form-select" required>
                <option value="PAR">Property Acknowledgement Receipt</option>
                <option value="ICS High">Inventory Custodian Slip - High Value</option>
                <option value="ICS Low">Inventory Custodian Slip - Low Value</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Condition</label>
              <select v-model="newItem.condition" class="form-select" required>
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Status</label>
              <select v-model="newItem.status" class="form-select" required>
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
              <th>Quantity</th>
              <th>Unit</th>
              <th>Serial No.</th>
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
              <td colspan="13" class="text-center py-5">Loading items...</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="13" class="text-center text-danger py-5">{{ error }}</td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="13" class="text-center text-secondary py-5">No items found.</td>
            </tr>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>{{ item.property_number || '-' }}</td>
              <td>{{ item.description || '-' }}</td>
              <td>{{ item.quantity ?? 0 }}</td>
              <td>{{ item.unit || '-' }}</td>
              <td>{{ item.serial_number || '-' }}</td>
              <td>₱{{ item.cost || 0 }}</td>
              <td>{{ item.acquisition_date || '-' }}</td>
              <td>
                <span class="badge" :class="getClassificationClass(item.classification)">
                  {{ displayClassification(item.classification) }}
                </span>
              </td>
              <td>
                <span class="badge" :class="getConditionClass(item.condition)">
                  {{ item.condition || '-' }}
                </span>
              </td>
              <td>
                <span class="badge" :class="getStatusClass(item.status)">
                  {{ item.status || '-' }}
                </span>
              </td>
              <td>{{ item.accountable_employee || '-' }}</td>
              <td>{{ item.responsibility_center || '-' }}</td>
              <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-primary" @click="showItemDetails(item)" title="View item details">
                    <i class="bi bi-eye me-1"></i>
                    Details
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteItem(item)" :disabled="deletingItemId === item.id" title="Delete item">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="detailItem" class="detail-overlay" @click.self="closeItemDetails">
      <section class="detail-dialog card" role="dialog" aria-modal="true" aria-labelledby="item-details-title">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h2 id="item-details-title" class="h5 mb-0">Item Details</h2>
          <button type="button" class="btn-close" aria-label="Close" @click="closeItemDetails"></button>
        </div>
        <div class="card-body">
          <div class="row g-4 align-items-center">
            <div class="col-12 col-md-4 text-center">
              <div v-if="detailQrCode" class="qr-code-frame">
                <img :src="detailQrCode" :alt="'QR code for property ' + (detailItem.property_number || '')" />
              </div>
              <div v-else-if="qrCodeError" class="text-danger small">{{ qrCodeError }}</div>
              <div v-else class="text-secondary">Generating QR code...</div>
              <div class="fw-semibold mt-2">{{ detailItem.property_number || 'No property number' }}</div>
              <small class="text-secondary d-block">Scan to download this item document</small>
              <small v-if="isLocalDevelopmentHost" class="text-warning d-block mt-2">
                For phone scanning, open this app using your laptop's Wi-Fi address, not localhost.
              </small>
            </div>
            <div class="col-12 col-md-8">
              <dl class="row mb-0 item-detail-list">
                <dt class="col-sm-5">Description</dt>
                <dd class="col-sm-7">{{ detailItem.description || '-' }}</dd>
                <dt class="col-sm-5">Serial Number</dt>
                <dd class="col-sm-7">{{ detailItem.serial_number || '-' }}</dd>
                <dt class="col-sm-5">Quantity</dt>
                <dd class="col-sm-7">{{ detailItem.quantity ?? 0 }} {{ detailItem.unit || '' }}</dd>
                <dt class="col-sm-5">Cost</dt>
                <dd class="col-sm-7">₱{{ detailItem.cost || 0 }}</dd>
                <dt class="col-sm-5">Acquisition Date</dt>
                <dd class="col-sm-7">{{ detailItem.acquisition_date || '-' }}</dd>
                <dt class="col-sm-5">Classification</dt>
                <dd class="col-sm-7">{{ displayClassification(detailItem.classification) }}</dd>
                <dt class="col-sm-5">Condition</dt>
                <dd class="col-sm-7">
                  <span class="badge" :class="getConditionClass(detailItem.condition)">
                    {{ detailItem.condition || '-' }}
                  </span>
                </dd>
                <dt class="col-sm-5">Status</dt>
                <dd class="col-sm-7">
                  <span class="badge" :class="getStatusClass(detailItem.status)">
                    {{ detailItem.status || '-' }}
                  </span>
                </dd>
                <dt class="col-sm-5">Accountable Employee</dt>
                <dd class="col-sm-7">{{ detailItem.accountable_employee || '-' }}</dd>
                <dt class="col-sm-5">Responsibility Center</dt>
                <dd class="col-sm-7">{{ detailItem.responsibility_center || '-' }}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="closeItemDetails">Close</button>
          <button
            type="button"
            class="btn btn-outline-success"
            :disabled="downloadingDocument || !detailQrCode"
            @click="downloadItemDocument"
          >
            <i class="bi bi-download me-1"></i>
            {{ downloadingDocument ? 'Preparing document...' : 'Download DOCX' }}
          </button>
          <button type="button" class="btn btn-success" @click="editItemFromDetails">
            <i class="bi bi-pencil me-1"></i>
            Edit Item
          </button>
        </div>
      </section>
    </div>

    <div v-if="editingItem" class="edit-overlay" @click.self="cancelEdit">
      <div class="edit-sidebar">
        <div class="edit-sidebar-header">
          <h5 class="mb-0">Edit Item</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="cancelEdit"></button>
        </div>
        <form class="edit-sidebar-form" @submit.prevent="updateItem">
          <div class="edit-sidebar-body">
            <div class="mb-3">
              <label class="form-label">Property Number</label>
              <input v-model="editForm.property_number" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Serial Number</label>
              <input v-model="editForm.serial_number" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <input v-model="editForm.description" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Quantity in Stock</label>
              <input v-model.number="editForm.quantity" type="number" min="0" step="1" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Unit</label>
              <input v-model.trim="editForm.unit" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Cost</label>
              <input v-model="editForm.cost" type="number" min="0" step="0.01" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Acquisition Date</label>
              <input v-model="editForm.acquisition_date" type="date" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Classification</label>
              <select v-model="editForm.classification" class="form-select" required>
                <option value="PAR">Property Acknowledgement Receipt</option>
                <option value="ICS High">Inventory Custodian Slip - High Value</option>
                <option value="ICS Low">Inventory Custodian Slip - Low Value</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Condition</label>
              <select v-model="editForm.condition" class="form-select" required>
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Status</label>
              <select v-model="editForm.status" class="form-select" required>
                <option value="Available">Available</option>
                <option value="Issued">Issued</option>
                <option value="Returned">Returned</option>
                <option value="Lost">Lost</option>
                <option value="Damaged">Damaged</option>
                <option value="Stolen">Stolen</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Accountable Employee</label>
              <select v-model="editForm.accountable_employee" class="form-select" @change="autoFillOffice(editForm)">
                <option value="">Select personnel (optional)</option>
                <option v-for="person in personnelOptions" :key="person.id" :value="person.full_name">
                  {{ person.full_name }}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Responsibility Center</label>
              <select v-model="editForm.responsibility_center" class="form-select">
                <option value="">Select office (optional)</option>
                <option v-for="office in officeOptions" :key="office.id" :value="office.office_name">
                  {{ office.office_name }}
                </option>
              </select>
            </div>
          </div>
          <div class="edit-sidebar-footer">
            <button type="button" class="btn btn-secondary" @click="cancelEdit">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="updating">
              {{ updating ? 'Updating...' : 'Update Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <InventoryMovementModal
      v-if="showMovementModal"
      @close="showMovementModal = false"
      @saved="handleMovementSaved"
    />
  </div>
</template>

<script>
import InventoryMovementModal from '@/components/InventoryMovementModal.vue'
import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import QRCode from 'qrcode'

export default {
  name: 'Items',
  components: {
    InventoryMovementModal,
  },
  data() {
    return {
      items: [],
      itemsLoaded: false,
      personnel: [],
      offices: [],
      loading: false,
      saving: false,
      updating: false,
      error: '',
      search: '',
      selectedClassification: '',
      selectedStatus: '',
      showAddForm: false,
      showMovementModal: false,
      detailItem: null,
      detailQrCode: '',
      qrCodeError: '',
      downloadingDocument: false,
      editingItem: null,
      deletingItemId: null,
      newItem: {
        property_number: '',
        description: '',
        quantity: 0,
        unit: 'unit',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: '',
      },
      editForm: {
        property_number: '',
        description: '',
        quantity: 0,
        unit: 'unit',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: '',
      },
    }
  },
  computed: {
    filteredItems() {
      const searchValue = this.search.toLowerCase().trim()

      return this.items.filter((item) => {
        const matchesSearch =
          !searchValue ||
          (item.property_number || '').toLowerCase().includes(searchValue) ||
          (item.description || '').toLowerCase().includes(searchValue) ||
          (item.serial_number || '').toLowerCase().includes(searchValue)

        const matchesClassification =
          !this.selectedClassification || item.classification === this.selectedClassification

        const matchesStatus = !this.selectedStatus || item.status === this.selectedStatus

        return matchesSearch && matchesClassification && matchesStatus
      })
    },
    personnelOptions() {
      return this.personnel.filter((person) => person && person.full_name)
    },
    officeOptions() {
      return this.offices.filter((office) => office && office.office_name)
    },
    isLocalDevelopmentHost() {
      return ['localhost', '127.0.0.1'].includes(window.location.hostname)
    },
  },
  mounted() {
    this.getItems()
    this.getPersonnelAndOffices()
  },
  watch: {
    '$route.query.item'(itemId) {
      this.openItemFromRoute(itemId)
    },
  },
  methods: {
    async fetchJson(url) {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to load data')
      }

      return response.json()
    },

    async getPersonnelAndOffices() {
      const results = await Promise.allSettled([
        this.fetchJson('/api/personnel'),
        this.fetchJson('/api/offices'),
      ])

      if (results[0].status === 'fulfilled') {
        this.personnel = Array.isArray(results[0].value) ? results[0].value : []
      }

      if (results[1].status === 'fulfilled') {
        this.offices = Array.isArray(results[1].value) ? results[1].value : []
      }

      if (results.some((result) => result.status === 'rejected')) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Failed to load personnel and office options',
          }),
        )
      }
    },

    autoFillOffice(form) {
      const person = this.personnel.find((p) => p.full_name === form.accountable_employee)

      if (!person || !person.office_id) {
        return
      }

      const office = this.offices.find((o) => o.id === person.office_id)

      if (office) {
        form.responsibility_center = office.office_name
      }
    },

    async getItems() {
      this.loading = true

      try {
        const response = await fetch('/api/items')

        if (!response.ok) {
          throw new Error('Failed to get items')
        }

        this.items = await response.json()
        this.itemsLoaded = true
        this.error = ''
        this.openItemFromRoute(this.$route.query.item)
      } catch (error) {
        console.log(error)
        this.error = error.message

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message,
          }),
        )
      } finally {
        this.loading = false
      }
    },

    countClassification(classification) {
      return this.items.filter((item) => item.classification === classification).length
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
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.newItem),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add item')
        }

        this.items.unshift(data)
        this.resetForm()
        this.showAddForm = false

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Item added successfully',
          }),
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message,
          }),
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
        quantity: Number(item.quantity ?? 0),
        unit: item.unit || 'unit',
        serial_number: item.serial_number || '',
        cost: item.cost || 0,
        acquisition_date: item.acquisition_date || '',
        classification: item.classification || 'PAR',
        condition: item.condition || 'Serviceable',
        status: item.status || 'Available',
        accountable_employee: item.accountable_employee || '',
        responsibility_center: item.responsibility_center || '',
      }
    },

    async showItemDetails(item) {
      this.detailItem = item
      this.detailQrCode = ''
      this.qrCodeError = ''

      try {
        const response = await fetch(
          `/api/items/${encodeURIComponent(item.id)}/document-link`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin: window.location.origin }),
          },
        )

        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(
            'The backend needs to be restarted to enable QR document downloads. Restart it, then reload the app.',
          )
        }

        const linkData = await response.json()

        if (!response.ok) {
          throw new Error(linkData.error || 'Failed to create the item document link.')
        }

        if (typeof linkData.downloadUrl !== 'string' || !linkData.downloadUrl.startsWith('/api/item-documents/')) {
          throw new Error('The backend returned an invalid document download link.')
        }

        const documentUrl = new URL(linkData.downloadUrl, window.location.origin).toString()

        const qrCode = await QRCode.toDataURL(
          documentUrl,
          { errorCorrectionLevel: 'L', margin: 2, width: 400 },
        )

        if (this.detailItem?.id === item.id) {
          this.detailQrCode = qrCode
        }
      } catch (error) {
        console.error('Failed to generate item QR code:', error)
        if (this.detailItem?.id === item.id) {
          this.qrCodeError = error.message || 'Unable to generate the QR code.'
        }
      }
    },

    async downloadItemDocument() {
      const item = this.detailItem

      if (!item || !this.detailQrCode) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'The item QR code is not ready yet.',
          }),
        )
        return
      }

      this.downloadingDocument = true

      try {
        const base64QrCode = this.detailQrCode.split(',')[1]

        if (!base64QrCode) {
          throw new Error('The item QR code is unavailable.')
        }

        const qrImage = Uint8Array.from(atob(base64QrCode), (character) =>
          character.charCodeAt(0),
        )
        const itemDetails = [
          ['Property Number', item.property_number || '-'],
          ['Description', item.description || '-'],
          ['Serial Number', item.serial_number || '-'],
          ['Quantity', `${item.quantity ?? 0} ${item.unit || ''}`.trim()],
          [
            'Unit Cost',
            `PHP ${Number(item.cost || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
          ['Date Acquired', item.acquisition_date || '-'],
          ['Classification', this.displayClassification(item.classification)],
          ['Condition', item.condition || '-'],
          ['Status', item.status || '-'],
          ['Accountable Employee', item.accountable_employee || '-'],
          ['Responsibility Center / Office', item.responsibility_center || '-'],
        ]
        const documentFile = new DocxDocument({
          sections: [
            {
              children: [
                new Paragraph({
                  text: 'Property Item Details',
                  heading: HeadingLevel.TITLE,
                }),
                ...itemDetails.map(
                  ([label, value]) =>
                    new Paragraph({
                      children: [
                        new TextRun({ text: `${label}: `, bold: true }),
                        new TextRun(value),
                      ],
                    }),
                ),
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: qrImage,
                      transformation: { width: 220, height: 220 },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            },
          ],
        })
        const blob = await Packer.toBlob(documentFile)
        const downloadUrl = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')
        const safePropertyNumber = (item.property_number || 'item')
          .trim()
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
          .replace(/\s+/g, '-')
          .replace(/[. ]+$/g, '')

        downloadLink.href = downloadUrl
        downloadLink.download = `property-${safePropertyNumber || 'item'}.docx`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        downloadLink.remove()
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Item document downloaded successfully.',
          }),
        )
      } catch (error) {
        console.error('Failed to create item document:', error)
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Failed to create the item document.',
          }),
        )
      } finally {
        this.downloadingDocument = false
      }
    },

    openItemFromRoute(itemId) {
      if (!itemId || !this.itemsLoaded) {
        return
      }

      const item = this.items.find((currentItem) => String(currentItem.id) === String(itemId))

      if (!item) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'The item linked by this QR code could not be found.',
          }),
        )
        return
      }

      this.showItemDetails(item)
    },

    closeItemDetails() {
      this.detailItem = null
      this.detailQrCode = ''
      this.qrCodeError = ''

      if (this.$route.query.item) {
        const query = { ...this.$route.query }
        delete query.item
        this.$router.replace({ name: 'Items', query })
      }
    },

    editItemFromDetails() {
      if (!this.detailItem) {
        return
      }

      const item = this.detailItem
      this.closeItemDetails()
      this.startEdit(item)
    },

    async updateItem() {
      if (!this.editingItem) {
        return
      }

      this.updating = true

      try {
        const response = await fetch(
          '/api/items/' + this.editingItem.id,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.editForm),
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update item')
        }

        const index = this.items.findIndex((item) => item.id === this.editingItem.id)

        if (index !== -1) {
          this.items[index] = data
        }

        if (this.detailItem && this.detailItem.id === data.id) {
          this.detailItem = data
        }

        this.editingItem = null

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Item updated successfully',
          }),
        )
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message,
          }),
        )
      } finally {
        this.updating = false
      }
    },

    async deleteItem(item) {
      const confirmed = window.confirm(
        'Are you sure you want to delete "' +
          (item.description || item.property_number || 'this item') +
          '"? This action cannot be undone.',
      )

      if (!confirmed || this.deletingItemId !== null) {
        return
      }

      this.deletingItemId = item.id

      try {
        const response = await fetch('/api/items/' + item.id, {
          method: 'DELETE',
        })

        const responseText = await response.text()
        let data = {}

        if (responseText) {
          try {
            data = JSON.parse(responseText)
          } catch (parseError) {
            throw new Error('The server returned an invalid response while deleting the item.')
          }
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete item. Please try again.')
        }

        this.items = this.items.filter((currentItem) => currentItem.id !== item.id)

        if (this.editingItem && this.editingItem.id === item.id) {
          this.editingItem = null
        }

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: data.message || 'Item deleted successfully',
          }),
        )
      } catch (error) {
        console.error(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message || 'Unable to delete this item.',
          }),
        )
      } finally {
        this.deletingItemId = null
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
        quantity: 0,
        unit: 'unit',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: '',
      }
    },

    handleMovementSaved() {
      this.showMovementModal = false
      this.getItems()
    },

    getConditionClass(condition) {
      if (condition === 'Serviceable') {
        return 'bg-success'
      }

      if (condition === 'Unserviceable') {
        return 'bg-danger'
      }

      return 'bg-secondary'
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
  },
}
</script>

<style scoped>
h1 {
  color: #2f5d3a;
}

.btn-warning {
  background-color: #e8c547;
  border-color: #e8c547;
  color: #2f5d3a;
}

.btn-warning:hover {
  background-color: #d8b638;
  border-color: #d8b638;
}

.table thead th {
  background-color: #2f5d3a;
  color: white;
  white-space: nowrap;
}

.table td {
  white-space: nowrap;
  vertical-align: middle;
}

.classification-par {
  background-color: #2f5d3a;
  color: white;
}

.classification-high {
  background-color: #e8c547;
  color: #2f5d3a;
}

.classification-low {
  background-color: #dcebdc;
  color: #2f5d3a;
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

.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1040;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.45);
}

.detail-dialog {
  width: min(760px, 100%);
  max-height: 100%;
  overflow-y: auto;
}

.qr-code-frame {
  display: inline-flex;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  background: white;
}

.qr-code-frame img {
  display: block;
  width: 180px;
  height: 180px;
}

.item-detail-list dt,
.item-detail-list dd {
  margin-bottom: 0.75rem;
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
  background-color: #2f5d3a;
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
