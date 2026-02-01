<script lang="ts">
	import { onMount } from 'svelte';
	import { validatePass, deviceIdStore } from '$lib';
	import { get } from 'svelte/store';

	type ScanResult =
		| {
				status: 'success';
				token: string;
				passType: string;
				orderId: string;
				redeemedAt: string | null;
				timestamp: string;
		  }
		| {
				status: 'error';
				token: string;
				message: string;
				timestamp: string;
		  };

	let scanInput = '';
	let statusMessage = 'Ready to scan';
	let isSuccess = false;
	let processing = false;
	let history: ScanResult[] = [];

	let inputEl: HTMLInputElement | null = null;

	onMount(() => {
		const focusInterval = setInterval(() => {
			inputEl?.focus();
		}, 2000);
		inputEl?.focus();
		return () => {
			clearInterval(focusInterval);
		};
	});

	async function processToken(token: string) {
		if (!token) return;
		processing = true;
		try {
			const result = await validatePass({
				token,
				deviceId: get(deviceIdStore)
			});
			isSuccess = true;
			statusMessage =
				result.passType === 'day-pass'
					? `Day pass accepted${result.redeemedAt ? ` · redeemed at ${new Date(result.redeemedAt).toLocaleTimeString()}` : ''}`
					: 'Membership valid';
			const entry: ScanResult = {
				status: 'success',
				token,
				passType: result.passType,
				orderId: result.orderId,
				redeemedAt: result.redeemedAt,
				timestamp: new Date().toISOString()
			};
			history = [entry, ...history].slice(0, 10);
		} catch (error) {
			isSuccess = false;
			statusMessage = (error as Error).message;
			const entry: ScanResult = {
				status: 'error',
				token,
				message: (error as Error).message,
				timestamp: new Date().toISOString()
			};
			history = [entry, ...history].slice(0, 10);
		} finally {
			processing = false;
		}
	}

	async function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.value.includes('\n')) {
			const token = target.value.trim();
			target.value = '';
			scanInput = '';
			await processToken(token);
		} else {
			scanInput = target.value;
		}
	}

	async function handleManualSubmit() {
		if (scanInput.trim()) {
			const token = scanInput.trim();
			scanInput = '';
			if (inputEl) {
				inputEl.value = '';
			}
			await processToken(token);
		}
	}
</script>

<main>
	<section class="status" class:success={isSuccess} class:error={!isSuccess}>
		<h1>{statusMessage}</h1>
		<p>{processing ? 'Validating...' : 'Present QR or barcode to the scanner.'}</p>
	</section>

	<section class="scanner">
		<input
			bind:this={inputEl}
			type="text"
			autocomplete="off"
			spellcheck="false"
			placeholder="Scan code"
			on:input={handleInput}
			on:blur={() => inputEl?.focus()}
		/>
		<button type="button" on:click={handleManualSubmit} disabled={processing || !scanInput.trim()}>
			Submit
		</button>
	</section>

	<section class="history">
		<h2>Recent scans</h2>
		{#if history.length === 0}
			<p class="muted">Waiting for first scan.</p>
		{:else}
			<ul>
				{#each history as entry}
					<li class:success={entry.status === 'success'} class:error={entry.status === 'error'}>
						<header>
							<strong>{entry.status === 'success' ? entry.passType : 'Error'}</strong>
							<small>{new Date(entry.timestamp).toLocaleTimeString()}</small>
						</header>
						{#if entry.status === 'success'}
							<p>Order: {entry.orderId}</p>
							{#if entry.redeemedAt}
								<p>Redeemed: {new Date(entry.redeemedAt).toLocaleTimeString()}</p>
							{/if}
						{:else}
							<p>{entry.message}</p>
						{/if}
						<footer>Token: {entry.token}</footer>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<style>
	:global(body) {
		background: #0f172a;
		color: white;
		font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	main {
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto auto 1fr;
		gap: 1.5rem;
		padding: 2rem;
	}

	.status {
		border-radius: 24px;
		padding: 2rem;
		background: #1e293b;
		text-align: center;
		box-shadow: inset 0 0 0 2px rgba(148, 163, 184, 0.2);
	}

	.status.success {
		background: linear-gradient(135deg, #22c55e, #16a34a);
		box-shadow: none;
	}

	.status.error {
		background: linear-gradient(135deg, #f87171, #dc2626);
	}

	.status h1 {
		font-size: clamp(2rem, 5vw, 3.5rem);
		margin: 0 0 0.5rem;
	}

	.status p {
		font-size: 1.25rem;
		margin: 0;
		opacity: 0.85;
	}

	.scanner {
		display: grid;
		grid-template-columns: 1fr 140px;
		gap: 1rem;
	}

	.scanner input {
		font-size: 1.5rem;
		padding: 1.25rem;
		border-radius: 16px;
		border: none;
		outline: none;
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.4);
	}

	.scanner button {
		font-size: 1.2rem;
		border: none;
		border-radius: 16px;
		background: #6366f1;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}

	.history {
		background: #1e1b4b;
		border-radius: 20px;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.history ul {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: grid;
		gap: 0.75rem;
	}

	.history li {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 16px;
		padding: 1rem;
		border: 1px solid transparent;
	}

	.history li.success {
		border-color: rgba(34, 197, 94, 0.4);
	}

	.history li.error {
		border-color: rgba(248, 113, 113, 0.4);
	}

	.history header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.history footer {
		font-size: 0.85rem;
		opacity: 0.7;
		margin-top: 0.25rem;
		overflow-wrap: anywhere;
	}

	.muted {
		color: rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 640px) {
		main {
			padding: 1.5rem 1rem 4rem;
		}

		.scanner {
			grid-template-columns: 1fr;
		}
	}
</style>

