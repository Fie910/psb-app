import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const applicantId = parseInt(id);

        if (isNaN(applicantId)) {
            return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
        }

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
            WHERE id = ${applicantId}
            LIMIT 1
        `;

        if (applicants.length === 0) {
            return NextResponse.json({ error: 'Data peserta tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ applicant: applicants[0] });
    } catch (error) {
        console.error('Error fetch applicant detail:', error);
        return NextResponse.json({ error: 'Gagal mengambil data peserta' }, { status: 500 });
    }
}

