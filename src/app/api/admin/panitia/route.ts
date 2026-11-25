//src/app/api/admin/panitia/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { ensureAdminRolesSchema, setAdminRole, type PanitiaRole } from '@/lib/rbac';
import { logAdminAudit } from '@/lib/audit-log';

/**
 * GET: Ambil daftar seluruh panitia beserta perannya
 */
export async function GET() {
    const authCheck = await requireAdminRole(['super_admin']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureAdminRolesSchema(sql);

        const panitiaList = await sql`
            SELECT 
                user_id,
                email,
                name,
                role,
                created_at,
                updated_at
            FROM admin_roles
            ORDER BY created_at DESC
        `;

        return NextResponse.json({
            panitia: panitiaList,
            currentUserRole: authCheck.user.role,
        });
    } catch (error) {
        console.error('Error get panitia list:', error);
        return NextResponse.json({ error: 'Gagal mengambil data panitia.' }, { status: 500 });
    }
}

/**
 * POST: Catat role untuk panitia yang baru dibuat atau perbarui role yang sudah ada
 */
export async function POST(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const body = await request.json();
        const userId = String(body.user_id || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const name = String(body.name || '').trim();
        const role = (body.role as PanitiaRole) || 'verifikator';
        const isUpdate = Boolean(body.is_update);

        if (!userId || !email) {
            return NextResponse.json({ error: 'user_id dan email wajib diisi.' }, { status: 400 });
        }

        const validRoles: PanitiaRole[] = ['super_admin', 'verifikator', 'pewawancara', 'bendahara'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Peran panitia tidak valid.' }, { status: 400 });
        }

        const success = await setAdminRole(userId, email, name || 'Panitia', role);
        if (!success) {
            return NextResponse.json({ error: 'Gagal menyimpan peran panitia.' }, { status: 500 });
        }

        // Catat Audit Log
        const actionType = isUpdate ? 'UPDATE_PANITIA_ROLE' : 'CREATE_PANITIA';
        const summary = isUpdate
            ? `Mengubah peran panitia ${name} (${email}) menjadi '${role}'`
            : `Menambahkan panitia baru ${name} (${email}) dengan peran '${role}'`;

        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: authCheck.user.name || 'Super Admin',
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: actionType,
            target_type: 'admin_user',
            target_id: userId,
            summary,
            metadata: {
                target_email: email,
                target_name: name,
                assigned_role: role,
                is_update: isUpdate,
            },
        });

        return NextResponse.json({
            message: `Peran panitia ${name} (${role}) berhasil disimpan.`,
            panitia: { user_id: userId, email, name, role },
        });
    } catch (error) {
        console.error('Error save panitia role:', error);
        return NextResponse.json({ error: 'Gagal memproses data peran panitia.' }, { status: 500 });
    }
}
