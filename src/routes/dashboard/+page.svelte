<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
  
    let tables: any[] = [];
    let selectedTable: string | null = null;
    let columns: any[] = [];
    let rows: any[] = [];
    let newRow: Record<string, any> = {};
    let error: string | null = null;
    let isLoading: boolean = false;
    let fileError: string | null = null;
    let editingRow: any = null;
    let primaryKeyColumn: string | null = null;
    let selectedRows: Set<number | string> = new Set();
  
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
  
    onMount(async () => {
      const response = await fetch('/api/check-db', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.hasDb) {
          await fetchTables();
        } else {
          error = 'No database found. Please upload a database file.';
        }
      }
    });
  
    async function fetchTables() {
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/upload', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        tables = data.tables || [];
        if (tables.length > 0) {
          await loadTableData(tables[0].name);
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load tables';
      } finally {
        isLoading = false;
      }
    }
  
    async function uploadFile(event: Event) {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      const file = formData.get('dbFile') as File;
  
      tables = [];
      selectedTable = null;
      columns = [];
      rows = [];
      newRow = {};
      error = null;
      fileError = null;
  
      if (file.size > MAX_FILE_SIZE) {
        fileError = 'File size exceeds 20MB limit';
        setTimeout(() => {
          fileError = null;
        }, 5000);
          return;
      }
  
      isLoading = true;
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        tables = data.tables || [];
        if (tables.length > 0) {
          await loadTableData(tables[0].name);
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Upload failed';
        setTimeout(() => {
          error = null;
        }, 5000);
      } finally {
        isLoading = false;
      }
    }
  
    async function loadTableData(tableName: string) {
      isLoading = true;
      error = null;
      try {
        selectedTable = tableName;
        const response = await fetch(`/api/upload?table=${tableName}`);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        columns = data.columns || [];
        rows = data.rows || [];
        primaryKeyColumn = data.primaryKeyColumn || null;
        if (!primaryKeyColumn) {
          error = 'Table has no primary key column. Edit and delete operations are disabled.';
        }
        newRow = columns
          .filter((col: any) => col.name !== primaryKeyColumn)
          .reduce((acc: any, col: any) => ({ ...acc, [col.name]: '' }), {});
        selectedRows.clear();
      } catch (err) {
        error = err instanceof Error ? err.message : `Failed to load table ${tableName}`;
        columns = [];
        rows = [];
      } finally {
        isLoading = false;
      }
    }
  
    async function addRow() {
      if (!selectedTable) return;
      for (const [key, value] of Object.entries(newRow)) {
        if (value === '' && key !== primaryKeyColumn) {
          error = `Please fill in ${key}`;
          return;
        }
      }
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/edit', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", table: selectedTable, data: newRow }),
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        await loadTableData(selectedTable);

        const dialog = document.getElementById('add-row-modal') as HTMLDialogElement;
        dialog?.close();
      } catch (err) {
        error = err instanceof Error ? err.message : "Failed to add row";
      } finally {
        isLoading = false;
      }
    }
  
    async function startEditing(row: any) {
      const editableRow = { ...row };
      if (primaryKeyColumn) {
        delete editableRow[primaryKeyColumn];
      }
      editingRow = { ...row, ...editableRow };
    }
  
    async function saveEdit() {
      if (!selectedTable || !editingRow || !primaryKeyColumn) return;
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            table: selectedTable,
            data: editingRow,
            id: editingRow[primaryKeyColumn]
          })
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        editingRow = null;
        await loadTableData(selectedTable);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to update row';
      } finally {
        isLoading = false;
      }
    }
  
    async function deleteRow(row: any) {
      if (!selectedTable || !primaryKeyColumn) return;
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            table: selectedTable,
            id: row[primaryKeyColumn]
          })
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        await loadTableData(selectedTable);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to delete row.';
      } finally {
        isLoading = false;
      }
    }
  
    function toggleRowSelection(rowId: number | string) {
      if (selectedRows.has(rowId)) {
        selectedRows.delete(rowId);
      } else {
        selectedRows.add(rowId);
      }
      selectedRows = new Set(selectedRows);
    }

    async function downloadDatabase() {
    isLoading = true;
    error = null;
    try {
      const response = await fetch('/api/download', {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      //date and time file name
      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 10).replace(/-/g, '-');
      const formattedTime = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      a.download = `database_${formattedDate}_${formattedTime}.db`

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to download database';
    } finally {
      isLoading = false;
    }
  }
  </script>
  
  <!-- Header -->
  <header class="bg-white shadow-sm z-10">
    <div class="px-6 py-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800">Database Dashboard</h2>
      <div class="flex items-center gap-4">
        <div class="flex items-center">
          <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
          <span class="text-sm text-gray-600">Connected to Database</span>
        </div>
      </div>
    </div>
  
    {#if tables.length}
      <div class="px-6 py-2 border-t border-gray-200 bg-gray-50 flex items-center space-x-2">
        {#each tables as table}
          <button
            on:click={() => loadTableData(table.name)}
            class="px-3 py-1.5 rounded-md text-sm {$selectedTable === table.name ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
          >
            {table.name}
          </button>
        {/each}
      </div>
    {/if}
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 overflow-auto p-6">
    <form on:submit|preventDefault={uploadFile} enctype="multipart/form-data" class="mb-6">
      <div class="flex items-center gap-4">
        <input
          type="file"
          name="dbFile"
          accept=".db"
          class="border p-2 rounded file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
        />
        <button type="submit" class="btn bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
          {isLoading ? 'Uploading...' : 'Upload Database'}
        </button>
      </div>
    </form>

    {#if fileError}
      <div
        class="fixed top-4 right-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded z-50 animate-fade-out"
        role="alert"
      >
        <div class="flex items-center">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p>{fileError}</p>
        </div>
      </div>
    {/if}
  
    {#if error}
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
          <p>{error}</p>
        </div>
      </div>
    {/if}
  
    {#if isLoading}
      <p class="text-gray-500 mb-4">Loading...</p>
    {/if}

    {#if tables.length}
      <h2 class="text-2xl font-semibold mb-3">Tables</h2>
      <ul class="flex flex-wrap gap-2 mb-6">
        {#each tables as table}
          <li>
            <button
              on:click={() => loadTableData(table.name)}
              class="btn bg-blue-500"
              disabled={isLoading}
            >
              {table.name}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  
    {#if selectedTable}
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <div class="flex items-center">
            <h3 class="text-lg font-medium">{selectedTable}</h3>
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
                disabled={isLoading}
                aria-label={`Add new row to ${selectedTable}`}
                title={`Add New ${selectedTable}`}
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
                <h3 class="text-xl font-semibold mb-4">Add {selectedTable}</h3>
                <form on:submit|preventDefault={addRow} class="gap-y-4">
                  {#each columns as col}
                    {#if col.name !== primaryKeyColumn}
                      <div>
                        <label for={col.name} class="block text-sm font-medium text-gray-700">{col.name}</label>
                        <input
                          id={col.name}
                          bind:value={newRow[col.name]}
                          class="border border-gray-300 p-2 w-full rounded-md disabled:bg-gray-100"
                          disabled={isLoading}
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
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-400"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Adding...' : `Add ${selectedTable}`}
                    </button>
                  </div>
                </form>
              </dialog>
            </div>

          </div>
          <div class="flex gap-4">
            <button
              on:click={downloadDatabase}
              class="btn bg-purple-500 hover:bg-purple-600"
              disabled={isLoading}
            >
              {isLoading ? 'Exporting...' : 'Export Database'}
            </button>
            <button
              on:click={() => {
                if (primaryKeyColumn && selectedRows.size > 0) {
                  // If rows are selected, send their IDs
                  const selectedIds = Array.from(selectedRows).map(String).join(',');
                  goto(`/summaries?table=${selectedTable}&ids=${selectedIds}`);
                } else {
                  // If no rows selected, send empty ids to summarize all
                  goto(`/summaries?table=${selectedTable}`);
                }
              }}
              class="btn bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading || !primaryKeyColumn}
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
                {#each columns as col}
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">{col.name}</th>
                {/each}
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as row}
                <tr class="border-t border-gray-200 hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!primaryKeyColumn && selectedRows.has(row[primaryKeyColumn])}
                      on:change={() => primaryKeyColumn && toggleRowSelection(row[primaryKeyColumn])}
                      class="rounded text-emerald-600"
                      disabled={isLoading}
                    />
                  </td>
                  {#if editingRow && primaryKeyColumn && editingRow[primaryKeyColumn] === row[primaryKeyColumn]}
                    {#each columns as col}
                      {#if col.name !== primaryKeyColumn}
                        <td class="px-4 py-3">
                          <input
                            bind:value={editingRow[col.name]}
                            class="border p-1 w-full rounded-md"
                            disabled={isLoading}
                          />
                        </td>
                      {:else}
                        <td class="px-4 py-3">{row[col.name]}</td>
                      {/if}
                    {/each}
                    <td class="px-4 py-3">
                      <button
                        on:click={saveEdit}
                        class="btn bg-green-500 hover:bg-green-600 mr-2"
                        disabled={isLoading}
                      >
                        Save
                      </button>
                      <button
                        on:click={() => (editingRow = null)}
                        class="btn bg-gray-500 hover:bg-gray-600"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </td>
                  {:else}
                    {#each columns as col}
                      <td class="px-4 py-3 text-sm">{row[col.name]}</td>
                    {/each}
                    <td class="px-4 py-3">
                      <button
                        on:click={() => startEditing(row)}
                        class="btn bg-blue-500 hover:bg-blue-600 mr-2"
                        disabled={isLoading || !primaryKeyColumn}
                      >
                        Edit
                      </button>
                      <button
                        on:click={() => deleteRow(row)}
                        class="btn bg-red-500 hover:bg-red-600"
                        disabled={isLoading || !primaryKeyColumn}
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