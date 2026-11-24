//src/app/api/admin/applicants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const { id } = await context.params;
        const applicantId = parseInt(id);

        if (isNaN(applicantId)) {
            return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
        }

        const sql = getDb();

        // Pastikan kolom interview_recommendation dan interview_notes ada secara idempoten
        try {
            await sql`
                ALTER TABLE applicants 
                ADD COLUMN IF NOT EXISTS interview_recommendation VARCHAR(100),
                ADD COLUMN IF NOT EXISTS interview_notes TEXT
            `;
        } catch (e) {
            // Abaikan jika alter gagal sementara (misal permission)
        }

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
                accepted_major, accepted_at,
                interview_recommendation, interview_notes
            FROM applicants 
            WHERE id = ${applicantId}
            LIMIT 1
        `;

        if (applicants.length === 0) {
            return NextResponse.json({ error: 'Data peserta tidak ditemukan' }, { status: 404 });
        }

        // Ambil hasil ujian CBT (TPA & Diagnostik / kategori lain)
        const examResults = await sql`
            SELECT category, raw_score, interpretation, completed_at, status
            FROM exam_results
            WHERE applicant_id = ${applicantId} AND status = 'Selesai'
            ORDER BY completed_at ASC
        `;

        return NextResponse.json({ 
            applicant: applicants[0],
            exam_results: examResults
        });
    } catch (error) {
        console.error('Error fetch applicant detail:', error);
        return NextResponse.json({ error: 'Gagal mengambil data peserta' }, { status: 500 });
    }
}
