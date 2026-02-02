<script lang="ts">
	import { Check, AlertCircle, Settings, Search, QrCode, Loader2, Ticket, Users, ArrowLeft } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { searchCustomers } from '$lib';
	import type { SearchResult } from '$lib';
	import CustomerDetail from '$lib/components/CustomerDetail.svelte';

	let query = '';
	let isScanning = false;
	let showManualSearch = true; // Default to manual search; card scan is opt-in
	let isLoading = false;
	let error: string | null = null;
	let showConfirmation = false;
	let inputElement: HTMLInputElement | null = null;
	let searchResults: SearchResult[] = [];
	let selectedCustomer: SearchResult | null = null;
	let guestCount = 1;
	let showDayPassFlow = false;
	let dayPassGuestCount = 1;

	function handleResetState() {
		query = '';
		error = null;
		showConfirmation = false;
		isScanning = false;
		isLoading = false;
		searchResults = [];
		selectedCustomer = null;
		guestCount = 1;
		showDayPassFlow = false;
		dayPassGuestCount = 1;
		if (inputElement) {
			inputElement.focus();
		}
	}

	/** Auto-detect search type from a string (same logic for manual search and scan). */
	function getSearchTypeAndValue(trimmed: string): { type: 'phone' | 'email' | 'lot' | 'name' | 'customer_id'; value: string } {
		// Customer ID: alphanumeric, may include _ or -, no spaces, typically 10+ chars (e.g. Square customer ID from card)
		if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes(' ')) {
			return { type: 'customer_id', value: trimmed };
		}
		if (trimmed.includes('@') && trimmed.includes('.')) {
			return { type: 'email', value: trimmed };
		}
		if (/^[\d\s\-\(\)\+]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 10) {
			return { type: 'phone', value: trimmed.replace(/\D/g, '') };
		}
		if (trimmed.length < 10 && (/^[A-Z]{2,}\s*\d+\.?\d*$/i.test(trimmed) || /^\d+\.\d+/.test(trimmed) || (/^[A-Z]{1,2}\d+\.?\d*$/i.test(trimmed) && trimmed.length <= 8))) {
			return { type: 'lot', value: trimmed };
		}
		if (/[A-Za-z]/.test(trimmed)) {
			return { type: 'name', value: trimmed };
		}
		return { type: 'name', value: trimmed };
	}

	/** Run search with a string (used by both manual search and scan). */
	async function runSearch(searchValue: string, opts?: { autoSelectIfOne?: boolean }) {
		const autoSelectIfOne = opts?.autoSelectIfOne === true;
		const trimmed = searchValue.trim();
		if (!trimmed) {
			error = 'Please enter a search query';
			return;
		}
		isLoading = true;
		error = null;
		searchResults = [];
		selectedCustomer = null;
		try {
			const { type, value } = getSearchTypeAndValue(trimmed);
			const results = await searchCustomers({
				query: { type, value, fuzzy: type !== 'customer_id' },
				includeMembershipMeta: true
			});
			if (results && results.length > 0) {
				searchResults = results;
				// Only auto-select single result when triggered by scan (skip list); manual search always shows list
				if (autoSelectIfOne && results.length === 1) {
					selectedCustomer = results[0];
					guestCount = 1;
				}
			} else {
				error = 'No customers found. Try a different search.';
			}
		} catch (err) {
			console.error('Error searching:', err);
			error = 'An issue with check-in, please see the manager on duty';
		} finally {
			isLoading = false;
		}
	}

	// Auto-dismiss confirmation after 3 seconds
	$: if (showConfirmation) {
		setTimeout(() => {
			handleResetState();
		}, 3000);
	}

	async function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		query = value;

		// In card scan mode, don't auto-submit - wait for button click or Enter key
		// Auto-submit is handled by handleKeyPress or the Scan button
	}

	/** Scan card: treat scanned value as search; if one result, skip list and go straight to check-in. */
	async function handleScanSubmit(scannedValue: string) {
		isScanning = true;
		await runSearch(scannedValue.trim(), { autoSelectIfOne: true });
		isScanning = false;
		if (inputElement) {
			inputElement.value = '';
			setTimeout(() => inputElement?.focus(), 100);
		}
	}

	async function handleManualSearch() {
		await runSearch(query.trim());
	}

	async function handleDayPassCheckIn() {
		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/customers/check-in/daypass', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guestCount: dayPassGuestCount })
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Check-in failed with status ${response.status}`);
			}
			const result = await response.json();
			if (result.success) {
				showDayPassFlow = false;
				showConfirmation = true;
			} else {
				error = result.error || 'An issue with check-in, please see the manager on duty';
			}
		} catch (err) {
			console.error('Error during day-pass check-in:', err);
			error = err instanceof Error ? err.message : 'An issue with check-in, please see the manager on duty';
		} finally {
			isLoading = false;
		}
	}

	async function handleCheckIn(customer: SearchResult) {
		if (!customer) {
			error = 'Please select a customer';
			return;
		}

		isLoading = true;
		error = null;

		try {
			// Call backend endpoint to log the check-in (segment-based; no order ID)
			const checkInPayload: any = {
				customerId: customer.customerId,
				guestCount: guestCount,
				firstName: customer.displayName.split(' ')[0] || '',
				lastName: customer.displayName.split(' ').slice(1).join(' ') || ''
			};

			if (customer.contact.lotNumber) {
				checkInPayload.lotNumber = customer.contact.lotNumber;
			}

			const response = await fetch('/api/customers/check-in', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(checkInPayload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Check-in failed with status ${response.status}`);
			}

			const result = await response.json();
			if (result.success) {
				showConfirmation = true;
			} else {
				error = result.error || 'An issue with check-in, please see the manager on duty';
			}
		} catch (err) {
			console.error('Error during check-in:', err);
			error = err instanceof Error ? err.message : 'An issue with check-in, please see the manager on duty';
		} finally {
			isLoading = false;
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (showManualSearch) {
				handleManualSearch();
			} else if (query.trim()) {
				handleScanSubmit(query.trim());
			}
		}
	}

	function openAdmin() {
		goto('/admin');
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-primary-600 text-white py-6 px-4 shadow-lg">
		<div class="max-w-3xl mx-auto">
			<div class="flex justify-between items-start">
				<div>
					<h1 class="text-3xl font-bold">Big Trees Village Rec Center Check In</h1>
					<p class="mt-2 text-primary-100">
						Search by name, phone, email, or lot number — or scan your membership card
					</p>
				</div>
				<button
					on:click={openAdmin}
					class="p-2 text-white hover:bg-primary-700 rounded-lg transition-colors"
					title="Admin View"
				>
					<Settings class="h-6 w-6" />
				</button>
			</div>
		</div>
	</header>

	<main class="max-w-3xl mx-auto p-4 mt-6">
		{#if showConfirmation}
			<div class="bg-green-50 rounded-lg p-8 text-center">
				<div
					data-testid="green-checkmark"
					class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<Check class="h-8 w-8 text-green-600" />
				</div>
				<h2 class="text-2xl font-bold text-green-900 mb-2">All Set!</h2>
				<p class="text-green-700">You're checked in and ready to go. Enjoy your visit!</p>
			</div>
		{:else if showDayPassFlow}
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex justify-between items-start mb-6">
					<div class="flex items-center gap-3">
						<button
							on:click={() => { showDayPassFlow = false; error = null; }}
							class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
							aria-label="Back"
						>
							<ArrowLeft class="h-5 w-5" />
						</button>
						<div class="flex items-center gap-2">
							<div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
								<Ticket class="h-5 w-5 text-amber-700" />
							</div>
							<div>
								<h2 class="text-xl font-bold text-gray-900">Day pass check-in</h2>
								<p class="text-sm text-gray-500">Anonymous sale — no member search</p>
							</div>
						</div>
					</div>
				</div>
				<div class="max-w-2xl mx-auto">
					<div class="bg-gray-50 p-6 rounded-lg">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Number of guests</h3>
						<div class="flex flex-col items-center mb-6">
							<div class="text-7xl font-bold text-primary-600 mb-2">{dayPassGuestCount}</div>
							<div class="text-sm text-gray-500 mb-4">Total Guests</div>
						</div>
						<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
							{#each Array(10) as _, i}
								{@const count = i + 1}
								<button
									type="button"
									on:click={() => { dayPassGuestCount = count; }}
									class="py-4 px-4 rounded-lg text-lg font-semibold transition-colors {dayPassGuestCount === count
										? 'bg-primary-600 text-white hover:bg-primary-700'
										: 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50'}"
								>
									{count}
								</button>
							{/each}
						</div>
						<button
							type="button"
							on:click={handleDayPassCheckIn}
							disabled={isLoading}
							class="w-full py-3 rounded-lg flex items-center justify-center gap-2 bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						>
							{#if isLoading}
								<Loader2 class="h-5 w-5 animate-spin" />
								<span>Checking in…</span>
							{:else}
								<Users class="h-5 w-5" />
								<span>Check in day pass</span>
							{/if}
						</button>
					</div>
				</div>
				{#if error}
					<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
						<AlertCircle class="h-5 w-5 shrink-0" />
						<span>{error}</span>
					</div>
				{/if}
			</div>
		{:else if selectedCustomer}
			<CustomerDetail
				customer={selectedCustomer}
				{guestCount}
				onGuestCountChange={(count) => {
					guestCount = count;
				}}
				onCheckIn={() => handleCheckIn(selectedCustomer)}
				onReset={handleResetState}
			/>
		{:else}
			<div class="space-y-6 mb-6">
				<!-- Search, Day pass, Scan card – three equal columns (1/3 each) -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<button
						type="button"
						on:click={() => {
							showManualSearch = true;
							showDayPassFlow = false;
							error = null;
							searchResults = [];
							selectedCustomer = null;
							setTimeout(() => inputElement?.focus(), 100);
						}}
						class="action-card flex flex-row items-center gap-4 p-4 rounded-xl text-left border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 hover:border-primary-400 transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
					>
						<div class="w-12 h-12 rounded-lg bg-primary-200 flex items-center justify-center shrink-0">
							<Search class="h-6 w-6 text-primary-800" />
						</div>
						<span class="text-lg font-bold text-primary-900">Search</span>
					</button>
					<button
						type="button"
						on:click={() => {
							showDayPassFlow = true;
							error = null;
							query = '';
							searchResults = [];
							selectedCustomer = null;
						}}
						class="action-card flex flex-row items-center gap-4 p-4 rounded-xl text-left border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-colors focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
					>
						<div class="w-12 h-12 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
							<Ticket class="h-6 w-6 text-amber-800" />
						</div>
						<span class="text-lg font-bold text-amber-900">Day pass</span>
					</button>
					<button
						type="button"
						on:click={() => {
							showManualSearch = false;
							query = '';
							setTimeout(() => inputElement?.focus(), 100);
						}}
						class="action-card flex flex-row items-center gap-4 p-4 rounded-xl text-left border-2 border-primary-100 bg-primary-50 hover:bg-primary-100 hover:border-primary-200 transition-colors focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
					>
						<div class="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
							<QrCode class="h-6 w-6 text-primary-700" />
						</div>
						<span class="text-lg font-bold text-primary-900">Scan</span>
					</button>
				</div>

				<!-- Search for customers – full width prominent card (primary green) -->
				<div class="rounded-xl border-2 border-primary-200 bg-primary-50 p-6 sm:p-8 shadow-sm">
					<div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
						<div class="w-16 h-16 rounded-xl bg-primary-200 flex items-center justify-center shrink-0">
							<Search class="h-9 w-9 text-primary-800" />
						</div>
						<div>
							<h2 class="text-xl font-bold text-primary-900">
								{#if showManualSearch}
									Search for Customer
								{:else}
									Scan Card
								{/if}
							</h2>
							<p class="text-sm text-primary-700 mt-1">
								{#if showManualSearch}
									Search by name, phone, email, address, or lot number
								{:else}
									Scan your membership card or search manually
								{/if}
							</p>
						</div>
					</div>

					<div class="flex gap-3">
						<div class="relative flex-1">
							<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
								{#if isScanning}
									<Loader2 class="h-5 w-5 text-primary-600 animate-spin" />
								{:else if showManualSearch}
									<Search class="h-5 w-5 text-primary-500" />
								{:else}
									<QrCode class="h-5 w-5 text-primary-500" />
								{/if}
							</div>
							<input
								bind:this={inputElement}
								type="text"
								placeholder={showManualSearch ? 'Type to search...' : 'Scan card or type to search...'}
								class="w-full pl-10 pr-4 py-4 text-lg border-2 border-primary-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								bind:value={query}
								on:input={handleInputChange}
								on:keypress={handleKeyPress}
								disabled={isLoading || isScanning}
								autofocus
								autocomplete="off"
							/>
						</div>
						{#if !showManualSearch}
							<button
								on:click={() => {
									if (query.trim()) {
										handleScanSubmit(query.trim());
									}
								}}
								disabled={isLoading || isScanning || !query.trim()}
								class="px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
							>
								{#if isScanning}
									<Loader2 class="h-5 w-5 animate-spin" />
									<span>Scanning...</span>
								{:else}
									<QrCode class="h-5 w-5" />
									<span>Scan</span>
								{/if}
							</button>
						{:else}
							<button
								on:click={handleManualSearch}
								disabled={isLoading || isScanning || !query.trim()}
								class="px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
							>
								{#if isLoading}
									<Loader2 class="h-5 w-5 animate-spin" />
									<span>Searching...</span>
								{:else}
									<Search class="h-5 w-5" />
									<span>Search</span>
								{/if}
							</button>
						{/if}
					</div>

					{#if !showManualSearch}
						<div class="mt-3">
							<button
								on:click={() => {
									showManualSearch = true;
									query = '';
									if (inputElement) {
										inputElement.focus();
									}
								}}
								class="text-sm text-primary-600 hover:text-primary-800 font-medium"
							>
								← Back to Search
							</button>
						</div>
					{/if}
				</div>

				{#if error}
					<div
						class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
					>
						<AlertCircle class="h-5 w-5" />
						<span>{error}</span>
					</div>
				{/if}

				{#if isScanning}
					<div
						class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700"
					>
						<Loader2 class="h-5 w-5 animate-spin" />
						<span>Validating card...</span>
					</div>
				{/if}

				{#if searchResults.length > 0 && !selectedCustomer}
					<div class="mt-4 bg-white rounded-lg shadow-md border border-gray-200">
						<div class="p-4 border-b border-gray-200">
							<h3 class="text-lg font-semibold text-gray-800">
								Search Results ({searchResults.length})
							</h3>
						</div>
						<div class="divide-y divide-gray-200">
							{#each searchResults as customer}
								<button
									on:click={() => {
										selectedCustomer = customer;
										guestCount = 1;
									}}
									class="w-full text-left hover:bg-gray-50 transition-colors"
								>
									<div class="bg-green-50 border-b border-green-200 px-4 py-2.5 flex justify-between items-center gap-2">
										<span class="text-base font-bold text-gray-900 tracking-tight min-w-0 truncate">{customer.displayName}</span>
										<span
											class="px-2 py-0.5 text-xs font-semibold rounded shrink-0 {customer.membership.segmentNames && customer.membership.segmentNames.length > 0
												? 'bg-green-100 text-green-800'
												: 'bg-gray-200 text-gray-800'}"
										>
											{customer.membership.segmentNames && customer.membership.segmentNames.length > 0
												? customer.membership.segmentNames.join(', ')
												: customer.membership.type}
										</span>
									</div>
									<div class="p-4 pt-2">
										<div class="text-xs text-gray-500">
											{#if customer.contact.email}
												<span>{customer.contact.email}</span>
											{/if}
											{#if customer.contact.phone}
												<span>{customer.contact.phone ? ' • ' : ''}{customer.contact.phone}</span>
											{/if}
											{#if customer.contact.lotNumber}
												<span>{customer.contact.lotNumber ? ' • ' : ''}Lot: {customer.contact.lotNumber}</span>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>
