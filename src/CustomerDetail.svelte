<script lang="ts">
  import { X, Users, Settings } from 'lucide-svelte';
  import type { Customer } from './types';
  import { signWaiver } from './api';
  import { setGuestCount, setShowWaiver, updateCustomerWaiverStatus } from './stores/appStore';
  import AdminView from './AdminView.svelte';

  export let customer: Customer;
  export let guestCount: number;
  export let showWaiver: boolean;
  export let onGuestCountChange: (count: number) => void;
  export let onCheckIn: () => void;
  export let onWaiverResponse: (accepted: boolean) => void;
  export let onShowWaiver: () => void;
  export let onReset: () => void;
  
  let isOtherSelected = false;
  let customGuestCount = '';
  let hasSelected = guestCount > 0;
  let showAdmin = false;
  let guestCountInputElement: HTMLInputElement;

  // Update hasSelected when guestCount changes
  $: hasSelected = guestCount > 0;

  function handleSelectChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const value = target.value;
    if (value === 'other') {
      isOtherSelected = true;
      customGuestCount = '';
      hasSelected = false;
      onGuestCountChange(0);
    } else {
      isOtherSelected = false;
      const numValue = parseInt(value);
      setGuestCount(numValue);
      onGuestCountChange(numValue);
      hasSelected = true;
    }
  }

  function handleCustomInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    customGuestCount = value;
    if (value) {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 1) {
        setGuestCount(numValue);
        onGuestCountChange(numValue);
        hasSelected = true;
      } else {
        hasSelected = false;
      }
    } else {
      hasSelected = false;
    }
  }

  function handleCustomBlur() {
    if (customGuestCount) {
      const numValue = parseInt(customGuestCount);
      if (isNaN(numValue) || numValue < 1) {
        customGuestCount = '';
        hasSelected = false;
        onGuestCountChange(0);
      }
    } else {
      customGuestCount = '';
      hasSelected = false;
      onGuestCountChange(0);
    }
  }

  async function handleWaiverAccept() {
    const success = await signWaiver(customer.id);
    if (success) {
      updateCustomerWaiverStatus(customer.id, true);
      setShowWaiver(false);
      onWaiverResponse(true);
      setTimeout(() => {
        if (guestCountInputElement) {
          guestCountInputElement.focus();
        }
      }, 100);
    }
  }
</script>

<div class="bg-white rounded-lg shadow-md p-6">
  <div class="flex justify-between items-start mb-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">
        Hi, {customer.firstName}
      </h2>
    </div>
    <div class="flex space-x-2">
      <button
        on:click={() => showAdmin = true}
        class="p-2 text-gray-500 hover:text-gray-700"
        title="Admin View"
      >
        <Settings class="h-5 w-5" />
      </button>
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
  </div>

  {#if showAdmin}
    <AdminView
      {customer}
      onClose={() => showAdmin = false}
    />
  {/if}

  <div class="grid md:grid-cols-2 gap-6">
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
          disabled={showWaiver || !hasSelected}
          class="w-full py-3 rounded-lg flex items-center justify-center gap-2 mb-6 {!showWaiver && hasSelected
            ? 'bg-primary-600 text-white hover:bg-primary-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
        >
          <Users class="h-5 w-5" />
          <span>
            {showWaiver 
              ? 'Please Sign Waiver First' 
              : !hasSelected 
                ? 'Please Select Number of Guests' 
                : 'Check In Now'}
          </span>
        </button>
        {#if showWaiver}
          <p 
            data-testid="nowaiver-cant-checkin" 
            class="mt-2 text-sm text-red-600 mb-6"
          >
            You must sign the waiver before checking in
          </p>
        {/if}
        <div class="relative w-full mb-4">
          <select
            data-testid="guest-count-select"
            value={isOtherSelected ? 'other' : (hasSelected ? guestCount.toString() : '')}
            on:change={handleSelectChange}
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg appearance-none bg-white"
          >
            <option value="" disabled selected>Select number of guests</option>
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4 Guests</option>
            <option value="5">5 Guests</option>
            <option value="6">6 Guests</option>
            <option value="7">7 Guests</option>
            <option value="8">8 Guests</option>
            <option value="9">9 Guests</option>
            <option value="10">10 Guests</option>
            <option value="other">Other</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        {#if isOtherSelected}
          <div class="relative w-full">
            <input
              bind:this={guestCountInputElement}
              data-testid="checkin-input"
              type="number"
              min="1"
              bind:value={customGuestCount}
              on:input={handleCustomInput}
              on:blur={handleCustomBlur}
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg"
              placeholder="Enter number of guests"
            />
          </div>
        {/if}
      </div>
    </div>

    <div class="bg-gray-50 p-6 rounded-lg">
      {#if showWaiver}
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">Liability Waiver</h3>
          <div class="flex flex-col items-center p-4">
            <img 
              src="/assets/waiver-qr-code.png" 
              alt="Waiver QR Code" 
              class="w-48 h-48"
              data-testid="waiver-qr-code"
            />
            <p class="mt-4 text-sm text-gray-600">
              Scan this QR code to sign the waiver
            </p>
          </div>
          <div class="flex gap-3">
            <button
              data-testid="accept-waiver-button"
              on:click={handleWaiverAccept}
              class="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              I've already signed
            </button>
          </div>
        </div>
      {:else}
        <div>
          <h3 
            data-testid="signwaiver-text"
            class="text-lg font-medium text-gray-900 mb-4"
          >
            Waiver Already Signed
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            You have previously signed the liability waiver, Thank You!
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

