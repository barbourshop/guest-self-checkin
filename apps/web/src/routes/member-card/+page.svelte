<script lang="ts">
	import { searchCustomers, validatePass } from '$lib';
	import type { SearchResult, PassValidationResponse } from '$lib';
	import OrderIdCard from '$lib/components/OrderIdCard.svelte';

	let passToken = '';
	let passResponse: PassValidationResponse | null = null;
	let passError = '';
	let isValidatingPass = false;

	let customerSearchType: 'phone' | 'email' | 'lot' = 'phone';
	let customerSearchQuery = '';
	let customerResult: SearchResult | null = null;
	let isSearchingCustomer = false;
	let customerSearchError = '';

	// Editable customer data for the card
	let editedCustomer: SearchResult | null = null;
	let showName = true;
	let showPhone = true;
	let showEmail = true;
	let showLot = true;
	let editedName = '';
	let editedPhone = '';
	let editedEmail = '';
	let editedLot = '';

	async function handlePassValidation(event: SubmitEvent) {
		event.preventDefault();
		if (!passToken.trim()) {
			passError = 'Enter an order ID.';
			passResponse = null;
			return;
		}
		isValidatingPass = true;
		passError = '';
		passResponse = null;
		customerResult = null;
		customerSearchError = '';
		
		try {
			passResponse = await validatePass({
				token: passToken.trim()
			});

			// If customer search query is provided, search for customer
			if (customerSearchQuery.trim()) {
				isSearchingCustomer = true;
				try {
					const customerResults = await searchCustomers({
						query: {
							type: customerSearchType,
							value: customerSearchQuery.trim(),
							fuzzy: customerSearchType !== 'phone'
						},
						includeMembershipMeta: true
					});
					if (customerResults.length > 0) {
						customerResult = customerResults[0];
						// Initialize editable customer data
						editedCustomer = { ...customerResult };
						editedName = customerResult.displayName;
						editedPhone = customerResult.contact.phone || '';
						editedEmail = customerResult.contact.email || '';
						editedLot = customerResult.contact.lotNumber || '';
						// Initialize visibility flags
						showName = true;
						showPhone = !!customerResult.contact.phone;
						showEmail = !!customerResult.contact.email;
						showLot = !!customerResult.contact.lotNumber;
					} else {
						customerSearchError = 'No customer found with that information.';
						editedCustomer = null;
					}
				} catch (error) {
					customerSearchError = (error as Error).message;
				} finally {
					isSearchingCustomer = false;
				}
			}
		} catch (error) {
			passError = (error as Error).message;
		} finally {
			isValidatingPass = false;
		}
	}

	function getDisplayCustomer(): SearchResult | null {
		if (!editedCustomer) return null;

		return {
			...editedCustomer,
			displayName: showName ? editedName : '',
			contact: {
				phone: showPhone ? editedPhone : undefined,
				email: showEmail ? editedEmail : undefined,
				lotNumber: showLot ? editedLot : undefined
			}
		};
	}
</script>

<main>
	<div class="header">
		<h1>Generate Member Card</h1>
		<p>Enter a Square order ID to generate a member card. Optionally search for customer information to display on the card.</p>
	</div>
	
	<div class="content-split">
		<div class="left-panel">
			<section class="card">
				<form on:submit={handlePassValidation} class="stack">
					<label>
						<span>Order ID</span>
						<input type="text" bind:value={passToken} placeholder="01jhWt5FUwg4ElpiQy73Yvs1cEYZY" required />
					</label>
					<div class="customer-search-section">
						<h3>Customer Information (Optional)</h3>
						<div class="customer-search-fields">
							<label>
								<span>Search Type</span>
								<select bind:value={customerSearchType}>
									<option value="phone">Phone</option>
									<option value="email">Email</option>
									<option value="lot">Lot</option>
								</select>
							</label>
							<label>
								<span>Customer Search</span>
								<input type="text" bind:value={customerSearchQuery} placeholder="Enter phone, email, or lot number" />
							</label>
						</div>
					</div>
					<button type="submit" disabled={isValidatingPass || isSearchingCustomer}>
						{isValidatingPass || isSearchingCustomer ? 'Generating Card…' : 'Generate Member Card'}
					</button>
				</form>
				{#if passError}
					<p class="error">{passError}</p>
				{/if}
				{#if customerSearchError}
					<p class="error">{customerSearchError}</p>
				{/if}
			</section>

			{#if passResponse && editedCustomer}
				<section class="card edit-section">
					<h3>Edit Card Information</h3>
					<div class="edit-fields">
						<div class="edit-field">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={showName} />
								<span>Show Name</span>
							</label>
							{#if showName}
								<input type="text" bind:value={editedName} placeholder="Customer name" />
							{/if}
						</div>
						<div class="edit-field">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={showPhone} />
								<span>Show Phone</span>
							</label>
							{#if showPhone}
								<input type="text" bind:value={editedPhone} placeholder="Phone number" />
							{/if}
						</div>
						<div class="edit-field">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={showEmail} />
								<span>Show Email</span>
							</label>
							{#if showEmail}
								<input type="text" bind:value={editedEmail} placeholder="Email address" />
							{/if}
						</div>
						<div class="edit-field">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={showLot} />
								<span>Show Lot Number</span>
							</label>
							{#if showLot}
								<input type="text" bind:value={editedLot} placeholder="Lot number" />
							{/if}
						</div>
					</div>
				</section>
			{/if}
		</div>

		<div class="right-panel">
			{#if passResponse}
				<div class="id-card-container">
					<OrderIdCard order={passResponse.order} customer={getDisplayCustomer()} />
				</div>
			{:else}
				<div class="placeholder">
					<p>Card preview will appear here after entering an Order ID and clicking "Generate Member Card".</p>
				</div>
			{/if}
		</div>
	</div>
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

	.header h1 {
		margin-bottom: 0.5rem;
		font-size: 1.75rem;
	}

	.header p {
		color: #6b7280;
		line-height: 1.6;
		margin: 0;
	}

	.content-split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		align-items: start;
	}

	.left-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.right-panel {
		position: sticky;
		top: 1.5rem;
	}

	.card {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
	}

	.edit-section {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
	}

	.edit-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	form.stack {
		display: grid;
		gap: 1rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	input,
	select,
	button {
		font: inherit;
		padding: 0.6rem 0.75rem;
		border-radius: 8px;
		border: 1px solid #d1d5db;
	}

	button {
		background: #2563eb;
		color: white;
		border: none;
		cursor: pointer;
		font-weight: 600;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.customer-search-section {
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.customer-search-section h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.customer-search-fields {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 0.75rem;
	}

	.edit-fields {
		display: grid;
		gap: 0.75rem;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: auto;
		margin: 0;
		cursor: pointer;
	}

	.edit-field input[type="text"] {
		margin-top: 0.25rem;
	}

	.id-card-container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	.placeholder {
		background: white;
		border-radius: 16px;
		padding: 3rem 2rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
		text-align: center;
		border: 2px dashed #e5e7eb;
	}

	.placeholder p {
		color: #9ca3af;
		margin: 0;
		line-height: 1.6;
	}

	@media (max-width: 1024px) {
		.content-split {
			grid-template-columns: 1fr;
		}

		.right-panel {
			position: static;
		}
	}

	@media (max-width: 640px) {
		main {
			padding: 1rem;
		}

		.customer-search-fields {
			grid-template-columns: 1fr;
		}
	}

	.error {
		color: #dc2626;
		font-weight: 600;
	}
</style>

