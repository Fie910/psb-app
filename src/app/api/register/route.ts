import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Wajib ditambahkan agar kompatibel dengan Cloudflare nanti
export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { full_name, email, phone, school_choice } = body;

        // Validasi sederhana
        if (!full_name || !email || !school_choice) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        // Simpan ke database Neon
        await sql`
      INSERT INTO applicants (full_name, email, phone, school_choice)
      VALUES (${full_name}, ${email}, ${phone}, ${school_choice})
    `;

        return NextResponse.json({ message: 'Pendaftaran berhasil' }, { status: 201 });
    } catch (error) {
        console.error('Database error:', error);

        // Cek jika email duplikat
        if (error instanceof Error && error.message.includes('duplicate key')) {
            return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}