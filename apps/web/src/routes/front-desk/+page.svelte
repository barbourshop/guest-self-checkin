<script lang="ts">
	import { onMount } from 'svelte';
	import { validatePass } from '$lib';
	import type { PassValidationResponse } from '$lib';

	type Status = 'idle' | 'processing' | 'verified' | 'not-found';

	let orderId = '';
	let validatedOrderId = '';
	let status: Status = 'idle';
	let inputEl: HTMLInputElement | null = null;

	onMount(() => {
		// Auto-focus input for seamless scanning
		inputEl?.focus();
	});

	async function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		orderId = target.value;
	}

	async function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && orderId.trim()) {
			event.preventDefault();
			await handleCheckIn();
		}
	}

	async function handleCheckIn() {
		if (!orderId.trim() || status === 'processing') return;
		
		const token = orderId.trim();
		if (inputEl) {
			inputEl.value = '';
		}
		orderId = '';
		await validateOrder(token);
	}

	async function validateOrder(token: string) {
		if (!token.trim()) return;

		status = 'processing';
		const trimmedToken = token.trim();
		validatedOrderId = trimmedToken;

		try {
			const response: PassValidationResponse = await validatePass({
				token: trimmedToken
			});

			// Check if access is verified
			if (response.order?.accessVerified) {
				status = 'verified';
			} else {
				status = 'not-found';
			}
		} catch (error) {
			// Order not found or error
			status = 'not-found';
		}

		// Clear input after validation for next scan
		if (inputEl) {
			inputEl.value = '';
		}
		orderId = '';
	}

	function reset() {
		status = 'idle';
		orderId = '';
		validatedOrderId = '';
		if (inputEl) {
			inputEl.value = '';
			setTimeout(() => inputEl?.focus(), 100);
		}
	}

	// Auto-focus input after validation completes (ready for next scan)
	$: if (status === 'verified' || status === 'not-found') {
		// Focus after a short delay to allow user to see the result
		setTimeout(() => {
			inputEl?.focus();
		}, 2000);
	}
</script>

<main>
	<div class="top-section">
		<div class="logo-container">
			<img src="/btv-logo.webp" alt="Big Trees Rec Center Logo" />
		</div>
		<div class="status-indicator" class:verified={status === 'verified'} class:not-found={status === 'not-found'} class:processing={status === 'processing'}>
			<div class="light"></div>
			{#if status === 'processing'}
				<p class="status-text">Processing...</p>
			{:else if status === 'verified'}
				<p class="status-text">Come in</p>
			{:else if status === 'not-found'}
				<p class="status-text">Please contact the manager on duty</p>
			{:else}
				<p class="status-text">Ready to Scan</p>
			{/if}
		</div>
	</div>

	<div class="bottom-section">
		<div class="scanner-section">
			<input
				bind:this={inputEl}
				type="text"
				autocomplete="off"
				spellcheck="false"
				placeholder="Scan or enter Order ID"
				bind:value={orderId}
				on:input={handleInput}
				on:keydown={handleKeyDown}
				disabled={status === 'processing'}
			/>
			<div class="button-group">
				<button type="button" on:click={handleCheckIn} class="checkin-button" disabled={status === 'processing' || !orderId.trim()}>
					Check In
				</button>
				<button type="button" on:click={reset} class="reset-button">
					Reset
				</button>
			</div>
		</div>

		{#if status === 'not-found' || status === 'verified'}
			<div class="order-info">
				<p><strong>Order ID:</strong> {validatedOrderId}</p>
				{#if status === 'not-found'}
					<p class="help-text">Something went wrong. Please see the manager on duty for assistance.</p>
				{/if}
			</div>
		{/if}
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #f3f4f6;
		font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.top-section {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2rem;
		align-items: center;
		width: 100%;
	}

	.logo-container {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.logo-container img {
		max-width: 120px;
		height: auto;
		object-fit: contain;
	}

	.status-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: white;
		border-radius: 20px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
		flex: 1;
		transition: all 0.3s ease;
	}

	.light {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: #e5e7eb;
		box-shadow: 0 0 0 0 rgba(229, 231, 235, 0.7);
		transition: all 0.3s ease;
	}

	.status-indicator.verified .light {
		background: #86efac;
		box-shadow: 0 0 30px 15px rgba(134, 239, 172, 0.4);
		animation: pulse-green 2s infinite;
	}

	.status-indicator.not-found .light {
		background: #eab308;
		box-shadow: 0 0 30px 15px rgba(234, 179, 8, 0.4);
		animation: pulse-yellow 2s infinite;
	}

	.status-indicator.processing .light {
		background: #6366f1;
		box-shadow: 0 0 30px 15px rgba(99, 102, 241, 0.4);
		animation: pulse-blue 2s infinite;
	}

	@keyframes pulse-green {
		0%, 100% {
			box-shadow: 0 0 30px 15px rgba(134, 239, 172, 0.4);
		}
		50% {
			box-shadow: 0 0 45px 22px rgba(134, 239, 172, 0.6);
		}
	}

	@keyframes pulse-yellow {
		0%, 100% {
			box-shadow: 0 0 30px 15px rgba(234, 179, 8, 0.4);
		}
		50% {
			box-shadow: 0 0 45px 22px rgba(234, 179, 8, 0.6);
		}
	}

	@keyframes pulse-blue {
		0%, 100% {
			box-shadow: 0 0 30px 15px rgba(99, 102, 241, 0.4);
		}
		50% {
			box-shadow: 0 0 45px 22px rgba(99, 102, 241, 0.6);
		}
	}

	.status-text {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		text-align: center;
	}

	.bottom-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.scanner-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		width: 100%;
	}

	.scanner-section input {
		font-size: 1.125rem;
		padding: 1rem;
		border-radius: 12px;
		border: 2px solid #d1d5db;
		outline: none;
		background: white;
		transition: border-color 0.2s;
		width: 100%;
		box-sizing: border-box;
	}

	.scanner-section input:focus {
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.scanner-section input:disabled {
		background: #f9fafb;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.checkin-button {
		font-size: 1rem;
		padding: 0.875rem 1.5rem;
		border-radius: 12px;
		border: none;
		background: #22c55e;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		flex: 1;
	}

	.checkin-button:hover:not(:disabled) {
		background: #16a34a;
	}

	.checkin-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.checkin-button:active:not(:disabled) {
		transform: scale(0.98);
	}

	.reset-button {
		font-size: 1rem;
		padding: 0.875rem 1.5rem;
		border-radius: 12px;
		border: none;
		background: #6366f1;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		flex: 1;
	}

	.reset-button:hover {
		background: #4f46e5;
	}

	.reset-button:active {
		transform: scale(0.98);
	}

	.order-info {
		background: white;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		width: 100%;
		text-align: center;
	}

	.order-info p {
		margin: 0;
		font-size: 0.9rem;
		color: #4b5563;
	}

	.order-info strong {
		color: #1f2937;
	}

	.order-info .help-text {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #6b7280;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.top-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.logo-container img {
			max-width: 100px;
		}

		.status-indicator {
			padding: 1rem;
		}

		.light {
			width: 100px;
			height: 100px;
		}

		.status-text {
			font-size: 1rem;
		}
	}

	@media (max-width: 640px) {
		main {
			padding: 0.75rem;
			gap: 1rem;
		}

		.scanner-section input {
			font-size: 1rem;
			padding: 0.875rem;
		}

		.checkin-button,
		.reset-button {
			font-size: 0.9rem;
			padding: 0.75rem 1rem;
		}
	}
</style>

