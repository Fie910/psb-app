import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { applicant_id, category, type, timestamp } = await request.json();

        if (!applicant_id || !category || !type) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        // Ambil data pelanggaran sebelumnya
        const result = await sql`
      SELECT violations FROM exam_results 
      WHERE applicant_id = ${applicant_id} AND category = ${category}
    `;

        if (result.length === 0) {
            return NextResponse.json({ error: 'Sesi ujian tidak ditemukan' }, { status: 404 });
        }

        const currentViolations = typeof result[0].violations === 'string'
            ? JSON.parse(result[0].violations)
            : result[0].violations || [];

        // Tambahkan pelanggaran baru
        const newViolation = { type, timestamp: timestamp || new Date().toISOString() };
        const updatedViolations = [...currentViolations, newViolation];

        // Simpan kembali ke database
        await sql`
      UPDATE exam_results 
      SET violations = ${JSON.stringify(updatedViolations)}::jsonb 
      WHERE applicant_id = ${applicant_id} AND category = ${category}
    `;

        return NextResponse.json({ message: 'Pelanggaran dicatat' }, { status: 200 });
    } catch (error) {
        console.error('Error log violation:', error);
        return NextResponse.json({ error: 'Gagal mencatat pelanggaran' }, { status: 500 });
    }
}