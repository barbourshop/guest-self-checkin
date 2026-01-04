<script lang="ts">
  import { Check, X, Loader2 } from 'lucide-svelte';
  import type { Customer } from './types';
  import { updateCustomerWaiverStatus } from './stores/appStore';

  export let customer: Customer;
  export let onClose: () => void;
  
  let isUpdating = false;
  let error: string | null = null;
  let success: string | null = null;

  async function handleWaiverUpdate(newStatus: boolean) {
    isUpdating = true;
    error = null;
    success = null;

    try {
      const response = await fetch(`/api/waivers/set-waiver/${customer.id}?clear=${!newStatus}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-action': 'true'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update waiver status');
      }

      updateCustomerWaiverStatus(customer.id, newStatus);
      success = `Waiver status updated to ${newStatus ? 'signed' : 'unsigned'}`;
    } catch (err) {
      error = 'Failed to update waiver status. Please try again.';
    } finally {
      isUpdating = false;
    }
  }
</script>

<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" on:click={onClose} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}>
  <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" on:click|stopPropagation>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Admin View</h2>
      <button
        on:click={onClose}
        class="text-gray-500 hover:text-gray-700"
      >
        <X class="h-6 w-6" />
      </button>
    </div>

    <div class="space-y-4">
      <div>
        <h3 class="font-medium text-gray-700">Customer Details</h3>
        <div class="mt-2 space-y-2">
          <p><span class="font-medium">ID:</span> {customer.id}</p>
          <p><span class="font-medium">Name:</span> {customer.firstName} {customer.lastName}</p>
          <p><span class="font-medium">Email:</span> {customer.email}</p>
          <p><span class="font-medium">Phone:</span> {customer.phone}</p>
          <p><span class="font-medium">Membership Type:</span> {customer.membershipType || 'N/A'}</p>
          <p><span class="font-medium">Lot Number:</span> {customer.lotNumber || 'N/A'}</p>
          <p><span class="font-medium">Waiver Status:</span> {customer.hasSignedWaiver ? 'Signed' : 'Not Signed'}</p>
        </div>
      </div>

      <div>
        <h3 class="font-medium text-gray-700 mb-2">Update Waiver Status</h3>
        <div class="flex space-x-2">
          <button
            on:click={() => handleWaiverUpdate(true)}
            disabled={isUpdating || customer.hasSignedWaiver}
            class="flex-1 py-2 px-4 rounded {customer.hasSignedWaiver
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'}"
          >
            <Check class="h-5 w-5 mx-auto" />
          </button>
          <button
            on:click={() => handleWaiverUpdate(false)}
            disabled={isUpdating || !customer.hasSignedWaiver}
            class="flex-1 py-2 px-4 rounded {!customer.hasSignedWaiver
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600'}"
          >
            <X class="h-5 w-5 mx-auto" />
          </button>
        </div>
      </div>

      {#if isUpdating}
        <div class="flex items-center justify-center text-gray-500">
          <Loader2 class="h-5 w-5 animate-spin mr-2" />
          <span>Updating...</span>
        </div>
      {/if}

      {#if error}
        <div class="text-red-500 text-sm">{error}</div>
      {/if}

      {#if success}
        <div class="text-green-500 text-sm">{success}</div>
      {/if}
    </div>
  </div>
</div>

