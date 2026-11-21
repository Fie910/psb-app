import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
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
        return NextResponse.json({ error: 'Gagal mengambil rubrik' }, { status: 500 });
    }
}