//src/app/api/admin/interview-scores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth, requireAdminRole } from '@/lib/auth/server';
import { logAdminAudit } from '@/lib/audit-log';

/**
 * Pastikan tabel interview_scores dan kolom-kolom yang diperlukan tersedia secara idempoten
 */
async function ensureInterviewScoresSchema(sql: any) {
    await sql`
        CREATE TABLE IF NOT EXISTS interview_scores (
            id SERIAL PRIMARY KEY,
            applicant_id INT NOT NULL,
            rubric_id INT,
            score INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Pastikan jika tabel sudah ada dari versi lama, kolom rubric_id dan score tersedia
    await sql`
        ALTER TABLE interview_scores 
        ADD COLUMN IF NOT EXISTS rubric_id INT,
        ADD COLUMN IF NOT EXISTS score INT DEFAULT 0
    `;

    // Pastikan kolom rekomendasi dan catatan ada di tabel applicants
    await sql`
        ALTER TABLE applicants 
        ADD COLUMN IF NOT EXISTS interview_recommendation VARCHAR(100),
        ADD COLUMN IF NOT EXISTS interview_notes TEXT
    `;
}

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicant_id');
    if (!applicantId) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    try {
        const sql = getDb();
        try {
            await ensureInterviewScoresSchema(sql);
        } catch (schemaErr) {
            console.warn('Warning ensuring interview_scores schema:', schemaErr);
        }

        const scores = await sql`SELECT rubric_id, score FROM interview_scores WHERE applicant_id = ${applicantId}`;
        const applicantInfo = await sql`
            SELECT interview_recommendation, interview_notes 
            FROM applicants 
            WHERE id = ${applicantId}
            LIMIT 1
        `;

        return NextResponse.json({ 
            scores,
            interview_recommendation: applicantInfo[0]?.interview_recommendation || '',
            interview_notes: applicantInfo[0]?.interview_notes || ''
        });
    } catch (error) {
        console.error('Error fetch interview scores:', error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'pewawancara']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const body = await request.json();
        const applicant_id = body.applicant_id;
        const scores = body.scores as Record<string, number>;
        const interview_recommendation = body.interview_recommendation !== undefined ? String(body.interview_recommendation).trim() : null;
        const interview_notes = body.interview_notes !== undefined ? String(body.interview_notes).trim() : null;

        if (!applicant_id || !scores) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        try {
            await ensureInterviewScoresSchema(sql);
        } catch (schemaErr) {
            console.warn('Warning ensuring interview_scores schema in POST:', schemaErr);
        }

        // Hapus skor lama
        await sql`DELETE FROM interview_scores WHERE applicant_id = ${applicant_id}`;
        await sql`DELETE FROM exam_results WHERE applicant_id = ${applicant_id} AND category = 'WAWANCARA'`;

        // Simpan skor rubrik
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
                    ${JSON.stringify({ 
                        total_skor: totalScore, 
                        max_skor: maxScore,
                        recommendation: interview_recommendation || undefined
                    })}::jsonb, 
                    ${interview_recommendation 
                        ? `Wawancara: ${interview_recommendation} (Skor: ${totalScore}/${maxScore})` 
                        : `Wawancara selesai dengan total skor: ${totalScore} / ${maxScore}`},
                    CURRENT_TIMESTAMP
                )
            `;
        }

        // Simpan interview_recommendation dan interview_notes ke applicants
        await sql`
            UPDATE applicants
            SET interview_recommendation = ${interview_recommendation || null},
                interview_notes = ${interview_notes || null}
            WHERE id = ${applicant_id}
        `;

        // Catat Audit Log Penilaian Wawancara
        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: authCheck.user.name || 'Pewawancara',
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'SAVE_INTERVIEW_SCORE',
            target_type: 'applicant',
            target_id: applicant_id,
            summary: `Menyimpan penilaian wawancara pendaftar ID #${applicant_id} (Total skor: ${totalScore}, Rekomendasi: ${interview_recommendation || 'Belum ada'})`,
            metadata: {
                applicant_id,
                total_skor: totalScore,
                scores,
                interview_recommendation,
                interview_notes,
            },
        });

        return NextResponse.json({ message: 'Skor dan rekomendasi berhasil disimpan' });
    } catch (error) {
        console.error('Error simpan wawancara:', error);
        return NextResponse.json({ error: 'Gagal menyimpan skor wawancara' }, { status: 500 });
    }
}
