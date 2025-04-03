import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { getDbPath } from '$lib/dbState';


export const POST: RequestHandler = async ({ request }) => {
    const dbPath = getDbPath();
  if (!dbPath) {
    return new Response('No database uploaded', { status: 400 });
  }

  const { action, table, data, id } = await request.json();
  const db = new Database(dbPath);

  try {
    if (action === 'create') {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`).run(...values);
    } else if (action === 'update') {
      const setClause = Object.keys(data).map((key) => `${key} = ?`).join(', ');
      const values = Object.values(data);
      db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, id);
    } else if (action === 'delete') {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    } else {
      return new Response('Invalid action', { status: 400 });
    }

    return new Response('Success', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
};