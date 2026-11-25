//src/app/api/admin/bulk-action/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { logAdminAudit } from '@/lib/audit-log';

const ALLOWED_STATUSES = [
    'Pending',
    'Perbaikan',
    'Siap Tes dan/atau Wawancara',
    'Diterima',
    'Ditolak',
];

export async function POST(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const body = await request.json();

        const action = String(body.action || '').trim();
        const rawIds = Array.isArray(body.applicant_ids) ? body.applicant_ids : [];
        const applicantIds: number[] = Array.from(
            new Set(
                rawIds
                    .map((id: unknown) => Number(id))
                    .filter((id: number) => Number.isInteger(id) && id > 0)
            )
        );

        if (applicantIds.length === 0) {
            return NextResponse.json(
                { error: 'Pilih minimal 1 peserta terlebih dahulu.' },
                { status: 400 }
            );
        }

        if (applicantIds.length > 250) {
            return NextResponse.json(
                { error: 'Maksimal 250 peserta dalam satu kali tindakan massal.' },
                { status: 400 }
            );
        }

        if (action === 'bulk_schedule') {
            const testDate = String(body.test_date || '').trim() || null;
            const testTime = String(body.test_time || '').trim() || null;
            const testLocation = String(body.test_location || '').trim() || null;
            const interviewDate = String(body.interview_date || '').trim() || null;
            const interviewTime = String(body.interview_time || '').trim() || null;
            const interviewLink = String(body.interview_link || '').trim() || null;
            const setReadyStatus = Boolean(body.set_ready_status);

            if (!testDate && !interviewDate) {
                return NextResponse.json(
                    { error: 'Isi minimal Tanggal Tes Online atau Tanggal Wawancara.' },
                    { status: 400 }
                );
            }

            if (setReadyStatus) {
                await sql`
                UPDATE applicants
                SET
                    test_date = COALESCE(${testDate}::date, test_date),
                    test_time = COALESCE(${testTime}::time, test_time),
                    test_location = COALESCE(${testLocation}, test_location),
                    interview_date = COALESCE(${interviewDate}::date, interview_date),
                    interview_time = COALESCE(${interviewTime}::time, interview_time),
                    interview_link = COALESCE(${interviewLink}, interview_link),
                    status = 'Siap Tes dan/atau Wawancara'
                WHERE id = ANY(${applicantIds}::int[])
            `;
            } else {
                await sql`
                UPDATE applicants
                SET
                    test_date = COALESCE(${testDate}::date, test_date),
                    test_time = COALESCE(${testTime}::time, test_time),
                    test_location = COALESCE(${testLocation}, test_location),
                    interview_date = COALESCE(${interviewDate}::date, interview_date),
                    interview_time = COALESCE(${interviewTime}::time, interview_time),
                    interview_link = COALESCE(${interviewLink}, interview_link)
                WHERE id = ANY(${applicantIds}::int[])
            `;
            }

            // Catat audit log untuk bulk schedule
            await logAdminAudit({
                actor_id: authCheck.user.id,
                actor_name: authCheck.user.name || 'Panitia',
                actor_email: authCheck.user.email,
                actor_role: authCheck.user.role,
                action: 'BULK_ACTION',
                target_type: 'applicant',
                target_id: `${applicantIds.length} applicants`,
                summary: `Menjadwalkan tes/wawancara massal untuk ${applicantIds.length} peserta`,
                metadata: {
                    action_type: 'bulk_schedule',
                    applicant_count: applicantIds.length,
                    applicant_ids: applicantIds,
                    testDate,
                    testTime,
                    testLocation,
                    interviewDate,
                    interviewTime,
                    setReadyStatus,
                },
            });

            return NextResponse.json({
                message: `Jadwal berhasil diterapkan ke ${applicantIds.length} peserta.`,
                updatedCount: applicantIds.length,
            });
        }

        if (action === 'bulk_status') {
            const status = String(body.status || '').trim();
            const majorMode = String(body.major_mode || 'CHOICE_1').trim();
            const customMajor = String(body.custom_major || '').trim();

            if (!ALLOWED_STATUSES.includes(status)) {
                return NextResponse.json(
                    { error: 'Status tujuan tidak valid.' },
                    { status: 400 }
                );
            }

            if (status === 'Diterima') {
                if (majorMode === 'CUSTOM') {
                    if (!customMajor) {
                        return NextResponse.json(
                            { error: 'Pilih jurusan kelulusan terlebih dahulu.' },
                            { status: 400 }
                        );
                    }
                    await sql`
                    UPDATE applicants
                    SET
                        status = 'Diterima',
                        accepted_major = ${customMajor},
                        accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP)
                    WHERE id = ANY(${applicantIds}::int[])
                `;
                } else if (majorMode === 'CHOICE_2') {
                    await sql`
                    UPDATE applicants
                    SET
                        status = 'Diterima',
                        accepted_major = COALESCE(NULLIF(school_choice_2, ''), NULLIF(school_choice, ''), accepted_major),
                        accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP)
                    WHERE id = ANY(${applicantIds}::int[])
                `;
                } else {
                    await sql`
                    UPDATE applicants
                    SET
                        status = 'Diterima',
                        accepted_major = COALESCE(NULLIF(school_choice, ''), accepted_major),
                        accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP)
                    WHERE id = ANY(${applicantIds}::int[])
                `;
                }
            } else {
                const notes = body.notes !== undefined ? String(body.notes).trim() : null;
                if (notes !== null && status === 'Perbaikan') {
                    await sql`
                    UPDATE applicants
                    SET
                        status = ${status},
                        document_notes = COALESCE(NULLIF(${notes}, ''), document_notes)
                    WHERE id = ANY(${applicantIds}::int[])
                `;
                } else {
                    await sql`
                    UPDATE applicants
                    SET status = ${status}
                    WHERE id = ANY(${applicantIds}::int[])
                `;
                }
            }

            // Catat audit log untuk bulk status
            await logAdminAudit({
                actor_id: authCheck.user.id,
                actor_name: authCheck.user.name || 'Panitia',
                actor_email: authCheck.user.email,
                actor_role: authCheck.user.role,
                action: 'BULK_ACTION',
                target_type: 'applicant',
                target_id: `${applicantIds.length} applicants`,
                summary: `Mengubah status massal untuk ${applicantIds.length} peserta menjadi '${status}'`,
                metadata: {
                    action_type: 'bulk_status',
                    new_status: status,
                    major_mode: majorMode,
                    custom_major: customMajor,
                    applicant_count: applicantIds.length,
                    applicant_ids: applicantIds,
                },
            });

            return NextResponse.json({
                message: `Status ${applicantIds.length} peserta berhasil diubah menjadi "${status}".`,
                updatedCount: applicantIds.length,
            });
        }

        return NextResponse.json(
            { error: 'Jenis aksi massal tidak dikenali.' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error bulk action admin:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat memproses tindakan massal.' },
            { status: 500 }
        );
    }


}