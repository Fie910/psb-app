import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const body = await request.json();
        // Menerima document_key, bukan document_data (Base64)
        const { full_name, email, phone, school_choice, document_key } = body;

        if (!full_name || !email || !school_choice) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        await sql`
      INSERT INTO applicants (full_name, email, phone, school_choice, document_key)
      VALUES (${full_name}, ${email}, ${phone}, ${school_choice}, ${document_key})
    `;

        return NextResponse.json({ message: 'Pendaftaran berhasil' }, { status: 201 });
    } catch (error) {
        console.error('Database error:', error);
        if (error instanceof Error && error.message.includes('duplicate key')) {
            return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}