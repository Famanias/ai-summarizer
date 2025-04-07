import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';


export const POST: RequestHandler = async ({ request, cookies }) => {
  const dbPath = cookies.get('dbPath');
  if (!dbPath) {
    return new Response('No database uploaded', { status: 400 });
  }
  if (!existsSync(dbPath)) {
    return new Response('Database file does not exist', { status: 400 });
  }

  const { action, table, data, id } = await request.json();

  // Validate table name to prevent SQL injection
  const validTableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!validTableNameRegex.test(table)) {
    return new Response('Invalid table name', { status: 400 });
  }

  const db = new Database(dbPath);

  try {

    // Get table schema to determine the primary key
    const tableInfo = db.pragma(`table_info(${table})`) as Array<{ name: string; pk: number }>;
    const primaryKeyColumn = tableInfo.find((col: any) => col.pk === 1)?.name;
    if (!primaryKeyColumn) {
      return new Response('Table has no primary key column', { status: 400 });
    }
    
    if (action === 'create') {

      const filteredData = { ...data };
      // delete filteredData[primaryKeyColumn];

      const columns = Object.keys(filteredData).join(', ');
      const placeholders = Object.keys(filteredData).map(() => '?').join(', ');
      const values = Object.values(filteredData);

      if (columns.length === 0) {
        return new Response('No columns to insert after excluding primary key', { status: 400 });
      }
       
      db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`).run(...values);
    } else if (action === 'update') {

      const filteredData = { ...data };
      delete filteredData[primaryKeyColumn];

      const setClause = Object.keys(filteredData).map((key) => `${key} = ?`).join(', ');
      const values = Object.values(filteredData);

      if (setClause.length === 0) {
        return new Response('No columns to update after excluding primary key', { status: 400 });
      }
      
      db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${primaryKeyColumn} = ?`).run(...values, id);
    } else if (action === 'delete') {
      db.prepare(`DELETE FROM ${table} WHERE ${primaryKeyColumn} = ?`).run(id);
    } else {
      return new Response('Invalid action', { status: 400 });
    }
    return new Response('Success', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  } finally{
    db.close();
  }
};