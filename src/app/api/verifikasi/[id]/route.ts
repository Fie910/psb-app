import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const sql = getDb();
        const { id } = await params;

        // Tambahkan nisn di sini
        const result = await sql`
        SELECT full_name, nisn, registration_number, status 
        FROM applicants 
        WHERE registration_number = ${id} AND status = 'Diterima' 
        LIMIT 1
    `;

        if (result.length === 0) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
        return NextResponse.json({ applicant: result[0] });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}