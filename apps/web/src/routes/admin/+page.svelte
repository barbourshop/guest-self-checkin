<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Search, Download, Home } from 'lucide-svelte';
	import * as XLSX from 'xlsx';

	type Tab = 'membership' | 'queue' | 'log';
	let activeTab: Tab = 'membership';
	
	let membershipCache: any[] = [];
	let checkinQueue: any[] = [];
	let checkinLog: any[] = [];
	let isLoading = false;
	let error: string | null = null;

	// Filter states
	let membershipFilter = '';
	let queueFilter = '';
	let logFilter = '';

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/admin/database');
			if (!response.ok) throw new Error('Failed to load data');
			const data = await response.json();
			membershipCache = data.membershipCache || [];
			checkinQueue = data.checkinQueue || [];
			checkinLog = data.checkinLog || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load database contents';
			console.error('Error loading database contents:', err);
		} finally {
			isLoading = false;
		}
	}

	// Filtered data
	$: filteredMembershipCache = membershipCache.filter(item => {
		if (!membershipFilter) return true;
		const filter = membershipFilter.toLowerCase();
		const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
		return (
			item.customer_id?.toLowerCase().includes(filter) ||
			item.given_name?.toLowerCase().includes(filter) ||
			item.family_name?.toLowerCase().includes(filter) ||
			fullName.includes(filter) ||
			item.email_address?.toLowerCase().includes(filter) ||
			item.phone_number?.toLowerCase().includes(filter) ||
			item.reference_id?.toLowerCase().includes(filter) ||
			item.membership_order_id?.toLowerCase().includes(filter) ||
			item.membership_catalog_item_id?.toLowerCase().includes(filter) ||
			item.membership_variant_id?.toLowerCase().includes(filter) ||
			String(item.has_membership).includes(filter)
		);
	});

	$: filteredCheckinQueue = checkinQueue.filter(item => {
		if (!queueFilter) return true;
		const filter = queueFilter.toLowerCase();
		const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
		return (
			item.customer_id?.toLowerCase().includes(filter) ||
			item.given_name?.toLowerCase().includes(filter) ||
			item.family_name?.toLowerCase().includes(filter) ||
			fullName.includes(filter) ||
			item.email_address?.toLowerCase().includes(filter) ||
			item.phone_number?.toLowerCase().includes(filter) ||
			item.reference_id?.toLowerCase().includes(filter) ||
			item.order_id?.toLowerCase().includes(filter) ||
			item.status?.toLowerCase().includes(filter) ||
			String(item.guest_count).includes(filter)
		);
	});

	$: filteredCheckinLog = checkinLog.filter(item => {
		if (!logFilter) return true;
		const filter = logFilter.toLowerCase();
		const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
		return (
			item.customer_id?.toLowerCase().includes(filter) ||
			item.given_name?.toLowerCase().includes(filter) ||
			item.family_name?.toLowerCase().includes(filter) ||
			fullName.includes(filter) ||
			item.email_address?.toLowerCase().includes(filter) ||
			item.phone_number?.toLowerCase().includes(filter) ||
			item.reference_id?.toLowerCase().includes(filter) ||
			item.order_id?.toLowerCase().includes(filter) ||
			String(item.guest_count).includes(filter)
		);
	});

	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return '-';
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return dateString;
		}
	}

	function downloadCheckinLogExcel() {
		try {
			// Prepare data for Excel - use filtered data if filter is active, otherwise use all data
			const dataToExport = logFilter ? filteredCheckinLog : checkinLog;
			
			if (dataToExport.length === 0) {
				alert('No check-in data to export');
				return;
			}

			// Transform data to Excel-friendly format
			const excelData = dataToExport.map(item => ({
				'ID': item.id || '',
				'Name': `${item.given_name || ''} ${item.family_name || ''}`.trim() || '-',
				'Email': item.email_address || '-',
				'Phone': item.phone_number || '-',
				'Lot': item.reference_id || '-',
				'Customer ID': item.customer_id || '-',
				'Order ID': item.order_id || '-',
				'Guest Count': item.guest_count || 0,
				'Timestamp': item.timestamp ? new Date(item.timestamp).toLocaleString() : '-',
				'Synced to Square': item.synced_to_square === 1 ? 'Yes' : 'No'
			}));

			// Create workbook and worksheet
			const worksheet = XLSX.utils.json_to_sheet(excelData);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Check-in Log');

			// Generate filename with current date
			const now = new Date();
			const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
			const filename = `checkin-log-${dateStr}.xlsx`;

			// Write file and trigger download
			XLSX.writeFile(workbook, filename);
		} catch (err) {
			console.error('Error exporting to Excel:', err);
			alert('Failed to export check-in data to Excel. Please try again.');
		}
	}

	async function goToMemberCard(customerId: string, customerName: string) {
		// Fetch customer orders to get order ID
		try {
			const response = await fetch(`/api/customers/${customerId}/orders`);
			if (!response.ok) {
				alert('Failed to fetch customer orders');
				return;
			}
			const data = await response.json();
			const orders = data.orders || [];

			if (orders.length === 0) {
				alert('No membership orders found for this customer.');
				return;
			}

			const order = orders[0];
			const orderId = order.id;

			// Get variant description from line items
			const variantLineItem = order.lineItems?.find((item: any) => item.variationName);
			const variantDescription = variantLineItem?.variationName || variantLineItem?.name || 'Membership';

			// Build URL with all required data
			const params = new URLSearchParams({
				orderId: orderId,
				customerName: customerName,
				variantDescription: variantDescription
			});

			// Navigate to member card page with query params
			goto(`/member-card?${params.toString()}`);
		} catch (err) {
			alert(`Failed to generate member card: ${err instanceof Error ? err.message : 'Unknown error'}`);
			console.error('Error generating member card:', err);
		}
	}
</script>

<main>
	<div class="header">
		<div class="header-content">
			<div>
				<h1>Admin Dashboard</h1>
				<p>Manage members and generate QR codes</p>
			</div>
			<a href="/" class="home-link">
				<Home class="home-icon" />
				<span>Home</span>
			</a>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="tabs">
		<button
			class="tab-button"
			class:active={activeTab === 'membership'}
			on:click={() => activeTab = 'membership'}
		>
			Membership Cache ({membershipCache.length})
		</button>
		<button
			class="tab-button"
			class:active={activeTab === 'queue'}
			on:click={() => activeTab = 'queue'}
		>
			Check-in Queue ({checkinQueue.length})
		</button>
		<button
			class="tab-button"
			class:active={activeTab === 'log'}
			on:click={() => activeTab = 'log'}
		>
			Check-in Log ({checkinLog.length})
		</button>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<p>Loading...</p>
		</div>
	{:else if activeTab === 'membership'}
		<section class="card">
			<div class="section-header">
				<h2>Membership Cache</h2>
				<button on:click={loadData} disabled={isLoading} class="refresh-button">
					{isLoading ? 'Loading...' : 'Refresh'}
				</button>
			</div>

			<div class="filter-section">
				<div class="filter-input-wrapper">
					<Search class="filter-icon" />
					<input
						type="text"
						placeholder="Filter by name, email, phone, lot, customer ID, order ID..."
						bind:value={membershipFilter}
						class="filter-input"
					/>
				</div>
				<p class="filter-count">Showing {filteredMembershipCache.length} of {membershipCache.length} entries</p>
			</div>

			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Phone</th>
							<th>Lot</th>
							<th>Customer ID</th>
							<th>Order ID</th>
							<th>Has Membership</th>
							<th>Last Verified</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredMembershipCache.length === 0}
							<tr>
								<td colspan="9" class="no-data">No membership cache entries found</td>
							</tr>
						{:else}
							{#each filteredMembershipCache as member}
								<tr>
									<td>
										{#if member.given_name || member.family_name}
											{member.given_name || ''} {member.family_name || ''}
										{:else}
											<span class="muted">—</span>
										{/if}
									</td>
									<td>{member.email_address || '-'}</td>
									<td>{member.phone_number || '-'}</td>
									<td>{member.reference_id || '-'}</td>
									<td class="mono">{member.customer_id || 'N/A'}</td>
									<td class="mono">{member.membership_order_id || '-'}</td>
									<td>
										<span class="badge" class:badge-success={member.has_membership === 1} class:badge-error={member.has_membership !== 1}>
											{member.has_membership === 1 ? 'Yes' : 'No'}
										</span>
									</td>
									<td>{formatDate(member.last_verified_at)}</td>
									<td>
										{#if member.has_membership === 1}
											<button
												on:click={() =>
													goToMemberCard(
														member.customer_id,
														`${member.given_name || ''} ${member.family_name || ''}`.trim() ||
															'Member'
													)}
												class="link-button"
											>
												Generate Card
											</button>
										{:else}
											<span class="muted">—</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	{:else if activeTab === 'queue'}
		<section class="card">
			<div class="section-header">
				<h2>Check-in Queue</h2>
				<button on:click={loadData} disabled={isLoading} class="refresh-button">
					{isLoading ? 'Loading...' : 'Refresh'}
				</button>
			</div>

			<div class="filter-section">
				<div class="filter-input-wrapper">
					<Search class="filter-icon" />
					<input
						type="text"
						placeholder="Filter by customer ID, order ID, or status..."
						bind:value={queueFilter}
						class="filter-input"
					/>
				</div>
				<p class="filter-count">Showing {filteredCheckinQueue.length} of {checkinQueue.length} entries</p>
			</div>

			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Email</th>
							<th>Phone</th>
							<th>Lot</th>
							<th>Customer ID</th>
							<th>Order ID</th>
							<th>Guest Count</th>
							<th>Status</th>
							<th>Created At</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredCheckinQueue.length === 0}
							<tr>
								<td colspan="10" class="no-data">No queued check-ins found</td>
							</tr>
						{:else}
							{#each filteredCheckinQueue as item}
								<tr>
									<td class="mono">{item.id}</td>
									<td>
										{#if item.given_name || item.family_name}
											{item.given_name || ''} {item.family_name || ''}
										{:else}
											<span class="muted">—</span>
										{/if}
									</td>
									<td>{item.email_address || '-'}</td>
									<td>{item.phone_number || '-'}</td>
									<td>{item.reference_id || '-'}</td>
									<td class="mono">{item.customer_id || 'N/A'}</td>
									<td class="mono">{item.order_id || 'N/A'}</td>
									<td>{item.guest_count}</td>
									<td>
										<span class="badge" class:badge-success={item.status === 'synced'} class:badge-warning={item.status === 'pending'} class:badge-error={item.status !== 'synced' && item.status !== 'pending'}>
											{item.status}
										</span>
									</td>
									<td>{formatDate(item.created_at)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	{:else if activeTab === 'log'}
		<section class="card">
			<div class="section-header">
				<h2>Check-in Log</h2>
				<div class="section-actions">
					<button on:click={downloadCheckinLogExcel} disabled={isLoading || checkinLog.length === 0} class="download-button">
						<Download class="button-icon" />
						Export to Excel
					</button>
					<button on:click={loadData} disabled={isLoading} class="refresh-button">
						{isLoading ? 'Loading...' : 'Refresh'}
					</button>
				</div>
			</div>

			<div class="filter-section">
				<div class="filter-input-wrapper">
					<Search class="filter-icon" />
					<input
						type="text"
						placeholder="Filter by name, email, phone, lot, customer ID, order ID..."
						bind:value={logFilter}
						class="filter-input"
					/>
				</div>
				<p class="filter-count">Showing {filteredCheckinLog.length} of {checkinLog.length} entries (showing last 1000)</p>
			</div>

			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Email</th>
							<th>Phone</th>
							<th>Lot</th>
							<th>Customer ID</th>
							<th>Order ID</th>
							<th>Guest Count</th>
							<th>Timestamp</th>
							<th>Synced</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredCheckinLog.length === 0}
							<tr>
								<td colspan="10" class="no-data">No check-in log entries found</td>
							</tr>
						{:else}
							{#each filteredCheckinLog as item}
								<tr>
									<td class="mono">{item.id}</td>
									<td>
										{#if item.given_name || item.family_name}
											{item.given_name || ''} {item.family_name || ''}
										{:else}
											<span class="muted">—</span>
										{/if}
									</td>
									<td>{item.email_address || '-'}</td>
									<td>{item.phone_number || '-'}</td>
									<td>{item.reference_id || '-'}</td>
									<td class="mono">{item.customer_id || 'N/A'}</td>
									<td class="mono">{item.order_id || 'N/A'}</td>
									<td>{item.guest_count}</td>
									<td>{formatDate(item.timestamp)}</td>
									<td>
										<span class="badge" class:badge-success={item.synced_to_square === 1} class:badge-warning={item.synced_to_square !== 1}>
											{item.synced_to_square === 1 ? 'Yes' : 'No'}
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.header {
		margin-bottom: 1.5rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.header h1 {
		margin-bottom: 0.5rem;
		font-size: 1.75rem;
	}

	.header p {
		color: #6b7280;
		line-height: 1.6;
		margin: 0;
	}

	.home-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		text-decoration: none;
		color: #374151;
		font-weight: 500;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.home-link:hover {
		background: #e5e7eb;
		color: #1f2937;
		border-color: #d1d5db;
	}

	.home-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.card {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.section-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.refresh-button {
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.refresh-button:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.refresh-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.download-button {
		padding: 0.5rem 1rem;
		background: #10b981;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background-color 0.2s;
	}

	.download-button:hover:not(:disabled) {
		background: #059669;
	}

	.download-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-icon {
		width: 1rem;
		height: 1rem;
	}

	.error-banner {
		background: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.error-banner p {
		color: #991b1b;
		margin: 0;
	}

	.muted {
		color: #6b7280;
	}

	.table-container {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: #f9fafb;
	}

	th,
	td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	th {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	td {
		color: #1f2937;
	}

	.mono {
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.875rem;
	}

	.link-button {
		background: none;
		border: none;
		color: #2563eb;
		cursor: pointer;
		text-decoration: underline;
		font-weight: 500;
		padding: 0;
	}

	.link-button:hover {
		color: #1d4ed8;
	}

	.tabs {
		display: flex;
		border-bottom: 2px solid #e5e7eb;
		margin-bottom: 1.5rem;
		gap: 0;
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: #6b7280;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: -2px;
	}

	.tab-button:hover {
		color: #374151;
		border-bottom-color: #d1d5db;
	}

	.tab-button.active {
		color: #2563eb;
		border-bottom-color: #2563eb;
		font-weight: 600;
	}

	.loading-state {
		text-align: center;
		padding: 3rem;
		color: #6b7280;
	}

	.filter-section {
		margin-bottom: 1rem;
	}

	.filter-input-wrapper {
		position: relative;
		margin-bottom: 0.5rem;
	}

	.filter-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: #9ca3af;
		pointer-events: none;
	}

	.filter-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.filter-input:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
		border-color: #2563eb;
	}

	.filter-count {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.no-data {
		text-align: center;
		padding: 2rem;
		color: #9ca3af;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-success {
		background: #d1fae5;
		color: #065f46;
	}

	.badge-warning {
		background: #fef3c7;
		color: #92400e;
	}

	.badge-error {
		background: #fee2e2;
		color: #991b1b;
	}

	@media (max-width: 1024px) {
		.table-container {
			font-size: 0.875rem;
		}

		th,
		td {
			padding: 0.5rem;
		}

		.tabs {
			overflow-x: auto;
		}

		.tab-button {
			white-space: nowrap;
		}
	}
</style>
