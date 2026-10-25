<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h2>Inventory Movement History</h2>
          <p>Track property acquisitions, issuances and returns.</p>
        </div>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>

      <div class="filter-section">
        <div class="filter-group report-group">
          <label for="movement-report">Report to Print</label>
          <select id="movement-report" v-model="reportToPrint">
            <option value="acquisition">Acquisition of Office Properties</option>
            <option value="issuance">Report of Supplies and Materials Issued</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="movement-fund-cluster">Fund Cluster</label>
          <select id="movement-fund-cluster" v-model="selectedFundCluster">
            <option value="ALL">(ALL)</option>
            <option v-for="cluster in fundClusters" :key="cluster" :value="cluster">{{ cluster }}</option>
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

      <div v-else class="table-container">
        <table>
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
                <span
                  class="movement-badge"
                  :class="badgeClass(item)"
                >
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
            class="print-button"
            :disabled="loading || Boolean(errorMessage) || !printRows.length || invalidDateRange"
            @click="printReport"
          >
            <i class="bi bi-printer"></i>
            Print Report
          </button>
          <button class="close-footer-button" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InventoryMovementModal',

  props: {
    show: {
      type: Boolean,
      default: false
    }
  },

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
      search: ''
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

    periodLabel() {
      return 'Custom Date Range';
    },

    filteredMovements() {
      if (this.invalidDateRange) {
        return [];
      }

      let result = this.movements;

      if (this.selectedFundCluster !== 'ALL') {
        result = result.filter(item => {
          return String(item.fundCluster || '').trim().toUpperCase() === this.selectedFundCluster.toUpperCase();
        });
      }

      if (this.dateFrom) {
        result = result.filter(item => {
          return item.date >= this.dateFrom;
        });
      }

      if (this.dateTo) {
        result = result.filter(item => {
          return item.date <= this.dateTo;
        });
      }

      if (this.movementType !== 'all') {
        result = result.filter(item => {
          return item.category === this.movementType;
        });
      }

      if (this.search.trim()) {
        const keyword = this.search.toLowerCase().trim();

        result = result.filter(item => {
          return (
            String(item.propertyNumber || '').toLowerCase().includes(keyword) ||
            String(item.description || '').toLowerCase().includes(keyword) ||
            String(item.category || '').toLowerCase().includes(keyword) ||
            String(item.reference || '').toLowerCase().includes(keyword) ||
            String(item.person || '').toLowerCase().includes(keyword)
          );
        });
      }

      return result.sort((a, b) => {
        return b.date.localeCompare(a.date);
      });
    },

    printRows() {
      if (this.invalidDateRange) {
        return [];
      }

      const category = this.reportToPrint === 'issuance' ? 'Issuance' : 'Acquisition';

      return this.movements
        .filter(item => {
          if (item.category !== category) return false;
          if (item.date < this.dateFrom || item.date > this.dateTo) return false;

          if (this.selectedFundCluster !== 'ALL') {
            return String(item.fundCluster || '').trim().toUpperCase() === this.selectedFundCluster.toUpperCase();
          }

          return true;
        })
        .sort((a, b) => {
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

  watch: {
    show(value) {
      if (value) {
        this.setDefaultDates();
        this.loadMovements();
      }
    }
  },

  mounted() {
    if (this.show) {
      this.setDefaultDates();
      this.loadMovements();
    }
  },

  methods: {
    setDefaultDates() {
      if (!this.dateFrom || !this.dateTo) {
        const today = new Date();
        this.dateTo = this.toDateString(today);
        this.dateFrom = this.toDateString(new Date(today.getFullYear(), 0, 1));
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
      if (item.category === 'Return') return 'badge-return';
      return 'badge-out';
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
      const parsed = new Date(date + 'T00:00:00');

      if (isNaN(parsed.getTime())) {
        return date;
      }

      return parsed
        .toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
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

    printReport() {
      if (this.invalidDateRange) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: this.dateRangeError }));
        return;
      }

      if (!this.printRows.length) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'There are no records for the selected report, fund cluster and date range.'
        }));
        return;
      }

      if (this.reportToPrint === 'issuance') {
        this.printIssuanceReport();
      } else {
        this.printAcquisitionReport();
      }
    },

    buildReportHeader(title, options = {}) {
      const logoUrl = new URL('../assets/LOGO.png', import.meta.url).href;

      return `
        <div class="appendix">${options.appendix ? this.escapeHtml(options.appendix) : ''}</div>
        <div class="header">
          <div class="logo-box"><img class="logo" src="${logoUrl}" alt="NVSU Logo"></div>
          <div class="school">
            <div>Republic of the Philippines</div>
            <div class="name">NUEVA VIZCAYA STATE UNIVERSITY</div>
            <div>3700 Bayombong, Nueva Vizcaya</div>
          </div>
          <div class="title">${this.escapeHtml(title)}</div>
          <div class="period">For the Period Covered ${this.escapeHtml(this.formatLongDate(this.dateFrom))} to ${this.escapeHtml(this.formatLongDate(this.dateTo))}</div>
        </div>`;
    },

    openReportWindow(title, bodyHtml, lineColor) {
      const printWindow = window.open('', '_blank');

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
              @page { size: landscape; margin: 12mm; }
              * { box-sizing: border-box; }
              body { font-family: Calibri, Arial, sans-serif; color: #000; font-size: 10px; margin: 0; }
              .appendix { text-align: right; font-style: italic; font-size: 11px; height: 14px; }
              .header { position: relative; text-align: center; min-height: 70px; margin-bottom: 6px; }
              .logo-box { position: absolute; left: 0; top: 0; border: 1px solid #999; padding: 3px; }
              .logo { width: 56px; height: 56px; object-fit: contain; display: block; }
              .school { color: #b3262b; font-weight: bold; line-height: 1.35; font-size: 13px; }
              .school .name { font-size: 15px; }
              .title { margin-top: 8px; font-weight: bold; font-size: 14px; }
              .period { font-size: 12px; }
              .fund { margin: 8px 0 4px; font-size: 11px; font-weight: bold; }
              .fund span { margin-left: 6px; }
              table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
              .report th, .report td { border: 0.5px solid ${lineColor}; padding: 3px 4px; vertical-align: middle; overflow-wrap: anywhere; }
              .report th { font-weight: bold; text-align: center; }
              .center { text-align: center; }
              .number { text-align: right; }
              .total-row td { font-weight: bold; font-size: 11px; }
              .specs { display: block; font-size: 8px; color: #333; }
              .certify { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; page-break-inside: avoid; }
              .certify td { border: 0.5px solid #777; padding: 6px 8px; vertical-align: top; height: 92px; }
              .certify .lead { font-weight: bold; font-size: 11px; }
              .certify .sig-label { margin-top: 52px; font-weight: bold; font-style: italic; text-align: center; border-top: 0.5px solid #777; padding-top: 3px; }
              @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
            </style>
          </head>
          <body>
            ${bodyHtml}
            <script>
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

    // Property Acquisition Report
    printAcquisitionReport() {
      const title = 'ACQUISITION OF OFFICE PROPERTIES';
      const e = value => this.escapeHtml(value === null || value === undefined || value === '' ? '' : value);
      const fundCluster = this.selectedFundCluster === 'ALL' ? 'ALL' : this.selectedFundCluster;
      const valueOf = item => Number(item.quantity || 0) * Number(item.unitCost || 0);
      const grandTotal = this.printRows.reduce((sum, item) => sum + valueOf(item), 0);

      const rows = this.printRows.map((item, index) => `
        <tr>
          <td>${e(item.article)}</td>
          <td>${e([item.description, item.specs].filter(Boolean).join(' / '))}</td>
          <td class="center">${index + 1}</td>
          <td class="center">${e(item.unit)}</td>
          <td class="number">${this.formatMoney(item.unitCost)}</td>
          <td class="center">${e(item.drNumber)}</td>
          <td class="center">${e(item.poNumber)}</td>
          <td class="number">${this.escapeHtml(item.quantity)}</td>
          <td class="number">${this.formatMoney(valueOf(item))}</td>
          <td>${e(item.supplier)}</td>
          <td>${e(item.remarks)}</td>
        </tr>
      `).join('');

      const body = `
        ${this.buildReportHeader(title)}
        <div class="fund">FUND CLUSTER:<span>${this.escapeHtml(fundCluster)}</span></div>
        <table class="report">
          <colgroup>
            <col style="width: 9%">
            <col style="width: 17%">
            <col style="width: 5%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 9%">
            <col style="width: 9%">
            <col style="width: 5%">
            <col style="width: 8%">
            <col style="width: 12%">
            <col style="width: 12%">
          </colgroup>
          <thead>
            <tr>
              <th>ARTICLE</th>
              <th>DESCRIPTION</th>
              <th>ITEM NO.</th>
              <th>UNIT OF MEASURE</th>
              <th>COST PER UNIT</th>
              <th>DR/CI/SI NUMBER</th>
              <th>PO NO.</th>
              <th>QTY</th>
              <th>VALUE</th>
              <th>SUPPLIER</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="8">GRAND TOTAL</td>
              <td class="number">${this.formatMoney(grandTotal)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>`;

      this.openReportWindow(title, body, '#000');
    },

    // Report of Supplies and Materials Issued (Appendix 64)
    printIssuanceReport() {
      const title = 'REPORT OF SUPPLIES AND MATERIALS ISSUED';
      const e = value => this.escapeHtml(value === null || value === undefined || value === '' ? '' : value);
      const fundCluster = this.selectedFundCluster === 'ALL' ? '(ALL)' : this.selectedFundCluster;
      const amountOf = item => Number(item.quantity || 0) * Number(item.unitCost || 0);
      const total = this.printRows.reduce((sum, item) => sum + amountOf(item), 0);

      const rows = this.printRows.map((item, index) => `
        <tr>
          <td class="center">${e(item.reference)}</td>
          <td class="center">${e(item.rcCode)}</td>
          <td class="center">${index + 1}</td>
          <td>${e([item.propertyNumber, item.description].filter(Boolean).join(' '))}</td>
          <td>${e(item.specs)}</td>
          <td class="center">${e(item.unit)}</td>
          <td class="number">${this.escapeHtml(item.quantity)}</td>
          <td class="number">${this.formatMoney(item.unitCost)}</td>
          <td class="number">${this.formatMoney(amountOf(item))}</td>
        </tr>
      `).join('');

      const body = `
        ${this.buildReportHeader(title, { appendix: 'Appendix 64' })}
        <div class="fund">Fund Cluster:<span>${this.escapeHtml(fundCluster)}</span></div>
        <table class="report">
          <colgroup>
            <col style="width: 11%">
            <col style="width: 10%">
            <col style="width: 5%">
            <col style="width: 24%">
            <col style="width: 20%">
            <col style="width: 6%">
            <col style="width: 6%">
            <col style="width: 8%">
            <col style="width: 10%">
          </colgroup>
          <thead>
            <tr>
              <th><i>RIS No.</i></th>
              <th><i>RC Code</i></th>
              <th><i>SN</i></th>
              <th><i>Item</i></th>
              <th><i>Description</i></th>
              <th><i>Unit</i></th>
              <th><i>QTY</i></th>
              <th><i>U-Cost</i></th>
              <th><i>Amount</i></th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="8" class="center">TOTAL</td>
              <td class="number">${this.formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>

        <table class="certify">
          <tbody>
            <tr>
              <td>
                <div class="lead">I hereby certify to the correctness of the above information.</div>
                <div class="sig-label">Signature over Printed Name of Supply/Property Custodian</div>
              </td>
              <td>
                <div class="lead">Posted by:</div>
                <div class="sig-label">Signature over Printed Name of Designated Accounting Staff</div>
              </td>
              <td style="width: 16%">
                <div class="lead">Date</div>
              </td>
            </tr>
          </tbody>
        </table>`;

      this.openReportWindow(title, body, '#999');
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
              headers: headers,
              signal: controller.signal
            });

            if (!response.ok) {
              throw new Error(
                'Unable to load ' + endpoint.type + '. HTTP ' + response.status
              );
            }

            const data = await response.json();

            return {
              type: endpoint.type,
              data: Array.isArray(data)
                ? data
                : Array.isArray(data.data)
                  ? data.data
                  : Array.isArray(data.items)
                    ? data.items
                    : []
            };
          })
        );

        const itemResult = results.find(result => result.type === 'items');
        const receiptResult = results.find(result => result.type === 'receipts');
        const returnResult = results.find(result => result.type === 'returns');

        const items = itemResult ? itemResult.data : [];
        const receipts = receiptResult ? receiptResult.data : [];
        const returns = returnResult ? returnResult.data : [];

        const itemMovements = items.map(item => ({
          id: 'item-' + (item.id || item.item_id),
          date: this.getDate(item),
          propertyNumber: item.property_number || item.propertyNumber || item.property_no || '',
          description: item.description || item.item_name || item.name || '',
          category: 'Acquisition',
          quantity: Number(item.quantity ?? 0),
          reference: item.reference_number || item.reference || '',
          person: item.source || item.supplier || '',
          rcCode: item.responsibility_center || '',
          unit: this.cleanUnit(item.unit || item.unit_of_measure),
          unitCost: Number(item.cost ?? 0),
          specs: [item.model_number, item.serial_number].filter(Boolean).join(' / '),
          article: item.article || '',
          propertyId: item.property_tag_identifier || item.unique_property_id || item.uniquePropertyId || '',
          drNumber: item.dr_ci_si_number || '',
          poNumber: item.po_number || '',
          supplier: item.supplier || '',
          remarks: item.remarks || '',
          fundCluster: item.fund_cluster || item.fundCluster || item.fund_cluster_code || ''
        }));

        const receiptMovements = receipts.map(receipt => ({
          id: 'receipt-' + (receipt.id || receipt.receipt_id),
          date: this.getDate(receipt),
          propertyNumber: receipt.items?.property_number || receipt.property_number || receipt.propertyNumber || '',
          description: receipt.items?.description || receipt.description || receipt.item_name || receipt.name || '',
          category: 'Issuance',
          quantity: Number(receipt.quantity ?? 0),
          reference: receipt.reference_number || receipt.reference || receipt.receipt_number || '',
          person: receipt.users?.full_name || receipt.item_requests?.users?.full_name || receipt.recipient || receipt.received_by || receipt.person || '',
          rcCode: receipt.items?.responsibility_center || receipt.responsibility_center || '',
          unit: this.cleanUnit(receipt.items?.unit || receipt.items?.unit_of_measure),
          unitCost: Number(receipt.items?.cost ?? 0),
          specs: [receipt.items?.model_number, receipt.items?.serial_number].filter(Boolean).join(' / '),
          fundCluster: receipt.fund_cluster || receipt.fundCluster || receipt.fund_cluster_code || receipt.items?.fund_cluster || receipt.item_requests?.fund_cluster || ''
        }));

        const returnMovements = returns.map(item => ({
          id: 'return-' + (item.id || item.return_id),
          date: this.getDate(item),
          propertyNumber: item.items?.property_number || item.property_number || item.propertyNumber || '',
          description: item.items?.description || item.description || item.item_name || item.name || '',
          category: 'Return',
          quantity: Number(item.property_receipts?.quantity ?? item.quantity ?? 0),
          reference: item.property_receipts?.receipt_number || item.reference_number || item.reference || item.return_number || '',
          person: item.users?.full_name || item.returned_by || item.person || '',
          rcCode: item.items?.responsibility_center || '',
          unit: this.cleanUnit(item.items?.unit || item.items?.unit_of_measure),
          unitCost: Number(item.items?.cost ?? 0),
          specs: [item.items?.model_number, item.items?.serial_number].filter(Boolean).join(' / '),
          fundCluster: item.fund_cluster || item.fundCluster || item.fund_cluster_code || item.items?.fund_cluster || item.property_receipts?.fund_cluster || ''
        }));

        this.movements = [
          ...itemMovements,
          ...receiptMovements,
          ...returnMovements
        ].filter(item => item.date);
      } catch (error) {
        this.errorMessage = error.name === 'AbortError'
          ? 'Loading inventory movements timed out. Check your connection and try again.'
          : error.message || 'An error occurred while loading movement records.';
      } finally {
        clearTimeout(timeoutId);
        this.loading = false;
      }
    },

    getDate(item) {
      const value =
        item.return_date ||
        item.date_issued ||
        item.date ||
        item.acquisition_date ||
        item.acquisitionDate ||
        item.created_at ||
        item.createdAt ||
        item.receipt_date ||
        '';

      if (!value) {
        return '';
      }

      return String(value).substring(0, 10);
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: rgba(25, 42, 29, 0.55);
}

.modal-container {
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  max-height: 90dvh;
  overflow-y: auto;
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

.report-group {
  grid-column: 1 / -1;
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
.acq-count {
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

.print-button {
  background: #2f5d3a;
  color: white;
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

@media (max-width: 800px) {
  .modal-overlay {
    align-items: flex-start;
    padding: 12px;
  }

  .modal-container {
    max-height: calc(100vh - 24px);
    max-height: calc(100dvh - 24px);
  }

  .filter-section {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-group {
    grid-column: span 2;
  }
}

@media (max-width: 500px) {
  .modal-overlay {
    padding: 8px;
  }

  .modal-container {
    max-height: calc(100vh - 16px);
    max-height: calc(100dvh - 16px);
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