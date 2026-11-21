//src/app/api/admin/results/route.ts
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

        const results = await sql`
            SELECT category, raw_score, interpretation, completed_at, violations
            FROM exam_results
            WHERE applicant_id = ${applicantId} AND status = 'Selesai'
            ORDER BY completed_at ASC
        `;

        if (results.length === 0) {
            return NextResponse.json({ error: 'Belum ada hasil tes yang diselesaikan.' }, { status: 404 });
        }

        return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
        console.error('Error fetch results:', error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}