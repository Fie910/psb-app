//src/app/api/admin/audit-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { ensureAuditLogSchema } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureAuditLogSchema(sql);

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get('search') || '').trim();
        const action = (searchParams.get('action') || '').trim();
        const actor = (searchParams.get('actor') || '').trim();
        const from = (searchParams.get('from') || '').trim();
        const to = (searchParams.get('to') || '').trim();
        const limitParam = parseInt(searchParams.get('limit') || '100', 10);
        const limit = Math.min(Math.max(isNaN(limitParam) ? 100 : limitParam, 1), 500);

        // Ambil data log dengan filter dinamis
        const logs = await sql`
            SELECT 
                id,
                actor_id,
                actor_name,
                actor_email,
                actor_role,
                action,
                target_type,
                target_id,
                summary,
                metadata,
                created_at
            FROM admin_audit_logs
            WHERE 1=1
                AND (${action} = '' OR action = ${action})
                AND (
                    ${actor} = '' 
                    OR actor_name ILIKE ${'%' + actor + '%'} 
                    OR actor_email ILIKE ${'%' + actor + '%'}
                )
                AND (
                    ${search} = '' 
                    OR summary ILIKE ${'%' + search + '%'} 
                    OR target_id ILIKE ${'%' + search + '%'}
                    OR actor_name ILIKE ${'%' + search + '%'}
                )
                AND (${from} = '' OR created_at >= ${from}::timestamp)
                AND (${to} = '' OR created_at <= ${to + ' 23:59:59'}::timestamp)
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;

        // Ambil daftar unique actions untuk opsi filter di frontend
        const actionRows = await sql`
            SELECT DISTINCT action FROM admin_audit_logs ORDER BY action ASC
        `;
        const availableActions = actionRows.map((r: any) => String(r.action || ''));

        return NextResponse.json({
            logs,
            availableActions,
            totalReturned: logs.length,
        });
    } catch (error) {
        console.error('Error get admin audit logs:', error);
        return NextResponse.json({ error: 'Gagal mengambil audit log aktivitas.' }, { status: 500 });
    }
}
