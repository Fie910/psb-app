//src/app/api/wawancara/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { nisn, tanggal_lahir } = await request.json();

        // PERBAIKAN: Gunakan TO_CHAR agar tanggal & jam menjadi string
        const result = await sql`
      SELECT 
        id, registration_number, full_name, 
        TO_CHAR(interview_date, 'YYYY-MM-DD') as interview_date_str, 
        TO_CHAR(interview_time, 'HH24:MI') as interview_time_str
      FROM applicants 
      WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}
      LIMIT 1
    `;

        if (result.length === 0) {
            return NextResponse.json({ error: 'Data NISN atau Tanggal Lahir tidak ditemukan.' }, { status: 404 });
        }

        const app = result[0];

        if (!app.interview_date_str || !app.interview_time_str) {
            return NextResponse.json({ error: 'Anda belum memiliki jadwal wawancara.' }, { status: 403 });
        }

        // Validasi waktu (Time-Zone Safe)
        const datePart = app.interview_date_str;
        const timePart = app.interview_time_str;
        const targetTime = new Date(`${datePart}T${timePart}:00+07:00`);
        const now = new Date();

        if (now < targetTime) {
            return NextResponse.json({ error: `Wawancara belum dimulai. Silakan kembali pada ${datePart} pukul ${timePart} WIB.` }, { status: 403 });
        }

        return NextResponse.json({
            applicant: {
                full_name: app.full_name,
                registration_number: app.registration_number
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error verifikasi wawancara:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}