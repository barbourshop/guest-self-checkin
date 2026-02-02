<script lang="ts">
	import { X, Users } from 'lucide-svelte';
	import type { SearchResult } from '../types';

	export let customer: SearchResult;
	export let guestCount: number;
	export let onGuestCountChange: (count: number) => void;
	export let onCheckIn: () => void;
	export let onReset: () => void;

	let hasSelected = guestCount > 0;

	// Update hasSelected when guestCount changes
	$: hasSelected = guestCount > 0;

	function handleGuestCountClick(count: number) {
		onGuestCountChange(count);
		hasSelected = true;
	}

	$: membershipLevel = customer?.membership?.segmentNames?.length
		? customer.membership.segmentNames.join(', ')
		: '—';
</script>

<div class="rounded-lg shadow-md overflow-hidden">
	<!-- Green header section -->
	<div class="bg-primary-600 text-white px-6 py-4 flex justify-between items-center">
		<h2 class="text-xl font-bold">Customer details</h2>
		<button
			on:click={() => {
				onReset();
			}}
			class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
			data-testid="close-details"
			aria-label="Close"
		>
			<X class="h-5 w-5" />
		</button>
	</div>

	<!-- Simple table under green section -->
	<div class="bg-white border-x border-b border-gray-200 rounded-b-lg">
		<table class="w-full text-left">
			<tbody class="divide-y divide-gray-200">
				<tr>
					<th scope="row" class="px-6 py-3 text-sm font-semibold text-gray-600 bg-gray-50 w-40">Name</th>
					<td class="px-6 py-3 text-gray-900">{customer?.displayName ?? '—'}</td>
				</tr>
				<tr>
					<th scope="row" class="px-6 py-3 text-sm font-semibold text-gray-600 bg-gray-50">Membership level</th>
					<td class="px-6 py-3 text-gray-900">{membershipLevel}</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- Check-in section -->
	<div class="bg-gray-50 p-6 rounded-b-lg border-x border-b border-gray-200">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Check In</h3>
		<div class="mb-4">
			<label class="block text-sm font-medium text-gray-700 mb-4">
				Number of guests (including you)
			</label>
			<div class="flex flex-col items-center mb-6">
				<div class="text-7xl font-bold text-primary-600 mb-2">
					{hasSelected ? guestCount : '-'}
				</div>
				<div class="text-sm text-gray-500 mb-4">Total Guests</div>
			</div>
			<button
				data-testid="checkin-button"
				on:click={onCheckIn}
				disabled={!hasSelected}
				class="w-full py-3 rounded-lg flex items-center justify-center gap-2 mb-6 {hasSelected
					? 'bg-primary-600 text-white hover:bg-primary-700'
					: 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
			>
				<Users class="h-5 w-5" />
				<span>
					{!hasSelected
						? 'Please Select Number of Guests'
						: 'Check In Now'}
				</span>
			</button>

			<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
				{#each Array(10) as _, i}
					{@const count = i + 1}
					<button
						data-testid="guest-count-button-{count}"
						on:click={() => handleGuestCountClick(count)}
						class="py-4 px-4 rounded-lg text-lg font-semibold transition-colors {guestCount === count
							? 'bg-primary-600 text-white hover:bg-primary-700'
							: 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50'}"
					>
						{count}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>


