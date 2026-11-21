//src/app/api/exam/fetch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { nisn, tanggal_lahir, category } = await request.json();

        // 1. Validasi Siswa & Tanggal
        const applicant = await sql`
      SELECT id, full_name, TO_CHAR(test_date, 'YYYY-MM-DD') as test_date_str 
      FROM applicants 
      WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir} LIMIT 1
    `;

        if (applicant.length === 0) {
            return NextResponse.json({ error: 'Data NISN atau Tanggal Lahir tidak ditemukan.' }, { status: 404 });
        }

        const app = applicant[0];

        if (!app.test_date_str) {
            return NextResponse.json({ error: 'Anda belum memiliki jadwal tes.' }, { status: 403 });
        }

        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const todayStr = (new Date(today.getTime() - offset)).toISOString().slice(0, 10);

        if (app.test_date_str !== todayStr) {
            return NextResponse.json({ error: `Anda hanya bisa mengerjakan tes pada tanggal ${app.test_date_str}.` }, { status: 403 });
        }

        // 2. Validasi Pengaturan
        const settings = await sql`SELECT active_tests, test_durations FROM site_settings WHERE id = 1`;
        const activeTests = settings[0].active_tests || [];
        const durations = settings[0].test_durations || {};

        if (!activeTests.includes(category)) {
            return NextResponse.json({ error: 'Tes ini tidak diaktifkan oleh panitia.' }, { status: 403 });
        }

        // 3. Cek Sesi Ujian & Hitung Sisa Waktu
        const existingResult = await sql`
      SELECT id, status, question_order, started_at FROM exam_results 
      WHERE applicant_id = ${app.id} AND category = ${category}
    `;

        if (existingResult.length > 0 && existingResult[0].status === 'Selesai') {
            return NextResponse.json({ error: 'Anda sudah menyelesaikan tes ini.' }, { status: 403 });
        }

        let remainingSeconds = (durations[category] || 30) * 60;
        const isNewSession = existingResult.length === 0;

        if (!isNewSession && existingResult[0].started_at) {
            const startTime = new Date(existingResult[0].started_at).getTime();
            const now = new Date().getTime();
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            remainingSeconds = ((durations[category] || 30) * 60) - elapsedSeconds;

            // Jika waktu sudah habis
            if (remainingSeconds <= 0) {
                await sql`UPDATE exam_results SET status = 'Selesai' WHERE id = ${existingResult[0].id}`;
                return NextResponse.json({ error: 'Waktu ujian Anda sudah habis.' }, { status: 403 });
            }
        }

        // 4. Urutan Soal
        let questions = [];
        let questionOrder = existingResult.length > 0 ? existingResult[0].question_order : null;

        if (typeof questionOrder === 'string') {
            try { questionOrder = JSON.parse(questionOrder); } catch (e) { questionOrder = null; }
        }

        if (!questionOrder || !Array.isArray(questionOrder) || questionOrder.length === 0) {
            if (category === 'TPA') {
                const literasi = await sql`SELECT id FROM exam_questions WHERE category = 'TPA' AND dimension = 'Literasi' ORDER BY RANDOM() LIMIT 25`;
                const numerasi = await sql`SELECT id FROM exam_questions WHERE category = 'TPA' AND dimension = 'Numerasi' ORDER BY RANDOM() LIMIT 25`;
                questionOrder = [...literasi.map((l: any) => Number(l.id)), ...numerasi.map((n: any) => Number(n.id))];
            } else {
                const allQ = await sql`SELECT id FROM exam_questions WHERE category = ${category} ORDER BY id ASC`;
                questionOrder = allQ.map((q: any) => Number(q.id));
            }

            // Simpan sesi baru
            if (isNewSession) {
                await sql`
          INSERT INTO exam_results (applicant_id, category, status, question_order, started_at) 
          VALUES (${app.id}, ${category}, 'Sedang Mengerjakan', ${JSON.stringify(questionOrder)}::jsonb, CURRENT_TIMESTAMP)
        `;
            } else {
                await sql`
          UPDATE exam_results SET question_order = ${JSON.stringify(questionOrder)}::jsonb WHERE id = ${existingResult[0].id}
        `;
            }
        }

        if (!questionOrder || questionOrder.length === 0) {
            return NextResponse.json({ error: 'Bank soal untuk tes ini masih kosong.' }, { status: 404 });
        }

        // 5. Ambil Soal & Jawaban Sebelumnya
        const rawQuestions = await sql`
      SELECT * FROM exam_questions WHERE id = ANY(${questionOrder}::int[])
    `;

        questions = questionOrder.map((id: number) =>
            rawQuestions.find((q: any) => Number(q.id) === Number(id))
        ).filter(Boolean);

        const existingAnswers = await sql`
      SELECT question_id, answer_value FROM exam_answers WHERE applicant_id = ${app.id}
    `;

        // 6. Kembalikan Data beserta Sisa Waktu
        return NextResponse.json({
            questions,
            remainingSeconds, // Kirim sisa waktu, bukan durasi total
            existingAnswers,
            applicant_id: app.id,
            full_name: app.full_name
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetch exam:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}