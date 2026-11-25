//src/app/api/verifikasi/[kode]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ kode: string }> }
) {
    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);
        const { kode } = await params;
        const normalizedKode = (kode || '').trim();

        if (!normalizedKode) {
            return NextResponse.json(
                { error: 'Nomor pendaftaran diperlukan' },
                { status: 400 }
            );
        }

        // Cari peserta berdasarkan registration_number (case-insensitive)
        const result = await sql`
            SELECT 
                a.registration_number,
                a.full_name,
                a.asal_sekolah,
                a.registration_path,
                a.status,
                COALESCE(a.accepted_major, a.school_choice) AS accepted_major,
                r.rereg_status,
                r.verified_at,
                s.school_name
            FROM applicants a
            LEFT JOIN re_registrations r ON r.applicant_id = a.id
            CROSS JOIN (SELECT school_name FROM site_settings WHERE id = 1 LIMIT 1) s
            WHERE LOWER(a.registration_number) = LOWER(${normalizedKode})
            LIMIT 1
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Dokumen pendaftaran tidak ditemukan pada database sekolah.' },
                { status: 404 }
            );
        }

        const row = result[0];

        // PROTEKSI PRIVASI: Hanya kembalikan data yang aman untuk verifikasi publik
        return NextResponse.json({
            applicant: {
                registration_number: row.registration_number,
                full_name: row.full_name,
                asal_sekolah: row.asal_sekolah || '-',
                registration_path: row.registration_path || 'Reguler',
                status: row.status,
                accepted_major: row.accepted_major || '-',
                rereg_status: row.rereg_status || null,
                verified_at: row.verified_at || null,
                school_name: row.school_name || 'SMK KH. A. Wahab Muhsin',
            },
        });
    } catch (error) {
        console.error('Error verifikasi QR publik:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan sistem saat memeriksa dokumen.' },
            { status: 500 }
        );
    }
}
