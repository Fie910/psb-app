//src/app/api/admin/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { logAdminAudit } from '@/lib/audit-log';

export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const { id, status, notes, revision_fields, accepted_major } = await request.json();

        if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

        const prevRows = await sql`
            SELECT id, registration_number, full_name, status, document_notes, accepted_major 
            FROM applicants 
            WHERE id = ${id} 
            LIMIT 1
        `;
        const applicant = prevRows[0];

        if (status !== undefined) {
            if (status === 'Diterima') {
                await sql`UPDATE applicants SET status = ${status}, accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP) WHERE id = ${id}`;
            } else {
                await sql`UPDATE applicants SET status = ${status} WHERE id = ${id}`;
            }
        }

        if (notes !== undefined) await sql`UPDATE applicants SET document_notes = ${notes} WHERE id = ${id}`;
        if (revision_fields !== undefined) await sql`UPDATE applicants SET revision_fields = ${JSON.stringify(revision_fields)}::jsonb WHERE id = ${id}`;
        if (accepted_major !== undefined) await sql`UPDATE applicants SET accepted_major = ${accepted_major || null} WHERE id = ${id}`;

        // Catat Audit Log
        const applicantName = applicant?.full_name || `ID #${id}`;
        const regNum = applicant?.registration_number || '';
        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: authCheck.user.name || 'Panitia',
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'UPDATE_STATUS',
            target_type: 'applicant',
            target_id: id,
            summary: `Memperbarui status/catatan pendaftar ${applicantName} (${regNum}) menjadi '${status || applicant?.status}'`,
            metadata: {
                previous_status: applicant?.status,
                new_status: status,
                notes,
                revision_fields,
                accepted_major,
            },
        });

        return NextResponse.json({ message: 'Data diperbarui' }, { status: 200 });
    } catch (error) {
        console.error('Error update status:', error);
        return NextResponse.json({ error: 'Gagal memperbarui data' }, { status: 500 });
    }
}