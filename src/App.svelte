<script lang="ts">
  import { Check, AlertCircle } from 'lucide-svelte';
  import type { Customer } from './types';
  import { unifiedSearch, validateQRCode, logCheckIn } from './api';
  import UnifiedSearch, { type UnifiedSearchResult } from './UnifiedSearch.svelte';
  import CustomerList from './CustomerList.svelte';
  import CustomerDetail from './CustomerDetail.svelte';
  import { resetState } from './stores/appStore';

  const STANDARD_ERROR_MESSAGE = 'An issue with check-in, please see the manager on duty';

  let customers: Customer[] = [];
  let isLoading = false;
  let error: string | null = null;
  let selectedCustomer: Customer | null = null;
  let guestCount = 1;
  let showConfirmation = false;
  let qrOrderId: string | null = null;

  const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

  import { onMount } from 'svelte';
  
  // Auto-dismiss confirmation after 3 seconds
  $: if (showConfirmation) {
    setTimeout(() => {
      handleResetState();
    }, 3000);
  }

  function handleResetState() {
    customers = [];
    selectedCustomer = null;
    error = null;
    showConfirmation = false;
    qrOrderId = null;
    guestCount = 1;
    resetState();
  }

  // Handle unified search results
  async function handleSearchResult(result: UnifiedSearchResult) {
    isLoading = false;
    error = null;

    if (result.type === 'qr') {
      // QR code result
      if (result.valid && result.customerId) {
        // Valid QR code - proceed to check-in
        qrOrderId = result.orderId || null;
        // For QR code check-in, we'll handle it directly
        await handleQRCheckIn(result.orderId!, result.customerId, guestCount);
      } else {
        // Invalid QR code
        error = result.reason || STANDARD_ERROR_MESSAGE;
        customers = [];
      }
    } else {
      // Search results
      if (result.results && result.results.length > 0) {
        // Adapt API results to Customer type
        const adaptedCustomers = result.results.map((c: any) => ({
          id: c.id,
          firstName: c.given_name || c.firstName || '',
          lastName: c.family_name || c.lastName || '',
          email: c.email_address || c.email || '',
          phone: c.phone_number || c.phone || '',
          lotNumber: c.reference_id || c.lotNumber,
          membershipType: c.membershipType || 'Non-Member',
          hasSignedWaiver: c.hasSignedWaiver || false,
        }));
        customers = adaptedCustomers;
      } else {
        customers = [];
        error = 'No customers found. Please try a different search.';
      }
    }
  }

  // Handle QR code scan
  async function handleQRCodeScanned(orderId: string) {
    isLoading = true;
    error = null;

    try {
      const validation = await validateQRCode(orderId);
      if (validation.valid && validation.customerId) {
        await handleQRCheckIn(orderId, validation.customerId, guestCount);
      } else {
        error = validation.reason || STANDARD_ERROR_MESSAGE;
      }
    } catch (err) {
      console.error('Error processing QR code:', err);
      error = STANDARD_ERROR_MESSAGE;
    } finally {
      isLoading = false;
    }
  }

  // Handle QR code check-in
  async function handleQRCheckIn(orderId: string, customerId: string, guests: number) {
    try {
      const result = await logCheckIn(
        customerId,
        guests,
        '', // firstName - not needed for QR check-in
        '', // lastName - not needed for QR check-in
        undefined, // lotNumber
        orderId
      );

      if (result.success) {
        showConfirmation = true;
        if (result.queued) {
          // Check-in was queued (offline mode)
          console.log('Check-in queued for sync:', result.message);
        }
      } else {
        error = result.message || STANDARD_ERROR_MESSAGE;
      }
    } catch (err) {
      console.error('Error during QR check-in:', err);
      error = STANDARD_ERROR_MESSAGE;
    }
  }

  // Handle manual check-in
  async function handleCheckIn() {
    if (!selectedCustomer || guestCount < 1) {
      error = 'Please select a customer and enter guest count';
      return;
    }

    isLoading = true;
    error = null;

    try {
      const result = await logCheckIn(
        selectedCustomer.id,
        guestCount,
        selectedCustomer.firstName,
        selectedCustomer.lastName,
        selectedCustomer.lotNumber
      );

      if (result.success) {
        showConfirmation = true;
      } else {
        error = result.message || STANDARD_ERROR_MESSAGE;
      }
    } catch (err) {
      console.error('Error during check-in:', err);
      error = STANDARD_ERROR_MESSAGE;
    } finally {
      isLoading = false;
    }
  }

  // Handle search start
  function handleSearchStart() {
    isLoading = true;
    error = null;
  }
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-primary-600 text-white py-6 px-4 shadow-lg">
    <div class="max-w-3xl mx-auto">
      <h1 class="text-3xl font-bold">Big Trees Village Rec Center Check In</h1>
      <p class="mt-2 text-primary-100">
        Scan your QR code or search by name, phone, email, address, or lot number
      </p>
      {#if USE_MOCK_API}
        <div class="mt-1 px-2 py-1 bg-yellow-500 text-white text-xs inline-block rounded">
          Demo Mode: Using Mock Data
        </div>
      {/if}
    </div>
  </header>

  <main class="max-w-3xl mx-auto p-4 mt-6">
    {#if showConfirmation}
      <div class="bg-green-50 rounded-lg p-8 text-center">
        <div 
          data-testid="green-checkmark"
          class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check class="h-8 w-8 text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-green-900 mb-2">All Set!</h2>
        <p class="text-green-700">You're checked in and ready to go. Enjoy your visit!</p>
      </div>
    {:else if selectedCustomer}
      <CustomerDetail
        customer={selectedCustomer}
        {guestCount}
        showWaiver={!selectedCustomer.hasSignedWaiver}
        onGuestCountChange={(count) => guestCount = count}
        onCheckIn={handleCheckIn}
        onWaiverResponse={(accepted) => {
          if (!accepted) {
            handleResetState();
          }
        }}
        onShowWaiver={() => {}}
        onReset={handleResetState}
      />
    {:else}
      <UnifiedSearch
        onSearchResult={handleSearchResult}
        onQRCodeScanned={handleQRCodeScanned}
        onSearchStart={handleSearchStart}
        {isLoading}
        error={null}
      />
      
      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0" />
          <p class="text-red-700">{error}</p>
        </div>
      {/if}

      {#if customers.length > 0}
        <div class="bg-white rounded-lg shadow-md">
          <CustomerList
            {customers}
            onSelectCustomer={(customer) => selectedCustomer = customer}
            {isLoading}
            error={null}
            searchQuery=""
          />
        </div>
      {/if}
    {/if}
  </main>
</div>

