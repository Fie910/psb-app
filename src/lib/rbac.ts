//src/lib/rbac.ts
import { getDb, withDbRetry } from '@/lib/db';

export type PanitiaRole = 'super_admin' | 'verifikator' | 'pewawancara' | 'bendahara';

export const PANITIA_ROLES: {
    role: PanitiaRole;
    label: string;
    description: string;
    badgeColor: string;
}[] = [
    {
        role: 'super_admin',
        label: 'Super Admin',
        description: 'Akses penuh ke seluruh modul, pengaturan situs, audit log, dan kelola akun panitia.',
        badgeColor: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30',
    },
    {
        role: 'verifikator',
        label: 'Verifikator Berkas',
        description: 'Memverifikasi kelengkapan berkas, revisi dokumen, status pendaftaran, dan penjadwalan.',
        badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    },
    {
        role: 'pewawancara',
        label: 'Pewawancara',
        description: 'Menilai wawancara peserta melalui ruang video Jitsi Meet, rubrik, dan rekomendasi jurusan.',
        badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    {
        role: 'bendahara',
        label: 'Bendahara / Keuangan',
        description: 'Memverifikasi bukti pembayaran biaya pendaftaran dan administrasi daftar ulang pendaftar.',
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
];

let adminRolesSchemaEnsured = false;

/**
 * Memastikan tabel admin_roles tersedia di database untuk menyimpan peran kustom panitia
 */
export async function ensureAdminRolesSchema(sql: any) {
    if (adminRolesSchemaEnsured) return;
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS admin_roles (
                user_id VARCHAR(120) PRIMARY KEY,
                email VARCHAR(180) NOT NULL,
                name VARCHAR(180),
                role VARCHAR(40) NOT NULL DEFAULT 'super_admin',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_admin_roles_email ON admin_roles (email)`;
        adminRolesSchemaEnsured = true;
    } catch (e) {
        console.warn('Warning ensuring admin_roles schema:', e);
    }
}

/**
 * Mengambil role seorang admin berdasarkan user_id atau email.
 * Fallback: cek SUPER_ADMIN_EMAILS, jika tidak terdaftar -> 'verifikator' (least-privilege).
 */
export async function getAdminRole(userId: string, email?: string | null): Promise<PanitiaRole> {
    const superAdminList = (process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    if (email && superAdminList.includes(email.trim().toLowerCase())) {
        return 'super_admin';
    }

    try {
        const sql = getDb();
        await ensureAdminRolesSchema(sql);

        const rows = await withDbRetry(() => sql`
            SELECT role FROM admin_roles 
            WHERE user_id = ${userId} OR (email = ${email || ''} AND ${Boolean(email)})
            LIMIT 1
        `);

        if (rows.length > 0 && rows[0].role) {
            const role = rows[0].role as PanitiaRole;
            if (['super_admin', 'verifikator', 'pewawancara', 'bendahara'].includes(role)) {
                return role;
            }
        }

        // Bootstrap: hanya jika SUPER_ADMIN_EMAILS belum diset dan belum ada super_admin sama sekali di admin_roles
        if (superAdminList.length === 0 && userId) {
            const countRows = await withDbRetry(() => sql`
                SELECT COUNT(*)::int AS cnt FROM admin_roles WHERE role = 'super_admin'
            `);
            if (Number(countRows[0]?.cnt || 0) === 0) {
                await setAdminRole(userId, email || '', 'Super Admin', 'super_admin');
                return 'super_admin';
            }
        }
    } catch (err) {
        console.warn('Warning: Gagal mengambil admin role dari database:', err);
    }

    return 'verifikator';
}

/**
 * Menyimpan atau memperbarui role panitia
 */
export async function setAdminRole(userId: string, email: string, name: string, role: PanitiaRole): Promise<boolean> {
    try {
        const sql = getDb();
        await ensureAdminRolesSchema(sql);

        await sql`
            INSERT INTO admin_roles (user_id, email, name, role, updated_at)
            VALUES (${userId}, ${email}, ${name}, ${role}, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE
            SET role = ${role},
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                updated_at = CURRENT_TIMESTAMP
        `;
        return true;
    } catch (err) {
        console.error('Error setAdminRole:', err);
        return false;
    }
}
