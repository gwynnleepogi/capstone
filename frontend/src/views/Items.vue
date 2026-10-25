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
              <input v-model="search" type="text" class="form-control" placeholder="Search unique ID, property number, description, or serial number" />
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
          <div class="col-12 col-md-2">
            <select v-model="selectedFundCluster" class="form-select">
              <option value="">All Fund Cluster</option>
              <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
            </select>
          </div>
          <div class="col-12 col-md-2">
            <select v-model="selectedStatus" class="form-select">
              <option value="">All Status</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
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

    <div v-if="showAddForm" class="add-overlay" tabindex="-1" @keydown.esc="cancelAdd">
      <section class="add-dialog card" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <strong id="add-item-title">Add New Item</strong>
        <button type="button" class="btn-close" aria-label="Close" @click="cancelAdd"></button>
      </div>
      <form class="add-dialog-form" @submit.prevent="addItem">
        <div class="card-body add-dialog-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Property Number <span class="text-danger">*</span></label>
              <input v-model="newItem.property_number" type="text" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Model Number <span class="text-danger">*</span></label>
              <input v-model="newItem.model_number" type="text" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Serial Number <span class="text-danger">*</span></label>
              <input v-model="newItem.serial_number" type="text" class="form-control" required />
            </div>
            <div class="col-12">
              <label class="form-label">Description <span class="text-danger">*</span></label>
              <input v-model="newItem.description" type="text" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Quantity in Stock <span class="text-danger">*</span></label>
              <input v-model.number="newItem.quantity" type="number" min="0" step="1" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Cost <span class="text-danger">*</span></label>
              <div class="input-group">
                <span class="input-group-text">₱</span>
                <input v-model="newItem.cost" type="number" min="0" step="0.01" class="form-control" required />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Acquisition Date <span class="text-danger">*</span></label>
              <input v-model="newItem.acquisition_date" type="date" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Article</label>
              <input v-model.trim="newItem.article" type="text" class="form-control" placeholder="e.g. BAG" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Unit of Measure</label>
              <input v-model.trim="newItem.unit" type="text" class="form-control" list="unit-options" placeholder="e.g. PC" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">DR/CI/SI Number</label>
              <input v-model.trim="newItem.dr_ci_si_number" type="text" class="form-control" placeholder="e.g. DR 000051" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">PO No.</label>
              <input v-model.trim="newItem.po_number" type="text" class="form-control" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Supplier</label>
              <input v-model.trim="newItem.supplier" type="text" class="form-control" list="supplier-options" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Remarks</label>
              <input v-model.trim="newItem.remarks" type="text" class="form-control" />
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
            <div class="col-12 col-md-6">
              <label class="form-label">Fund Cluster <span class="text-danger">*</span></label>
              <select v-model="newItem.fund_cluster" class="form-select" required>
                <option value="" disabled>Select fund cluster</option>
                <option v-if="newItem.fund_cluster && !fundClusterOptions.includes(newItem.fund_cluster)" :value="newItem.fund_cluster">{{ newItem.fund_cluster }}</option>
                <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Classification <span class="text-danger">*</span></label>
              <select v-model="newItem.classification" class="form-select" required>
                <option value="PAR">Property Acknowledgement Receipt</option>
                <option value="ICS High">Inventory Custodian Slip - High Value</option>
                <option value="ICS Low">Inventory Custodian Slip - Low Value</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Condition <span class="text-danger">*</span></label>
              <select v-model="newItem.condition" class="form-select" required>
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Status <span class="text-danger">*</span></label>
              <select v-model="newItem.status" class="form-select" required>
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
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
      </section>
    </div>

    <div class="card">
      <div class="card-header bg-white">
        <strong>Inventory Items</strong>
      </div>
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th><button type="button" class="sort-header" @click="sortBy('property_tag_identifier')">Unique ID <i :class="sortIcon('property_tag_identifier')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('property_number')">Property No. <i :class="sortIcon('property_number')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('description')">Description <i :class="sortIcon('description')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('quantity')">Quantity <i :class="sortIcon('quantity')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('serial_number')">Serial No. <i :class="sortIcon('serial_number')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('cost')">Cost <i :class="sortIcon('cost')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('acquisition_date')">Acquisition Date <i :class="sortIcon('acquisition_date')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('classification')">Classification <i :class="sortIcon('classification')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('fund_cluster')">Fund Cluster <i :class="sortIcon('fund_cluster')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('condition')">Condition <i :class="sortIcon('condition')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('status')">Status <i :class="sortIcon('status')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('accountable_employee')">Accountable Employee <i :class="sortIcon('accountable_employee')"></i></button></th>
              <th><button type="button" class="sort-header" @click="sortBy('responsibility_center')">Responsibility Center <i :class="sortIcon('responsibility_center')"></i></button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="14" class="text-center py-5">Loading items...</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="14" class="text-center text-danger py-5">{{ error }}</td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="14" class="text-center text-secondary py-5">No items found.</td>
            </tr>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>
                {{
                  item.property_tag_identifier !== null && item.property_tag_identifier !== undefined
                    ? 'PROP-' + String(item.property_tag_identifier).padStart(6, '0')
                    : 'NOT ASSIGNED'
                }}
              </td>
              <td>{{ item.property_number || '-' }}</td>
              <td>{{ item.description || '-' }}</td>
              <td>{{ item.quantity ?? 0 }}</td>
              <td>{{ item.serial_number || '-' }}</td>
              <td>₱{{ item.cost || 0 }}</td>
              <td>{{ item.acquisition_date || '-' }}</td>
              <td>
                <span class="badge" :class="getClassificationClass(item.classification)">
                  {{ displayClassification(item.classification) }}
                </span>
              </td>
              <td>{{ item.fund_cluster || '-' }}</td>
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
              <small class="text-secondary d-block">Scan to view item details</small>
              <small v-if="isLocalDevelopmentHost" class="text-warning d-block mt-2">
                For phone scanning, open this app using your laptop's Wi-Fi address, not localhost.
              </small>
            </div>
            <div class="col-12 col-md-8">
              <dl class="row mb-0 item-detail-list">
                <dt class="col-sm-5">Description</dt>
                <dd class="col-sm-7">{{ detailItem.description || '-' }}</dd>
                <dt class="col-sm-5">Model Number</dt>
                <dd class="col-sm-7">{{ detailItem.model_number || '-' }}</dd>
                <dt class="col-sm-5">Serial Number</dt>
                <dd class="col-sm-7">{{ detailItem.serial_number || '-' }}</dd>
                <dt class="col-sm-5">Quantity</dt>
                <dd class="col-sm-7">{{ detailItem.quantity ?? 0 }}</dd>
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
                <dt class="col-sm-5">Fund Cluster</dt>
                <dd class="col-sm-7">{{ detailItem.fund_cluster || '-' }}</dd>
                <dt class="col-sm-5">Article</dt>
                <dd class="col-sm-7">{{ detailItem.article || '-' }}</dd>
                <dt class="col-sm-5">Unit of Measure</dt>
                <dd class="col-sm-7">{{ detailItem.unit && detailItem.unit !== 'unit' ? detailItem.unit : '-' }}</dd>
                <dt class="col-sm-5">DR/CI/SI Number</dt>
                <dd class="col-sm-7">{{ detailItem.dr_ci_si_number || '-' }}</dd>
                <dt class="col-sm-5">PO No.</dt>
                <dd class="col-sm-7">{{ detailItem.po_number || '-' }}</dd>
                <dt class="col-sm-5">Supplier</dt>
                <dd class="col-sm-7">{{ detailItem.supplier || '-' }}</dd>
                <dt class="col-sm-5">Remarks</dt>
                <dd class="col-sm-7">{{ detailItem.remarks || '-' }}</dd>
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
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="!detailQrCode"
            @click="printPropertyTag"
          >
            <i class="bi bi-printer me-1"></i>
            Print Property Tag
          </button>
          <button type="button" class="btn btn-outline-warning" @click="editItemFromDetails">
            <i class="bi bi-pencil me-1"></i>
            Edit Item
          </button>
          <button
            type="button"
            class="btn btn-outline-danger"
            :disabled="deletingItemId === detailItem.id"
            @click="deleteItem(detailItem)"
          >
            <i class="bi bi-trash me-1"></i>
            {{ deletingItemId === detailItem.id ? 'Deleting...' : 'Delete Item' }}
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
              <label class="form-label">Property Number <span class="text-danger">*</span></label>
              <input v-model="editForm.property_number" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Model Number <span class="text-danger">*</span></label>
              <input v-model="editForm.model_number" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Serial Number <span class="text-danger">*</span></label>
              <input v-model="editForm.serial_number" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Description <span class="text-danger">*</span></label>
              <input v-model="editForm.description" type="text" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Quantity in Stock <span class="text-danger">*</span></label>
              <input v-model.number="editForm.quantity" type="number" min="0" step="1" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Cost <span class="text-danger">*</span></label>
              <input v-model="editForm.cost" type="number" min="0" step="0.01" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Acquisition Date <span class="text-danger">*</span></label>
              <input v-model="editForm.acquisition_date" type="date" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Article</label>
              <input v-model.trim="editForm.article" type="text" class="form-control" placeholder="e.g. BAG" />
            </div>
            <div class="mb-3">
              <label class="form-label">Unit of Measure</label>
              <input v-model.trim="editForm.unit" type="text" class="form-control" list="unit-options" placeholder="e.g. PC" />
            </div>
            <div class="mb-3">
              <label class="form-label">DR/CI/SI Number</label>
              <input v-model.trim="editForm.dr_ci_si_number" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">PO No.</label>
              <input v-model.trim="editForm.po_number" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Supplier</label>
              <input v-model.trim="editForm.supplier" type="text" class="form-control" list="supplier-options" />
            </div>
            <div class="mb-3">
              <label class="form-label">Remarks</label>
              <input v-model.trim="editForm.remarks" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Classification <span class="text-danger">*</span></label>
              <select v-model="editForm.classification" class="form-select" required>
                <option value="PAR">Property Acknowledgement Receipt</option>
                <option value="ICS High">Inventory Custodian Slip - High Value</option>
                <option value="ICS Low">Inventory Custodian Slip - Low Value</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Condition <span class="text-danger">*</span></label>
              <select v-model="editForm.condition" class="form-select" required>
                <option value="Serviceable">Serviceable</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Status <span class="text-danger">*</span></label>
              <select v-model="editForm.status" class="form-select" required>
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
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
            <div class="mb-3">
              <label class="form-label">Fund Cluster <span class="text-danger">*</span></label>
              <select v-model="editForm.fund_cluster" class="form-select" required>
                <option value="" disabled>Select fund cluster</option>
                <option v-if="editForm.fund_cluster && !fundClusterOptions.includes(editForm.fund_cluster)" :value="editForm.fund_cluster">{{ editForm.fund_cluster }}</option>
                <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
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

    <datalist id="unit-options">
      <option v-for="u in unitOptions" :key="u" :value="u"></option>
    </datalist>
    <datalist id="supplier-options">
      <option v-for="name in supplierOptions" :key="name" :value="name"></option>
    </datalist>

    <InventoryMovementModal
      v-if="showMovementModal"
      :show="showMovementModal"
      @close="showMovementModal = false"
      @saved="handleMovementSaved"
    />
  </div>
</template>

<script>
import InventoryMovementModal from '@/components/InventoryMovementModal.vue'
import logo from '@/assets/LOGO.png'
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

const QR_SIZE = 400
const QR_LOGO_RATIO = 0.22 // logo box = 22% of QR width (keep under ~0.25)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = src
  })
}

async function createQrWithLogo(text) {
  const qrDataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: QR_SIZE,
  })

  const [qrImage, logoImage] = await Promise.all([loadImage(qrDataUrl), loadImage(logo)])

  const canvas = document.createElement('canvas')
  canvas.width = QR_SIZE
  canvas.height = QR_SIZE
  const ctx = canvas.getContext('2d')

  ctx.drawImage(qrImage, 0, 0, QR_SIZE, QR_SIZE)

  // White rounded box behind the logo so the QR modules don't clash with it
  const boxSize = Math.round(QR_SIZE * QR_LOGO_RATIO)
  const boxX = (QR_SIZE - boxSize) / 2
  const boxY = (QR_SIZE - boxSize) / 2
  const radius = 10

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(boxX + radius, boxY)
  ctx.arcTo(boxX + boxSize, boxY, boxX + boxSize, boxY + boxSize, radius)
  ctx.arcTo(boxX + boxSize, boxY + boxSize, boxX, boxY + boxSize, radius)
  ctx.arcTo(boxX, boxY + boxSize, boxX, boxY, radius)
  ctx.arcTo(boxX, boxY, boxX + boxSize, boxY, radius)
  ctx.closePath()
  ctx.fill()

  // Draw the logo inside the box, keeping its aspect ratio
  const padding = 6
  const maxLogo = boxSize - padding * 2
  const scale = Math.min(maxLogo / logoImage.width, maxLogo / logoImage.height)
  const logoWidth = logoImage.width * scale
  const logoHeight = logoImage.height * scale

  ctx.drawImage(
    logoImage,
    (QR_SIZE - logoWidth) / 2,
    (QR_SIZE - logoHeight) / 2,
    logoWidth,
    logoHeight,
  )

  return canvas.toDataURL('image/png')
}

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
      suppliers: [],
      unitOptions: ['PC', 'PCS', 'PAX', 'BOX', 'PACK', 'SET', 'LOT', 'REAM', 'ROLL', 'BOTTLE', 'CAN', 'UNIT'],
      loading: false,
      saving: false,
      updating: false,
      error: '',
      search: '',
      selectedClassification: '',
      selectedStatus: '',
      selectedFundCluster: '',
      sortKey: '',
      sortDirection: 'asc',
      showAddForm: false,
      showMovementModal: false,
      fundClusterOptions: [
        'AF-1', 'AF-2', 'AF-3', 'AF-DBM PS/BID',
        'GF-1', 'GF-2', 'GF-3', 'GF-DBM PS/BID',
        'RF-1', 'RF-2', 'RF-DBM PS/BID',
        'STF-1', 'STF-2', 'STF-3', 'STF-DBM PS/BID',
        'TF-1', 'TF-2', 'TF-3', 'TF-DBM PS/BID',
        'TR-1', 'TR-2', 'TR-DBM PS/BID'
      ],
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
        model_number: '',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: '',
        fund_cluster: '',
        article: '',
        unit: '',
        dr_ci_si_number: '',
        po_number: '',
        supplier: '',
        remarks: '',
      },
      editForm: {
        property_number: '',
        description: '',
        quantity: 0,
        model_number: '',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: '',
        fund_cluster: '',
        article: '',
        unit: '',
        dr_ci_si_number: '',
        po_number: '',
        supplier: '',
        remarks: '',
      },
    }
  },
  computed: {
    filteredItems() {
      const searchValue = this.search.toLowerCase().trim()

      const filtered = this.items.filter((item) => {
        const uniquePropertyId =
          item.property_tag_identifier !== null && item.property_tag_identifier !== undefined
            ? 'PROP-' + String(item.property_tag_identifier).padStart(6, '0')
            : ''

        const matchesSearch =
          !searchValue ||
          uniquePropertyId.toLowerCase().includes(searchValue) ||
          String(item.property_tag_identifier ?? '').toLowerCase().includes(searchValue) ||
          (item.property_number || '').toLowerCase().includes(searchValue) ||
          (item.description || '').toLowerCase().includes(searchValue) ||
          (item.serial_number || '').toLowerCase().includes(searchValue)

        const matchesClassification =
          !this.selectedClassification || item.classification === this.selectedClassification

        const matchesStatus = !this.selectedStatus || item.status === this.selectedStatus

        const matchesFundCluster =
          !this.selectedFundCluster || item.fund_cluster === this.selectedFundCluster

        return matchesSearch && matchesClassification && matchesStatus && matchesFundCluster
      })

      if (!this.sortKey) {
        return filtered
      }

      return filtered.sort((a, b) => {
        const first = a[this.sortKey]
        const second = b[this.sortKey]
        let comparison = 0

        if (['quantity', 'cost'].includes(this.sortKey)) {
          comparison = Number(first || 0) - Number(second || 0)
        } else {
          comparison = String(first ?? '').localeCompare(String(second ?? ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        }

        return this.sortDirection === 'asc' ? comparison : -comparison
      })
    },
    personnelOptions() {
      return this.personnel.filter((person) => person && person.full_name)
    },
    supplierOptions() {
      return this.suppliers
        .map((supplier) => supplier && supplier.supplier_name)
        .filter(Boolean)
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
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortDirection = 'asc'
      }
    },
    sortIcon(key) {
      if (this.sortKey !== key) {
        return 'bi bi-arrow-down-up sort-icon'
      }

      return this.sortDirection === 'asc'
        ? 'bi bi-arrow-up sort-icon'
        : 'bi bi-arrow-down sort-icon'
    },
    printPropertyTag() {
      const item = this.detailItem

      if (!item || !this.detailQrCode) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'The item QR code is not ready yet.',
          }),
        )
        return
      }

      const printWindow = window.open('', '_blank', 'width=900,height=700')

      if (!printWindow) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please allow pop-ups to print the property tag.',
          }),
        )
        return
      }

      const escape = (value) =>
        String(value ?? '-').replace(/[&<>"']/g, (character) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character])
      const cost = Number(item.cost)
      const formattedCost = Number.isFinite(cost)
        ? cost.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : '0.00'

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Property Tag - ${escape(item.property_number || 'Item')}</title>
            <style>
              @page { size: 4in 2.8in; margin: 0; }
              * { box-sizing: border-box; }
              html, body { width: 4in; height: 2.8in; margin: 0; }
              body { font-family: Arial, Helvetica, sans-serif; color: #111; }
              .tag { width: 4in; height: 2.8in; padding: .07in; }
              .grid {
                display: grid;
                width: 100%;
                height: 100%;
                grid-template-columns: 1.12in 1fr;
                grid-template-rows: .42in .40in .36in .55in .44in .34in .15in;
                border: 1px solid #222;
              }
              .cell {
                min-width: 0;
                padding: 2px 4px;
                border-right: 1px solid #555;
                border-bottom: 1px solid #555;
                overflow: hidden;
              }
              .brand {
                grid-row: span 3;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                text-align: center;
                font-size: 8px;
                font-weight: bold;
              }
              .brand img { width: .58in; height: .58in; object-fit: contain; }
              .brand-name { font-size: 7px; }
              .unique-property-id {
                font-size: 7px;
                font-weight: 700;
                overflow-wrap: anywhere;
                text-align: center;
              }
              .tag-name { font-size: 10px; }
              .label { display: block; font-size: 7px; font-style: italic; }
              .value { display: block; margin-top: 2px; font-size: 8px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
              .property-number .value { font-size: 11px; }
              .two-col { display: grid; grid-template-columns: 1fr 1fr; }
              .two-col > div:first-child { border-right: 1px solid #555; }
              .description {
                display: flex;
                flex-direction: column;
                justify-content: center;
                text-align: center;
              }
              .description .value { font-size: 11px; }
              .model-serial { display: grid; grid-template-columns: 1fr 1fr; }
              .model-serial > div:first-child { border-right: 1px solid #555; }
              .serial-qr { display: grid; grid-template-columns: 1fr .7in; align-items: center; }
              .serial-qr img { width: .62in; height: .62in; justify-self: center; }
              .inventory { grid-column: 1 / -1; }
              .signature-slots { display: grid; grid-template-columns: repeat(3, 1fr); height: 100%; }
              .signature-slots span { border-right: 1px solid #555; }
              .signature-slots span:last-child { border-right: 0; }
              .warning {
                grid-column: 1 / -1;
                border-bottom: 0;
                color: #63343a;
                font-size: 8px;
                font-weight: 700;
                text-align: center;
              }
              @media screen {
                body { display: grid; place-items: center; background: #eee; }
                .tag { background: #fff; box-shadow: 0 2px 12px #0003; }
              }
            </style>
          </head>
          <body>
            <main class="tag">
              <div class="grid">
                <div class="cell brand">
                  <img src="${logo}" alt="NVSU logo">
                  <span class="brand-name">NVSU PROPERTY INVENTORY</span>
                  <span>PROPERTY TAG</span>
                  <span class="unique-property-id">UNIQUE ID: ${escape(
                    item.property_tag_identifier !== null &&
                    item.property_tag_identifier !== undefined
                      ? 'PROP-' + String(item.property_tag_identifier).padStart(6, '0')
                      : 'NOT ASSIGNED'
                  )}</span>
                </div>
                <div class="cell property-number">
                  <span class="label">Property Number</span>
                  <strong class="value">${escape(item.property_number)}</strong>
                </div>
                <div class="cell two-col">
                  <div>
                    <span class="label">Office / Division</span>
                    <strong class="value">${escape(item.responsibility_center)}</strong>
                  </div>
                  <div>
                    <span class="label">Person Accountable</span>
                    <strong class="value">${escape(item.accountable_employee)}</strong>
                  </div>
                </div>
                <div class="cell two-col">
                  <div>
                    <span class="label">Acquisition Date</span>
                    <strong class="value">${escape(item.acquisition_date)}</strong>
                  </div>
                  <div>
                    <span class="label">Acquisition Cost</span>
                    <strong class="value">₱${formattedCost}</strong>
                  </div>
                </div>
                <div class="cell description">
                  <span class="label">Description of Property</span>
                  <strong class="value">${escape(item.description)}</strong>
                </div>
                <div class="cell model-serial">
                  <div>
                    <span class="label">Model Number</span>
                    <strong class="value">${escape(item.model_number)}</strong>
                  </div>
                  <div class="serial-qr">
                    <div>
                      <span class="label">Serial Number</span>
                      <strong class="value">${escape(item.serial_number)}</strong>
                    </div>
                    <img src="${this.detailQrCode}" alt="Item QR code">
                  </div>
                </div>
                <div class="cell inventory">
                  <span class="label">Date of Inventory &amp; Signature of Inventory Team</span>
                  <div class="signature-slots"><span></span><span></span><span></span></div>
                </div>
                <div class="cell warning">TAMPERING OF THIS LABEL IS STRICTLY PROHIBITED</div>
              </div>
            </main>
            <script>
              window.onload = () => window.setTimeout(() => window.print(), 250)
            <\/script>
          </body>
        </html>
      `)
      printWindow.document.close()
    },

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
        this.fetchJson('/api/suppliers'),
      ])

      if (results[0].status === 'fulfilled') {
        this.personnel = Array.isArray(results[0].value) ? results[0].value : []
      }

      if (results[1].status === 'fulfilled') {
        this.offices = Array.isArray(results[1].value) ? results[1].value : []
      }

      if (results[2].status === 'fulfilled') {
        this.suppliers = Array.isArray(results[2].value) ? results[2].value : []
      }

      if (results.slice(0, 2).some((result) => result.status === 'rejected')) {
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
        model_number: item.model_number || '',
        serial_number: item.serial_number || '',
        cost: item.cost || 0,
        acquisition_date: item.acquisition_date || '',
        classification: item.classification || 'PAR',
        condition: item.condition || 'Serviceable',
        status: item.status || 'Available',
        accountable_employee: item.accountable_employee || '',
        responsibility_center: item.responsibility_center || '',
        fund_cluster: item.fund_cluster || '',
        article: item.article || '',
        unit: item.unit && item.unit !== 'unit' ? item.unit : '',
        dr_ci_si_number: item.dr_ci_si_number || '',
        po_number: item.po_number || '',
        supplier: item.supplier || '',
        remarks: item.remarks || '',
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
          },
        )

        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(
            'The backend needs to be restarted to enable item QR links. Restart it, then reload the app.',
          )
        }

        const linkData = await response.json()

        if (!response.ok) {
          throw new Error(linkData.error || 'Failed to create the item document link.')
        }

        if (typeof linkData.downloadUrl === 'string' && !linkData.viewUrl) {
          throw new Error(
            'Restart the backend to enable QR codes that open item details, then reload the app.',
          )
        }

        if (
          typeof linkData.viewUrl !== 'string' ||
          !linkData.viewUrl.startsWith('/items?item=')
        ) {
          throw new Error('The backend returned an invalid item details link.')
        }

        const itemDetailsUrl = new URL(linkData.viewUrl, window.location.origin).toString()

        const qrCode = await createQrWithLogo(itemDetailsUrl)

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
          ['Model Number', item.model_number || '-'],
          ['Serial Number', item.serial_number || '-'],
          ['Quantity', item.quantity ?? 0],
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
          ['Fund Cluster', item.fund_cluster || '-'],
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
        model_number: '',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Available',
        accountable_employee: '',
        responsibility_center: '',
        fund_cluster: '',
        article: '',
        unit: '',
        dr_ci_si_number: '',
        po_number: '',
        supplier: '',
        remarks: '',
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

      if (status === 'Assigned') {
        return 'bg-primary'
      }

      if (status === 'Issued') {
        return 'bg-warning text-dark'
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

.sort-header {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.sort-header:hover {
  color: #e8c547;
}

.sort-header:focus-visible {
  outline: 2px solid #e8c547;
  outline-offset: 3px;
  border-radius: 2px;
}

.sort-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
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

.add-overlay {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.45);
}

.add-dialog {
  width: min(820px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-dialog-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.add-dialog-body {
  overflow-y: auto;
}

.add-dialog .card-footer {
  text-align: right;
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
  width: min(680px, 100%);
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

  .edit-sidebar-footer {
    flex-wrap: wrap;
  }

  .edit-sidebar-footer .btn {
    flex: 1 1 130px;
  }
}
</style>