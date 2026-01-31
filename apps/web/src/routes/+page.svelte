<script lang="ts">
	import { Check, AlertCircle, Settings, Search, QrCode, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { validatePass, searchCustomers, getCustomerById } from '$lib';
	import type { PassValidationResponse, SearchResult } from '$lib';
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
	let scannedOrderId: string | null = null; // Store order ID from scanned card

	function handleResetState() {
		query = '';
		error = null;
		showConfirmation = false;
		isScanning = false;
		isLoading = false;
		searchResults = [];
		selectedCustomer = null;
		guestCount = 1;
		scannedOrderId = null;
		if (inputElement) {
			inputElement.focus();
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

	async function handleQRCode(scannedValue: string) {
		isScanning = true;
		isLoading = true;
		query = '';
		error = null;
		selectedCustomer = null;

		try {
			const response: PassValidationResponse = await validatePass({
				token: scannedValue.trim()
			});

			if (response.order?.accessVerified && response.customerId) {
				// Store the order ID for later check-in logging
				scannedOrderId = response.order.id;
				
				// Look up customer details from order's customer ID
				const customer = await getCustomerById(response.customerId);
				if (customer) {
					selectedCustomer = customer;
					guestCount = 1; // Reset guest count
				} else {
					error = 'Customer information not found. Please see the manager on duty.';
				}
			} else {
				error = 'Invalid card or membership not found. Please see the manager on duty.';
			}
		} catch (err) {
			error = 'An issue with check-in, please see the manager on duty';
		} finally {
			isScanning = false;
			isLoading = false;
			if (inputElement) {
				inputElement.value = '';
				setTimeout(() => inputElement?.focus(), 100);
			}
		}
	}

	async function handleManualSearch() {
		if (!query.trim()) {
			error = 'Please enter a search query';
			return;
		}

		isLoading = true;
		error = null;
		searchResults = [];
		selectedCustomer = null;

		try {
			// Auto-detect search type
			const trimmed = query.trim();
			let searchType: 'phone' | 'email' | 'lot' | 'name' = 'name'; // Default to name search
			let searchValue = trimmed;

			// Check for email pattern
			if (trimmed.includes('@') && trimmed.includes('.')) {
				searchType = 'email';
			}
			// Check for phone pattern (digits, possibly with formatting)
			else if (/^[\d\s\-\(\)\+]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 10) {
				searchType = 'phone';
				// Normalize phone number
				searchValue = trimmed.replace(/\D/g, '');
			}
			// Check for lot number pattern (short alphanumeric with numbers/dots, typically < 10 chars)
			else if (trimmed.length < 10 && (/^[A-Z]{2,}\s*\d+\.?\d*$/i.test(trimmed) || /^\d+\.\d+/.test(trimmed) || (/^[A-Z]{1,2}\d+\.?\d*$/i.test(trimmed) && trimmed.length <= 8))) {
				searchType = 'lot';
			}
			// Default to name search if it contains letters and doesn't match other patterns
			else if (/[A-Za-z]/.test(trimmed)) {
				searchType = 'name';
			}

			const results = await searchCustomers({
				query: {
					type: searchType,
					value: searchValue,
					fuzzy: true // Always use fuzzy search for better UX
				},
				includeMembershipMeta: true
			});

			if (results && results.length > 0) {
				searchResults = results;
				// Always show the search results list, don't auto-select
			} else {
				error = 'No customers found. Please try a different search.';
			}
		} catch (err) {
			console.error('Error searching:', err);
			error = 'An issue with check-in, please see the manager on duty';
		} finally {
			isLoading = false;
		}
	}

	async function handleCheckIn(customer: SearchResult, orderId?: string) {
		if (!customer) {
			error = 'Please select a customer';
			return;
		}

		isLoading = true;
		error = null;

		try {
			// Call backend endpoint to log the check-in
			const checkInPayload: any = {
				customerId: customer.customerId,
				guestCount: guestCount,
				firstName: customer.displayName.split(' ')[0] || '',
				lastName: customer.displayName.split(' ').slice(1).join(' ') || ''
			};

			// Add order ID if we have one (from scanned card)
			if (orderId) {
				checkInPayload.orderId = orderId;
			}

			// Add contact info if available
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
			} else if (query.trim().length >= 10) {
				handleQRCode(query.trim());
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
		{:else if selectedCustomer}
			<CustomerDetail
				customer={selectedCustomer}
				{guestCount}
				onGuestCountChange={(count) => {
					guestCount = count;
				}}
				onCheckIn={() => handleCheckIn(selectedCustomer, scannedOrderId || undefined)}
				onReset={handleResetState}
			/>
		{:else}
			<div class="bg-white rounded-lg shadow-md p-6 mb-6">
				<div class="mb-4">
					<h2 class="text-xl font-semibold text-gray-800 mb-2">
						{#if showManualSearch}
							Search for Customer
						{:else}
							Scan Card
						{/if}
					</h2>
					<p class="text-sm text-gray-600">
						{#if showManualSearch}
							Search by name, phone, email, address, or lot number
						{:else}
							Scan your membership card or search manually
						{/if}
					</p>
				</div>

				<div class="flex gap-3">
					<div class="relative flex-1">
						<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
							{#if isScanning}
								<Loader2 class="h-5 w-5 text-primary-600 animate-spin" />
							{:else if showManualSearch}
								<Search class="h-5 w-5 text-gray-400" />
							{:else}
								<QrCode class="h-5 w-5 text-gray-400" />
							{/if}
						</div>
						<input
							bind:this={inputElement}
							type="text"
							placeholder={showManualSearch ? 'Type to search...' : 'Scan card or enter order ID...'}
							class="w-full pl-10 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
								if (query.trim().length >= 10) {
									handleQRCode(query.trim());
								}
							}}
							disabled={isLoading || isScanning || !query.trim() || query.trim().length < 10}
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

				<div class="mt-3">
					{#if showManualSearch}
						<button
							on:click={() => {
								showManualSearch = false;
								query = '';
								if (inputElement) {
									inputElement.focus();
								}
							}}
							class="text-sm text-primary-600 hover:text-primary-700"
						>
							Need to scan your card? Click here
						</button>
					{:else}
						<button
							on:click={() => {
								showManualSearch = true;
								query = '';
								if (inputElement) {
									inputElement.focus();
								}
							}}
							class="text-sm text-primary-600 hover:text-primary-700"
						>
							← Back to Search
						</button>
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
									<div class="bg-green-50 border-b border-green-200 px-4 py-2.5 flex justify-between items-center">
										<span class="text-base font-bold text-gray-900 tracking-tight">{customer.displayName}</span>
										<span
											class="px-2 py-0.5 text-xs font-semibold rounded shrink-0 {customer.membership.type === 'Member'
												? 'bg-green-100 text-green-800'
												: 'bg-gray-200 text-gray-800'}"
										>
											{customer.membership.type}
										</span>
									</div>
									<div class="p-4 pt-2">
										<div class="min-w-0 flex-1">
											{#if customer.membership.segmentNames && customer.membership.segmentNames.length > 0}
												<div class="text-sm text-gray-700">
													Membership: <span class="font-bold">{customer.membership.segmentNames.join(', ')}</span>
												</div>
											{/if}
											<div class="text-xs text-gray-500 mt-1">
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
