<script lang="ts">
  import { onMount } from 'svelte';
  import { X, RefreshCw, Search } from 'lucide-svelte';
  import { getDatabaseContents } from './api';
  import { formatDate } from './utils/dateFormat';

  export let onClose: () => void;

  let activeTab: 'membership' | 'queue' | 'log' = 'membership';
  let membershipCache: any[] = [];
  let checkinQueue: any[] = [];
  let checkinLog: any[] = [];
  let isLoading = false;
  let error: string | null = null;

  // Filter states
  let membershipFilter = '';
  let queueFilter = '';
  let logFilter = '';

  // Load data on mount
  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    error = null;
    try {
      const data = await getDatabaseContents();
      membershipCache = data.membershipCache || [];
      checkinQueue = data.checkinQueue || [];
      checkinLog = data.checkinLog || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load database contents';
      console.error('Error loading database contents:', err);
    } finally {
      isLoading = false;
    }
  }

  // Filtered data
  $: filteredMembershipCache = membershipCache.filter(item => {
    if (!membershipFilter) return true;
    const filter = membershipFilter.toLowerCase();
    const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
    return (
      item.customer_id?.toLowerCase().includes(filter) ||
      item.given_name?.toLowerCase().includes(filter) ||
      item.family_name?.toLowerCase().includes(filter) ||
      fullName.includes(filter) ||
      item.email_address?.toLowerCase().includes(filter) ||
      item.phone_number?.toLowerCase().includes(filter) ||
      item.reference_id?.toLowerCase().includes(filter) ||
      item.membership_catalog_item_id?.toLowerCase().includes(filter) ||
      item.membership_variant_id?.toLowerCase().includes(filter) ||
      String(item.has_membership).includes(filter)
    );
  });

  $: filteredCheckinQueue = checkinQueue.filter(item => {
    if (!queueFilter) return true;
    const filter = queueFilter.toLowerCase();
    const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
    return (
      item.customer_id?.toLowerCase().includes(filter) ||
      item.given_name?.toLowerCase().includes(filter) ||
      item.family_name?.toLowerCase().includes(filter) ||
      fullName.includes(filter) ||
      item.email_address?.toLowerCase().includes(filter) ||
      item.phone_number?.toLowerCase().includes(filter) ||
      item.reference_id?.toLowerCase().includes(filter) ||
      item.order_id?.toLowerCase().includes(filter) ||
      item.status?.toLowerCase().includes(filter) ||
      String(item.guest_count).includes(filter)
    );
  });

  $: filteredCheckinLog = checkinLog.filter(item => {
    if (!logFilter) return true;
    const filter = logFilter.toLowerCase();
    const fullName = `${item.given_name || ''} ${item.family_name || ''}`.trim().toLowerCase();
    return (
      item.customer_id?.toLowerCase().includes(filter) ||
      item.given_name?.toLowerCase().includes(filter) ||
      item.family_name?.toLowerCase().includes(filter) ||
      fullName.includes(filter) ||
      item.email_address?.toLowerCase().includes(filter) ||
      item.phone_number?.toLowerCase().includes(filter) ||
      item.reference_id?.toLowerCase().includes(filter) ||
      item.order_id?.toLowerCase().includes(filter) ||
      String(item.guest_count).includes(filter)
    );
  });
</script>

<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={onClose} role="dialog" aria-modal="true">
  <div class="relative top-10 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-900">Admin - Database Contents</h2>
      <div class="flex gap-2">
        <button
          on:click={loadData}
          disabled={isLoading}
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
          Refresh
        </button>
        <button
          on:click={onClose}
          class="p-2 text-gray-500 hover:text-gray-700"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p class="text-red-700">{error}</p>
      </div>
    {/if}

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-4">
      <nav class="flex space-x-8">
        <button
          on:click={() => activeTab = 'membership'}
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'membership'
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Membership Cache ({membershipCache.length})
        </button>
        <button
          on:click={() => activeTab = 'queue'}
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'queue'
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Check-in Queue ({checkinQueue.length})
        </button>
        <button
          on:click={() => activeTab = 'log'}
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'log'
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Check-in Log ({checkinLog.length})
        </button>
      </nav>
    </div>

    {#if isLoading}
      <div class="text-center py-8">
        <RefreshCw class="h-8 w-8 animate-spin mx-auto text-primary-600" />
        <p class="mt-2 text-gray-600">Loading...</p>
      </div>
    {:else if activeTab === 'membership'}
      <!-- Membership Cache Tab -->
      <div class="mb-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by name, email, phone, lot, customer ID..."
            bind:value={membershipFilter}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-sm text-gray-500 mt-1">Showing {filteredMembershipCache.length} of {membershipCache.length} entries</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Has Membership</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Verified</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#if filteredMembershipCache.length === 0}
              <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">No membership cache entries found</td>
              </tr>
            {:else}
              {#each filteredMembershipCache as item}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {#if item.given_name || item.family_name}
                      {item.given_name || ''} {item.family_name || ''}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.email_address}
                      {item.email_address}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.phone_number}
                      {item.phone_number}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.reference_id}
                      {item.reference_id}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.customer_id || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 text-xs font-medium rounded {item.has_membership ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      {item.has_membership ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.last_verified_at)}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {:else if activeTab === 'queue'}
      <!-- Check-in Queue Tab -->
      <div class="mb-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by customer ID, order ID, or status..."
            bind:value={queueFilter}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-sm text-gray-500 mt-1">Showing {filteredCheckinQueue.length} of {checkinQueue.length} entries</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Count</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#if filteredCheckinQueue.length === 0}
              <tr>
                <td colspan="10" class="px-6 py-4 text-center text-gray-500">No queued check-ins found</td>
              </tr>
            {:else}
              {#each filteredCheckinQueue as item}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.id}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {#if item.given_name || item.family_name}
                      {item.given_name || ''} {item.family_name || ''}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.email_address}
                      {item.email_address}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.phone_number}
                      {item.phone_number}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.reference_id}
                      {item.reference_id}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.customer_id || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{item.order_id || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.guest_count}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 text-xs font-medium rounded {item.status === 'synced' ? 'bg-green-100 text-green-800' : item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                      {item.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.created_at)}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {:else if activeTab === 'log'}
      <!-- Check-in Log Tab -->
      <div class="mb-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by name, email, phone, lot, customer ID, order ID..."
            bind:value={logFilter}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-sm text-gray-500 mt-1">Showing {filteredCheckinLog.length} of {checkinLog.length} entries (showing last 1000)</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Count</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Synced</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#if filteredCheckinLog.length === 0}
              <tr>
                <td colspan="10" class="px-6 py-4 text-center text-gray-500">No check-in log entries found</td>
              </tr>
            {:else}
              {#each filteredCheckinLog as item}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.id}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {#if item.given_name || item.family_name}
                      {item.given_name || ''} {item.family_name || ''}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.email_address}
                      {item.email_address}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.phone_number}
                      {item.phone_number}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if item.reference_id}
                      {item.reference_id}
                    {:else}
                      <span class="text-gray-400">—</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.customer_id || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{item.order_id || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.guest_count}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.timestamp)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 text-xs font-medium rounded {item.synced_to_square ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                      {item.synced_to_square ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

