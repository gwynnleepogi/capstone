<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h2>Inventory Movement History</h2>
          <p>Track property items moving in and out of inventory.</p>
        </div>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label for="movement-report-period">Report Period <span aria-hidden="true">*</span></label>
          <select id="movement-report-period" v-model="period" @change="applyPeriod">
            <option value="" disabled>Select a report period</option>
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="semi">Semi-Annual</option>
            <option value="year">Annual</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="movement-date-from">{{ dateFromLabel }}</label>
          <input
            id="movement-date-from"
            type="date"
            v-model="dateFrom"
            :disabled="!period"
            @change="updatePeriodFromDate"
          >
        </div>

        <div class="filter-group">
          <label for="movement-date-to">{{ dateToLabel }}</label>
          <input id="movement-date-to" type="date" v-model="dateTo" :disabled="period !== 'custom'">
        </div>
        <p v-if="invalidDateRange" class="date-range-error">
          {{ dateRangeError }}
        </p>

        <div class="filter-group">
          <label>Movement Type</label>
          <select v-model="movementType">
            <option value="all">All Movements</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
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

      <div v-if="period" class="summary-section">
        <div class="summary-card">
          <span>Total Movements</span>
          <strong>{{ filteredMovements.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Items IN</span>
          <strong class="in-count">{{ totalIn }}</strong>
        </div>
        <div class="summary-card">
          <span>Items OUT</span>
          <strong class="out-count">{{ totalOut }}</strong>
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
                  :class="item.type === 'IN' ? 'badge-in' : 'badge-out'"
                >
                  {{ item.type }}
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
            :disabled="loading || Boolean(errorMessage) || !filteredMovements.length || !period || invalidDateRange"
            @click="printReport"
          >
            <i class="bi bi-printer"></i>
            Print Movement Report
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
      period: '',
      dateFrom: '',
      dateTo: '',
      movementType: 'all',
      search: ''
    };
  },

  computed: {
    invalidDateRange() {
      if (!this.period) {
        return false;
      }

      if (this.period === 'custom') {
        return !this.dateFrom || !this.dateTo || this.dateFrom > this.dateTo;
      }

      return false;
    },

    dateRangeError() {
      if (!this.dateFrom || !this.dateTo) {
        return 'Choose both a start date and an end date for the custom report.';
      }

      return 'The start date must be on or before the end date.';
    },

    periodLabel() {
      const labels = {
        day: 'Daily',
        month: 'Monthly',
        quarter: 'Quarterly',
        semi: 'Semi-Annual',
        year: 'Annual',
        custom: 'Custom Date Range'
      };

      return labels[this.period] || '';
    },

    dateFromLabel() {
      if (this.period === 'custom') {
        return 'From';
      }

      return this.period === 'day' ? 'Select Day' : 'Select Date in Period';
    },

    dateToLabel() {
      return this.period === 'custom' ? 'To' : 'Through';
    },

    filteredMovements() {
      if (!this.period || this.invalidDateRange) {
        return [];
      }

      let result = this.movements;

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
          return item.type === this.movementType;
        });
      }

      if (this.search.trim()) {
        const keyword = this.search.toLowerCase().trim();

        result = result.filter(item => {
          return (
            String(item.propertyNumber || '').toLowerCase().includes(keyword) ||
            String(item.description || '').toLowerCase().includes(keyword) ||
            String(item.reference || '').toLowerCase().includes(keyword) ||
            String(item.person || '').toLowerCase().includes(keyword)
          );
        });
      }

      return result.sort((a, b) => {
        return b.date.localeCompare(a.date);
      });
    },

    totalIn() {
      return this.filteredMovements
        .filter(item => item.type === 'IN')
        .reduce((total, item) => total + Number(item.quantity || 0), 0);
    },

    totalOut() {
      return this.filteredMovements
        .filter(item => item.type === 'OUT')
        .reduce((total, item) => total + Number(item.quantity || 0), 0);
    }
  },

  watch: {
    show(value) {
      if (value) {
        this.loadMovements();
      }
    }
  },

  mounted() {
    if (this.show) {
      this.loadMovements();
    }
  },

  methods: {
    updatePeriodFromDate() {
      if (!this.dateFrom || this.period === 'custom') {
        return;
      }

      const selectedDate = new Date(this.dateFrom + 'T00:00:00');

      if (Number.isNaN(selectedDate.getTime())) {
        return;
      }

      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();

      if (this.period === 'day') {
        this.dateTo = this.dateFrom;
      } else if (this.period === 'month') {
        this.dateFrom = this.toDateString(new Date(year, month, 1));
        this.dateTo = this.toDateString(new Date(year, month + 1, 0));
      } else if (this.period === 'quarter') {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        this.dateFrom = this.toDateString(new Date(year, quarterStartMonth, 1));
        this.dateTo = this.toDateString(new Date(year, quarterStartMonth + 3, 0));
      } else if (this.period === 'semi') {
        const halfStartMonth = month < 6 ? 0 : 6;
        this.dateFrom = this.toDateString(new Date(year, halfStartMonth, 1));
        this.dateTo = this.toDateString(new Date(year, halfStartMonth + 6, 0));
      } else if (this.period === 'year') {
        this.dateFrom = this.toDateString(new Date(year, 0, 1));
        this.dateTo = this.toDateString(new Date(year, 12, 0));
      }
    },

    applyPeriod() {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();

      if (this.period === 'day') {
        const date = this.toDateString(today);
        this.dateFrom = date;
        this.dateTo = date;
      } else if (this.period === 'month') {
        this.dateFrom = this.toDateString(
          new Date(year, month, 1)
        );
        this.dateTo = this.toDateString(
          new Date(year, month + 1, 0)
        );
      } else if (this.period === 'quarter') {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        this.dateFrom = this.toDateString(
          new Date(year, quarterStartMonth, 1)
        );
        this.dateTo = this.toDateString(
          new Date(year, quarterStartMonth + 3, 0)
        );
      } else if (this.period === 'semi') {
        if (month < 6) {
          this.dateFrom = year + '-01-01';
          this.dateTo = year + '-06-30';
        } else {
          this.dateFrom = year + '-07-01';
          this.dateTo = year + '-12-31';
        }
      } else if (this.period === 'year') {
        this.dateFrom = year + '-01-01';
        this.dateTo = year + '-12-31';
      } else if (this.period === 'custom') {
        this.dateFrom = '';
        this.dateTo = '';
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

    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
    },

    printReport() {
      if (this.invalidDateRange) {
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: 'Please allow pop-ups to print the movement report.'
        }));
        return;
      }

      const range = `${this.periodLabel}: ${this.formatDate(this.dateFrom)} – ${this.formatDate(this.dateTo)}`;
      const rows = this.filteredMovements.map(item => `
        <tr>
          <td>${this.escapeHtml(this.formatDate(item.date))}</td>
          <td>${this.escapeHtml(item.propertyNumber || 'N/A')}</td>
          <td>${this.escapeHtml(item.description || 'N/A')}</td>
          <td class="${item.type === 'IN' ? 'in' : 'out'}">${this.escapeHtml(item.type)}</td>
          <td class="number">${this.escapeHtml(item.quantity)}</td>
          <td>${this.escapeHtml(item.reference || 'N/A')}</td>
          <td>${this.escapeHtml(item.person || 'N/A')}</td>
        </tr>
      `).join('');

      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Inventory Movement Report</title>
            <style>
              body { font: 12px Arial, sans-serif; color: #111; margin: 28px; }
              h1 { margin: 0 0 6px; text-align: center; font-size: 20px; }
              .range { margin: 0 0 18px; text-align: center; }
              .summary { display: flex; gap: 24px; margin: 0 0 16px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #777; padding: 7px; text-align: left; }
              th { background: #eee; }
              .in { color: #166534; font-weight: bold; }
              .out { color: #991b1b; font-weight: bold; }
              .number { text-align: right; }
              .signatures { display: flex; justify-content: space-around; margin-top: 64px; }
              .signature { width: 35%; border-top: 1px solid #111; padding-top: 6px; text-align: center; }
              @media print { body { margin: 15mm; } }
            </style>
          </head>
          <body>
            <h1>INVENTORY MOVEMENT REPORT</h1>
            <p class="range">Reporting period: ${this.escapeHtml(range)}</p>
            <div class="summary">
              <span>Total movements: <strong>${this.filteredMovements.length}</strong></span>
              <span>Items IN: <strong>${this.totalIn}</strong></span>
              <span>Items OUT: <strong>${this.totalOut}</strong></span>
            </div>
            <table>
              <thead><tr>
                <th>Date</th><th>Property No.</th><th>Description</th>
                <th>Movement</th><th>Quantity</th><th>Reference</th>
                <th>Recipient / Source</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="signatures">
              <div class="signature">Prepared by</div>
              <div class="signature">Reviewed by</div>
            </div>
            <script>window.onload = () => window.print();<\/script>
          </body>
        </html>`);
      printWindow.document.close();
    },

    async loadMovements() {
      this.loading = true;
      this.errorMessage = '';

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
              headers: headers
            });

            if (!response.ok) {
              if (response.status === 404) {
                return {
                  type: endpoint.type,
                  data: []
                };
              }

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
          type: 'IN',
          quantity: Number(item.quantity ?? 0),
          reference: item.reference_number || item.reference || '',
          person: item.source || item.supplier || ''
        }));

        const receiptMovements = receipts.map(receipt => ({
          id: 'receipt-' + (receipt.id || receipt.receipt_id),
          date: this.getDate(receipt),
          propertyNumber: receipt.items?.property_number || receipt.property_number || receipt.propertyNumber || '',
          description: receipt.items?.description || receipt.description || receipt.item_name || receipt.name || '',
          type: 'OUT',
          quantity: Number(receipt.quantity ?? 0),
          reference: receipt.reference_number || receipt.reference || receipt.receipt_number || '',
          person: receipt.users?.full_name || receipt.item_requests?.users?.full_name || receipt.recipient || receipt.received_by || receipt.person || ''
        }));

        const returnMovements = returns.map(item => ({
          id: 'return-' + (item.id || item.return_id),
          date: this.getDate(item),
          propertyNumber: item.items?.property_number || item.property_number || item.propertyNumber || '',
          description: item.items?.description || item.description || item.item_name || item.name || '',
          type: 'IN',
          quantity: Number(item.property_receipts?.quantity ?? item.quantity ?? 0),
          reference: item.property_receipts?.receipt_number || item.reference_number || item.reference || item.return_number || '',
          person: item.users?.full_name || item.returned_by || item.person || ''
        }));

        this.movements = [
          ...itemMovements,
          ...receiptMovements,
          ...returnMovements
        ].filter(item => item.date);
      } catch (error) {
        this.errorMessage =
          error.message || 'An error occurred while loading movement records.';
      } finally {
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
  max-width: 680px;
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

.search-group {
  grid-column: span 2;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
