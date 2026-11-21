import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET: Mengambil skor yang sudah ada
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicant_id');
    if (!applicantId) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    try {
        const sql = getDb();
        const scores = await sql`SELECT rubric_id, score FROM interview_scores WHERE applicant_id = ${applicantId}`;
        return NextResponse.json({ scores });
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}

// POST: Menyimpan skor baru
export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const body = await request.json();
        const applicant_id = body.applicant_id;

        // PERBAIKAN: Pastikan scores dibaca sebagai objek dengan nilai number
        const scores = body.scores as Record<string, number>;

        if (!applicant_id || !scores) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        // Hapus skor lama untuk siswa ini (jika panitia mengedit ulang)
        await sql`DELETE FROM interview_scores WHERE applicant_id = ${applicant_id}`;

        // Hapus hasil WAWANCARA lama di exam_results agar tidak duplikat saat dicetak
        await sql`DELETE FROM exam_results WHERE applicant_id = ${applicant_id} AND category = 'WAWANCARA'`;

        // Masukkan skor baru
        for (const [rubric_id, score] of Object.entries(scores)) {
            await sql`
            INSERT INTO interview_scores (applicant_id, rubric_id, score)
            VALUES (${applicant_id}, ${parseInt(rubric_id)}, ${score})
        `;
        }

        // PERBAIKAN: Hitung total skor menggunakan loop biasa agar TypeScript tidak kebingungan
        let totalScore = 0;
        for (const score of Object.values(scores)) {
            totalScore += Number(score);
        }

        // Simpan hasil wawancara ke exam_results agar masuk di laporan PDF
        if (totalScore > 0) {
            const maxScore = Object.keys(scores).length * 4; // Total skor maksimal (12 pertanyaan x 4)

            await sql`
            INSERT INTO exam_results (applicant_id, category, status, raw_score, interpretation, completed_at)
            VALUES (
                ${applicant_id}, 
                'WAWANCARA', 
                'Selesai', 
                ${JSON.stringify({ total_skor: totalScore, max_skor: maxScore })}::jsonb, 
                ${'Wawancara selesai dengan total skor: ' + totalScore + ' / ' + maxScore},
                CURRENT_TIMESTAMP
            )
        `;
        }

        return NextResponse.json({ message: 'Skor berhasil disimpan' });
    } catch (error) {
        console.error('Error simpan wawancara:', error);
        return NextResponse.json({ error: 'Gagal menyimpan skor wawancara' }, { status: 500 });
    }
}