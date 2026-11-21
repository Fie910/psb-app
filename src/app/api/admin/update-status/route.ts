//src/app/api/admin/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const { id, status, notes, revision_fields, accepted_major } = await request.json();

        if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

        if (status !== undefined) {
            if (status === 'Diterima') {
                await sql`UPDATE applicants SET status = ${status}, accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP) WHERE id = ${id}`;
            } else {
                await sql`UPDATE applicants SET status = ${status} WHERE id = ${id}`;
            }
        }

        if (notes !== undefined) await sql`UPDATE applicants SET document_notes = ${notes} WHERE id = ${id}`;
        if (revision_fields !== undefined) await sql`UPDATE applicants SET revision_fields = ${JSON.stringify(revision_fields)}::jsonb WHERE id = ${id}`;
        if (accepted_major !== undefined) await sql`UPDATE applicants SET accepted_major = ${accepted_major || null} WHERE id = ${id}`;

        return NextResponse.json({ message: 'Data diperbarui' }, { status: 200 });
    } catch (error) {
        console.error('Error update status:', error);
        return NextResponse.json({ error: 'Gagal memperbarui data' }, { status: 500 });
    }
}