import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const sql = getDb();
    const { id, test_date, test_time, test_location, interview_date, interview_time, interview_link } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    await sql`
      UPDATE applicants 
      SET 
        test_date = ${test_date || null},
        test_time = ${test_time || null},
        test_location = ${test_location || null},
        interview_date = ${interview_date || null},
        interview_time = ${interview_time || null},
        interview_link = ${interview_link || null}
      WHERE id = ${id}
    `;

    return NextResponse.json({ message: 'Jadwal disimpan' });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menyimpan jadwal' }, { status: 500 });
  }
}