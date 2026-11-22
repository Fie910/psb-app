//src/app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

export async function GET() {
    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const result = await sql`SELECT * FROM site_settings WHERE id = 1`;
        return NextResponse.json({ settings: result[0] || null });
    } catch (error) {
        console.error('Error fetch settings:', error);
        return NextResponse.json({ error: 'Gagal mengambil pengaturan' }, { status: 500 });
    }
}