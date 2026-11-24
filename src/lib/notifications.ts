//src/lib/notifications.ts
import { NeonQueryFunction } from '@neondatabase/serverless';
import { getDb } from '@/lib/db';

export type AdminNotificationType =
    | 'NEW_APPLICANT'
    | 'REVISION_SUBMITTED'
    | 'REREG_SUBMITTED'
    | 'EXAM_FINISHED';

export interface CreateAdminNotificationInput {
    type: AdminNotificationType;
    title: string;
    message: string;
    applicantId?: number | null;
    registrationNumber?: string | null;
    applicantName?: string | null;
}

let notificationsSchemaEnsured = false;

export async function ensureNotificationsSchema(sql: NeonQueryFunction<false, false>) {
    if (notificationsSchemaEnsured) return;

    await sql`
        CREATE TABLE IF NOT EXISTS admin_notifications (
            id SERIAL PRIMARY KEY,
            type VARCHAR(40) NOT NULL,
            title VARCHAR(180) NOT NULL,
            message TEXT NOT NULL,
            applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
            registration_number VARCHAR(50),
            applicant_name VARCHAR(180),
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `;

    await sql`
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read
        ON admin_notifications(is_read)
    `;

    await sql`
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
        ON admin_notifications(created_at DESC)
    `;

    notificationsSchemaEnsured = true;
}

/**
 * Mencatat notifikasi baru untuk panitia secara aman tanpa mengganggu proses utama siswa.
 */
export async function createAdminNotification(input: CreateAdminNotificationInput) {
    try {
        const sql = getDb();
        await ensureNotificationsSchema(sql);

        await sql`
            INSERT INTO admin_notifications (
                type,
                title,
                message,
                applicant_id,
                registration_number,
                applicant_name
            ) VALUES (
                ${input.type},
                ${input.title},
                ${input.message},
                ${input.applicantId ?? null},
                ${input.registrationNumber ?? null},
                ${input.applicantName ?? null}
            )
        `;
    } catch (error) {
        console.error('Gagal mencatat notifikasi panitia:', error);
    }
}