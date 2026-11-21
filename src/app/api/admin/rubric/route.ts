//src/app/api/admin/rubric/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function GET() {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const rubric = await sql`
            SELECT id, question_code, dimension, question_text, options 
            FROM exam_questions 
            WHERE category = 'WAWANCARA' 
            ORDER BY id ASC
        `;
        return NextResponse.json({ rubric });
    } catch (error) {
        console.error('Error fetch rubric:', error);
        return NextResponse.json({ error: 'Gagal mengambil rubrik' }, { status: 500 });
    }
}