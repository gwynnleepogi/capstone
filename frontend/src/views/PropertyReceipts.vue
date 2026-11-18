<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Acquisitions and Issuance</h2>
        <p class="text-muted">Manage Acquisitions and Issuance</p>
      </div>
      <button class="btn btn-warning" @click="openAddModal">
        <i class="bi bi-plus-lg"></i>
        Add Receipt
      </button>
    </div>
    
    <div class="card">
      <div class="card-header bg-white">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md">
            <input
              v-model.trim="receiptSearch"
              type="search"
              class="form-control"
              placeholder="Search receipt number, item, issued to..."
              aria-label="Search receipts"
            >
          </div>
          <div class="col-6 col-md-3">
            <select v-model="receiptTypeFilter" class="form-select" aria-label="Filter by receipt type">
              <option value="">All Types</option>
              <option value="PAR">PAR</option>
              <option value="ICS">ICS</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <select v-model="receiptStatusFilter" class="form-select" aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="receipt-table-header">
              <tr>
                <th class="sortable" @click="sortReceiptsBy('receipt_number')">
                  Receipt Number <i :class="receiptSortIcon('receipt_number')"></i>
                </th>
                <th class="sortable" @click="sortReceiptsBy('receipt_type')">
                  Type <i :class="receiptSortIcon('receipt_type')"></i>
                </th>
                <th class="sortable" @click="sortReceiptsBy('item')">
                  Item <i :class="receiptSortIcon('item')"></i>
                </th>
                <th class="sortable" @click="sortReceiptsBy('issued_to')">
                  Issued To <i :class="receiptSortIcon('issued_to')"></i>
                </th>
                <th class="sortable" @click="sortReceiptsBy('date_issued')">
                  Date Issued <i :class="receiptSortIcon('date_issued')"></i>
                </th>
                <th class="sortable" @click="sortReceiptsBy('status')">
                  Status <i :class="receiptSortIcon('status')"></i>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="receipt in paginatedReceipts" :key="receipt.id">
                <td>{{ receipt.receipt_number || '-' }}</td>
                <td>
                  <span class="badge bg-secondary">{{ receipt.receipt_type || '-' }}</span>
                </td>
                <td>{{ getReceiptItem(receipt).description || '-' }}</td>
                <td>{{ getIssuedToName(receipt) }}</td>
                <td>{{ receipt.date_issued || '-' }}</td>
                <td>
                  <span class="badge" :class="receipt.status === 'Delivered' ? 'bg-success' : 'bg-warning text-dark'">
                    {{ receipt.status || 'Delivered' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-success" @click="viewReceiptDetails(receipt)" title="View receipt details">
                    <i class="bi bi-eye me-1"></i> Details
                  </button>
                </td>
              </tr>
              <tr v-if="filteredReceipts.length === 0">
                <td colspan="7" class="text-center text-muted py-4">
                  {{ receipts.length ? 'No receipts match your search or filters.' : 'No receipts found.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-3">
          <small class="text-muted">
            Showing {{ paginationStart }} to {{ paginationEnd }} of {{ filteredReceipts.length }} requests
          </small>
          <nav aria-label="Acquisitions and issuance pagination">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button type="button" class="page-link" :disabled="currentPage === 1" @click="currentPage--">Previous</button>
              </li>
              <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }">
                <button type="button" class="page-link" @click="currentPage = page">{{ page }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button type="button" class="page-link" :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- ADD / EDIT MODAL -->
    <div class="modal fade" id="receiptModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">{{ editing ? 'Edit Receipt' : 'Add Receipt' }}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <form @submit.prevent="saveReceipt">
            <div class="modal-body">
              <!-- RECEIPT TYPE -->
              <div class="mb-3">
                <label class="form-label">Receipt Type</label>
                <div class="form-control bg-light" aria-readonly="true">
                  {{ getReceiptTypeForItem(editing ? editingItem : selectedReceiptItem) || form.receipt_type }}
                </div>
                <small class="text-muted">Receipt type is automatically determined by the item's cost.</small>
              </div>
              <!-- RECEIPT NUMBER -->
              <div class="mb-3">
                <label class="form-label">Receipt Number</label>
                <div class="form-control bg-light" aria-readonly="true">
                  {{ editing ? form.receipt_number : nextReceiptNumber }}
                </div>
              </div>
              <div class="mb-3" v-if="!editing">
                <label class="form-label">Assigned Property</label>
                <select class="form-select" v-model="form.item_id" @change="updateReceiptTypeForSelectedProperty" required>
                  <option value="">
                    {{ assignedReceiptItems.length ? 'Select Assigned Property' : 'No eligible assigned properties' }}
                  </option>
                  <option v-for="item in assignedReceiptItems" :key="item.id" :value="item.id">
                    {{ item.property_number || item.description }} - {{ item.description }} ({{ item.accountable_employee }})
                  </option>
                </select>
                <small class="text-muted">
                  Properties added with an accountable employee are automatically eligible for an acquisition receipt.
                  <button type="button" class="btn btn-link btn-sm p-0 ms-1" @click="getItems">
                    Refresh list
                  </button>
                </small>
              </div>

              <!-- SELECTED ITEM DETAILS -->
              <div v-if="selectedAssignedItem && !editing" class="alert alert-light border">
                <h6 class="fw-bold text-success">Selected Item Details</h6>
                <p class="mb-1"><strong>Item:</strong> {{ selectedReceiptItem.description || '-' }}</p>
                <p class="mb-1"><strong>Property Number:</strong> {{ selectedReceiptItem.property_number || '-' }}</p>
                <p class="mb-1"><strong>Model Number:</strong> {{ selectedReceiptItem.model_number || '-' }}</p>
                <p class="mb-1"><strong>Serial Number:</strong> {{ selectedReceiptItem.serial_number || '-' }}</p>
                <p class="mb-1">
                  <strong>Accountable Employee:</strong>
                  {{ selectedAssignedItem?.accountable_employee || '-' }}
                </p>
                <p class="mb-0"><strong>Cost:</strong> ₱{{ formatAmount(selectedReceiptItem.cost) }}</p>
              </div>

              <!-- EDIT ITEM DETAILS -->
              <div v-if="editing" class="alert alert-light border">
                <h6 class="fw-bold text-success">Receipt Item</h6>
                <p class="mb-1"><strong>Item:</strong> {{ editingItem.description || '-' }}</p>
                <p class="mb-1"><strong>Property Number:</strong> {{ editingItem.property_number || '-' }}</p>
                <p class="mb-0"><strong>Issued To:</strong> {{ editingIssuedTo || '-' }}</p>
              </div>

              <!-- DATE ISSUED -->
              <div class="mb-3">
                <label class="form-label">Date Issued</label>
                <input type="date" class="form-control" v-model="form.date_issued">
              </div>
              <!-- REMARKS -->
              <div class="mb-3">
                <label class="form-label">Remarks</label>
                <textarea class="form-control" rows="3" v-model="form.remarks"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Receipt' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- PAR / ICS PRINT DETAILS MODAL -->
    <div class="modal fade" id="receiptPrintDetailsModal" tabindex="-1" aria-labelledby="receiptPrintDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <form class="receipt-print-details-form" @submit.prevent="confirmPrintReceipt">
            <div class="modal-header">
              <h5 class="modal-title" id="receiptPrintDetailsModalLabel">Complete PAR / ICS Print Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted small">Complete the details below before printing. The item information will be filled in automatically.</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Fund Cluster</label>
                  <select class="form-select" v-model="receiptPrintForm.fundCluster">
                    <option value="">Select Fund Cluster</option>
                    <option v-if="receiptPrintForm.fundCluster && !fundClusterOptions.includes(receiptPrintForm.fundCluster)" :value="receiptPrintForm.fundCluster">{{ receiptPrintForm.fundCluster }}</option>
                    <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
                  </select>
                </div>
                <div class="col-md-6"><label class="form-label">Purpose</label><input class="form-control" v-model.trim="receiptPrintForm.purpose"></div>
                <div class="col-md-6"><label class="form-label">Unit / Office</label><input class="form-control" v-model.trim="receiptPrintForm.unitOffice"></div>
                <div class="col-md-6"><label class="form-label">PO No.</label><input class="form-control" v-model.trim="receiptPrintForm.poNumber"></div>
                <div class="col-md-6"><label class="form-label">UACS</label><input class="form-control" v-model.trim="receiptPrintForm.uacs"></div>
                <div class="col-md-6"><label class="form-label">BUR No.</label><input class="form-control" v-model.trim="receiptPrintForm.burNumber"></div>
                <div class="col-md-6"><label class="form-label">IAR No.</label><input class="form-control" v-model.trim="receiptPrintForm.iarNumber"></div>
                <div class="col-md-6"><label class="form-label">Appendix</label><input class="form-control" v-model.trim="receiptPrintForm.appendix" required></div>
                
                <div class="col-12"><strong>Received By</strong></div>
                <div class="col-md-6">
                  <label class="form-label">Received By Name <span class="text-danger">*</span></label>
                  <div class="personnel-search">
                    <input v-model="personnelSearch.receiptReceivedBy" class="form-control" type="text" placeholder="Search name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.receiptReceivedBy" @focus="openPersonnelOptions('receiptReceivedBy', receiptPrintForm.receivedBy)" @input="onPersonnelSearch(receiptPrintForm, 'receiptReceivedBy', 'receivedBy', 'receivedByDesignation')" @keydown.esc="closePersonnelOptions('receiptReceivedBy')" @blur="hidePersonnelOptions('receiptReceivedBy')">
                    <div v-if="showPersonnelOptions.receiptReceivedBy" class="personnel-options" role="listbox">
                      <button v-if="receiptPrintForm.receivedBy && !printablePersonnel.some(person => person.full_name === receiptPrintForm.receivedBy)" type="button" role="option" @mousedown.prevent="selectPersonnel(receiptPrintForm, 'receiptReceivedBy', 'receivedBy', 'receivedByDesignation', receiptPrintForm.receivedBy)">{{ receiptPrintForm.receivedBy }}</button>
                      <button v-for="person in filteredPersonnel('receiptReceivedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectPersonnel(receiptPrintForm, 'receiptReceivedBy', 'receivedBy', 'receivedByDesignation', person.full_name)">{{ person.full_name }}</button>
                      <div v-if="!filteredPersonnel('receiptReceivedBy').length && !receiptPrintForm.receivedBy" class="personnel-empty">No matching names.</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6"><label class="form-label">Title</label><input class="form-control" v-model.trim="receiptPrintForm.receivedByDesignation" :readonly="Boolean(getPersonnelTitle(receiptPrintForm.receivedBy))"></div>
                
                <div class="col-12"><strong>Received From</strong></div>
                <div class="col-md-6">
                  <label class="form-label">Received From Name</label>
                  <div class="personnel-search">
                    <input v-model="personnelSearch.receiptReceivedFrom" class="form-control" type="text" placeholder="Search name" autocomplete="off" role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.receiptReceivedFrom" @focus="openPersonnelOptions('receiptReceivedFrom', receiptPrintForm.receivedFrom)" @input="onPersonnelSearch(receiptPrintForm, 'receiptReceivedFrom', 'receivedFrom', 'receivedFromDesignation')" @keydown.esc="closePersonnelOptions('receiptReceivedFrom')" @blur="hidePersonnelOptions('receiptReceivedFrom')">
                    <div v-if="showPersonnelOptions.receiptReceivedFrom" class="personnel-options" role="listbox">
                      <button v-if="receiptPrintForm.receivedFrom && !printablePersonnel.some(person => person.full_name === receiptPrintForm.receivedFrom)" type="button" role="option" @mousedown.prevent="selectPersonnel(receiptPrintForm, 'receiptReceivedFrom', 'receivedFrom', 'receivedFromDesignation', receiptPrintForm.receivedFrom)">{{ receiptPrintForm.receivedFrom }}</button>
                      <button v-for="person in filteredPersonnel('receiptReceivedFrom')" :key="person.id" type="button" role="option" @mousedown.prevent="selectPersonnel(receiptPrintForm, 'receiptReceivedFrom', 'receivedFrom', 'receivedFromDesignation', person.full_name)">{{ person.full_name }}</button>
                      <div v-if="!filteredPersonnel('receiptReceivedFrom').length && !receiptPrintForm.receivedFrom" class="personnel-empty">No matching names.</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6"><label class="form-label">Title</label><input class="form-control" v-model.trim="receiptPrintForm.receivedFromDesignation" :readonly="Boolean(getPersonnelTitle(receiptPrintForm.receivedFrom))"></div>
                
                <div class="col-md-6">
                  <label class="form-label">Import Signature for Received By</label>
                  <input class="form-control" type="file" accept="image/png,image/jpeg,image/webp" @change="handlePrintSignatureChange($event, 'receivedBy')">
                  <img v-if="signatureImages.receivedBy" :src="signatureImages.receivedBy" alt="Received By signature preview" style="display:block;max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;">
                  <label class="form-label mt-2">Date (optional)</label>
                  <input class="form-control" type="date" v-model="signatureDates.receivedBy">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Import Signature for Received From</label>
                  <input class="form-control" type="file" accept="image/png,image/jpeg,image/webp" @change="handlePrintSignatureChange($event, 'receivedFrom')">
                  <img v-if="signatureImages.receivedFrom" :src="signatureImages.receivedFrom" alt="Received From signature preview" style="display:block;max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;">
                  <label class="form-label mt-2">Date (optional)</label>
                  <input class="form-control" type="date" v-model="signatureDates.receivedFrom">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Paper Size</label>
                  <select class="form-select" v-model="receiptPrintForm.paperSize">
                    <option value="short">Short (8.5 × 11 in)</option>
                    <option value="long">Long (8.5 × 13 in)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <template v-if="receiptPrintForm.paperSize === 'custom'">
                  <div class="col-md-3"><label class="form-label">Paper Width (in)</label><input class="form-control" type="number" min="1" step="0.1" v-model.number="receiptPrintForm.paperWidth" required></div>
                  <div class="col-md-3"><label class="form-label">Paper Height (in)</label><input class="form-control" type="number" min="1" step="0.1" v-model.number="receiptPrintForm.paperHeight" required></div>
                </template>
              </div>
              <p class="text-muted small mt-3 mb-0">Choose the same paper size in your printer settings.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success">Continue to Print</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- RIS DETAILS MODAL -->
    <div class="modal fade" id="risDetailsModal" tabindex="-1" aria-labelledby="risDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <form class="receipt-print-details-form" @submit.prevent="confirmPrintRIS">
            <div class="modal-header">
              <h5 class="modal-title" id="risDetailsModalLabel">Complete RIS Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted small">Existing request and item details will be filled in automatically. Complete the required fields before printing.</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Fund Cluster <span class="text-danger">*</span></label>
                  <select class="form-select" v-model="risForm.fundCluster" required>
                    <option value="" disabled>Select Fund Cluster</option>
                    <option v-if="risForm.fundCluster && !fundClusterOptions.includes(risForm.fundCluster)" :value="risForm.fundCluster">{{ risForm.fundCluster }}</option>
                    <option v-for="fc in fundClusterOptions" :key="fc" :value="fc">{{ fc }}</option>
                  </select>
                </div>
                <div class="col-md-6"><label class="form-label">Division</label><input class="form-control" v-model.trim="risForm.division"></div>
                <div class="col-md-6"><label class="form-label">Office</label><input class="form-control" v-model.trim="risForm.officeName"></div>
                <div class="col-12"><label class="form-label">Purpose</label><textarea class="form-control" v-model.trim="risForm.purpose" rows="2"></textarea></div>
                
                <div class="col-md-6">
                  <label class="form-label">Requested By <span class="text-danger">*</span></label>
                  <div class="personnel-search">
                    <input v-model="personnelSearch.risRequestedBy" class="form-control" type="text" placeholder="Search or enter name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.risRequestedBy" @focus="openPersonnelOptions('risRequestedBy', risForm.requestedBy)" @input="onPersonnelSearch(risForm, 'risRequestedBy', 'requestedBy', 'requestedDesignation')" @keydown.esc="closePersonnelOptions('risRequestedBy')" @blur="hidePersonnelOptions('risRequestedBy')">
                    <div v-if="showPersonnelOptions.risRequestedBy" class="personnel-options" role="listbox">
                      <button v-if="risForm.requestedBy && !printablePersonnel.some(person => person.full_name === risForm.requestedBy)" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risRequestedBy', 'requestedBy', 'requestedDesignation', risForm.requestedBy)">{{ risForm.requestedBy }}</button>
                      <button v-for="person in filteredPersonnel('risRequestedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risRequestedBy', 'requestedBy', 'requestedDesignation', person.full_name)">{{ person.full_name }}</button>
                      <div v-if="!filteredPersonnel('risRequestedBy').length && !risForm.requestedBy" class="personnel-empty">No matching names.</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6"><label class="form-label">Requested By Title <span class="text-danger">*</span></label><input class="form-control" v-model.trim="risForm.requestedDesignation" required :readonly="Boolean(getPersonnelTitle(risForm.requestedBy))"></div>
                
                <div class="col-md-6">
                  <label class="form-label">Approved By <span class="text-danger">*</span></label>
                  <div class="personnel-search">
                    <input v-model="personnelSearch.risApprovedBy" class="form-control" type="text" placeholder="Search or enter name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.risApprovedBy" @focus="openPersonnelOptions('risApprovedBy', risForm.approvedBy)" @input="onPersonnelSearch(risForm, 'risApprovedBy', 'approvedBy', 'approvedDesignation')" @keydown.esc="closePersonnelOptions('risApprovedBy')" @blur="hidePersonnelOptions('risApprovedBy')">
                    <div v-if="showPersonnelOptions.risApprovedBy" class="personnel-options" role="listbox">
                      <button v-if="risForm.approvedBy && !printablePersonnel.some(person => person.full_name === risForm.approvedBy)" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risApprovedBy', 'approvedBy', 'approvedDesignation', risForm.approvedBy)">{{ risForm.approvedBy }}</button>
                      <button v-for="person in filteredPersonnel('risApprovedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risApprovedBy', 'approvedBy', 'approvedDesignation', person.full_name)">{{ person.full_name }}</button>
                      <div v-if="!filteredPersonnel('risApprovedBy').length && !risForm.approvedBy" class="personnel-empty">No matching names.</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6"><label class="form-label">Approved By Title <span class="text-danger">*</span></label><input class="form-control" v-model.trim="risForm.approvedDesignation" required :readonly="Boolean(getPersonnelTitle(risForm.approvedBy))"></div>
                
                <div class="col-md-6">
                  <label class="form-label">Issued By <span class="text-danger">*</span></label>
                  <div class="personnel-search">
                    <input v-model="personnelSearch.risIssuedBy" class="form-control" type="text" placeholder="Search or enter name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.risIssuedBy" @focus="openPersonnelOptions('risIssuedBy', risForm.issuedBy)" @input="onPersonnelSearch(risForm, 'risIssuedBy', 'issuedBy', 'issuedDesignation')" @keydown.esc="closePersonnelOptions('risIssuedBy')" @blur="hidePersonnelOptions('risIssuedBy')">
                    <div v-if="showPersonnelOptions.risIssuedBy" class="personnel-options" role="listbox">
                      <button v-if="risForm.issuedBy && !printablePersonnel.some(person => person.full_name === risForm.issuedBy)" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risIssuedBy', 'issuedBy', 'issuedDesignation', risForm.issuedBy)">{{ risForm.issuedBy }}</button>
                      <button v-for="person in filteredPersonnel('risIssuedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risIssuedBy', 'issuedBy', 'issuedDesignation', person.full_name)">{{ person.full_name }}</button>
                      <div v-if="!filteredPersonnel('risIssuedBy').length && !risForm.issuedBy" class="personnel-empty">No matching names.</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6"><label class="form-label">Issued By Title <span class="text-danger">*</span></label><input class="form-control" v-model.trim="risForm.issuedDesignation" required :readonly="Boolean(getPersonnelTitle(risForm.issuedBy))"></div>
                
                <div class="col-md-6">
                  <label class="form-label">Received By <span class="text-danger">*</span></label>
                  <div class="personnel-search">
                    <input v-model="personnelSearch.risReceivedBy" class="form-control" type="text" placeholder="Search or enter name" autocomplete="off" required role="combobox" aria-autocomplete="list" :aria-expanded="showPersonnelOptions.risReceivedBy" @focus="openPersonnelOptions('risReceivedBy', risForm.receivedBy)" @input="onPersonnelSearch(risForm, 'risReceivedBy', 'receivedBy', 'receivedDesignation')" @keydown.esc="closePersonnelOptions('risReceivedBy')" @blur="hidePersonnelOptions('risReceivedBy')">
                    <div v-if="showPersonnelOptions.risReceivedBy" class="personnel-options" role="listbox">
                      <button v-if="risForm.receivedBy && !printablePersonnel.some(person => person.full_name === risForm.receivedBy)" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risReceivedBy', 'receivedBy', 'receivedDesignation', risForm.receivedBy)">{{ risForm.receivedBy }}</button>
                      <button v-for="person in filteredPersonnel('risReceivedBy')" :key="person.id" type="button" role="option" @mousedown.prevent="selectPersonnel(risForm, 'risReceivedBy', 'receivedBy', 'receivedDesignation', person.full_name)">{{ person.full_name }}</button>
                      <div v-if="!filteredPersonnel('risReceivedBy').length && !risForm.receivedBy" class="personnel-empty">No matching names.</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6"><label class="form-label">Received By Title <span class="text-danger">*</span></label><input class="form-control" v-model.trim="risForm.receivedDesignation" required :readonly="Boolean(getPersonnelTitle(risForm.receivedBy))"></div>
                
                <div class="col-md-6">
                  <label class="form-label">Import Signature for Requested By</label>
                  <input class="form-control" type="file" accept="image/png,image/jpeg,image/webp" @change="handlePrintSignatureChange($event, 'requestedBy')">
                  <img v-if="signatureImages.requestedBy" :src="signatureImages.requestedBy" alt="Requested By signature preview" style="display:block;max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;">
                  <label class="form-label mt-2">Date (optional)</label>
                  <input class="form-control" type="date" v-model="signatureDates.requestedBy">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Import Signature for Approved By</label>
                  <input class="form-control" type="file" accept="image/png,image/jpeg,image/webp" @change="handlePrintSignatureChange($event, 'approvedBy')">
                  <img v-if="signatureImages.approvedBy" :src="signatureImages.approvedBy" alt="Approved By signature preview" style="display:block;max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;">
                  <label class="form-label mt-2">Date (optional)</label>
                  <input class="form-control" type="date" v-model="signatureDates.approvedBy">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Import Signature for Issued By</label>
                  <input class="form-control" type="file" accept="image/png,image/jpeg,image/webp" @change="handlePrintSignatureChange($event, 'issuedBy')">
                  <img v-if="signatureImages.issuedBy" :src="signatureImages.issuedBy" alt="Issued By signature preview" style="display:block;max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;">
                  <label class="form-label mt-2">Date (optional)</label>
                  <input class="form-control" type="date" v-model="signatureDates.issuedBy">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Import Signature for Received By</label>
                  <input class="form-control" type="file" accept="image/png,image/jpeg,image/webp" @change="handlePrintSignatureChange($event, 'receivedByRIS')">
                  <img v-if="signatureImages.receivedByRIS" :src="signatureImages.receivedByRIS" alt="Received By signature preview" style="display:block;max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;">
                  <label class="form-label mt-2">Date (optional)</label>
                  <input class="form-control" type="date" v-model="signatureDates.receivedByRIS">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Paper Size</label>
                  <select class="form-select" v-model="risForm.paperSize">
                    <option value="short">Short (8.5 × 11 in)</option>
                    <option value="long">Long (8.5 × 13 in)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <template v-if="risForm.paperSize === 'custom'">
                  <div class="col-md-3"><label class="form-label">Paper Width (in)</label><input class="form-control" type="number" min="1" step="0.1" v-model.number="risForm.paperWidth" required></div>
                  <div class="col-md-3"><label class="form-label">Paper Height (in)</label><input class="form-control" type="number" min="1" step="0.1" v-model.number="risForm.paperHeight" required></div>
                </template>
              </div>
              <p class="text-muted small mt-3 mb-0">Choose the same paper size in your printer settings.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success">Continue to Print</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- RECEIPT DETAILS MODAL -->
    <div class="modal fade" id="receiptDetailsModal" tabindex="-1" aria-labelledby="receiptDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="receiptDetailsModalLabel" class="modal-title">Receipt Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div v-if="selectedDetailsReceipt" class="modal-body">
            <dl class="row mb-0">
              <dt class="col-sm-4">Receipt Number</dt><dd class="col-sm-8">{{ selectedDetailsReceipt.receipt_number || '-' }}</dd>
              <dt class="col-sm-4">Type</dt><dd class="col-sm-8">{{ selectedDetailsReceipt.receipt_type || '-' }}</dd>
              <dt class="col-sm-4">Property</dt><dd class="col-sm-8">{{ getReceiptItem(selectedDetailsReceipt).description || '-' }}</dd>
              <dt class="col-sm-4">Property Number</dt><dd class="col-sm-8">{{ getReceiptItem(selectedDetailsReceipt).property_number || '-' }}</dd>
              <dt class="col-sm-4">Quantity Issued</dt><dd class="col-sm-8">{{ getQuantityIssued(selectedDetailsReceipt) || '-' }}</dd>
              <dt class="col-sm-4">Unit of Measure</dt><dd class="col-sm-8">{{ getReceiptItem(selectedDetailsReceipt).unit || 'PC' }}</dd>
              <dt class="col-sm-4">Issued To</dt><dd class="col-sm-8">{{ getIssuedToName(selectedDetailsReceipt) }}</dd>
              <dt class="col-sm-4">Date Issued</dt><dd class="col-sm-8">{{ selectedDetailsReceipt.date_issued || '-' }}</dd>
              <dt class="col-sm-4">Status</dt><dd class="col-sm-8">{{ selectedDetailsReceipt.status || '-' }}</dd>
              <dt class="col-sm-4">Remarks</dt><dd class="col-sm-8 text-break" style="white-space: pre-wrap;">{{ getReceiptRemarks(selectedDetailsReceipt) }}</dd>
            </dl>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-outline-warning" @click="editSelectedReceipt"><i class="bi bi-pencil me-1"></i> Edit</button>
            <button type="button" class="btn btn-outline-danger" @click="deleteSelectedReceipt"><i class="bi bi-trash me-1"></i> Delete</button>
            <button type="button" class="btn btn-outline-success" @click="printSelectedReceipt"><i class="bi bi-printer me-1"></i> {{ selectedDetailsReceipt?.receipt_type === 'ICS' ? 'Print Inventory Custodian Slip' : 'Print Property Acknowledgement Receipt' }}</button>
            <button type="button" class="btn btn-outline-dark" @click="printSelectedRIS"><i class="bi bi-file-earmark-text me-1"></i> Print Issuance Receipt</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'PropertyReceipts',
  data() {
    return {
      receipts: [],
      receiptSearch: '',
      receiptTypeFilter: '',
      receiptStatusFilter: '',
      receiptSortKey: 'date_issued',
      receiptSortDirection: 'desc',
      currentPage: 1,
      pageSize: 10,
      items: [],
      personnel: [],
      itemRequests: [],
      itemRequestSearch: '',
      showItemRequestOptions: false,

      fundClusterOptions: [
        'AF-1', 'AF-2', 'AF-3', 'AF-DBM PS/BID',
        'GF-1', 'GF -2', 'GF-3', 'GF-DBM PS/BID',
        'RF-1', 'RF-2', 'RF-DBM PS/BID',
        'STF-1', 'STF-2', 'STF-3', 'STF-DBM PS/BID',
        'TF-1', 'TF-2', 'TF-3', 'TF-DBM PS/BID',
        'TR-1', 'TR-2', 'TR-DBM PS/BID' 
      ],

      editing: false,
      saving: false,
      signatureImages: { receivedBy: '', receivedFrom: '', requestedBy: '', approvedBy: '', issuedBy: '', receivedByRIS: '' },
      signatureDates: { receivedBy: '', receivedFrom: '', requestedBy: '', approvedBy: '', issuedBy: '', receivedByRIS: '' },
      personnelSearch: {
        receiptReceivedBy: '',
        receiptReceivedFrom: '',
        risRequestedBy: '',
        risApprovedBy: '',
        risIssuedBy: '',
        risReceivedBy: ''
      },
      showPersonnelOptions: {
        receiptReceivedBy: false,
        receiptReceivedFrom: false,
        risRequestedBy: false,
        risApprovedBy: false,
        risIssuedBy: false,
        risReceivedBy: false
      },
      selectedRISReceipt: null,
      selectedPrintReceipt: null,
      selectedDetailsReceipt: null,

      receiptPrintForm: {
        fundCluster: 'TF-2',
        appendix: '71',
        purpose: '',
        unitOffice: '',
        poNumber: '',
        uacs: '',
        burNumber: '',
        iarNumber: '',
        receivedBy: '',
        receivedByDesignation: '',
        receivedFrom: '',
        receivedFromDesignation: '',
        paperSize: 'short',
        paperWidth: 8.5,
        paperHeight: 11
      },

      risForm: {
        fundCluster: '',
        requestedBy: '',
        requestedDesignation: '',
        approvedBy: '',
        approvedDesignation: '',
        issuedBy: '',
        issuedDesignation: '',
        receivedBy: '',
        receivedDesignation: '',
        paperSize: 'long',
        paperWidth: 8.5,
        paperHeight: 13
      },

      form: {
        id: null,
        item_request_id: '',
        item_id: '',
        receipt_source: 'property',
        receipt_type: 'PAR',
        receipt_number: '',
        date_issued: '',
        remarks: ''
      }
    }
  },

  computed: {
    nextReceiptNumber() {
      let highestNumber = -1

      for (const receipt of this.receipts || []) {
        const match = String(receipt.receipt_number || '').match(/^(\d{5})-(\d{4})$/)
        if (match) {
          const numericValue = Number(match[1]) * 10000 + Number(match[2])
          if (numericValue > highestNumber) highestNumber = numericValue
        }
      }

      const nextNumber = highestNumber + 1
      return String(Math.floor(nextNumber / 10000)).padStart(5, '0') +
        '-' +
        String(nextNumber % 10000).padStart(4, '0')
    },

    filteredReceipts() {
      const search = this.receiptSearch.toLocaleLowerCase()

      return this.receipts
        .filter(receipt => {
          const item = this.getReceiptItem(receipt)
          const status = receipt.status || 'Delivered'
          const matchesSearch = !search || [
            receipt.receipt_number,
            receipt.receipt_type,
            item.property_number,
            item.description,
            this.getIssuedToName(receipt),
            receipt.date_issued,
            status,
            this.getReceiptRemarks(receipt)
          ].some(value => String(value || '').toLocaleLowerCase().includes(search))
          const matchesType = !this.receiptTypeFilter || receipt.receipt_type === this.receiptTypeFilter
          const matchesStatus = !this.receiptStatusFilter || status === this.receiptStatusFilter

          return matchesSearch && matchesType && matchesStatus
        })
        .slice()
        .sort((first, second) => {
          const firstValue = this.getReceiptSortValue(first, this.receiptSortKey)
          const secondValue = this.getReceiptSortValue(second, this.receiptSortKey)
          const comparison = this.receiptSortKey === 'date_issued'
            ? String(firstValue).localeCompare(String(secondValue))
            : String(firstValue).localeCompare(String(secondValue), undefined, {
                numeric: true,
                sensitivity: 'base'
              })

          return this.receiptSortDirection === 'asc' ? comparison : -comparison
        })
    },

    paginatedReceipts() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.filteredReceipts.slice(start, start + this.pageSize)
    },

    totalPages() {
      return Math.max(1, Math.ceil(this.filteredReceipts.length / this.pageSize))
    },

    paginationStart() {
      return this.filteredReceipts.length ? (this.currentPage - 1) * this.pageSize + 1 : 0
    },

    paginationEnd() {
      return Math.min(this.currentPage * this.pageSize, this.filteredReceipts.length)
    },

    printablePersonnel() {
      return [...this.personnel]
        .filter(person => person.full_name)
        .sort((first, second) =>
          first.full_name.localeCompare(second.full_name, undefined, {
            sensitivity: 'base'
          })
        )
    },

    filteredItemRequests() {
      const search = this.itemRequestSearch.trim().toLowerCase()
      if (!search) return this.itemRequests
      return this.itemRequests.filter(request => {
        const text = `${request.request_number || ''} ${request.item_description || ''}`.toLowerCase()
        return text.includes(search)
      })
    },

    selectedRequest() {
      return this.itemRequests.find(request => request.id === this.form.item_request_id) || null
    },

    assignedReceiptItems() {
      const receiptedItemIds = new Set(this.receipts.map(receipt => String(receipt.item_id)))

      return this.items.filter(item =>
        String(item.status || '').trim().toLowerCase() === 'issued' &&
        String(item.accountable_employee || '').trim() &&
        !receiptedItemIds.has(String(item.id))
      )
    },

    selectedAssignedItem() {
      return this.assignedReceiptItems.find(item => String(item.id) === String(this.form.item_id)) || null
    },

    selectedReceiptItem() {
      return this.selectedAssignedItem || {}
    },

    editingItem() {
      const receipt = this.receipts.find(receipt => receipt.id === this.form.id)
      return this.getReceiptItem(receipt || {})
    },

    editingIssuedTo() {
      const receipt = this.receipts.find(receipt => receipt.id === this.form.id)
      return this.getIssuedToName(receipt || {})
    }
  },

  mounted() {
    this.getReceipts()
    this.getItems()
    this.getPersonnel()
    this.getItemRequests()

    window.addEventListener('focus', this.getItemRequests)
    window.addEventListener('item-requests-updated', this.getItemRequests)
  },

  beforeUnmount() {
    window.removeEventListener('focus', this.getItemRequests)
    window.removeEventListener('item-requests-updated', this.getItemRequests)
  },

  watch: {
    receiptSearch() { this.currentPage = 1 },
    receiptTypeFilter() { this.currentPage = 1 },
    receiptStatusFilter() { this.currentPage = 1 },
    filteredReceipts() {
      if (this.currentPage > this.totalPages) this.currentPage = this.totalPages
    }
  },

  methods: {
    getReceiptSortValue(receipt, key) {
      if (key === 'item') return this.getReceiptItem(receipt).description || ''
      if (key === 'issued_to') return this.getIssuedToName(receipt)
      if (key === 'status') return receipt.status || 'Delivered'
      return receipt[key] || ''
    },

    sortReceiptsBy(key) {
      if (this.receiptSortKey === key) {
        this.receiptSortDirection = this.receiptSortDirection === 'asc' ? 'desc' : 'asc'
        return
      }
      this.receiptSortKey = key
      this.receiptSortDirection = 'asc'
    },

    receiptSortIcon(key) {
      if (this.receiptSortKey !== key) return 'bi bi-arrow-down-up ms-1'
      return this.receiptSortDirection === 'asc' ? 'bi bi-arrow-up ms-1' : 'bi bi-arrow-down ms-1'
    },

    getPersonnelTitle(name) {
      if (!name) return ''
      return this.personnel.find(person => person.full_name === name)?.job_title || ''
    },

    filteredPersonnel(searchKey) {
      const search = this.personnelSearch[searchKey].trim().toLowerCase()
      if (!search) return this.printablePersonnel
      return this.printablePersonnel.filter(person => person.full_name.toLowerCase().includes(search))
    },

    openPersonnelOptions(searchKey, selectedName) {
      if (!this.personnelSearch[searchKey]) {
        this.personnelSearch[searchKey] = selectedName || ''
      }
      this.showPersonnelOptions[searchKey] = true
    },

    onPersonnelSearch(form, searchKey, nameField, titleField) {
      const fullName = this.personnelSearch[searchKey].trim()
      form[nameField] = fullName
      form[titleField] = this.getPersonnelTitle(fullName)
      this.showPersonnelOptions[searchKey] = true
    },

    selectPersonnel(form, searchKey, nameField, titleField, fullName) {
      const personnelTitle = this.getPersonnelTitle(fullName)
      if (personnelTitle) {
        form[titleField] = personnelTitle
      } else if (form[nameField] !== fullName) {
        form[titleField] = ''
      }
      form[nameField] = fullName
      this.personnelSearch[searchKey] = fullName
      this.showPersonnelOptions[searchKey] = false
    },

    closePersonnelOptions(searchKey) {
      this.showPersonnelOptions[searchKey] = false
    },

    hidePersonnelOptions(searchKey) {
      setTimeout(() => {
        this.closePersonnelOptions(searchKey)
      }, 150)
    },

    onItemRequestSearchInput() {
      const search = this.itemRequestSearch.trim().toLowerCase()
      if (this.form.item_request_id && this.selectedRequest) {
        const selectedText = `${this.selectedRequest.request_number} - ${this.selectedRequest.item_description}`.toLowerCase()
        if (!selectedText.includes(search) && search !== selectedText) {
          this.form.item_request_id = ''
        }
      }
      this.showItemRequestOptions = true
    },

    selectItemRequest(request) {
      this.form.item_request_id = request.id
      this.itemRequestSearch = `${request.request_number} - ${request.item_description}`
      this.showItemRequestOptions = false
      this.updateReceiptTypeForSelectedRequest()
    },

    clearItemRequest() {
      this.form.item_request_id = ''
      this.itemRequestSearch = ''
      this.showItemRequestOptions = true
    },

    hideItemRequestOptions() {
      setTimeout(() => {
        this.showItemRequestOptions = false
        if (this.form.item_request_id && this.selectedRequest) {
          this.itemRequestSearch = `${this.selectedRequest.request_number} - ${this.selectedRequest.item_description}`
        } else if (!this.form.item_request_id) {
          this.itemRequestSearch = ''
        }
      }, 150)
    },

    viewReceiptDetails(receipt) {
      this.selectedDetailsReceipt = receipt
      Modal.getOrCreateInstance(document.getElementById('receiptDetailsModal')).show()
    },

    editSelectedReceipt() {
      if (!this.selectedDetailsReceipt) return
      const receipt = this.selectedDetailsReceipt
      Modal.getInstance(document.getElementById('receiptDetailsModal'))?.hide()
      this.editReceipt(receipt)
    },

    deleteSelectedReceipt() {
      if (!this.selectedDetailsReceipt) return
      const id = this.selectedDetailsReceipt.id
      Modal.getInstance(document.getElementById('receiptDetailsModal'))?.hide()
      this.deleteReceipt(id)
    },

    handlePrintSignatureChange(event, signerKey) {
      const file = event.target.files && event.target.files[0]
      this.signatureImages[signerKey] = ''
      if (!file) return

      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        this.showToast('Choose a PNG, JPG, or WEBP signature image')
        event.target.value = ''
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        this.showToast('The signature image must be 5 MB or smaller')
        event.target.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        this.signatureImages[signerKey] = typeof reader.result === 'string' ? reader.result : ''
      }
      reader.onerror = () => {
        this.showToast('Could not read the signature image')
        event.target.value = ''
      }
      reader.readAsDataURL(file)
    },

    printSelectedReceipt() {
      if (!this.selectedDetailsReceipt) return
      const receipt = this.selectedDetailsReceipt
      const detailsModal = document.getElementById('receiptDetailsModal')
      const openPrintDetails = () => this.openReceiptPrintModal(receipt)

      if (detailsModal.classList.contains('show')) {
        detailsModal.addEventListener('hidden.bs.modal', openPrintDetails, { once: true })
        Modal.getOrCreateInstance(detailsModal).hide()
      } else {
        openPrintDetails()
      }
    },

    printSelectedRIS() {
      if (!this.selectedDetailsReceipt) return
      const receipt = this.selectedDetailsReceipt
      const detailsModal = document.getElementById('receiptDetailsModal')
      const openRISDetails = () => this.openRISModal(receipt)

      if (detailsModal.classList.contains('show')) {
        detailsModal.addEventListener('hidden.bs.modal', openRISDetails, { once: true })
        Modal.getOrCreateInstance(detailsModal).hide()
      } else {
        openRISDetails()
      }
    },

    async getReceipts() {
      try {
        const response = await fetch('/api/receipts')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load receipts')
        this.receipts = Array.isArray(data) ? data : data.receipts || []
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      }
    },

    async getItems() {
      try {
        const response = await fetch('/api/items')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load items')
        this.items = Array.isArray(data) ? data : data.items || []
      } catch (error) {
        console.log(error)
      }
    },

    async getPersonnel() {
      try {
        const response = await fetch('/api/personnel')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load personnel')
        this.personnel = Array.isArray(data) ? data : data.personnel || []
      } catch (error) {
        console.log(error)
      }
    },

    async getItemRequests() {
      try {
        const response = await fetch('/api/item-requests')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load item requests')

        const requests = Array.isArray(data) ? data : data.itemRequests || data.requests || []
        this.itemRequests = requests.filter(request =>
          String(request.status || '').trim().toLowerCase() === 'approved' && request.item_id
        )
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      }
    },

    openAddModal() {
      this.editing = false
      this.form = {
        id: null,
        item_request_id: '',
        item_id: '',
        receipt_source: 'property',
        receipt_type: 'PAR',
        receipt_number: '',
        date_issued: new Date().toISOString().split('T')[0],
        remarks: ''
      }
      
      this.itemRequestSearch = ''
      this.showItemRequestOptions = false

      const modal = Modal.getOrCreateInstance(document.getElementById('receiptModal'))
      modal.show()
    },

    editReceipt(receipt) {
      this.editing = true
      this.form = {
        id: receipt.id,
        item_request_id: '',
        item_id: '',
        receipt_source: 'property',
        receipt_type: this.getReceiptTypeForItem(this.getReceiptItem(receipt)),
        receipt_number: receipt.receipt_number || '',
        date_issued: receipt.date_issued || '',
        remarks: this.getReceiptRemarks(receipt, '')
      }

      this.$nextTick(() => {
        const modalElement = document.getElementById('receiptModal')
        if (modalElement) {
          const modalInstance = Modal.getOrCreateInstance(modalElement)
          modalInstance.show()
        }
      })
    },

    async saveReceipt() {
      this.saving = true
      try {
        let url = '/api/receipts'
        let method = 'POST'

        const receiptItem = this.editing ? this.editingItem : this.selectedReceiptItem
        const automaticReceiptType = this.getReceiptTypeForItem(receiptItem)
        this.form.receipt_type = automaticReceiptType

        const body = {
          receipt_type: automaticReceiptType,
          ...(this.editing ? { receipt_number: this.form.receipt_number } : {}),
          date_issued: this.form.date_issued || null,
          remarks: this.form.remarks || null
        }

        if (this.editing) {
          url = `/api/receipts/${this.form.id}`
          method = 'PUT'
        } else {
          body.item_id = this.form.item_id
        }

        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to save receipt')

        window.dispatchEvent(new Event('receipts-updated'))
        const modal = Modal.getOrCreateInstance(document.getElementById('receiptModal'))
        modal.hide()

        await this.getReceipts()
        await this.getItems()

        this.showToast(this.editing ? 'Receipt updated successfully' : 'Receipt created successfully')
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      } finally {
        this.saving = false
      }
    },

    async deleteReceipt(id) {
      const confirmed = confirm('Are you sure you want to delete this receipt?')
      if (!confirmed) return

      try {
        const response = await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to delete receipt')

        window.dispatchEvent(new Event('receipts-updated'))
        await this.getReceipts()
        await this.getItems()
        await this.getItemRequests()
        this.showToast('Receipt deleted successfully')
      } catch (error) {
        console.log(error)
        this.showToast(error.message)
      }
    },

    getReceiptRemarks(receipt, fallback = '-') {
      if (!receipt) return fallback
      const request = Array.isArray(receipt.item_requests) ? receipt.item_requests[0] : receipt.item_requests
      const values = [receipt.remarks, request?.remarks, request?.purpose, receipt.purpose]

      for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return String(value).trim()
        }
      }
      return fallback
    },

    getQuantityIssued(receipt) {
      if (!receipt) return 0
      const quantities = [receipt.quantity, receipt.quantity_issued, receipt.item_requests?.quantity, receipt.quantity_requested]
      for (const quantity of quantities) {
        const value = Number(quantity)
        if (Number.isFinite(value) && value > 0) return value
      }
      return 0
    },

    getReceiptItem(receipt) {
      if (!receipt) return {}
      if (receipt.items) return Array.isArray(receipt.items) ? receipt.items[0] || {} : receipt.items
      if (receipt.item) return receipt.item
      if (receipt.item_requests?.items) return Array.isArray(receipt.item_requests.items) ? receipt.item_requests.items[0] || {} : receipt.item_requests.items
      if (receipt.item_id) return this.items.find(item => item.id === receipt.item_id) || {}
      return {}
    },

    getReceiptTypeForItem(item) {
      const cost = Number(item?.cost ?? item?.unit_cost ?? item?.price ?? item?.acquisition_cost ?? item?.unit_price ?? 0)
      return cost >= 50000 ? 'PAR' : 'ICS'
    },

    updateReceiptTypeForSelectedRequest() {
      const item = this.getRequestItem(this.selectedRequest)
      this.form.receipt_type = this.getReceiptTypeForItem(item)
    },

    updateReceiptTypeForSelectedProperty() {
      this.form.receipt_type = this.getReceiptTypeForItem(this.selectedAssignedItem)
    },

    resetReceiptSourceSelection() {
      this.form.item_request_id = ''
      this.form.item_id = ''
      this.itemRequestSearch = ''
    },

    getRequestItem(request) {
      if (!request) return {}
      if (request.items) return Array.isArray(request.items) ? request.items[0] || {} : request.items
      if (request.item) return request.item
      return this.items.find(item => item.id === request.item_id) || {}
    },

    getIssuedToName(receipt) {
      if (!receipt) return '-'
      if (receipt.users?.full_name) return receipt.users.full_name
      if (receipt.item_requests?.users?.full_name) return receipt.item_requests.users.full_name
      if (receipt.issued_to) {
        const person = this.personnel.find(person => person.id === receipt.issued_to)
        return person?.full_name || '-'
      }
      return '-'
    },

    formatAmount(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '0.00'
      return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },

    escapeHtml(value) {
      return String(value ?? '-').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character])
    },

    showToast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
    },

    openReceiptPrintModal(receipt) {
      this.signatureImages = { receivedBy: '', receivedFrom: '', requestedBy: '', approvedBy: '', issuedBy: '', receivedByRIS: '' }
      this.signatureDates = { receivedBy: '', receivedFrom: '', requestedBy: '', approvedBy: '', issuedBy: '', receivedByRIS: '' }
      const item = this.getReceiptItem(receipt)
      receipt.receipt_type = this.getReceiptTypeForItem(item)
      this.selectedPrintReceipt = receipt

      this.receiptPrintForm = {
        fundCluster: receipt.fund_cluster || 'TF-2',
        appendix: receipt.appendix || '71',
        purpose: receipt.remarks || '',
        unitOffice: item.responsibility_center || receipt.offices?.office_name || '',
        poNumber: receipt.po_number || '',
        uacs: receipt.uacs || '',
        burNumber: receipt.bur_number || '',
        iarNumber: receipt.iar_number || '',
        receivedBy: this.getIssuedToName(receipt) === '-' ? '' : this.getIssuedToName(receipt),
        receivedByDesignation: this.getPersonnelTitle(this.getIssuedToName(receipt)) || receipt.received_by_designation || '',
        receivedFrom: receipt.received_from_name || '',
        receivedFromDesignation: this.getPersonnelTitle(receipt.received_from_name) || receipt.received_from_designation || 'Administrative Officer V',
        paperSize: 'short',
        paperWidth: 8.5,
        paperHeight: 11
      }
      this.personnelSearch.receiptReceivedBy = this.receiptPrintForm.receivedBy
      this.personnelSearch.receiptReceivedFrom = this.receiptPrintForm.receivedFrom
      this.showPersonnelOptions.receiptReceivedBy = false
      this.showPersonnelOptions.receiptReceivedFrom = false

      const modal = Modal.getOrCreateInstance(document.getElementById('receiptPrintDetailsModal'))
      modal.show()
    },

    confirmPrintReceipt() {
      if (!this.selectedPrintReceipt) return
      if (!this.receiptPrintForm.receivedBy) {
        this.showToast('Select a name for Received By.')
        return
      }
      if (!this.getPrintPageSize(this.receiptPrintForm)) return

      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.showToast('Please allow pop-ups to print the receipt')
        return
      }

      const modalElement = document.getElementById('receiptPrintDetailsModal')
      const print = () => this.printReceipt(this.selectedPrintReceipt, {
        ...this.receiptPrintForm,
        signatureImages: { ...this.signatureImages },
        signatureDates: { ...this.signatureDates }
      }, printWindow)

      modalElement.addEventListener('hidden.bs.modal', print, { once: true })
      Modal.getOrCreateInstance(modalElement).hide()
    },

    openRISModal(receipt) {
      this.signatureImages = { receivedBy: '', receivedFrom: '', requestedBy: '', approvedBy: '', issuedBy: '', receivedByRIS: '' }
      this.signatureDates = { receivedBy: '', receivedFrom: '', requestedBy: '', approvedBy: '', issuedBy: '', receivedByRIS: '' }

      const request = receipt.item_requests || {}
      const issuedTo = this.getIssuedToName(receipt)
      this.selectedRISReceipt = receipt

      this.risForm = {
        fundCluster: request.fund_cluster || receipt.fund_cluster || '',
        division: request.division || receipt.division || '',
        officeName: request.offices?.office_name || receipt.offices?.office_name || request.office_name || receipt.office_name || '',
        purpose: request.purpose || receipt.purpose || request.remarks || '',
        requestedBy: request.requested_by_name || request.users?.full_name || '',
        requestedDesignation: this.getPersonnelTitle(request.requested_by_name || request.users?.full_name || '') || request.requested_by_designation || '',
        approvedBy: receipt.approved_by_name || '',
        approvedDesignation: this.getPersonnelTitle(receipt.approved_by_name) || receipt.approved_by_designation || '',
        issuedBy: receipt.issued_by_name || '',
        issuedDesignation: this.getPersonnelTitle(receipt.issued_by_name) || receipt.issued_by_designation || '',
        receivedBy: issuedTo === '-' ? '' : issuedTo,
        receivedDesignation: this.getPersonnelTitle(issuedTo) || receipt.received_by_designation || '',
        paperSize: 'long',
        paperWidth: 8.5,
        paperHeight: 13
      }
      this.personnelSearch.risRequestedBy = this.risForm.requestedBy
      this.personnelSearch.risApprovedBy = this.risForm.approvedBy
      this.personnelSearch.risIssuedBy = this.risForm.issuedBy
      this.personnelSearch.risReceivedBy = this.risForm.receivedBy
      this.showPersonnelOptions.risRequestedBy = false
      this.showPersonnelOptions.risApprovedBy = false
      this.showPersonnelOptions.risIssuedBy = false
      this.showPersonnelOptions.risReceivedBy = false

      const modal = Modal.getOrCreateInstance(document.getElementById('risDetailsModal'))
      modal.show()
    },

    confirmPrintRIS() {
      if (!this.selectedRISReceipt) return
      if (!this.risForm.requestedBy || !this.risForm.approvedBy || !this.risForm.issuedBy || !this.risForm.receivedBy) {
        this.showToast('Select a name for each RIS signer.')
        return
      }
      if (!this.getPrintPageSize(this.risForm)) return

      const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.showToast('Please allow pop-ups to print the RIS')
        return
      }

      const modalElement = document.getElementById('risDetailsModal')
      const print = () => this.printRIS(this.selectedRISReceipt, {
        ...this.risForm,
        signatureImages: { ...this.signatureImages },
        signatureDates: { ...this.signatureDates }
      }, printWindow)

      modalElement.addEventListener('hidden.bs.modal', print, { once: true })
      Modal.getOrCreateInstance(modalElement).hide()
    },

    getPrintPageSize(details) {
      if (details.paperSize === 'short') return { width: 8.5, height: 11 }
      if (details.paperSize !== 'custom') return { width: 8.5, height: 13 }

      const width = Number(details.paperWidth)
      const height = Number(details.paperHeight)
      if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
        this.showToast('Enter a valid custom paper width and height of at least 1 inch.')
        return null
      }
      return { width, height }
    },

    printReceipt(receipt, details = {}, targetWindow = null) {
      const pageSize = this.getPrintPageSize(details)
      if (!pageSize) return

      const item = this.getReceiptItem(receipt)
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href

      const receiptType = this.escapeHtml(receipt.receipt_type || 'PAR')
      const receiptNumber = this.escapeHtml(receipt.receipt_number || '-')
      const personnelName = this.escapeHtml(details.receivedBy || this.getIssuedToName(receipt))
      const description = this.escapeHtml(item.description || '-')
      const quantity = this.escapeHtml(receipt.quantity ?? 1)
      const propertyNumber = this.escapeHtml(item.property_number || '-')
      const modelNumber = this.escapeHtml(item.model_number || '-')
      const serialNumber = this.escapeHtml(item.serial_number || '-')
      const dateAcquired = this.escapeHtml(item.acquisition_date || item.date_acquired || '-')
      const dateIssued = this.escapeHtml(receipt.date_issued || '-')
      const signatureImageMarkup = key =>
        details.signatureImages?.[key] ? `<img class="receipt-signature-image" src="${this.escapeHtml(details.signatureImages[key])}" alt="Signature">` : ''
      const responsibilityCenter = this.escapeHtml(details.unitOffice || item.responsibility_center || '-')
      const cost = Number(item.cost || 0)
      const amount = this.formatAmount(cost * Number(receipt.quantity ?? 1))
      const remarks = this.escapeHtml(details.purpose || receipt.remarks || '-')

      const printWindow = targetWindow || window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.showToast('Please allow pop-ups to print the receipt')
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${receiptType} - ${receiptNumber}</title>
          <style>
            @page { size: ${pageSize.width}in ${pageSize.height}in portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
            .page { width: 100%; min-height: calc(${pageSize.height}in - 16mm); padding: 5px; display: flex; flex-direction: column; }
            .header { display: grid; grid-template-columns: 72px 1fr; align-items: center; text-align: center; min-height: 72px; }
            .logo-box { height: 72px; display: flex; align-items: center; justify-content: center; }
            .logo { width: 58px; height: 58px; object-fit: contain; }
            .header-text { line-height: 1.25; padding: 3px; }
            .header-text p { margin: 1px 0; }
            .header h1 { margin: 1px 0; font-size: 14px; color: #000; font-weight: bold; }
            .header h2 { margin: 1px 0; font-size: 10px; color: #000; font-weight: normal; }
            .header p { margin: 1px 0; font-size: 10px; }
            .appendix { text-align: right; margin-top: 4px; font-size: 9px; font-weight: bold; }
            .receipt-title { text-align: center; color: #000; font-size: 14px; font-weight: bold; padding: 6px 0; margin: 0; }
            .receipt-title span { color: #000; }
            .receipt-info { display: grid; grid-template-columns: 1fr 1fr; margin: 0; font-size: 10px; font-weight: normal; }
            .fund-cluster, .par-number { display: flex; align-items: center; gap: 6px; padding: 6px; min-height: 28px; }
            .fund-cluster span, .par-number span { display: inline-block; flex: 1; padding: 2px 4px; font-weight: normal; min-width: 0; }
            .par-number span { color: #b22222; font-weight: bold; }
            .main-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 0; }
            .main-table th, .main-table td { border: 0; padding: 4px; vertical-align: middle; overflow-wrap: anywhere; }
            .main-table th { background: #fff; color: #000; text-align: center; font-size: 9px; font-weight: bold; border-bottom: 0.5px solid #000; }
            .main-table td { height: 35px; font-size: 9px; }
            .main-table tbody tr:first-child td { border-bottom: 0.5px solid #000; }
            .sn { width: 6%; text-align: center; }
            .qty { width: 5%; text-align: center; }
            .article { width: 24%; }
            .property { width: 13%; text-align: center; }
            .model { width: 12%; text-align: center; }
            .serial { width: 12%; text-align: center; }
            .date { width: 12%; text-align: center; }
            .amount { width: 16%; text-align: right; }
            .total-row td { height: 28px; font-weight: bold; }
            .total-label, .total-amount { color: #b22222; font-weight: bold; }
            .total-label { text-align: right; }
            .total-amount { text-align: right; background: #ffeb3b; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .lower-details { display: grid; grid-template-columns: 1fr 1fr; }
            .lower-left, .lower-right { padding: 7px; min-height: 125px; }
            .lower-details p { margin: 0 0 7px; line-height: 1.25; }
            .lower-details strong { color: #000; }
            .print-footer { width: 100%; margin: auto 0 0; padding-bottom: 0; }
            .page-number { margin: 0 2px 5px; text-align: right; font-size: 8px; }
            .signature { display: grid; grid-template-columns: 38% 38%; justify-content: space-between; gap: 12px; min-height: 78px; border-top: 1px solid #000; padding: 5px 0 0; }
            .signature-box { display: flex; flex-direction: column; font-size: 9px; }
            .signature-heading { font-weight: bold; }
            .signature-name { margin-top: 18px; text-align: center; font-weight: bold; }
            .receipt-signature-image { display: block; width: 100%; height: 28px; object-fit: contain; }
            .signature-box.has-signature .signature-name { margin-top: 0; }
            .signature-label, .signature-date { text-align: center; }
            .signature-label { margin-top: 2px; }
            .signature-date { margin-top: 2px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="logo-box"><img class="logo" src="${logoUrl}" alt="NVSU Logo"></div>
              <div class="header-text">
                <p>Republic of the Philippines</p>
                <h1>NUEVA VIZCAYA STATE UNIVERSITY</h1>
                <h2>3702 Bambang, Nueva Vizcaya</h2>
              </div>
            </div>
            <div class="appendix">APPENDIX ${this.escapeHtml(details.appendix || '71')}</div>
            <div class="receipt-title">
              <span>${receipt.receipt_type === 'ICS' ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT'}</span>
            </div>
            <div class="receipt-info">
              <div class="fund-cluster"><strong>FUND CLUSTER:</strong> <span>${this.escapeHtml(details.fundCluster || 'TF-2')}</span></div>
              <div class="par-number"><strong>${receiptType} No.</strong> <span>${receiptNumber}</span></div>
            </div>
            <table class="main-table">
              <thead>
                <tr>
                  <th class="sn">SN</th><th class="qty">Qty.</th><th class="article">Article and Description</th>
                  <th class="property">Property Number</th><th class="model">Model Number</th>
                  <th class="serial">Serial Number</th><th class="date">Date Acquired</th><th class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="sn">1</td><td class="qty">${quantity}</td><td class="article">${description}</td>
                  <td class="property">${propertyNumber}</td><td class="model">${modelNumber}</td>
                  <td class="serial">${serialNumber}</td><td class="date">${dateAcquired}</td><td class="amount">${amount}</td>
                </tr>
                <tr class="total-row"><td colspan="7" class="total-label">Total</td><td class="total-amount">${amount}</td></tr>
              </tbody>
            </table>
            <div class="lower-details">
              <div class="lower-left">
                <p><strong>UNIT/OFFICE:</strong> ${this.escapeHtml(details.unitOffice || responsibilityCenter || '-')}</p>
                <p><strong>PO NO.:</strong> ${this.escapeHtml(details.poNumber || '-')}</p>
                <p><strong>UACS:</strong> ${this.escapeHtml(details.uacs || '-')}</p>
                <p><strong>BUR NO.:</strong> ${this.escapeHtml(details.burNumber || '-')}</p>
                <p><strong>IAR NO.:</strong> ${this.escapeHtml(details.iarNumber || '-')}</p>
              </div>
              <div class="lower-right"><p><strong>PURPOSE:</strong></p><p>${remarks}</p></div>
            </div>
            <div class="print-footer">
              <div class="page-number">Page 1 of 1</div>
              <div class="signature">
                <div class="signature-box${details.signatureImages?.receivedBy ? ' has-signature' : ''}">
                  <div class="signature-heading">RECEIVED BY</div>
                  ${signatureImageMarkup('receivedBy')}
                  <div class="signature-name">${personnelName}</div>
                  <div class="signature-label">${this.escapeHtml(details.receivedByDesignation || '')}</div>
                  <div class="signature-label">Signature over Printed Name</div>
                  <div class="signature-date">${dateIssued}</div>
                </div>
                <div class="signature-box${details.signatureImages?.receivedFrom ? ' has-signature' : ''}">
                  <div class="signature-heading">RECEIVED FROM:</div>
                  ${signatureImageMarkup('receivedFrom')}
                  <div class="signature-name">${this.escapeHtml(details.receivedFrom || '-')}</div>
                  <div class="signature-label">${this.escapeHtml(details.receivedFromDesignation || '')}</div>
                  <div class="signature-label">Signature over Printed Name</div>
                  <div class="signature-date">${dateIssued}</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onafterprint = function () { window.close() }
            window.onload = function () {
              const logo = document.querySelector('.logo')
              if (logo && !logo.complete) {
                logo.onload = function () { window.print() }
                logo.onerror = function () { window.print() }
              } else {
                window.print()
              }
            }
          <\/script>
        </body>
        </html>
      `)
      printWindow.document.close()
    },

    printRIS(receipt, details = {}, targetWindow = null) {
      const pageSize = this.getPrintPageSize(details)
      if (!pageSize) return
      const item = this.getReceiptItem(receipt)
      const request = receipt.item_requests || {}
      const office = request.offices || receipt.offices || {}
      const escape = value => this.escapeHtml(value === null || value === undefined || value === '' ? '-' : value)
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href
      const signatureImageMarkup = key =>
        details.signatureImages?.[key] ? `<img class="print-signature" src="${details.signatureImages[key]}" alt="Signature">` : ''
      
      const printWindow = targetWindow || window.open('', '_blank', 'popup=yes,width=1100,height=900,resizable=yes,scrollbars=yes')
      if (!printWindow) {
        this.showToast('Please allow pop-ups to print the RIS')
        return
      }

      const receiptNumber = escape(receipt.receipt_number)
      const officeName = escape(details.officeName || office.office_name || request.office_name || receipt.office_name)
      const division = escape(details.division || request.division || receipt.division)
      const responsibilityCenter = escape(request.responsibility_center || receipt.responsibility_center || item.responsibility_center)
      const fundCluster = escape(details.fundCluster || request.fund_cluster || receipt.fund_cluster)
      const description = escape(item.description || request.item_description)
      const stockNumber = escape(item.stock_number || item.property_number || item.stock_no)
      const quantityRequested = escape(request.quantity ?? request.quantity_requested ?? receipt.quantity_requested ?? receipt.quantity)
      const quantityIssued = escape(this.getQuantityIssued(receipt) || request.quantity_issued || request.quantity || '-')
      
      const requestedQuantity = Number(request.quantity ?? request.quantity_requested ?? receipt.quantity_requested ?? this.getQuantityIssued(receipt))
      const availableQuantity = Number(item.quantity_available ?? item.quantity ?? item.stock_balance)
      const stockWasAvailableWhenIssued = ['Issued', 'Delivered'].includes(receipt.status) || request.status === 'Delivered'
      const stockIsAvailable = stockWasAvailableWhenIssued || (item.status === 'Available' && Number.isFinite(availableQuantity) && Number.isFinite(requestedQuantity) && availableQuantity >= requestedQuantity)
      
      const purpose = escape(details.purpose || request.purpose || receipt.purpose || request.remarks)
      const remarks = escape(receipt.remarks || request.remarks)

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>RIS - ${receiptNumber}</title>
          <style>
            @page { size: ${pageSize.width}in ${pageSize.height}in portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            :root { --font-xxs: 11px; --font-xs: 12px; --font-sm: 13px; --font-md: 14px; --font-lg: 15px; --font-xl: 18px; }
            body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: var(--font-md); margin: 0; }
            .header-frame { border: 0.5px solid #000; margin-bottom: 0; }
            .letterhead { display: grid; grid-template-columns: 80px 1fr; align-items: center; text-align: center; min-height: 106px; }
            .logo-box { border-right: 0.5px solid #000; height: 100%; min-height: 106px; display: flex; align-items: center; justify-content: center; }
            .logo { width: 58px; height: 58px; object-fit: contain; }
            .letterhead-text { align-self: stretch; display: flex; flex-direction: column; justify-content: center; line-height: 1.25; padding: 5px 8px 0; }
            .letterhead-text p { margin: 1px 0; }
            .school-name { font-size: var(--font-xl); font-weight: bold; }
            .document-title { text-align: center; font-size: var(--font-xl); font-weight: bold; margin: 5px -8px 0; padding: 5px 4px; border-top: 0.5px solid #000; }
            .content-frame { border-bottom: 0.5px solid #000; padding: 0; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 0.5px solid #000; padding: 4px 6px; vertical-align: middle; overflow-wrap: anywhere; }
            th { text-align: center; font-weight: bold; }
            .ris-number-table { width: 100%; border-collapse: collapse; border: none; }
            .ris-number-table td { height: 34px; text-align: right; padding: 4px 12px; border-top: 0.5px solid #000; border-bottom: 0.5px solid #000; border-left: none; border-right: none; font-size: var(--font-lg); }
            .meta { width: 100%; border-collapse: collapse; }
            .meta td { height: 23px; border: 0.5px solid #000; font-size: var(--font-md); }
            .items { margin-top: 0; border-collapse: collapse; }
            .items th { height: 29px; border: 0.5px solid #000; font-size: var(--font-sm); }
            .items td { height: 30px; border: 0.5px solid #000; font-size: var(--font-sm); }
            .center { text-align: center; }
            .sign-table { margin: 0; border-collapse: collapse; table-layout: fixed; }
            .sign-table td { border: 0.5px solid #000; padding: 4px 6px; vertical-align: middle; font-size: var(--font-md); }
            .sign-table .sign-label { text-align: left; font-weight: normal; font-size: var(--font-md); }
            .sign-table .purpose-row td { height: 38px; }
            .sign-table .purpose-value { text-align: left; font-size: var(--font-md); }
            .sign-table .sign-head-row td { height: 44px; vertical-align: top; text-align: left; font-size: var(--font-md); }
            .sign-table .blank-cell { border-top: 0.5px solid #000; }
            .sign-table .signature-row td { height: 40px; }
            .print-signature { display: block; max-width: 100px; max-height: 34px; object-fit: contain; margin: 0 auto; }
            .sign-table .name-row td { height: 26px; }
            .sign-table .sign-name { text-align: center; font-weight: bold; text-transform: uppercase; }
            .sign-table .title-row td { height: 26px; }
            .sign-table .sign-title { text-align: center; font-style: italic; font-size: calc(var(--font-md) - 2px); }
            .sign-table .date-row td { height: 26px; }
            .small { font-size: 13px; }
            .instructions { margin-top: 0; border-top: 0.5px solid #000; padding: 5px 6px; font-size: 11px; line-height: 1.2; }
            .instructions-title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 4px; }
            .instructions p { margin: 0 0 3px; }
            .instructions .copies { margin-left: 10px; }
            .form-code { margin-top: 3px; font-weight: bold; }
            .page-footer { position: fixed; right: 0; bottom: 0; padding-top: 4px; font-size: 12px; text-align: right; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header-frame">
            <div class="letterhead">
              <div class="logo-box"><img class="logo" src="${logoUrl}" alt="NVSU Logo"></div>
              <div class="letterhead-text">
                <p>Republic of the Philippines</p>
                <p class="school-name">NUEVA VIZCAYA STATE UNIVERSITY</p>
                <p>3702 Bambang, Nueva Vizcaya</p>
                <div class="document-title">REQUISITION AND ISSUE SLIP (RIS)</div>
              </div>
            </div>
          </div>
          <div class="content-frame">
            <table class="ris-number-table">
              <tbody><tr><td><strong>RIS No.:</strong> ${receiptNumber}</td></tr></tbody>
            </table>
            <table class="meta">
              <tbody>
                <tr>
                  <td colspan="3"><strong>Fund Cluster:</strong> ${fundCluster}</td>
                  <td colspan="3"><strong>Responsibility Center Code:</strong> ${responsibilityCenter}</td>
                </tr>
                <tr>
                  <td colspan="3"><strong>Division:</strong> ${division}</td>
                  <td colspan="3"><strong>Office:</strong> ${officeName}</td>
                </tr>
              </tbody>
            </table>
            <table class="items">
              <colgroup>
                <col style="width: 9%"><col style="width: 31%"><col style="width: 8%">
                <col style="width: 7%"><col style="width: 7%"><col style="width: 8%"><col style="width: 30%">
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2">Stock #</th><th rowspan="2">Description</th><th rowspan="2">QTY</th>
                  <th colspan="2">Stock Available?</th><th colspan="2">Issue</th>
                </tr>
                <tr><th>Yes</th><th>No</th><th>QTY</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td class="center">${stockNumber}</td>
                  <td>${description}</td>
                  <td class="center">${quantityRequested}</td>
                  <td class="center">${stockIsAvailable ? '✓' : ''}</td>
                  <td class="center">${stockIsAvailable ? '' : '✓'}</td>
                  <td class="center">${quantityIssued}</td>
                  <td>${remarks}</td>
                </tr>
                <tr><td colspan="7" class="center"><strong>***Nothing Follows***</strong></td></tr>
              </tbody>
            </table>
            <table class="sign-table">
              <colgroup>
                <col style="width: 20%"><col style="width: 20%"><col style="width: 20%">
                <col style="width: 20%"><col style="width: 20%">
              </colgroup>
              <tbody>
                <tr class="purpose-row">
                  <td class="sign-label">Purpose:</td>
                  <td colspan="4" class="purpose-value">${purpose}</td>
                </tr>
                <tr class="sign-head-row">
                  <td class="blank-cell"></td>
                  <td><strong>Requested by:</strong></td>
                  <td><strong>Approved by:</strong></td>
                  <td><strong>Issued by:</strong></td>
                  <td><strong>Received by:</strong></td>
                </tr>
                <tr class="signature-row">
                  <td class="sign-label">Signature:</td>
                  <td>${signatureImageMarkup('requestedBy')}</td>
                  <td>${signatureImageMarkup('approvedBy')}</td>
                  <td>${signatureImageMarkup('issuedBy')}</td>
                  <td>${signatureImageMarkup('receivedByRIS')}</td>
                </tr>
                <tr class="name-row">
                  <td class="sign-label">Printed Name:</td>
                  <td class="sign-name">${escape(details.requestedBy)}</td>
                  <td class="sign-name">${escape(details.approvedBy)}</td>
                  <td class="sign-name">${escape(details.issuedBy)}</td>
                  <td class="sign-name">${escape(details.receivedBy)}</td>
                </tr>
                <tr class="title-row">
                  <td class="sign-label">Title:</td>
                  <td class="sign-title">${escape(details.requestedDesignation)}</td>
                  <td class="sign-title">${escape(details.approvedDesignation)}</td>
                  <td class="sign-title">${escape(details.issuedDesignation)}</td>
                  <td class="sign-title">${escape(details.receivedDesignation)}</td>
                </tr>
                <tr class="date-row">
                  <td class="sign-label">Date:</td>
                  <td>${escape(details.signatureDates?.requestedBy || '')}</td>
                  <td>${escape(details.signatureDates?.approvedBy || '')}</td>
                  <td>${escape(details.signatureDates?.issuedBy || '')}</td>
                  <td>${escape(details.signatureDates?.receivedByRIS || '')}</td>
                </tr>
              </tbody>
            </table>
            <div class="instructions">
              <div class="instructions-title">INSTRUCTIONS</div>
              <p><strong>A.</strong> The RIS shall be prepared by the authorized officer or employee to request needed Property/Supply, by the Supervisor of the requesting unit to approve the request, by the Property/Supply Custodian to verify the availability of stocks and issuance of the item/s, and by the end user or authorized personnel of the requesting unit to receive the item/s as an accountable/responsible officer or employee.</p>
              <p><strong>B.</strong> For requested item/s other than the category of consumable property/supply, the approved RIS (GAM Appendix 63) shall be the basis of the SMO Staff in preparing and processing the Inventory Custodian Slip (GAM Appendix 69) for semi-expendable property and/or Property Acknowledgement Receipt (GAM Appendix 71) for non-expendable property prior to issuance if the item/s is available on stock; and</p>
              <p><strong>C.</strong> This form shall be prepared in three (3) copies and in 8.5" x 13" paper. It will be distributed as follows:</p>
              <div class="copies">Original - Accounting Office</div>
              <div class="copies">Copy 2 - Requesting Office</div>
              <div class="copies">Copy 3 - Supply Management Office</div>
              <div class="form-code">NVSU-FR-SMO-08-00 (031022)</div>
            </div>
            <div class="page-footer">Page 1 of 1</div>
          </div>
          <script>
            window.onafterprint = function () { window.close() }
            window.onload = function () {
              const logo = document.querySelector('.logo')
              if (logo && !logo.complete) {
                logo.onload = function () { window.print() }
                logo.onerror = function () { window.print() }
              } else {
                window.print()
              }
            }
          <\/script>
        </body>
        </html>
      `)
      printWindow.document.close()
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

.receipt-print-details-form .modal-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.receipt-print-details-form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.table th {
  white-space: nowrap;
}

.table td {
  vertical-align: middle;
}

.receipt-table-header th {
  background-color: #2f5d3a;
  color: #fff;
  white-space: nowrap;
}

.receipt-table-header th.sortable {
  cursor: pointer;
  user-select: none;
}

.receipt-table-header th.sortable:hover {
  background-color: #244a2e;
}

.card {
  border-color: #e4e2d8;
  border-radius: 8px;
  box-shadow: none;
}

@media (max-width: 576px) {
  .modal-dialog {
    max-width: calc(100% - 1rem);
    margin: 0.5rem auto;
  }
}
</style>