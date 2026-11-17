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
            :disabled="loading || Boolean(errorMessage) || !printRows.length || invalidDateRange"
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
          <div class="details-field"><label for="movement-signer-signature">Picture of Signature <span class="optional-label">(Optional)</span></label><input id="movement-signer-signature" type="file" class="form-control" accept="image/*" @change="handleSignatureUpload"><small class="text-muted">Upload an image file.</small><div v-if="signerSignature" class="signature-preview"><img :src="signerSignature" alt="Signature preview"><button type="button" class="btn btn-sm btn-outline-danger" @click="signerSignature = ''">Remove</button></div></div>
        </div>
        <div class="print-picker-footer details-footer"><button type="button" class="close-footer-button secondary-button" @click="showDetailsModal = false">Cancel</button><button type="button" class="close-footer-button" @click="continueReportAction">{{ detailsAction === 'excel' ? 'Download Excel' : 'Continue to Print' }}</button></div>
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
      this.showDetailsModal = true;
    },

    handleSignatureUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please select an image file.' }));
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { this.signerSignature = reader.result; };
      reader.onerror = () => window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Unable to read the signature image.' }));
      reader.readAsDataURL(file);
    },

    continueReportAction() {
      if (!this.signerName.trim() || !this.signerDate) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please enter the printed name and date.' }));
        return;
      }
      this.showDetailsModal = false;
      if (this.detailsAction === 'excel') this.exportAcquisitionExcel();
      else this.printReport();
    },

    async exportAcquisitionExcel() {
      if (this.invalidDateRange || !this.printRows.length) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: this.invalidDateRange
            ? this.dateRangeError
            : 'There are no records to export for the selected report.'
        }));
        return;
      }

      try {
        const imported = await import('exceljs');
        const ExcelJS = imported.default || imported;
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
          this.formatDate(this.dateFrom) +
          ' - ' +
          this.formatDate(this.dateTo);

        worksheet.mergeCells('A6:' + lastColumn + '6');
        worksheet.getCell('A6').value =
          'FUND CLUSTER: ' +
          (this.selectedFundCluster === 'ALL'
            ? '(ALL)'
            : this.selectedFundCluster);

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

        this.printRows.forEach((item, index) => {
          const quantity = Number(item.quantity || 0);
          const unitCost = Number(item.unitCost || 0);
          const amount = quantity * unitCost;

          grandTotal += amount;

          const values = isIssuance
            ? [
                item.date || '',
                item.reference || '',
                item.rcCode || '',
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

        /* REPORT SIGNATORY DETAILS */
        const signatoryStartRow = worksheet.lastRow.number + 2;
        worksheet.mergeCells('A' + signatoryStartRow + ':L' + signatoryStartRow);
        worksheet.getCell('A' + signatoryStartRow).value = 'I hereby certify to the correctness of the above information.';
        worksheet.getCell('A' + signatoryStartRow).alignment = { horizontal: 'center' };
        worksheet.getCell('A' + signatoryStartRow).font = { name: 'Arial', bold: true, size: 10 };
        worksheet.mergeCells('A' + (signatoryStartRow + 1) + ':F' + (signatoryStartRow + 1));
        worksheet.mergeCells('G' + (signatoryStartRow + 1) + ':L' + (signatoryStartRow + 1));
        worksheet.getCell('A' + (signatoryStartRow + 1)).value = this.signerName;
        worksheet.getCell('G' + (signatoryStartRow + 1)).value = this.formatDate(this.signerDate);
        worksheet.getCell('A' + (signatoryStartRow + 1)).alignment = { horizontal: 'center', vertical: 'bottom' };
        worksheet.getCell('G' + (signatoryStartRow + 1)).alignment = { horizontal: 'center', vertical: 'bottom' };
        worksheet.mergeCells('A' + (signatoryStartRow + 2) + ':F' + (signatoryStartRow + 2));
        worksheet.mergeCells('G' + (signatoryStartRow + 2) + ':L' + (signatoryStartRow + 2));
        worksheet.getCell('A' + (signatoryStartRow + 2)).value = 'Signature over Printed Name';
        worksheet.getCell('G' + (signatoryStartRow + 2)).value = 'Date';
        worksheet.getCell('A' + (signatoryStartRow + 2)).alignment = { horizontal: 'center' };
        worksheet.getCell('G' + (signatoryStartRow + 2)).alignment = { horizontal: 'center' };
        worksheet.getRow(signatoryStartRow + 1).height = 24;
        worksheet.getRow(signatoryStartRow + 2).height = 20;
        if (this.signerSignature) {
          const imageParts = this.signerSignature.split(',');
          const extension = this.signerSignature.includes('image/png') ? 'png' : 'jpeg';
          const imageId = workbook.addImage({ base64: imageParts[1], extension });
          worksheet.addImage(imageId, { tl: { col: 1, row: signatoryStartRow }, br: { col: 5, row: signatoryStartRow + 1 } });
        }

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
          this.dateFrom + '_to_' + this.dateTo + '.xlsx';

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

    buildSignatureMarkup() {
      const signature = this.signerSignature ? '<img class="report-signature-image" src="' + this.signerSignature + '" alt="Signature">' : '';
      return '<table class="certify"><tbody><tr><td colspan="2" class="certification-text"><div class="lead">I hereby certify to the correctness of the above information.</div></td></tr><tr><td class="signature-cell"><div class="signature-image-area">' + signature + '</div><div class="signature-line"></div><div class="signer-name">' + this.escapeHtml(this.signerName) + '</div><div class="sig-label">Signature over Printed Name</div></td><td class="signature-cell date-cell"><div class="signature-line"></div><div class="signer-name">' + this.escapeHtml(this.formatDate(this.signerDate)) + '</div><div class="sig-label">Date</div></td></tr></tbody></table>';
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

      const total = this.printRows.reduce(
        (sum, item) => sum + amountOf(item),
        0
      );

      const rows = this.printRows.map((item, index) => `
        <tr>
          <td class="center">${e(this.formatDate(item.date))}</td>
          <td class="center">${e(item.reference)}</td>
          <td class="center">${e(item.rcCode)}</td>
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

        ${this.buildSignatureMarkup()}`;

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