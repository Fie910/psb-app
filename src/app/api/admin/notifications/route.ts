//src/app/api/admin/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';
import { ensureNotificationsSchema } from '@/lib/notifications';

export async function GET() {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureNotificationsSchema(sql);

        const notifications = await sql`
            SELECT 
                id,
                type,
                title,
                message,
                applicant_id,
                registration_number,
                applicant_name,
                is_read,
                created_at
            FROM admin_notifications
            ORDER BY created_at DESC
            LIMIT 40
        `;

        const unreadRows = await sql`
            SELECT COUNT(*)::int AS count
            FROM admin_notifications
            WHERE is_read = FALSE
        `;

        const unreadCount = unreadRows[0]?.count ?? 0;

        return NextResponse.json({
            notifications,
            unreadCount,
        });
    } catch (error) {
        console.error('Error fetch admin notifications:', error);
        return NextResponse.json(
            { error: 'Gagal memuat notifikasi panitia.' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureNotificationsSchema(sql);

        const body = await request.json();
        const action = String(body.action || '').trim();
        const id = body.id !== undefined ? Number(body.id) : null;

        if (action === 'mark_all_read') {
            await sql`
                UPDATE admin_notifications
                SET is_read = TRUE
                WHERE is_read = FALSE
            `;
            return NextResponse.json({ message: 'Semua notifikasi ditandai sudah dibaca.' });
        }

        if (action === 'mark_read' && id && !isNaN(id)) {
            await sql`
                UPDATE admin_notifications
                SET is_read = TRUE
                WHERE id = ${id}
            `;
            return NextResponse.json({ message: 'Notifikasi ditandai sudah dibaca.' });
        }

        if (action === 'clear_read') {
            await sql`
                DELETE FROM admin_notifications
                WHERE is_read = TRUE
            `;
            return NextResponse.json({ message: 'Notifikasi yang sudah dibaca dibersihkan.' });
        }

        return NextResponse.json({ error: 'Aksi notifikasi tidak valid.' }, { status: 400 });
    } catch (error) {
        console.error('Error update admin notifications:', error);
        return NextResponse.json(
            { error: 'Gagal memperbarui status notifikasi.' },
            { status: 500 }
        );
    }
}