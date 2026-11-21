import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function generateRegistrationNumber() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear().toString().slice(-2);
    return `PSB-${year}-${result}`;
}

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const body = await request.json();
        const {
            full_name, email, phone, asal_sekolah,
            father_name, mother_name, parent_phone,
            school_choice, school_choice_2,
            registration_path,
            nisn, tanggal_lahir,
            document_kk, document_akta, document_prestasi
        } = body;

        if (!full_name || !email || !school_choice || !nisn || !tanggal_lahir) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        if (registration_path === 'Prestasi' && !document_prestasi) {
            return NextResponse.json({ error: 'Dokumen prestasi wajib diunggah untuk jalur Prestasi' }, { status: 400 });
        }

        let normalizedPhone = phone;
        if (phone) {
            normalizedPhone = phone.replace(/[^0-9]/g, '');
            if (normalizedPhone.startsWith('0')) normalizedPhone = '62' + normalizedPhone.slice(1);
        }

        let normalizedParentPhone = parent_phone;
        if (parent_phone) {
            normalizedParentPhone = parent_phone.replace(/[^0-9]/g, '');
            if (normalizedParentPhone.startsWith('0')) normalizedParentPhone = '62' + normalizedParentPhone.slice(1);
        }

        const regNumber = generateRegistrationNumber();

        await sql`
      INSERT INTO applicants (
        full_name, email, phone, asal_sekolah, father_name, mother_name, parent_phone,
        school_choice, school_choice_2, registration_path, nisn, tanggal_lahir, 
        document_kk, document_akta, document_prestasi, status, registration_number
      )
      VALUES (
        ${full_name}, ${email}, ${normalizedPhone}, ${asal_sekolah}, ${father_name}, ${mother_name}, ${normalizedParentPhone},
        ${school_choice}, ${school_choice_2}, ${registration_path || 'Reguler'}, ${nisn}, ${tanggal_lahir}, 
        ${document_kk}, ${document_akta}, ${document_prestasi || null}, 'Pending', ${regNumber}
      )
    `;

        return NextResponse.json({
            message: 'Pendaftaran berhasil',
            registration_number: regNumber,
            full_name: full_name,
            school_choice: school_choice
        }, { status: 201 });
    } catch (error) {
        console.error('Database error:', error);
        if (error instanceof Error && error.message.includes('duplicate key')) {
            return NextResponse.json({ error: 'Email atau NISN sudah terdaftar' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}