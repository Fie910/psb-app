//src/app/api/admin/exam-ranking/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const { searchParams } = new URL(request.url);
        const majorFilter = (searchParams.get('major') || '').trim();
        const pathFilter = (searchParams.get('path') || '').trim(); // 'Prestasi' | 'Reguler' | ''
        const statusFilter = (searchParams.get('status') || '').trim(); // 'Diterima' | 'Ditolak' | 'Belum Ditetapkan' | ''

        const rows = await sql`
            SELECT a.id, a.registration_number, a.full_name, a.nisn, a.registration_path,
                   a.asal_sekolah, a.school_choice, a.school_choice_2, a.accepted_major, a.status,
                   a.document_notes, a.interview_recommendation, a.interview_notes,
                   tpa.raw_score AS tpa_raw, tpa.completed_at AS tpa_completed_at,
                   waw.raw_score AS wawancara_raw, waw.interpretation AS wawancara_interpretation,
                   waw.completed_at AS wawancara_completed_at,
                   (SELECT COUNT(*)::int FROM interview_scores WHERE applicant_id = a.id) AS wawancara_question_count
            FROM applicants a
            LEFT JOIN LATERAL (
                SELECT raw_score, completed_at FROM exam_results
                WHERE applicant_id = a.id AND category = 'TPA' AND status = 'Selesai'
                ORDER BY completed_at DESC LIMIT 1
            ) tpa ON TRUE
            LEFT JOIN LATERAL (
                SELECT raw_score, interpretation, completed_at FROM exam_results
                WHERE applicant_id = a.id AND category = 'WAWANCARA' AND status = 'Selesai'
                ORDER BY completed_at DESC LIMIT 1
            ) waw ON TRUE
            WHERE a.status IN ('Siap Tes dan/atau Wawancara', 'Siap Tes', 'Diterima', 'Ditolak')
            ORDER BY a.registration_number ASC
        `;

        const mapped = rows.map((r: any) => {
            const tpa = r.tpa_raw as { literasi?: { skor?: number }; numerasi?: { skor?: number } } | null;
            const waw = r.wawancara_raw as { total_skor?: number; max_skor?: number } | null;

            const tpaLit = typeof tpa?.literasi?.skor === 'number' ? tpa.literasi.skor : null;
            const tpaNum = typeof tpa?.numerasi?.skor === 'number' ? tpa.numerasi.skor : null;
            const tpaTotal = tpaLit !== null && tpaNum !== null ? tpaLit + tpaNum : null;
            const tpaPercent = tpaTotal !== null ? Math.round((tpaTotal / 50) * 100) : null;

            const wawTotal = typeof waw?.total_skor === 'number' ? waw.total_skor : null;
            const wawMax = typeof waw?.max_skor === 'number' ? waw.max_skor : null;
            const wawPercent =
                wawTotal !== null && wawMax !== null && wawMax > 0
                    ? Math.round((wawTotal / wawMax) * 100)
                    : null;

            let combinedPercent: number | null = null;
            if (tpaPercent !== null && wawPercent !== null) {
                combinedPercent = Math.round(tpaPercent * 0.6 + wawPercent * 0.4);
            } else if (tpaPercent !== null) {
                combinedPercent = tpaPercent;
            } else if (wawPercent !== null) {
                combinedPercent = wawPercent;
            }

            // Catatan / Rekomendasi Pewawancara
            const interviewRecommendation = r.interview_recommendation ? String(r.interview_recommendation).trim() : null;
            const interviewNotesText = r.interview_notes ? String(r.interview_notes).trim() : null;
            const combinedNotes = [
                interviewRecommendation ? `[${interviewRecommendation}]` : null,
                interviewNotesText
            ].filter(Boolean).join(' ') || (r.wawancara_interpretation ? String(r.wawancara_interpretation).trim() : null);

            return {
                id: r.id as number,
                registration_number: (r.registration_number as string) || '',
                full_name: (r.full_name as string) || '',
                nisn: (r.nisn as string) || '',
                registration_path: (r.registration_path as string) || 'Reguler',
                asal_sekolah: r.asal_sekolah as string | null,
                school_choice: (r.school_choice as string) || '',
                school_choice_2: r.school_choice_2 as string | null,
                accepted_major: r.accepted_major as string | null,
                status: r.status as string,
                document_notes: r.document_notes as string | null,
                interview_recommendation: interviewRecommendation,
                interview_notes: combinedNotes,
                tpa_literasi: tpaLit,
                tpa_numerasi: tpaNum,
                tpa_total: tpaTotal,
                tpa_percent: tpaPercent,
                wawancara_total: wawTotal,
                wawancara_max: wawMax,
                wawancara_percent: wawPercent,
                wawancara_question_count: (r.wawancara_question_count as number) || 0,
                combined_percent: combinedPercent,
                has_tpa: tpaPercent !== null,
                has_wawancara: wawPercent !== null,
            };
        });

        // Filter by major if requested
        let filtered = majorFilter && majorFilter !== 'ALL'
            ? mapped.filter(
                  (m) =>
                      m.school_choice === majorFilter ||
                      m.school_choice_2 === majorFilter ||
                      m.accepted_major === majorFilter
              )
            : mapped;

        // Filter by registration path if requested
        if (pathFilter && pathFilter !== 'ALL') {
            filtered = filtered.filter((m) => m.registration_path === pathFilter);
        }

        // Filter by graduation status if requested
        if (statusFilter && statusFilter !== 'ALL') {
            if (statusFilter === 'Belum Ditetapkan') {
                filtered = filtered.filter((m) => m.status !== 'Diterima' && m.status !== 'Ditolak');
            } else {
                filtered = filtered.filter((m) => m.status === statusFilter);
            }
        }

        // Sort descending by combined_percent (nulls last), then fallback to registration_number / id
        filtered.sort((a, b) => {
            const scoreA = a.combined_percent ?? -1;
            const scoreB = b.combined_percent ?? -1;
            if (scoreB !== scoreA) return scoreB - scoreA;
            const regA = a.registration_number || String(a.id);
            const regB = b.registration_number || String(b.id);
            return regA.localeCompare(regB);
        });

        const withRank = filtered.map((row, idx) => ({
            rank: idx + 1,
            ...row,
        }));

        return NextResponse.json({
            ranking: withRank,
            total: withRank.length,
            stats: {
                total_candidates: mapped.length,
                completed_tpa: mapped.filter((m) => m.has_tpa).length,
                completed_wawancara: mapped.filter((m) => m.has_wawancara).length,
                completed_both: mapped.filter((m) => m.has_tpa && m.has_wawancara).length,
                accepted_count: mapped.filter((m) => m.status === 'Diterima').length,
                rejected_count: mapped.filter((m) => m.status === 'Ditolak').length,
                pending_decision_count: mapped.filter((m) => m.status !== 'Diterima' && m.status !== 'Ditolak').length,
            },
        });
    } catch (err: any) {
        console.error('Error fetching exam ranking:', err);
        return NextResponse.json(
            { error: err?.message || 'Gagal memuat rekap peringkat ujian' },
            { status: 500 }
        );
    }
}
