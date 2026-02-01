<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { validatePass } from '$lib';
	import type { SearchResult, PassValidationResponse } from '$lib';
	import OrderIdCard from '$lib/components/OrderIdCard.svelte';
	import { Home } from 'lucide-svelte';

	let passResponse: PassValidationResponse | null = null;
	let passError = '';
	let isValidatingPass = false;
	let useQRCode = false; // Default to barcode
	let variantDescription: string | null = null;
	let customer: SearchResult | null = null;
	let cardComponent: OrderIdCard | null = null;
	let isDownloading = false;

	// Load data from URL parameters
	onMount(() => {
		const url = $page.url;
		const orderIdParam = url.searchParams.get('orderId');
		const customerNameParam = url.searchParams.get('customerName');
		const variantDescriptionParam = url.searchParams.get('variantDescription');

		// Validate that required orderId is present
		if (!orderIdParam) {
			passError = 'Missing orderId parameter in URL';
			return;
		}

		// Create customer object from URL params
		if (customerNameParam) {
			customer = {
				displayName: decodeURIComponent(customerNameParam.replace(/\+/g, ' ')),
				contact: {},
				membership: { type: 'Member' },
				customerHash: ''
			};
		}

		// Get variant description from URL
		if (variantDescriptionParam) {
			variantDescription = decodeURIComponent(variantDescriptionParam.replace(/\+/g, ' '));
		}

		// Auto-validate order ID
		handlePassValidation(orderIdParam);
	});

	async function handlePassValidation(orderId: string) {
		if (isValidatingPass) return; // Prevent duplicate calls
		isValidatingPass = true;
		passError = '';
		passResponse = null;
		try {
			passResponse = await validatePass({
				token: orderId.trim()
			});
		} catch (error) {
			passError = (error as Error).message;
		} finally {
			isValidatingPass = false;
		}
	}

	async function handleDownload() {
		if (!cardComponent || isDownloading || !passResponse?.order?.id) return;
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
			<a href="/" class="home-link">
				<Home class="home-icon" />
				<span>Home</span>
			</a>
		</div>
	</div>

	{#if passError}
		<div class="error-banner">
			<p class="error">{passError}</p>
		</div>
	{:else if isValidatingPass}
		<div class="loading-state">
			<p>Loading member card...</p>
		</div>
	{:else if passResponse}
		<div class="content-split">
			<div class="left-panel">
				<div class="card-options">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={useQRCode} />
						<span>Use QR Code (instead of barcode)</span>
					</label>
				</div>
				<button class="download-button" on:click={handleDownload} disabled={isDownloading || !passResponse?.order?.id}>
					{isDownloading ? 'Downloading...' : 'Download ID Card (PNG)'}
				</button>
			</div>
			<div class="right-panel">
				<OrderIdCard
					bind:this={cardComponent}
					order={passResponse.order}
					{customer}
					{useQRCode}
					{variantDescription}
				/>
			</div>
		</div>
	{:else}
		<div class="error-banner">
			<p class="error">Missing required parameters. Please provide orderId, customerName, and variantDescription in the URL.</p>
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

