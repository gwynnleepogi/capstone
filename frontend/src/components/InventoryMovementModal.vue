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
          <label>Report Period</label>
          <select v-model="period" @change="applyPeriod">
            <option value="all">All Time</option>
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="semi">Semi-Annual</option>
            <option value="year">Annual / Yearly</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        <div class="filter-group">
          <label>From</label>
          <input type="date" v-model="dateFrom" :disabled="period !== 'custom'">
        </div>

        <div class="filter-group">
          <label>To</label>
          <input type="date" v-model="dateTo" :disabled="period !== 'custom'">
        </div>

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

      <div class="summary-section">
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
        <button class="close-footer-button" @click="$emit('close')">
          Close
        </button>
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
      period: 'all',
      dateFrom: '',
      dateTo: '',
      movementType: 'all',
      search: ''
    };
  },

  computed: {
    filteredMovements() {
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
        return new Date(b.date) - new Date(a.date);
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

  methods: {
    applyPeriod() {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();

      if (this.period === 'all') {
        this.dateFrom = '';
        this.dateTo = '';
      } else if (this.period === 'day') {
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
          { url: 'http://localhost:5000/api/items', type: 'items' },
          { url: 'http://localhost:5000/api/receipts', type: 'receipts' },
          { url: 'http://localhost:5000/api/returns', type: 'returns' }
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
          id: 'item-' + (item.id || item.item_id || Math.random()),
          date: this.getDate(item),
          propertyNumber: item.property_number || item.propertyNumber || item.property_no || '',
          description: item.description || item.item_name || item.name || '',
          type: 'IN',
          quantity: Number(item.quantity || 1),
          reference: item.reference_number || item.reference || '',
          person: item.source || item.supplier || ''
        }));

        const receiptMovements = receipts.map(receipt => ({
          id: 'receipt-' + (receipt.id || receipt.receipt_id || Math.random()),
          date: this.getDate(receipt),
          propertyNumber: receipt.property_number || receipt.propertyNumber || '',
          description: receipt.description || receipt.item_name || receipt.name || '',
          type: 'OUT',
          quantity: Number(receipt.quantity || 1),
          reference: receipt.reference_number || receipt.reference || receipt.receipt_number || '',
          person: receipt.recipient || receipt.received_by || receipt.person || ''
        }));

        const returnMovements = returns.map(item => ({
          id: 'return-' + (item.id || item.return_id || Math.random()),
          date: this.getDate(item),
          propertyNumber: item.property_number || item.propertyNumber || '',
          description: item.description || item.item_name || item.name || '',
          type: 'IN',
          quantity: Number(item.quantity || 1),
          reference: item.reference_number || item.reference || item.return_number || '',
          person: item.returned_by || item.person || ''
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
        item.date ||
        item.created_at ||
        item.createdAt ||
        item.acquisition_date ||
        item.acquisitionDate ||
        item.receipt_date ||
        item.return_date ||
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
  background: rgba(0, 0, 0, 0.65);
}

.modal-container {
  width: 100%;
  max-width: 1250px;
  max-height: 90vh;
  overflow-y: auto;
  background: #ffffff;
  color: #1f2937;
  border-radius: 12px;
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.modal-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.close-button {
  border: none;
  background: transparent;
  color: #6b7280;
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

.filter-group input,
.filter-group select {
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #1f2937;
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.summary-card span {
  color: #6b7280;
  font-size: 13px;
}

.summary-card strong {
  font-size: 25px;
}

.in-count {
  color: #15803d;
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
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

th {
  background: #f3f4f6;
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
  background: #dcfce7;
  color: #166534;
}

.badge-out {
  background: #fee2e2;
  color: #991b1b;
}

.empty-message {
  padding: 30px;
  color: #6b7280;
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
  background: #1f2937;
  color: white;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 13px;
}

.close-footer-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #1f2937;
  color: white;
  cursor: pointer;
}

.close-footer-button:hover {
  background: #374151;
}

@media (max-width: 800px) {
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

  .modal-header,
  .filter-section {
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
}
</style>
