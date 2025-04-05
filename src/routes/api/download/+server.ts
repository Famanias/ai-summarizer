import type { RequestHandler } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'fs';

export const GET: RequestHandler = async ({ cookies }) => {
  const dbPath = cookies.get('dbPath');
  if (!dbPath) {
    return new Response('No database uploaded', { status: 400 });
  }

  if (!existsSync(dbPath)) {
    return new Response('Database file not found. Please re-upload the database.', { status: 404 });
  }

  const fileBuffer = readFileSync(dbPath);
  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="updated_database.db"'
    }
  });
};