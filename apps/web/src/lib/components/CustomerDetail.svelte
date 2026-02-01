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

	// Extract first name from displayName
	$: firstName = customer?.displayName?.split(' ')[0] || 'Guest';
</script>

<div class="bg-white rounded-lg shadow-md p-6">
	<div class="flex justify-between items-start mb-6">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">
				Hi, {firstName}
			</h2>
		</div>
		<button
			on:click={() => {
				onReset();
			}}
			class="p-2 text-gray-500 hover:text-gray-700"
			data-testid="close-details"
		>
			<X class="h-5 w-5" />
		</button>
	</div>

	<div class="max-w-2xl mx-auto">
		<div class="bg-gray-50 p-6 rounded-lg">
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
				
				<!-- Guest count buttons grid -->
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
</div>


