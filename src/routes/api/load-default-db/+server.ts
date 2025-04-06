// src/routes/api/load-default-db/+server.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
    // Path handling for different environments
    const staticDir = process.env.VERCEL ? join(process.cwd(), 'static') : 'static';
    const defaultDbPath = join(staticDir, 'default.db');

    console.log('Default DB Path:', defaultDbPath);

    try {
        // In Vercel, we can only write to /tmp
        const dbPath = process.env.VERCEL ? '/tmp/current.db' : './uploads/current.db';
        console.log('Destination DB Path:', dbPath);
        
        // Read and copy the database file
        const dbFile = readFileSync(defaultDbPath);
        writeFileSync(dbPath, dbFile);
        console.log('Database file copied successfully');

        // Set cookie
        cookies.set('dbPath', dbPath, {
            path: '/',
            maxAge: 10 * 60,
            secure: process.env.NODE_ENV === 'production'
        });

        // Open database (readonly in production)
        const db = new Database(dbPath, { readonly: true });
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all();
        db.close();

        return new Response(JSON.stringify({ success: true, tables }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Database load failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};