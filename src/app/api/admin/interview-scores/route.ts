//src/app/api/admin/interview-scores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicant_id');
    if (!applicantId) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    try {
        const sql = getDb();
        const scores = await sql`SELECT rubric_id, score FROM interview_scores WHERE applicant_id = ${applicantId}`;
        return NextResponse.json({ scores });
    } catch (error) {
        console.error('Error fetch interview scores:', error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const body = await request.json();
        const applicant_id = body.applicant_id;
        const scores = body.scores as Record<string, number>;

        if (!applicant_id || !scores) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        await sql`DELETE FROM interview_scores WHERE applicant_id = ${applicant_id}`;
        await sql`DELETE FROM exam_results WHERE applicant_id = ${applicant_id} AND category = 'WAWANCARA'`;

        for (const [rubric_id, score] of Object.entries(scores)) {
            await sql`
                INSERT INTO interview_scores (applicant_id, rubric_id, score)
                VALUES (${applicant_id}, ${parseInt(rubric_id)}, ${score})
            `;
        }

        let totalScore = 0;
        for (const score of Object.values(scores)) {
            totalScore += Number(score);
        }

        if (totalScore > 0) {
            const maxScore = Object.keys(scores).length * 4;

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