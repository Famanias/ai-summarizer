// src/routes/api/load-default-db/+server.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync } from 'fs';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
    const defaultDbPath = join(process.cwd(), 'static', 'default.db');
    
    if (!existsSync(defaultDbPath)) {
        return new Response(JSON.stringify({ success: false }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Use /tmp for Vercel
        const uploadDir = process.env.VERCEL ? '/tmp/uploads' : './uploads';
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }
        const dbPath = join(uploadDir, 'current.db');
        const dbFile = readFileSync(defaultDbPath);
        writeFileSync(dbPath, dbFile);
        cookies.set('dbPath', dbPath, { path: '/', maxAge: 10 * 60 });

        // Set the dbPath in a cookie (same as upload endpoint)
        cookies.set('dbPath', dbPath, { path: '/', maxAge: 10 * 60 });

        // Open the database and fetch tables (same as upload endpoint)
        const db = new Database(dbPath, { readonly: false });
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
            error: error instanceof Error ? error.message : 'Failed to load default database'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};