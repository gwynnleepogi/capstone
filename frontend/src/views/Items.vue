<template>
  <div class="container-fluid">
    <div class="row align-items-center mb-4">
      <div class="col">
        <h1 class="h3 mb-1">Properties</h1>
        <p class="text-secondary mb-0">Property and inventory records</p>
      </div>

      <div class="col-auto d-flex gap-2">
        <button class="btn btn-warning" @click="showAddForm = true">
          <i class="bi bi-plus-lg me-1"></i>
          Add Property
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
              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search unique ID, property number, description, or serial number"
              />
            </div>
          </div>

          <div class="col-12 col-md-3">
            <select
              v-model="selectedClassification"
              class="form-select"
              aria-label="Filter by classification"
            >
              <option value="">All Classification</option>
              <option
                v-for="option in classificationOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-2">
            <select
              v-model="selectedFundCluster"
              class="form-select"
              aria-label="Filter by fund cluster"
            >
              <option value="">All Fund Cluster</option>
              <option
                v-for="option in fundClusterOptions"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-2">
            <select
              v-model="selectedStatus"
              class="form-select"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option
                v-for="option in statusOptions"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD PROPERTY -->
    <div
      v-if="showAddForm"
      class="add-overlay"
      tabindex="-1"
      @keydown.esc="cancelAdd"
    >
      <section
        class="add-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
      >
        <div class="card-header add-dialog-header bg-white d-flex justify-content-between align-items-center">
          <h2 id="add-item-title" class="h5 mb-0">Add New Property</h2>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="cancelAdd"
          ></button>
        </div>

        <form class="add-dialog-form" @submit.prevent="addItem">
          <div class="card-body add-dialog-body">
            <div class="row g-4">
              <div class="col-12">
                <h6 class="border-bottom pb-2 mb-1">1. Property Information</h6>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Property Number <span class="text-danger">*</span></label>
                <input v-model.trim="newItem.property_number" type="text" class="form-control" required />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Category <span class="text-danger">*</span></label>
                <input v-model.trim="newItem.article" type="text" class="form-control" placeholder="e.g. BAG" required />
              </div>

              <div class="col-12">
                <label class="form-label">Description <span class="text-danger">*</span></label>
                <input v-model.trim="newItem.description" type="text" class="form-control" required />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Model Number</label>
                <input v-model.trim="newItem.model_number" type="text" class="form-control" placeholder="Optional" />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Serial Number</label>
                <input v-model.trim="newItem.serial_number" type="text" class="form-control" placeholder="Optional" />
              </div>

              <div class="col-12 mt-4">
                <h6 class="border-bottom pb-2 mb-1">2. Acquisition Information</h6>
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
                <label class="form-label">Unit of Measure</label>
                <input v-model.trim="newItem.unit" type="text" class="form-control" list="unit-options" placeholder="e.g. PC" />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">DR/CI/SI Number</label>
                <input v-model.trim="newItem.dr_ci_si_number" type="text" class="form-control" placeholder="Optional" />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Property Order No.</label>
                <input v-model.trim="newItem.po_number" type="text" class="form-control" placeholder="Optional" />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Supplier <span class="text-danger">*</span></label>
                <input v-model.trim="newItem.supplier" type="text" class="form-control" placeholder="Enter supplier name" required />
              </div>

              <div class="col-12 mt-4">
                <h6 class="border-bottom pb-2 mb-1">3. Assignment Information</h6>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Accountable Employee <span class="text-danger">*</span></label>
                <SearchableSelect
                  v-model="newItem.accountable_employee"
                  :options="accountableEmployeeOptions"
                  placeholder="Search or select an employee account"
                  required
                  @update:modelValue="selectAccountableEmployee(newItem, $event)"
                />
                <button type="button" class="btn btn-outline-success btn-sm mt-2" @click="showAddEmployeeForm = true">
                  <i class="bi bi-person-plus me-1"></i>
                  Add Employee Account
                </button>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Office <span class="text-danger">*</span></label>
                <input v-model="newItem.office_name" type="text" class="form-control" placeholder="Automatically filled from the accountable employee" readonly required />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Responsibility Center <span class="text-danger">*</span></label>
                <input v-model.trim="newItem.responsibility_center" type="text" class="form-control" placeholder="Enter responsibility center" required />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Fund Cluster <span class="text-danger">*</span></label>
                <SearchableSelect v-model="newItem.fund_cluster" :options="fundClusterOptions" placeholder="Search fund cluster" required />
              </div>

              <div class="col-12 mt-4">
                <h6 class="border-bottom pb-2 mb-1">4. Property Classification and Condition</h6>
              </div>

              <div class="col-12 col-md-4">
                <label class="form-label">Classification <span class="text-danger">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  :value="displayClassification(classificationFromCost(newItem.cost))"
                  readonly
                  aria-describedby="new-property-classification-help"
                />
                <small id="new-property-classification-help" class="form-text text-muted">
                  Automatically determined based on the property cost.
                </small>
              </div>

              <div class="col-12 col-md-4">
                <label class="form-label">Condition <span class="text-danger">*</span></label>
                <SearchableSelect v-model="newItem.condition" :options="conditionOptions" placeholder="Select condition" required />
              </div>

              <div class="col-12 col-md-4">
                <label class="form-label">Status</label>
                <input type="text" class="form-control" value="Issued" readonly />
                <small class="form-text text-muted">Automatically set to Issued.</small>
              </div>

              <div class="col-12 mt-4">
                <h6 class="border-bottom pb-2 mb-1">5. Additional Information</h6>
              </div>

              <div class="col-12">
                <label class="form-label">Remarks</label>
                <textarea v-model.trim="newItem.remarks" class="form-control" rows="2" placeholder="Optional remarks"></textarea>
              </div>
            </div>
          </div>

          <div class="card-footer bg-white text-end">
            <button
              type="button"
              class="btn btn-secondary me-2"
              @click="cancelAdd"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-success" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Property' }}
            </button>
          </div>
        </form>
      </section>
    </div>
 
    <!-- ADD EMPLOYEE ACCOUNT MODAL -->
    <div
      v-if="showAddEmployeeForm"
      class="employee-modal-overlay"
      role="presentation"
      @click.self="showAddEmployeeForm = false"
      @keydown.esc="showAddEmployeeForm = false"
    >
      <section
        class="employee-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-employee-title"
      >
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <h2 id="add-employee-title" class="h5 mb-1">Add Employee Account</h2>
            <p class="text-muted small mb-0">Create an employee login account and profile.</p>
          </div>
          <button type="button" class="btn-close" aria-label="Close" @click="showAddEmployeeForm = false"></button>
        </div>

        <form class="employee-modal-form" @submit.prevent="createEmployeeAccount">
          <div class="card-body employee-modal-body">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">Employee ID <span class="text-danger">*</span></label>
                <input v-model.trim="newEmployee.employee_id" type="text" class="form-control" autocomplete="off" required />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Full Name <span class="text-danger">*</span></label>
                <input v-model.trim="newEmployee.full_name" type="text" class="form-control" autocomplete="name" required />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Email <span class="text-danger">*</span></label>
                <input v-model.trim="newEmployee.email" type="email" class="form-control" autocomplete="email" required />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Temporary Password <span class="text-danger">*</span></label>
                <input v-model="newEmployee.password" type="password" minlength="6" class="form-control" autocomplete="new-password" required />
                <small class="text-muted">Must be at least 6 characters.</small>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">User Type <span class="text-danger">*</span></label>
                <select v-model="newEmployee.role" class="form-select" required @change="loadEmployeeJobTitles">
                  <option value="">Select a user type</option>
                  <option value="Teacher">Teaching</option>
                  <option value="Non-Teaching Staff">Non-Teaching</option>
                </select>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Job Title <span class="text-danger">*</span></label>
                <input
                  v-model.trim="newEmployee.job_title"
                  type="text"
                  class="form-control"
                  list="employee-job-title-options"
                  placeholder="Search or select a job title"
                  required
                />
                <datalist id="employee-job-title-options">
                  <option v-for="title in employeeJobTitleOptions" :key="title" :value="title"></option>
                </datalist>
              </div>
              <div class="col-12">
                <label class="form-label">Office <span class="text-danger">*</span></label>
                <select v-model="newEmployee.office_id" class="form-select" required>
                  <option value="">Select an office</option>
                  <option v-for="office in officeOptions" :key="office.id" :value="office.id">
                    {{ office.office_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="showAddEmployeeForm = false" :disabled="creatingEmployee">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="creatingEmployee">
              {{ creatingEmployee ? 'Creating Account...' : 'Create Employee Account' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- INVENTORY TABLE -->
    <div class="card">
      <div class="card-header bg-white">
        <strong>Inventory Properties</strong>
      </div>

      <div class="table-responsive property-table-wrap">
        <table class="table table-hover mb-0 property-table">
          <thead>
            <tr>
              <th>
                <button type="button" class="sort-header" @click="sortBy('property_tag_identifier')">
                  Unique ID <i :class="sortIcon('property_tag_identifier')"></i>
                </button>
              </th>
              <th>
                <button type="button" class="sort-header" @click="sortBy('property_number')">
                  Property No. <i :class="sortIcon('property_number')"></i>
                </button>
              </th>
              <th>
                <button type="button" class="sort-header" @click="sortBy('article')">
                  Article <i :class="sortIcon('article')"></i>
                </button>
              </th>
              <th>
                <button type="button" class="sort-header" @click="sortBy('description')">
                  Description <i :class="sortIcon('description')"></i>
                </button>
              </th>
              <th>
                <button type="button" class="sort-header" @click="sortBy('accountable_employee')">
                  Accountable Employee <i :class="sortIcon('accountable_employee')"></i>
                </button>
              </th>
              <th class="cost-column">
                <button type="button" class="sort-header" @click="sortBy('cost')">
                  Cost <i :class="sortIcon('cost')"></i>
                </button>
              </th>
              <th>
                <button type="button" class="sort-header" @click="sortBy('classification')">
                  Classification <i :class="sortIcon('classification')"></i>
                </button>
              </th>
              <th>
                <button type="button" class="sort-header" @click="sortBy('condition')">
                  Condition <i :class="sortIcon('condition')"></i>
                </button>
              </th>
              <th class="actions-column">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center py-5">Loading properties...</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="9" class="text-center text-danger py-5">{{ error }}</td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="9" class="text-center text-secondary py-5">
                No properties found.
              </td>
            </tr>

            <tr v-for="item in paginatedItems" :key="item.id">
              <td>
                {{
                  item.property_tag_identifier !== null &&
                  item.property_tag_identifier !== undefined
                    ? 'PROP-' + String(item.property_tag_identifier).padStart(6, '0')
                    : 'NOT ASSIGNED'
                }}
              </td>
              <td>{{ item.property_number || '-' }}</td>
              <td>{{ item.article || '-' }}</td>
              <td>{{ item.description || '-' }}</td>
              <td>{{ item.accountable_employee || '-' }}</td>
              <td class="cost-column">₱{{ item.cost || 0 }}</td>
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
                <button
                  type="button"
                  class="property-details-button"
                  @click="showItemDetails(item)"
                  title="View property details"
                >
                  <i class="bi bi-eye" aria-hidden="true"></i>
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer bg-white d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 property-pagination">
        <span class="text-secondary small">
          Showing {{ firstItemNumber }} to {{ lastItemNumber }} of {{ filteredItems.length }} properties
        </span>
        <nav aria-label="Properties pagination">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button type="button" class="page-link" :disabled="currentPage === 1" @click="currentPage--">Previous</button>
            </li>
            <li class="page-item active" aria-current="page">
              <span class="page-link">{{ currentPage }}</span>
            </li>
            <li class="page-item" :class="{ disabled: currentPage >= pageCount }">
              <button type="button" class="page-link" :disabled="currentPage >= pageCount" @click="currentPage++">Next</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- PROPERTY DETAILS -->
    <div v-if="detailItem" class="detail-overlay" @click.self="closeItemDetails">
      <section
        class="detail-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-details-title"
      >
        <div class="card-header d-flex justify-content-between align-items-center">
          <h2 id="item-details-title" class="h5 mb-0">Property Details</h2>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="closeItemDetails"
          ></button>
        </div>

        <div class="card-body">
          <div class="row g-4">
            <div class="col-12">
              <div v-if="qrCodeError" class="text-danger small mb-3">
                {{ qrCodeError }}
              </div>
              <dl class="row mb-0 item-detail-list">
                <dt class="col-sm-5">Article</dt>
                <dd class="col-sm-7">{{ detailItem.article || '-' }}</dd>
                <dt class="col-sm-5">Description</dt>
                <dd class="col-sm-7">{{ detailItem.description || '-' }}</dd>
                <dt class="col-sm-5">Model Number</dt>
                <dd class="col-sm-7">{{ detailItem.model_number || '-' }}</dd>
                <dt class="col-sm-5">Serial Number</dt>
                <dd class="col-sm-7">{{ detailItem.serial_number || '-' }}</dd>
                <dt class="col-sm-5">Cost</dt>
                <dd class="col-sm-7">₱{{ detailItem.cost || 0 }}</dd>
                <dt class="col-sm-5">Acquisition Date</dt>
                <dd class="col-sm-7">{{ detailItem.acquisition_date || '-' }}</dd>
                <dt class="col-sm-5">Date Inputted</dt>
                <dd class="col-sm-7">
                  {{ detailItem.created_at ? detailItem.created_at.slice(0, 10) : '-' }}
                </dd>
                <dt class="col-sm-5">Classification</dt>
                <dd class="col-sm-7">
                  {{ displayClassification(detailItem.classification) }}
                </dd>
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
                <dt class="col-sm-5">Responsibility Center for Print</dt>
                <dd class="col-sm-7">
                  <input
                    v-model.trim="printResponsibilityCenter"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Defaults to the property record"
                  >
                  <small class="text-muted">This changes the printable copy only, not the saved property.</small>
                </dd>
                <dt class="col-sm-5">Fund Cluster</dt>
                <dd class="col-sm-7">{{ detailItem.fund_cluster || '-' }}</dd>
                <dt class="col-sm-5">Unit of Measure</dt>
                <dd class="col-sm-7">
                  {{
                    detailItem.unit && detailItem.unit !== 'unit'
                      ? detailItem.unit
                      : '-'
                  }}
                </dd>
                <dt class="col-sm-5">DR/CI/SI Number</dt>
                <dd class="col-sm-7">{{ detailItem.dr_ci_si_number || '-' }}</dd>
                <dt class="col-sm-5">Property Order No.</dt>
                <dd class="col-sm-7">{{ detailItem.po_number || '-' }}</dd>
                <dt class="col-sm-5">Supplier</dt>
                <dd class="col-sm-7">{{ detailItem.supplier || '-' }}</dd>
                <dt class="col-sm-5">Remarks</dt>
                <dd class="col-sm-7">{{ detailItem.remarks || '-' }}</dd>
              </dl>

              <section class="mt-4 border-top pt-3" aria-labelledby="property-history-title">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h3 id="property-history-title" class="h6 mb-0">Property History</h3>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    :disabled="propertyHistoryLoading"
                    @click="loadPropertyHistory(detailItem.id)"
                  >
                    <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                  </button>
                </div>
                <div v-if="propertyHistoryLoading" class="text-muted small py-3">
                  Loading property history...
                </div>
                <div v-else-if="propertyHistoryError" class="alert alert-warning small mb-0">
                  {{ propertyHistoryError }}
                </div>
                <div v-else-if="propertyHistory.length === 0" class="text-muted small py-3">
                  No acquisition, issuance, transfer, or return transactions were found.
                </div>
                <div v-else class="list-group list-group-flush">
                  <div v-for="event in propertyHistory" :key="event.id" class="list-group-item px-0 py-3">
                    <div class="d-flex justify-content-between align-items-start gap-3">
                      <strong>{{ event.type }}</strong>
                      <small class="text-muted text-nowrap">
                        {{ event.date ? new Date(event.date).toLocaleDateString() : '-' }}
                      </small>
                    </div>
                    <div class="small mt-1">{{ event.details || '-' }}</div>
                    <div class="small text-muted mt-1">Reference: {{ event.reference || '-' }}</div>
                    <div class="small text-muted">Employee: {{ event.employee || '-' }}</div>
                    <div v-if="event.remarks" class="small text-muted mt-1">Remarks: {{ event.remarks }}</div>
                  </div>
                </div>
                <div v-if="propertyHistory.length > 0" class="alert alert-warning small mt-3 mb-0">
                  Deleting this property also removes its linked receipts, return requests, return records, and transfer history. Other properties in shared transfer requests will remain.
                </div>
              </section>
            </div>
          </div>
        </div>

        <div class="card-footer d-flex justify-content-end gap-2 flex-wrap">
          <button type="button" class="btn btn-secondary" @click="closeItemDetails">
            Close
          </button>
          <button
            type="button"
            class="btn btn-outline-success"
            :disabled="qrGenerating"
            @click="generateItemQrCode"
          >
            <span
              v-if="qrGenerating"
              class="spinner-border spinner-border-sm me-1"
              role="status"
            ></span>
            <i v-else class="bi bi-qr-code me-1"></i>
            {{ qrGenerating ? 'Generating QR...' : 'Generate QR Code' }}
          </button>
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
          <button
            type="button"
            class="btn btn-outline-warning"
            @click="editItemFromDetails"
          >
            <i class="bi bi-pencil me-1"></i>
            Edit Property
          </button>
          <button
            type="button"
            class="btn btn-outline-danger"
            :disabled="deletingItemId === detailItem.id || !canDeleteProperty(detailItem)"
            @click="deleteItem(detailItem)"
          >
            <i class="bi bi-trash me-1"></i>
            {{ deletingItemId === detailItem.id ? 'Deleting...' : 'Delete Property' }}
          </button>
          <small v-if="!canDeleteProperty(detailItem)" class="w-100 text-end text-muted">
            Only returned properties can be deleted.
          </small>
        </div>
      </section>
    </div>

    <!-- GENERATED PROPERTY QR CODE -->
    <div
      v-if="showQrModal && detailQrCode"
      class="qr-modal-overlay"
      @click.self="showQrModal = false"
    >
      <section
        class="qr-modal-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <div class="card-header d-flex justify-content-between align-items-center">
          <h2 id="qr-modal-title" class="h5 mb-0">Property QR Code</h2>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="showQrModal = false"
          ></button>
        </div>
        <div class="card-body text-center">
          <div class="qr-code-frame">
            <img
              :src="detailQrCode"
              :alt="'QR code for property ' + (detailItem?.property_number || '')"
            />
          </div>
          <h6 class="mt-3 mb-1">{{ detailItem?.property_number || 'No property number' }}</h6>
          <p class="text-muted small mb-0">Scan this QR code to view the property details.</p>
          <small v-if="isLocalDevelopmentHost" class="text-warning d-block mt-2">
            For phone scanning, open this app using your laptop's Wi-Fi address, not localhost.
          </small>
        </div>
        <div class="card-footer d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="showQrModal = false">
            Close
          </button>
        </div>
      </section>
    </div>

    <!-- EDIT PROPERTY -->
    <div v-if="editingItem" class="edit-overlay" @click.self="cancelEdit">
      <section
        class="edit-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-title"
      >
        <div class="edit-dialog-header">
          <h2 id="edit-item-title" class="h5 mb-0">Edit Property</h2>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="cancelEdit"
          ></button>
        </div>

        <form class="edit-dialog-form" @submit.prevent="updateItem">
          <div class="edit-dialog-body">
            <div class="mb-3">
              <label class="form-label">
                Property Number <span class="text-danger">*</span>
              </label>
              <input v-model="editForm.property_number" type="text" class="form-control" required />
            </div>

            <div class="row g-3 mb-3">
              <div class="col-12 col-md-6">
                <label class="form-label">
                  Model Number <span class="text-danger">*</span>
                </label>
                <input v-model="editForm.model_number" type="text" class="form-control" required />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Serial Number</label>
                <input
                  v-model.trim="editForm.serial_number"
                  type="text"
                  class="form-control"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Article</label>
              <input v-model.trim="editForm.article" type="text" class="form-control" placeholder="e.g. BAG" />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Description <span class="text-danger">*</span>
              </label>
              <input v-model="editForm.description" type="text" class="form-control" required />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Cost <span class="text-danger">*</span>
              </label>
              <input
                v-model="editForm.cost"
                type="number"
                min="0"
                step="0.01"
                class="form-control"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Acquisition Date <span class="text-danger">*</span>
              </label>
              <input
                v-model="editForm.acquisition_date"
                type="date"
                class="form-control"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Unit of Measure</label>
              <input
                v-model.trim="editForm.unit"
                type="text"
                class="form-control"
                list="unit-options"
                placeholder="e.g. PC"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">DR/CI/SI Number</label>
              <input v-model.trim="editForm.dr_ci_si_number" type="text" class="form-control" />
            </div>

            <div class="mb-3">
              <label class="form-label">Property Order No.</label>
              <input v-model.trim="editForm.po_number" type="text" class="form-control" />
            </div>

            <div class="mb-3">
              <label class="form-label">Supplier</label>
              <input
                v-model.trim="editForm.supplier"
                type="text"
                class="form-control"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Remarks</label>
              <input v-model.trim="editForm.remarks" type="text" class="form-control" />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Classification <span class="text-danger">*</span>
              </label>
              <SearchableSelect
                v-model="editForm.classification"
                :options="classificationOptions"
                placeholder="Select classification"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Condition <span class="text-danger">*</span>
              </label>
              <input v-if="isReturnedProperty(editingItem)" type="text" class="form-control" value="Unserviceable" readonly />
              <SearchableSelect v-else v-model="editForm.condition" :options="conditionOptions" placeholder="Select condition" required />
              <small v-if="isReturnedProperty(editingItem)" class="form-text text-muted">Returned properties must remain Unserviceable.</small>
            </div>

            <div class="mb-3">
              <label class="form-label">Status</label>
              <input type="text" class="form-control" :value="editForm.status" readonly />
              <small v-if="isReturnedProperty(editingItem)" class="form-text text-muted">
                This property will remain Returned until it is issued through Acquisitions and Issuance.
              </small>
            </div>

            <div class="mb-3">
              <label class="form-label">
                Accountable Employee
                <span v-if="!isReturnedProperty(editingItem)" class="text-danger">*</span>
              </label>
              <SearchableSelect
                v-model="editForm.accountable_employee"
                :options="accountableEmployeeOptions"
                placeholder="Search or select an employee account"
                :required="!isReturnedProperty(editingItem)"
                @update:modelValue="selectAccountableEmployee(editForm, $event)"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Office <span class="text-danger">*</span>
              </label>
              <SearchableSelect v-model="editForm.office_name" :options="officeSelectOptions" placeholder="Search or select an office" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Responsibility Center <span class="text-danger">*</span></label>
              <input v-model.trim="editForm.responsibility_center" type="text" class="form-control" placeholder="Enter responsibility center" required />
            </div>

            <div class="mb-3">
              <label class="form-label">
                Fund Cluster <span class="text-danger">*</span>
              </label>
              <SearchableSelect
                v-model="editForm.fund_cluster"
                :options="fundClusterOptions"
                placeholder="Search fund cluster"
                required
              />
            </div>
          </div>

          <div class="edit-dialog-footer">
            <button type="button" class="btn btn-secondary" @click="cancelEdit">
              Cancel
            </button>
            <button type="submit" class="btn btn-success" :disabled="updating">
              {{ updating ? 'Updating...' : 'Update Property' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- DELETE PROPERTY CONFIRMATION MODAL -->
    <div
      v-if="itemPendingDeletion"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deletePropertyTitle"
      style="background: rgba(0, 0, 0, 0.55); z-index: 2000;"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 id="deletePropertyTitle" class="modal-title text-danger">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Confirm Property Deletion
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              :disabled="deletingItemId !== null"
              @click="cancelDeleteItem"
            ></button>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to permanently delete
              <strong>{{ itemPendingDeletion.description || itemPendingDeletion.property_number || 'this property' }}</strong>?
            </p>
            <p class="mb-2">Deleting this property will also remove its related:</p>
            <ul class="mb-3">
              <li>Property receipts and assignment records</li>
              <li>Return requests and return records</li>
              <li>Transfer records and this property from shared transfer requests</li>
            </ul>
            <div class="alert alert-warning small mb-0">
              Other properties in the same transfer request will remain. This action cannot be undone.
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="deletingItemId !== null"
              @click="cancelDeleteItem"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="deletingItemId !== null"
              @click="confirmDeleteItem"
            >
              <span v-if="deletingItemId !== null" class="spinner-border spinner-border-sm me-1" role="status"></span>
              {{ deletingItemId !== null ? 'Deleting...' : 'Yes, Delete Property' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <datalist id="unit-options">
      <option v-for="u in unitOptions" :key="u" :value="u"></option>
    </datalist>

  </div>
</template>

<script>
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
import SearchableSelect from '@/components/SearchableSelect.vue'

const QR_SIZE = 400
const QR_LOGO_RATIO = 0.22

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

  const [qrImage, logoImage] = await Promise.all([
    loadImage(qrDataUrl),
    loadImage(logo),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = QR_SIZE
  canvas.height = QR_SIZE

  const ctx = canvas.getContext('2d')
  ctx.drawImage(qrImage, 0, 0, QR_SIZE, QR_SIZE)

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
  name: 'Properties',

  components: { SearchableSelect },

  data() {
    return {
      items: [],
      itemsLoaded: false,
      offices: [],
      personnel: [],

      unitOptions: [
        'PC', 'PCS', 'PAX', 'BOX', 'PACK', 'SET',
        'LOT', 'REAM', 'ROLL', 'BOTTLE', 'CAN', 'UNIT',
      ],

      loading: false,
      saving: false,
      updating: false,
      error: '',
      search: '',
      currentPage: 1,
      itemsPerPage: 10,
      selectedClassification: '',
      selectedStatus: '',
      selectedFundCluster: '',
      sortKey: '',
      sortDirection: 'asc',

      showAddForm: false,
      showAddEmployeeForm: false,
      creatingEmployee: false,
      newEmployee: {
        employee_id: '',
        full_name: '',
        email: '',
        password: '',
        role: '',
        job_title: '',
        office_id: '',
      },

      fundClusterOptions: [
        'AF-1', 'AF-2', 'AF-3', 'AF-DBM PS/BID',
        'GF-1', 'GF-2', 'GF-3', 'GF-DBM PS/BID',
        'RF-1', 'RF-2', 'RF-DBM PS/BID',
        'STF-1', 'STF-2', 'STF-3', 'STF-DBM PS/BID',
        'TF-1', 'TF-2', 'TF-3', 'TF-DBM PS/BID',
        'TR-1', 'TR-2', 'TR-DBM PS/BID',
      ],

      detailItem: null,
      propertyHistory: [],
      propertyHistoryLoading: false,
      propertyHistoryError: '',
      printResponsibilityCenter: '',
      detailQrCode: '',
      showQrModal: false,
      qrCodeError: '',
      qrGenerating: false,
      downloadingDocument: false,
      editingItem: null,
      deletingItemId: null,
      itemPendingDeletion: null,

      newItem: {
        property_number: '',
        description: '',
        quantity: 1,
        model_number: '',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Issued',
        accountable_employee: '',
        office_name: '',
        responsibility_center: '',
        fund_cluster: '',
        article: '',
        unit: 'PC',
        dr_ci_si_number: '',
        po_number: '',
        supplier: '',
        remarks: '',
      },

      editForm: {
        property_number: '',
        description: '',
        quantity: 1,
        model_number: '',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Returned',
        accountable_employee: '',
        responsibility_center: '',
        fund_cluster: '',
        article: '',
        unit: 'PC',
        dr_ci_si_number: '',
        po_number: '',
        supplier: '',
        remarks: '',
      },
    }
  },

  computed: {
    classificationOptions() {
      return [
        { value: 'PAR', label: 'Property Acknowledgement Receipt' },
        { value: 'ICS High', label: 'Inventory Custodian Slip - High Value' },
        { value: 'ICS Low', label: 'Inventory Custodian Slip - Low Value' },
      ]
    },

    conditionOptions() {
      return ['Serviceable', 'Unserviceable']
    },

    statusOptions() {
      return [
        'Assigned',
        'Issued',
        'Returned',
        'Lost',
        'Damaged',
        'Stolen',
        'Disposed',
      ]
    },

    officeSelectOptions() {
      return this.officeOptions.map(office => ({
        value: office.office_name,
        label: office.office_name,
      }))
    },

    filteredItems() {
      const searchValue = this.search.toLowerCase().trim()

      const filtered = this.items.filter((item) => {
        const uniquePropertyId =
          item.property_tag_identifier !== null &&
          item.property_tag_identifier !== undefined
            ? 'PROP-' + String(item.property_tag_identifier).padStart(6, '0')
            : ''

        const matchesSearch =
          !searchValue ||
          uniquePropertyId.toLowerCase().includes(searchValue) ||
          String(item.property_tag_identifier ?? '').toLowerCase().includes(searchValue) ||
          (item.property_number || '').toLowerCase().includes(searchValue) ||
          (item.article || '').toLowerCase().includes(searchValue) ||
          (item.description || '').toLowerCase().includes(searchValue) ||
          (item.serial_number || '').toLowerCase().includes(searchValue)

        const matchesClassification =
          !this.selectedClassification ||
          item.classification === this.selectedClassification

        const matchesStatus =
          !this.selectedStatus ||
          item.status === this.selectedStatus

        const matchesFundCluster =
          !this.selectedFundCluster ||
          item.fund_cluster === this.selectedFundCluster

        return (
          matchesSearch &&
          matchesClassification &&
          matchesStatus &&
          matchesFundCluster
        )
      })

      if (!this.sortKey) {
        return filtered
      }

      return filtered.sort((a, b) => {
        const first = a[this.sortKey]
        const second = b[this.sortKey]

        const comparison =
          this.sortKey === 'cost'
            ? Number(first || 0) - Number(second || 0)
            : String(first ?? '').localeCompare(
                String(second ?? ''),
                undefined,
                { numeric: true, sensitivity: 'base' },
              )

        return this.sortDirection === 'asc' ? comparison : -comparison
      })
    },

    pageCount() {
      return Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage))
    },

    paginatedItems() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      return this.filteredItems.slice(start, start + this.itemsPerPage)
    },

    firstItemNumber() {
      return this.filteredItems.length ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0
    },

    lastItemNumber() {
      return Math.min(this.currentPage * this.itemsPerPage, this.filteredItems.length)
    },

    accountableEmployeeOptions()
      return this.personnel
        .filter(person =>
          person &&
          person.full_name &&
          ['teacher', 'non-teaching staff'].includes(
            String(person.role || '').trim().toLowerCase(),
          ),
        )
        .sort((first, second) =>
          first.full_name.localeCompare(second.full_name, undefined, {
            sensitivity: 'base',
          }),
        )
        .map(person => ({
          value: person.full_name,
          label: [
            person.full_name,
            person.employee_id ? 'ID: ' + person.employee_id : '',
            person.role || '',
          ].filter(Boolean).join(' — '),
        }))
    },

    employeeJobTitleOptions() {
      return [...new Set(
        this.personnel
          .filter(person => !this.newEmployee.role || person.role === this.newEmployee.role)
          .map(person => String(person.job_title || '').trim())
          .filter(Boolean),
      )].sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }))
    },

    officeOptions() {
      return this.offices.filter(office => office && office.office_name)
    },

    isLocalDevelopmentHost() {
      return ['localhost', '127.0.0.1'].includes(window.location.hostname)
    },
  },

  mounted() {
    this.getItems()
    this.getOfficesAndPersonnel()
  },

  watch: {
    search() { this.currentPage = 1 },
    selectedClassification() { this.currentPage = 1 },
    selectedStatus() { this.currentPage = 1 },
    selectedFundCluster() { this.currentPage = 1 },
    filteredItems(items) {
      const lastPage = Math.max(1, Math.ceil(items.length / this.itemsPerPage))
      if (this.currentPage > lastPage) this.currentPage = lastPage
    },
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

    // ADDED: Refresh the Acquisitions and Issuance sidebar badge.
    notifyIssuanceUpdate() {
      window.dispatchEvent(new Event('receipts-updated'))
    },

    printPropertyTag() {
      const item = this.detailItem

      if (!item || !this.detailQrCode) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'The property QR code is not ready yet.',
        }))
        return
      }

      const printWindow = window.open(
        '',
        '_blank',
        'popup=yes,width=900,height=700,resizable=yes,scrollbars=yes',
      )

      if (!printWindow) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please allow pop-ups to print the property tag.',
        }))
        return
      }

      const escape = value =>
        String(value ?? '-').replace(/[&<>"']/g, character =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[character],
        )

      const printableResponsibilityCenter =
        this.printResponsibilityCenter || item.responsibility_center || ''

      const accountableEmployee = this.personnel.find(person =>
        String(person.full_name || '').trim().toLowerCase() ===
        String(item.accountable_employee || '').trim().toLowerCase(),
      )
      const accountableEmployeeTitle = accountableEmployee?.job_title || ''

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
                grid-template-rows: .42in .48in .32in .55in .44in .30in .15in;
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
              .label { display: block; font-size: 7px; font-style: italic; }
              .value {
                display: block;
                margin-top: 2px;
                font-size: 8px;
                font-weight: 700;
                text-align: center;
                overflow-wrap: anywhere;
              }
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
              .serial-qr {
                display: grid;
                grid-template-columns: 1fr .7in;
                align-items: center;
              }
              .serial-qr img { width: .62in; height: .62in; justify-self: center; }
              .inventory { grid-column: 1 / -1; }
              .signature-slots {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                height: 100%;
              }
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
                  <span class="unique-property-id">
                    UNIQUE ID:
                    ${escape(
                      item.property_tag_identifier !== null &&
                      item.property_tag_identifier !== undefined
                        ? 'PROP-' + String(item.property_tag_identifier).padStart(6, '0')
                        : 'NOT ASSIGNED',
                    )}
                  </span>
                </div>
                <div class="cell property-number">
                  <span class="label">Property Number</span>
                  <strong class="value">${escape(item.property_number)}</strong>
                </div>
                <div class="cell two-col">
                  <div>
                    <span class="label">Office / Division</span>
                    <strong class="value">${escape(printableResponsibilityCenter)}</strong>
                  </div>
                  <div>
                    <span class="label">Person Accountable</span>
                    <strong class="value">${escape(item.accountable_employee)}</strong>
                    ${accountableEmployeeTitle ? `<span class="label">Title: ${escape(accountableEmployeeTitle)}</span>` : ''}
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
                  ${item.article ? `<span class="label">Article</span><strong class="value">${escape(item.article)}</strong>` : ''}
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
                    <img src="${this.detailQrCode}" alt="Property QR code">
                  </div>
                </div>
                <div class="cell inventory">
                  <span class="label">
                    Date of Inventory &amp; Signature of Inventory Team
                  </span>
                  <div class="signature-slots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div class="cell warning">
                  TAMPERING OF THIS LABEL IS STRICTLY PROHIBITED
                </div>
              </div>
            </main>
            <script>
              window.onafterprint = () => window.close()
              window.onload = () => window.setTimeout(() => window.print(), 250)
            <\/script>
          </body>
        </html>
      `)

      printWindow.document.close()
      this.closeItemDetails()
    },

    async fetchJson(url) {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to load data')
      }

      return response.json()
    },

    async getOfficesAndPersonnel() {
      const results = await Promise.allSettled([
        this.fetchJson('/api/offices'),
        this.fetchJson('/api/personnel'),
      ])

      if (results[0].status === 'fulfilled') {
        this.offices = Array.isArray(results[0].value) ? results[0].value : []
      }

      if (results[1].status === 'fulfilled') {
        this.personnel = Array.isArray(results[1].value) ? results[1].value : []
      }

      if (results.some(result => result.status === 'rejected')) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Failed to load office or personnel options',
        }))
      }
    },

    async loadEmployeeJobTitles() {
      this.newEmployee.job_title = ''
    },

    resetNewEmployee() {
      this.newEmployee = {
        employee_id: '',
        full_name: '',
        email: '',
        password: '',
        role: '',
        job_title: '',
        office_id: '',
      }
      this.showAddEmployeeForm = false
    },

    async createEmployeeAccount() {
      if (this.creatingEmployee) return

      const employee = this.newEmployee
      if (
        !employee.employee_id ||
        !employee.full_name ||
        !employee.email ||
        !employee.password ||
        !employee.role ||
        !employee.job_title ||
        !employee.office_id
      ) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please complete all employee account fields.',
        }))
        return
      }

      if (employee.password.length < 6) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Temporary password must be at least 6 characters.',
        }))
        return
      }

      const selectedOffice = this.offices.find(
        office => String(office.id) === String(employee.office_id),
      )

      if (!selectedOffice) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please select a valid office.',
        }))
        return
      }

      this.creatingEmployee = true

      try {
        const response = await fetch('/api/personnel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employee_id: employee.employee_id,
            full_name: employee.full_name,
            email: employee.email,
            password: employee.password,
            role: employee.role,
            job_title: employee.job_title,
            office_id: selectedOffice.id,
            department: selectedOffice.office_name,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.data) {
          throw new Error(data.error || 'Unable to create employee account.')
        }

        const createdEmployee = {
          ...data.data,
          offices: { office_name: selectedOffice.office_name },
        }

        this.personnel.push(createdEmployee)
        this.newItem.accountable_employee = createdEmployee.full_name
        this.selectAccountableEmployee(this.newItem, createdEmployee.full_name)
        this.resetNewEmployee()

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Employee account created and selected as the accountable employee.',
        }))
      } catch (error) {
        console.error('Employee account creation failed:', error)
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Unable to create employee account.',
        }))
      } finally {
        this.creatingEmployee = false
      }
    },

    selectAccountableEmployee(form, employeeName) {
      const selectedName = String(employeeName || '').trim()

      if (!selectedName) {
        form.accountable_employee = ''
        form.office_name = ''
        form.status = 'Returned'
        return
      }

      const employee = this.personnel.find(person =>
        String(person.full_name || '').trim().toLowerCase() ===
        selectedName.toLowerCase(),
      )

      if (!employee) {
        form.accountable_employee = ''
        form.office_name = ''
        return
      }

      const employeeOffice =
        employee.offices?.office_name ||
        employee.office?.office_name ||
        employee.office_name ||
        ''

      form.accountable_employee = employee.full_name
      form.office_name = employeeOffice
      form.status = 'Issued'
    },
    async getItems() {
      this.loading = true

      try {
        const response = await fetch('/api/items')

        if (!response.ok) {
          throw new Error('Failed to get properties')
        }

        this.items = await response.json()
        this.itemsLoaded = true
        this.error = ''

        this.openItemFromRoute(this.$route.query.item)
      } catch (error) {
        console.log(error)
        this.error = error.message

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message,
        }))
      } finally {
        this.loading = false
      }
    },

    countClassification(classification) {
      return this.items.filter(item => item.classification === classification).length
    },

    displayClassification(classification) {
      if (classification === 'PAR') return 'Property Acknowledgement Receipt'
      if (classification === 'ICS High') return 'Inventory Custodian Slip - High Value'
      if (classification === 'ICS Low') return 'Inventory Custodian Slip - Low Value'
      return classification || '-'
    },

    classificationFromCost(cost) {
      const amount = Number(cost)

      if (!Number.isFinite(amount) || amount < 5000) return 'ICS Low'
      if (amount < 50000) return 'ICS High'
      return 'PAR'
    },

    getClassificationClass(classification) {
      if (classification === 'PAR') return 'classification-par'
      if (classification === 'ICS High') return 'classification-high'
      if (classification === 'ICS Low') return 'classification-low'
      return 'classification-default'
    },

    async ensureOfficeExists(officeName) {
      const trimmedName = String(officeName || '').trim()

      if (!trimmedName) {
        return ''
      }

      const existingOffice = this.offices.find(office =>
        office &&
        office.office_name &&
        office.office_name.toLowerCase() === trimmedName.toLowerCase(),
      )

      if (existingOffice) {
        return existingOffice.office_name
      }

      const response = await fetch('/api/offices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          office_name: trimmedName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add office')
      }

      this.offices.unshift(data)
      return data.office_name || trimmedName
    },

    async addItem() {
      this.saving = true

      try {
        const selectedEmployee = this.personnel.find(person =>
          String(person.full_name || '').trim().toLowerCase() ===
          String(this.newItem.accountable_employee || '').trim().toLowerCase(),
        )

        if (!selectedEmployee) {
          throw new Error('Select an accountable employee from the existing user accounts.')
        }

        if (!String(this.newItem.office_name || '').trim()) throw new Error('Office is required.')
        if (!String(this.newItem.responsibility_center || '').trim()) throw new Error('Responsibility Center is required.')

        const payload = {
          ...this.newItem,
          accountable_employee: selectedEmployee.full_name,
          office_name: this.newItem.office_name.trim(),
          responsibility_center: this.newItem.responsibility_center.trim(),
          classification: this.classificationFromCost(this.newItem.cost),
          quantity: 1,
        }

        const response = await fetch('/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add property')
        }

        if (Array.isArray(data)) {
          this.items.unshift(...data)
        } else {
          this.items.unshift(data)
        }

        this.resetForm()
        this.showAddForm = false

        // ADDED: Refresh the Acquisitions and Issuance badge.
        this.notifyIssuanceUpdate()

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Property added successfully',
        }))
      } catch (error) {
        console.error('Error adding property:', error)

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Failed to add property',
        }))
      } finally {
        this.saving = false
      }
    },

    startEdit(item) {
      this.editingItem = item

      this.editForm = {
        property_number: item.property_number || '',
        description: item.description || '',
        quantity: 1,
        model_number: item.model_number || '',
        serial_number: item.serial_number || '',
        cost: item.cost || 0,
        acquisition_date: item.acquisition_date || '',
        classification: item.classification || 'PAR',
        condition: this.isReturnedProperty(item) ? 'Unserviceable' : (item.condition || 'Serviceable'),
        status: item.status || 'Returned',
        accountable_employee: item.accountable_employee || '',
        office_name: item.office_name || '',
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

    showItemDetails(item) {
      this.detailItem = item
      this.printResponsibilityCenter = item.responsibility_center || ''
      this.detailQrCode = ''
      this.showQrModal = false
      this.qrCodeError = ''
      this.qrGenerating = false
      this.loadPropertyHistory(item.id)
      this.generateItemQrCode(false)
    },

    async loadPropertyHistory(itemId) {
      if (!itemId) return

      this.propertyHistoryLoading = true
      this.propertyHistoryError = ''
      this.propertyHistory = []

      try {
        const response = await fetch('/api/items/' + encodeURIComponent(itemId) + '/history')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load property history.')
        }

        if (this.detailItem && String(this.detailItem.id) === String(itemId)) {
          this.propertyHistory = Array.isArray(data) ? data : []
        }
      } catch (error) {
        console.error('Failed to load property history:', error)
        this.propertyHistoryError = error.message || 'Failed to load property history.'
      } finally {
        this.propertyHistoryLoading = false
      }
    },

    async generateItemQrCode(showModal = true) {
      const item = this.detailItem

      if (!item || this.qrGenerating) {
        return
      }

      this.qrGenerating = true
      this.detailQrCode = ''
      this.qrCodeError = ''

      try {
        const response = await fetch(
          `/api/items/${encodeURIComponent(item.id)}/document-link`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )

        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(
            'The backend needs to be restarted to enable property QR links. Restart it, then reload the app.',
          )
        }

        const linkData = await response.json()

        if (!response.ok) {
          throw new Error(
            linkData.error || 'Failed to create the property document link.',
          )
        }

        if (typeof linkData.downloadUrl === 'string' && !linkData.viewUrl) {
          throw new Error(
            'Restart the backend to enable QR codes that open property details, then reload the app.',
          )
        }

        if (
          typeof linkData.viewUrl !== 'string' ||
          !linkData.viewUrl.startsWith('/items?item=')
        ) {
          throw new Error('The backend returned an invalid property details link.')
        }

        const itemDetailsUrl = new URL(
          linkData.viewUrl,
          window.location.origin,
        ).toString()

        const qrCode = await createQrWithLogo(itemDetailsUrl)

        if (this.detailItem?.id === item.id) {
          this.detailQrCode = qrCode
          this.showQrModal = showModal
        }
      } catch (error) {
        console.error('Failed to generate property QR code:', error)

        if (this.detailItem?.id === item.id) {
          this.qrCodeError = error.message || 'Unable to generate the QR code.'
        }
      } finally {
        this.qrGenerating = false
      }
    },

    async downloadItemDocument() {
      const item = this.detailItem

      if (!item || !this.detailQrCode) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'The property QR code is not ready yet.',
        }))
        return
      }

      this.downloadingDocument = true

      try {
        const base64QrCode = this.detailQrCode.split(',')[1]

        if (!base64QrCode) {
          throw new Error('The property QR code is unavailable.')
        }

        const qrImage = Uint8Array.from(
          atob(base64QrCode),
          character => character.charCodeAt(0),
        )

        const itemDetails = [
          ['Property Number', item.property_number || '-'],
          ['Description', item.description || '-'],
          ['Model Number', item.model_number || '-'],
          ['Serial Number', item.serial_number || '-'],
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
          ['Responsibility Center / Office', this.printResponsibilityCenter || item.responsibility_center || '-'],
          ['Fund Cluster', item.fund_cluster || '-'],
        ]

        const documentFile = new DocxDocument({
          sections: [
            {
              children: [
                new Paragraph({
                  text: 'Property Details',
                  heading: HeadingLevel.TITLE,
                }),
                ...itemDetails.map(([label, value]) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${label}: `,
                        bold: true,
                      }),
                      new TextRun(String(value)),
                    ],
                  }),
                ),
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: qrImage,
                      transformation: {
                        width: 220,
                        height: 220,
                      },
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

        const safePropertyNumber = (item.property_number || 'property')
          .trim()
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
          .replace(/\s+/g, '-')
          .replace(/[. ]+$/g, '')

        downloadLink.href = downloadUrl
        downloadLink.download = `property-${safePropertyNumber || 'property'}.docx`

        document.body.appendChild(downloadLink)
        downloadLink.click()
        downloadLink.remove()

        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Property document downloaded successfully.',
        }))
      } catch (error) {
        console.error('Failed to create property document:', error)

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Failed to create the property document.',
        }))
      } finally {
        this.downloadingDocument = false
      }
    },

    openItemFromRoute(itemId) {
      if (!itemId || !this.itemsLoaded) {
        return
      }

      const item = this.items.find(
        currentItem => String(currentItem.id) === String(itemId),
      )

      if (!item) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'The property linked by this QR code could not be found.',
        }))
        return
      }

      this.showItemDetails(item)
    },

    closeItemDetails() {
      this.detailItem = null
      this.propertyHistory = []
      this.propertyHistoryError = ''
      this.detailQrCode = ''
      this.qrCodeError = ''
      this.qrGenerating = false

      if (this.$route.query.item) {
        const query = { ...this.$route.query }
        delete query.item

        this.$router.replace({
          name: 'Properties',
          query,
        })
      }
    },

    isReturnedProperty(item) {
      return String(item?.status || '').trim().toLowerCase() === 'returned' ||
        String(item?.condition || '').trim().toLowerCase() === 'unserviceable'
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
        const isReturned = this.isReturnedProperty(this.editingItem)
        const selectedEmployee = this.personnel.find(person =>
          String(person.full_name || '').trim().toLowerCase() ===
          String(this.editForm.accountable_employee || '').trim().toLowerCase(),
        )

        if (!selectedEmployee && !isReturned) {
          throw new Error('Select an accountable employee from the existing user accounts.')
        }

        if (!String(this.editForm.office_name || '').trim()) throw new Error('Office is required.')
        if (!String(this.editForm.responsibility_center || '').trim()) throw new Error('Responsibility Center is required.')

        const payload = {
          ...this.editForm,
          condition: isReturned ? 'Unserviceable' : this.editForm.condition,
          accountable_employee: selectedEmployee ? selectedEmployee.full_name : '',
          office_name: this.editForm.office_name.trim(),
          responsibility_center: this.editForm.responsibility_center.trim(),
          status: isReturned ? 'Returned' : 'Issued',
          quantity: 1,
        }

        const response = await fetch(`/api/items/${this.editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update property')
        }

        const index = this.items.findIndex(
          item => item.id === this.editingItem.id,
        )

        if (index !== -1) {
          this.items[index] = data
        }

        if (this.detailItem && this.detailItem.id === data.id) {
          this.detailItem = data
        }

        this.editingItem = null

        // ADDED: Refresh the Acquisitions and Issuance badge.
        this.notifyIssuanceUpdate()

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Property updated successfully',
        }))
      } catch (error) {
        console.log(error)

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message,
        }))
      } finally {
        this.updating = false
      }
    },

    canDeleteProperty(item) {
      return String(item?.status || '').trim().toLowerCase() === 'returned'
    },

    deleteItem(item) {
      if (this.deletingItemId !== null || !this.canDeleteProperty(item)) {
        return
      }

      this.itemPendingDeletion = item
    },

    async confirmDeleteItem() {
      const item = this.itemPendingDeletion

      if (!item || this.deletingItemId !== null || !this.canDeleteProperty(item)) {
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
          } catch {
            throw new Error(
              'The server returned an invalid response while deleting the property.',
            )
          }
        }

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to delete property. Please try again.',
          )
        }

        this.items = this.items.filter(
          currentItem => currentItem.id !== item.id,
        )

        if (this.editingItem && this.editingItem.id === item.id) {
          this.editingItem = null
        }

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: data.message || 'Property deleted successfully',
        }))
      } catch (error) {
        console.error(error)

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: error.message || 'Unable to delete this property.',
        }))
      } finally {
        this.deletingItemId = null
        this.itemPendingDeletion = null
      }
    },

    cancelDeleteItem() {
      if (this.deletingItemId === null) {
        this.itemPendingDeletion = null
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
      this.resetNewEmployee()
      this.newItem = {
        property_number: '',
        description: '',
        quantity: 1,
        model_number: '',
        serial_number: '',
        cost: 0,
        acquisition_date: '',
        classification: 'PAR',
        condition: 'Serviceable',
        status: 'Issued',
        accountable_employee: '',
        office_name: '',
        responsibility_center: '',
        fund_cluster: '',
        article: '',
        unit: 'PC',
        dr_ci_si_number: '',
        po_number: '',
        supplier: '',
        remarks: '',
      }
    },

    getConditionClass(condition) {
      if (condition === 'Serviceable') return 'bg-success'
      if (condition === 'Unserviceable') return 'bg-danger'
      return 'bg-secondary'
    },

    getStatusClass(status) {
      if (status === 'Assigned') return 'bg-primary'
      if (status === 'Issued') return 'bg-warning text-dark'
      if (status === 'Returned') return 'bg-info'
      if (status === 'Lost') return 'bg-danger'
      if (status === 'Damaged') return 'bg-warning text-dark'
      if (status === 'Stolen') return 'bg-danger'
      if (status === 'Disposed') return 'bg-secondary'
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

.property-table .cost-column {
  min-width: 140px;
}

.property-table .actions-column {
  width: 110px !important;
  min-width: 110px !important;
  white-space: nowrap !important;
  overflow-wrap: normal;
  word-break: keep-all;
}

.property-table-wrap > .property-table > thead > tr > th,
.property-table-wrap > .property-table > tbody > tr > td {
  padding: 6px 8px;
}

.property-details-button {
  display: inline-flex;
  min-width: 76px;
  height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 3px 8px;
  border: 0;
  border-radius: 4px;
  background: #edf5ed;
  color: #2f5d3a;
  font: inherit;
  font-size: .82rem;
  line-height: 1;
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
  cursor: pointer;
}

.property-details-button:hover {
  background: #dcebdc;
  color: #21452b;
}

.property-details-button:focus-visible {
  outline: 2px solid #6f9c70;
  outline-offset: 2px;
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
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.45);
}

.add-dialog {
  width: min(820px, 100%);
  max-height: min(90vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-dialog-header {
  flex: 0 0 auto;
  min-height: 58px;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #dee2e6;
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

.employee-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.6);
}

.employee-modal {
  width: min(760px, 100%);
  max-height: min(90vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.25);
}

.employee-modal-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.employee-modal-body {
  overflow-y: auto;
}

@media (max-width: 576px) {
  .employee-modal-overlay {
    padding: 0.5rem;
  }

  .employee-modal {
    max-height: 95vh;
  }

  .employee-modal .card-footer {
    flex-wrap: wrap;
  }

  .employee-modal .card-footer .btn {
    flex: 1 1 130px;
  }
}

.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
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

.qr-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.55);
}

.qr-modal-dialog {
  width: min(420px, 100%);
  max-height: 100%;
  overflow-y: auto;
  text-align: center;
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

.edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.45);
}

.edit-dialog {
  width: min(820px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  background-color: #fff;
}

.edit-dialog-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.edit-dialog-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.edit-dialog-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid #dee2e6;
  background-color: white;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 576px) {
  .edit-overlay {
    padding: 0.5rem;
  }

  .edit-dialog-footer {
    flex-wrap: wrap;
  }

  .edit-dialog-footer .btn {
    flex: 1 1 130px;
  }
}

@media (max-width: 639.98px) {
  .property-table-wrap > .property-table > tbody {
    gap: 6px;
  }

  .property-table-wrap > .property-table > tbody > tr {
    border-radius: 6px;
    box-shadow: none;
  }

  .property-table-wrap > .property-table > tbody > tr > td {
    gap: 1px;
    padding: 4px 7px;
    font-size: .75rem;
    line-height: 1.25;
  }

  .property-table-wrap > .property-table > tbody > tr > td:last-child {
    justify-content: flex-end;
    padding: 3px 7px;
  }

  .property-table-wrap > .property-table > tbody > tr > td:last-child > .property-details-button {
    flex: 0 0 auto;
    min-height: 28px;
    height: 28px;
    padding: 3px 8px;
    font-size: .75rem;
  }
}
</style>