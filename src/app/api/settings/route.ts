import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const sql = getDb();
        const result = await sql`SELECT * FROM site_settings WHERE id = 1`;
        return NextResponse.json({ settings: result[0] });
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil pengaturan' }, { status: 500 });
    }
}