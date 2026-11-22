//src/app/api/admin/re-registration/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

const ALLOWED_REREG_STATUSES = [
    'Menunggu Verifikasi',
    'Perbaikan Daftar Ulang',
    'Terverifikasi',
];

export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const body = await request.json();
        const applicant_id = Number(body.applicant_id);
        const rereg_status = String(body.rereg_status || '').trim();
        const rereg_notes = body.rereg_notes !== undefined ? String(body.rereg_notes).trim() : null;

        if (!applicant_id || isNaN(applicant_id)) {
            return NextResponse.json({ error: 'ID peserta tidak valid.' }, { status: 400 });
        }

        if (!ALLOWED_REREG_STATUSES.includes(rereg_status)) {
            return NextResponse.json({ error: 'Status daftar ulang tidak valid.' }, { status: 400 });
        }

        const existing = await sql`
            SELECT id FROM re_registrations WHERE applicant_id = ${applicant_id} LIMIT 1
        `;

        if (existing.length === 0) {
            return NextResponse.json(
                { error: 'Peserta ini belum mengirimkan formulir daftar ulang.' },
                { status: 404 }
            );
        }

        if (rereg_status === 'Terverifikasi') {
            await sql`
                UPDATE re_registrations
                SET 
                    rereg_status = 'Terverifikasi',
                    rereg_notes = ${rereg_notes || null},
                    verified_at = CURRENT_TIMESTAMP
                WHERE applicant_id = ${applicant_id}
            `;
        } else {
            await sql`
                UPDATE re_registrations
                SET 
                    rereg_status = ${rereg_status},
                    rereg_notes = ${rereg_notes || null},
                    verified_at = NULL
                WHERE applicant_id = ${applicant_id}
            `;
        }

        return NextResponse.json({
            message: `Status daftar ulang berhasil diubah menjadi: ${rereg_status}`,
            rereg_status,
            rereg_notes: rereg_notes || null,
        });
    } catch (error) {
        console.error('Error update re-registration status:', error);
        return NextResponse.json({ error: 'Gagal memperbarui status daftar ulang.' }, { status: 500 });
    }
}