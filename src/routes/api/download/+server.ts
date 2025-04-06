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

  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 10).replace(/-/g, '-');
  const formattedTime = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const filename = `database_${formattedDate}_${formattedTime}.db`;

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="${filename}"'
    }
  });
};