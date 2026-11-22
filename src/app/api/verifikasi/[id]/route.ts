//src/app/api/verifikasi/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);
        const { id } = await params;

        const result = await sql`
            SELECT 
                a.full_name, 
                a.nisn, 
                a.registration_number, 
                a.status,
                COALESCE(a.accepted_major, a.school_choice) as accepted_major,
                r.rereg_status,
                r.payment_scheme,
                r.uniform_size
            FROM applicants a
            LEFT JOIN re_registrations r ON r.applicant_id = a.id
            WHERE a.registration_number = ${id} AND a.status = 'Diterima' 
            LIMIT 1
        `;

        if (result.length === 0) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
        return NextResponse.json({ applicant: result[0] });
    } catch (error) {
        console.error('Error verifikasi QR:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}