<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
  
    let summary: string | null = null;
    let error: string | null = null;
    let isLoading: boolean = false;
    let selectedTable: string | null = null;
    let selectedIds: string | null = null;
  
    onMount(async () => {
      selectedTable = $page.url.searchParams.get('table');
      selectedIds = $page.url.searchParams.get('ids');
      if (selectedTable) {
        await summarizeTable();
      }
    });
  
    async function summarizeTable() {
      if (!selectedTable) return;
      isLoading = true;
      error = null;
      summary = null;
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: selectedTable, ids: selectedIds  })
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        summary = data.summary || 'No summary available';
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to fetch summary';
        summary = null;
      } finally {
        isLoading = false;
      }
    }
  </script>
  
  <!-- Header -->
  <header class="bg-white shadow-sm z-10">
    <div class="px-6 py-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800">AI-Generated Summary</h2>
    </div>
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 overflow-auto p-6">
    {#if !selectedTable}
      <p class="text-gray-600">Please select a table from the Dashboard to generate a summary.</p>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 class="text-lg font-medium">AI-Generated Summary</h3>
              <div class="flex space-x-2">
                <button
                  on:click={() => summarizeTable()}
                  class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  disabled={isLoading}
                  title="Regenerate summary"
                >
                {#if isLoading}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                  </svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </button>
              </div>
            </div>
  
            <div class="p-6">
              {#if isLoading}
                <div class="flex flex-col items-center justify-center py-12">
                  <div class="w-12 h-12 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p class="mt-4 text-gray-600">Generating summary...</p>
                </div>
              {:else if summary}
                <div class="prose max-w-none">
                  {#each summary.split('\n') as line}
                    <p>{line}</p>
                  {/each}
                </div>
                <div class="mt-4 text-xs text-gray-500">
                  Generated at: {new Date().toLocaleString()}
                </div>
              {:else}
                <div class="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p class="mt-4">No summary generated yet</p>
                </div>
              {/if}
            </div>
          </div>
        </div>
  
        <div>
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="p-4 border-b border-gray-200">
              <h3 class="text-lg font-medium">Summary Settings</h3>
            </div>
  
            <div class="p-4 space-y-4">
              <div class="mb-4">
                <label for="data-source" class="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
                <div id="data-source" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                  {selectedTable} table
                </div>
              </div>
              <div class="mb-4">
                <label for="summary-type" class="block text-sm font-medium text-gray-700 mb-1">Summary Type</label>
                <select id="summary-type" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Descriptive Summary</option>
                  <option>Statistical analysis</option>
                  <option>Comparison</option>
                  <option>Recommendations</option>
                </select>
              </div>
              <div class="mb-4">
                <label for="custom-instructions" class="block text-sm font-medium text-gray-700 mb-1">Custom Instructions</label>
                <textarea
                  id="custom-instructions"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                  placeholder="Add specific instructions for the AI..."
                ></textarea>
              </div>
  
              <button
                on:click={() => summarizeTable()}
                class="w-full btn bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Customize & Generate'}
              </button>
            </div>
          </div>
  
        </div>
      </div>
    {/if}
  </main>
  
  <style>
    .btn {
      @apply text-white px-4 py-2 rounded transition-colors;
    }
    .prose {
      @apply text-gray-600;
    }
  </style>