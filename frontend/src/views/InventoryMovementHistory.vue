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
              <th style="width: 160px; min-width: 160px; white-space: nowrap;">Movement</th>
              <th style="width: 120px; min-width: 120px; white-space: nowrap;">Quantity</th>
              <th>Reference</th>
              <th>Recipient / Source</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in filteredMovements" :key="item.id">
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ item.propertyNumber || 'N/A' }}</td>
              <td>{{ item.description || 'N/A' }}</td>
              <td class="movement-cell" style="width: 160px; min-width: 160px; white-space: nowrap;">
                <span class="movement-badge" :class="badgeClass(item)" style="white-space: nowrap; display: inline-flex; align-items: center; justify-content: center;">
                  {{ item.category === 'Return' ? 'Unserviceable' : item.category }}
                </span>
              </td>
              <td class="quantity-cell" style="width: 120px; min-width: 120px; white-space: nowrap;">{{ item.quantity }}</td>
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
            :disabled="loading || Boolean(errorMessage) || !printRows.length || invalidDateRange"
            @click="exportAcquisitionExcel"
          >
            <i class="bi bi-file-earmark-excel"></i>
            Export Excel
          </button>

          <button
            class="print-button"
            :disabled="loading || Boolean(errorMessage)"
            @click="openPrintModal"
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
            <p>Choose the fund cluster and date range, then select the report you want to print.</p>
          </div>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="showPrintModal = false"
          ></button>
        </div>

        <div class="print-report-filters">
          <div class="certification-field">
            <label for="print-fund-cluster">Fund Cluster <span>*</span></label>
            <select id="print-fund-cluster" v-model="printFundCluster" required>
              <option value="ALL">All Fund Clusters</option>
              <option v-for="cluster in fundClusters" :key="cluster" :value="cluster">
                {{ cluster }}
              </option>
            </select>
          </div>

          <div class="print-date-fields">
            <div class="certification-field">
              <label for="print-date-from">Date From <span>*</span></label>
              <input id="print-date-from" v-model="printDateFrom" type="date" required>
            </div>
            <div class="certification-field">
              <label for="print-date-to">Date To <span>*</span></label>
              <input id="print-date-to" v-model="printDateTo" type="date" required>
            </div>
          </div>
          <p v-if="invalidPrintDateRange" class="date-range-error">
            {{ printDateRangeError }}
          </p>
        </div>

        <div class="print-picker-options">
          <button
            type="button"
            class="print-option"
            :disabled="invalidPrintDateRange || !canPrintReport('acquisition')"
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
            :disabled="invalidPrintDateRange || !canPrintReport('issuance')"
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

    <div
      v-if="showCertificationModal"
      class="print-picker-backdrop"
      @click.self="showCertificationModal = false"
      @keydown.esc="showCertificationModal = false"
    >
      <section
        class="print-picker certification-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="certification-modal-title"
      >
        <div class="print-picker-header">
          <div>
            <h3 id="certification-modal-title">Certification Details</h3>
            <p>Enter the required details before printing the report.</p>
          </div>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="showCertificationModal = false"
          ></button>
        </div>

        <form class="certification-form" @submit.prevent="confirmCertificationAndPrint">
          <div class="certification-field">
            <label for="custodian-printed-name">Supply/Property Custodian Printed Name <span>*</span></label>
            <input
              id="custodian-printed-name"
              v-model.trim="certificationCustodian"
              type="text"
              placeholder="Enter full name"
              required
            >
          </div>

          <div class="certification-field">
            <label for="accounting-printed-name">Designated Accounting Staff Printed Name <span>*</span></label>
            <input
              id="accounting-printed-name"
              v-model.trim="certificationAccountingStaff"
              type="text"
              placeholder="Enter full name"
              required
            >
          </div>

          <div v-if="reportToPrint === 'issuance'" class="certification-field">
            <label>Responsibility Center Code for Each Property</label>
            <div
              v-for="item in reportRows"
              :key="item.id"
              class="mb-2"
            >
              <small class="d-block text-muted">{{ item.propertyNumber || item.description || 'Property' }}</small>
              <input
                v-model.trim="responsibilityCenterOverrides[item.id]"
                type="text"
                class="form-control"
                placeholder="Defaults to the property record"
              >
            </div>
            <small class="text-muted">Changes apply to this printed report only. Property records will not be changed.</small>
          </div>

          <div class="certification-field">
            <label for="certification-date">Date <span>*</span></label>
            <input
              id="certification-date"
              v-model="certificationDate"
              type="date"
              required
            >
          </div>

          <div class="certification-actions">
            <button type="button" class="close-footer-button" @click="showCertificationModal = false">
              Cancel
            </button>
            <button type="submit" class="print-button">
              Continue to Print
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import ExcelJS from 'exceljs';

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
      printFundCluster: 'ALL',
      printDateFrom: '',
      printDateTo: '',
      showCertificationModal: false,
      certificationCustodian: '',
      certificationAccountingStaff: '',
      certificationDate: '',
      responsibilityCenterOverrides: {}
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

    invalidPrintDateRange() {
      return !this.printDateFrom ||
        !this.printDateTo ||
        this.printDateFrom > this.printDateTo;
    },

    printDateRangeError() {
      if (!this.printDateFrom || !this.printDateTo) {
        return 'Choose both a start date and an end date.';
      }

      return 'The start date must be on or before the end date.';
    },

    reportRows() {
      if (this.invalidPrintDateRange) {
        return [];
      }

      const category = this.reportToPrint === 'issuance'
        ? 'Issuance'
        : 'Acquisition';

      return this.movements
        .filter(item =>
          item.category === category &&
          item.date >= this.printDateFrom &&
          item.date <= this.printDateTo &&
          (
            this.printFundCluster === 'ALL' ||
            String(item.fundCluster || '').trim().toUpperCase() ===
              this.printFundCluster.toUpperCase()
          )
        )
        .slice()
        .sort((a, b) =>
          a.date.localeCompare(b.date) ||
          String(a.reference || '').localeCompare(String(b.reference || ''))
        );
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
    setDefaultDates() {
      const today = new Date();

      if (!this.dateFrom) {
        this.dateFrom = '2000-01-01';
      }

      if (!this.dateTo) {
        this.dateTo = this.toDateString(today);
      }
    },

    toDateString(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return year + '-' + month + '-' + day;
    },

    formatDate(date) {
      if (!date) {
        return 'N/A';
      }

      const parsedDate = new Date(date + 'T00:00:00');

      if (isNaN(parsedDate.getTime())) {
        return date;
      }

      return parsedDate.toLocaleDateString();
    },

    badgeClass(item) {
      if (item.category === 'Acquisition') return 'badge-acquisition';
      if (item.category === 'Return') return 'badge-unserviceable';
      if (item.category === 'Issuance') return 'badge-issuance';
      return '';
    },

    getReportRowCount(reportType) {
      if (this.invalidPrintDateRange) {
        return 0;
      }

      const category = reportType === 'issuance'
        ? 'Issuance'
        : 'Acquisition';

      return this.movements.filter(item =>
        item.category === category &&
        item.date >= this.printDateFrom &&
        item.date <= this.printDateTo &&
        (
          this.printFundCluster === 'ALL' ||
          String(item.fundCluster || '').trim().toUpperCase() ===
            this.printFundCluster.toUpperCase()
        )
      ).length;
    },

    canPrintReport(reportType) {
      return !this.loading &&
        !this.errorMessage &&
        !this.invalidPrintDateRange &&
        this.getReportRowCount(reportType) > 0;
    },

    openPrintModal() {
      this.printFundCluster = this.selectedFundCluster;
      this.printDateFrom = this.dateFrom;
      this.printDateTo = this.dateTo;
      this.showPrintModal = true;
    },

    printSelectedReport(reportType) {
      if (!this.canPrintReport(reportType)) {
        return;
      }

      this.reportToPrint = reportType;
      this.responsibilityCenterOverrides = {};
      if (reportType === 'issuance') {
        this.responsibilityCenterOverrides = Object.fromEntries(
          this.reportRows.map(item => [item.id, item.rcCode || ''])
        );
      }
      this.showPrintModal = false;
      this.showCertificationModal = true;
    },

    confirmCertificationAndPrint() {
      if (
        !this.certificationCustodian.trim() ||
        !this.certificationAccountingStaff.trim() ||
        !this.certificationDate
      ) {
        return;
      }

      this.showCertificationModal = false;
      this.printReport();
    },

    getRelatedRecord(value) {
      if (Array.isArray(value)) {
        return value[0] || {};
      }

      return value || {};
    },

    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
    },

    formatLongDate(date) {
      if (!date) return '';

      const parsed = new Date(date + 'T00:00:00');

      if (isNaN(parsed.getTime())) {
        return date;
      }

      return parsed
        .toLocaleDateString('en-US', {
          month: 'long',
          day: '2-digit',
          year: 'numeric'
        })
        .replace(',', '');
    },

    formatMoney(value) {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    cleanUnit(value) {
      const unit = String(value ?? '').trim();
      return unit && unit.toLowerCase() !== 'unit' ? unit : '';
    },

    async exportAcquisitionExcel() {
      if (this.invalidPrintDateRange || !this.reportRows.length) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: this.invalidPrintDateRange
            ? this.printDateRangeError
            : 'There are no records to export for the selected report.'
        }));
        return;
      }

      try {
        const workbook = new ExcelJS.Workbook();

        const isIssuance = this.reportToPrint === 'issuance';
        const title = isIssuance
          ? 'REPORT ON SUPPLIES AND MATERIALS ISSUED'
          : 'ACQUISITION OF SUPPLIES AND MATERIALS';

        const lastColumn = isIssuance ? 'L' : 'L';

        const worksheet = workbook.addWorksheet(
          isIssuance ? 'Properties Issued' : 'Office Property Acquisition',
          {
            pageSetup: {
              paperSize: 9,
              orientation: 'landscape',
              fitToPage: true,
              fitToWidth: 1,
              fitToHeight: 0,
              horizontalCentered: true,
              verticalCentered: false,
              margins: {
                left: 0.25,
                right: 0.25,
                top: 0.5,
                bottom: 0.5,
                header: 0.2,
                footer: 0.2
              }
            },
            views: [{ state: 'frozen', ySplit: 8 }]
          }
        );

        /* HEADER */

        worksheet.mergeCells('A1:' + lastColumn + '1');
        worksheet.getCell('A1').value = 'Republic of the Philippines';

        worksheet.mergeCells('A2:' + lastColumn + '2');
        worksheet.getCell('A2').value = 'NUEVA VIZCAYA STATE UNIVERSITY';

        worksheet.mergeCells('A3:' + lastColumn + '3');
        worksheet.getCell('A3').value = 'Bambang, Nueva Vizcaya';

        worksheet.mergeCells('A4:' + lastColumn + '4');
        worksheet.getCell('A4').value = title;

        worksheet.mergeCells('A5:' + lastColumn + '5');
        worksheet.getCell('A5').value =
          'For the period of ' +
          this.formatLongDate(this.printDateFrom) +
          ' - ' +
          this.formatLongDate(this.printDateTo);

        worksheet.mergeCells('A6:' + lastColumn + '6');
        worksheet.getCell('A6').value =
          'FUND CLUSTER: ' +
          (this.printFundCluster === 'ALL'
            ? '(ALL)'
            : this.printFundCluster);

        ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach(address => {
          worksheet.getCell(address).alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true
          };

          worksheet.getCell(address).font = {
            name: 'Arial',
            bold: address === 'A2' || address === 'A4',
            size: address === 'A4' ? 14 : 11
          };
        });

        worksheet.getRow(1).height = 20;
        worksheet.getRow(2).height = 22;
        worksheet.getRow(3).height = 20;
        worksheet.getRow(4).height = 25;
        worksheet.getRow(5).height = 22;
        worksheet.getRow(6).height = 20;

        /* TABLE HEADERS */

        worksheet.addRow([]);

        const headers = isIssuance
          ? [
              'Date Delivered',
              'Reference No.',
              'RC Code',
              'SN',
              'Property No.',
              'Description',
              'Unit',
              'QTY',
              'U-Cost',
              'Amount',
              'Name',
              'Destination'
            ]
          : [
              'Acquisition Date',
              'Article',
              'Description',
              'Item No.',
              'Unit of Measure',
              'Cost per Unit',
              'DR/CI/SI Number',
              'Property Order No.',
              'Qty',
              'Value',
              'Supplier',
              'Remarks'
            ];

        const headerRow = worksheet.addRow(headers);

        headerRow.font = {
          name: 'Arial',
          bold: true,
          size: 9
        };

        headerRow.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };

        headerRow.height = 34;

        headerRow.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        let grandTotal = 0;

        this.reportRows.forEach((item, index) => {
          const quantity = Number(item.quantity || 0);
          const unitCost = Number(item.unitCost || 0);
          const amount = quantity * unitCost;

          grandTotal += amount;

          const values = isIssuance
            ? [
                item.date || '',
                item.reference || '',
                (Object.prototype.hasOwnProperty.call(this.responsibilityCenterOverrides, item.id)
                  ? this.responsibilityCenterOverrides[item.id]
                  : item.rcCode) || '',
                index + 1,
                item.propertyNumber || '',
                item.description || '',
                item.unit || '',
                quantity,
                unitCost,
                amount,
                item.name || item.person || '',
                item.destination || ''
              ]
            : [
                item.date || '',
                item.article || '',
                item.description || '',
                item.itemNo || index + 1,
                item.unit || '',
                unitCost,
                item.drNumber || '',
                item.poNumber || '',
                quantity,
                amount,
                item.supplier || '',
                item.remarks || ''
              ];

          const row = worksheet.addRow(values);

          row.font = {
            name: 'Arial',
            size: 9
          };

          row.alignment = {
            vertical: 'middle',
            wrapText: true
          };

          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            };
          });

          if (isIssuance) {
            row.getCell(1).numFmt = 'yyyy-mm-dd';
            row.getCell(8).numFmt = '0';
            row.getCell(9).numFmt = '#,##0.00';
            row.getCell(10).numFmt = '#,##0.00';
          } else {
            row.getCell(1).numFmt = 'yyyy-mm-dd';
            row.getCell(6).numFmt = '#,##0.00';
            row.getCell(9).numFmt = '0';
            row.getCell(10).numFmt = '#,##0.00';
          }
        });

        /* TOTAL */

        const totalRow = worksheet.addRow(
          isIssuance
            ? [
                'TOTAL', '', '', '', '', '', '', '', '',
                grandTotal, '', ''
              ]
            : [
                'GRAND TOTAL', '', '', '', '', '', '', '', '',
                grandTotal, '', ''
              ]
        );

        totalRow.font = {
          name: 'Arial',
          bold: true,
          size: 10
        };

        totalRow.getCell(10).numFmt = '#,##0.00';

        totalRow.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };

          cell.alignment = {
            vertical: 'middle'
          };
        });

        /* COLUMN WIDTHS */

        worksheet.columns = isIssuance
          ? [
              { width: 15 },
              { width: 17 },
              { width: 13 },
              { width: 7 },
              { width: 17 },
              { width: 30 },
              { width: 9 },
              { width: 7 },
              { width: 13 },
              { width: 14 },
              { width: 22 },
              { width: 25 }
            ]
          : [
              { width: 16 },
              { width: 18 },
              { width: 30 },
              { width: 14 },
              { width: 16 },
              { width: 18 },
              { width: 20 },
              { width: 24 },
              { width: 10 },
              { width: 16 },
              { width: 22 },
              { width: 24 }
            ];

        worksheet.autoFilter = {
          from: 'A8',
          to: lastColumn + '8'
        };

        worksheet.headerFooter.oddFooter = {
          center: 'Page &P of &N'
        };

        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download =
          (isIssuance
            ? 'Properties_Issued_'
            : 'Office_Property_Acquisition_') +
          this.printDateFrom + '_to_' + this.printDateTo + '.xlsx';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Unable to export Excel report: ' +
            (error.message || 'Unknown error')
        }));
      }
    },

    printReport() {
      if (this.invalidDateRange) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: this.dateRangeError
        }));
        return;
      }

      if (!this.reportRows.length) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'There are no records for the selected report, fund cluster and date range.'
        }));
        return;
      }

      if (this.reportToPrint === 'issuance') {
        this.exportAcquisitionExcel();
      } else {
        this.printAcquisitionReport();
      }
    },

    buildReportHeader(title, options = {}) {
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href;

      return `
        <div class="appendix">${options.appendix ? this.escapeHtml(options.appendix) : ''}</div>
        <div class="header">
          <div class="logo-box">
            <img class="logo" src="${logoUrl}" alt="NVSU Logo">
          </div>
          <div class="school">
            <div>Republic of the Philippines</div>
            <div class="name">NUEVA VIZCAYA STATE UNIVERSITY</div>
            <div>Bambang, Nueva Vizcaya</div>
          </div>
          <div class="title">${this.escapeHtml(title)}</div>
          <div class="period">
            For the period of
            ${this.escapeHtml(this.formatLongDate(this.dateFrom))}
            - ${this.escapeHtml(this.formatLongDate(this.dateTo))}
          </div>
        </div>`;
    },

    openReportWindow(title, bodyHtml, lineColor) {
      const printWindow = window.open(
        '',
        '_blank',
        'popup=yes,width=1200,height=900,resizable=yes,scrollbars=yes'
      );

      if (!printWindow) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please allow pop-ups to print the report.'
        }));
        return;
      }

      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${this.escapeHtml(title)}</title>
            <style>
              @page {
                size: landscape;
                margin: 12mm;
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-family: Arial, sans-serif;
                  font-size: 9px;
                  color: #000;
                }
              }

              * { box-sizing: border-box; }

              body {
                font-family: Calibri, Arial, sans-serif;
                color: #000;
                font-size: 10px;
                margin: 0;
              }

              .appendix {
                text-align: right;
                font-style: italic;
                font-size: 11px;
                height: 14px;
              }

              .header {
                position: relative;
                width: 100%;
                min-height: 92px;
                margin-bottom: 8px;
                border: 1px solid #999;
                text-align: center;
              }

              .logo-box {
                position: absolute;
                left: 0;
                top: 0;
                width: 90px;
                height: 92px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1px solid #999;
              }

              .logo {
                width: 62px;
                height: 62px;
                object-fit: contain;
                display: block;
              }

              .school {
                height: 58px;
                padding-top: 8px;
                color: #000;
                font-weight: bold;
                line-height: 1.25;
                font-size: 13px;
                border-bottom: 1px solid #999;
                margin-left: 90px;
              }

              .school .name { font-size: 15px; }

              .title {
                margin-left: 90px;
                padding: 5px 8px;
                font-weight: bold;
                font-size: 13px;
                text-transform: uppercase;
              }

              .period {
                margin-top: 7px;
                font-size: 12px;
                border-top: 1px solid #999;
                padding-top: 5px;
              }

              .fund {
                margin: 8px 0 4px;
                font-size: 11px;
                font-weight: bold;
              }

              .fund span { margin-left: 6px; }

              table.report {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }

              .report th,
              .report td {
                border: 0.5px solid ${lineColor};
                padding: 3px 4px;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }

              .report th {
                font-weight: bold;
                text-align: center;
              }

              .center { text-align: center; }
              .number { text-align: right; }

              .total-row td {
                font-weight: bold;
                font-size: 11px;
              }

              .certify {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                table-layout: fixed;
                page-break-inside: avoid;
              }

              .certify td {
                border: 1px solid #555;
                padding: 8px 10px;
                vertical-align: top;
              }

              .certify .certification-text {
                height: auto;
                padding: 9px 10px;
                text-align: center;
                vertical-align: middle;
              }

              .certify .lead {
                font-weight: bold;
                font-size: 11px;
                text-align: center;
              }

              .certify .signature-cell {
                height: 96px;
                vertical-align: bottom;
                text-align: center;
              }

              .certify .signature-line {
                width: 92%;
                height: 8px;
                margin: 0 auto 2px;
                border-bottom: 1px solid #000;
              }

              .certify .printed-name {
                min-height: 16px;
                margin: 0 auto;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                line-height: 1.15;
              }

              .certify .sig-label {
                margin: 0;
                font-weight: bold;
                font-style: italic;
                text-align: center;
                font-size: 9px;
                line-height: 1.25;
              }

              .certify .date-cell .signature-line {
                width: 90%;
              }

              @media print {
                body {
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }

                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${bodyHtml}
            <script>
              window.onafterprint = function () { window.close(); };
              window.onload = function () {
                var logo = document.querySelector('.logo');

                if (logo && !logo.complete) {
                  logo.onload = function () { window.print(); };
                  logo.onerror = function () { window.print(); };
                } else {
                  window.print();
                }
              };
            <\/script>
          </body>
        </html>`);

      printWindow.document.close();
    },

    printAcquisitionReport() {
      const title = 'ACQUISITION OF SUPPLIES AND MATERIALS';
      const e = value => this.escapeHtml(
        value === null || value === undefined || value === '' ? '' : value
      );

      const fundCluster = this.selectedFundCluster === 'ALL'
        ? 'ALL'
        : this.selectedFundCluster;

      const valueOf = item =>
        Number(item.quantity || 0) * Number(item.unitCost || 0);

      const grandTotal = this.reportRows.reduce(
        (sum, item) => sum + valueOf(item),
        0
      );

      const rows = this.reportRows.map((item, index) => `
        <tr>
          <td class="center">${e(this.formatDate(item.date))}</td>
          <td>${e(item.article)}</td>
          <td>${e(item.description)}</td>
          <td class="center">${e(item.itemNo || index + 1)}</td>
          <td class="center">${e(item.unit)}</td>
          <td class="number">${this.formatMoney(item.unitCost)}</td>
          <td class="center">${e(item.drNumber)}</td>
          <td class="center">${e(item.poNumber)}</td>
          <td class="number">${e(item.quantity)}</td>
          <td class="number">${this.formatMoney(valueOf(item))}</td>
          <td>${e(item.supplier)}</td>
          <td>${e(item.remarks)}</td>
        </tr>
      `).join('');

      const body = `
        ${this.buildReportHeader(title)}
        <div class="fund">
          FUND CLUSTER:<span>${this.escapeHtml(fundCluster)}</span>
        </div>

        <table class="report">
          <colgroup>
            <col style="width: 9%">
            <col style="width: 8%">
            <col style="width: 15%">
            <col style="width: 5%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 5%">
            <col style="width: 8%">
            <col style="width: 10%">
            <col style="width: 10%">
          </colgroup>
          <thead>
            <tr>
              <th>ACQUISITION DATE</th>
              <th>ARTICLE</th>
              <th>DESCRIPTION</th>
              <th>ITEM NO.</th>
              <th>UNIT OF MEASURE</th>
              <th>COST PER UNIT</th>
              <th>DR/CI/SI NUMBER</th>
              <th>PROPERTY ORDER NO.</th>
              <th>QTY</th>
              <th>VALUE</th>
              <th>SUPPLIER</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="9">GRAND TOTAL</td>
              <td class="number">${this.formatMoney(grandTotal)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <table class="certify">
          <colgroup>
            <col style="width: 40%">
            <col style="width: 40%">
            <col style="width: 20%">
          </colgroup>
          <tbody>
            <tr>
              <td colspan="3" class="certification-text">
                <div class="lead">
                  I hereby certify to the correctness of the above information.
                </div>
              </td>
            </tr>
            <tr>
              <td class="signature-cell">
                <div class="printed-name">${e(this.certificationCustodian)}</div>
                <div class="signature-line"></div>
                <div class="sig-label">
                  Signature over Printed Name of Supply/Property Custodian
                </div>
              </td>
              <td class="signature-cell">
                <div class="printed-name">${e(this.certificationAccountingStaff)}</div>
                <div class="signature-line"></div>
                <div class="sig-label">
                  Signature over Printed Name of Designated Accounting Staff
                </div>
              </td>
              <td class="signature-cell date-cell">
                <div class="printed-name">${e(this.formatLongDate(this.certificationDate))}</div>
                <div class="signature-line"></div>
                <div class="sig-label">Date</div>
              </td>
            </tr>
          </tbody>
        </table>`;

      this.openReportWindow(title, body, '#000');
    },

    printIssuanceReport() {
      const title = 'REPORT ON SUPPLIES AND MATERIALS ISSUED';
      const e = value => this.escapeHtml(
        value === null || value === undefined || value === '' ? '' : value
      );

      const fundCluster = this.selectedFundCluster === 'ALL'
        ? '(ALL)'
        : this.selectedFundCluster;

      const amountOf = item =>
        Number(item.quantity || 0) * Number(item.unitCost || 0);

      const total = this.reportRows.reduce(
        (sum, item) => sum + amountOf(item),
        0
      );

      const rows = this.reportRows.map((item, index) => `
        <tr>
          <td class="center">${e(this.formatDate(item.date))}</td>
          <td class="center">${e(item.reference)}</td>
          <td class="center">${e(Object.prototype.hasOwnProperty.call(this.responsibilityCenterOverrides, item.id) ? this.responsibilityCenterOverrides[item.id] : item.rcCode)}</td>
          <td class="center">${index + 1}</td>
          <td>${e(item.propertyNumber)}</td>
          <td>${e(item.description + (item.specs ? ' / ' + item.specs : ''))}</td>
          <td class="center">${e(item.unit)}</td>
          <td class="number">${e(item.quantity)}</td>
          <td class="number">${this.formatMoney(item.unitCost)}</td>
          <td class="number">${this.formatMoney(amountOf(item))}</td>
          <td>${e(item.name || item.person)}</td>
          <td>${e(item.destination)}</td>
        </tr>
      `).join('');

      const body = `
        ${this.buildReportHeader(title, { appendix: 'Appendix 64' })}

        <div class="fund">
          Fund Cluster:<span>${this.escapeHtml(fundCluster)}</span>
        </div>

        <table class="report issuance-report">
          <colgroup>
            <col style="width: 8%">
            <col style="width: 9%">
            <col style="width: 7%">
            <col style="width: 4%">
            <col style="width: 11%">
            <col style="width: 18%">
            <col style="width: 5%">
            <col style="width: 5%">
            <col style="width: 7%">
            <col style="width: 8%">
            <col style="width: 9%">
            <col style="width: 9%">
          </colgroup>

          <thead>
            <tr>
              <th><i>Date Delivered</i></th>
              <th><i>Reference No.</i></th>
              <th><i>RC Code</i></th>
              <th><i>SN</i></th>
              <th><i>Property No.</i></th>
              <th><i>Description</i></th>
              <th><i>Unit</i></th>
              <th><i>QTY</i></th>
              <th><i>U-Cost</i></th>
              <th><i>Amount</i></th>
              <th><i>Name</i></th>
              <th><i>Destination</i></th>
            </tr>
          </thead>

          <tbody>
            ${rows}

            <tr class="total-row">
              <td colspan="9" class="center">TOTAL</td>
              <td class="number">${this.formatMoney(total)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <table class="certify">
          <colgroup>
            <col style="width: 40%">
            <col style="width: 40%">
            <col style="width: 20%">
          </colgroup>

          <tbody>
            <tr>
              <td colspan="3" class="certification-text">
                <div class="lead">
                  I hereby certify to the correctness of the above information.
                </div>
              </td>
            </tr>

            <tr>
              <td class="signature-cell">
                <div class="printed-name">${e(this.certificationCustodian)}</div>
                <div class="signature-line"></div>
                <div class="sig-label">
                  Signature over Printed Name of Supply/Property Custodian
                </div>
              </td>

              <td class="signature-cell">
                <div class="printed-name">${e(this.certificationAccountingStaff)}</div>
                <div class="signature-line"></div>
                <div class="sig-label">
                  Signature over Printed Name of Designated Accounting Staff
                </div>
              </td>

              <td class="signature-cell date-cell">
                <div class="printed-name">${e(this.formatLongDate(this.certificationDate))}</div>
                <div class="signature-line"></div>
                <div class="sig-label">Date</div>
              </td>
            </tr>
          </tbody>
        </table>`;

      this.openReportWindow(title, body, '#000');
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
            const receiptUser = this.getRelatedRecord(receipt.users);

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
  min-width: 1100px;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
  table-layout: auto;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #e9e7de;
  white-space: nowrap !important;
  vertical-align: middle;
}

th {
  background: #2f5d3a;
  color: #ffffff;
  font-weight: 600;
}

.table thead th:nth-child(4),
.table tbody td:nth-child(4) {
  width: 140px;
  min-width: 140px;
  text-align: center;
  white-space: nowrap;
}

.table thead th:nth-child(5),
.table tbody td:nth-child(5) {
  width: 110px;
  min-width: 110px;
  text-align: center;
  white-space: nowrap;
}

.movement-cell,
.quantity-cell {
  text-align: center;
  vertical-align: middle;
}

.movement-badge {
  margin: 0 auto;
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

.badge-unserviceable {
  background: #fee2e2;
  color: #991b1b;
}

.badge-issuance {
  background: #fef3c7;
  color: #92400e;
}

.badge-acquisition {
  background: #dbeafe;
  color: #1d4ed8;
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
  z-index: 2000;
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

.print-report-filters {
  display: grid;
  gap: 14px;
  padding: 18px 24px 4px;
}

.print-report-filters select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dfe3d9;
  border-radius: 6px;
  background: #fff;
  color: #26332a;
  font: inherit;
}

.print-date-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
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

.print-picker-footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px;
  border-top: 1px solid #e4e2d8;
  background: #fffdf6;
}

.certification-form {
  display: grid;
  gap: 16px;
  padding: 22px 24px 24px;
}

.certification-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.certification-field label {
  color: #26332a;
  font-size: 13px;
  font-weight: 600;
}

.certification-field label span {
  color: #b91c1c;
}

.certification-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dfe3d9;
  border-radius: 6px;
  background: #fff;
  color: #26332a;
  font: inherit;
}

.certification-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

.print-picker .print-button {
  font: inherit;
}

.printed-name {
  min-height: 13px;
  margin: 0 auto 3px;
  font-size: 10px;
  font-weight: bold;
  text-align: center;
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
  .print-picker-options,
  .print-report-filters {
    padding-right: 16px;
    padding-left: 16px;
  }

  .print-date-fields {
    grid-template-columns: 1fr;
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