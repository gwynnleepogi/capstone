<template>
  <div class="card return-requests-card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <strong>Return Requests</strong>
        <span v-if="pendingCount" class="badge bg-warning text-dark ms-2">
          {{ pendingCount }} pending
        </span>
        <div class="small text-muted">
          Teachers and Non-Teaching Staff submit property return requests here. Review requests to accept or reject them.
        </div>
      </div>

      <div class="btn-group btn-group-sm" role="group" aria-label="Filter return requests">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="btn"
          :class="filter === tab ? 'btn-success' : 'btn-outline-success'"
          @click="filter = tab"
        >
          {{ tab }}
        </button>
      </div>

      <div class="d-flex flex-wrap gap-2 w-100">
        <input
          v-model.trim="search"
          type="search"
          class="form-control form-control-sm flex-grow-1"
          style="min-width: 180px"
          aria-label="Search return requests"
          placeholder="Search requester, item, receipt, or reason"
        />
        <select
          v-model="conditionFilter"
          class="form-select form-select-sm"
          style="max-width: 180px"
          aria-label="Filter by item condition"
        >
          <option value="">All conditions</option>
          <option value="Serviceable">Serviceable</option>
          <option value="Unserviceable">Unserviceable</option>
        </select>
        <input
          v-model="dateFrom"
          type="date"
          class="form-control form-control-sm"
          style="max-width: 155px"
          aria-label="Filter requests from date"
        />
        <input
          v-model="dateTo"
          type="date"
          class="form-control form-control-sm"
          style="max-width: 155px"
          aria-label="Filter requests through date"
        />
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Requested</th>
            <th>Requested By</th>
            <th>Property</th>
            <th>Receipt No.</th>
            <th>Qty</th>
            <th>Condition</th>
            <th>Reason</th>
            <th>Status</th>
            <th class="text-end">Action</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="text-center text-muted py-4">Loading...</td>
          </tr>

          <tr v-else-if="!visibleRequests.length">
            <td colspan="9" class="text-center text-muted py-4">
              {{ search || conditionFilter || dateFrom || dateTo || filter !== 'Pending'
                ? 'No matching return requests.'
                : 'No pending return requests.' }}
            </td>
          </tr>

          <tr v-for="request in visibleRequests" :key="request.id">
            <td class="text-nowrap">{{ formatDate(request.created_at) }}</td>
            <td>
              {{ request.requester?.full_name || '-' }}
              <div class="small text-muted">{{ request.offices?.office_name || '' }}</div>
            </td>
            <td>
              <div v-for="entry in request.batch_items" :key="entry.request.id">
                {{ entry.item.description || '-' }}
                <div class="small text-muted">{{ entry.item.property_number || '' }}</div>
              </div>
            </td>
            <td>
              <div v-for="entry in request.batch_items" :key="entry.request.id">
                {{ entry.receipt.receipt_number || '-' }}
              </div>
            </td>
            <td>{{ request.batch_items.reduce((total, entry) => total + Number(entry.receipt.quantity || 0), 0) }}</td>
            <td>
              {{ request.status === 'Accepted' && request.condition_after_return
                ? request.condition_after_return
                : request.condition_declared || '-' }}
            </td>
            <td>
              {{ request.return_reason || '-' }}
              <div v-if="request.remarks" class="small text-muted">{{ request.remarks }}</div>
              <div v-if="request.review_remarks" class="small text-muted">
                Review: {{ request.review_remarks }}
              </div>
            </td>
            <td>
              <span class="badge" :class="statusClass(request.status)">{{ request.status }}</span>
              <div v-if="request.reviewer" class="small text-muted">
                by {{ request.reviewer.full_name }}
              </div>
            </td>
            <td class="text-end">
              <div class="d-inline-flex gap-1">
                <button
                  v-if="request.status === 'Accepted'"
                  type="button"
                  class="btn btn-sm btn-outline-success"
                  @click="downloadReturnPaperwork(request)"
                  title="Download Acknowledgement Receipt for Returned Property"
                >
                  <i class="bi bi-download"></i> Download ARRP
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="viewRequest(request)"
                >
                  <i class="bi bi-eye me-1"></i> View Details
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  :disabled="deletingRequestId === request.id"
                  @click="openDeleteModal(request)"
                  title="Delete return request"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Return Request Details Modal -->
  <div
    class="modal fade"
    id="returnRequestDetailsModal"
    tabindex="-1"
    aria-labelledby="returnRequestDetailsModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h5 id="returnRequestDetailsModalLabel" class="modal-title">Return Request Details</h5>
            <div class="small text-muted">Review the submitted information before processing the request.</div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div v-if="selectedRequest" class="modal-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="text-muted small">Request Status</span>
            <span class="badge" :class="statusClass(selectedRequest.status)">
              {{ selectedRequest.status }}
            </span>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <div class="detail-label">Requested Date</div>
              <div>{{ formatDate(selectedRequest.created_at) }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Requested By</div>
              <div>{{ selectedRequest.requester?.full_name || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="detail-label">Selected Properties ({{ selectedRequest.batch_items?.length || 1 }})</div>
              <div v-for="entry in (selectedRequest.batch_items || [{ item: selectedRequest.items || {}, receipt: selectedRequest.property_receipts || {}, request: selectedRequest }])" :key="entry.request.id" class="border-bottom py-2">
                <div class="fw-semibold">{{ entry.item.description || '-' }}</div>
                <div class="small text-muted">Property No.: {{ entry.item.property_number || '-' }} · Receipt: {{ entry.receipt.receipt_number || '-' }} · Qty: {{ entry.receipt.quantity ?? '-' }}</div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Office</div>
              <div>{{ selectedRequest.offices?.office_name || '-' }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Return Date</div>
              <div>{{ formatDate(selectedRequest.return_date) }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Declared Condition</div>
              <div>{{ selectedRequest.condition_declared || '-' }}</div>
            </div>
            <div class="col-md-6">
              <div class="detail-label">Return Purpose</div>
              <div>{{ selectedRequest.return_purpose || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="detail-label">Reason</div>
              <div>{{ selectedRequest.return_reason || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="detail-label">Remarks</div>
              <div>{{ selectedRequest.remarks || '-' }}</div>
            </div>
            <div v-if="selectedRequest.review_remarks" class="col-12">
              <div class="detail-label">Review Remarks</div>
              <div>{{ selectedRequest.review_remarks }}</div>
            </div>
          </div>

          <div v-if="selectedRequest.status === 'Pending'" class="alert alert-info mt-4 mb-0">
            Accepting this request records the return and adds it to Returns. Rejecting it requires a reason.
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <template v-if="selectedRequest && selectedRequest.status === 'Pending'">
            <button type="button" class="btn btn-danger" :disabled="saving" @click="openRejectModal(selectedRequest)">
              Reject
            </button>
            <button type="button" class="btn btn-success" :disabled="saving" @click="acceptRequest(selectedRequest)">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ saving ? 'Accepting...' : 'Accept Return' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirm Delete Return Request Modal -->
  <div
    class="modal fade"
    id="deleteReturnRequestModal"
    tabindex="-1"
    aria-labelledby="deleteReturnRequestModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="deleteReturnRequestModalLabel" class="modal-title">Delete Return Request</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="deletingRequestId !== null"></button>
        </div>
        <div class="modal-body">
          <p class="mb-2">Are you sure you want to delete this return request?</p>
          <div v-if="requestToDelete" class="small text-muted">
            {{ requestToDelete.items?.description || 'Property' }} —
            {{ requestToDelete.status }} request
          </div>
          <div v-if="requestToDelete?.status === 'Accepted'" class="alert alert-info mt-3 mb-0">
            The accepted return record and inventory changes will be kept. Only the request entry will be deleted.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="deletingRequestId !== null">Cancel</button>
          <button type="button" class="btn btn-danger" :disabled="deletingRequestId !== null" @click="deleteRequest">
            <span v-if="deletingRequestId !== null" class="spinner-border spinner-border-sm me-1"></span>
            {{ deletingRequestId !== null ? 'Deleting...' : 'Delete Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Reject Return Request Modal -->
  <div
    class="modal fade"
    id="rejectReturnRequestModal"
    tabindex="-1"
    aria-labelledby="rejectReturnRequestModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form @submit.prevent="rejectRequest">
          <div class="modal-header">
            <h5 id="rejectReturnRequestModalLabel" class="modal-title">Reject Return Request</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-2">
              You are rejecting the return request for
              <strong>{{ selectedRequest?.items?.description || 'this property' }}</strong>.
            </p>
            <label for="returnRejectionReason" class="form-label">
              Reason for Rejection <span class="text-danger">*</span>
            </label>
            <textarea
              id="returnRejectionReason"
              v-model.trim="rejectionReason"
              class="form-control"
              rows="4"
              maxlength="1000"
              placeholder="Enter the reason for rejecting this request"
              required
            ></textarea>
            <div class="form-text">A reason is required only when rejecting a request.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="saving">
              Cancel
            </button>
            <button type="submit" class="btn btn-danger" :disabled="saving || !rejectionReason.trim()">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ saving ? 'Rejecting...' : 'Confirm Rejection' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import {
  AlignmentType, BorderStyle, Document as DocxDocument, ImageRun,
  Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  VerticalAlign, VerticalMergeType, WidthType,
} from 'docx'
import logo from '@/assets/LOGO.png'

export default {
  name: 'ReturnRequestsPanel',

  emits: ['changed'],

  data() {
    return {
      requests: [],
      selectedRequest: null,
      requestToDelete: null,
      deletingRequestId: null,
      loading: true,
      saving: false,
      filter: 'All',
      search: '',
      conditionFilter: '',
      dateFrom: '',
      dateTo: '',
      rejectionReason: '',
      tabs: ['All', 'Pending', 'Accepted', 'Rejected']
    }
  },

  computed: {
    pendingCount() {
      return this.groupedRequests.filter(request => request.status === 'Pending').length
    },

    groupedRequests() {
      const groups = new Map()

      this.requests.forEach(request => {
        const key = String(request.requested_by) + '|' + String(request.created_at)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(request)
      })

      return Array.from(groups.values()).map(batch => {
        const first = batch[0]
        const batchItems = batch.map(request => ({
          request,
          item: request.items || {},
          receipt: request.property_receipts || {}
        }))
        const statuses = [...new Set(batch.map(request => request.status))]
        return {
          ...first,
          id: first.id,
          batch_requests: batch,
          batch_items: batchItems,
          status: statuses.length === 1 ? statuses[0] : 'Pending',
          status_list: statuses
        }
      })
    },

    visibleRequests() {
      const search = this.search.toLowerCase()

      return this.groupedRequests.filter(request => {
        const statusMatches = this.filter === 'All' ||
          request.status === this.filter ||
          request.status_list.includes(this.filter)
        const condition = request.status === 'Accepted'
          ? request.condition_after_return
          : request.condition_declared
        const conditionMatches = !this.conditionFilter || condition === this.conditionFilter
        const requestDate = String(request.created_at || '').slice(0, 10)
        const fromDateMatches = !this.dateFrom || requestDate >= this.dateFrom
        const toDateMatches = !this.dateTo || requestDate <= this.dateTo
        const searchableText = [
          request.requester?.full_name,
          ...request.batch_items.flatMap(entry => [
            entry.item.description,
            entry.item.property_number,
            entry.receipt.receipt_number
          ]),
          request.return_reason,
          request.remarks,
          request.review_remarks,
          request.offices?.office_name
        ].join(' ').toLowerCase()

        return statusMatches &&
          conditionMatches &&
          fromDateMatches &&
          toDateMatches &&
          (!search || searchableText.includes(search))
      })
    }
  },

  mounted() {
    this.loadRequests()
  },

  methods: {
    toast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
    },

    async loadRequests() {
      this.loading = true

      try {
        const response = await fetch('/api/return-requests')
        const data = await response.json().catch(() => [])

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load return requests')
        }

        this.requests = Array.isArray(data) ? data : []
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.loading = false
      }
    },

    viewRequest(request) {
      this.selectedRequest = request
      const element = document.getElementById('returnRequestDetailsModal')
      if (element) Modal.getOrCreateInstance(element).show()
    },

    openDeleteModal(request) {
      if (!request || this.deletingRequestId !== null) return
      this.requestToDelete = request
      const element = document.getElementById('deleteReturnRequestModal')
      if (element) Modal.getOrCreateInstance(element).show()
    },

    async deleteRequest() {
      const request = this.requestToDelete
      if (!request || this.deletingRequestId !== null) return

      this.deletingRequestId = request.id

      try {
        const batch = request.batch_requests || [request]
        let data = {}
        for (const entry of batch) {
          const response = await fetch(`/api/return-requests/${entry.id}`, {
            method: 'DELETE'
          })
          data = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete every return request in this batch')
          }
        }

        this.closeModal('deleteReturnRequestModal')
        this.requestToDelete = null
        this.toast(data.message || 'Return request deleted.')
        await this.loadRequests()
        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.$emit('changed')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.deletingRequestId = null
      }
    },

    closeModal(id) {
      const element = document.getElementById(id)
      if (element) Modal.getOrCreateInstance(element).hide()
    },

    async downloadReturnPaperwork(request) {
      const value = text => String(text ?? '').trim()
      const batchItems = request.batch_items || [{
        item: request.items || {},
        receipt: request.property_receipts || {}
      }]
      const employee = value(request.requester?.full_name)
      const office = value(request.offices?.office_name)
      const formatDate = text => {
        if (!text) return ''
        const parsed = new Date(text + 'T00:00:00')
        return Number.isNaN(parsed.getTime()) ? value(text) : parsed.toLocaleDateString('en-PH')
      }
      const border = {
        top: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
      }
      const para = (text, options = {}) => new Paragraph({
        alignment: options.align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 210 },
        children: [new TextRun({
          text: String(text ?? ''), bold: !!options.bold,
          italics: !!options.italic, underline: options.underline ? {} : undefined,
          size: options.size || 16, font: 'Arial',
        })],
      })
      const cell = (text, width, options = {}) => new TableCell({
        width: { size: width, type: WidthType.DXA },
        borders: border,
        margins: { top: options.pad ?? 65, bottom: options.pad ?? 65, left: 65, right: 65 },
        verticalAlign: VerticalAlign.CENTER,
        children: [para(text, options)],
      })
      const row = cells => new TableRow({ children: cells })
      const makeTable = (rows, widths) => new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: widths, borders: border, rows,
      })
      const widths = [700, 850, 700, 3700, 1200, 1700, 2050]
      const headerCells = [
        'Item\nNo.', 'Qty', 'UOM', 'DESCRIPTION', 'CODE',
        'ACCOUNTABLE\nEMPLOYEE', 'REMARKS',
      ].map((heading, index) => cell(heading, widths[index], {
        bold: true, size: 13, align: AlignmentType.CENTER, pad: 40,
      }))
      const rows = [row(headerCells)]
      for (let index = 0; index < Math.max(15, batchItems.length); index++) {
        const entry = batchItems[index]
        const item = entry?.item || {}
        const receipt = entry?.receipt || {}
        const fields = [
          entry ? String(index + 1) : '',
          entry ? value(receipt.quantity) : '',
          entry ? value(item.unit) : '',
          entry ? value(item.description) : '',
          entry ? value(item.code || item.account_code) : '',
          entry ? employee : '',
          entry ? value(request.return_reason) : '',
        ]
        rows.push(row(fields.map((field, col) => cell(field, widths[col], {
          size: 13, pad: 45,
          align: [0, 1, 2, 4, 5].includes(col) ? AlignmentType.CENTER : AlignmentType.LEFT,
        }))))
      }

      try {
        const logoResponse = await fetch(logo)
        const logoBytes = new Uint8Array(await logoResponse.arrayBuffer())
        const logoCell = new TableCell({
          width: { size: 1500, type: WidthType.DXA }, borders: border,
          verticalMerge: VerticalMergeType.RESTART,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: logoBytes, transformation: { width: 30, height: 30 } })],
          })],
        })
        const header = makeTable([
          row([
            logoCell,
            new TableCell({
              width: { size: 9400, type: WidthType.DXA },
              borders: border,
              margins: { top: 35, bottom: 35, left: 65, right: 65 },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                para('Republic of the Philippines', { bold: true, size: 16, align: AlignmentType.CENTER }),
                para('NUEVA VIZCAYA STATE UNIVERSITY', { bold: true, size: 18, align: AlignmentType.CENTER }),
                para('Bambang, Nueva Vizcaya', { bold: true, size: 16, align: AlignmentType.CENTER }),
              ],
            }),
          ]),
          row([
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              borders: border,
              verticalMerge: VerticalMergeType.CONTINUE,
              children: [new Paragraph({ children: [] })],
            }),
            cell('ACKNOWLEDGEMENT RECEIPT FOR RETURNED PROPERTY', 9400, {
              bold: true, size: 18, align: AlignmentType.CENTER, pad: 40,
            }),
          ]),
        ], [1500, 9400])

        const details = makeTable([
          row([
            cell('Unit/Division/College: ' + office, 7300, { bold: true, size: 14, pad: 55 }),
            cell('Date: ' + formatDate(request.return_date), 3600, { bold: true, size: 17, pad: 100 }),
          ]),
          row([
            cell('Place of Storage', 7300, { bold: true, size: 17, pad: 100 }),
            cell('Tag No.:', 3600, { bold: true, size: 17, pad: 100 }),
          ]),
        ], [7300, 3600])

        const purpose = value(request.return_purpose)
        const check = label => purpose === label ? '☑' : '____'
        const purposeTable = makeTable([
          row([cell(
            'Items for     ' + check('Repair') +
            ' Repair     ' + check('Disposal') + ' Disposal',
            10900, { bold: true, size: 16, align: AlignmentType.CENTER, pad: 95 },
          )]),
        ], [10900])

        const signatureWidths = [2250, 4900, 1700, 2050]
        const signatureTable = makeTable([
          row([
            cell('Returned by:', 2250, { bold: true, size: 13, pad: 55 }),
            cell('(Please indicate name and affix signature)', 4900, { bold: true, italic: true, size: 14, align: AlignmentType.CENTER, pad: 100 }),
            cell('Received by:', 1700, { bold: true, size: 16, pad: 100 }),
            cell('Action Taken\n(To be filled by the\nProperty Officer)', 2050, { bold: true, size: 13, align: AlignmentType.CENTER, pad: 65 }),
          ]),
          ...[
            ['Signature:', '', ''],
            ['Printed Name:', '', 'NIMFA S. SALINAS'],
            ['Designation:', '', 'PROPERTY CUSTODIAN'],
            ['Date:', '', ''],
          ].map(fields => row([
            cell(fields[0], 2250, { bold: true, size: 13, pad: 55 }),
            cell('', 4900),
            cell(fields[2], 1700, { bold: fields[0] === 'Designation:', size: 15, align: AlignmentType.CENTER, pad: 110 }),
            cell('', 2050),
          ])),
        ], signatureWidths)

        const instructionText = [
          'The ARFRP shall be used by the accountable employee to return property under his/her custody as presented in the issued Property Acknowledgement Receipt, by the Property Custodian for the acceptance and by the Property Officer for updating of data and records;',
          'Before receipt, the property shall be inspected and accomplish the Property Checklist;',
          'This form will be duly accomplished and be the reference in preparation of Property Transfer Report (Appendix 76) by the Property Officer;',
          'The duly accomplished form will be the basis in the updating and issuance of Property Acknowledgement Receipt (Appendix 71), Inventory Tag and Property Card (Appendix 69); and',
          'This form shall be prepared in two(2) copies distributed as follows:',
        ]
        const instructions = instructionText.map((text, index) => new Paragraph({
          indent: { left: 260, hanging: 220 },
          spacing: { before: 0, after: index === 4 ? 10 : 35, line: 210 },
          children: [
            new TextRun({ text: String.fromCharCode(65 + index) + '.  ', bold: true, size: 12, font: 'Arial' }),
            new TextRun({ text, italics: index === 0, size: 14, font: 'Arial' }),
          ],
        }))
        const doc = new DocxDocument({
          sections: [{
            properties: {
              page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 400, right: 400, bottom: 400, left: 400 },
              },
            },
            children: [
              header,
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 70, after: 100 }, children: [new TextRun({ text: 'ARRP No.: __________________________', bold: true, size: 17, font: 'Arial' })] }),
              details,
              purposeTable,
              makeTable(rows, widths),
              signatureTable,
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 70 }, children: [new TextRun({ text: 'INSTRUCTIONS', bold: true, underline: {}, size: 17, font: 'Arial' })] }),
              ...instructions,
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 15, after: 0 }, children: [new TextRun({ text: 'Original – Supply and/or Property Division/Unit’s file\nCopy 2 – Accountable Employee', size: 14, font: 'Arial' })] }),
            ],
          }],
        })
        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'ARRP-' + String(request.id || 'returned-property') + '.docx'
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        this.toast('ARRP Word document downloaded.')
      } catch (error) {
        console.error('Failed to generate ARRP DOCX:', error)
        this.toast('Failed to generate the ARRP document.')
      }
    },

    async acceptRequest(request) {
      if (!request || this.saving || request.status !== 'Pending') return

      const confirmed = window.confirm(
        'Accept this property return request? The return will be recorded and added to Returns.'
      )
      if (!confirmed) return

      this.saving = true

      try {
        const batch = request.batch_requests || [request]
        for (const entry of batch) {
          const response = await fetch(`/api/return-requests/${entry.id}/accept`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_remarks: null })
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(data.error || 'Could not record every property return in this request.')
          }
        }

        this.toast('Return request accepted and added to Returns.')

        this.closeModal('returnRequestDetailsModal')
        this.selectedRequest = null

        await this.loadRequests()
        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.$emit('changed')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },

    openRejectModal(request) {
      if (!request || request.status !== 'Pending' || this.saving) return

      this.selectedRequest = request
      this.rejectionReason = ''

      const detailsModal = document.getElementById('returnRequestDetailsModal')
      if (detailsModal) {
        const instance = Modal.getOrCreateInstance(detailsModal)
        detailsModal.addEventListener('hidden.bs.modal', () => {
          const rejectModal = document.getElementById('rejectReturnRequestModal')
          if (rejectModal) Modal.getOrCreateInstance(rejectModal).show()
        }, { once: true })
        instance.hide()
      } else {
        const rejectModal = document.getElementById('rejectReturnRequestModal')
        if (rejectModal) Modal.getOrCreateInstance(rejectModal).show()
      }
    },

    async rejectRequest() {
      const request = this.selectedRequest
      const reason = this.rejectionReason.trim()

      if (!request || request.status !== 'Pending' || this.saving) return
      if (!reason) {
        this.toast('Please enter a reason for rejecting this request.')
        return
      }

      this.saving = true

      try {
        const batch = request.batch_requests || [request]
        for (const entry of batch) {
          const response = await fetch(`/api/return-requests/${entry.id}/reject`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_remarks: reason })
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(data.error || 'Could not reject every property in this request.')
          }
        }

        this.toast('Return request rejected.')

        this.closeModal('rejectReturnRequestModal')
        this.selectedRequest = null
        this.rejectionReason = ''

        await this.loadRequests()
        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.$emit('changed')
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.saving = false
      }
    },

    statusClass(status) {
      if (status === 'Accepted') return 'bg-success'
      if (status === 'Rejected') return 'bg-danger'
      if (status === 'Cancelled') return 'bg-secondary'
      return 'bg-warning text-dark'
    },

    formatDate(value) {
      if (!value) return '-'

      const date = new Date(value)

      return isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
    }
  }
}
</script>

<style scoped>
.detail-label {
  font-size: .78rem;
  color: var(--bs-secondary-color);
  margin-bottom: .2rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .02em;
}
</style>
