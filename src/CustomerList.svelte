<script lang="ts">
  import { User, Loader2 } from 'lucide-svelte';
  import type { Customer } from './types';

  export let customers: Customer[];
  export let onSelectCustomer: (customer: Customer) => void;
  export let isLoading: boolean;
  export let error: string | null;
  export let searchQuery: string;
</script>

{#if isLoading}
  <div class="p-8 text-center text-gray-500">
    <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
    <p>Searching...</p>
  </div>
{:else if error}
  <div class="p-8 text-center text-red-500">
    <p>{error}</p>
  </div>
{:else if !customers.length}
  <div data-testid="member-not-found" class="p-8 text-center text-gray-500">
    <p>{searchQuery ? 'No customers found' : 'Enter in 3 or more characters then search, results will appear here'}</p>
  </div>
{:else}
  <ul class="divide-y divide-gray-200">
    {#each customers as customer (customer.id)}
      <li
        class="p-4 hover:bg-gray-50 cursor-pointer member-item"
        on:click={() => onSelectCustomer(customer)}
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCustomer(customer);
          }
        }}
      >
        <div class="flex items-center gap-4">
          <div class="bg-primary-100 p-3 rounded-full">
            <User class="h-6 w-6 text-primary-600" />
          </div>
          <div class="flex-1">
            <h3 class="font-medium text-gray-900">
              {customer.firstName} {customer.lastName}
            </h3>
            <p class="text-sm text-gray-500">{customer.lotNumber}</p>
            <div class="flex gap-2 mt-1">
              <span
                data-testid="membership-type"
                class="inline-block px-2 py-1 text-xs font-medium rounded {customer.membershipType && customer.membershipType !== 'Non-Member'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'}"
              >
                {customer.membershipType || 'Non-Member'}
              </span>
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

