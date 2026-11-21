import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { category, jsonData } = await request.json();

        if (!category || !jsonData) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

        let questionsToInsert: any[] = [];

        if (category === 'TPA') {
            const literasi = jsonData.tpa_literasi?.soal || [];
            const numerasi = jsonData.tpa_numerasi?.soal || [];
            const bacaan = jsonData.tpa_literasi?.bacaan || {};

            const mapTPA = (soal: any, dimensi: string) => {
                let fullText = soal.pertanyaan;
                if (dimensi === 'Literasi' && soal.bacaan_id && bacaan[soal.bacaan_id]) {
                    fullText = `Bacaan:\n${bacaan[soal.bacaan_id]}\n\nPertanyaan:\n${soal.pertanyaan}`;
                }
                return {
                    category, dimension: dimensi, type: 'MC', question_text: fullText,
                    options: soal.pilihan, correct_answer: soal.kunci, is_favorable: null,
                    difficulty: soal.tingkat_kesulitan || 'sedang', question_code: soal.id
                };
            };
            questionsToInsert = [...literasi.map((s: any) => mapTPA(s, 'Literasi')), ...numerasi.map((s: any) => mapTPA(s, 'Numerasi'))];
        }
        else if (['DIAGNOSTIK', 'SOSIAL_EMOSIONAL', 'CHARACTER', 'BIG_FIVE'].includes(category)) {
            const butir = jsonData.butir || [];
            questionsToInsert = butir.map((b: any) => ({
                category, dimension: b.dimensi, type: 'LIKERT', question_text: b.pernyataan,
                options: jsonData.meta?.skala?.opsi || null, correct_answer: null,
                is_favorable: b.jenis === 'favorable', difficulty: null, question_code: b.id
            }));
        }
        else if (category === 'WAWANCARA') {
            const pertanyaan = jsonData.pertanyaan || [];
            questionsToInsert = pertanyaan.map((p: any) => ({
                category, dimension: p.dimensi, type: 'RUBRIC', question_text: p.pertanyaan_utama,
                options: { probing: p.probing, rubrik: p.rubrik }, correct_answer: null,
                is_favorable: null, difficulty: null, question_code: p.id
            }));
        }

        if (questionsToInsert.length === 0) return NextResponse.json({ error: 'Tidak ada soal ditemukan' }, { status: 400 });

        await sql`DELETE FROM exam_questions WHERE category = ${category}`;

        await Promise.all(questionsToInsert.map(q =>
            sql`
        INSERT INTO exam_questions (
          category, dimension, type, question_text, options, correct_answer, is_favorable, difficulty, question_code
        ) VALUES (
          ${q.category}, ${q.dimension}, ${q.type}, ${q.question_text}, 
          ${q.options ? JSON.stringify(q.options) : null}::jsonb, 
          ${q.correct_answer}, ${q.is_favorable}, ${q.difficulty}, ${q.question_code}
        )
      `
        ));

        return NextResponse.json({ message: 'Berhasil', count: questionsToInsert.length }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Gagal import' }, { status: 500 });
    }
}