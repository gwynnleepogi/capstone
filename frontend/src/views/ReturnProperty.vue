<template>
  <div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <div>
        <h2>Return Property</h2>
        <p class="text-muted mb-0">
          Submit unserviceable properties for return and monitor the status of your submitted return requests.
        </p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
      <button type="button" class="btn btn-warning d-flex align-items-center gap-2" @click="openPropertySelectionModal">
        <i class="bi bi-arrow-return-left"></i>
        Request to Return Property
      </button>
      </div>
    </div>

    <!-- Property selection modal -->
    <div v-if="showPropertySelectionModal" class="return-overlay" tabindex="-1" @keydown.esc="closePropertySelectionModal">
      <section class="return-dialog return-selection-dialog card" role="dialog" aria-modal="true" aria-labelledby="property-selection-title">
        <div class="card-header bg-white d-flex justify-content-between align-items-center gap-2">
          <div>
            <strong id="property-selection-title">Property issued to you</strong>
            <div class="small text-muted">Select the properties you want to return.</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-warning btn-sm" :disabled="selectedEligible.length === 0 || loading" @click="openReturnForm">
              Return Selected ({{ selectedEligible.length }})
            </button>
            <button type="button" class="btn-close" aria-label="Close" @click="closePropertySelectionModal"></button>
          </div>
        </div>
        <div class="card-body p-0 overflow-auto">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="text-center">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      aria-label="Select all eligible properties"
                      :checked="allEligibleSelected"
                      :disabled="eligible.length === 0"
                      @change="selectAllEligible($event.target.checked)"
                    />
                  </th>
                  <th>Property No.</th>
                  <th>Property</th>
                  <th>Serial No.</th>
                  <th>Receipt No.</th>
                  <th>Qty</th>
                  <th>Date Issued</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center text-muted py-4">Loading...</td>
                </tr>
                <tr v-else-if="!eligible.length">
                  <td colspan="7" class="text-center text-muted py-4">
                    You have no issued property that can be returned.
                  </td>
                </tr>
                <tr v-for="receipt in eligible" :key="receipt.id">
                  <td class="text-center">
                    <input
                      v-model="selectedReceiptIds"
                      type="checkbox"
                      class="form-check-input"
                      :value="String(receipt.id)"
                      :aria-label="'Select ' + (receipt.items?.description || 'property')"
                    />
                  </td>
                  <td>{{ receipt.items?.property_number || '-' }}</td>
                  <td>{{ receipt.items?.description || '-' }}</td>
                  <td>{{ receipt.items?.serial_number || '-' }}</td>
                  <td>{{ receipt.receipt_number || '-' }}</td>
                  <td>{{ receipt.quantity }}</td>
                  <td>{{ formatDate(receipt.date_issued) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- My Return Requests -->
    <div class="card mb-4">
      <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>My Return Requests</strong>
          <div class="small text-muted">Returns you have submitted for unserviceable properties.</div>
        </div>
        <span class="badge bg-secondary">{{ requests.length }} request(s)</span>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Requested</th>
              <th>Property</th>
              <th>Condition</th>
              <th>Reason</th>
              <th>Properties For</th>
              <th>Status</th>
              <th>Property Office Note</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center text-muted py-4">Loading return requests...</td>
            </tr>
            <tr v-else-if="!requests.length">
              <td colspan="8" class="text-center text-muted py-4">
                You have not submitted any return requests yet.
              </td>
            </tr>
            <tr v-for="request in requests" :key="request.id">
              <td class="text-nowrap">{{ formatDate(request.created_at) }}</td>
              <td>
                {{ request.items?.description || '-' }}
                <div class="small text-muted">{{ request.items?.property_number || '' }}</div>
              </td>
              <td>{{ request.status === 'Accepted' && request.condition_after_return
                ? request.condition_after_return
                : request.condition_declared }}</td>
              <td>{{ request.return_reason || '-' }}</td>
              <td>{{ request.return_purpose || '-' }}</td>
              <td>
                <span class="badge" :class="statusClass(request.status)">{{ request.status }}</span>
              </td>
              <td>{{ request.review_remarks || '-' }}</td>
              <td class="text-end text-nowrap">
                <button type="button" class="btn btn-sm btn-outline-success me-1" @click="downloadReturnPaperwork(request)">
                  <i class="bi bi-download me-1"></i>Download ARRP
                </button>
                <button v-if="request.status === 'Pending'" type="button" class="btn btn-sm btn-outline-danger"
                  :disabled="busyId === request.id" @click="cancelRequest(request)">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Return form -->
    <div v-if="showForm" class="return-overlay" tabindex="-1" @keydown.esc="closeForm">
      <section class="return-dialog card" role="dialog" aria-modal="true" aria-labelledby="return-title">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <strong id="return-title">Request to Return Property</strong>
          <button type="button" class="btn-close" aria-label="Close" @click="closeForm"></button>
        </div>

        <form class="return-form" @submit.prevent="submitReturn">
          <div class="card-body">
            <div class="alert alert-light border">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>Selected properties to return</strong>
                <span class="badge bg-warning text-dark">{{ selectedReceipts.length }} selected</span>
              </div>
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead><tr><th>Property No.</th><th>Property</th><th>Serial No.</th><th>Receipt No.</th><th>Qty</th></tr></thead>
                  <tbody>
                    <tr v-for="receipt in selectedReceipts" :key="receipt.id">
                      <td>{{ receipt.items?.property_number || '-' }}</td>
                      <td>{{ receipt.items?.description || '-' }}</td>
                      <td>{{ receipt.items?.serial_number || '-' }}</td>
                      <td>{{ receipt.receipt_number || '-' }}</td>
                      <td>{{ receipt.quantity }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Properties for <span class="text-muted">(Optional)</span></label>
              <div class="border rounded p-3 mb-3">
                <div class="form-check mb-2"><input id="purpose-reissue" v-model="form.return_purpose" class="form-check-input" type="radio" value="Property Utilization/Re-issuance" /><label class="form-check-label" for="purpose-reissue">Property Utilization / Re-issuance</label></div>
                <div class="form-check mb-2"><input id="purpose-repair" v-model="form.return_purpose" class="form-check-input" type="radio" value="Repair" /><label class="form-check-label" for="purpose-repair">Repair</label></div>
                <div class="form-check"><input id="purpose-disposal" v-model="form.return_purpose" class="form-check-input" type="radio" value="Disposal" /><label class="form-check-label" for="purpose-disposal">Disposal</label></div>
              </div>
              <label class="form-label">Return Date <span class="text-danger">*</span></label>
              <input v-model="form.return_date" type="date" class="form-control" required />
            </div>

            <div class="mb-3">
              <label class="form-label">Condition</label>
              <div class="form-control bg-light" aria-readonly="true">
                Unserviceable
              </div>
              <div class="form-text">All returned properties are recorded as unserviceable.</div>
            </div>

            <div>
              <label class="form-label">Reason for Unserviceable Condition <span class="text-danger">*</span></label>
              <textarea
                v-model.trim="form.remarks"
                class="form-control"
                rows="2"
                maxlength="1000"
                placeholder="Explain why this property is unserviceable."
                required
              ></textarea>
            </div>
          </div>

          <div class="card-footer bg-white text-end">
            <button type="button" class="btn btn-outline-secondary me-2" @click="closeForm">
              Cancel
            </button>
            <button type="submit" class="btn btn-warning" :disabled="saving">
              {{ saving ? 'Sending...' : 'Send Return Request' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import {
  AlignmentType, BorderStyle, Document as DocxDocument, ImageRun,
  Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  VerticalAlign, VerticalMergeType, WidthType,
} from 'docx'
import logo from '@/assets/LOGO.png'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default {
  name: 'ReturnProperty',

  data() {
    return {
      eligible: [],
      requests: [],
      selectedReceiptIds: [],
      selectedReceipts: [],
      loading: true,
      saving: false,
      busyId: null,
      showForm: false,
      showPropertySelectionModal: false,
      selected: null,
      form: {
        return_date: today(),
        return_purpose: '',
        condition_declared: 'Unserviceable',
        remarks: ''
      }
    }
  },

  computed: {
    selectedEligible() {
      return this.eligible.filter(receipt =>
        this.selectedReceiptIds.includes(String(receipt.id))
      )
    },

    allEligibleSelected() {
      return this.eligible.length > 0 &&
        this.eligible.every(receipt => this.selectedReceiptIds.includes(String(receipt.id)))
    }
  },

  mounted() {
    this.loadAll()
  },

  methods: {
    toast(message) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: message }))
    },

    async request(url, options) {
      const response = await fetch(url, options)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      return data
    },

    async loadAll() {
      this.loading = true

      try {
        const [eligible, requests] = await Promise.all([
          this.request('/api/return-requests/eligible'),
          this.request('/api/return-requests/mine')
        ])

        this.eligible = Array.isArray(eligible) ? eligible : []
        this.requests = Array.isArray(requests) ? requests : []
        const availableIds = this.eligible.map(receipt => String(receipt.id))
        this.selectedReceiptIds = this.selectedReceiptIds.filter(id => availableIds.includes(id))
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.loading = false
      }
    },

    openPropertySelectionModal() {
      this.showPropertySelectionModal = true
    },

    closePropertySelectionModal() {
      this.showPropertySelectionModal = false
    },

    selectAllEligible(checked) {
      this.selectedReceiptIds = checked
        ? this.eligible.map(receipt => String(receipt.id))
        : []
    },

    openReturnForm() {
      this.selectedReceipts = this.selectedEligible.slice()
      if (!this.selectedReceipts.length) {
        this.toast('Please select at least one property to return.')
        return
      }

      this.showPropertySelectionModal = false
      this.form = {
        return_date: today(),
        return_purpose: '',
        condition_declared: 'Unserviceable',
        remarks: ''
      }
      this.showForm = true
    },

    closeForm() {
      this.showForm = false
      this.selectedReceipts = []
    },

    async submitReturn() {
      if (!this.selectedReceipts.length || this.saving) return

      this.saving = true
      let submittedCount = 0

      try {
        for (const receipt of this.selectedReceipts) {
          await this.request('/api/return-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_receipt_id: receipt.id,
              ...this.form,
              condition_declared: 'Unserviceable',
              return_reason: this.form.remarks.trim()
            })
          })
          submittedCount += 1
        }

        window.dispatchEvent(new CustomEvent('return-requests-updated'))
        this.toast(
          submittedCount === 1
            ? 'Return request sent. Please wait for the property office to review it.'
            : `${submittedCount} return requests sent. Please wait for the property office to review them.`
        )
        this.closeForm()
        this.selectedReceiptIds = []
        await this.loadAll()
      } catch (error) {
        if (submittedCount > 0) {
          window.dispatchEvent(new CustomEvent('return-requests-updated'))
          this.toast(`${submittedCount} of ${this.selectedReceipts.length} return requests were sent. The remaining items were not submitted: ${error.message}`)
          this.closeForm()
          this.selectedReceiptIds = []
          await this.loadAll()
        } else {
          this.toast(error.message)
        }
      } finally {
        this.saving = false
      }
    },

    async downloadReturnPaperwork(request) {
      const value = text => String(text ?? '').trim()
      const item = request.items || {}
      const receipt = request.property_receipts || {}
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
      for (let index = 0; index < 15; index++) {
        const first = index === 0
        const fields = [
          String(index + 1),
          first ? value(receipt.quantity) : '',
          first ? value(item.unit) : '',
          first ? value(item.description) : '',
          first ? value(item.code || item.account_code) : '',
          first ? employee : '',
          first ? value(request.return_reason) : '',
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
            'Items for     ' + check('Property Utilization/Re-issuance') +
            ' Property Utilization/Re-issuance     ' + check('Repair') +
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

    async cancelRequest(request) {
      if (!window.confirm('Cancel this return request?')) return

      this.busyId = request.id

      try {
        await this.request(`/api/return-requests/${request.id}/cancel`, { method: 'PATCH' })
        this.toast('Return request cancelled.')
        await this.loadAll()
      } catch (error) {
        this.toast(error.message)
      } finally {
        this.busyId = null
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
        : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }
}
</script>

<style scoped>
.modal-wide-return-requests {
  width: 96vw;
  max-width: 1600px;
}

@media (max-width: 767.98px) {
  .modal-wide-return-requests {
    width: calc(100% - 1rem);
    max-width: none;
    margin: 0.5rem auto;
  }
}

.return-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.45);
}

.return-dialog {
  width: min(520px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.return-selection-dialog {
  width: min(1100px, 100%);
  max-height: 90vh;
}
.return-selection-dialog .card-body {
  min-height: 0;
}

.return-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}

.return-form .card-body {
  overflow-y: auto;
}
</style>
