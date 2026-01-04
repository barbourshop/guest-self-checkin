<script lang="ts">
	import { onMount } from 'svelte';
	import JsBarcode from 'jsbarcode';
	import html2canvas from 'html2canvas';
	import type { PassValidationResponse, SearchResult } from '../types';

	export let order: PassValidationResponse['order'];
	export let customer: SearchResult | null = null;

	let barcodeSvg: SVGSVGElement | null = null;
	let cardElement: HTMLDivElement | null = null;
	let isDownloading = false;

	function generateBarcode() {
		if (barcodeSvg && order?.id) {
			try {
			JsBarcode(barcodeSvg, order.id, {
				format: 'CODE128',
				width: 3,
				height: 120,
				displayValue: true,
				fontSize: 20,
				margin: 15
			});
			} catch (error) {
				console.error('Failed to generate barcode:', error);
			}
		}
	}

	async function downloadAsPNG() {
		if (!cardElement || !order?.id || isDownloading) return;

		isDownloading = true;
		try {
			// ID card dimensions: 2.125" × 3.375" (portrait) at 300 DPI
			// That's approximately 637.5px × 1012.5px, we'll use 640px × 1013px
			const cardWidth = 640;
			const cardHeight = 1013;
			const scale = 2; // Higher resolution for better quality

			// Store original styles
			const originalWidth = cardElement.style.width;
			const originalMaxWidth = cardElement.style.maxWidth;
			const originalAspectRatio = cardElement.style.aspectRatio;

			// Temporarily set exact dimensions for capture
			cardElement.style.width = `${cardWidth}px`;
			cardElement.style.maxWidth = `${cardWidth}px`;
			cardElement.style.aspectRatio = 'none';
			cardElement.style.height = `${cardHeight}px`;

			// Wait a moment for styles to apply
			await new Promise(resolve => setTimeout(resolve, 100));

			const canvas = await html2canvas(cardElement, {
				scale: scale,
				backgroundColor: '#ffffff',
				useCORS: true,
				logging: false
			});

			// Restore original styles
			cardElement.style.width = originalWidth;
			cardElement.style.maxWidth = originalMaxWidth;
			cardElement.style.aspectRatio = originalAspectRatio;
			cardElement.style.height = '';

			// Create download link
			const link = document.createElement('a');
			link.download = `order-${order.id}-id-card.png`;
			link.href = canvas.toDataURL('image/png');
			link.click();
		} catch (error) {
			console.error('Failed to download ID card:', error);
			alert('Failed to download ID card. Please try again.');
		} finally {
			isDownloading = false;
		}
	}

	$: if (order?.id && barcodeSvg) {
		generateBarcode();
	}

	onMount(() => {
		generateBarcode();
	});
</script>

<div class="id-card-wrapper">
	<div class="id-card" bind:this={cardElement}>
	<div class="id-card-header">
		<div class="id-card-logo">
			<img src="/btv-logo.webp" alt="Big Trees Rec Center Logo" />
		</div>
		<div class="id-card-title">
			<h2>BIG TREES REC CENTER</h2>
			{#if order.accessVerified}
				<p class="subtitle">Pool access verified</p>
			{/if}
		</div>
	</div>

	<div class="id-card-body">
		{#if customer}
			<div class="customer-section">
				<div class="customer-name">{customer.displayName}</div>
				{#if customer.contact.phone || customer.contact.email || customer.contact.lotNumber}
					<div class="customer-info">
						{#if customer.contact.phone}
							<span class="info-item">{customer.contact.phone}</span>
						{/if}
						{#if customer.contact.email}
							<span class="info-item">{customer.contact.email}</span>
						{/if}
						{#if customer.contact.lotNumber}
							<span class="info-item">Lot: {customer.contact.lotNumber}</span>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if order.lineItems && order.lineItems.length > 0}
			<div class="item-name-section">
				{#each order.lineItems as item, index}
					{#if item.name}
						<div class="item-name">
							{item.name}{#if item.quantity && item.quantity !== '1'} <span class="quantity">(x{item.quantity})</span>{/if}
						</div>
						{#if index < order.lineItems.length - 1}
							<div class="item-separator"></div>
						{/if}
					{/if}
				{/each}
			</div>
		{/if}

		<div class="id-card-barcode">
			<svg bind:this={barcodeSvg} class="barcode"></svg>
		</div>
	</div>

	<div class="id-card-footer">
		<small>Scan barcode to verify membership</small>
	</div>
	</div>
	<button class="download-button" on:click={downloadAsPNG} disabled={isDownloading || !order?.id}>
		{isDownloading ? 'Downloading...' : 'Download ID Card (PNG)'}
	</button>
</div>

<style>
	.id-card-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.id-card {
		background: #ffffff;
		border-radius: 16px;
		padding: 2rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
		font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		/* ID card dimensions: 2.125" × 3.375" portrait at 300 DPI = 640px × 1013px */
		aspect-ratio: 640 / 1013;
		display: flex;
		flex-direction: column;
	}

	.id-card-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.id-card-logo {
		width: 240px;
		height: 240px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.id-card-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.id-card-title {
		width: 100%;
	}

	.id-card-title h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
		letter-spacing: 0.05em;
	}

	.id-card-title .subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.id-card-body {
		display: grid;
		gap: 1.5rem;
		flex: 1;
	}

	.customer-section {
		text-align: center;
		padding: 0.75rem 0;
		border-bottom: 2px solid #e5e7eb;
		margin-bottom: 0.5rem;
	}

	.customer-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
		letter-spacing: -0.01em;
	}

	.customer-info {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem 1.5rem;
		font-size: 1.125rem;
		color: #374151;
		font-weight: 500;
		margin-top: 0.5rem;
	}

	.customer-info .info-item {
		white-space: nowrap;
	}

	.item-name-section {
		text-align: center;
		padding: 1rem 0;
	}

	.item-name {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1.3;
		margin: 0.5rem 0;
		letter-spacing: -0.02em;
	}

	.item-name .quantity {
		font-size: 1.25rem;
		font-weight: 500;
		color: #6b7280;
	}

	.item-separator {
		height: 1px;
		background: #e5e7eb;
		margin: 0.75rem 0;
	}

	.id-card-barcode {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-top: 0.5rem;
		min-height: 180px;
	}

	.id-card-barcode .barcode {
		width: 100%;
		height: auto;
	}

	.id-card-footer {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
	}

	.id-card-footer small {
		color: #9ca3af;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.download-button {
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
	}

	.download-button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.download-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

