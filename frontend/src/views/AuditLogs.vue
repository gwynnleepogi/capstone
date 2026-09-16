<template>
	<div class="container-fluid">
		<div class="d-flex justify-content-between align-items-center mb-4">
			<div>
				<h1 class="h3 mb-1">Audit Logs</h1>
				<p class="text-secondary mb-0">Added, edited, and deleted inventory records</p>
			</div>
			<button class="btn btn-outline-success" type="button" @click="getLogs">
				<i class="bi bi-arrow-clockwise me-1"></i>
				Refresh
			</button>
		</div>

		<div class="card">
			<div class="table-responsive">
				<table class="table table-hover mb-0 align-middle">
					<thead>
						<tr><th>Date</th><th>Action</th><th>Item</th><th>Details</th></tr>
					</thead>
					<tbody>
						<tr v-if="loading"><td colspan="4" class="text-center py-5">Loading audit logs...</td></tr>
						<tr v-else-if="error"><td colspan="4" class="text-center text-danger py-5">{{ error }}</td></tr>
						<tr v-else-if="logs.length === 0"><td colspan="4" class="text-center text-secondary py-5">No audit logs found.</td></tr>
						<tr v-for="log in logs" :key="log.id">
							<td>{{ formatDate(log.created_at) }}</td>
							<td><span class="badge" :class="actionClass(log.action)">{{ log.action }}</span></td>
							<td>{{ log.description || `Item #${log.item_id || '-'}` }}</td>
							<td>
								<details v-if="log.old_value || log.new_value">
									<summary>View item details</summary>
									<div class="details-content">
										<div v-if="log.old_value">
											<strong>{{ log.action === 'Deleted' ? 'Deleted item' : 'Before' }}</strong>
											<div class="detail-grid">
												<div v-for="entry in detailEntries(log.old_value)" :key="entry.key" class="detail-field">
													<span>{{ formatLabel(entry.key) }}</span><strong>{{ entry.value }}</strong>
												</div>
											</div>
										</div>
										<div v-if="log.new_value">
											<strong>{{ log.action === 'Created' ? 'Added item' : 'After' }}</strong>
											<div class="detail-grid">
												<div v-for="entry in detailEntries(log.new_value)" :key="entry.key" class="detail-field">
													<span>{{ formatLabel(entry.key) }}</span><strong>{{ entry.value }}</strong>
												</div>
											</div>
										</div>
									</div>
								</details>
								<span v-else class="text-secondary">No item details</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script>
const sensitiveKeys = new Set(['email', 'password', 'password_hash', 'access_token', 'refresh_token'])

export default {
	name: 'AuditLogs',
	data() {
		return { logs: [], loading: true, error: '' }
	},
	mounted() {
		this.getLogs()
	},
	methods: {
		async getLogs() {
			this.loading = true
			this.error = ''
			try {
				const response = await fetch('http://localhost:5000/api/audit-logs')
				const data = await response.json()
				if (!response.ok) throw new Error(data.error || 'Failed to load audit logs')
				this.logs = data
			} catch (error) {
				this.error = error.message
			} finally {
				this.loading = false
			}
		},
		formatDate(value) {
			return value ? new Date(value).toLocaleString() : '-'
		},
		actionClass(action) {
			return { Created: 'bg-success', Updated: 'bg-warning text-dark', Deleted: 'bg-danger' }[action] || 'bg-secondary'
		},
		detailEntries(value) {
			try {
				const parsed = typeof value === 'string' ? JSON.parse(value) : value
				return Object.entries(parsed || {})
					.filter(([key]) => !sensitiveKeys.has(key.toLowerCase()))
					.map(([key, entryValue]) => ({ key, value: entryValue === null || entryValue === '' ? '-' : String(entryValue) }))
			} catch {
				return [{ key: 'Details', value: String(value) }]
			}
		},
		formatLabel(value) {
			return value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
		}
	}
}
</script>

<style scoped>
h1 { color: #2f5d3a; }
.table thead th { background-color: #2f5d3a; color: white; white-space: nowrap; }
details summary { color: #2f5d3a; cursor: pointer; }
.details-content { min-width: 280px; margin-top: 8px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(130px, 1fr)); gap: 8px; margin: 8px 0 14px; }
.detail-field { display: flex; flex-direction: column; gap: 2px; padding: 8px; border: 1px solid #e5e5e5; border-radius: 4px; background: #f8f9fa; }
.detail-field span { color: #6c757d; font-size: 11px; }
.detail-field strong { overflow-wrap: anywhere; font-size: 13px; }
</style>
