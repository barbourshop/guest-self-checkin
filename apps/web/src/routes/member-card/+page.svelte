<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { SearchResult } from '$lib';
	import OrderIdCard from '$lib/components/OrderIdCard.svelte';
	import { Home } from 'lucide-svelte';

	/** Name to show on the card and to encode in the barcode/QR. When set, we show the card. */
	let displayName: string | null = null;
	let useQRCode = false; // Default to barcode
	let variantDescription: string | null = null;
	let customer: SearchResult | null = null;
	let cardComponent: OrderIdCard | null = null;
	let isDownloading = false;
	let returnTo: string | null = null;
	let needsManualEntry = false;
	let manualCustomerName = '';
	let manualVariantDescription = '';
	let formError = '';

	onMount(() => {
		const url = $page.url;
		const customerNameParam = url.searchParams.get('customerName');
		const variantDescriptionParam = url.searchParams.get('variantDescription');
		const returnToParam = url.searchParams.get('returnTo');
		if (returnToParam) {
			returnTo = returnToParam.startsWith('/') ? returnToParam : `/${returnToParam}`;
		}

		if (customerNameParam) {
			displayName = decodeURIComponent(customerNameParam.replace(/\+/g, ' ')).trim() || null;
			customer = displayName
				? {
						displayName,
						contact: {},
						membership: { type: 'Member' },
						customerHash: ''
					}
				: null;
			if (variantDescriptionParam) {
				variantDescription = decodeURIComponent(variantDescriptionParam.replace(/\+/g, ' '));
			}
		} else {
			needsManualEntry = true;
		}
	});

	function submitManualEntry() {
		const name = manualCustomerName.trim();
		if (!name) {
			formError = 'Enter a customer name';
			return;
		}
		formError = '';
		displayName = name;
		customer = {
			displayName: name,
			contact: {},
			membership: { type: 'Member' },
			customerHash: ''
		};
		variantDescription = manualVariantDescription.trim() || null;
		needsManualEntry = false;
	}

	async function handleDownload() {
		if (!cardComponent || isDownloading || !displayName) return;
		isDownloading = true;
		try {
			await cardComponent.downloadCard();
		} catch (error) {
			console.error('Download failed:', error);
		} finally {
			isDownloading = false;
		}
	}
</script>

<main>
	<div class="header">
		<div class="header-content">
			<div>
				<h1>Member Card</h1>
				<p>View and download your membership card</p>
			</div>
			<a href={returnTo || '/'} class="home-link">
				<Home class="home-icon" />
				<span>{returnTo === '/admin' ? 'Back to Admin' : returnTo ? 'Back' : 'Home'}</span>
			</a>
		</div>
	</div>

	{#if formError}
		<div class="error-banner">
			<p class="error">{formError}</p>
		</div>
	{/if}
	{#if needsManualEntry}
		<div class="manual-entry-card">
			<h2>Enter member name</h2>
			<p class="manual-entry-hint">The barcode or QR code will encode this name. Use it from the Membership list in Admin (QR/Barcode for a member) or enter a name below.</p>
			<form
				class="manual-entry-form"
				on:submit|preventDefault={submitManualEntry}
			>
				<div class="form-row">
					<label for="manual-customer-name">Member name <span class="required">*</span></label>
					<input
						id="manual-customer-name"
						type="text"
						bind:value={manualCustomerName}
						placeholder="e.g. Jane Smith"
						class="form-input"
						autocomplete="off"
					/>
				</div>
				<div class="form-row">
					<label for="manual-variant">Membership type (optional)</label>
					<input
						id="manual-variant"
						type="text"
						bind:value={manualVariantDescription}
						placeholder="e.g. Annual Member"
						class="form-input"
					/>
				</div>
				<button type="submit" class="submit-button">
					Generate card
				</button>
			</form>
		</div>
	{:else if displayName}
		<div class="content-split">
			<div class="left-panel">
				<div class="card-options">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={useQRCode} />
						<span>Use QR Code (instead of barcode)</span>
					</label>
				</div>
				<button class="download-button" on:click={handleDownload} disabled={isDownloading}>
					{isDownloading ? 'Downloading…' : 'Download ID Card (PNG)'}
				</button>
			</div>
			<div class="right-panel">
				<OrderIdCard
					bind:this={cardComponent}
					encodedValue={displayName}
					{customer}
					{useQRCode}
					{variantDescription}
				/>
			</div>
		</div>
	{:else}
		<div class="error-banner">
			<p class="error">Enter a member name above or open a member from the Admin Membership list.</p>
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem 1.5rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.header h1 {
		margin-bottom: 0.25rem;
		font-size: 1.5rem;
	}

	.header p {
		color: #6b7280;
		line-height: 1.4;
		margin: 0;
		font-size: 0.875rem;
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
		font-size: 0.875rem;
	}

	.home-link:hover {
		background: #e5e7eb;
		color: #1f2937;
		border-color: #d1d5db;
	}

	.home-icon {
		width: 1.125rem;
		height: 1.125rem;
	}

	.content-split {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		align-items: start;
		flex: 1;
		min-height: 0;
	}

	.left-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: sticky;
		top: 1rem;
		align-self: start;
	}

	.right-panel {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		min-height: 0;
	}

	.card-options {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
		flex-shrink: 0;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.checkbox-label input[type="checkbox"] {
		width: auto;
		margin: 0;
		cursor: pointer;
	}

	.download-button {
		padding: 0.75rem 1.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		font-family: inherit;
		width: 100%;
	}

	.download-button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.download-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 1024px) {
		.content-split {
			grid-template-columns: 1fr;
		}

		.left-panel {
			position: static;
		}
	}

	.error-banner {
		background: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem 1.5rem;
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	.error {
		color: #991b1b;
		font-weight: 600;
		margin: 0;
	}

	.loading-state {
		text-align: center;
		padding: 2rem 1rem;
		color: #6b7280;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.manual-entry-card {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
		max-width: 420px;
		flex: 1;
		align-self: start;
	}

	.manual-entry-card h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.manual-entry-hint {
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0 0 1.25rem 0;
	}

	.manual-entry-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-row label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.form-row label .required {
		color: #b91c1c;
	}

	.form-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
	}

	.form-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
	}

	.submit-button {
		padding: 0.75rem 1.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		font-family: inherit;
		margin-top: 0.25rem;
	}

	.submit-button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		main {
			padding: 0.75rem 1rem;
		}

		.header h1 {
			font-size: 1.25rem;
		}

		.header p {
			font-size: 0.8125rem;
		}
	}
</style>

