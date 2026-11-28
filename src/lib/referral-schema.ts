// src/lib/referral-schema.ts
import { NeonQueryFunction } from '@neondatabase/serverless';

let referralSchemaEnsured = false;

export const REFERRAL_ALPHANUM = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateReferralCode(length = 5): string {
    let out = '';
    for (let i = 0; i < length; i++) {
        out += REFERRAL_ALPHANUM[Math.floor(Math.random() * REFERRAL_ALPHANUM.length)];
    }
    return out;
}

export async function ensureReferralSchema(sql: NeonQueryFunction<false, false>) {
    if (referralSchemaEnsured) return;
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS referral_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(10) UNIQUE NOT NULL,
                referrer_name VARCHAR(180) NOT NULL,
                referrer_phone VARCHAR(40) NOT NULL,
                origin_school VARCHAR(180) NOT NULL,
                jabatan VARCHAR(60) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                approved_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`
            ALTER TABLE applicants
            ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10)
        `;
        await sql`
            ALTER TABLE site_settings
            ADD COLUMN IF NOT EXISTS referral_auto_approve BOOLEAN NOT NULL DEFAULT FALSE
        `;
        referralSchemaEnsured = true;
    } catch (e) {
        console.warn('Warning ensuring referral schema:', e);
    }
}
