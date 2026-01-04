<script lang="ts">
  import { Search, QrCode, Loader2, AlertCircle } from 'lucide-svelte';

  export interface UnifiedSearchResult {
    type: 'qr' | 'email' | 'phone' | 'name' | 'address' | 'lot' | 'search';
    results?: any[];
    orderId?: string;
    valid?: boolean;
    reason?: string;
    customerId?: string;
    hasMembership?: boolean;
  }

  interface Props {
    onSearchResult: (result: UnifiedSearchResult) => void;
    onQRCodeScanned?: (orderId: string) => void;
    onSearchStart?: () => void;
    isLoading?: boolean;
    error?: string | null;
  }

  export let onSearchResult: (result: UnifiedSearchResult) => void;
  export let onQRCodeScanned: ((orderId: string) => void) | undefined = undefined;
  export let onSearchStart: (() => void) | undefined = undefined;
  export let isLoading: boolean = false;
  export let error: string | null = null;
  
  import { onMount } from 'svelte';
  
  let query = '';
  let isScanning = false;
  let inputElement: HTMLInputElement;

  // Auto-focus input on mount for scanner support
  onMount(() => {
    if (inputElement) {
      inputElement.focus();
    }
  });

  // Handle input changes - detect if it's a QR code scan
  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    query = value;

    // If input looks like a QR code (long alphanumeric, typically from scanner)
    // QR codes are usually 10+ characters and alphanumeric
    const qrPattern = /^[A-Z0-9]{10,}$/i;
    if (qrPattern.test(value) && value.length >= 10) {
      // Small delay to allow scanner to finish input
      setTimeout(() => {
        if (query === value) {
          handleQRCode(value);
        }
      }, 100);
    }
  }

  // Handle QR code scan
  async function handleQRCode(scannedValue: string) {
    isScanning = true;
    query = '';
    if (onSearchStart) {
      onSearchStart();
    }

    try {
      // Validate QR code via API
      const response = await fetch('http://localhost:3000/api/customers/validate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: scannedValue }),
      });

      const data = await response.json();

      if (data.valid) {
        // Valid QR code - trigger check-in flow
        if (onQRCodeScanned) {
          onQRCodeScanned(scannedValue);
        }
        onSearchResult({
          type: 'qr',
          orderId: scannedValue,
          valid: true,
          customerId: data.customerId,
          hasMembership: data.hasMembership,
        });
      } else {
        // Invalid QR code
        onSearchResult({
          type: 'qr',
          orderId: scannedValue,
          valid: false,
          reason: data.reason || 'An issue with check-in, please see the manager on duty',
        });
      }
    } catch (err) {
      console.error('Error validating QR code:', err);
      onSearchResult({
        type: 'qr',
        orderId: scannedValue,
        valid: false,
        reason: 'An issue with check-in, please see the manager on duty',
      });
    } finally {
      isScanning = false;
      // Refocus input for next scan
      if (inputElement) {
        inputElement.focus();
      }
    }
  }

  // Handle manual search
  async function handleManualSearch() {
    if (!query.trim()) {
      return;
    }

    if (onSearchStart) {
      onSearchStart();
    }

    try {
      const response = await fetch('http://localhost:3000/api/customers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      onSearchResult(data);
    } catch (err) {
      console.error('Error searching:', err);
      onSearchResult({
        type: 'search',
        results: [],
      });
    }
  }

  // Handle Enter key
  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      // Check if it looks like a QR code
      const qrPattern = /^[A-Z0-9]{10,}$/i;
      if (qrPattern.test(query) && query.length >= 10) {
        handleQRCode(query);
      } else {
        handleManualSearch();
      }
    }
  }
</script>

<div class="bg-white rounded-lg shadow-md p-6 mb-6">
  <div class="mb-4">
    <h2 class="text-xl font-semibold text-gray-800 mb-2">
      Scan QR Code or Search
    </h2>
    <p class="text-sm text-gray-600">
      Scan your QR code with the scanner, or search by name, phone, email, address, or lot number
    </p>
  </div>

  <div class="flex gap-3">
    <div class="relative flex-1">
      <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        {#if isScanning}
          <Loader2 class="h-5 w-5 text-primary-600 animate-spin" />
        {:else}
          <QrCode class="h-5 w-5 text-gray-400" />
        {/if}
      </div>
      <input
        bind:this={inputElement}
        type="text"
        placeholder="Scan QR code or type to search..."
        class="w-full pl-10 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        bind:value={query}
        on:input={handleInputChange}
        on:keypress={handleKeyPress}
        disabled={isLoading || isScanning}
        autofocus
        autocomplete="off"
      />
    </div>
    <button
      on:click={handleManualSearch}
      disabled={isLoading || isScanning || !query.trim()}
      class="px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
    >
      {#if isLoading}
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>Searching...</span>
      {:else}
        <Search class="h-5 w-5" />
        <span>Search</span>
      {/if}
    </button>
  </div>

  {#if error}
    <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
      <AlertCircle class="h-5 w-5" />
      <span>{error}</span>
    </div>
  {/if}

  {#if isScanning}
    <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Validating QR code...</span>
    </div>
  {/if}
</div>

