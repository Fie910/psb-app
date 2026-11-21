//src/app/api/cek-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { nisn, tanggal_lahir } = await request.json();

        if (!nisn || !tanggal_lahir) {
            return NextResponse.json({ error: 'NISN dan Tanggal Lahir wajib diisi' }, { status: 400 });
        }

        // PASTIKAN interview_date, interview_time, dan interview_link IKUT DI-SELECT
        const result = await sql`
      SELECT 
        id, registration_number, full_name, email, phone, 
        asal_sekolah, father_name, mother_name, parent_phone,
        school_choice, status, document_kk, document_akta, document_prestasi,
        document_notes, revision_fields, tanggal_lahir, nisn, registration_path,
        TO_CHAR(test_date, 'YYYY-MM-DD') as test_date, 
        TO_CHAR(test_time, 'HH24:MI') as test_time, 
        test_location,
        TO_CHAR(interview_date, 'YYYY-MM-DD') as interview_date, 
        TO_CHAR(interview_time, 'HH24:MI') as interview_time, 
        interview_link,
        accepted_major, accepted_at
      FROM applicants 
      WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}
      LIMIT 1
    `;

        if (result.length === 0) {
            return NextResponse.json({ error: 'Data tidak ditemukan. Periksa kembali NISN dan Tanggal Lahir Anda.' }, { status: 404 });
        }

        return NextResponse.json({ applicant: result[0] }, { status: 200 });
    } catch (error) {
        console.error('Error cek status:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}