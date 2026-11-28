// src/app/api/admin/referrals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDbRetry } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { ensureReferralSchema } from '@/lib/referral-schema';
import { logAdminAudit } from '@/lib/audit-log';

export async function GET() {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReferralSchema(sql);

        const referrals = await withDbRetry(() => sql`
            SELECT
                r.*,
                COUNT(a.id)::int AS applicant_count,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', a.id,
                            'full_name', a.full_name,
                            'registration_number', a.registration_number,
                            'asal_sekolah', a.asal_sekolah,
                            'status', a.status
                        )
                    ) FILTER (WHERE a.id IS NOT NULL),
                    '[]'::json
                ) AS applicants
            FROM referral_codes r
            LEFT JOIN applicants a ON UPPER(TRIM(a.referral_code)) = r.code
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);

        return NextResponse.json({ referrals });
    } catch (error) {
        console.error('Error GET /api/admin/referrals:', error);
        return NextResponse.json({ error: 'Gagal memuat daftar kode referal.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReferralSchema(sql);

        const body = await request.json();
        const id = Number(body.id);
        const status = String(body.status || '').trim();

        if (!id || isNaN(id) || !['pending', 'active', 'inactive'].includes(status)) {
            return NextResponse.json({ error: 'ID dan status (pending/active/inactive) wajib valid.' }, { status: 400 });
        }

        const updated = await sql`
            UPDATE referral_codes
            SET
                status = ${status},
                approved_at = CASE WHEN ${status} = 'active' THEN COALESCE(approved_at, CURRENT_TIMESTAMP) ELSE approved_at END
            WHERE id = ${id}
            RETURNING *
        `;

        if (updated.length === 0) {
            return NextResponse.json({ error: 'Kode referal tidak ditemukan.' }, { status: 404 });
        }

        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: authCheck.user.name || 'Panitia',
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'UPDATE_REFERRAL_STATUS',
            target_type: 'referral_code',
            target_id: id,
            summary: `Mengubah status kode referal ${updated[0].code} (${updated[0].referrer_name}) menjadi '${status}'`,
            metadata: { code: updated[0].code, status },
        });

        return NextResponse.json({ referral: updated[0] });
    } catch (error) {
        console.error('Error PATCH /api/admin/referrals:', error);
        return NextResponse.json({ error: 'Gagal memperbarui status kode referal.' }, { status: 500 });
    }
}
