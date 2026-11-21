//src/app/api/exam/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    const { applicant_id, question_id, answer_value } = await request.json();

    // Cek jawaban sebelumnya
    const existing = await sql`
      SELECT id FROM exam_answers WHERE applicant_id = ${applicant_id} AND question_id = ${question_id}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE exam_answers SET answer_value = ${answer_value}, answered_at = CURRENT_TIMESTAMP 
        WHERE applicant_id = ${applicant_id} AND question_id = ${question_id}
      `;
    } else {
      await sql`
        INSERT INTO exam_answers (applicant_id, question_id, answer_value) 
        VALUES (${applicant_id}, ${question_id}, ${answer_value})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal simpan' }, { status: 500 });
  }
}