<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Search, Download, Home } from 'lucide-svelte';
	import * as XLSX from 'xlsx';

	type Tab = 'membership' | 'segments' | 'queue' | 'log' | 'settings';
	let activeTab: Tab = 'membership';
	
	let membershipCache: any[] = [];
	let customerSegments: any[] = [];
	let checkinQueue: any[] = [];
	let checkinLog: any[] = [];
	let isLoading = false;
	let error: string | null = null;

	// Filter states
	let membershipFilter = '';
	let queueFilter = '';
	let logFilter = '';

	// Cache status
	let cacheStats: any = null;
	let isRefreshingCache = false;
	let isClearingCache = false;
	let refreshProgress: any = null;
	let progressInterval: any = null;

	// Configuration
	let appConfig: any = {};
	let isSavingConfig = false;
	let configSaveMessage: string | null = null;

	onMount(() => {
		// Load in background so the page is usable immediately
		loadData();
		loadCacheStatus();
		loadConfig();
	});

	onDestroy(() => {
		if (progressInterval) {
			clearInterval(progressInterval);
		}
	});

	async function loadData(opts?: { enrich?: boolean }) {
		const enrich = opts?.enrich === true;
		const isInitialLoad = !enrich;
		if (isInitialLoad) {
			isLoading = true;
			error = null;
		}
		const url = `/api/admin/database${enrich ? '?enrich=true' : ''}`;
		try {
			const response = await fetch(url);
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.error || `Failed to load data (${response.status})`);
			}
			const data = await response.json();
			// Always use latest membership cache from API (it includes stored names/address from DB)
			membershipCache = Array.isArray(data.membershipCache) ? data.membershipCache : [];
			customerSegments = data.customerSegments || [];
			checkinQueue = data.checkinQueue || [];
			checkinLog = data.checkinLog || [];
			// Keep Cache Status section in sync (Total Customers, etc.)
			await loadCacheStatus();
			// Load enriched queue/log in background (membership cache already has names/address from DB)
			if (isInitialLoad && (membershipCache.length > 0 || checkinQueue.length > 0 || checkinLog.length > 0)) {
				loadData({ enrich: true });
			}
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to load database contents';
			}
			console.error('Error loading database contents:', err);
		} finally {
			if (isInitialLoad) {
				isLoading = false;
			}
		}
	}

	async function loadCacheStatus() {
		try {
			const response = await fetch('/api/admin/cache/status');
			if (!response.ok) throw new Error('Failed to load cache status');
			cacheStats = await response.json();
			// Sync refreshing state from server so Status/indicator stay correct (e.g. after load or if server is still working)
			if (cacheStats?.refreshInProgress === true) {
				isRefreshingCache = true;
				if (!progressInterval) startProgressPolling();
			}
		} catch (err) {
			console.error('Error loading cache status:', err);
		}
	}

	function startProgressPolling() {
		if (progressInterval) {
			clearInterval(progressInterval);
		}
		
		isRefreshingCache = true;
		progressInterval = setInterval(async () => {
			try {
				const [progressRes, statusRes] = await Promise.all([
					fetch('/api/admin/cache/progress'),
					fetch('/api/admin/cache/status')
				]);
				// Update Cache Status; sync isRefreshingCache from server (only set true, never false from server)
				if (statusRes.ok) {
					cacheStats = await statusRes.json();
					if (cacheStats?.refreshInProgress === true) isRefreshingCache = true;
				}
				if (progressRes.ok) {
					const progress = await progressRes.json();
					if (progress.inProgress === true) {
						refreshProgress = progress;
					} else if (progress.inProgress === false) {
						// Only stop when BOTH progress and status say not in progress
						const bothDone = cacheStats?.refreshInProgress !== true;
						if (bothDone) {
							stopProgressPolling();
							await loadCacheStatus();
							await loadData();
						}
						if (progress.processed != null) refreshProgress = progress;
					}
				}
			} catch (err) {
				console.error('Error polling progress:', err);
			}
		}, 1000); // Poll every second
	}

	function stopProgressPolling() {
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}
		isRefreshingCache = false;
		refreshProgress = null;
	}

	async function handleRefreshCache() {
		if (isRefreshingCache) return;
		
		isRefreshingCache = true;
		error = null;
		
		try {
			const response = await fetch('/api/admin/cache/refresh', {
				method: 'POST'
			});
			
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to start cache refresh');
			}
			
			const data = await response.json();
			refreshProgress = data.progress;
			
			// Start polling for progress
			startProgressPolling();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to refresh cache';
			isRefreshingCache = false;
			console.error('Error refreshing cache:', err);
		}
	}

	async function handleClearCache() {
		if (isClearingCache || isRefreshingCache) return;
		if (!confirm('Clear the entire membership cache? You can then use Refresh Cache to repopulate only from your configured segments.')) return;
		isClearingCache = true;
		error = null;
		try {
			const response = await fetch('/api/admin/cache/clear', { method: 'POST' });
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to clear cache');
			}
			await loadCacheStatus();
			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to clear cache';
		} finally {
			isClearingCache = false;
		}
	}

	function formatCacheAge(hours: number): string {
		if (hours < 1) {
			const minutes = Math.round(hours * 60);
			return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
		} else if (hours < 24) {
			const h = Math.floor(hours);
			const m = Math.round((hours - h) * 60);
			if (m === 0) {
				return `${h} hour${h !== 1 ? 's' : ''}`;
			}
			return `${h}h ${m}m`;
		} else {
			const days = Math.floor(hours / 24);
			const h = Math.floor(hours % 24);
			if (h === 0) {
				return `${days} day${days !== 1 ? 's' : ''}`;
			}
			return `${days}d ${h}h`;
		}
	}

	async function loadConfig() {
		try {
			const response = await fetch('/api/admin/config');
			if (!response.ok) throw new Error('Failed to load config');
			appConfig = await response.json();
		} catch (err) {
			console.error('Error loading config:', err);
			appConfig = {};
		}
	}

	async function saveConfig(key: string, value: string) {
		isSavingConfig = true;
		configSaveMessage = null;
		
		try {
			const response = await fetch('/api/admin/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key, value })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save config');
			}

			const data = await response.json();
			configSaveMessage = 'Configuration saved successfully';
			
			// Update local config
			await loadConfig();
			
			// Clear message after 3 seconds
			setTimeout(() => {
				configSaveMessage = null;
			}, 3000);
		} catch (err) {
			configSaveMessage = err instanceof Error ? err.message : 'Failed to save configuration';
			console.error('Error saving config:', err);
		} finally {
			isSavingConfig = false;
		}
	}

	function getConfigValue(key: string): string {
		return appConfig[key]?.value || '';
	}

	function getConfigSource(key: string): string {
		return appConfig[key]?.source || 'environment';
	}

	// Segment management
	let newSegmentId = '';
	let newSegmentDisplayName = '';
	let newSegmentSortOrder = 0;
	let segmentMessage: string | null = null;
	let editingSegmentId: string | null = null;
	let editSegmentDisplayName = '';
	let editSegmentSortOrder = 0;

	async function loadSegments() {
		try {
			const response = await fetch('/api/admin/segments');
			if (response.ok) customerSegments = await response.json();
		} catch (err) {
			console.error('Error loading segments:', err);
		}
	}

	async function addSegment() {
		if (!newSegmentId.trim() || !newSegmentDisplayName.trim()) {
			segmentMessage = 'Segment ID and display name are required';
			return;
		}
		segmentMessage = null;
		try {
			const response = await fetch('/api/admin/segments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					segment_id: newSegmentId.trim(),
					display_name: newSegmentDisplayName.trim(),
					sort_order: newSegmentSortOrder
				})
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to add segment');
			}
			newSegmentId = '';
			newSegmentDisplayName = '';
			newSegmentSortOrder = 0;
			await loadData();
			segmentMessage = 'Segment added. Refresh cache to update membership.';
			setTimeout(() => { segmentMessage = null; }, 3000);
		} catch (err) {
			segmentMessage = err instanceof Error ? err.message : 'Failed to add segment';
		}
	}

	function startEditSegment(seg: { segment_id: string; display_name: string; sort_order: number }) {
		editingSegmentId = seg.segment_id;
		editSegmentDisplayName = seg.display_name;
		editSegmentSortOrder = seg.sort_order ?? 0;
	}

	function cancelEditSegment() {
		editingSegmentId = null;
	}

	async function saveEditSegment() {
		if (!editingSegmentId) return;
		segmentMessage = null;
		try {
			const response = await fetch(`/api/admin/segments/${encodeURIComponent(editingSegmentId)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					display_name: editSegmentDisplayName.trim(),
					sort_order: editSegmentSortOrder
				})
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to update segment');
			}
			editingSegmentId = null;
			await loadData();
			segmentMessage = 'Segment updated.';
			setTimeout(() => { segmentMessage = null; }, 3000);
		} catch (err) {
			segmentMessage = err instanceof Error ? err.message : 'Failed to update segment';
		}
	}

	async function deleteSegment(segmentId: string) {
		if (!confirm('Remove this segment? Cache will need to be refreshed.')) return;
		try {
			const response = await fetch(`/api/admin/segments/${encodeURIComponent(segmentId)}`, { method: 'DELETE' });
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete segment');
			}
			await loadData();
		} catch (err) {
			segmentMessage = err instanceof Error ? err.message : 'Failed to delete segment';
		}
	}

	// Membership cache sort
	let membershipSortColumn: string = 'name';
	let membershipSortDir: 'asc' | 'desc' = 'asc';

	function getSegmentNamesForIds(segmentIds: string | string[] | null): string[] {
		if (!segmentIds) return [];
		const ids = typeof segmentIds === 'string' ? (() => { try { return JSON.parse(segmentIds); } catch { return []; } })() : segmentIds;
		return ids.map((id: string) => customerSegments.find((s: any) => s.segment_id === id)?.display_name ?? id);
	}

	function getMembershipSortValue(item: any, col: string): string | number {
		switch (col) {
			case 'name':
				return `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase() || '\uFFFF';
			case 'email':
				return (item.email_address || '').toLowerCase() || '\uFFFF';
			case 'phone':
				return (item.phone_number || '').toLowerCase() || '\uFFFF';
			case 'lot':
				return (item.reference_id || '').toLowerCase() || '\uFFFF';
			case 'address':
				return [item.address_line_1, item.locality, item.postal_code].filter(Boolean).join(' ').toLowerCase() || '\uFFFF';
			case 'customer_id':
				return (item.customer_id || '').toLowerCase() || '\uFFFF';
			case 'segments':
				return getSegmentNamesForIds(item.segment_ids).join(',').toLowerCase() || '\uFFFF';
			case 'has_membership':
				return item.has_membership === 1 ? 1 : 0;
			case 'last_verified_at':
				return item.last_verified_at ? new Date(item.last_verified_at).getTime() : 0;
			default:
				return '';
		}
	}

	function setMembershipSort(col: string) {
		if (membershipSortColumn === col) {
			membershipSortDir = membershipSortDir === 'asc' ? 'desc' : 'asc';
		} else {
			membershipSortColumn = col;
			membershipSortDir = 'asc';
		}
	}

	$: filteredMembershipCache = membershipCache.filter(item => {
		if (!membershipFilter) return true;
		const filter = membershipFilter.toLowerCase();
		const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
		const segmentNames = getSegmentNamesForIds(item.segment_ids).join(' ').toLowerCase();
		const addressStr = [item.address_line_1, item.locality, item.postal_code].filter(Boolean).join(' ').toLowerCase();
		return (
			item.customer_id?.toLowerCase().includes(filter) ||
			item.given_name?.toLowerCase().includes(filter) ||
			item.family_name?.toLowerCase().includes(filter) ||
			fullName.includes(filter) ||
			item.email_address?.toLowerCase().includes(filter) ||
			item.phone_number?.toLowerCase().includes(filter) ||
			item.reference_id?.toLowerCase().includes(filter) ||
			addressStr.includes(filter) ||
			segmentNames.includes(filter) ||
			String(item.has_membership).includes(filter)
		);
	});

	$: sortedMembershipCache = (() => {
		const list = [...filteredMembershipCache];
		const col = membershipSortColumn;
		const dir = membershipSortDir === 'asc' ? 1 : -1;
		list.sort((a, b) => {
			const va = getMembershipSortValue(a, col);
			const vb = getMembershipSortValue(b, col);
			if (va < vb) return -1 * dir;
			if (va > vb) return 1 * dir;
			return 0;
		});
		return list;
	})();

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
			class:active={activeTab === 'segments'}
			on:click={() => activeTab = 'segments'}
		>
			Segments ({customerSegments.length})
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
		<button
			class="tab-button"
			class:active={activeTab === 'settings'}
			on:click={() => activeTab = 'settings'}
		>
			Settings
		</button>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<p>Loading data...</p>
		</div>
	{:else if activeTab === 'membership'}
		<!-- Cache Status Section -->
		<section class="card cache-status-card" class:cache-refreshing={isRefreshingCache}>
			<div class="cache-status-indicator" class:refreshing={isRefreshingCache} class:idle={!isRefreshingCache}>
				{#if isRefreshingCache}
					<span class="status-spinner" aria-hidden="true"></span>
					<span>Refreshing cache…</span>
					{#if refreshProgress?.total}
						<span class="indicator-detail">{refreshProgress.processed} of {refreshProgress.total}</span>
					{/if}
				{:else}
					<span class="status-dot idle-dot" aria-hidden="true"></span>
					<span>Idle</span>
				{/if}
			</div>
			<div class="cache-status-header">
				<div>
					<h2>Cache Status</h2>
					{#if cacheStats}
						<div class="cache-stats">
							<div class="stat-item">
								<span class="stat-label">Total Customers:</span>
								<span class="stat-value">{cacheStats.totalCustomers}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Last Refresh:</span>
								<span class="stat-value">
									{#if cacheStats.lastRefreshTime}
										{formatDate(cacheStats.lastRefreshTime)} ({formatCacheAge(cacheStats.cacheAgeHours)} ago)
									{:else}
										Never
									{/if}
								</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Status:</span>
								<span class="stat-value">
									{#if isRefreshingCache}
										<span class="status-badge status-refreshing">
											<span class="status-spinner small" aria-hidden="true"></span>
											Refreshing…
										</span>
									{:else if cacheStats.cacheStatus === 'Fresh'}
										<span class="status-badge status-fresh">✅ Fresh</span>
									{:else if cacheStats.cacheStatus === 'Stale'}
										<span class="status-badge status-stale">⚠️ Stale</span>
									{:else if cacheStats.cacheStatus === 'Empty'}
										<span class="status-badge status-empty">❌ Empty</span>
									{:else}
										<span class="status-badge status-error">❌ Error</span>
									{/if}
								</span>
							</div>
						</div>
					{/if}
				</div>
				<div class="cache-actions">
					<button 
						on:click={handleClearCache} 
						disabled={isRefreshingCache || isClearingCache || isLoading} 
						class="clear-cache-button"
						title="Remove all entries so Refresh Cache repopulates only from configured segments"
					>
						{isClearingCache ? 'Clearing...' : 'Clear Cache'}
					</button>
					<button 
						on:click={handleRefreshCache} 
						disabled={isRefreshingCache || isLoading} 
						class="refresh-cache-button"
					>
						{isRefreshingCache ? 'Refreshing...' : 'Refresh Cache'}
					</button>
				</div>
			</div>

			{#if isRefreshingCache && refreshProgress}
				<div class="refresh-progress">
					<div class="progress-header">
						<span>Refreshing membership cache...</span>
						<span class="progress-text">
							{refreshProgress.processed} of {refreshProgress.total} customers ({refreshProgress.total ? Math.round((refreshProgress.processed / refreshProgress.total) * 100) : 0}%)
						</span>
					</div>
					<div class="progress-bar-container">
						<div 
							class="progress-bar" 
							style="width: {refreshProgress.total ? Math.round((refreshProgress.processed / refreshProgress.total) * 100) : 0}%"
						></div>
					</div>
					{#if refreshProgress.membersFound > 0 || refreshProgress.errors > 0}
						<div class="progress-stats">
							<span>Members found: {refreshProgress.membersFound}</span>
							{#if refreshProgress.errors > 0}
								<span class="error-count">Errors: {refreshProgress.errors}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</section>

		<section class="card">
			<div class="section-header">
				<h2>Membership Cache</h2>
				<button on:click={() => loadData()} disabled={isLoading} class="refresh-button">
					{isLoading ? 'Loading...' : 'Refresh'}
				</button>
			</div>

			<div class="filter-section">
				<div class="filter-input-wrapper">
					<Search class="filter-icon" />
					<input
						type="text"
						placeholder="Filter by name, email, phone, lot, address, customer ID, segments..."
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
							<th class="sortable" class:sorted={membershipSortColumn === 'name'} on:click={() => setMembershipSort('name')}>
								Name {#if membershipSortColumn === 'name'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'email'} on:click={() => setMembershipSort('email')}>
								Email {#if membershipSortColumn === 'email'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'phone'} on:click={() => setMembershipSort('phone')}>
								Phone {#if membershipSortColumn === 'phone'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'lot'} on:click={() => setMembershipSort('lot')}>
								Lot {#if membershipSortColumn === 'lot'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'address'} on:click={() => setMembershipSort('address')}>
								Address {#if membershipSortColumn === 'address'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'customer_id'} on:click={() => setMembershipSort('customer_id')}>
								Customer ID {#if membershipSortColumn === 'customer_id'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'segments'} on:click={() => setMembershipSort('segments')}>
								Segments {#if membershipSortColumn === 'segments'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'has_membership'} on:click={() => setMembershipSort('has_membership')}>
								Has Membership {#if membershipSortColumn === 'has_membership'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th class="sortable" class:sorted={membershipSortColumn === 'last_verified_at'} on:click={() => setMembershipSort('last_verified_at')}>
								Last Verified {#if membershipSortColumn === 'last_verified_at'}<span class="sort-arrow">{membershipSortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#if sortedMembershipCache.length === 0}
							<tr>
								<td colspan="10" class="no-data">No membership cache entries found</td>
							</tr>
						{:else}
							{#each sortedMembershipCache as member}
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
									<td>{[member.address_line_1, member.locality, member.postal_code].filter(Boolean).join(', ') || '—'}</td>
									<td class="mono">{member.customer_id || 'N/A'}</td>
									<td>{getSegmentNamesForIds(member.segment_ids).join(', ') || '—'}</td>
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
	{:else if activeTab === 'segments'}
		<section class="card">
			<div class="section-header">
				<h2>Customer Segments</h2>
				<button on:click={handleRefreshCache} disabled={isRefreshingCache || isLoading} class="refresh-button">
					{isRefreshingCache ? 'Refreshing...' : 'Refresh Membership Cache'}
				</button>
			</div>
			<p class="settings-hint">Membership is determined by which of these Square customer segments a customer is in. Add segments (Square segment ID + display name); search results show segment names. After changing segments, refresh the cache.</p>
			{#if segmentMessage}
				<div class="config-message" class:config-error={segmentMessage.includes('Failed') || segmentMessage.includes('Error')}>
					{segmentMessage}
				</div>
			{/if}
			<div class="settings-section" style="margin-top: 1rem;">
				<h3>Add segment</h3>
				<div class="settings-grid">
					<div class="setting-item">
						<label for="new-segment-id">Segment ID (Square)</label>
						<input id="new-segment-id" type="text" bind:value={newSegmentId} class="setting-input" placeholder="e.g. gv2:8F7ZZE81CS3W745SDBTJHDAVNG" />
					</div>
					<div class="setting-item">
						<label for="new-segment-name">Display name</label>
						<input id="new-segment-name" type="text" bind:value={newSegmentDisplayName} class="setting-input" placeholder="e.g. Annual Member" />
					</div>
					<div class="setting-item">
						<label for="new-segment-sort">Sort order</label>
						<input id="new-segment-sort" type="number" bind:value={newSegmentSortOrder} class="setting-input" style="width: 6rem;" />
					</div>
					<div class="setting-item" style="align-self: flex-end;">
						<button on:click={addSegment} class="setting-save-button">Add</button>
					</div>
				</div>
			</div>
			<div class="table-container" style="margin-top: 1.5rem;">
				<table>
					<thead>
						<tr>
							<th>Display name</th>
							<th>Segment ID</th>
							<th>Sort order</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if customerSegments.length === 0}
							<tr>
								<td colspan="4" class="no-data">No segments configured. Add at least one segment to use segment-based membership.</td>
							</tr>
						{:else}
							{#each customerSegments as seg}
								<tr>
									{#if editingSegmentId === seg.segment_id}
										<td><input type="text" bind:value={editSegmentDisplayName} class="setting-input" style="width: 100%;" /></td>
										<td class="mono">{seg.segment_id}</td>
										<td><input type="number" bind:value={editSegmentSortOrder} class="setting-input" style="width: 5rem;" /></td>
										<td>
											<button on:click={saveEditSegment} class="link-button">Save</button>
											<button on:click={cancelEditSegment} class="link-button">Cancel</button>
										</td>
									{:else}
										<td>{seg.display_name}</td>
										<td class="mono">{seg.segment_id}</td>
										<td>{seg.sort_order ?? 0}</td>
										<td>
											<button on:click={() => startEditSegment(seg)} class="link-button">Edit</button>
											<button on:click={() => deleteSegment(seg.segment_id)} class="link-button" style="color: var(--error, #b91c1c);">Delete</button>
										</td>
									{/if}
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
				<button on:click={() => loadData()} disabled={isLoading} class="refresh-button">
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
					<button on:click={() => loadData()} disabled={isLoading} class="refresh-button">
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
	{:else if activeTab === 'settings'}
		<section class="card">
			<div class="section-header">
				<h2>Application Settings</h2>
				<button on:click={loadConfig} disabled={isSavingConfig} class="refresh-button">
					{isSavingConfig ? 'Saving...' : 'Refresh'}
				</button>
			</div>

			{#if configSaveMessage}
				<div class="config-message" class:config-error={configSaveMessage.includes('Failed') || configSaveMessage.includes('Error')}>
					{configSaveMessage}
				</div>
			{/if}

			<div class="settings-section">
				<h3>Membership Configuration</h3>
				<p class="settings-hint">Membership is based on Square customer segments below.</p>
				{#if segmentMessage}
					<div class="config-message" class:config-error={segmentMessage.includes('Failed') || segmentMessage.includes('Error')}>
						{segmentMessage}
					</div>
				{/if}
				<div class="settings-section-inner" style="margin-top: 1rem;">
					<h4 class="settings-subheading">Add segment</h4>
					<div class="settings-grid">
						<div class="setting-item">
							<label for="settings-new-segment-id">Segment ID (Square)</label>
							<input id="settings-new-segment-id" type="text" bind:value={newSegmentId} class="setting-input" placeholder="e.g. gv2:8F7ZZE81CS3W745SDBTJHDAVNG" />
						</div>
						<div class="setting-item">
							<label for="settings-new-segment-name">Friendly name</label>
							<input id="settings-new-segment-name" type="text" bind:value={newSegmentDisplayName} class="setting-input" placeholder="e.g. Annual Member" />
						</div>
						<div class="setting-item" style="align-self: flex-end;">
							<button on:click={addSegment} class="setting-save-button">Add</button>
						</div>
					</div>
				</div>
				<div class="table-container" style="margin-top: 1.5rem;">
					<table>
						<thead>
							<tr>
								<th>Friendly name</th>
								<th>Segment ID</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#if customerSegments.length === 0}
								<tr>
									<td colspan="3" class="no-data">No segments registered. Add a segment above.</td>
								</tr>
							{:else}
								{#each customerSegments as seg}
									<tr>
										{#if editingSegmentId === seg.segment_id}
											<td><input type="text" bind:value={editSegmentDisplayName} class="setting-input" style="width: 100%;" /></td>
											<td class="mono">{seg.segment_id}</td>
											<td>
												<button on:click={saveEditSegment} class="link-button">Save</button>
												<button on:click={cancelEditSegment} class="link-button">Cancel</button>
											</td>
										{:else}
											<td>{seg.display_name}</td>
											<td class="mono">{seg.segment_id}</td>
											<td>
												<button on:click={() => startEditSegment(seg)} class="link-button">Edit</button>
												<button on:click={() => deleteSegment(seg.segment_id)} class="link-button" style="color: var(--error, #b91c1c);">Delete</button>
											</td>
										{/if}
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div class="settings-section">
				<h3>API Rate Limiting</h3>
				<div class="settings-grid">
					<div class="setting-item">
						<label for="bulk-refresh-concurrency">
							Concurrent Requests
							<span class="setting-source">({getConfigSource('BULK_REFRESH_CONCURRENCY')})</span>
						</label>
						<div class="setting-input-group">
							<input
								id="bulk-refresh-concurrency"
								type="number"
								min="1"
								max="20"
								value={getConfigValue('BULK_REFRESH_CONCURRENCY') || '5'}
								on:input={(e) => appConfig['BULK_REFRESH_CONCURRENCY'] = { ...appConfig['BULK_REFRESH_CONCURRENCY'], value: e.currentTarget.value }}
								class="setting-input"
								placeholder="5"
							/>
							<button
								on:click={() => saveConfig('BULK_REFRESH_CONCURRENCY', getConfigValue('BULK_REFRESH_CONCURRENCY') || '5')}
								disabled={isSavingConfig}
								class="setting-save-button"
							>
								Save
							</button>
						</div>
						<p class="setting-help">Number of parallel requests (lower = slower but safer)</p>
					</div>

					<div class="setting-item">
						<label for="bulk-refresh-rate-limit">
							Delay Between Batches (ms)
							<span class="setting-source">({getConfigSource('BULK_REFRESH_RATE_LIMIT_MS')})</span>
						</label>
						<div class="setting-input-group">
							<input
								id="bulk-refresh-rate-limit"
								type="number"
								min="0"
								max="10000"
								value={getConfigValue('BULK_REFRESH_RATE_LIMIT_MS') || '500'}
								on:input={(e) => appConfig['BULK_REFRESH_RATE_LIMIT_MS'] = { ...appConfig['BULK_REFRESH_RATE_LIMIT_MS'], value: e.currentTarget.value }}
								class="setting-input"
								placeholder="500"
							/>
							<button
								on:click={() => saveConfig('BULK_REFRESH_RATE_LIMIT_MS', getConfigValue('BULK_REFRESH_RATE_LIMIT_MS') || '500')}
								disabled={isSavingConfig}
								class="setting-save-button"
							>
								Save
							</button>
						</div>
						<p class="setting-help">Milliseconds to wait between batches</p>
					</div>

					<div class="setting-item">
						<label for="bulk-refresh-request-delay">
							Delay Between Requests (ms)
							<span class="setting-source">({getConfigSource('BULK_REFRESH_REQUEST_DELAY_MS')})</span>
						</label>
						<div class="setting-input-group">
							<input
								id="bulk-refresh-request-delay"
								type="number"
								min="0"
								max="5000"
								value={getConfigValue('BULK_REFRESH_REQUEST_DELAY_MS') || '200'}
								on:input={(e) => appConfig['BULK_REFRESH_REQUEST_DELAY_MS'] = { ...appConfig['BULK_REFRESH_REQUEST_DELAY_MS'], value: e.currentTarget.value }}
								class="setting-input"
								placeholder="200"
							/>
							<button
								on:click={() => saveConfig('BULK_REFRESH_REQUEST_DELAY_MS', getConfigValue('BULK_REFRESH_REQUEST_DELAY_MS') || '200')}
								disabled={isSavingConfig}
								class="setting-save-button"
							>
								Save
							</button>
						</div>
						<p class="setting-help">Milliseconds between individual requests in a batch</p>
					</div>
				</div>
			</div>

			<div class="settings-section">
				<h3>API Configuration</h3>
				<div class="settings-grid">
					<div class="setting-item">
						<label for="square-api-url">
							Square API URL
							<span class="setting-source">({getConfigSource('SQUARE_API_URL')})</span>
						</label>
						<div class="setting-input-group">
							<input
								id="square-api-url"
								type="text"
								value={getConfigValue('SQUARE_API_URL') || 'https://connect.squareup.com/v2'}
								on:input={(e) => appConfig['SQUARE_API_URL'] = { ...appConfig['SQUARE_API_URL'], value: e.currentTarget.value }}
								class="setting-input"
								placeholder="https://connect.squareup.com/v2"
							/>
							<button
								on:click={() => saveConfig('SQUARE_API_URL', getConfigValue('SQUARE_API_URL') || 'https://connect.squareup.com/v2')}
								disabled={isSavingConfig}
								class="setting-save-button"
							>
								Save
							</button>
						</div>
					</div>

					<div class="setting-item">
						<label for="square-api-version">
							Square API Version
							<span class="setting-source">({getConfigSource('SQUARE_API_VERSION')})</span>
						</label>
						<div class="setting-input-group">
							<input
								id="square-api-version"
								type="text"
								value={getConfigValue('SQUARE_API_VERSION') || '2025-10-16'}
								on:input={(e) => appConfig['SQUARE_API_VERSION'] = { ...appConfig['SQUARE_API_VERSION'], value: e.currentTarget.value }}
								class="setting-input"
								placeholder="2025-10-16"
							/>
							<button
								on:click={() => saveConfig('SQUARE_API_VERSION', getConfigValue('SQUARE_API_VERSION') || '2025-10-16')}
								disabled={isSavingConfig}
								class="setting-save-button"
							>
								Save
							</button>
						</div>
					</div>
				</div>
			</div>

			<div class="settings-section">
				<h3>Cache Configuration</h3>
				<div class="settings-grid">
					<div class="setting-item">
						<label for="cache-refresh-age">
							Cache Refresh Age (hours)
							<span class="setting-source">({getConfigSource('CACHE_REFRESH_AGE_HOURS')})</span>
						</label>
						<div class="setting-input-group">
							<input
								id="cache-refresh-age"
								type="number"
								min="1"
								max="168"
								value={getConfigValue('CACHE_REFRESH_AGE_HOURS') || '24'}
								on:input={(e) => appConfig['CACHE_REFRESH_AGE_HOURS'] = { ...appConfig['CACHE_REFRESH_AGE_HOURS'], value: e.currentTarget.value }}
								class="setting-input"
								placeholder="24"
							/>
							<button
								on:click={() => saveConfig('CACHE_REFRESH_AGE_HOURS', getConfigValue('CACHE_REFRESH_AGE_HOURS') || '24')}
								disabled={isSavingConfig}
								class="setting-save-button"
							>
								Save
							</button>
						</div>
						<p class="setting-help">Hours before cache is considered stale (1-168)</p>
					</div>
				</div>
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
		margin-bottom: 1.5rem;
	}

	.cache-status-card {
		background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
		border: 2px solid #e2e8f0;
	}

	.cache-status-card.cache-refreshing {
		border-color: #93c5fd;
		box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15);
	}

	.cache-status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		margin: -1.5rem -1.5rem 1rem -1.5rem;
		border-radius: 14px 14px 0 0;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.cache-status-indicator.refreshing {
		background: #eff6ff;
		color: #1d4ed8;
	}

	.cache-status-indicator.idle {
		background: #f1f5f9;
		color: #64748b;
	}

	.indicator-detail {
		margin-left: auto;
		font-size: 0.8125rem;
		color: #64748b;
	}

	.status-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #bfdbfe;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: cache-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	.status-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-dot.idle-dot {
		background: #94a3b8;
	}

	@keyframes cache-spin {
		to { transform: rotate(360deg); }
	}

	.cache-status-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1.5rem;
	}

	.cache-status-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.cache-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-top: 0.5rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.stat-value {
		font-size: 1rem;
		color: #1f2937;
		font-weight: 600;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-fresh {
		background: #d1fae5;
		color: #065f46;
	}

	.status-stale {
		background: #fef3c7;
		color: #92400e;
	}

	.status-empty {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-error {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-badge.status-refreshing {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.status-spinner.small {
		width: 0.75rem;
		height: 0.75rem;
		border-width: 1.5px;
	}

	.cache-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.clear-cache-button {
		padding: 0.75rem 1.5rem;
		background: white;
		color: #b91c1c;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-size: 1rem;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.clear-cache-button:hover:not(:disabled) {
		background: #fef2f2;
		border-color: #b91c1c;
	}

	.clear-cache-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.refresh-cache-button {
		padding: 0.75rem 1.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-size: 1rem;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.refresh-cache-button:hover:not(:disabled) {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.refresh-cache-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.refresh-progress {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		font-weight: 500;
		color: #374151;
	}

	.progress-text {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.progress-bar-container {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
		transition: width 0.3s ease;
		border-radius: 4px;
	}

	.progress-stats {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.error-count {
		color: #dc2626;
		font-weight: 500;
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

	th.sortable {
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
	}

	th.sortable:hover {
		color: #2563eb;
	}

	th.sortable.sorted {
		color: #2563eb;
	}

	.sort-arrow {
		margin-left: 0.25rem;
		font-size: 0.75rem;
		opacity: 0.9;
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

		.settings-grid {
			grid-template-columns: 1fr;
		}
	}

	.settings-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.settings-section:last-child {
		border-bottom: none;
	}

	.settings-section h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.setting-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.setting-item label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.setting-source {
		font-size: 0.75rem;
		font-weight: 400;
		color: #6b7280;
		font-style: italic;
	}

	.setting-input-group {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.setting-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	.setting-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.setting-save-button {
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		font-size: 0.875rem;
		transition: background-color 0.2s;
		white-space: nowrap;
	}

	.setting-save-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.setting-save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.setting-help {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
		margin-top: 0.25rem;
	}

	.config-message {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		background: #d1fae5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}

	.config-message.config-error {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fecaca;
	}
</style>
