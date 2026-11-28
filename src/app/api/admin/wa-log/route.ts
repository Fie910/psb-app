//src/app/api/admin/wa-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { logAdminAudit } from '@/lib/audit-log';

/**
 * Memastikan kolom tracking WA tersedia di tabel applicants
 */
export async function ensureWaTrackingSchema(sql: any) {
    try {
        await sql`
            ALTER TABLE applicants
            ADD COLUMN IF NOT EXISTS last_wa_sent_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS last_wa_sent_by VARCHAR(180),
            ADD COLUMN IF NOT EXISTS last_wa_recipient VARCHAR(40)
        `;
    } catch (e) {
        console.warn('Warning ensuring wa tracking schema:', e);
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator', 'bendahara']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureWaTrackingSchema(sql);

        const body = await request.json();
        const applicantId = Number(body.applicant_id);
        const recipientPhone = (body.recipient_phone || '').trim();
        const recipientType = (body.recipient_type || 'student').trim(); // 'student' | 'parent'
        const messagePreview = (body.message_preview || '').trim();

        if (!applicantId || isNaN(applicantId)) {
            return NextResponse.json({ error: 'applicant_id diperlukan' }, { status: 400 });
        }

        const senderName = authCheck.user.name || 'Panitia';
        const now = new Date().toISOString();

        // Ambil data peserta beserta kontak referal jika ada
        const appRows = await sql`
            SELECT a.id, a.registration_number, a.full_name, a.status, a.phone, a.parent_phone, rc.referrer_phone
            FROM applicants a
            LEFT JOIN referral_codes rc ON UPPER(TRIM(a.referral_code)) = rc.code
            WHERE a.id = ${applicantId}
            LIMIT 1
        `;

        if (appRows.length === 0) {
            return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
        }

        const app = appRows[0];
        const fallbackPhone =
            recipientType === 'referrer'
                ? app.referrer_phone
                : recipientType === 'parent'
                    ? app.parent_phone
                    : app.phone;

        // Update tracking WA pada tabel applicants
        await sql`
            UPDATE applicants
            SET 
                last_wa_sent_at = CURRENT_TIMESTAMP,
                last_wa_sent_by = ${senderName},
                last_wa_recipient = ${recipientPhone || fallbackPhone || null}
            WHERE id = ${applicantId}
        `;

        // Catat ke admin_audit_logs
        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: senderName,
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'SEND_WHATSAPP',
            target_type: 'applicant',
            target_id: applicantId,
            summary: `Mengirimkan pesan WhatsApp ke ${app.full_name} (${app.registration_number}) via nomor ${recipientPhone || '-'} [${recipientType}]`,
            metadata: {
                applicant_id: applicantId,
                recipient_phone: recipientPhone,
                recipient_type: recipientType,
                message_snippet: messagePreview ? messagePreview.slice(0, 160) + '...' : null,
                sent_at: now,
            },
        });

        return NextResponse.json({
            message: 'Status pengiriman WhatsApp berhasil dicatat.',
            last_wa_sent_at: now,
            last_wa_sent_by: senderName,
            last_wa_recipient: recipientPhone,
        });
    } catch (error) {
        console.error('Error log WhatsApp status:', error);
        return NextResponse.json({ error: 'Gagal mencatat status WhatsApp.' }, { status: 500 });
    }
}
