
<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Returns</h2>
        <p class="text-muted">Manage returned properties</p>
      </div>

      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          class="btn btn-outline-success d-flex align-items-center gap-2"
          @click="openReturnRequestsModal"
        >
          <i class="bi bi-inbox me-1"></i>
          Return Requests
        </button>

        <button class="btn btn-warning" @click="openAddModal">
          <i class="bi bi-arrow-return-left me-1"></i>
          Return a Property
        </button>
      </div>
    </div>

    <!-- Return Requests Modal -->
    <div
      class="modal fade"
      id="returnRequestsModal"
      tabindex="-1"
      aria-labelledby="returnRequestsModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-scrollable return-requests-modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h5 id="returnRequestsModalLabel" class="modal-title">Return Requests</h5>
              <p class="text-muted small mb-0">Review and accept property return requests.</p>
            </div>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <ReturnRequestsPanel @changed="getReturns" />
          </div>
        </div>
      </div>
    </div>

    <div class="mt-5 pt-4 border-top mb-3">
      <h3 id="recorded-returns-heading" class="h5 mb-1">Recorded Returns</h3>
      <p class="text-muted mb-0">
        Review returns that have already been recorded, separately from requests awaiting review.
      </p>
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
              placeholder="Search item, returned by, office..."
            >
          </div>

          <div class="col-md-3">
            <label class="form-label">Condition</label>
            <select class="form-select" v-model="conditionFilter">
              <option value="">All Conditions</option>
              <option value="Serviceable">Serviceable</option>
              <option value="Unserviceable">Unserviceable</option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label">Office</label>
            <select class="form-select" v-model="officeFilter">
              <option value="">All Offices</option>
              <option
                v-for="office in offices"
                :key="office.id"
                :value="office.office_name"
              >
                {{ office.office_name }}
              </option>
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
                <th class="sortable" @click="sortBy('item')">
                  Property
                  <i :class="getSortIcon('item')"></i>
                </th>

                <th class="sortable" @click="sortBy('returned_by')">
                  Returned By
                  <i :class="getSortIcon('returned_by')"></i>
                </th>

                <th class="sortable" @click="sortBy('office')">
                  Office
                  <i :class="getSortIcon('office')"></i>
                </th>

                <th class="sortable" @click="sortBy('return_date')">
                  Return Date
                  <i :class="getSortIcon('return_date')"></i>
                </th>

                <th class="sortable" @click="sortBy('condition')">
                  Condition
                  <i :class="getSortIcon('condition')"></i>
                </th>

                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="itemReturn in paginatedReturns" :key="itemReturn.id">
                <td>{{ itemReturn.items?.description || 'Original property record deleted' }}</td>

                <td>
                  {{
                    itemReturn.personnel?.full_name ||
                    itemReturn.users?.full_name ||
                    '-'
                  }}
                </td>

                <td>{{ itemReturn.offices?.office_name || '-' }}</td>

                <td>{{ itemReturn.return_date || '-' }}</td>

                <td>
                  <span
                    class="badge"
                    :class="
                      itemReturn.condition_after_return === 'Serviceable'
                        ? 'bg-success'
                        : 'bg-danger'
                    "
                  >
                    {{ itemReturn.condition_after_return || '-' }}
                  </span>
                </td>

                <td>{{ itemReturn.return_reason || '-' }}</td>

                <td>
                  <button
                    class="btn btn-sm btn-outline-primary"
                    @click="viewReturnDetails(itemReturn)"
                    title="View details"
                  >
                    <i class="bi bi-eye me-1"></i>
                    Details
                  </button>
                </td>
              </tr>

              <tr v-if="paginatedReturns.length === 0">
                <td colspan="7" class="text-center text-muted py-4">
                  No returns found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredReturns.length > 0"
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
            Showing {{ firstReturnNumber }} to {{ lastReturnNumber }}
            of {{ filteredReturns.length }} returns
          </div>

          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button
                  class="page-link"
                  @click="previousPage"
                  :disabled="currentPage === 1"
                >
                  Previous
                </button>
              </li>

              <li
                v-for="page in totalPages"
                :key="page"
                class="page-item"
                :class="{ active: currentPage === page }"
              >
                <button class="page-link" @click="goToPage(page)">
                  {{ page }}
                </button>
              </li>

              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button
                  class="page-link"
                  @click="nextPage"
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

    <!-- Add / Edit Return Modal -->
    <div class="modal fade" id="returnModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editing ? 'Edit Return' : 'Return a Property' }}
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <form @submit.prevent="saveReturn">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">
                  Issued Receipt <span class="text-danger">*</span>
                </label>

                <select
                  v-if="!editing"
                  class="form-select"
                  v-model="form.property_receipt_id"
                  required
                >
                  <option value="">Select an issued receipt</option>

                  <option
                    v-for="receipt in eligibleReceipts"
                    :key="receipt.id"
                    :value="String(receipt.id)"
                  >
                    {{ receipt.receipt_number }} — {{ receipt.items?.description || 'Item' }}
                    ({{ receipt.quantity }})
                  </option>
                </select>

                <div v-else class="form-control-plaintext">
                  {{ selectedReceipt?.receipt_number || 'Receipt details unavailable' }}
                </div>

                <div
                  v-if="!editing && eligibleReceipts.length === 0"
                  class="form-text text-warning"
                >
                  No unreturned issued receipts are available.
                </div>
              </div>

              <div v-if="selectedReceipt" class="alert alert-light border">
                <strong>{{ selectedReceipt.items?.description || 'Item' }}</strong>
                <div>Property No.: {{ selectedReceipt.items?.property_number || '-' }}</div>
                <div>Issued quantity to restore: {{ selectedReceipt.quantity }}</div>
                <div>Current condition: {{ selectedReceipt.items?.condition || '-' }}</div>
                <div>Current status: {{ selectedReceipt.items?.status || '-' }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Returned By <span class="text-danger">*</span>
                </label>

                <SearchableSelect
                  v-model="form.returned_by"
                  :options="personnelOptions"
                  placeholder="Search returned by"
                  @update:model-value="handleReturnedByChange"
                />

                <div class="form-text">
                  Automatically filled based on the selected receipt. You can still change it.
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Office <span class="text-danger">*</span>
                </label>

                <select class="form-select" v-model="form.office_id">
                  <option value="">Select Office</option>

                  <option
                    v-for="office in offices"
                    :key="office.id"
                    :value="String(office.id)"
                  >
                    {{ office.office_name }}
                  </option>
                </select>

                <div class="form-text">
                  Automatically filled based on the selected employee. You can still change it.
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Return Date <span class="text-danger">*</span>
                </label>

                <input
                  type="date"
                  class="form-control"
                  v-model="form.return_date"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Condition After Return <span class="text-danger">*</span>
                </label>

                <div class="form-control-plaintext">
                  <span class="badge bg-danger">Unserviceable</span>
                  <div class="form-text">
                    Returned properties are automatically recorded as Unserviceable.
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Return Reason <span class="text-danger">*</span>
                </label>

                <select
                  class="form-select"
                  v-model="form.return_reason"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="End of Contract">End of Contract</option>
                  <option value="Transfer of Agency">Transfer of Agency</option>
                  <option value="Resignation">Resignation</option>
                  <option value="Change of Designation">Change of Designation</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Others">Others</option>
                </select>

                <input
                  v-if="form.return_reason === 'Others'"
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
                <i v-if="!saving" class="bi bi-check-lg me-1"></i>
                {{ saving ? 'Saving...' : 'Save Return' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Return Details Modal -->
    <div
      class="modal fade"
      id="returnDetailsModal"
      tabindex="-1"
      aria-labelledby="returnDetailsModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="returnDetailsModalLabel" class="modal-title">
              Returned Property Details
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>

          <div v-if="selectedReturn" class="modal-body">
            <dl class="row mb-0">
              <dt class="col-sm-4">Property Number</dt>
              <dd class="col-sm-8">{{ selectedReturn.items?.property_number || 'Unavailable — original property record was deleted' }}</dd>

              <dt class="col-sm-4">Description</dt>
              <dd class="col-sm-8">{{ selectedReturn.items?.description || 'Original property record deleted; return history is retained.' }}</dd>

              <dt class="col-sm-4">Serial Number</dt>
              <dd class="col-sm-8">{{ selectedReturn.items?.serial_number || 'Unavailable — original property record was deleted' }}</dd>

              <dt class="col-sm-4">Returned Receipt</dt>
              <dd class="col-sm-8">
                {{ selectedReturn.property_receipts?.receipt_number || '-' }}
              </dd>

              <dt class="col-sm-4">Reissued Receipt</dt>
              <dd class="col-sm-8">
                {{ selectedReturn.reissued_receipt?.receipt_number || 'Not reissued' }}
              </dd>

              <dt class="col-sm-4">Quantity Restored to Stock</dt>
              <dd class="col-sm-8">
                {{ selectedReturn.property_receipts?.quantity ?? '-' }}
              </dd>

              <dt class="col-sm-4">Inventory Status</dt>
              <dd class="col-sm-8">
                <span class="badge bg-info text-dark">
                  {{ selectedReturn.items?.status || 'Original property record deleted' }}
                </span>
              </dd>

              <dt class="col-sm-4">Condition After Return</dt>
              <dd class="col-sm-8">
                <span
                  class="badge"
                  :class="
                    selectedReturn.condition_after_return === 'Serviceable'
                      ? 'bg-success'
                      : 'bg-danger'
                  "
                >
                  {{ selectedReturn.condition_after_return || '-' }}
                </span>
              </dd>

              <dt class="col-sm-4">Returned By</dt>
              <dd class="col-sm-8">
                {{ selectedReturn.personnel?.full_name || selectedReturn.users?.full_name || '-' }}
              </dd>

              <dt class="col-sm-4">Office</dt>
              <dd class="col-sm-8">
                {{ selectedReturn.offices?.office_name || '-' }}
              </dd>

              <dt class="col-sm-4">Return Date</dt>
              <dd class="col-sm-8">{{ selectedReturn.return_date || '-' }}</dd>

              <dt class="col-sm-4">Properties For</dt>
              <dd class="col-sm-8">{{ selectedReturn.return_purpose || '-' }}</dd>

              <dt class="col-sm-4">Reason</dt>
              <dd class="col-sm-8">{{ selectedReturn.return_reason || '-' }}</dd>

              <dt class="col-sm-4">Remarks</dt>
              <dd class="col-sm-8">{{ selectedReturn.remarks || '-' }}</dd>
            </dl>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Close
            </button>

            <div v-if="selectedReturn && !selectedReturn.reissued_receipt_id && selectedReturn.return_purpose !== 'Disposal'" class="small text-muted">
              To issue this returned property again, open Acquisitions and Issuance and select Reissuance.
            </div>
            <span v-else-if="selectedReturn && selectedReturn.reissued_receipt_id" class="badge bg-success">
              Reissued — {{ selectedReturn.reissued_receipt?.receipt_number || 'New receipt created' }}
            </span>
            <button type="button" class="btn btn-outline-success" @click="openReturnedAcknowledgementModal">
              <i class="bi bi-printer me-1"></i>Print Acknowledgement for Returned Property
            </button>
            <button type="button" class="btn btn-outline-primary" @click="printReturnedPropertyReceipt">
              <i class="bi bi-printer me-1"></i>Print PAR / ICS - Returned
            </button>
            <button
              type="button"
              class="btn btn-outline-warning"
              @click="editSelectedReturn"
            >
              <i class="bi bi-pencil me-1"></i>Edit
            </button>

            <button
              type="button"
              class="btn btn-outline-danger"
              :disabled="deletingReturnId === selectedReturn?.id"
              @click="deleteSelectedReturn"
            >
              <i class="bi bi-trash me-1"></i>
              {{ deletingReturnId === selectedReturn?.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="returnedAcknowledgementInputModal" tabindex="-1" aria-labelledby="returnedAcknowledgementInputModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered return-ack-modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="returnedAcknowledgementInputModalLabel">Acknowledgement Receipt Signatories</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small mb-4">Enter the signatory details that will appear on the returned property acknowledgement form. Search for a personnel name to automatically fill in the designation, or type both details manually.</p>

            <div class="row g-4">
              <div class="col-12 col-md-6">
                <h6 class="mb-3">Returned By</h6>
                <div class="mb-3">
                  <label class="form-label">Name</label>
                  <div class="position-relative">
                    <input
                      type="text"
                      class="form-control"
                      v-model.trim="returnedAcknowledgementSignatory.printedName"
                      placeholder="Search or enter returned person's name"
                      autocomplete="off"
                      @focus="returnedAcknowledgementSignatoryOptions.returnedBy = true"
                      @input="updateReturnedAcknowledgementSearch('returnedBy')"
                      @blur="closeReturnedAcknowledgementOptions('returnedBy')"
                    >
                    <div v-if="returnedAcknowledgementSignatoryOptions.returnedBy" class="list-group position-absolute w-100 shadow" style="max-height:220px;overflow-y:auto;z-index:1060">
                      <button
                        v-for="person in filteredReturnedAcknowledgementPersonnel('returnedBy')"
                        :key="person.id"
                        type="button"
                        class="list-group-item list-group-item-action"
                        @mousedown.prevent="selectReturnedAcknowledgementPerson('returnedBy', person)"
                      >
                        <div class="fw-semibold">{{ person.full_name }}</div>
                        <small class="text-muted">{{ person.job_title || person.designation || 'No designation listed' }}</small>
                      </button>
                      <div v-if="filteredReturnedAcknowledgementPersonnel('returnedBy').length === 0" class="list-group-item text-muted">No personnel found. You can enter a name manually.</div>
                    </div>
                  </div>
                  <div class="form-text">Search by name or designation, or enter a name manually.</div>
                </div>
                <div class="mb-2">
                  <label class="form-label">Returned By Designation</label>
                  <input type="text" class="form-control" v-model.trim="returnedAcknowledgementSignatory.designation" placeholder="Automatically filled; editable">
                  <div class="form-text">Automatically filled when you select a person. You can edit it.</div>
                </div>
              </div>

              <div class="col-12 col-md-6">
                <h6 class="mb-3">Received By</h6>
                <div class="mb-3">
                  <label class="form-label">Name</label>
                  <div class="position-relative">
                    <input
                      type="text"
                      class="form-control"
                      v-model.trim="returnedAcknowledgementSignatory.receivedByName"
                      placeholder="Search or enter receiving person's name"
                      autocomplete="off"
                      @focus="returnedAcknowledgementSignatoryOptions.receivedBy = true"
                      @input="updateReturnedAcknowledgementSearch('receivedBy')"
                      @blur="closeReturnedAcknowledgementOptions('receivedBy')"
                    >
                    <div v-if="returnedAcknowledgementSignatoryOptions.receivedBy" class="list-group position-absolute w-100 shadow" style="max-height:220px;overflow-y:auto;z-index:1060">
                      <button
                        v-for="person in filteredReturnedAcknowledgementPersonnel('receivedBy')"
                        :key="person.id"
                        type="button"
                        class="list-group-item list-group-item-action"
                        @mousedown.prevent="selectReturnedAcknowledgementPerson('receivedBy', person)"
                      >
                        <div class="fw-semibold">{{ person.full_name }}</div>
                        <small class="text-muted">{{ person.job_title || person.designation || 'No designation listed' }}</small>
                      </button>
                      <div v-if="filteredReturnedAcknowledgementPersonnel('receivedBy').length === 0" class="list-group-item text-muted">No personnel found. You can enter a name manually.</div>
                    </div>
                  </div>
                  <div class="form-text">Search by name or designation, or enter a name manually.</div>
                </div>
                <div class="mb-2">
                  <label class="form-label">Received By Designation</label>
                  <input type="text" class="form-control" v-model.trim="returnedAcknowledgementSignatory.receivedByDesignation" placeholder="Automatically filled; editable">
                  <div class="form-text">Automatically filled when you select a person. You can edit it.</div>
                </div>
              </div>
            </div>

            <hr class="my-4">
            <div class="row g-3">
              <div class="col-12 col-md-4">
                <label class="form-label">Date</label>
                <input type="date" class="form-control" v-model="returnedAcknowledgementSignatory.date">
              </div>
              <div class="col-12 col-md-5">
                <label class="form-label">Responsibility Center</label>
                <input class="form-control" v-model.trim="returnedReceiptSignatories.responsibilityCenter" placeholder="Defaults to the property record">
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label">Paper Size</label>
                <select class="form-select" v-model="returnedReceiptPaperSize">
                  <option value="a4">A4</option>
                  <option value="short">Short / Letter</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="confirmPrintAcknowledgementForReturnedProperty">
              <i class="bi bi-printer me-1"></i>Print Acknowledgement
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="returnedReceiptPaperModal" tabindex="-1" aria-labelledby="returnedReceiptPaperModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="returnedReceiptPaperModalLabel">Print PAR / ICS - Returned</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Paper Size</label>
              <select class="form-select" v-model="returnedReceiptPaperSize">
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="short">Short / Letter (8.5 × 11 inches)</option>
                <option value="long">Long (8.5 × 13 inches)</option>
              </select>
            </div>
            <hr>
            <h6>Received by</h6>
            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label">Printed Name</label>
                <div class="position-relative">
                  <input
                    class="form-control"
                    v-model.trim="returnedReceiptSignatories.receivedByName"
                    placeholder="Search or enter receiving property officer"
                    autocomplete="off"
                    @focus="returnedReceiptSignatoryOptions.receivedBy = true"
                    @input="updateReturnedReceiptSignatorySearch('receivedBy')"
                    @blur="closeReturnedReceiptSignatoryOptions('receivedBy')"
                  >
                  <div v-if="returnedReceiptSignatoryOptions.receivedBy" class="list-group position-absolute w-100 shadow" style="max-height:200px;overflow-y:auto;z-index:1060">
                    <button v-for="person in filteredReturnedReceiptPersonnel('receivedBy')" :key="person.id" type="button" class="list-group-item list-group-item-action" @mousedown.prevent="selectReturnedReceiptPerson('receivedBy', person)">
                      <div>{{ person.full_name }}</div>
                      <small class="text-muted">{{ person.job_title || person.designation || '' }}</small>
                    </button>
                    <div v-if="filteredReturnedReceiptPersonnel('receivedBy').length === 0" class="list-group-item text-muted">No personnel found. You can enter a name manually.</div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Designation</label>
                <input class="form-control" v-model.trim="returnedReceiptSignatories.receivedByTitle" placeholder="Enter designation">
              </div>
            </div>
            <h6>Issued by</h6>
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Printed Name</label>
                <div class="position-relative">
                  <input
                    class="form-control"
                    v-model.trim="returnedReceiptSignatories.issuedByName"
                    placeholder="Search or enter issuing person's name"
                    autocomplete="off"
                    @focus="returnedReceiptSignatoryOptions.issuedBy = true"
                    @input="updateReturnedReceiptSignatorySearch('issuedBy')"
                    @blur="closeReturnedReceiptSignatoryOptions('issuedBy')"
                  >
                  <div v-if="returnedReceiptSignatoryOptions.issuedBy" class="list-group position-absolute w-100 shadow" style="max-height:200px;overflow-y:auto;z-index:1060">
                    <button v-for="person in filteredReturnedReceiptPersonnel('issuedBy')" :key="person.id" type="button" class="list-group-item list-group-item-action" @mousedown.prevent="selectReturnedReceiptPerson('issuedBy', person)">
                      <div>{{ person.full_name }}</div>
                      <small class="text-muted">{{ person.job_title || person.designation || '' }}</small>
                    </button>
                    <div v-if="filteredReturnedReceiptPersonnel('issuedBy').length === 0" class="list-group-item text-muted">No personnel found. You can enter a name manually.</div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Designation</label>
                <input class="form-control" v-model.trim="returnedReceiptSignatories.issuedByTitle" placeholder="Enter designation">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="confirmPrintReturnedPropertyReceipt">
              <i class="bi bi-printer me-1"></i>Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import SearchableSelect from '@/components/SearchableSelect.vue'
import ReturnRequestsPanel from '@/components/ReturnRequestsPanel.vue'

export default {
  name: 'Returns',

  components: {
    ReturnRequestsPanel,
    SearchableSelect
  },

  data() {
    return {
      returns: [],
      receipts: [],
      personnel: [],
      offices: [],
      selectedReturn: null,
      signatorySections: ['returnedBy', 'receivedBy', 'actionTaken'],
      returnAckDetails: {
        returnedBy: { name: '', title: '', date: '' },
        receivedBy: { name: '', title: '', date: '' },
        actionTaken: { name: '', title: '', date: '' }
      },
      returnAckSearch: { returnedBy: '', receivedBy: '', actionTaken: '' },
      returnAckOptions: { returnedBy: false, receivedBy: false, actionTaken: false },

      search: '',
      conditionFilter: '',
      officeFilter: '',

      currentPage: 1,
      itemsPerPage: 10,

      sortColumn: 'return_date',
      sortDirection: 'desc',

      editing: false,
      saving: false,
      deletingReturnId: null,
      returnedReceiptPaperSize: 'a4',
      returnedAcknowledgementSignatory: {
        printedName: '',
        receivedByName: '',
        receivedByDesignation: '',
        designation: '',
        date: ''
      },
      returnedAcknowledgementSignatoryOptions: {
        returnedBy: false,
        receivedBy: false
      },
      returnedReceiptSignatories: {
        responsibilityCenter: '',
        receivedByName: '',
        receivedByTitle: '',
        issuedByName: '',
        issuedByTitle: ''
      },
      returnedReceiptSignatoryOptions: {
        receivedBy: false,
        issuedBy: false
      },

      form: {
        id: null,
        property_receipt_id: '',
        returned_by: '',
        office_id: '',
        return_date: '',
        condition_after_return: 'Unserviceable',
        return_reason: '',
        otherReason: '',
        remarks: ''
      }
    }
  },

  computed: {
    personnelOptions() {
      return this.personnel.map(person => ({
        value: String(person.id),
        label: person.full_name
          ? `${person.full_name}${person.job_title ? ` — ${person.job_title}` : ''}`
          : 'Unknown employee'
      }))
    },

    selectedReceipt() {
      return this.receipts.find(
        receipt => String(receipt.id) === String(this.form.property_receipt_id)
      ) || null
    },

    eligibleReceipts() {
      const returnedReceiptIds = new Set(
        this.returns.map(itemReturn => String(itemReturn.property_receipt_id))
      )

      const itemsWithUnlinkedReturns = new Set(
        this.returns
          .filter(itemReturn => !itemReturn.property_receipt_id)
          .map(itemReturn => String(itemReturn.item_id))
      )

      return this.receipts.filter(receipt =>
        receipt.status === 'Issued' &&
        !returnedReceiptIds.has(String(receipt.id)) &&
        !itemsWithUnlinkedReturns.has(String(receipt.item_id))
      )
    },

    filteredReturns() {
      const searchText = this.search.toLowerCase().trim()

      const filtered = this.returns.filter(itemReturn => {
        const itemName = String(itemReturn.items?.description || '').toLowerCase()

        const returnedBy = String(
          itemReturn.personnel?.full_name ||
          itemReturn.users?.full_name ||
          ''
        ).toLowerCase()

        const officeName = String(itemReturn.offices?.office_name || '').toLowerCase()
        const returnReason = String(itemReturn.return_reason || '').toLowerCase()
        const condition = String(itemReturn.condition_after_return || '').toLowerCase()

        const matchesSearch =
          !searchText ||
          itemName.includes(searchText) ||
          returnedBy.includes(searchText) ||
          officeName.includes(searchText) ||
          returnReason.includes(searchText) ||
          condition.includes(searchText)

        const matchesCondition =
          !this.conditionFilter ||
          itemReturn.condition_after_return === this.conditionFilter

        const matchesOffice =
          !this.officeFilter ||
          itemReturn.offices?.office_name === this.officeFilter

        return matchesSearch && matchesCondition && matchesOffice
      })

      return filtered.sort((a, b) => {
        const firstValue = this.getSortValue(a, this.sortColumn)
        const secondValue = this.getSortValue(b, this.sortColumn)

        if (firstValue < secondValue) {
          return this.sortDirection === 'asc' ? -1 : 1
        }

        if (firstValue > secondValue) {
          return this.sortDirection === 'asc' ? 1 : -1
        }

        return 0
      })
    },

    totalPages() {
      return Math.max(1, Math.ceil(this.filteredReturns.length / this.itemsPerPage))
    },

    paginatedReturns() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      return this.filteredReturns.slice(start, start + this.itemsPerPage)
    },

    firstReturnNumber() {
      if (this.filteredReturns.length === 0) return 0
      return (this.currentPage - 1) * this.itemsPerPage + 1
    },

    lastReturnNumber() {
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredReturns.length
      )
    }
  },

  watch: {
    search() {
      this.currentPage = 1
    },

    conditionFilter() {
      this.currentPage = 1
    },

    officeFilter() {
      this.currentPage = 1
    },

    itemsPerPage() {
      this.currentPage = 1
    },

    totalPages(newTotalPages) {
      if (this.currentPage > newTotalPages) {
        this.currentPage = newTotalPages
      }
    },

    personnel() {
      this.populateReturnRecipient()
    },

    'form.property_receipt_id'() {
      if (!this.editing) {
        this.populateReturnRecipient()
      }
    }
  },

  mounted() {
    this.getReturns()
    this.getReceipts()
    this.getPersonnel()
    this.getOffices()
  },

  methods: {
    // Automatically fill Returned By and Office from the selected receipt
    populateReturnRecipient() {
      const receipt = this.selectedReceipt

      if (!receipt) {
        this.form.returned_by = ''
        this.form.office_id = ''
        return
      }

      // Possible employee/user ID fields from the receipt response
      const assignedUserId =
        receipt.issued_to ||
        receipt.user_id ||
        receipt.personnel_id ||
        receipt.users?.id ||
        receipt.personnel?.id ||
        receipt.users?.personnel_id ||
        receipt.users?.personnel?.id

      if (!assignedUserId) {
        this.form.returned_by = ''
        this.form.office_id = ''
        return
      }

      // Match the receipt's assigned user with the personnel list
      const matchingPerson = this.personnel.find(person =>
        String(person.id) === String(assignedUserId) ||
        String(person.user_id) === String(assignedUserId)
      )

      if (matchingPerson) {
        // Use the personnel ID because SearchableSelect uses personnel IDs
        this.form.returned_by = String(matchingPerson.id)

        const officeId =
          matchingPerson.office_id ||
          receipt.office_id ||
          receipt.users?.office_id ||
          receipt.personnel?.office_id

        this.form.office_id = officeId ? String(officeId) : ''
      } else {
        // Keep the office if it is available from the receipt's user relation
        this.form.returned_by = ''

        const officeId =
          receipt.office_id ||
          receipt.users?.office_id ||
          receipt.personnel?.office_id

        this.form.office_id = officeId ? String(officeId) : ''
      }
    },

    getSortValue(itemReturn, column) {
      if (column === 'item') {
        return String(itemReturn.items?.description || '').toLowerCase()
      }

      if (column === 'returned_by') {
        return String(
          itemReturn.personnel?.full_name ||
          itemReturn.users?.full_name ||
          ''
        ).toLowerCase()
      }

      if (column === 'office') {
        return String(itemReturn.offices?.office_name || '').toLowerCase()
      }

      if (column === 'return_date') {
        return String(itemReturn.return_date || '').toLowerCase()
      }

      if (column === 'condition') {
        return String(itemReturn.condition_after_return || '').toLowerCase()
      }

      return ''
    },

    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection =
          this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }
    },

    getSortIcon(column) {
      if (this.sortColumn !== column) {
        return 'bi bi-arrow-down-up text-muted ms-1'
      }

      return this.sortDirection === 'asc'
        ? 'bi bi-arrow-up ms-1'
        : 'bi bi-arrow-down ms-1'
    },

    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
      }
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },

    async getReturns() {
      try {
        const response = await fetch('/api/returns')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load returns')
        }

        this.returns = Array.isArray(data) ? data : []
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getReceipts() {
      try {
        const response = await fetch('/api/receipts')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load issued receipts')
        }

        this.receipts = Array.isArray(data) ? data : []

        // Recheck the selected receipt after loading
        this.populateReturnRecipient()
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )
      }
    },

    async getPersonnel() {
      try {
        const response = await fetch('/api/personnel')
        const data = await response.json()

        if (response.ok) {
          this.personnel = Array.isArray(data) ? data : []
        }
      } catch (error) {
        console.log(error)
      }
    },

    async getOffices() {
      try {
        const response = await fetch('/api/offices')
        const data = await response.json()

        if (response.ok) {
          this.offices = Array.isArray(data) ? data : []
        }
      } catch (error) {
        console.log(error)
      }
    },

    normalizeReturnReason(reason) {
      const trimmed = String(reason || '').trim()

      if (!trimmed) {
        return { type: '', detail: '' }
      }

      if (trimmed.startsWith('Others:')) {
        return {
          type: 'Others',
          detail: trimmed.replace(/^Others:\s*/i, '').trim()
        }
      }

      return { type: trimmed, detail: '' }
    },

    handleReturnedByChange(value) {
      this.form.returned_by = value

      const selectedPerson = this.personnel.find(
        person => String(person.id) === String(value)
      )

      if (selectedPerson && selectedPerson.office_id) {
        this.form.office_id = String(selectedPerson.office_id)
      }
    },

    openReturnRequestsModal() {
      const modalElement = document.getElementById('returnRequestsModal')
      Modal.getOrCreateInstance(modalElement).show()
    },

    openAddModal() {
      this.editing = false

      this.form = {
        id: null,
        property_receipt_id: '',
        returned_by: '',
        office_id: '',
        return_date: new Date().toISOString().split('T')[0],
        condition_after_return: 'Unserviceable',
        return_reason: '',
        otherReason: '',
        remarks: ''
      }

      const modalElement = document.getElementById('returnModal')
      const modal = Modal.getOrCreateInstance(modalElement)

      modal.show()
    },

    editReturn(itemReturn) {
      this.editing = true

      const { type, detail } = this.normalizeReturnReason(itemReturn.return_reason)

      this.form = {
        id: itemReturn.id,
        property_receipt_id: itemReturn.property_receipt_id
          ? String(itemReturn.property_receipt_id)
          : '',
        returned_by: itemReturn.returned_by
          ? String(itemReturn.returned_by)
          : '',
        office_id: itemReturn.office_id
          ? String(itemReturn.office_id)
          : '',
        return_date: itemReturn.return_date || '',
        condition_after_return: itemReturn.condition_after_return,
        return_reason: type || '',
        otherReason: detail,
        remarks: itemReturn.remarks || ''
      }

      const modalElement = document.getElementById('returnModal')
      const modal = Modal.getOrCreateInstance(modalElement)

      modal.show()
    },

    viewReturnDetails(itemReturn) {
      this.selectedReturn = itemReturn
      const returnedName = itemReturn.personnel?.full_name || itemReturn.users?.full_name || ''
      const returnedPerson = this.personnel.find(person => person.full_name === returnedName)
      const returnDate = String(itemReturn.return_date || '').slice(0, 10)
      this.returnAckDetails = {
        returnedBy: { name: returnedName, title: returnedPerson?.job_title || '', date: returnDate },
        receivedBy: { name: '', title: '', date: '' },
        actionTaken: { name: '', title: '', date: '' }
      }
      this.returnAckSearch = { returnedBy: returnedName, receivedBy: '', actionTaken: '' }
      this.returnAckOptions = { returnedBy: false, receivedBy: false, actionTaken: false }

      Modal.getOrCreateInstance(
        document.getElementById('returnDetailsModal')
      ).show()
    },

    filteredReturnAckPersonnel(section) {
      const query = String(this.returnAckDetails[section]?.name || '').toLowerCase().trim()
      if (!query) return this.personnel.slice(0, 10)
      return this.personnel.filter(person =>
        String(person.full_name || '').toLowerCase().includes(query) ||
        String(person.job_title || '').toLowerCase().includes(query)
      ).slice(0, 10)
    },

    selectReturnAckPerson(section, person) {
      this.returnAckDetails[section].name = person.full_name || ''
      this.returnAckDetails[section].title = person.job_title || ''
      this.returnAckSearch[section] = person.full_name || ''
      this.returnAckOptions[section] = false
    },

    updateReturnAckSearch(section) {
      const typedName = this.returnAckDetails[section].name || ''
      this.returnAckSearch[section] = typedName
      const match = this.personnel.find(person =>
        String(person.full_name || '').toLowerCase() === String(typedName).toLowerCase()
      )
      if (match) this.returnAckDetails[section].title = match.job_title || ''
      this.returnAckOptions[section] = true
    },

    closeReturnAckOptions(section) {
      setTimeout(() => {
        this.returnAckOptions[section] = false
      }, 150)
    },

    filteredReturnedReceiptPersonnel(section) {
      const query = String(this.returnedReceiptSignatories[section === 'receivedBy' ? 'receivedByName' : 'issuedByName'] || '').toLowerCase().trim()
      if (!query) return this.personnel.slice(0, 10)
      return this.personnel.filter(person =>
        String(person.full_name || '').toLowerCase().includes(query) ||
        String(person.job_title || person.designation || '').toLowerCase().includes(query)
      ).slice(0, 10)
    },

    selectReturnedReceiptPerson(section, person) {
      if (section === 'receivedBy') {
        this.returnedReceiptSignatories.receivedByName = person.full_name || ''
        this.returnedReceiptSignatories.receivedByTitle = person.job_title || person.designation || ''
      } else {
        this.returnedReceiptSignatories.issuedByName = person.full_name || ''
        this.returnedReceiptSignatories.issuedByTitle = person.job_title || person.designation || ''
      }
      this.returnedReceiptSignatoryOptions[section] = false
    },

    updateReturnedReceiptSignatorySearch(section) {
      const nameKey = section === 'receivedBy' ? 'receivedByName' : 'issuedByName'
      const titleKey = section === 'receivedBy' ? 'receivedByTitle' : 'issuedByTitle'
      const typedName = this.returnedReceiptSignatories[nameKey] || ''
      const match = this.personnel.find(person =>
        String(person.full_name || '').toLowerCase() === typedName.toLowerCase()
      )
      if (match) this.returnedReceiptSignatories[titleKey] = match.job_title || match.designation || ''
      this.returnedReceiptSignatoryOptions[section] = true
    },

    closeReturnedReceiptSignatoryOptions(section) {
      setTimeout(() => {
        this.returnedReceiptSignatoryOptions[section] = false
      }, 150)
    },

    printReturnedPropertyReceipt() {
      const record = this.selectedReturn || {}
      const returnedByPerson = record.personnel || record.users || {}
      this.returnedReceiptSignatories = {
        responsibilityCenter: this.selectedReturn?.items?.responsibility_center || '',
        receivedByName: '',
        receivedByTitle: '',
        issuedByName: returnedByPerson.full_name || '',
        issuedByTitle: returnedByPerson.job_title || returnedByPerson.designation || ''
      }
      Modal.getOrCreateInstance(document.getElementById('returnedReceiptPaperModal')).show()
    },

    confirmPrintReturnedPropertyReceipt() {
      Modal.getOrCreateInstance(document.getElementById('returnedReceiptPaperModal')).hide()

      const record = this.selectedReturn
      if (!record) return

      const item = record.items || {}
      const issuedReceipt = record.property_receipts || {}
      const returnedBy = this.returnedReceiptSignatories.issuedByName || ''
      const designation = this.returnedReceiptSignatories.issuedByTitle || ''
      const receivedBy = this.returnedReceiptSignatories.receivedByName || ''
      const receivedByTitle = this.returnedReceiptSignatories.receivedByTitle || ''
      const quantity = Number(issuedReceipt.quantity || 1)
      const unitValue = Number(item.cost || item.unit_value || 0)
      const isICS = unitValue < 50000
      const receiptTitle = isICS
        ? 'INVENTORY CUSTODIAN SLIP - RETURNED'
        : 'PROPERTY ACKNOWLEDGEMENT RECEIPT - RETURNED'
      const appendix = '71'

      const safe = value => String(value === null || value === undefined || value === '' ? '-' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

      const date = value => {
        if (!value) return '-'
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime())
          ? safe(value)
          : parsed.toLocaleDateString('en-PH', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            })
      }

      const amount = value => Number(value || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })

      const total = unitValue * quantity
      const returnDate = date(record.return_date)
      const description = safe(item.description || 'Original property record deleted')
      const propertyNumber = safe(item.property_number)
      const acquiredDate = date(item.acquisition_date || issuedReceipt.date_issued)
      const responsibilityCenter = safe(
        this.returnedReceiptSignatories.responsibilityCenter || item.responsibility_center || record.offices?.office_name || '-'
      )
      const remarks = safe(record.return_reason || '')
      const logo = new URL('../assets/LOGO.png', import.meta.url).href
      const paperSizes = {
        a4: '210mm 297mm',
        short: '8.5in 11in',
        long: '8.5in 13in'
      }
      const selectedPaperSize = paperSizes[this.returnedReceiptPaperSize] || paperSizes.a4

      const classifications = [
        'NEW',
        'RENEWAL',
        'UPDATING',
        'TRANSFER',
        'CLEARANCE-w/ Retain Accountability',
        'RETURNED Unserviceable',
        'RETURNED Serviceable',
        'RETURNED for Repair'
      ].map(label => {
        const checked = label === 'RETURNED Unserviceable'
        return `<span class="classification-option">${checked ? '☑' : '☐'} ${safe(label)}</span>`
      }).join('')

      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please allow pop-ups to print the returned PAR / ICS.'
        }))
        return
      }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${safe(receiptTitle)}</title>
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
.center{text-align:center}
.number{text-align:right;white-space:nowrap}
.total td{border-top:1px solid #111;border-bottom:1px solid #111;font-weight:bold;padding-top:6px;padding-bottom:6px;font-size:14px}
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
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img class="logo" src="${logo}" alt="NVSU Logo">
    <div>
      <div class="school">NUEVA VIZCAYA STATE UNIVERSITY</div>
      <div class="campus">Bambang Campus<br>Bambang, Nueva Vizcaya</div>
    </div>
    <div class="appendix">Appendix ${appendix}</div>
  </div>
  <h1 class="receipt-title ${isICS ? 'ics-title' : ''}">${safe(receiptTitle)}</h1>
  <div class="meta">
    <div><strong>Responsibility Center:</strong> ${responsibilityCenter}</div>
    <div><strong>RPT NO:</strong> -</div>
  </div>
  <table class="items">
    <colgroup>
      <col style="width:6%"><col style="width:7%"><col style="width:34%">
      <col style="width:16%"><col style="width:12%"><col style="width:12%"><col style="width:13%">
    </colgroup>
    <thead>
      <tr>
        <th>Qty</th><th>Unit</th><th>Article and Description</th>
        <th>Property<br>Number</th><th>Date<br>Acquired</th>
        <th>Unit<br>Value</th><th>Total<br>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">${quantity}</td>
        <td class="center">${safe(item.unit || 'unit')}</td>
        <td class="description">${description}</td>
        <td class="center">${propertyNumber}</td>
        <td class="center">${acquiredDate}</td>
        <td class="number">${amount(unitValue)}</td>
        <td class="number">${amount(total)}</td>
      </tr>
      <tr class="total">
        <td colspan="5"></td><td class="number">Total</td><td class="number">${amount(total)}</td>
      </tr>
    </tbody>
  </table>
  <div class="nothing">NOTHING FOLLOWS</div>
  <div class="remarks"><strong>Remarks:</strong> ${remarks}</div>
  <div class="bottom-block">
    <div class="page-number">Page 1 of 1</div>
    <div class="classification">
      <div class="classification-title">ACKNOWLEDGEMENT CLASSIFICATION</div>
      <div class="classification-list">${classifications}</div>
    </div>
    <div class="signatures">
      <div class="sign-block">
        <div class="sign-heading">Received by:</div>
        <div class="sign-name">${safe(receivedBy)}</div>
        <div class="sign-designation">${safe(receivedByTitle)}</div>
        <div class="sign-date">${safe(returnDate)}</div>
      </div>
      <div class="sign-block">
        <div class="sign-heading">Issued by:</div>
        <div class="sign-name">${safe(returnedBy)}</div>
        <div class="sign-designation">${safe(designation)}</div>
        <div class="sign-date">${safe(returnDate)}</div>
      </div>
    </div>
  </div>
</div>
<script>
window.onload=function(){
  const logo=document.querySelector('.logo')
  if(logo&&!logo.complete){
    logo.onload=function(){window.print()}
    logo.onerror=function(){window.print()}
  }else{
    window.print()
  }
}
<\/script>
</body>
</html>`)
      printWindow.document.close()
    },

    openReturnedAcknowledgementModal() {
      if (!this.selectedReturn) return
      const record = this.selectedReturn
      const returnedBy = record.personnel?.full_name || record.users?.full_name || ''
      this.returnedAcknowledgementSignatory = {
        printedName: returnedBy,
        receivedByName: '',
        receivedByDesignation: '',
        designation: record.personnel?.job_title || record.users?.job_title || record.personnel?.designation || record.users?.designation || '',
        date: record.return_date || new Date().toISOString().slice(0, 10)
      }
      this.returnedAcknowledgementSignatoryOptions = { returnedBy: false, receivedBy: false }
      this.returnedReceiptSignatories.responsibilityCenter =
        record.items?.responsibility_center || ''
      const modalElement = document.getElementById("returnedAcknowledgementInputModal")
      if (modalElement) Modal.getOrCreateInstance(modalElement).show()
    },

    filteredReturnedAcknowledgementPersonnel(section) {
      const nameKey = section === 'returnedBy' ? 'printedName' : 'receivedByName'
      const query = String(this.returnedAcknowledgementSignatory[nameKey] || '').toLowerCase().trim()

      if (!query) return this.personnel.slice(0, 10)

      return this.personnel.filter(person =>
        String(person.full_name || '').toLowerCase().includes(query) ||
        String(person.job_title || person.designation || '').toLowerCase().includes(query)
      ).slice(0, 10)
    },

    selectReturnedAcknowledgementPerson(section, person) {
      if (section === 'returnedBy') {
        this.returnedAcknowledgementSignatory.printedName = person.full_name || ''
        this.returnedAcknowledgementSignatory.designation = person.job_title || person.designation || ''
      } else {
        this.returnedAcknowledgementSignatory.receivedByName = person.full_name || ''
        this.returnedAcknowledgementSignatory.receivedByDesignation = person.job_title || person.designation || ''
      }

      this.returnedAcknowledgementSignatoryOptions[section] = false
    },

    updateReturnedAcknowledgementSearch(section) {
      const nameKey = section === 'returnedBy' ? 'printedName' : 'receivedByName'
      const titleKey = section === 'returnedBy' ? 'designation' : 'receivedByDesignation'
      const typedName = String(this.returnedAcknowledgementSignatory[nameKey] || '').trim()

      const match = this.personnel.find(person =>
        String(person.full_name || '').toLowerCase() === typedName.toLowerCase()
      )

      if (match) {
        this.returnedAcknowledgementSignatory[titleKey] = match.job_title || match.designation || ''
      }

      this.returnedAcknowledgementSignatoryOptions[section] = true
    },

    closeReturnedAcknowledgementOptions(section) {
      setTimeout(() => {
        this.returnedAcknowledgementSignatoryOptions[section] = false
      }, 150)
    },

    confirmPrintAcknowledgementForReturnedProperty() {
      Modal.getOrCreateInstance(document.getElementById("returnedAcknowledgementInputModal")).hide()
      this.printAcknowledgementForReturnedProperty()
    },

    printAcknowledgementForReturnedProperty() {
      const record = this.selectedReturn
      if (!record) return
      const item = record.items || {}
      const returnedBy = this.returnedAcknowledgementSignatory.printedName || ''
      const receivedByName = this.returnedAcknowledgementSignatory.receivedByName || ''
      const receivedByDesignation = this.returnedAcknowledgementSignatory.receivedByDesignation || ''
      const designation = this.returnedAcknowledgementSignatory.designation || ''
      const acknowledgementDate = this.returnedAcknowledgementSignatory.date || ''
      const office = record.offices?.office_name || ''
      const responsibilityCenter = this.returnedReceiptSignatories.responsibilityCenter ||
        item.responsibility_center || ''
      const quantity = Number(record.property_receipts?.quantity || 1)
      const safe = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      const date = value => {
        if (!value) return ''
        const parsed = new Date(value + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? safe(value) : parsed.toLocaleDateString('en-PH')
      }
      const rows = Array.from({ length: 15 }, (_, i) => i === 0
        ? `<tr><td>1</td><td>${quantity}</td><td></td><td class="desc">${safe(item.description || 'Original property record deleted')}</td><td></td><td>${safe(returnedBy)}</td><td>${safe(record.return_reason || '')}</td></tr>`
        : `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')
      const paperSizes = { a4: '210mm 297mm', short: '8.5in 11in', long: '8.5in 13in' }
      const selectedPaperSize = paperSizes[this.returnedReceiptPaperSize] || paperSizes.a4
      const logo = new URL('../assets/LOGO.png', import.meta.url).href
      const win = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!win) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please allow pop-ups to print the returned property receipt.' }))
        return
      }
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Acknowledgement Receipt for Returned Property</title>
<style>
@page{size:${selectedPaperSize} portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#111}body{font-size:9px}
.sheet{width:100%;min-height:0;border:0;padding:4px 6px 5px}
.header{display:grid;grid-template-columns:24mm 1fr;border:1px solid #555;text-align:center;font-weight:bold}.logo-cell{grid-row:span 2;border-right:1px solid #555;height:25mm;display:flex;align-items:center;justify-content:center}.logo{width:19mm;height:19mm;object-fit:contain}.school{font-size:12px;line-height:1.25;padding:2mm}.form-title{font-size:12px;border-top:1px solid #555;padding:2mm}
.arrp{text-align:right;font-size:11px;font-weight:bold;margin:1mm 2mm 4mm}.line{display:inline-block;min-width:48mm;border-bottom:1px solid #222;height:4mm}
.meta{display:grid;grid-template-columns:1.2fr .8fr;border:1px solid #555}.meta div{padding:2mm;border-bottom:1px solid #555;min-height:8mm}.meta div:nth-child(odd){border-right:1px solid #555}.meta .storage-field,.meta .tag-field{display:flex;align-items:baseline;gap:2mm;white-space:nowrap}.meta .responsibility-center-field{grid-column:1 / -1;border-right:0;border-bottom:0}
.items-for{text-align:center;border:1px solid #555;border-top:0;padding:2mm;font-weight:bold;font-size:10px}
table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #555;padding:1mm;text-align:center;vertical-align:middle}th{font-size:8px;line-height:1.1;height:10mm}td{height:7.5mm;font-size:8px}.desc{text-align:left}
.returned-head,.signature-grid{display:grid;grid-template-columns:22% 35% 28% 15%;border:1px solid #555;border-top:0}.returned-head{font-weight:bold}.returned-head div,.signature-grid div{padding:2mm;border-right:1px solid #555;min-height:8mm}.returned-head div{min-height:12mm}.returned-head div:last-child,.signature-grid div:last-child{border-right:0}.signature-grid div:nth-child(2),.signature-grid div:nth-child(3){text-align:center}.name-row div:nth-child(2),.name-row div:nth-child(3),.designation-row div:nth-child(2),.designation-row div:nth-child(3){text-transform:uppercase}
.instructions{margin-top:0;border:1px solid #555;padding:2mm 3mm;font-size:8.5px;line-height:1.25;width:100%}.instructions h3{text-align:center;text-decoration:underline;font-size:10px;margin:1mm 0 2mm}.instructions ol{margin:0;padding-left:7mm}.instructions li{padding:1mm 0}.copy{text-align:center;margin-top:2mm;font-size:9px}.form-code{margin-top:8px;text-align:left;font-size:8.5px;font-weight:bold;line-height:1.25}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{break-inside:avoid}}
</style></head><body><div class="sheet">
<div class="header"><div class="logo-cell"><img class="logo" src="${logo}" alt="NVSU Logo"></div><div class="school">Republic of the Philippines<br>NUEVA VIZCAYA STATE UNIVERSITY<br>Bayombong, Nueva Vizcaya</div><div class="form-title">ACKNOWLEDGEMENT RECEIPT FOR RETURNED PROPERTY</div></div>
<div class="arrp">ARRP No.: <span class="line"></span></div>
<div class="meta"><div><strong>Unit/Division/College:</strong> ${safe(office)}</div><div><strong>Date:</strong> ${date(record.return_date)}</div><div class="storage-field"><strong>Place of Storage:</strong></div><div class="tag-field"><strong>Tag No.:</strong></div><div class="responsibility-center-field"><strong>Responsibility Center:</strong> ${safe(responsibilityCenter || '-')}</div></div>
<div class="items-for">Properties for &nbsp; ____Property Utilization/Re-issuance &nbsp; ____Repair &nbsp; ____Disposal</div>
<table><colgroup><col style="width:6%"><col style="width:8%"><col style="width:8%"><col style="width:35%"><col style="width:12%"><col style="width:16%"><col style="width:15%"></colgroup><thead><tr><th>Property<br>No.</th><th>Qty</th><th>UOM</th><th>DESCRIPTION</th><th>CODE</th><th>ACCOUNTABLE<br>EMPLOYEE</th><th>REMARKS</th></tr></thead><tbody>${rows}</tbody></table>
<div class="returned-head"><div>Returned by:</div><div><em>(Please indicate name and affix signature)</em></div><div>Received by:</div><div>Action Taken<br><small>(To be filled by the Property Officer)</small></div></div>
<div class="signature-grid"><div>Signature:</div><div></div><div></div><div></div></div>
<div class="signature-grid name-row"><div>Printed Name:</div><div><strong>${safe(returnedBy)}</strong></div><div><strong>${safe(receivedByName)}</strong></div><div><strong></strong></div></div>
<div class="signature-grid designation-row"><div>Designation:</div><div>${safe(designation)}</div><div>${safe(receivedByDesignation)}</div><div></div></div>
<div class="signature-grid"><div>Date:</div><div>${date(acknowledgementDate)}</div><div>${date(acknowledgementDate)}</div><div></div></div>
<div class="instructions"><h3>INSTRUCTIONS</h3><ol type="A"><li>The ARFRP shall be used by the accountable employee to return property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Property Custodian for the acceptance and by the Property Officer for updating of data and records;</li><li>Before receipt, the property shall be inspected and accomplish the Property Checklist;</li><li>This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;</li><li>The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 69); and</li><li>This form shall be prepared in two(2) copies distributed as follows:<div class="copy">Original – Supply and/or Property Division/Unit’s file<br>Copy 2 – Accountable Employee</div></li></ol></div>
<div class="form-code">NVSU-FR-SMO-02-00 (121421)</div>
</div><script>window.onload=function(){const logo=document.querySelector('.logo');if(logo&&!logo.complete){logo.onload=function(){window.print()};logo.onerror=function(){window.print()}}else{window.print()}}<\/script></body></html>`)
      win.document.close()
    },

    editSelectedReturn() {
      if (!this.selectedReturn) return

      const itemReturn = this.selectedReturn

      Modal.getInstance(
        document.getElementById('returnDetailsModal')
      )?.hide()

      this.editReturn(itemReturn)
    },

    async deleteSelectedReturn() {
      if (!this.selectedReturn) return

      const id = this.selectedReturn.id
      const deleted = await this.deleteReturn(id)

      if (deleted) {
        Modal.getInstance(
          document.getElementById('returnDetailsModal')
        )?.hide()
      }
    },

    async saveReturn() {
      if (this.saving) return

      if (!this.form.property_receipt_id) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please select an issued receipt.'
          })
        )
        return
      }

      if (!this.form.returned_by) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please select who returned the property.'
          })
        )
        return
      }

      if (!this.form.office_id) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please select an office.'
          })
        )
        return
      }

      if (this.form.return_reason === 'Others' && !this.form.otherReason.trim()) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Please enter the return reason.'
          })
        )
        return
      }

      this.saving = true

      try {
        let url = '/api/returns'
        let method = 'POST'

        if (this.editing) {
          url = `/api/returns/${this.form.id}`
          method = 'PUT'
        }

        const combinedReason = this.form.return_reason === 'Others'
          ? `Others: ${this.form.otherReason.trim()}`
          : this.form.return_reason

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            property_receipt_id: this.form.property_receipt_id,
            returned_by: this.form.returned_by || null,
            office_id: this.form.office_id || null,
            return_date: this.form.return_date || null,
            condition_after_return: 'Unserviceable',
            return_reason: combinedReason,
            remarks: this.form.remarks
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save return')
        }

        const modalElement = document.getElementById('returnModal')
        const modal = Modal.getOrCreateInstance(modalElement)

        modal.hide()

        await this.getReturns()
        await this.getReceipts()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: this.editing
              ? 'Return updated successfully'
              : 'Property returned successfully'
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

    async deleteReturn(id) {
      if (this.deletingReturnId !== null) {
        return false
      }

      if (!confirm('Are you sure you want to delete this return?')) {
        return false
      }

      this.deletingReturnId = id

      try {
        const response = await fetch(`/api/returns/${id}`, {
          method: 'DELETE'
        })

        const responseText = await response.text()
        let data = {}

        if (responseText) {
          try {
            data = JSON.parse(responseText)
          } catch {
            throw new Error(
              'The server returned an invalid response while deleting the return.'
            )
          }
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete return')
        }

        await this.getReturns()
        await this.getReceipts()

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: 'Return deleted successfully'
          })
        )

        return true
      } catch (error) {
        console.log(error)

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: error.message
          })
        )

        return false
      } finally {
        this.deletingReturnId = null
      }
    }
  }
}
</script>

<style scoped>
.return-ack-modal-dialog {
  width: min(920px, calc(100vw - 2rem));
  max-width: 920px;
}

.return-ack-modal-dialog .modal-content {
  width: 100%;
}

.return-ack-modal-dialog .modal-body {
  overflow: visible;
}

@media (max-width: 575.98px) {
  .return-ack-modal-dialog {
    width: calc(100vw - 1rem);
    max-width: none;
    margin: .5rem auto;
  }
}

.return-ack-options{position:absolute;z-index:1080;top:100%;left:0;right:0;max-height:190px;overflow-y:auto;background:var(--bs-body-bg);border:1px solid var(--bs-border-color);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.12)}
.return-ack-option{display:block;width:100%;padding:8px 10px;border:0;background:transparent;text-align:left;color:inherit}
.return-ack-option:hover{background:var(--bs-tertiary-bg)}
.return-ack-option small{display:block;color:var(--bs-secondary-color)}
.return-ack-empty{padding:9px;color:var(--bs-secondary-color);font-size:12px}

.return-requests-modal-dialog {
  width: min(1600px, calc(100vw - 2rem)) !important;
  max-width: none !important;
  margin: .5rem auto !important;
}

.return-requests-modal-dialog .modal-content {
  width: 100%;
  min-width: 0;
}

.return-requests-modal-dialog .modal-body {
  overflow-x: auto;
}

.return-requests-modal-dialog .return-requests-card {
  width: 100%;
  min-width: 0;
}

.return-requests-modal-dialog .table {
  min-width: 1150px;
}

.sortable {
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.sortable:hover {
  background-color: #f8f9fa;
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
