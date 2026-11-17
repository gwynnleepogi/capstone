<template>
  <div class="inventory-page">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h2>Inventory Movement History</h2>
          <p>Track property acquisitions, issuances and returns.</p>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label for="movement-fund-cluster">Fund Cluster</label>
          <select id="movement-fund-cluster" v-model="selectedFundCluster">
            <option value="ALL">(ALL)</option>
            <option v-for="cluster in fundClusters" :key="cluster" :value="cluster">
              {{ cluster }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="movement-date-from">Date From</label>
          <input id="movement-date-from" type="date" v-model="dateFrom">
        </div>

        <div class="filter-group">
          <label for="movement-date-to">Date To</label>
          <input id="movement-date-to" type="date" v-model="dateTo">
        </div>

        <p v-if="invalidDateRange" class="date-range-error">
          {{ dateRangeError }}
        </p>

        <div class="filter-group">
          <label>Movement Type</label>
          <select v-model="movementType">
            <option value="all">All Movements</option>
            <option value="Acquisition">Acquisition</option>
            <option value="Issuance">Issuance</option>
            <option value="Return">Return</option>
          </select>
        </div>

        <div class="filter-group search-group">
          <label>Search</label>
          <input
            type="text"
            v-model="search"
            placeholder="Property number or description"
          >
        </div>
      </div>

      <div v-if="!invalidDateRange" class="summary-section">
        <div class="summary-card">
          <span>Total Movements</span>
          <strong>{{ filteredMovements.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Acquisitions</span>
          <strong class="acq-count">{{ totalAcquired }}</strong>
        </div>
        <div class="summary-card">
          <span>Issuances</span>
          <strong class="out-count">{{ totalIssued }}</strong>
        </div>
        <div class="summary-card">
          <span>Returns</span>
          <strong class="in-count">{{ totalReturned }}</strong>
        </div>
      </div>

      <div v-if="loading" class="message">
        Loading inventory movement records...
      </div>

      <div v-else-if="errorMessage" class="message error-message">
        {{ errorMessage }}
        <button @click="loadMovements">Try Again</button>
      </div>

      <div v-else class="table-responsive table-container">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>Date</th>
              <th>Property No.</th>
              <th>Description</th>
              <th>Movement</th>
              <th>Quantity</th>
              <th>Reference</th>
              <th>Recipient / Source</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in filteredMovements" :key="item.id">
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ item.propertyNumber || 'N/A' }}</td>
              <td>{{ item.description || 'N/A' }}</td>
              <td>
                <span class="movement-badge" :class="badgeClass(item)">
                  {{ item.category }}
                </span>
              </td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.reference || 'N/A' }}</td>
              <td>{{ item.person || 'N/A' }}</td>
            </tr>

            <tr v-if="filteredMovements.length === 0">
              <td colspan="7" class="empty-message">
                No inventory movements found for the selected filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <span>{{ filteredMovements.length }} record(s)</span>

        <div class="footer-actions">
          <button
            class="print-button excel-button"
            :disabled="loading || Boolean(errorMessage) || !filteredMovements.length || invalidDateRange"
            @click="openDetailsModal('excel')"
          >
            <i class="bi bi-file-earmark-excel"></i>
            Export Excel
          </button>

          <button
            class="print-button"
            :disabled="loading || Boolean(errorMessage) || invalidDateRange || (!getReportRowCount('acquisition') && !getReportRowCount('issuance'))"
            @click="showPrintModal = true"
          >
            <i class="bi bi-printer"></i>
            Choose Report to Print
          </button>

        </div>
      </div>
    </div>

    <div
      v-if="showPrintModal"
      class="print-picker-backdrop"
      @click.self="showPrintModal = false"
      @keydown.esc="showPrintModal = false"
    >
      <section
        class="print-picker card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-picker-title"
      >
        <div class="print-picker-header">
          <div>
            <h3 id="print-picker-title">Choose a report to print</h3>
            <p>Select the report type. The current date range and fund cluster will be used.</p>
          </div>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="showPrintModal = false"
          ></button>
        </div>

        <div class="print-picker-options">
          <button
            type="button"
            class="print-option"
            :disabled="!canPrintReport('acquisition')"
            @click="printSelectedReport('acquisition')"
          >
            <span class="print-option-icon acquisition-icon">
              <i class="bi bi-box-arrow-in-down"></i>
            </span>
            <span class="print-option-copy">
              <strong>Print Acquisitions</strong>
              <small>Acquisition of Supplies and Materials</small>
              <small>{{ getReportRowCount('acquisition') }} matching record(s)</small>
            </span>
            <i class="bi bi-chevron-right"></i>
          </button>

          <button
            type="button"
            class="print-option"
            :disabled="!canPrintReport('issuance')"
            @click="printSelectedReport('issuance')"
          >
            <span class="print-option-icon issuance-icon">
              <i class="bi bi-box-arrow-up-right"></i>
            </span>
            <span class="print-option-copy">
              <strong>Print Issued</strong>
              <small>Report of Supplies and Materials Issued</small>
              <small>{{ getReportRowCount('issuance') }} matching record(s)</small>
            </span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <div class="print-picker-footer">
          <button type="button" class="close-footer-button" @click="showPrintModal = false">
            Cancel
          </button>
        </div>
      </section>
    </div>
    <div v-if="showDetailsModal" class="print-picker-backdrop" @click.self="showDetailsModal = false" @keydown.esc="showDetailsModal = false">
      <section class="print-picker card details-picker" role="dialog" aria-modal="true" aria-labelledby="movement-details-title">
        <div class="print-picker-header"><div><h3 id="movement-details-title">Report Signatory Details</h3><p>Enter the name and date for the report. A signature image is optional.</p></div><button type="button" class="btn-close" aria-label="Close" @click="showDetailsModal = false"></button></div>
        <div class="details-form">
          <div class="details-field"><label for="movement-signer-name">Printed Name</label><input id="movement-signer-name" v-model="signerName" type="text" class="form-control" placeholder="Enter full name"></div>
          <div class="details-field"><label for="movement-signer-date">Date</label><input id="movement-signer-date" v-model="signerDate" type="date" class="form-control"></div>
          <div class="details-field"><label for="movement-signer-signature">Picture of Signature <span class="optional-label">(Optional)</span></label><input id="movement-signer-signature" type="file" class="form-control" accept="image/png,image/jpeg" @change="handleSignatureUpload"><small class="text-muted">Upload an image file.</small><div v-if="signerSignature" class="signature-preview"><img :src="signerSignature" alt="Signature preview"><button type="button" class="btn btn-sm btn-outline-danger" @click="signerSignature = ''">Remove</button></div></div>
        </div>
        <div class="print-picker-footer details-footer"><button type="button" class="close-footer-button secondary-button" @click="showDetailsModal = false">Cancel</button><button type="button" class="close-footer-button" @click="continueReportAction">{{ detailsAction === 'excel' ? 'Download Excel' : 'Continue to Print' }}</button></div>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InventoryMovementHistory',


  data() {
    return {
      movements: [],
      loading: false,
      errorMessage: '',
      dateFrom: '',
      dateTo: '',
      selectedFundCluster: 'ALL',

      fundClusters: [
        'AF-1', 'AF-2', 'AF-3', 'AF-DBM PS/BID',
        'GF-1', 'GF-2', 'GF-3', 'GF-DBM PS/BID',
        'RF-1', 'RF-2', 'RF-DBM PS/BID',
        'STF-1', 'STF-2', 'STF-3', 'STF-DBM PS/BID',
        'TF-1', 'TF-2', 'TF-3', 'TF-DBM PS/BID',
        'TR-1', 'TR-2', 'TR-DBM PS/BID'
      ],

      movementType: 'all',
      reportToPrint: 'acquisition',
      search: '',
      showPrintModal: false,
      showDetailsModal: false,
      detailsAction: 'print',
      signerName: '',
      signerDate: '',
      signerSignature: ''
    };
  },

  computed: {
    invalidDateRange() {
      return !this.dateFrom || !this.dateTo || this.dateFrom > this.dateTo;
    },

    dateRangeError() {
      if (!this.dateFrom || !this.dateTo) {
        return 'Choose both a start date and an end date.';
      }

      return 'The start date must be on or before the end date.';
    },

    filteredMovements() {
      if (this.invalidDateRange) {
        return [];
      }

      let result = this.movements.filter(item => {
        return item.date >= this.dateFrom && item.date <= this.dateTo;
      });

      if (this.selectedFundCluster !== 'ALL') {
        result = result.filter(item => {
          return String(item.fundCluster || '').trim().toUpperCase() ===
            this.selectedFundCluster.toUpperCase();
        });
      }

      if (this.movementType !== 'all') {
        result = result.filter(item => item.category === this.movementType);
      }

      if (this.search.trim()) {
        const keyword = this.search.toLowerCase().trim();

        result = result.filter(item => {
          return (
            String(item.propertyNumber || '').toLowerCase().includes(keyword) ||
            String(item.description || '').toLowerCase().includes(keyword) ||
            String(item.category || '').toLowerCase().includes(keyword) ||
            String(item.reference || '').toLowerCase().includes(keyword) ||
            String(item.person || '').toLowerCase().includes(keyword) ||
            String(item.name || '').toLowerCase().includes(keyword) ||
            String(item.destination || '').toLowerCase().includes(keyword)
          );
        });
      }

      return result.slice().sort((a, b) => b.date.localeCompare(a.date));
    },

    printRows() {
      if (this.invalidDateRange) {
        return [];
      }

      const category = this.reportToPrint === 'issuance'
        ? 'Issuance'
        : 'Acquisition';

      let result = this.movements.filter(item => {
        return (
          item.category === category &&
          item.date >= this.dateFrom &&
          item.date <= this.dateTo
        );
      });

      if (this.selectedFundCluster !== 'ALL') {
        result = result.filter(item => {
          return String(item.fundCluster || '').trim().toUpperCase() ===
            this.selectedFundCluster.toUpperCase();
        });
      }

      return result.slice().sort((a, b) => {
        return a.date.localeCompare(b.date) ||
          String(a.reference || '').localeCompare(String(b.reference || ''));
      });
    },

    totalAcquired() {
      return this.filteredMovements
        .filter(item => item.category === 'Acquisition')
        .reduce((total, item) => total + Number(item.quantity || 0), 0);
    },

    totalIssued() {
      return this.filteredMovements
        .filter(item => item.category === 'Issuance')
        .reduce((total, item) => total + Number(item.quantity || 0), 0);
    },

    totalReturned() {
      return this.filteredMovements
        .filter(item => item.category === 'Return')
        .reduce((total, item) => total + Number(item.quantity || 0), 0);
    }
  },

  mounted() {
    this.setDefaultDates();
    this.loadMovements();
  },

  methods: {
    openDetailsModal(action) {
      this.detailsAction = action;
      this.signerDate = this.toDateString(new Date());
      this.signerSignature = '';
      this.showDetailsModal = true;
    },

    continueReportAction() {
      if (!this.signerName.trim()) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please enter the printed name.'
        }));
        return;
      }

      if (!this.signerDate) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please enter the date.'
        }));
        return;
      }

      this.showDetailsModal = false;

      if (this.detailsAction === 'excel') {
        this.exportAcquisitionExcel();
      } else {
        this.printReport();
      }
    },

    handleSignatureUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please select a PNG or JPG signature image.'
        }));
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.signerSignature = reader.result;
      };
      reader.onerror = () => {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Unable to read the signature image.'
        }));
      };
      reader.readAsDataURL(file);
    },

    printSelectedReport(reportType) {
      this.reportToPrint = reportType;
      this.showPrintModal = false;
      this.openDetailsModal('print');
    },

    canPrintReport(reportType) {
      return this.movements.some(item =>
        item.category === (reportType === 'issuance' ? 'Issuance' : 'Acquisition') &&
        item.date >= this.dateFrom &&
        item.date <= this.dateTo &&
        (this.selectedFundCluster === 'ALL' ||
          String(item.fundCluster || '').trim().toUpperCase() === this.selectedFundCluster.toUpperCase())
      );
    },

    getReportRowCount(reportType) {
      const category = reportType === 'issuance' ? 'Issuance' : 'Acquisition';
      return this.movements.filter(item =>
        item.category === category &&
        item.date >= this.dateFrom &&
        item.date <= this.dateTo &&
        (this.selectedFundCluster === 'ALL' ||
          String(item.fundCluster || '').trim().toUpperCase() === this.selectedFundCluster.toUpperCase())
      ).length;
    },

    setDefaultDates() {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      this.dateFrom = this.toDateString(firstDay);
      this.dateTo = this.toDateString(today);
    },

    toDateString(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    },

    formatDate(value) {
      if (!value) return 'N/A';
      const parts = String(value).substring(0, 10).split('-');
      if (parts.length !== 3) return value;
      return parts[1] + '/' + parts[2] + '/' + parts[0];
    },

    badgeClass(item) {
      if (item.category === 'Acquisition') return 'badge-acquisition';
      if (item.category === 'Issuance') return 'badge-out';
      if (item.category === 'Return') return 'badge-return';
      return 'badge-in';
    },

    cleanUnit(value) {
      return String(value || '').trim();
    },

    getRelatedRecord(value) {
      if (Array.isArray(value)) return value[0] || {};
      return value || {};
    },

    escapeHtml(value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    formatMoney(value) {
      return Number(value || 0).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP'
      });
    },

    printReport() {
      const rows = this.printRows;
      const title = this.reportToPrint === 'issuance'
        ? 'REPORT ON SUPPLIES AND MATERIALS ISSUED'
        : 'ACQUISITION OF SUPPLIES AND MATERIALS';
      const tableRows = rows.map((item, index) => `
        <tr>
          <td>${this.escapeHtml(this.formatDate(item.date))}</td>
          <td>${this.escapeHtml(item.propertyNumber || 'N/A')}</td>
          <td>${this.escapeHtml(item.description || 'N/A')}</td>
          <td>${this.escapeHtml(item.reference || 'N/A')}</td>
          <td>${this.escapeHtml(item.quantity)}</td>
          <td>${this.escapeHtml(item.person || item.supplier || 'N/A')}</td>
          <td>${this.escapeHtml(item.destination || 'N/A')}</td>
        </tr>
      `).join('');
      const signature = this.signerSignature
        ? `<img src="${this.signerSignature}" alt="Signature" style="display:block;max-width:180px;max-height:65px;object-fit:contain;margin:8px auto">`
        : '';
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#222;padding:24px}
          h2{text-align:center;margin-bottom:4px}
          .subtitle{text-align:center;margin:0 0 20px;color:#555}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th,td{border:1px solid #555;padding:7px;text-align:left}
          th{background:#e9eee9}
          .signatory{margin:48px 0 0 auto;width:260px;text-align:center}
          .signatory-name{font-weight:bold;text-transform:uppercase;border-bottom:1px solid #222;padding:5px}
          @media print{body{padding:0}}
        </style></head><body>
        <h2>${title}</h2>
        <p class="subtitle">Fund Cluster: ${this.escapeHtml(this.selectedFundCluster)} | Date: ${this.escapeHtml(this.formatDate(this.dateFrom))} - ${this.escapeHtml(this.formatDate(this.dateTo))}</p>
        <table><thead><tr><th>Date</th><th>Property No.</th><th>Description</th><th>Reference</th><th>Quantity</th><th>Recipient / Source</th><th>Destination</th></tr></thead>
        <tbody>${tableRows}</tbody></table>
        <div class="signatory">${signature}<div class="signatory-name">${this.escapeHtml(this.signerName)}</div><div>Signature over Printed Name</div><div>Date: ${this.escapeHtml(this.formatDate(this.signerDate))}</div></div>
        <script>window.onload=function(){window.print()};window.onafterprint=function(){window.close()}<\/script>
        </body></html>`;
      const printWindow = window.open('', '_blank', 'width=1100,height=850');
      if (!printWindow) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please allow pop-ups to print the report.' }));
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    },

    exportAcquisitionExcel() {
      const rows = this.filteredMovements;
      const tableRows = rows.map(item => `
        <tr>
          <td>${this.escapeHtml(this.formatDate(item.date))}</td>
          <td>${this.escapeHtml(item.propertyNumber || '')}</td>
          <td>${this.escapeHtml(item.description || '')}</td>
          <td>${this.escapeHtml(item.category || '')}</td>
          <td>${this.escapeHtml(item.quantity)}</td>
          <td>${this.escapeHtml(item.reference || '')}</td>
          <td>${this.escapeHtml(item.person || item.supplier || '')}</td>
          <td>${this.escapeHtml(item.destination || '')}</td>
          <td>${this.escapeHtml(item.fundCluster || '')}</td>
        </tr>
      `).join('');

      const signature = this.signerSignature
        ? `<img src="${this.signerSignature}" alt="Signature" style="max-width:180px;max-height:65px;object-fit:contain;display:block;margin:8px 0">`
        : '';

      const workbookHtml = `<!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Movement History</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <style>
            body{font-family:Arial,sans-serif}
            table{border-collapse:collapse}
            th,td{border:1px solid #777;padding:7px}
            th{background:#2f5d3a;color:#fff;font-weight:bold}
            .heading{text-align:center;font-size:16pt;font-weight:bold}
            .subheading{text-align:center}
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="9" class="heading">INVENTORY MOVEMENT HISTORY</td></tr>
            <tr><td colspan="9" class="subheading">Fund Cluster: ${this.escapeHtml(this.selectedFundCluster)} | Date Range: ${this.escapeHtml(this.formatDate(this.dateFrom))} - ${this.escapeHtml(this.formatDate(this.dateTo))}</td></tr>
          </table>
          <br>
          <table>
            <thead><tr>
              <th>Date</th><th>Property No.</th><th>Description</th><th>Movement</th>
              <th>Quantity</th><th>Reference</th><th>Recipient / Source</th>
              <th>Destination</th><th>Fund Cluster</th>
            </tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <br><br>
          <table>
            <tr><td>Prepared by:</td></tr>
            <tr><td>${signature}</td></tr>
            <tr><td><strong>${this.escapeHtml(this.signerName)}</strong></td></tr>
            <tr><td>Signature over Printed Name</td></tr>
            <tr><td>Date: ${this.escapeHtml(this.formatDate(this.signerDate))}</td></tr>
          </table>
        </body>
        </html>`;

      const blob = new Blob(['\\ufeff', workbookHtml], {
        type: 'application/vnd.ms-excel;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventory-movement-history.xls';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    printIssuanceReport() {
      this.reportToPrint = 'issuance';
      this.printReport();
    },

    async loadMovements() {
      this.loading = true;
      this.errorMessage = '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const token = localStorage.getItem('accessToken');

        const headers = {
          'Content-Type': 'application/json'
        };

        if (token) {
          headers.Authorization = 'Bearer ' + token;
        }

        const endpoints = [
          { url: '/api/items', type: 'items' },
          { url: '/api/receipts', type: 'receipts' },
          { url: '/api/returns', type: 'returns' }
        ];

        const results = await Promise.all(
          endpoints.map(async endpoint => {
            const response = await fetch(endpoint.url, {
              method: 'GET',
              headers,
              signal: controller.signal
            });

            if (!response.ok) {
              throw new Error(
                'Unable to load ' + endpoint.type +
                '. HTTP ' + response.status
              );
            }

            const data = await response.json();
            let records = [];

            if (Array.isArray(data)) {
              records = data;
            } else if (Array.isArray(data?.data)) {
              records = data.data;
            } else if (Array.isArray(data?.items)) {
              records = data.items;
            } else if (Array.isArray(data?.receipts)) {
              records = data.receipts;
            } else if (Array.isArray(data?.returns)) {
              records = data.returns;
            }

            return {
              type: endpoint.type,
              data: records
            };
          })
        );

        const items =
          results.find(result => result.type === 'items')?.data || [];

        const receipts =
          results.find(result => result.type === 'receipts')?.data || [];

        const returns =
          results.find(result => result.type === 'returns')?.data || [];

        // ACQUISITIONS:
        // Use the actual acquisition_date.
        // Do not substitute created_at for the acquisition date.
        const itemMovements = items
          .filter(item => this.getAcquisitionDate(item))
          .map(item => ({
            id: 'item-' + (item.id || item.item_id),
            date: this.getAcquisitionDate(item),
            propertyNumber:
              item.property_number ||
              item.propertyNumber ||
              item.property_no ||
              '',
            description:
              item.description ||
              item.item_name ||
              item.name ||
              '',
            category: 'Acquisition',
            // Each acquired property is tracked as one individual property.
            // Keep acquisition quantity at 1 even after the property is issued.
            quantity: 1,
            reference:
              item.reference_number ||
              item.reference ||
              item.dr_ci_si_number ||
              '',
            person: item.supplier || '',
            rcCode: item.responsibility_center || '',
            unit: this.cleanUnit(item.unit || item.unit_of_measure),
            unitCost: Number(item.cost ?? item.unit_cost ?? 0),
            specs: [item.model_number, item.serial_number]
              .filter(Boolean)
              .join(' / '),
            article: item.article || '',
            itemNo:
              item.item_no ||
              item.item_number ||
              item.itemNo ||
              item.stock_no ||
              item.stock_number ||
              '',
            drNumber: item.dr_ci_si_number || '',
            poNumber: item.po_number || '',
            supplier: item.supplier || '',
            remarks: item.remarks || '',
            fundCluster:
              item.fund_cluster ||
              item.fundCluster ||
              item.fund_cluster_code ||
              ''
          }));

        // ISSUANCES:
        // Use date_issued from the receipt.
        // Item and requester details come from the receipt relationships.
        const receiptMovements = receipts
          .filter(receipt => this.getIssuanceDate(receipt))
          .map(receipt => {
            const item = this.getRelatedRecord(receipt.items);
            const request = this.getRelatedRecord(receipt.item_requests);
            const receiptUser = this.getRelatedRecord(receipt.users);
            const requestUser = this.getRelatedRecord(request.users);
            const office = this.getRelatedRecord(request.offices);

            return {
              id: 'receipt-' + (receipt.id || receipt.receipt_id),
              date: this.getIssuanceDate(receipt),
              propertyNumber:
                item.property_number ||
                receipt.property_number ||
                receipt.propertyNumber ||
                '',
              description:
                item.description ||
                request.item_description ||
                receipt.description ||
                receipt.item_name ||
                '',
              category: 'Issuance',
              quantity: Number(receipt.quantity ?? 1),
              reference:
                receipt.receipt_number ||
                receipt.reference_number ||
                receipt.reference ||
                '',
              person:
                receipt.issued_to ||
                receipt.recipient ||
                receipt.received_by ||
                receiptUser.full_name ||
                requestUser.full_name ||
                office.office_name ||
                '',
              name:
                receipt.issued_to ||
                receipt.recipient ||
                receipt.received_by ||
                receiptUser.full_name ||
                requestUser.full_name ||
                '',
              destination:
                receipt.destination ||
                receipt.destination_office ||
                receipt.issued_to_office ||
                receipt.office ||
                request.destination ||
                request.destination_office ||
                office.office_name ||
                '',
              rcCode: item.responsibility_center || '',
              unit: this.cleanUnit(item.unit || item.unit_of_measure),
              unitCost: Number(item.cost ?? item.unit_cost ?? 0),
              specs: [item.model_number, item.serial_number]
                .filter(Boolean)
                .join(' / '),
              article: item.article || '',
              itemNo:
                item.item_no ||
                item.item_number ||
                item.stock_no ||
                '',
              drNumber: item.dr_ci_si_number || '',
              poNumber: item.po_number || '',
              supplier: item.supplier || '',
              remarks: item.remarks || '',
              fundCluster:
                item.fund_cluster ||
                receipt.fund_cluster ||
                request.fund_cluster ||
                ''
            };
          });

        // RETURNS:
        // Keep return dates and records separate from acquisitions/issuances.
        const returnMovements = returns
          .filter(record => this.getReturnDate(record))
          .map(record => {
            const item = this.getRelatedRecord(record.items);
            const receipt = this.getRelatedRecord(record.property_receipts);
            const user = this.getRelatedRecord(record.users);
            const office = this.getRelatedRecord(record.offices);

            return {
              id: 'return-' + (record.id || record.return_id),
              date: this.getReturnDate(record),
              propertyNumber: item.property_number || '',
              description: item.description || '',
              category: 'Return',
              quantity: Number(receipt.quantity ?? item.quantity ?? 0),
              reference:
                receipt.receipt_number ||
                record.return_number ||
                record.reference_number ||
                '',
              person:
                user.full_name ||
                office.office_name ||
                record.returned_by ||
                '',
              rcCode: item.responsibility_center || '',
              unit: this.cleanUnit(item.unit || item.unit_of_measure),
              unitCost: Number(item.cost ?? item.unit_cost ?? 0),
              specs: [item.model_number, item.serial_number]
                .filter(Boolean)
                .join(' / '),
              article: item.article || '',
              itemNo:
                item.item_no ||
                item.item_number ||
                item.stock_no ||
                '',
              drNumber: item.dr_ci_si_number || '',
              poNumber: item.po_number || '',
              supplier: item.supplier || '',
              remarks: item.remarks || '',
              fundCluster:
                item.fund_cluster ||
                record.fund_cluster ||
                ''
            };
          });

        this.movements = [
          ...itemMovements,
          ...receiptMovements,
          ...returnMovements
        ];
      } catch (error) {
        this.errorMessage = error.name === 'AbortError'
          ? 'Loading inventory movements timed out. Check your connection and try again.'
          : error.message ||
            'An error occurred while loading movement records.';
      } finally {
        clearTimeout(timeoutId);
        this.loading = false;
      }
    },

    getAcquisitionDate(item) {
      const value =
        item.acquisition_date ||
        item.acquisitionDate ||
        '';

      return value ? String(value).substring(0, 10) : '';
    },

    getIssuanceDate(receipt) {
      const value =
        receipt.date_issued ||
        receipt.dateIssued ||
        receipt.receipt_date ||
        '';

      return value ? String(value).substring(0, 10) : '';
    },

    getReturnDate(record) {
      const value =
        record.return_date ||
        record.date_returned ||
        record.dateReturned ||
        '';

      return value ? String(value).substring(0, 10) : '';
    }
  }
};
</script>

<style scoped>
.inventory-page {
  width: 100%;
  min-height: 100%;
  padding: 24px;
}

.modal-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  overflow: visible;
  background: #ffffff;
  color: #26332a;
  border: 1px solid #e4e2d8;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(25, 42, 29, 0.16);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  border-bottom: 1px solid #e4e2d8;
  background: #f7f5e8;
}

.modal-header h2 {
  margin: 0 0 8px;
  color: #2f5d3a;
  font-size: 22px;
}

.modal-header p {
  margin: 0;
  color: #717a72;
  font-size: 14px;
}

.close-button {
  border: none;
  background: transparent;
  color: #717a72;
  font-size: 30px;
  cursor: pointer;
}

.filter-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 16px;
  padding: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
}

.date-range-error {
  grid-column: 1 / -1;
  margin: -8px 0 0;
  color: #b91c1c;
  font-size: 13px;
}

.filter-group input,
.filter-group select {
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid #dfe3d9;
  border-radius: 6px;
  background: #ffffff;
  color: #26332a;
  font-size: 13px;
}

.search-group {
  grid-column: span 2;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 24px 24px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border: 1px solid #e4e2d8;
  border-radius: 8px;
  background: #fffdf6;
}

.summary-card span {
  color: #717a72;
  font-size: 13px;
}

.summary-card strong {
  font-size: 25px;
}

.in-count {
  color: #2f5d3a;
}

.out-count {
  color: #b91c1c;
}

.acq-count {
  color: #1d4ed8;
}

.table-container {
  overflow-x: auto;
  padding: 0 24px 24px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #e9e7de;
  white-space: nowrap;
}

th {
  background: #2f5d3a;
  color: #ffffff;
  font-weight: 600;
}

.movement-badge {
  display: inline-block;
  min-width: 48px;
  padding: 5px 10px;
  border-radius: 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.badge-in {
  background: #e7efe5;
  color: #2f5d3a;
}

.badge-out {
  background: #fee2e2;
  color: #991b1b;
}

.badge-acquisition {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-return {
  background: #fef3c7;
  color: #92400e;
}

.empty-message {
  padding: 30px;
  color: #717a72;
  text-align: center;
}

.message {
  padding: 30px 24px;
  text-align: center;
}

.error-message {
  color: #b91c1c;
}

.error-message button {
  display: block;
  margin: 12px auto 0;
  padding: 9px 16px;
  border: none;
  border-radius: 6px;
  background: #2f5d3a;
  color: white;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-top: 1px solid #e4e2d8;
  background: #fffdf6;
  color: #717a72;
  font-size: 13px;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.print-button,
.close-footer-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #2f5d3a;
  color: white;
  cursor: pointer;
}

.excel-button {
  background: #217346;
}

.print-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.print-button i {
  margin-right: 6px;
}

.close-footer-button:hover {
  background: #244a2e;
}

.print-picker-backdrop {
  position: fixed;
  z-index: 1100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 25, 18, 0.55);
}

.print-picker {
  width: min(520px, 100%);
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.22);
}

.print-picker-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #e4e2d8;
  background: #f7f5e8;
}

.print-picker-header h3 {
  margin: 0 0 6px;
  color: #2f5d3a;
  font-size: 19px;
}

.print-picker-header p {
  margin: 0;
  color: #717a72;
  font-size: 13px;
}

.print-picker-options {
  display: grid;
  gap: 10px;
  padding: 20px 24px;
}

.print-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e4e2d8;
  border-radius: 8px;
  background: #fff;
  color: #26332a;
  text-align: left;
  cursor: pointer;
}

.print-option:hover:not(:disabled) {
  border-color: #2f5d3a;
  background: #f8faf6;
}

.print-option:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.print-option-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  font-size: 19px;
}

.acquisition-icon {
  background: #dbeafe;
  color: #1d4ed8;
}

.issuance-icon {
  background: #fee2e2;
  color: #991b1b;
}

.print-option-copy {
  display: grid;
  flex: 1;
  gap: 3px;
}

.print-option-copy strong {
  font-size: 14px;
}

.print-option-copy small {
  color: #717a72;
  font-size: 12px;
}

.print-option > .bi-chevron-right {
  color: #717a72;
}

.details-form { display: grid; gap: 16px; padding: 22px 24px; }
.details-field { display: grid; gap: 7px; }
.details-field label { font-size: 13px; font-weight: 600; color: #26332a; }
.optional-label { color: #717a72; font-weight: 400; }
.signature-preview { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.signature-preview img { max-width: 180px; max-height: 70px; object-fit: contain; border: 1px solid #e4e2d8; border-radius: 6px; padding: 5px; }
.details-footer { gap: 10px; }
.secondary-button { background: #6c757d; }
.print-picker-footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px;
  border-top: 1px solid #e4e2d8;
  background: #fffdf6;
}

@media (max-width: 800px) {
  .inventory-page {
    padding: 12px;
  }

  .filter-section {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-group {
    grid-column: span 2;
  }
}

@media (max-width: 500px) {
  .inventory-page {
    padding: 8px;
  }

  .modal-header,
  .filter-section,
  .modal-footer {
    padding: 16px;
  }

  .summary-section {
    gap: 8px;
    padding: 0 16px 16px;
  }

  .summary-card {
    padding: 10px;
  }

  .summary-card strong {
    font-size: 20px;
  }

  .print-picker-header,
  .print-picker-options {
    padding-right: 16px;
    padding-left: 16px;
  }

  .filter-section {
    grid-template-columns: 1fr;
  }

  .search-group {
    grid-column: span 1;
  }

  .table-container {
    padding: 0 16px 16px;
  }

  .modal-footer,
  .footer-actions {
    flex-wrap: wrap;
  }

  .footer-actions {
    width: 100%;
  }

  .footer-actions button {
    flex: 1 1 145px;
  }
}
</style>