import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import {env} from '$env/dynamic/private';
import { existsSync } from 'fs';


export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  const dbPath = cookies.get('dbPath');
  if (!dbPath) {
    return new Response('No database uploaded', { status: 400 });
  }

  if (!existsSync(dbPath)) {
    return new Response('Database file not found. Please re-upload the database.', { status: 404 });
  }

  const { table } = await request.json();
  const db = new Database(dbPath);
  const rows = db.prepare(`SELECT * FROM ${table} LIMIT 10`).all();

  // OpenRouter.ai integration
  const apiKey = env.MISTRAL_API_KEY; // Use SvelteKit's env
  if (!apiKey) {
    return new Response('API_KEY is not set', { status: 500 });
  }

  const prompt = `Summarize this data: ${JSON.stringify(rows)}`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    return new Response('Failed to fetch summary', { status: 500 });
  }

  const data = await response.json();
  const summary = data.choices[0].message.content;

  return new Response(JSON.stringify({ summary }), {
    headers: { 'Content-Type': 'application/json' }
  });
};