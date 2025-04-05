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
  let fileError: string | null = null;
  let editingRow: any = null;
  let primaryKeyColumn: string | null = null;

  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  onMount(async () => {
    // Check if the user is logged in
    const response = await fetch('/api/check-db',{
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      if(data.hasDb) {
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
    const file = formData.get('dbFile') as File;

    // Reset state
    tables = [];
    selectedTable = null;
    columns = [];
    rows = [];
    newRow = {};
    summary = null;
    error = null;
    fileError = null;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      fileError = 'File size exceeds 20MB limit';
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
      newRow = columns.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {});
      summary = null;
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
    // Validate newRow
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', table: selectedTable, data: newRow })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await loadTableData(selectedTable);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add row';
    } finally {
      isLoading = false;
    }
  }

  async function startEditing(row: any) {
    // Exclude the primary key from the editable fields
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
        body: JSON.stringify({ action: 'delete', table: selectedTable, id: row[primaryKeyColumn] })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await loadTableData(selectedTable);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete row';
    } finally {
      isLoading = false;
    }
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
      a.download = 'updated_database.db';
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

<div class="p-6 max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold mb-6">AI-Powered Database Summarizer</h1>

  <form on:submit|preventDefault={uploadFile} enctype="multipart/form-data" class="mb-6">
    <div class="flex items-center space-x-4">
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
    {#if fileError}
      <p class="text-red-500 mt-2">{fileError}</p>
    {/if}
  </form>

  {#if error}
    <p class="text-red-500 mb-4">{error}</p>
  {/if}

  {#if isLoading}
    <p class="text-gray-500 mb-4">Loading...</p>
  {/if}

  {#if tables.length}
    <h2 class="text-2xl font-semibold mb-3">Tables</h2>
    <ul class="space-y-2 mb-6">
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
    <div class="mt-6 flex space-x-4">
      <button
        on:click={summarizeTable}
        class="btn bg-green-500 hover:bg-green-600"
        disabled={isLoading}
      >
        {isLoading ? 'Summarizing...' : 'Summarize Table'}
      </button>
      <button
        on:click={downloadDatabase}
        class="btn bg-purple-500 hover:bg-purple-600"
        disabled={isLoading}
      >
        {isLoading ? 'Downloading...' : 'Save Database'}
      </button>
    </div>

    {#if summary}
      <h3 class="text-xl font-semibold mt-4">Summary</h3>
      <p class="mt-2 p-4 bg-gray-100 rounded">{summary}</p>
    {/if}

    <h2 class="text-2xl font-semibold mt-6">{selectedTable}</h2>
    <table class="table-auto w-full border-collapse border border-gray-300 mt-2">
      <thead>
        <tr class="bg-gray-200">
          {#each columns as col}
            <th class="border border-gray-300 p-3">{col.name}</th>
          {/each}
          <th class="border border-gray-300 p-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr class="hover:bg-gray-50">
            {#if editingRow && primaryKeyColumn && editingRow[primaryKeyColumn] === row[primaryKeyColumn]}
              {#each columns as col}
                {#if col.name !== primaryKeyColumn}
                  <td class="border border-gray-300 p-3">
                    <input
                      bind:value={editingRow[col.name]}
                      class="border p-1 w-full"
                      disabled={isLoading}
                    />
                  </td>
                {:else}
                  <td class="border border-gray-300 p-3">{row[col.name]}</td>
                {/if}
              {/each}
              <td class="border border-gray-300 p-3">
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
                <td class="border border-gray-300 p-3">{row[col.name]}</td>
              {/each}
              <td class="border border-gray-300 p-3">
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

    <h3 class="text-xl font-semibold mt-6">Add New Row</h3>
    <form on:submit|preventDefault={addRow} class="mt-2 space-y-4">
      {#each columns as col}
        {#if col.name !== primaryKeyColumn}
          <div>
            <label for={col.name} class="block text-sm font-medium">{col.name}</label>
            <input
              id={col.name}
              bind:value={newRow[col.name]}
              class="border p-2 w-full rounded"
              disabled={isLoading}
              placeholder={`Enter ${col.name}`}
            />
          </div>
        {/if}
      {/each}
      <button type="submit" class="btn bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Row'}
      </button>
    </form>
  {/if}
</div>