
<template>
  <div>
    <PropertyTransferRequests @updated="refreshTransferData" />
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Transfers</h2>
        <p class="text-muted mb-0">Transfer issued property to another employee</p>
      </div>

      <button type="button" class="btn btn-warning" @click="openAddModal">
        <i class="bi bi-arrow-left-right me-1"></i>
        Add Transfer
      </button>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Search</label>
            <input
              type="text"
              class="form-control"
              v-model="search"
              placeholder="Search item, property no., employee, office..."
            >
          </div>

          <div class="col-md-3">
            <label class="form-label">Transfer Type</label>
            <select class="form-select" v-model="typeFilter">
              <option value="">All Types</option>
              <option value="To Employee">To Employee</option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label">Result</label>
            <select class="form-select" v-model="resultFilter">
              <option value="">All Results</option>
              <option value="Issued">Issued</option>
              <option value="Available">Available</option>
              <option value="Returned">Returned and Unserviceable</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Date</th>
                <th>Condition</th>
                <th>Property Status</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="transfer in paginatedTransfers" :key="transfer.id">
                <td>
                  <div>{{ (transfer.properties || []).length > 1 ? `${transfer.properties.length} properties` : (transfer.items?.description || '-') }}</div>
                  <small class="text-muted">{{ (transfer.properties || []).length > 1 ? transfer.properties.map(property => property.items?.property_number).filter(Boolean).join(', ') : (transfer.items?.property_number || '') }}</small>
                </td>

                <td>{{ transfer.transfer_type }}</td>

                <td>
                  {{ transfer.from_user?.full_name || '-' }}
                  <div v-if="transfer.from_user?.job_title" class="small text-muted">
                    {{ transfer.from_user.job_title }}
                  </div>
                </td>

                <td>
                  <template v-if="transfer.transfer_type === 'To Employee'">
                    {{ transfer.to_user?.full_name || '-' }}
                    <div v-if="transfer.to_user?.job_title" class="small text-muted">
                      {{ transfer.to_user.job_title }}
                    </div>
                  </template>
                  <template v-else>Property Office</template>

                  <div v-if="transfer.offices?.office_name" class="small text-muted">
                    {{ transfer.offices.office_name }}
                  </div>
                </td>

                <td>{{ transfer.transfer_date || '-' }}</td>

                <td>
                  <span
                    class="badge"
                    :class="transfer.condition_after_transfer === 'Serviceable' ? 'bg-success' : 'bg-danger'"
                  >
                    {{ transfer.condition_after_transfer || '-' }}
                  </span>
                </td>

                <td>
                  <span class="badge" :class="getResultClass(transfer)">
                    {{ getResultLabel(transfer) }}
                  </span>
                </td>

                <td class="text-center">
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="openTransferDetails(transfer)">
                    <i class="bi bi-eye me-1"></i>Details
                  </button>
                </td>
              </tr>

              <tr v-if="paginatedTransfers.length === 0">
                <td colspan="8" class="text-center text-muted py-4">
                  No transfers found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredTransfers.length > 0"
          class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3"
        >
          <div class="d-flex align-items-center gap-2">
            <label class="mb-0 text-muted small">Show</label>
            <select
              class="form-select form-select-sm"
              v-model.number="itemsPerPage"
              style="width: 75px"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span class="text-muted small">entries</span>
          </div>

          <div class="text-muted small">
            Showing {{ firstNumber }} to {{ lastNumber }} of {{ filteredTransfers.length }} transfers
          </div>

          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button
                  class="page-link"
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                >
                  Previous
                </button>
              </li>

              <li class="page-item active">
                <span class="page-link">{{ currentPage }} / {{ totalPages }}</span>
              </li>

              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button
                  class="page-link"
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- New Transfer Modal -->
    <div class="modal fade" id="transferModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Transfer</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              @click="resetEmployeeSearch"
            ></button>
          </div>

          <form @submit.prevent="saveTransfer">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">From Accountable Employee</label>
                <select class="form-select" v-model="form.from_user_id" required>
                  <option value="">Select current accountable employee</option>
                  <option v-for="person in sourceEmployees" :key="person.id" :value="person.id">{{ person.full_name }}</option>
                </select>
                <div v-if="sourceEmployees.length === 0" class="form-text text-warning">No issued properties are currently available for transfer.</div>
              </div>

              <div v-if="form.from_user_id" class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label mb-0">Select Properties to Transfer</label>
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleAllProperties" :disabled="selectableReceipts.length === 0">
                    {{ allPropertiesSelected ? 'Clear Selection' : 'Select All' }}
                  </button>
                </div>
                <div class="table-responsive border rounded">
                  <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr><th style="width:42px">Select</th><th>Property No.</th><th>Description</th><th>Amount</th><th>Condition</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="receipt in sourceReceipts" :key="receipt.id">
                        <td><input class="form-check-input" type="checkbox" v-model="form.property_receipt_ids" :value="receipt.id" :disabled="receipt.items?.condition !== 'Serviceable'"></td>
                        <td>{{ receipt.items?.property_number || '-' }}<div class="small text-muted">{{ receipt.receipt_number }}</div></td>
                        <td>{{ receipt.items?.description || '-' }}</td>
                        <td>₱{{ Number(receipt.items?.cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                        <td>
                          <span class="badge" :class="receipt.items?.condition === 'Serviceable' ? 'bg-success' : 'bg-danger'">{{ receipt.items?.condition || '-' }}</span>
                          <div v-if="receipt.items?.condition !== 'Serviceable'" class="small text-danger">Cannot transfer</div>
                        </td>
                      </tr>
                      <tr v-if="sourceReceipts.length === 0"><td colspan="5" class="text-center text-muted py-3">No issued properties found for this employee.</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="form-text">{{ form.property_receipt_ids.length }} property/properties selected. Only serviceable properties can be transferred.</div>
              </div>

              <div v-if="selectedSourceEmployee" class="alert alert-light border">
                <strong>From:</strong> {{ selectedSourceEmployee.full_name }}
                <div><strong>Current Responsibility Center:</strong> {{ selectedSourceResponsibilityCenter || 'Not specified' }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label d-block">Transfer To</label>
                <div class="text-muted small">
                  Another employee only
                </div>
              </div>

              <!-- Searchable Receiving Employee -->
              <div class="mb-3">
                <label class="form-label">Receiving Employee</label>

                <div class="position-relative">
                  <input
                    type="text"
                    class="form-control"
                    v-model="employeeSearch"
                    placeholder="Search employee name or job title..."
                    autocomplete="off"
                    @focus="showEmployeeOptions = true"
                    @input="showEmployeeOptions = true"
                  >

                  <div
                    v-if="showEmployeeOptions"
                    class="list-group position-absolute w-100 shadow"
                    style="max-height: 200px; overflow-y: auto; z-index: 1056;"
                  >
                    <button
                      v-for="person in filteredReceivingEmployees"
                      :key="person.id"
                      type="button"
                      class="list-group-item list-group-item-action"
                      :class="{ active: form.to_user_id === person.id }"
                      @click="selectReceivingEmployee(person)"
                    >
                      <div>{{ person.full_name }}</div>
                      <small
                        v-if="person.job_title"
                        :class="form.to_user_id === person.id ? 'text-white' : 'text-muted'"
                      >
                        {{ person.job_title }}
                      </small>
                    </button>

                    <div
                      v-if="filteredReceivingEmployees.length === 0"
                      class="list-group-item text-muted"
                    >
                      No employee found.
                    </div>
                  </div>
                </div>

                <div v-if="selectedReceivingEmployee" class="mt-2">
                  <label class="form-label">Title</label>
                  <input
                    class="form-control"
                    :value="selectedReceivingEmployee.job_title || ''"
                    readonly
                  >
                </div>

              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">
                    Office <span class="text-muted">(optional)</span>
                  </label>

                  <select class="form-select" v-model="form.office_id">
                    <option value="">None</option>
                    <option
                      v-for="office in offices"
                      :key="office.id"
                      :value="office.id"
                    >
                      {{ office.office_name }}
                    </option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Transfer Date</label>
                  <input
                    type="date"
                    class="form-control"
                    v-model="form.transfer_date"
                    required
                  >
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Reason for Transfer</label>
                <select class="form-select" v-model="form.reason" required>
                  <option value="">Select a reason</option>
                  <option value="End of Contract">End of Contract</option>
                  <option value="Transfer of Agency">Transfer of Agency</option>
                  <option value="Resignation">Resignation</option>
                  <option value="Change of Designation">Change of Designation</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Others">Others</option>
                </select>

                <input
                  v-if="form.reason === 'Others'"
                  type="text"
                  class="form-control mt-2"
                  v-model.trim="form.otherReason"
                  placeholder="Enter reason"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Remarks</label>
                <textarea
                  class="form-control"
                  rows="2"
                  v-model="form.remarks"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
                @click="resetEmployeeSearch"
              >
                Cancel
              </button>

              <button type="submit" class="btn btn-warning" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Transfer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal fade" id="transferDetailsModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Transfer Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="selectedTransferDetails">
            <div class="mb-3" v-if="selectedTransferDetails.properties?.length">
              <small class="text-muted d-block mb-2">Properties in this transfer ({{ selectedTransferDetails.properties.length }})</small>
              <div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr><th>Property No.</th><th>Description</th><th>Amount</th></tr></thead><tbody><tr v-for="property in selectedTransferDetails.properties" :key="property.transfer_id"><td>{{ property.items?.property_number || '-' }}</td><td>{{ property.items?.description || '-' }}</td><td>₱{{ Number(property.items?.cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td></tr></tbody></table></div>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <small class="text-muted d-block">From Accountable Employee</small>
                <strong>{{ selectedTransferDetails.from_user?.full_name || selectedTransferDetails.items?.accountable_employee || '-' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">To Accountable Employee / Office</small>
                <strong>{{ selectedTransferDetails.to_user?.full_name || selectedTransferDetails.offices?.office_name || 'Property Office' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">Transfer Date</small>
                <strong>{{ selectedTransferDetails.transfer_date || '-' }}</strong>
              </div>
              <div class="col-md-6">
                <small class="text-muted d-block">Condition</small>
                <strong>{{ selectedTransferDetails.condition_after_transfer || '-' }}</strong>
              </div>
              <div class="col-12">
                <small class="text-muted d-block">Reason for Transfer</small>
                <strong>{{ selectedTransferDetails.reason || '-' }}</strong>
              </div>
              <div class="col-12" v-if="selectedTransferDetails.remarks">
                <small class="text-muted d-block">Remarks</small>
                <strong>{{ selectedTransferDetails.remarks }}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer justify-content-between">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <div class="d-flex gap-2 flex-wrap">
              <button
                type="button"
                class="btn btn-outline-danger"
                @click="deleteTransferFromDetails"
              >
                <i class="bi bi-trash me-1"></i>Delete Transfer
              </button>
              <button type="button" class="btn btn-outline-primary" @click="printRPTFromDetails">
                <i class="bi bi-printer me-1"></i>Print Request for Property Transfer
              </button>
              <button type="button" class="btn btn-success" @click="printReceiptFromDetails">
                <i class="bi bi-receipt me-1"></i>Print Property Acknowledgement Receipt - Transfer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="propertyTransferRequestModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Print Request for Property Transfer</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">Complete the approval and signatory details before printing the Request for Property Transfer form.</p>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">From Accountable Employee <span class="text-muted">(optional)</span></label>
                <input class="form-control" v-model.trim="requestPrintDetails.fromAccountableEmployee" placeholder="Enter accountable employee">
              </div>
              <div class="col-md-6">
                <label class="form-label">From Responsibility Center <span class="text-muted">(optional)</span></label>
                <input class="form-control" v-model.trim="requestPrintDetails.fromResponsibilityCenter" placeholder="Enter responsibility center">
              </div>
              <div class="col-md-6">
                <label class="form-label">To Accountable Employee <span class="text-muted">(optional)</span></label>
                <input class="form-control" v-model.trim="requestPrintDetails.toAccountableEmployee" placeholder="Enter receiving accountable employee">
              </div>
              <div class="col-md-6">
                <label class="form-label">To Responsibility Center <span class="text-muted">(optional)</span></label>
                <input class="form-control" v-model.trim="requestPrintDetails.toResponsibilityCenter" placeholder="Enter responsibility center">
              </div>
              <div class="col-md-6 position-relative">
                <label class="form-label">Requested by - Printed Name</label>
                <input class="form-control" v-model.trim="requestPrintDetails.requestedBy.name"
                  @focus="openRequestPersonnelOptions('requestedBy')"
                  @input="searchRequestPersonnel('requestedBy')"
                  @blur="hideRequestPersonnelOptions('requestedBy')" autocomplete="off" required>
                <div v-if="showRequestPersonnelOptions.requestedBy" class="list-group position-absolute w-100 shadow" style="z-index:1080; max-height:220px; overflow-y:auto;">
                  <button v-for="person in filteredRequestPersonnel('requestedBy')" :key="person.id" type="button"
                    class="list-group-item list-group-item-action text-start" @mousedown.prevent="selectRequestSignatory('requestedBy', person)">
                    <strong>{{ person.full_name }}</strong><small v-if="person.job_title" class="d-block text-muted">{{ person.job_title }}</small>
                  </button>
                  <div v-if="filteredRequestPersonnel('requestedBy').length === 0" class="list-group-item text-muted">No personnel found.</div>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Requested by - Designation</label>
                <input class="form-control" v-model.trim="requestPrintDetails.requestedBy.designation" readonly required>
              </div>
              <div class="col-md-6 position-relative">
                <label class="form-label">Approved by - Printed Name</label>
                <input class="form-control" v-model.trim="requestPrintDetails.approvedBy.name"
                  @focus="openRequestPersonnelOptions('approvedBy')"
                  @input="searchRequestPersonnel('approvedBy')"
                  @blur="hideRequestPersonnelOptions('approvedBy')" autocomplete="off" required>
                <div v-if="showRequestPersonnelOptions.approvedBy" class="list-group position-absolute w-100 shadow" style="z-index:1080; max-height:220px; overflow-y:auto;">
                  <button v-for="person in filteredRequestPersonnel('approvedBy')" :key="person.id" type="button"
                    class="list-group-item list-group-item-action text-start" @mousedown.prevent="selectRequestSignatory('approvedBy', person)">
                    <strong>{{ person.full_name }}</strong><small v-if="person.job_title" class="d-block text-muted">{{ person.job_title }}</small>
                  </button>
                  <div v-if="filteredRequestPersonnel('approvedBy').length === 0" class="list-group-item text-muted">No personnel found.</div>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Approved by - Designation</label>
                <input class="form-control" v-model.trim="requestPrintDetails.approvedBy.designation" readonly required>
              </div>
              <div class="col-md-6 position-relative">
                <label class="form-label">Concurred by - Printed Name</label>
                <input class="form-control" v-model.trim="requestPrintDetails.concurredBy.name"
                  @focus="openRequestPersonnelOptions('concurredBy')"
                  @input="searchRequestPersonnel('concurredBy')"
                  @blur="hideRequestPersonnelOptions('concurredBy')" autocomplete="off" required>
                <div v-if="showRequestPersonnelOptions.concurredBy" class="list-group position-absolute w-100 shadow" style="z-index:1080; max-height:220px; overflow-y:auto;">
                  <button v-for="person in filteredRequestPersonnel('concurredBy')" :key="person.id" type="button"
                    class="list-group-item list-group-item-action text-start" @mousedown.prevent="selectRequestSignatory('concurredBy', person)">
                    <strong>{{ person.full_name }}</strong><small v-if="person.job_title" class="d-block text-muted">{{ person.job_title }}</small>
                  </button>
                  <div v-if="filteredRequestPersonnel('concurredBy').length === 0" class="list-group-item text-muted">No personnel found.</div>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Concurred by - Designation</label>
                <input class="form-control" v-model.trim="requestPrintDetails.concurredBy.designation" placeholder="Enter any designation" required>
              </div>
              <div class="col-md-4">
                <label class="form-label">Requested by - Date</label>
                <input type="date" class="form-control" v-model="requestPrintDetails.requestedBy.date">
              </div>
              <div class="col-md-4">
                <label class="form-label">Approved by - Date (Optional)</label>
                <input type="date" class="form-control" v-model="requestPrintDetails.approvedBy.date">
              </div>
              <div class="col-md-4">
                <label class="form-label">Concurred by - Date (Optional)</label>
                <input type="date" class="form-control" v-model="requestPrintDetails.concurredBy.date">
              </div>
              <div class="col-12">
                <label class="form-label">Action Taken (Property Officer)</label>
                <textarea class="form-control" rows="2" v-model.trim="requestPrintDetails.actionTaken"></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label">Paper Size</label>
                <select class="form-select" v-model="requestPrintDetails.paperSize">
                  <option value="long">Long (8.5 × 13 inches)</option>
                  <option value="legal">Legal (8.5 × 14 inches)</option>
                  <option value="letter">Letter (8.5 × 11 inches)</option>
                  <option value="a4">A4 (210 × 297 mm)</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="printPropertyTransferRequest">
              <i class="bi bi-printer me-1"></i>Print Request
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="transferPrintModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Property Acknowledgement Receipt - Transfer</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">Complete these details before printing the transfer receipt.</p>
            <div class="row g-3 mb-3">
              <div class="col-md-6"><label class="form-label">RPT No.</label><input class="form-control" v-model.trim="printDetails.rptNumber" placeholder="Enter RPT number"></div>
              <div class="col-md-6"><label class="form-label">Responsibility Center</label><input class="form-control" v-model.trim="printDetails.responsibilityCenter" placeholder="Defaults to the property record"></div>
              <div class="col-md-6"><label class="form-label">Paper Size</label><select class="form-select" v-model="printDetails.paperSize"><option value="long">Long (8.5 × 13 inches)</option><option value="legal">Legal (8.5 × 14 inches)</option><option value="letter">Letter (8.5 × 11 inches)</option><option value="a4">A4 (210 × 297 mm)</option></select></div>
            </div>
            <div class="mb-3">
              <label class="form-label d-block">Acknowledgement Classification</label>
              <div class="row g-2">
                <div class="col-md-6" v-for="classification in acknowledgementClassifications" :key="classification">
                  <label class="form-check">
                    <input class="form-check-input" type="checkbox" v-model="printDetails.classifications" :value="classification">
                    <span class="form-check-label">{{ classification }}</span>
                  </label>
                </div>
              </div>
            </div>
            <hr>
            <h6>Received by</h6>
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label">Printed Name <span class="text-danger">*</span></label>
                <div class="personnel-search">
                  <input v-model="personnelSearch.receivedBy" class="form-control" type="text" placeholder="Search or enter name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.receivedBy" @focus="openPersonnelOptions('receivedBy', printDetails.receivedBy.name)" @input="onSignatorySearch('receivedBy')" @keydown.esc="closePersonnelOptions('receivedBy')" @blur="hidePersonnelOptions('receivedBy')">
                  <div v-if="showPersonnelOptions.receivedBy" class="personnel-options" role="listbox">
                    <button v-if="printDetails.receivedBy.name && !personnel.some(person => person.full_name === printDetails.receivedBy.name)" type="button" role="option" @mousedown.prevent="selectSignatory('receivedBy', printDetails.receivedBy.name)">{{ printDetails.receivedBy.name }}</button>
                    <button v-for="person in filteredSignatoryPersonnel('receivedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectSignatory('receivedBy', person.full_name)">{{ person.full_name }}</button>
                    <div v-if="!filteredSignatoryPersonnel('receivedBy').length && !printDetails.receivedBy.name" class="personnel-empty">No matching names.</div>
                  </div>
                </div>
              </div>
              <div class="col-md-6"><label class="form-label">Title <span class="text-danger">*</span></label><input class="form-control" v-model.trim="printDetails.receivedBy.title" placeholder="Auto-filled from account; editable" required></div>
              <div class="col-md-6"><label class="form-label">Date <span class="text-danger">*</span></label><input type="date" class="form-control" v-model="printDetails.receivedBy.date" required></div>
            </div>
            <hr>
            <h6>Issued by</h6>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Printed Name</label>
                <div class="personnel-search">
                  <input v-model="personnelSearch.issuedBy" class="form-control" type="text" placeholder="Search or enter name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.issuedBy" @focus="openPersonnelOptions('issuedBy', printDetails.issuedBy.name)" @input="onSignatorySearch('issuedBy')" @keydown.esc="closePersonnelOptions('issuedBy')" @blur="hidePersonnelOptions('issuedBy')">
                  <div v-if="showPersonnelOptions.issuedBy" class="personnel-options" role="listbox">
                    <button v-if="printDetails.issuedBy.name && !personnel.some(person => person.full_name === printDetails.issuedBy.name)" type="button" role="option" @mousedown.prevent="selectSignatory('issuedBy', printDetails.issuedBy.name)">{{ printDetails.issuedBy.name }}</button>
                    <button v-for="person in filteredSignatoryPersonnel('issuedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectSignatory('issuedBy', person.full_name)">{{ person.full_name }}</button>
                    <div v-if="!filteredSignatoryPersonnel('issuedBy').length && !printDetails.issuedBy.name" class="personnel-empty">No matching names.</div>
                  </div>
                </div>
              </div>
              <div class="col-md-6"><label class="form-label">Title <span class="text-danger">*</span></label><input class="form-control" v-model.trim="printDetails.issuedBy.title" placeholder="Auto-filled from account; editable" required></div>
              <div class="col-md-6"><label class="form-label">Date <span class="text-danger">*</span></label><input type="date" class="form-control" v-model="printDetails.issuedBy.date" required></div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-warning" @click="printTransferReceipt">Print Receipt</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import PropertyTransferRequests from '@/components/PropertyTransferRequests.vue'

export default {
  name: 'Transfers',
  components: { PropertyTransferRequests },

  data() {
    return {
      transfers: [],
      receipts: [],
      personnel: [],
      offices: [],

      search: '',
      typeFilter: '',
      resultFilter: '',

      currentPage: 1,
      itemsPerPage: 10,
      saving: false,
      transferPrintData: null,
      selectedRequestTransfer: null,
      selectedTransferDetails: null,
      requestPrintDetails: this.emptyRequestPrintDetails(),
      requestPersonnelSearch: { requestedBy: '', approvedBy: '', concurredBy: '' },
      showRequestPersonnelOptions: { requestedBy: false, approvedBy: false, concurredBy: false },
      acknowledgementClassifications: [
        'NEW', 'RENEWAL', 'UPDATING', 'TRANSFER',
        'CLEARANCE-w/ Retain Accountability',
        'RETURNED Unserviceable', 'RETURNED Serviceable', 'RETURNED for Repair'
      ],
      printDetails: this.emptyPrintDetails(),
      personnelSearch: { receivedBy: '', issuedBy: '' },
      showPersonnelOptions: { receivedBy: false, issuedBy: false },

      // Receiving employee search
      employeeSearch: '',
      showEmployeeOptions: false,

      form: this.emptyForm()
    }
  },

  computed: {
    sourceEmployees() {
      const unique = new Map()
      this.receipts.forEach(receipt => {
        if (receipt.issued_to && receipt.users?.full_name) unique.set(receipt.issued_to, { id: receipt.issued_to, full_name: receipt.users.full_name })
      })
      return [...unique.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' }))
    },

    sourceReceipts() {
      return this.receipts.filter(receipt => receipt.issued_to === this.form.from_user_id)
    },

    selectableReceipts() {
      return this.sourceReceipts.filter(receipt => receipt.items?.condition === 'Serviceable')
    },

    allPropertiesSelected() {
      return this.selectableReceipts.length > 0 && this.selectableReceipts.every(receipt => this.form.property_receipt_ids.includes(receipt.id))
    },

    selectedSourceEmployee() {
      return this.sourceEmployees.find(person => person.id === this.form.from_user_id) || null
    },

    selectedSourceResponsibilityCenter() {
      const selected = this.sourceReceipts.find(receipt => this.form.property_receipt_ids.includes(receipt.id)) || this.sourceReceipts[0]
      return selected?.items?.responsibility_center || ''
    },

    receivingEmployees() {
      const holderId = this.form.from_user_id

      return this.personnel
        .filter(person => person.id !== holderId)
        .sort((first, second) =>
          first.full_name.localeCompare(second.full_name, undefined, {
            sensitivity: 'base'
          })
        )
    },

    // Employees matching the search input
    filteredReceivingEmployees() {
      const search = this.employeeSearch.toLowerCase().trim()

      return this.receivingEmployees.filter(person => {
        const name = (person.full_name || '').toLowerCase()
        const title = (person.job_title || '').toLowerCase()

        return name.includes(search) || title.includes(search)
      })
    },

    selectedReceivingEmployee() {
      return this.receivingEmployees.find(
        person => person.id === this.form.to_user_id
      ) || null
    },

    filteredTransfers() {
      const text = this.search.toLowerCase().trim()

      return this.transfers.filter(transfer => {
        const propertyText = (transfer.properties || []).map(property => `${property.items?.description || ''} ${property.items?.property_number || ''}`).join(' ')
        const haystack = [
          propertyText,
          transfer.items?.description,
          transfer.items?.property_number,
          transfer.from_user?.full_name,
          transfer.to_user?.full_name,
          transfer.offices?.office_name,
          transfer.reason
        ].join(' ').toLowerCase()

        return (
          (!text || haystack.includes(text)) &&
          (!this.typeFilter || transfer.transfer_type === this.typeFilter) &&
          (!this.resultFilter || transfer.resulting_status === this.resultFilter)
        )
      })
    },

    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredTransfers.length / this.itemsPerPage)
      )
    },

    paginatedTransfers() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      return this.filteredTransfers.slice(start, start + this.itemsPerPage)
    },

    firstNumber() {
      return this.filteredTransfers.length === 0
        ? 0
        : (this.currentPage - 1) * this.itemsPerPage + 1
    },

    lastNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredTransfers.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    typeFilter() {
      this.currentPage = 1
    },

    resultFilter() {
      this.currentPage = 1
    },

    itemsPerPage() {
      this.currentPage = 1
    },

    totalPages(value) {
      if (this.currentPage > value) {
        this.currentPage = value
      }
    },

    'form.from_user_id'() {
      this.form.property_receipt_ids = []
      this.form.to_user_id = ''
      this.employeeSearch = ''
      this.showEmployeeOptions = false
    },

    'form.to_user_id'() {
      if (!this.form.to_user_id) {
        this.employeeSearch = ''
      }
    }
  },

  mounted() {
    this.getTransfers()
    this.getReceipts()
    this.getPersonnel()
    this.getOffices()
  },

  methods: {
    emptyRequestPrintDetails() {
      return {
        rptNumber: '',
        fromAccountableEmployee: '',
        fromResponsibilityCenter: '',
        toAccountableEmployee: '',
        toResponsibilityCenter: '',
        paperSize: 'long',
        requestedBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' },
        concurredBy: { name: '', designation: '', date: '' },
        actionTaken: ''
      }
    },

    emptyPrintDetails() {
      const today = new Date().toISOString().split('T')[0]
      return {
        rptNumber: '',
        responsibilityCenter: '',
        paperSize: 'long',
        classifications: ['TRANSFER'],
        receivedBy: { name: '', title: '', date: today },
        issuedBy: { name: '', title: '', date: today }
      }
    },

    emptyForm() {
      return {
        from_user_id: '',
        property_receipt_ids: [],
        transfer_type: 'To Employee',
        to_user_id: '',
        office_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        condition_after_transfer: 'Serviceable',
        reason: '',
        otherReason: '',
        remarks: ''
      }
    },

    toast(message) {
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: message })
      )
    },

    async load(url, fallbackMessage) {
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || fallbackMessage)
      }

      return Array.isArray(data) ? data : []
    },

    async getTransfers() {
      try {
        this.transfers = await this.load(
          '/api/transfers',
          'Failed to load transfers'
        )
      } catch (error) {
        this.toast(error.message)
      }
    },

    async refreshTransferData() {
      await Promise.all([this.getTransfers(), this.getReceipts()])
    },

    async getReceipts() {
      try {
        this.receipts = await this.load(
          '/api/transfers/eligible-receipts',
          'Failed to load issued property'
        )
      } catch (error) {
        this.toast(error.message)
      }
    },

    async getPersonnel() {
      try {
        this.personnel = await this.load(
          '/api/personnel',
          'Failed to load personnel'
        )
      } catch (error) {
        console.log(error)
      }
    },

    getSignatoryTitle(name) {
      if (!name) return ''
      const person = this.personnel.find(employee =>
        String(employee.full_name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
      )
      return person?.job_title || ''
    },

    filteredSignatoryPersonnel(section) {
      const search = String(this.personnelSearch[section] || '').trim().toLowerCase()
      if (!search) return this.personnel
      return this.personnel.filter(person =>
        String(person.full_name || '').toLowerCase().includes(search)
      )
    },

    openPersonnelOptions(section, selectedName) {
      if (!this.personnelSearch[section]) this.personnelSearch[section] = selectedName || ''
      this.showPersonnelOptions[section] = true
    },

    onSignatorySearch(section) {
      const signatory = this.printDetails[section]
      signatory.name = this.personnelSearch[section].trim()
      signatory.title = this.getSignatoryTitle(signatory.name)
      this.showPersonnelOptions[section] = true
    },

    selectSignatory(section, fullName) {
      const signatory = this.printDetails[section]
      signatory.name = fullName
      signatory.title = this.getSignatoryTitle(fullName)
      this.personnelSearch[section] = fullName
      this.showPersonnelOptions[section] = false
    },

    closePersonnelOptions(section) {
      this.showPersonnelOptions[section] = false
    },

    hidePersonnelOptions(section) {
      setTimeout(() => this.closePersonnelOptions(section), 150)
    },

    async getOffices() {
      try {
        this.offices = await this.load(
          '/api/offices',
          'Failed to load offices'
        )
      } catch (error) {
        console.log(error)
      }
    },

    openAddModal() {
      this.form = this.emptyForm()
      this.employeeSearch = ''
      this.showEmployeeOptions = false

      Modal.getOrCreateInstance(
        document.getElementById('transferModal')
      ).show()
    },

    toggleAllProperties() {
      this.form.property_receipt_ids = this.allPropertiesSelected
        ? []
        : this.selectableReceipts.map(receipt => receipt.id)
    },

    selectReceivingEmployee(person) {
      this.form.to_user_id = person.id
      this.employeeSearch = person.full_name
      this.showEmployeeOptions = false
    },

    resetEmployeeSearch() {
      this.employeeSearch = ''
      this.showEmployeeOptions = false
      this.form.to_user_id = ''
    },

    async saveTransfer() {
      if (!this.form.property_receipt_ids.length) {
        this.toast('Please select at least one property to transfer.')
        return
      }
      if (!this.form.to_user_id) {
        this.toast('Please select the receiving employee.')
        return
      }

      this.saving = true
      let transferredCount = 0
      const selectedReceipts = this.sourceReceipts.filter(receipt =>
        this.form.property_receipt_ids.includes(receipt.id)
      )
      const transferInfo = {
        receipts: selectedReceipts,
        fromEmployee: this.selectedSourceEmployee,
        toEmployee: this.selectedReceivingEmployee,
        officeName: this.offices.find(item => item.id === this.form.office_id)?.office_name || '',
        transferDate: this.form.transfer_date,
        remarks: this.form.reason === 'Others' ? `Others: ${this.form.otherReason.trim()}` : this.form.reason,
        notes: this.form.remarks
      }

      try {
        const response = await fetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_receipt_ids: this.form.property_receipt_ids,
            transfer_type: 'To Employee',
            to_user_id: this.form.to_user_id,
            office_id: this.form.office_id || null,
            transfer_date: this.form.transfer_date,
            condition_after_transfer: null,
            reason: transferInfo.remarks,
            remarks: this.form.remarks
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to transfer selected properties')
        transferredCount = selectedReceipts.length

        this.transferPrintData = transferInfo
        this.printDetails = this.emptyPrintDetails()
        this.printDetails.responsibilityCenter = selectedReceipts[0]?.items?.responsibility_center || ''
        Modal.getOrCreateInstance(document.getElementById('transferModal')).hide()
        this.employeeSearch = ''
        this.showEmployeeOptions = false
        await Promise.all([this.getTransfers(), this.getReceipts()])
        this.form = this.emptyForm()
        this.toast(`${transferredCount} propert${transferredCount === 1 ? 'y' : 'ies'} transferred successfully.`)
        this.$nextTick(() => {
          Modal.getOrCreateInstance(document.getElementById('transferPrintModal')).show()
        })
      } catch (error) {
        if (transferredCount > 0) {
          await Promise.all([this.getTransfers(), this.getReceipts()])
          this.toast(`${transferredCount} propert${transferredCount === 1 ? 'y' : 'ies'} transferred. Remaining transfer stopped: ${error.message}`)
          this.form = this.emptyForm()
        } else {
          this.toast(error.message)
        }
      } finally {
        this.saving = false
      }
    },

    openTransferDetails(transfer) {
      this.selectedTransferDetails = transfer
      Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).show()
    },

    async deleteTransferFromDetails() {
      const transfer = this.selectedTransferDetails
      if (!transfer?.id) {
        this.toast('Transfer details are not available.')
        return
      }

      const confirmed = confirm(
        'Are you sure you want to delete this transfer? All properties in this transfer group will be restored to their previous accountable employees.'
      )
      if (!confirmed) return

      try {
        const response = await fetch(`/api/transfers/${transfer.id}`, {
          method: 'DELETE'
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete transfer.')
        }

        Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).hide()
        this.selectedTransferDetails = null
        await Promise.all([this.getTransfers(), this.getReceipts()])
        this.toast(data.message || 'Transfer deleted successfully.')
      } catch (error) {
        this.toast(error.message)
      }
    },

    printRPTFromDetails() {
      const transfer = this.selectedTransferDetails
      Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).hide()
      this.openTransferRequestPrint(transfer)
    },

    printReceiptFromDetails() {
      const transfer = this.selectedTransferDetails
      Modal.getOrCreateInstance(document.getElementById('transferDetailsModal')).hide()
      this.openExistingTransferReceipt(transfer)
    },

    openExistingTransferReceipt(transfer) {
      if (!transfer || !transfer.items) {
        this.toast('The property details for this transfer are not available.')
        return
      }

      this.transferPrintData = {
        receipts: transfer.receipts?.length ? transfer.receipts : [{
          items: transfer.items,
          quantity: transfer.property_receipts?.quantity || 1,
          date_issued: transfer.property_receipts?.date_issued || transfer.transfer_date
        }],
        fromEmployee: transfer.from_user || null,
        toEmployee: transfer.to_user || null,
        officeName: transfer.offices?.office_name || transfer.items.responsibility_center || '',
        transferDate: transfer.transfer_date,
        remarks: transfer.reason || '',
        notes: transfer.remarks || ''
      }

      this.printDetails = this.emptyPrintDetails()
      this.printDetails.rptNumber = transfer.rpt_number || transfer.rpt_no || this.getAutomaticRPTNumber(transfer)
      this.printDetails.responsibilityCenter = transfer.items.responsibility_center || ''
      Modal.getOrCreateInstance(document.getElementById('transferPrintModal')).show()
    },

    getAutomaticRPTNumber(transfer) {
      const orderedTransfers = [...this.transfers].sort((a, b) => {
        const dateA = new Date(a.created_at || a.transfer_date || 0).getTime()
        const dateB = new Date(b.created_at || b.transfer_date || 0).getTime()
        return dateA - dateB
      })
      let sequence = orderedTransfers.findIndex(row => row.id === transfer?.id)
      if (sequence < 0) sequence = orderedTransfers.length
      return '2026-' + String(15 + sequence).padStart(3, '0')
    },

    filteredRequestPersonnel(section) {
      const search = String(this.requestPersonnelSearch[section] || '').trim().toLowerCase()
      if (!search) return this.personnel
      return this.personnel.filter(person =>
        String(person.full_name || '').toLowerCase().includes(search) ||
        String(person.job_title || '').toLowerCase().includes(search)
      )
    },

    openRequestPersonnelOptions(section) {
      this.requestPersonnelSearch[section] = this.requestPrintDetails[section].name || ''
      this.showRequestPersonnelOptions[section] = true
    },

    searchRequestPersonnel(section) {
      this.requestPersonnelSearch[section] = this.requestPrintDetails[section].name || ''
      this.showRequestPersonnelOptions[section] = true
      const matched = this.personnel.find(person =>
        String(person.full_name || '').trim().toLowerCase() === this.requestPersonnelSearch[section].trim().toLowerCase()
      )
      this.requestPrintDetails[section].designation = matched?.job_title || ''
    },

    selectRequestSignatory(section, person) {
      this.requestPrintDetails[section].name = person.full_name || ''
      this.requestPrintDetails[section].designation = person.job_title || ''
      this.requestPersonnelSearch[section] = person.full_name || ''
      this.showRequestPersonnelOptions[section] = false
    },

    hideRequestPersonnelOptions(section) {
      setTimeout(() => {
        this.showRequestPersonnelOptions[section] = false
      }, 150)
    },

    openTransferRequestPrint(transfer) {
      this.selectedRequestTransfer = transfer
      this.requestPrintDetails = this.emptyRequestPrintDetails()
      this.requestPrintDetails.rptNumber = transfer.rpt_number || transfer.rpt_no || this.getAutomaticRPTNumber(transfer)
      this.requestPrintDetails.fromAccountableEmployee = transfer.from_user?.full_name || transfer.items?.accountable_employee || ''
      this.requestPrintDetails.toAccountableEmployee = transfer.to_user?.full_name || ''
      this.requestPrintDetails.requestedBy.name = transfer.from_user?.full_name || ''
      this.requestPrintDetails.requestedBy.designation = transfer.from_user?.job_title || ''
      this.requestPrintDetails.requestedBy.date = String(transfer.transfer_date || '').slice(0, 10)
      this.requestPersonnelSearch = {
        requestedBy: this.requestPrintDetails.requestedBy.name,
        approvedBy: '',
        concurredBy: ''
      }
      this.showRequestPersonnelOptions = { requestedBy: false, approvedBy: false, concurredBy: false }
      Modal.getOrCreateInstance(document.getElementById('propertyTransferRequestModal')).show()
    },

    printPropertyTransferRequest() {
      const transfer = this.selectedRequestTransfer
      if (!transfer) {
        this.toast('Transfer details are not available.')
        return
      }

      const details = this.requestPrintDetails
      const rptNumber = String(details.rptNumber || this.getAutomaticRPTNumber(transfer)).trim()
      transfer.rpt_number = rptNumber
      details.rptNumber = rptNumber
      const requiredRequestFields = [
        ['Requested by - Printed Name', details.requestedBy.name],
        ['Requested by - Designation', details.requestedBy.designation],
        ['Approved by - Printed Name', details.approvedBy.name],
        ['Approved by - Designation', details.approvedBy.designation],
        ['Concurred by - Printed Name', details.concurredBy.name],
        ['Concurred by - Designation', details.concurredBy.designation]
      ]
      const missingRequestField = requiredRequestFields.find(field => !String(field[1] || '').trim())
      if (missingRequestField) {
        const requiredInputs = this.$el.querySelectorAll('#propertyTransferRequestModal input[required], #propertyTransferRequestModal textarea[required]')
        const firstInvalidInput = Array.from(requiredInputs).find(input => !String(input.value || '').trim())
        if (firstInvalidInput) {
          firstInvalidInput.focus()
          firstInvalidInput.reportValidity()
        }
        return
      }
      const esc = this.escapePrint
      const item = transfer.items || {}
      const receipt = transfer.property_receipts || {}
      const fromName = details.fromAccountableEmployee || ''
      const toName = details.toAccountableEmployee || ''
      const fromCenter = details.fromResponsibilityCenter || ''
      const toCenter = details.toResponsibilityCenter || ''
      const quantity = Number(receipt.quantity || 1)
      const amount = Number(item.cost || 0) * quantity
      const condition = transfer.condition_after_transfer || item.condition || '-'
      const formatDate = value => {
        if (!value) return ''
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      }
      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.toast('Please allow pop-ups to print the request.')
        return
      }

      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      const transferProperties = transfer.properties?.length ? transfer.properties : [{ items: item, property_receipts: receipt, condition_after_transfer: transfer.condition_after_transfer }]
      const itemRows = transferProperties.map(property => {
        const propertyItem = property.items || {}
        const propertyReceipt = property.property_receipts || {}
        const propertyAmount = Number(propertyItem.cost || 0) * Number(propertyReceipt.quantity || 1)
        return `<tr><td class="center">${esc(formatDate(propertyItem.acquisition_date))}</td><td class="center">${esc(propertyItem.property_number || '')}</td><td>${esc(propertyItem.description || '')}</td><td class="right">${propertyAmount.toLocaleString('en-PH',{minimumFractionDigits:2})}</td><td class="center">${esc(property.condition_after_transfer || propertyItem.condition || '-')}</td></tr>`
      }).join('')
      const blankRows = Array.from({ length: Math.max(0, 9 - transferProperties.length) }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('')
      const paperSizes = { long: '8.5in 13in', legal: '8.5in 14in', letter: '8.5in 11in', a4: '210mm 297mm' }
      const selectedPaperSize = paperSizes[details.paperSize] || paperSizes.long
      printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Request for Property Transfer</title>
<style>
@page{size:${selectedPaperSize} portrait;margin:6mm}
*{box-sizing:border-box}
html,body{margin:0!important;padding:0!important;width:auto!important;color:#111;font-family:Arial,Helvetica,sans-serif}
body{font-size:9px}
.sheet{width:100%;min-height:0;padding:4px 6px 5px;position:relative}
.header{min-height:76px;border:1px solid #999;display:grid;grid-template-columns:60px 1fr;align-items:stretch;text-align:center}
.logo-cell{min-height:76px;border-right:1px solid #999;display:flex;align-items:center;justify-content:center}
.logo{width:43px;height:43px;object-fit:contain}
.header-text{display:flex;flex-direction:column;justify-content:center;font-size:14px;line-height:1.1;font-weight:bold;padding:4px 6px}
.header-text .school{font-size:16px}
.header-title{font-size:14px;font-weight:bold;text-align:center;border-top:1px solid #999;margin:4px -6px 0;padding:4px 3px 0}
.rpt{font-weight:bold;text-align:right;padding:5px 0;font-size:14px}
.rpt-number{display:inline-block;min-width:105px;text-align:center;border-bottom:1px solid #111;padding:0 5px 1px}
.date{margin:10px 0 7px 6px;font-size:14px}
.info,.items,.reason,.approvals{width:100%;border-collapse:collapse;table-layout:fixed}
.info td{border:1px solid #888;padding:6px 7px;min-height:34px;font-size:14px;line-height:1.25}
.info .label{width:34%;white-space:normal;overflow-wrap:break-word}
.items th,.items td{border:1px solid #888;padding:5px}
.items th{text-align:center;font-weight:bold;min-height:36px;font-size:14px;line-height:1.2}
.items td{min-height:30px;font-size:14px;line-height:1.25}
.items tbody tr:first-child td{min-height:34px}
.items tbody tr:not(:first-child) td{height:0.33in;min-height:0.33in}
.center{text-align:center}.right{text-align:right}
.reason td{border:1px solid #888;padding:7px;height:auto;font-size:14px;line-height:1.25}
.approvals th,.approvals td{border:1px solid #888;padding:6px 7px;font-size:14px;line-height:1.25}
.approvals th{text-align:center;min-height:38px;font-size:14px}
.approvals td{min-height:30px}.approvals .signatory,.approvals .signatory-date{text-align:center;vertical-align:middle}.approvals .signatory-name{text-align:center;text-transform:uppercase;vertical-align:middle}
.approvals .row-label{font-weight:bold;width:12%}
.approvals .action{vertical-align:top}
.instructions{border:1px solid #888;padding:9px 11px 10px;font-size:14px;line-height:1.3}
.instructions h2{text-align:center;text-decoration:underline;font-size:14px;margin:3px 0 9px}
.instructions p{font-size:14px;line-height:1.3;margin:0 0 8px}
.instructions .copies{text-align:center;font-size:14px;line-height:1.3;margin-top:9px}
.form-code{margin-top:8px;text-align:left;font-size:11px;font-weight:bold;line-height:1.2}
.sheet.paper-long{font-size:11px}
.sheet.paper-letter,.sheet.paper-a4{font-size:10px}
.sheet.paper-letter .header-text,.sheet.paper-a4 .header-text{font-size:11px}
.sheet.paper-letter .header-text .school,.sheet.paper-a4 .header-text .school{font-size:12px}
.sheet.paper-letter .header-title,.sheet.paper-a4 .header-title{font-size:11px}
.sheet.paper-letter .rpt,.sheet.paper-a4 .rpt,.sheet.paper-letter .date,.sheet.paper-a4 .date{font-size:11px}
.sheet.paper-letter .info td,.sheet.paper-a4 .info td,.sheet.paper-letter .items th,.sheet.paper-a4 .items th,.sheet.paper-letter .items td,.sheet.paper-a4 .items td,.sheet.paper-letter .reason td,.sheet.paper-a4 .reason td,.sheet.paper-letter .approvals th,.sheet.paper-a4 .approvals th,.sheet.paper-letter .approvals td,.sheet.paper-a4 .approvals td{font-size:10px;padding:3px 4px}
.sheet.paper-letter .instructions,.sheet.paper-a4 .instructions,.sheet.paper-letter .instructions p,.sheet.paper-a4 .instructions p,.sheet.paper-letter .instructions h2,.sheet.paper-a4 .instructions h2,.sheet.paper-letter .instructions .copies,.sheet.paper-a4 .instructions .copies{font-size:10px;line-height:1.2}
.sheet.paper-letter .instructions,.sheet.paper-a4 .instructions{padding:6px 8px}
.sheet.paper-letter .instructions p,.sheet.paper-a4 .instructions p{margin-bottom:5px}
.sheet.paper-letter .items tbody tr:not(:first-child) td,.sheet.paper-a4 .items tbody tr:not(:first-child) td{height:0.25in;min-height:0.25in}
@media print{html,body{margin:0!important;padding:0!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{min-height:0;break-inside:avoid;page-break-inside:avoid}}
</style></head><body>
<div class="sheet">
<div class="header"><div class="logo-cell"><img class="logo" src="${logoUrl}" alt="NVSU"></div><div class="header-text"><div>Republic of the Philippines</div><div class="school">NUEVA VIZCAYA STATE UNIVERSITY</div><div>Bambang, Nueva Vizcaya</div><div class="header-title">REQUEST FOR PROPERTY TRANSFER</div></div></div>
<div class="rpt">RPT No.: <span class="rpt-number">${esc(details.rptNumber || this.getAutomaticRPTNumber(transfer))}</span></div>
<div class="date">Date: ${esc(formatDate(transfer.transfer_date))}</div>
<table class="info">
<tr><td class="label">From Accountable Employee /<br>Responsibility Center:</td><td>${esc(fromName)} / ${esc(fromCenter)}</td></tr>
<tr><td class="label">To Accountable Employee /<br>Responsibility Center:</td><td>${esc(toName)} / ${esc(toCenter)}</td></tr>
</table>
<table class="items">
<thead><tr><th style="width:12%">DATE<br>ACQUIRED</th><th style="width:17%">PROPERTY NO.</th><th style="width:37%">DESCRIPTION</th><th style="width:15%">AMOUNT</th><th style="width:19%">CONDITION OF<br>PPE</th></tr></thead>
<tbody>${itemRows}${blankRows}</tbody>
</table>
<table class="reason"><tr><td style="width:12%;font-weight:bold">Reason for<br>Transfer:</td><td>${esc(transfer.reason || transfer.remarks || '')}</td></tr></table>
<table class="approvals">
<tr><th style="width:12%"></th><th style="width:19%">Requested by:</th><th style="width:19%">Approved by:</th><th style="width:19%">Concurred by:</th><th>Action Taken (to be<br>filled by the Property Officer)</th></tr>
<tr><td class="row-label">Signature:</td><td></td><td></td><td></td><td class="action" rowspan="4"></td></tr>
<tr><td class="row-label">Printed Name:</td><td class="signatory-name">${esc(String(details.requestedBy.name || '').toUpperCase())}</td><td class="signatory-name">${esc(String(details.approvedBy.name || '').toUpperCase())}</td><td class="signatory-name">${esc(String(details.concurredBy.name || '').toUpperCase())}</td></tr>
<tr><td class="row-label">Designation:</td><td class="signatory">${esc(details.requestedBy.designation)}</td><td class="signatory">${esc(details.approvedBy.designation)}</td><td class="signatory">${esc(details.concurredBy.designation)}</td></tr>
<tr><td class="row-label">Date:</td><td class="signatory-date">${esc(details.requestedBy.date ? formatDate(details.requestedBy.date) : '')}</td><td class="signatory-date">${esc(details.approvedBy.date ? formatDate(details.approvedBy.date) : '')}</td><td class="signatory-date">${esc(details.concurredBy.date ? formatDate(details.concurredBy.date) : '')}</td></tr>
</table>
<div class="instructions">
<h2>INSTRUCTIONS</h2>
<p><strong>A.</strong> The RPT shall be used by the accountable employee to request transfer of property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Immediate Supervisor for the approval, by the personnel who will receive the property and the Property Officer to act on the request;</p>
<p><strong>B.</strong> The property to be transferred shall be inspected/checked first by the assigned receiving employee/user before affixing his/her signature on the "concurred" portion of this form;</p>
<p><strong>C.</strong> This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;</p>
<p><strong>D.</strong> The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 71); and</p>
<p><strong>E.</strong> This form shall be prepared in two(2) copies distributed as follows:</p>
<div class="copies">Original – Supply and/or Property Division/Unit's file<br>Copy 2 – Accounting Division/Unit (to be attached to Property Transfer Report)</div>
</div>
<div class="form-code">NVSU-FR-SMO-02-00 (121421)</div>
</div>
<script>window.onload=function(){const logo=document.querySelector('.logo');if(logo&&!logo.complete){logo.onload=function(){window.print()};logo.onerror=function(){window.print()}}else{window.print()}}<\/script>
</body></html>`)
      printWindow.document.close()
    },

    escapePrint(value) {
      return String(value === null || value === undefined || value === '' ? '-' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    },

    printTransferReceipt() {
      if (!this.transferPrintData) {
        this.toast('Transfer details are not available for printing.')
        return
      }
      const data = this.transferPrintData
      const details = this.printDetails
      const requiredSignatoryFields = [
        ['Received by - Printed Name', details.receivedBy.name],
        ['Received by - Title', details.receivedBy.title],
        ['Received by - Date', details.receivedBy.date],
        ['Issued by - Printed Name', details.issuedBy.name],
        ['Issued by - Title', details.issuedBy.title],
        ['Issued by - Date', details.issuedBy.date]
      ]
      const missingSignatoryField = requiredSignatoryFields.find(field => !String(field[1] || '').trim())
      if (missingSignatoryField) {
        const fieldInputs = this.$el.querySelectorAll('.modal.show input[required]')
        const firstInvalidInput = Array.from(fieldInputs).find(input => !String(input.value || '').trim())
        if (firstInvalidInput) {
          firstInvalidInput.focus()
          firstInvalidInput.reportValidity()
        }
        return
      }
      const esc = this.escapePrint
      const firstItem = data.receipts[0]?.items || {}
      const isICS = Number(firstItem.cost || 0) < 50000
      const receiptTitle = isICS ? 'INVENTORY CUSTODIAN SLIP - TRANSFER' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT - TRANSFER'
      const appendix = '71'
      const total = data.receipts.reduce((sum, receipt) => sum + Number(receipt.items?.cost || 0) * Number(receipt.quantity || 1), 0)
      const amount = value => Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const date = value => {
        if (!value) return '-'
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric', year: 'numeric' })
      }
      const signatureDate = value => {
        if (!value) return '-'
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      }
      const classifications = this.acknowledgementClassifications.map(label =>
        `<span class="classification-option">${details.classifications.includes(label) ? '☑' : '☐'} ${esc(label)}</span>`
      ).join('')
      const rows = data.receipts.map(receipt => {
        const item = receipt.items || {}
        const qty = Number(receipt.quantity || 1)
        const unitValue = Number(item.cost || 0)
        return `<tr><td class="center">${qty}</td><td class="center">${esc(item.unit || 'unit')}</td><td class="description">${esc(item.description)}</td><td class="center">${esc(item.property_number)}</td><td class="center">${esc(date(item.acquisition_date || receipt.date_issued))}</td><td class="number">${amount(unitValue)}</td><td class="number">${amount(unitValue * qty)}</td></tr>`
      }).join('')
      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.toast('Please allow pop-ups to print the transfer receipt.')
        return
      }
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      const responsibilityCenter = details.responsibilityCenter || firstItem.responsibility_center || data.officeName || '-'
      const paperSizes = { long: '8.5in 13in', legal: '8.5in 14in', letter: '8.5in 11in', short: '8.5in 11in', a4: '210mm 297mm' }
      const selectedPaperSize = paperSizes[details.paperSize] || paperSizes.long
      printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${esc(receiptTitle)}</title>
<style>
@page{size:${selectedPaperSize} portrait;margin:10mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;color:#111;font-family:Arial,Helvetica,sans-serif}
body{font-size:14px}
.page{width:100%;min-height:calc(100vh - 20mm);display:flex;flex-direction:column;break-inside:avoid;page-break-inside:avoid}
.header{display:grid;grid-template-columns:62px 1fr 100px;align-items:center;text-align:center;margin-bottom:9px;min-height:70px}
.logo{width:58px;height:58px;object-fit:contain}
.school{font-size:16px;font-weight:bold;line-height:1.2}
.campus{font-size:14px;line-height:1.25;font-weight:bold}
.appendix{text-align:right;font-weight:bold;align-self:start;font-size:14px;padding-top:2px}
.receipt-title{text-align:center;font-size:14px;line-height:1.2;margin:5px 0 10px;font-weight:bold}
.receipt-title.ics-title{font-size:14px;letter-spacing:0;line-height:1.2;margin:3px auto 8px;max-width:100%;white-space:normal}
.meta{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #111;padding:6px 7px 7px;font-size:14px;gap:12px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
.items th,.items td{padding:5px 4px;vertical-align:middle;border-top:1px solid #111;border-bottom:1px solid #111;border-left:0;border-right:0;font-size:14px;line-height:1.2;overflow-wrap:normal}
.items th{text-align:center;font-weight:bold}
.items td{font-size:14px}
.items tbody tr{border-bottom:1px solid #aaa;min-height:0.33in}
.items .description{white-space:pre-line;overflow-wrap:break-word}
.items td:nth-child(4),.items td:nth-child(5){white-space:nowrap}
.center{text-align:center}.number{text-align:right;white-space:nowrap}
.total td{border-top:1px solid #111;border-bottom:1px solid #111;font-weight:bold;padding-top:6px;padding-bottom:6px;font-size:14px;color:#000}.total td:nth-last-child(-n+2){background:#ffeb3b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.nothing{text-align:center;border-bottom:1px solid #111;padding:6px 0;font-size:14px}
.remarks{border-bottom:none;padding:7px 3px;min-height:34px;font-size:14px}
.bottom-block{margin-top:auto;flex-shrink:0;break-inside:avoid;page-break-inside:avoid}
.page-number{text-align:right;border-top:1px solid #111;padding-top:5px;margin-bottom:7px;font-size:14px}
.classification{padding-top:5px}
.classification-title{font-size:14px;font-weight:bold;text-decoration:underline;margin-bottom:7px}
.classification-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px 8px;font-size:14px;line-height:1.2}
.classification-option{white-space:normal;overflow-wrap:normal}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:45px;margin-top:12px;min-height:105px;padding:0 12px;break-inside:avoid;page-break-inside:avoid}
.sign-block{text-align:center;min-height:100px}
.sign-heading{text-align:left;font-weight:bold;margin-bottom:24px;font-size:14px}
.sign-name{font-weight:bold;text-transform:uppercase;font-size:14px}
.sign-designation{font-size:14px;margin-top:2px}
.sign-date{font-size:14px;margin-top:3px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
<div class="header"><img class="logo" src="${logoUrl}" alt="NVSU Logo"><div><div class="school">NUEVA VIZCAYA STATE UNIVERSITY</div><div class="campus">Bambang Campus<br>Bambang, Nueva Vizcaya</div></div><div class="appendix">Appendix ${appendix}</div></div>
<h1 class="receipt-title ${isICS ? 'ics-title' : ''}">${esc(receiptTitle)}</h1>
<div class="meta"><div><strong>Responsibility Center:</strong> ${esc(responsibilityCenter)}</div><div><strong>RPT NO:</strong> ${esc(details.rptNumber)}</div></div>
<table class="items"><colgroup><col style="width:6%"><col style="width:7%"><col style="width:34%"><col style="width:16%"><col style="width:12%"><col style="width:12%"><col style="width:13%"></colgroup>
<thead><tr><th>Qty</th><th>Unit</th><th>Article and Description</th><th>Property<br>Number</th><th>Date<br>Acquired</th><th>Unit<br>Value</th><th>Total<br>Value</th></tr></thead>
<tbody>${rows}<tr class="total"><td colspan="5"></td><td class="number">Total</td><td class="number">${amount(total)}</td></tr></tbody></table>
<div class="nothing">NOTHING FOLLOWS</div>
<div class="remarks"><strong>Remarks:</strong> ${esc(data.notes || '')}</div>
<div class="bottom-block">
<div class="page-number">Page 1 of 1</div>
<div class="classification"><div class="classification-title">ACKNOWLEDGEMENT CLASSIFICATION</div><div class="classification-list">${classifications}</div></div>
<div class="signatures">
<div class="sign-block"><div class="sign-heading">Received by:</div><div class="sign-name">${esc(details.receivedBy.name)}</div><div class="sign-designation">${esc(details.receivedBy.title)}</div><div class="sign-date">${esc(signatureDate(details.receivedBy.date))}</div></div>
<div class="sign-block"><div class="sign-heading">Issued by:</div><div class="sign-name">${esc(details.issuedBy.name)}</div><div class="sign-designation">${esc(details.issuedBy.title)}</div><div class="sign-date">${esc(signatureDate(details.issuedBy.date))}</div></div>
</div></div></div>
<script>window.onload=function(){const logo=document.querySelector('.logo');if(logo&&!logo.complete){logo.onload=function(){window.print()};logo.onerror=function(){window.print()}}else{window.print()}}<\/script>
</body></html>`)
      printWindow.document.close()
    },

    getResultLabel(transfer) {
      if (
        transfer.resulting_status === 'Returned' &&
        transfer.condition_after_transfer === 'Unserviceable'
      ) {
        return 'Returned and Unserviceable'
      }

      return transfer.resulting_status || '-'
    },

    getResultClass(transfer) {
      if (transfer.resulting_status === 'Available') return 'bg-success'
      if (transfer.resulting_status === 'Issued') return 'bg-warning text-dark'
      if (transfer.resulting_status === 'Returned') return 'bg-danger'

      return 'bg-secondary'
    }
  }
}
</script>

<style scoped>
.personnel-search {
  position: relative;
}

.personnel-options {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 1060;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background: #fff;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, .12);
}

.personnel-options button {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 0;
  background: #fff;
  color: #212529;
  text-align: left;
}

.personnel-options button:hover,
.personnel-options button:focus {
  background: #f1f5f2;
}

.personnel-empty {
  padding: 0.5rem 0.75rem;
  color: #6c757d;
}

.page-link {
  color: #856404;
}

.page-item.active .page-link {
  background-color: var(--app-gold);
  border-color: var(--app-gold);
  color: var(--app-forest);
}

@media (max-width: 576px) {
  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: .5rem auto;
  }
}
</style>
