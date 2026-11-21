import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
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
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}