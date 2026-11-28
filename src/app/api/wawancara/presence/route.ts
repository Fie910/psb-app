// src/app/api/wawancara/presence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

let presenceSchemaEnsured = false;

async function ensurePresenceSchema(sql: any) {
    if (presenceSchemaEnsured) return;
    try {
        await sql`
            ALTER TABLE applicants
            ADD COLUMN IF NOT EXISTS interview_last_seen_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS interview_room_active BOOLEAN DEFAULT FALSE
        `;
        presenceSchemaEnsured = true;
    } catch (e) {
        console.warn('Warning ensuring interview presence schema:', e);
    }
}

const REG_NUMBER_REGEX = /^[A-Za-z0-9\-_/]{3,40}$/;

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        await ensurePresenceSchema(sql);

        const body = await request.json();
        const applicantId = Number(body.applicant_id);
        const hasValidId = Number.isInteger(applicantId) && applicantId > 0;
        const regNumber = typeof body.registration_number === 'string' ? body.registration_number.trim() : '';
        const hasValidReg = REG_NUMBER_REGEX.test(regNumber);
        const active = body.active !== false;

        if (!hasValidId && !hasValidReg) {
            return NextResponse.json({ error: 'applicant_id atau registration_number tidak valid' }, { status: 400 });
        }

        if (hasValidId) {
            await sql`
                UPDATE applicants
                SET
                    interview_last_seen_at = CURRENT_TIMESTAMP,
                    interview_room_active = ${active}
                WHERE id = ${applicantId}
            `;
        } else {
            await sql`
                UPDATE applicants
                SET
                    interview_last_seen_at = CURRENT_TIMESTAMP,
                    interview_room_active = ${active}
                WHERE registration_number = ${regNumber}
            `;
        }

        return NextResponse.json({ ok: true, active });
    } catch (error) {
        console.error('Error updating interview presence:', error);
        return NextResponse.json({ error: 'Gagal memperbarui status kehadiran wawancara.' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensurePresenceSchema(sql);

        const { searchParams } = new URL(request.url);
        const applicantId = Number(searchParams.get('applicant_id'));

        if (!applicantId || isNaN(applicantId)) {
            return NextResponse.json({ error: 'applicant_id diperlukan' }, { status: 400 });
        }

        const rows = await sql`
            SELECT
                id,
                full_name,
                interview_room_active,
                interview_last_seen_at,
                (
                    interview_room_active = TRUE
                    AND interview_last_seen_at IS NOT NULL
                    AND interview_last_seen_at >= NOW() - INTERVAL '45 seconds'
                ) AS is_waiting
            FROM applicants
            WHERE id = ${applicantId}
            LIMIT 1
        `;

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({
            applicant_id: rows[0].id,
            full_name: rows[0].full_name,
            active: Boolean(rows[0].interview_room_active),
            last_seen_at: rows[0].interview_last_seen_at,
            is_waiting: Boolean(rows[0].is_waiting),
            is_online: Boolean(rows[0].is_waiting),
        });
    } catch (error) {
        console.error('Error fetching interview presence:', error);
        return NextResponse.json({ error: 'Gagal memeriksa kehadiran wawancara.' }, { status: 500 });
    }
}
