// src/routes/dashboard/+page.ts
import { writable } from 'svelte/store';

// Exported reactive variables using Svelte stores
export const _tables = writable<any[]>([]);
export const _selectedTable = writable<string | null>(null);
export const _columns = writable<any[]>([]);
export const _rows = writable<any[]>([]);
export const _newRow = writable<Record<string, any>>({});
export const _error = writable<string | null>(null);
export const _isLoading = writable<boolean>(false);
export const _editingRow = writable<any>(null);
export const _primaryKeyColumn = writable<string | null>(null);
export const _selectedRows = writable<Set<number | string>>(new Set());

// Exported functions
export async function _fetchTables() {
  _isLoading.set(true);
  _error.set(null);
  try {
    const response = await fetch('/api/upload', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    _tables.set(data.tables || []);
    if (data.tables.length > 0) {
      await _loadTableData(data.tables[0].name);
    }
  } catch (err) {
    _error.set(err instanceof Error ? err.message : 'Failed to load tables');
  } finally {
    _isLoading.set(false);
  }
}

export async function _loadTableData(tableName: string) {
  _isLoading.set(true);
  _error.set(null);
  try {
    _selectedTable.set(tableName);
    const response = await fetch(`/api/upload?table=${tableName}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    _columns.set(data.columns || []);
    _rows.set(data.rows || []);
    _primaryKeyColumn.set(data.primaryKeyColumn || null);
    if (!data.primaryKeyColumn) {
      _error.set('Table has no primary key column. Edit and delete operations are disabled.');
    }
    _newRow.set(
      data.columns
        .filter((col: any) => col.name !== data.primaryKeyColumn)
        .reduce((acc: any, col: any) => ({ ...acc, [col.name]: '' }), {})
    );
    _selectedRows.set(new Set());
  } catch (err) {
    _error.set(err instanceof Error ? err.message : `Failed to load table ${tableName}`);
    _columns.set([]);
    _rows.set([]);
  } finally {
    _isLoading.set(false);
  }
}

export async function _addRow() {
  const currentSelectedTable = get(_selectedTable);
  if (!currentSelectedTable) return;
  const currentNewRow = get(_newRow);
  for (const [key, value] of Object.entries(currentNewRow)) {
    if (value === '' && key !== get(_primaryKeyColumn)) {
      _error.set(`Please fill in ${key}`);
      return;
    }
  }
  _isLoading.set(true);
  _error.set(null);
  try {
    const response = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', table: currentSelectedTable, data: currentNewRow }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    await _loadTableData(currentSelectedTable);
    const dialog = document.getElementById('add-row-modal') as HTMLDialogElement;
    dialog?.close();
  } catch (err) {
    _error.set(err instanceof Error ? err.message : 'Failed to add row');
  } finally {
    _isLoading.set(false);
  }
}

export async function _startEditing(row: any) {
  const currentPrimaryKeyColumn = get(_primaryKeyColumn);
  const editableRow = { ...row };
  if (currentPrimaryKeyColumn) {
    delete editableRow[currentPrimaryKeyColumn];
  }
  _editingRow.set({ ...row, ...editableRow });
}

export async function _saveEdit() {
  const currentSelectedTable = get(_selectedTable);
  const currentEditingRow = get(_editingRow);
  const currentPrimaryKeyColumn = get(_primaryKeyColumn);
  if (!currentSelectedTable || !currentEditingRow || !currentPrimaryKeyColumn) return;
  _isLoading.set(true);
  _error.set(null);
  try {
    const response = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        table: currentSelectedTable,
        data: currentEditingRow,
        id: currentEditingRow[currentPrimaryKeyColumn],
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    _editingRow.set(null);
    await _loadTableData(currentSelectedTable);
  } catch (err) {
    _error.set(err instanceof Error ? err.message : 'Failed to update row');
  } finally {
    _isLoading.set(false);
  }
}

export async function _deleteRow(row: any) {
  const currentSelectedTable = get(_selectedTable);
  const currentPrimaryKeyColumn = get(_primaryKeyColumn);
  if (!currentSelectedTable || !currentPrimaryKeyColumn) return;
  _isLoading.set(true);
  _error.set(null);
  try {
    const response = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        table: currentSelectedTable,
        id: row[currentPrimaryKeyColumn],
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    await _loadTableData(currentSelectedTable);
  } catch (err) {
    _error.set(err instanceof Error ? err.message : 'Failed to delete row.');
  } finally {
    _isLoading.set(false);
  }
}

export function _toggleRowSelection(rowId: number | string) {
  const currentSelectedRows = get(_selectedRows);
  if (currentSelectedRows.has(rowId)) {
    currentSelectedRows.delete(rowId);
  } else {
    currentSelectedRows.add(rowId);
  }
  _selectedRows.set(new Set(currentSelectedRows));
}

export async function _downloadDatabase() {
  _isLoading.set(true);
  _error.set(null);
  try {
    const response = await fetch('/api/download', {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10).replace(/-/g, '-');
    const formattedTime = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    a.download = `database_${formattedDate}_${formattedTime}.db`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    _error.set(err instanceof Error ? err.message : 'Failed to download database');
  } finally {
    _isLoading.set(false);
  }
}

// Helper function to get store values
function get<T>(store: { subscribe: (cb: (value: T) => void) => void }): T {
  let value: T;
  store.subscribe((v) => (value = v));
  return value!;
}