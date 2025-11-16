<script lang="ts">
	import { searchCustomers, validatePass } from '$lib';
	import type { SearchResult, PassValidationResponse } from '$lib';

	let searchType: 'phone' | 'email' | 'lot' = 'phone';
	let searchQuery = '';
	let searchResults: SearchResult[] = [];
	let isSearching = false;
	let searchError = '';

	let passToken = '';
	let passResponse: PassValidationResponse | null = null;
	let passError = '';
	let isValidatingPass = false;

	async function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		if (!searchQuery.trim()) {
			searchResults = [];
			searchError = 'Enter a query to search.';
			return;
		}
		isSearching = true;
		searchError = '';
			try {
			searchResults = await searchCustomers({
				query: {
					type: searchType,
					value: searchQuery.trim(),
					fuzzy: searchType !== 'phone'
				},
				includeMembershipMeta: true
			});
		} catch (error) {
			searchError = (error as Error).message;
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	async function handlePassValidation(event: SubmitEvent) {
		event.preventDefault();
		if (!passToken.trim()) {
			passError = 'Enter an order token.';
			passResponse = null;
			return;
		}
		isValidatingPass = true;
		passError = '';
		passResponse = null;
		try {
			passResponse = await validatePass({
				token: passToken.trim()
			});
		} catch (error) {
			passError = (error as Error).message;
		} finally {
			isValidatingPass = false;
		}
	}
</script>

<main>
	<section class="card">
		<h1>Member & Guest Lookup</h1>
		<form on:submit={handleSearch} class="stack">
			<label>
				<span>Search Type</span>
				<select bind:value={searchType}>
					<option value="phone">Phone</option>
					<option value="email">Email</option>
					<option value="lot">Lot</option>
				</select>
			</label>
			<label>
				<span>Query</span>
				<input type="text" placeholder="Enter value" bind:value={searchQuery} required />
			</label>
			<button type="submit" disabled={isSearching}>
				{isSearching ? 'Searching…' : 'Search Square'}
			</button>
		</form>
		{#if searchError}
			<p class="error">{searchError}</p>
		{/if}
		{#if searchResults.length}
			<div class="results">
				{#each searchResults as result}
					<article class="result-card">
						<header>
							<strong>{result.displayName}</strong>
							<span class:member={result.membership.type === 'Member'}>
								{result.membership.type}
							</span>
						</header>
						<ul>
							{#if result.contact.phone}
								<li><small>Phone:</small> {result.contact.phone}</li>
							{/if}
							{#if result.contact.email}
								<li><small>Email:</small> {result.contact.email}</li>
							{/if}
							{#if result.contact.lotNumber}
								<li><small>Lot:</small> {result.contact.lotNumber}</li>
							{/if}
						</ul>
						<footer>
							<small>Hash: {result.customerHash}</small>
						</footer>
					</article>
				{/each}
			</div>
		{:else if !isSearching && !searchError}
			<p class="muted">No results yet.</p>
		{/if}
	</section>

	<section class="card">
		<h2>Pass / Order Validation</h2>
		<p>Enter a Square order ID to validate and view order details.</p>
		<form on:submit={handlePassValidation} class="stack">
			<label>
				<span>Order ID</span>
				<input type="text" bind:value={passToken} placeholder="01jhWt5FUwg4ElpiQy73Yvs1cEYZY" required />
			</label>
			<button type="submit" disabled={isValidatingPass}>
				{isValidatingPass ? 'Validating…' : 'Validate Order'}
			</button>
		</form>
		{#if passError}
			<p class="error">{passError}</p>
		{/if}
		{#if passResponse}
			<div class="result-card success">
				<header>
					<strong>Order Retrieved</strong>
					<span class="status-badge">✓ {passResponse.status.toUpperCase()}</span>
				</header>
				<div class="order-details">
					<h3>Order Information</h3>
					<ul>
						<li><small>Order ID:</small> <code>{passResponse.order.id}</code></li>
						<li><small>Location ID:</small> <code>{passResponse.order.locationId}</code></li>
						<li><small>State:</small> {passResponse.order.state || 'N/A'}</li>
						{#if passResponse.order.createdAt}
							<li><small>Created:</small> {new Date(passResponse.order.createdAt).toLocaleString()}</li>
						{/if}
						{#if passResponse.order.totalMoney}
							<li><small>Total:</small> {new Intl.NumberFormat('en-US', { style: 'currency', currency: passResponse.order.totalMoney.currency || 'USD' }).format((passResponse.order.totalMoney.amount || 0) / 100)}</li>
						{/if}
					</ul>
					
					{#if passResponse.order.lineItems && passResponse.order.lineItems.length > 0}
						<h3>Line Items</h3>
						<table>
							<thead>
								<tr>
									<th>Catalog Object ID</th>
									<th>Name</th>
									<th>Variation</th>
									<th>Quantity</th>
									<th>Price</th>
								</tr>
							</thead>
							<tbody>
								{#each passResponse.order.lineItems as item}
									<tr>
										<td><code>{item.catalogObjectId || '—'}</code></td>
										<td>{item.name || '—'}</td>
										<td>{item.variationName || '—'}</td>
										<td>{item.quantity || '—'}</td>
										<td>
											{#if item.totalMoney}
												{new Intl.NumberFormat('en-US', { style: 'currency', currency: item.totalMoney.currency || 'USD' }).format((item.totalMoney.amount || 0) / 100)}
											{:else if item.basePriceMoney}
												{new Intl.NumberFormat('en-US', { style: 'currency', currency: item.basePriceMoney.currency || 'USD' }).format((item.basePriceMoney.amount || 0) / 100)}
											{:else}
												—
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else}
						<p class="muted">No line items found in order.</p>
					{/if}
				</div>
			</div>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
		display: grid;
		gap: 2rem;
	}

	.card {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
	}

	h1,
	h2 {
		margin-bottom: 1rem;
	}

	form.stack {
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
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

	.results {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	.result-card {
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1rem;
		background: #f9fafb;
	}

	.result-card header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.result-card header span {
		padding: 0.1rem 0.6rem;
		border-radius: 999px;
		background: #d1d5db;
		font-size: 0.85rem;
	}

	.result-card header span.member {
		background: #dcfce7;
		color: #166534;
	}

	.result-card ul {
		list-style: none;
		padding: 0;
		margin: 0 0 0.5rem;
		display: grid;
		gap: 0.25rem;
		font-size: 0.95rem;
	}

	.result-card small {
		color: #6b7280;
	}

	.result-card.success {
		background: #ecfdf5;
		border-color: #6ee7b7;
	}

	.result-card.success code {
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.875rem;
		background: #d1fae5;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		color: #065f46;
		word-break: break-all;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		background: #10b981;
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.order-details {
		margin-top: 1rem;
	}

	.order-details h3 {
		font-size: 1rem;
		margin: 1rem 0 0.5rem;
		color: #374151;
	}

	.order-details table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.order-details table thead {
		background: #f3f4f6;
		border-bottom: 2px solid #e5e7eb;
	}

	.order-details table th {
		text-align: left;
		padding: 0.5rem;
		font-weight: 600;
		color: #374151;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.order-details table td {
		padding: 0.5rem;
		border-bottom: 1px solid #e5e7eb;
		color: #4b5563;
	}

	.order-details table tbody tr:hover {
		background: #f9fafb;
	}

	.order-details table code {
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.75rem;
		background: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		color: #1f2937;
		word-break: break-all;
	}

	.error {
		color: #dc2626;
		font-weight: 600;
	}

	.muted {
		color: #9ca3af;
	}
</style>
