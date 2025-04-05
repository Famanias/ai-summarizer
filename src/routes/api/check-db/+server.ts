import type { RequestHandler } from '@sveltejs/kit';
import { existsSync } from 'fs';

export const GET: RequestHandler = async ({ cookies }) => {
  const dbPath = cookies.get('dbPath');
  if (!dbPath || !existsSync(dbPath)) {
    return new Response(JSON.stringify({ hasDb: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ hasDb: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};