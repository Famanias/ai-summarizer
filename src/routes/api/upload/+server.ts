  import type { RequestHandler } from '@sveltejs/kit';
  import Database from 'better-sqlite3';
  import { writeFileSync, existsSync, mkdirSync } from 'fs';
  import { join } from 'path';

  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['.db'];

  export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
      const formData = await request.formData();
      const file = formData.get('dbFile') as File;

      // Validate file presence
      if (!file) {
        return new Response('No file uploaded', { status: 400 });
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return new Response('File size exceeds 20MB limit', { status: 400 });
      }

      // Validate file extension
      const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return new Response('Only .db files are allowed', { status: 400 });
      }

      // Use /tmp for Vercel
      const uploadDir = process.env.VERCEL ? '/tmp/uploads' : './uploads';
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const dbPath = join(uploadDir, 'current.db');

      // Write the file
      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(dbPath, buffer);
      cookies.set('dbPath', dbPath, { path: '/', maxAge: 10 * 60 });
      writeFileSync(dbPath, buffer);

      // Set the dbPath in a cookie
      cookies.set('dbPath', dbPath, { path: '/', maxAge: 10 * 60 }); // Expires in 10 minutes

      // Open the database and fetch tables
      const db = new Database(dbPath, { readonly: false });
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();

      // Close the database connection
      db.close();

      return new Response(JSON.stringify({ tables }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(`Error uploading database: ${errorMessage}`, { status: 500 });
    }
  };

  export const GET: RequestHandler = async ({ url, cookies }) => {
    try {
      const dbPath = cookies.get('dbPath');

      if (!dbPath || !existsSync(dbPath)) {
        return new Response('No database uploaded, please import a database.', { status: 400 });
      }
  
      const db = new Database(dbPath, { readonly: true });
      const tableName = url.searchParams.get('table');
      
      if (!tableName) {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        db.close();
        return new Response(JSON.stringify({ tables }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate tableName to prevent SQL injection
      const validTableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!validTableNameRegex.test(tableName)) {
        return new Response('Invalid table name', { status: 400 });
      }

      const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
      const columns = db.pragma(`table_info(${tableName})`) as Array<{ name: string; pk: number }>;
      const primaryKeyColumn = columns.find((col) => col.pk === 1)?.name || null;
      db.close();

      return new Response(JSON.stringify({ columns, rows, primaryKeyColumn }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(`Error loading table: ${errorMessage}`, { status: 500 });
    }
  };