<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { databaseUploaded } from '$lib/index';
  import { 
    _tables, _selectedTable, _columns, _rows, _newRow, _error, _isLoading, _editingRow, _primaryKeyColumn, _selectedRows,
    _fetchTables, _loadTableData, _addRow, _startEditing, _saveEdit, _deleteRow, _toggleRowSelection, _downloadDatabase 
  } from './+page';

  let unsubscribe: () => void;

  onMount(async () => {
    await _fetchTables();
    unsubscribe = databaseUploaded.subscribe(async (value) => {
      if (value !== undefined) {
        await _fetchTables();
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

<!-- Header -->
<header class="bg-white shadow-sm z-10">
  <div class="px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-4"> 
      <h2 class="text-xl font-semibold text-gray-800">Database Dashboard</h2>
      <button
        on:click={_downloadDatabase}
        title="Export Database"
        aria-label="Export Database"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 576 512" 
          class="w-6 h-6 text-gray-800"
          fill="currentColor"
        >
          <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 128-168 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l168 0 0 112c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zM384 336l0-48 110.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39L384 336zm0-208l-128 0L256 0 384 128z"/>
        </svg>
      </button>
    </div>
  </div>

  {#if $_tables.length}
    <div class="px-6 py-2 border-t border-gray-200 bg-gray-50 flex items-center space-x-2">
      {#each $_tables as table}
        <button
          on:click={() => _loadTableData(table.name)}
          class="px-3 py-1.5 rounded-md text-sm {$_selectedTable === table.name ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-900 hover:text-white'}"
        >
          {table.name}
        </button>
      {/each}
    </div>
  {/if}
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  {#if $_error}
    <div class="fixed top-4 right-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded z-50 animate-fade-out" role="alert">
      <div class="flex items-center">
        <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p>{$_error}</p>
      </div>
    </div>
  {/if}

  {#if $_isLoading}
    <p class="text-gray-500 mb-4">Loading...</p>
  {/if}

  {#if $_selectedTable}
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="p-4 border-b border-gray-200 flex justify-between items-center">
        <div class="flex items-center">
          <h3 class="text-lg font-medium">{$_selectedTable}</h3>
          <div class="relative">
            <button
              on:click={(event) => {
                const dialog = document.getElementById('add-row-modal') as HTMLDialogElement;
                const button = event.currentTarget as HTMLButtonElement;
                const rect = button.getBoundingClientRect();
          
                dialog.style.position = 'absolute';
                dialog.style.top = `${rect.bottom + window.scrollY}px`;
                dialog.style.left = `${rect.left + window.scrollX}px`; 
          
                dialog?.showModal();
              }}
              class="flex items-center justify-center p-2 text-gray-900 hover:text-gray-700 transition-colors disabled:opacity-50"
              disabled={$_isLoading}
              aria-label={`Add new row to ${$_selectedTable}`}
              title={`Add New ${$_selectedTable}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-gray-900 hover:text-gray-700"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          
            <!-- Add Row Modal -->
            <dialog
              id="add-row-modal"
              class="border border-gray-300 rounded-lg shadow-lg p-4 w-80 bg-white backdrop:bg-black/10"
            >
              <h3 class="text-xl font-semibold mb-4">Add {$_selectedTable}</h3>
              <form on:submit|preventDefault={_addRow} class="gap-y-4">
                {#each $_columns as col}
                  {#if col.name !== $_primaryKeyColumn}
                    <div>
                      <label for={col.name} class="block text-sm font-medium text-gray-700">{col.name}</label>
                      <input
                        id={col.name}
                        bind:value={$_newRow[col.name]}
                        class="border border-gray-300 p-2 w-full rounded-md disabled:bg-gray-100"
                        disabled={$_isLoading}
                        placeholder={`Enter ${col.name}`}
                      />
                    </div>
                  {/if}
                {/each}
                <div class="flex justify-end gap-x-2 mt-4">
                  <button
                    type="button"
                    on:click={() => (document.getElementById('add-row-modal') as HTMLDialogElement)?.close()}
                    class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-400"
                    disabled={$_isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-400"
                    disabled={$_isLoading}
                  >
                    {$_isLoading ? 'Adding...' : `Add ${$_selectedTable}`}
                  </button>
                </div>
              </form>
            </dialog>
          </div>
        </div>
        <div class="flex gap-4">
          <button
            on:click={() => {
              if ($_primaryKeyColumn && $_selectedRows.size > 0) {
                const selectedIds = Array.from($_selectedRows).map(String).join(',');
                goto(`/summaries?table=${$_selectedTable}&ids=${selectedIds}`);
              } else {
                goto(`/summaries?table=${$_selectedTable}`);
              }
            }}
            class="btn bg-emerald-600 hover:bg-emerald-700"
          >
            Generate Summary
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50">
              <th class="w-10 px-4 py-3 text-left"></th>
              {#each $_columns as col}
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">{col.name}</th>
              {/each}
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each $_rows as row}
              <tr class="border-t border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!$_primaryKeyColumn && $_selectedRows.has(row[$_primaryKeyColumn])}
                    on:change={() => $_primaryKeyColumn && _toggleRowSelection(row[$_primaryKeyColumn])}
                    class="rounded text-emerald-600"
                    disabled={$_isLoading}
                  />
                </td>
                {#if $_editingRow && $_primaryKeyColumn && $_editingRow[$_primaryKeyColumn] === row[$_primaryKeyColumn]}
                  {#each $_columns as col}
                    {#if col.name !== $_primaryKeyColumn}
                      <td class="px-4 py-3">
                        <input
                          bind:value={$_editingRow[col.name]}
                          class="border p-1 w-full rounded-md"
                          disabled={$_isLoading}
                        />
                      </td>
                    {:else}
                      <td class="px-4 py-3">{row[col.name]}</td>
                    {/if}
                  {/each}
                  <td class="px-4 py-3">
                    <button
                      on:click={_saveEdit}
                      class="btn bg-green-500 hover:bg-green-600 mr-2"
                      disabled={$_isLoading}
                    >
                      Save
                    </button>
                    <button
                      on:click={() => _editingRow.set(null)}
                      class="btn bg-gray-500 hover:bg-gray-600"
                      disabled={$_isLoading}
                    >
                      Cancel
                    </button>
                  </td>
                {:else}
                  {#each $_columns as col}
                    <td class="px-4 py-3 text-sm">{row[col.name]}</td>
                  {/each}
                  <td class="px-4 py-3">
                    <button
                      on:click={() => _startEditing(row)}
                      class="btn bg-blue-500 hover:bg-blue-600 mr-2"
                      disabled={$_isLoading || !$_primaryKeyColumn}
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => _deleteRow(row)}
                      class="btn bg-red-500 hover:bg-red-600"
                      disabled={$_isLoading || !$_primaryKeyColumn}
                    >
                      Delete
                    </button>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</main>

<style>
  .btn {
    @apply text-white px-4 py-2 rounded transition-colors;
  }
</style>