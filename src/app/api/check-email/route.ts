import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email diperlukan' }, { status: 400 });
        }

        // Cek apakah email sudah ada di tabel applicants
        const result = await sql`
      SELECT id FROM applicants WHERE email = ${email} LIMIT 1
    `;

        if (result.length > 0) {
            return NextResponse.json({ exists: true }, { status: 200 });
        }

        return NextResponse.json({ exists: false }, { status: 200 });
    } catch (error) {
        console.error('Error cek email:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}