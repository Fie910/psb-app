// src/app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { getDb, withDbRetry } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';
import { ensureReferralSchema } from '@/lib/referral-schema';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sql = getDb();
        await withDbRetry(async () => {
            await ensureReRegistrationSchema(sql);
            await ensureReferralSchema(sql);
        });

        const result = await withDbRetry(() => sql`
            SELECT * FROM site_settings ORDER BY id ASC LIMIT 1
        `);

        return NextResponse.json({ settings: result[0] || null });
    } catch (error) {
        console.error('Error fetch settings:', error);
        return NextResponse.json({ error: 'Gagal mengambil pengaturan' }, { status: 500 });
    }
}