import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import {env} from '$env/dynamic/private';
import { getDbPath } from '$lib/dbState';


export const POST: RequestHandler = async ({ request, platform }) => {
    const dbPath = getDbPath();
    if (!dbPath) {
        return new Response('No database uploaded', { status: 400 });
    }

  const { table } = await request.json();
  const db = new Database(dbPath);
  const rows = db.prepare(`SELECT * FROM ${table}`).all();

  // OpenRouter.ai integration
  const apiKey = env.OPENROUTER_API_KEY; // Use SvelteKit's env
  if (!apiKey) {
    return new Response('OPENROUTER_API_KEY is not set', { status: 500 });
  }

  const prompt = `Summarize this data: ${JSON.stringify(rows)}`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-r1',
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