import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { setDbPath, getDbPath } from '$lib/dbState';

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('dbFile') as File;
  
    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }
  
    const uploadDir = './uploads';
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir);
    }
  
    const buffer = Buffer.from(await file.arrayBuffer());
    const dbPath = `${uploadDir}/${file.name}`;
    writeFileSync(dbPath, buffer);
  
    // Set the dbPath in the shared state
    setDbPath(dbPath);
  
    const db = new Database(dbPath);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
  
    return new Response(JSON.stringify({ tables }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
  
  export const GET: RequestHandler = async ({ url }) => {
    const dbPath = getDbPath();
    if (!dbPath) {
      return new Response('No database uploaded yet', { status: 400 });
    }
  
    const tableName = url.searchParams.get('table');
    if (!tableName) {
      return new Response('Table name required', { status: 400 });
    }
  
    const db = new Database(dbPath);
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    const columns = db.pragma(`table_info(${tableName})`);
  
    return new Response(JSON.stringify({ columns, rows }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };