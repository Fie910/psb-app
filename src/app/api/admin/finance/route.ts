//src/app/api/admin/finance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';
import { logAdminAudit } from '@/lib/audit-log';

/**
 * GET: Ambil ringkasan keuangan dan daftar pembayaran daftar ulang
 */
export async function GET(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'bendahara', 'verifikator']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get('search') || '').trim();
        const scheme = (searchParams.get('scheme') || '').trim();
        const reregStatus = (searchParams.get('rereg_status') || '').trim();

        // 1. Ambil data daftar peserta yang memiliki data daftar ulang
        const payments = await sql`
            SELECT 
                r.id AS rereg_id,
                r.applicant_id,
                a.registration_number,
                a.full_name,
                a.asal_sekolah,
                COALESCE(a.accepted_major, a.school_choice) AS accepted_major,
                a.phone,
                r.payment_scheme,
                r.doc_kuitansi_gosiswa,
                r.rereg_status,
                r.payment_amount,
                r.payment_ref_code,
                r.payment_verified_by,
                r.payment_verified_at,
                r.submitted_at
            FROM re_registrations r
            JOIN applicants a ON a.id = r.applicant_id
            WHERE 1=1
                AND (${search} = '' 
                    OR a.full_name ILIKE ${'%' + search + '%'} 
                    OR a.registration_number ILIKE ${'%' + search + '%'}
                    OR r.payment_ref_code ILIKE ${'%' + search + '%'})
                AND (${scheme} = '' OR r.payment_scheme = ${scheme})
                AND (${reregStatus} = '' OR r.rereg_status = ${reregStatus})
            ORDER BY r.submitted_at DESC
        `;

        // 2. Hitung ringkasan total uang masuk & statistik skema
        const summaryRows = await sql`
            SELECT 
                COALESCE(SUM(COALESCE(r.payment_amount, 0)), 0)::BIGINT AS total_amount,
                COUNT(r.id)::INT AS total_rereg_count,
                COUNT(CASE WHEN r.payment_scheme = 'Lunas' THEN 1 END)::INT AS count_lunas,
                COUNT(CASE WHEN r.payment_scheme = 'Minimal (DP)' THEN 1 END)::INT AS count_dp,
                COUNT(CASE WHEN r.payment_amount > 0 THEN 1 END)::INT AS count_paid
            FROM re_registrations r
        `;
        const summary = summaryRows[0] || {
            total_amount: 0,
            total_rereg_count: 0,
            count_lunas: 0,
            count_dp: 0,
            count_paid: 0,
        };

        // 3. Rincian per Jurusan / Kompetensi Keahlian
        const majorBreakdown = await sql`
            SELECT 
                COALESCE(a.accepted_major, a.school_choice, 'Belum Ditentukan') AS major_name,
                COUNT(r.id)::INT AS count_students,
                COALESCE(SUM(COALESCE(r.payment_amount, 0)), 0)::BIGINT AS total_amount
            FROM re_registrations r
            JOIN applicants a ON a.id = r.applicant_id
            GROUP BY COALESCE(a.accepted_major, a.school_choice, 'Belum Ditentukan')
            ORDER BY total_amount DESC
        `;

        return NextResponse.json({
            payments,
            summary,
            majorBreakdown,
        });
    } catch (error) {
        console.error('Error get finance data:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data keuangan daftar ulang.' },
            { status: 500 }
        );
    }
}

/**
 * PUT: Update nominal pembayaran & kode referensi (khusus Super Admin & Bendahara)
 */
export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'bendahara']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const body = await request.json();
        const applicantId = Number(body.applicant_id);
        const paymentAmount = Math.max(0, parseInt(String(body.payment_amount || '0').replace(/[^0-9]/g, ''), 10) || 0);
        const paymentRefCode = (body.payment_ref_code || '').trim() || null;
        const autoVerifyRereg = Boolean(body.auto_verify_rereg);

        if (!applicantId || isNaN(applicantId)) {
            return NextResponse.json(
                { error: 'ID peserta diperlukan' },
                { status: 400 }
            );
        }

        const applicantRows = await sql`
            SELECT a.registration_number, a.full_name, r.id AS rereg_id, r.rereg_status
            FROM applicants a
            JOIN re_registrations r ON r.applicant_id = a.id
            WHERE a.id = ${applicantId}
            LIMIT 1
        `;

        if (applicantRows.length === 0) {
            return NextResponse.json(
                { error: 'Data daftar ulang peserta tidak ditemukan.' },
                { status: 404 }
            );
        }

        const applicant = applicantRows[0];
        const verifierName = authCheck.user.name || 'Bendahara';

        if (autoVerifyRereg) {
            await sql`
                UPDATE re_registrations
                SET 
                    payment_amount = ${paymentAmount},
                    payment_ref_code = ${paymentRefCode},
                    payment_verified_by = ${verifierName},
                    payment_verified_at = CURRENT_TIMESTAMP,
                    rereg_status = 'Terverifikasi',
                    verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP)
                WHERE applicant_id = ${applicantId}
            `;
        } else {
            await sql`
                UPDATE re_registrations
                SET 
                    payment_amount = ${paymentAmount},
                    payment_ref_code = ${paymentRefCode},
                    payment_verified_by = ${verifierName},
                    payment_verified_at = CURRENT_TIMESTAMP
                WHERE applicant_id = ${applicantId}
            `;
        }

        // Catat Audit Log
        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: verifierName,
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'VERIFY_PAYMENT',
            target_type: 're_registration',
            target_id: applicantId,
            summary: `Memverifikasi nominal pembayaran Rp ${paymentAmount.toLocaleString('id-ID')} (Ref: ${paymentRefCode || '-'}) untuk ${applicant.full_name} (${applicant.registration_number})`,
            metadata: {
                applicant_id: applicantId,
                payment_amount: paymentAmount,
                payment_ref_code: paymentRefCode,
                auto_verify_rereg: autoVerifyRereg,
            },
        });

        return NextResponse.json({
            message: `Pembayaran ${applicant.full_name} berhasil diverifikasi.`,
            payment_amount: paymentAmount,
            payment_ref_code: paymentRefCode,
        });
    } catch (error) {
        console.error('Error save payment verification:', error);
        return NextResponse.json(
            { error: 'Gagal memverifikasi pembayaran.' },
            { status: 500 }
        );
    }
}
