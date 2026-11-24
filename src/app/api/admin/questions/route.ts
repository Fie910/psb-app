//src/app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const category = searchParams.get('category');
        const dimension = searchParams.get('dimension');

        // Mode 1: Summary jumlah butir soal per kategori
        if (!category || mode === 'summary') {
            const summaryRows = await sql`
                SELECT 
                    category,
                    dimension,
                    COUNT(*)::int AS count
                FROM exam_questions
                GROUP BY category, dimension
            `;

            let tpaLiterasi = 0;
            let tpaNumerasi = 0;
            let tpaTotal = 0;
            let diagnostik = 0;
            let sosialEmosional = 0;
            let character = 0;
            let bigFive = 0;
            let wawancara = 0;

            summaryRows.forEach((r: any) => {
                const cat = (r.category || '').toUpperCase();
                const dim = (r.dimension || '').toUpperCase();
                const count = Number(r.count) || 0;

                if (cat === 'TPA') {
                    tpaTotal += count;
                    if (dim.includes('LITERASI')) {
                        tpaLiterasi += count;
                    } else if (dim.includes('NUMERASI')) {
                        tpaNumerasi += count;
                    }
                } else if (cat === 'DIAGNOSTIK') {
                    diagnostik += count;
                } else if (cat === 'SOSIAL_EMOSIONAL') {
                    sosialEmosional += count;
                } else if (cat === 'CHARACTER') {
                    character += count;
                } else if (cat === 'BIG_FIVE') {
                    bigFive += count;
                } else if (cat === 'WAWANCARA') {
                    wawancara += count;
                }
            });

            return NextResponse.json({
                summary: {
                    TPA_LITERASI: tpaLiterasi,
                    TPA_NUMERASI: tpaNumerasi,
                    TPA_TOTAL: tpaTotal,
                    DIAGNOSTIK: diagnostik,
                    SOSIAL_EMOSIONAL: sosialEmosional,
                    CHARACTER: character,
                    BIG_FIVE: bigFive,
                    WAWANCARA: wawancara,
                },
                total_all: tpaTotal + diagnostik + sosialEmosional + character + bigFive + wawancara,
            });
        }

        // Mode 2: Daftar detail butir soal berdasarkan category (dan opsional dimension)
        let questions;
        if (dimension && dimension !== 'ALL') {
            questions = await sql`
                SELECT id, question_code, category, dimension, type, question_text, options, correct_answer, is_favorable, difficulty
                FROM exam_questions
                WHERE category = ${category} AND UPPER(dimension) = UPPER(${dimension})
                ORDER BY id ASC
            `;
        } else {
            questions = await sql`
                SELECT id, question_code, category, dimension, type, question_text, options, correct_answer, is_favorable, difficulty
                FROM exam_questions
                WHERE category = ${category}
                ORDER BY id ASC
            `;
        }

        return NextResponse.json({
            category,
            count: questions.length,
            questions,
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Gagal memuat bank soal' }, { status: 500 });
    }
}
