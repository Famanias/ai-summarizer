import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import {env} from '$env/dynamic/private';
import { existsSync } from 'fs';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const dbPath = cookies.get('dbPath');
  if (!dbPath) {
    return new Response('No database uploaded', { status: 400 });
  }

  if (!existsSync(dbPath)) {
    return new Response('Database file not found. Please re-upload the database.', { status: 404 });
  }

  const requestData = await request.json().catch(() => ({}));
  const table = requestData.table || url.searchParams.get('table');
  const idsParam = requestData.ids || url.searchParams.get('ids');

  let ids: (number | string)[] | null = null;

  if (idsParam) {
    ids = (idsParam as string).split(',').map((id: string): number | string => {
      const trimmed: string = id.trim();
      // Try to convert to number, but keep as string if NaN
      const num: number = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    }).filter((id: number | string) => id !== ''); // Filter out empty strings
  }
  
  console.log('Parsed ids:', ids);

  const db = new Database(dbPath);

  try{

    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; pk: number }[];
    const primaryKey = tableInfo.find((col) => col.pk === 1)?.name;
    console.log('Primary key column:', primaryKey);

    console.log('Checking conditions:');
    console.log('ids exists?', !!ids);
    console.log('ids.length > 0?', ids && ids.length > 0);
    console.log('primaryKey exists?', !!primaryKey);
    console.log('primaryKey value:', primaryKey);
    console.log('All conditions true?', ids && ids.length > 0 && primaryKey);
    let rows;
    if(ids  && ids.length > 0 && primaryKey){
      const placeholders = ids.map(() => '?').join(',');
      const sql = `SELECT * FROM ${table} WHERE ${primaryKey} IN (${placeholders})`;

      console.log('Executing query:', sql);
      console.log('With parameters:', ids);

      const stmt = db.prepare(sql);
      rows = stmt.all(...ids);

      console.log('Query returned:', rows.length, 'rows');
      console.log('First row:', rows[0]);
    } else{
      const sql = `SELECT * FROM ${table} LIMIT 100`;
      rows = db.prepare(sql).all();
      console.log('Failed to filter rows:', rows);
    }

    const apiKey = env.MISTRAL_API_KEY; // Use SvelteKit's env
    if (!apiKey) {
      return new Response('API Key is not set', { status: 500 });
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

  } catch (error) {
    console.error('Full error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return new Response('Database error', { status: 500 });
}
};