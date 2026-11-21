//src/app/api/admin/snapshots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const { searchParams } = new URL(request.url);
        const applicantId = searchParams.get('applicant_id');

        if (!applicantId) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

        const snapshots = await sql`
            SELECT image_url, category, created_at FROM exam_snapshots 
            WHERE applicant_id = ${applicantId} ORDER BY created_at ASC
        `;
        return NextResponse.json({ snapshots });
    } catch (error) {
        console.error('Error fetch snapshots:', error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}