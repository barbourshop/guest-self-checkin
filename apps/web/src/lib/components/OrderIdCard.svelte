<script lang="ts">
	import { onMount } from 'svelte';
	import JsBarcode from 'jsbarcode';
	import QRCode from 'qrcode';
	import html2canvas from 'html2canvas';
	import type { PassValidationResponse, SearchResult } from '../types';

	export let order: PassValidationResponse['order'];
	export let customer: SearchResult | null = null;
	export let useQRCode: boolean = false; // Toggle between barcode and QR code
	export let variantDescription: string | null = null; // For display on card

	let barcodeSvg: SVGSVGElement | null = null;
	let qrCodeCanvas: HTMLCanvasElement | null = null;
	let qrCodeDataUrl: string = '';
	let cardElement: HTMLDivElement | null = null;
	let isDownloading = false;

	// Expose download function to parent
	export function downloadCard() {
		return downloadAsPNG();
	}

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

	async function generateQRCode() {
		if (!qrCodeCanvas || !order?.id) return;

		try {
			// Generate QR code at a reasonable size that fits in the card
			const qrSize = 250; // Slightly smaller to fit better
			const dataUrl = await QRCode.toDataURL(order.id, {
				width: qrSize,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				}
			});
			qrCodeDataUrl = dataUrl;

			// Set canvas size to match QR code
			qrCodeCanvas.width = qrSize;
			qrCodeCanvas.height = qrSize;
			
			const ctx = qrCodeCanvas.getContext('2d');
			if (ctx) {
				const img = new Image();
				img.onload = () => {
					ctx.clearRect(0, 0, qrCodeCanvas!.width, qrCodeCanvas!.height);
					ctx.drawImage(img, 0, 0, qrCodeCanvas!.width, qrCodeCanvas!.height);
				};
				img.src = dataUrl;
			}
		} catch (error) {
			console.error('Failed to generate QR code:', error);
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

	$: if (order?.id) {
		if (useQRCode) {
			generateQRCode();
		} else if (barcodeSvg) {
			generateBarcode();
		}
	}

	onMount(() => {
		if (useQRCode) {
			generateQRCode();
		} else {
			generateBarcode();
		}
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
				<p class="subtitle">{variantDescription || 'Membership QR Code'}</p>
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

			<div class="id-card-code">
				{#if useQRCode}
					<canvas bind:this={qrCodeCanvas} class="qr-code"></canvas>
				{:else}
					<svg bind:this={barcodeSvg} class="barcode"></svg>
				{/if}
			</div>
		</div>

		<div class="id-card-footer">
			<small>{useQRCode ? 'Scan QR code to verify membership' : 'Scan barcode to verify membership'}</small>
		</div>
	</div>
</div>

<style>
	.id-card-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 450px;
	}

	.id-card {
		background: #ffffff;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
		width: 100%;
		max-width: 450px;
		margin: 0 auto;
		font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		/* ID card dimensions: 2.125" × 3.375" portrait at 300 DPI = 640px × 1013px */
		aspect-ratio: 640 / 1013;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.id-card-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.id-card-logo {
		width: 200px;
		height: 200px;
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

	.id-card-title .variant-description {
		margin: 0.5rem 0 0;
		font-size: 1rem;
		color: #374151;
		font-weight: 600;
	}

	.id-card-body {
		display: grid;
		gap: 1rem;
		flex: 1;
		min-height: 0;
	}

	.customer-section {
		text-align: center;
		padding: 0.5rem 0;
		border-bottom: 2px solid #e5e7eb;
		margin-bottom: 0.5rem;
	}

	.customer-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.375rem;
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

	.id-card-code {
		background: white;
		border-radius: 8px;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-top: 0.25rem;
		min-height: 150px;
		max-height: 220px;
		overflow: hidden;
		width: 100%;
		box-sizing: border-box;
		flex-shrink: 1;
	}

	.id-card-code .barcode {
		max-width: 100%;
		max-height: 100%;
		height: auto;
		display: block;
	}

	.id-card-code .qr-code {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		display: block;
		object-fit: contain;
	}

	.id-card-footer {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
		flex-shrink: 0;
	}

	.id-card-footer small {
		color: #9ca3af;
		font-size: 0.75rem;
		font-weight: 500;
	}

</style>

