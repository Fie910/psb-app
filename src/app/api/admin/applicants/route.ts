import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const applicants = await sql`
      SELECT 
        id, registration_number, full_name, email, phone, 
        asal_sekolah, father_name, mother_name, parent_phone, 
        school_choice, school_choice_2, registration_path,
        document_kk, document_akta, document_prestasi, document_notes, revision_fields, 
        status, created_at, nisn, tanggal_lahir,
        TO_CHAR(test_date, 'YYYY-MM-DD') as test_date, 
        TO_CHAR(test_time, 'HH24:MI') as test_time, 
        test_location,
        TO_CHAR(interview_date, 'YYYY-MM-DD') as interview_date,
        TO_CHAR(interview_time, 'HH24:MI') as interview_time,
        interview_link,
        accepted_major, accepted_at
      FROM applicants 
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ applicants });
  } catch (error) {
    console.error('Error fetch applicants:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}