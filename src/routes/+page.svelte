<script lang="ts">
  import { onMount } from 'svelte';
  let tables: any[] = [];
  let selectedTable: string | null = null;
  let columns: any[] = [];
  let rows: any[] = [];
  let newRow: Record<string, any> = {};
  let summary: string | null = null;
  let error: string | null = null;
  let isLoading: boolean = false;

  async function summarizeTable() {
    if (!selectedTable) return;
    isLoading = true;
    error = null;
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: selectedTable })
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

  async function uploadFile(event: Event) {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    isLoading = true;
    error = null;
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
      // Automatically load the first table if available
      if (tables.length > 0) {
        await loadTableData(tables[0].name);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
      tables = [];
      selectedTable = null;
      columns = [];
      rows = [];
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
      newRow = columns.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {});
      summary = null; // Reset summary when loading a new table
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
    isLoading = true;
    error = null;
    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', table: selectedTable, data: newRow })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await loadTableData(selectedTable); // Refresh table
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add row';
    } finally {
      isLoading = false;
    }
  }

  async function deleteRow(id: any) {
    if (!selectedTable) return;
    isLoading = true;
    error = null;
    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', table: selectedTable, id })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await loadTableData(selectedTable); // Refresh table
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete row';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="p-4">
  <form on:submit|preventDefault={uploadFile} enctype="multipart/form-data" class="mb-4">
    <input type="file" name="dbFile" accept=".db" class="border p-2" />
    <button type="submit" class="btn ml-2" disabled={isLoading}>
      {isLoading ? 'Uploading...' : 'Upload'}
    </button>
  </form>

  {#if error}
    <p class="text-red-500 mb-4">{error}</p>
  {/if}

  {#if isLoading}
    <p class="text-gray-500 mb-4">Loading...</p>
  {/if}

  {#if tables.length}
    <h2 class="text-xl font-bold mb-2">Tables:</h2>
  {/if}

  {#if selectedTable}
    <div class="mt-4">
      <button
        on:click={summarizeTable}
        class="btn bg-green-500 hover:bg-green-600"
        disabled={isLoading}
      >
        {isLoading ? 'Summarizing...' : 'Summarize'}
      </button>
      {#if summary}
        <h3 class="text-lg font-semibold mt-4">Summary</h3>
        <p class="mt-2">{summary}</p>
      {/if}
    </div>

    <h2 class="text-xl font-bold mt-4">{selectedTable}</h2>
    <table class="table-auto w-full border-collapse border mt-2">
      <thead>
        <tr>
          {#each columns as col}
            <th class="border p-2">{col.name}</th>
          {/each}
          <th class="border p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            {#each columns as col}
              <td class="border p-2">{row[col.name]}</td>
            {/each}
            <td class="border p-2">
              <button
                on:click={() => deleteRow(row.id)}
                class="btn bg-red-500 hover:bg-red-600"
                disabled={isLoading}
              >
                Delete
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <h3 class="text-lg font-semibold mt-4">Add New Row</h3>
    <form on:submit|preventDefault={addRow} class="mt-2">
      {#each columns as col}
        <div class="mb-2">
          <label for={col.name} class="block">{col.name}</label>
          <input
            id={col.name}
            bind:value={newRow[col.name]}
            class="border p-1 w-full"
            disabled={isLoading}
          />
        </div>
      {/each}
      <button type="submit" class="btn mt-2" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add'}
      </button>
    </form>
  {/if}
</div>