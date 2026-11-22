//src/app/api/cek-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const { nisn, tanggal_lahir } = await request.json();

        if (!nisn || !tanggal_lahir) {
            return NextResponse.json({ error: 'NISN dan Tanggal Lahir wajib diisi' }, { status: 400 });
        }

        const result = await sql`
            SELECT 
                a.id, a.registration_number, a.full_name, a.email, a.phone, 
                a.asal_sekolah, a.father_name, a.mother_name, a.parent_phone,
                a.school_choice, a.status, a.document_kk, a.document_akta, a.document_prestasi,
                a.document_notes, a.revision_fields,
                TO_CHAR(a.tanggal_lahir, 'YYYY-MM-DD') as tanggal_lahir,
                a.nisn, a.registration_path,
                TO_CHAR(a.test_date, 'YYYY-MM-DD') as test_date, 
                TO_CHAR(a.test_time, 'HH24:MI') as test_time, 
                a.test_location,
                TO_CHAR(a.interview_date, 'YYYY-MM-DD') as interview_date, 
                TO_CHAR(a.interview_time, 'HH24:MI') as interview_time, 
                a.interview_link,
                a.accepted_major, a.accepted_at,
                r.rereg_status,
                r.rereg_notes,
                r.payment_scheme as rereg_payment_scheme,
                r.uniform_size as rereg_uniform_size
            FROM applicants a
            LEFT JOIN re_registrations r ON r.applicant_id = a.id
            WHERE a.nisn = ${nisn} AND a.tanggal_lahir = ${tanggal_lahir}
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