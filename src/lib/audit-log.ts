//src/lib/audit-log.ts
import { getDb } from '@/lib/db';
import type { PanitiaRole } from '@/lib/rbac';

export type AuditAction =
    | 'UPDATE_STATUS'
    | 'BULK_ACTION'
    | 'VERIFY_REREG'
    | 'SAVE_INTERVIEW_SCORE'
    | 'UPDATE_SETTINGS'
    | 'CREATE_PANITIA'
    | 'UPDATE_PANITIA_ROLE'
    | (string & {});

export type AuditTargetType =
    | 'applicant'
    | 're_registration'
    | 'site_settings'
    | 'admin_user'
    | (string & {});

export interface AdminAuditLogItem {
    id: number;
    actor_id: string | null;
    actor_name: string;
    actor_email: string | null;
    actor_role: PanitiaRole;
    action: AuditAction;
    target_type: AuditTargetType | null;
    target_id: string | null;
    summary: string;
    metadata: Record<string, any> | null;
    created_at: string;
}

export interface LogAuditInput {
    actor_id?: string | null;
    actor_name: string;
    actor_email?: string | null;
    actor_role?: PanitiaRole | string;
    action: AuditAction;
    target_type?: AuditTargetType | null;
    target_id?: string | number | null;
    summary: string;
    metadata?: Record<string, any> | null;
}

/**
 * Memastikan tabel admin_audit_logs dan indeks pendukung tersedia di database
 */
export async function ensureAuditLogSchema(sql: any) {
    await sql`
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id SERIAL PRIMARY KEY,
            actor_id VARCHAR(120),
            actor_name VARCHAR(180) NOT NULL,
            actor_email VARCHAR(180),
            actor_role VARCHAR(40) NOT NULL DEFAULT 'super_admin',
            action VARCHAR(80) NOT NULL,
            target_type VARCHAR(60),
            target_id VARCHAR(120),
            summary TEXT NOT NULL,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Indeks untuk pencarian dan filter cepat
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id ON admin_audit_logs (actor_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs (action)`;
}

/**
 * Mencatat aktivitas panitia ke tabel admin_audit_logs.
 * Idempoten dan aman (tidak melempar error ke alur operasi utama jika logging gagal).
 */
export async function logAdminAudit(input: LogAuditInput): Promise<boolean> {
    try {
        const sql = getDb();
        await ensureAuditLogSchema(sql);

        const actorId = input.actor_id ? String(input.actor_id) : null;
        const actorName = (input.actor_name || '').trim() || 'Panitia';
        const actorEmail = input.actor_email ? String(input.actor_email).trim() : null;
        const actorRole = (input.actor_role as PanitiaRole) || 'super_admin';
        const action = String(input.action).trim();
        const targetType = input.target_type ? String(input.target_type).trim() : null;
        const targetId = input.target_id !== undefined && input.target_id !== null ? String(input.target_id).trim() : null;
        const summary = (input.summary || '').trim() || action;
        const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

        await sql`
            INSERT INTO admin_audit_logs (
                actor_id,
                actor_name,
                actor_email,
                actor_role,
                action,
                target_type,
                target_id,
                summary,
                metadata
            ) VALUES (
                ${actorId},
                ${actorName},
                ${actorEmail},
                ${actorRole},
                ${action},
                ${targetType},
                ${targetId},
                ${summary},
                ${metadataJson}::jsonb
            )
        `;

        return true;
    } catch (err) {
        console.warn('Warning: Gagal mencatat admin audit log:', err);
        return false;
    }
}
