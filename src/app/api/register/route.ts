//src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema, normalizeAllowedPaths } from '@/lib/rereg-schema';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const body = await request.json();
        const {
            full_name,
            nisn,
            tanggal_lahir,
            asal_sekolah,
            email,
            phone,
            father_name,
            mother_name,
            parent_phone,
            registration_path,
            school_choice,
            school_choice_2,
            document_kk,
            document_akta,
            document_prestasi,
        } = body;

        // Validasi field wajib dasar
        if (!full_name || !nisn || !tanggal_lahir || !asal_sekolah || !email || !father_name || !mother_name || !parent_phone || !school_choice) {
            return NextResponse.json({ error: 'Semua data wajib harus diisi.' }, { status: 400 });
        }

        if (!document_kk || !document_akta) {
            return NextResponse.json({ error: 'Scan Kartu Keluarga (KK) dan Akta Kelahiran wajib diunggah.' }, { status: 400 });
        }

        // Ambil pengaturan gelombang & penguncian jalur dari database
        const settingsRows = await sql`
            SELECT wave_name, allowed_registration_paths, is_open_manual, use_auto_schedule, reg_start, reg_end
            FROM site_settings
            WHERE id = 1
            LIMIT 1
        `;
        const settings = settingsRows[0] || null;
        const allowedPaths = normalizeAllowedPaths(settings?.allowed_registration_paths);
        const waveName = settings?.wave_name || 'Gelombang Aktif';

        // Cek status buka/tutup pendaftaran
        if (settings) {
            let isOpen = Boolean(settings.is_open_manual);
            if (settings.use_auto_schedule && settings.reg_start && settings.reg_end) {
                const today = new Date().toISOString().split('T')[0];
                const start = new Date(settings.reg_start).toISOString().split('T')[0];
                const end = new Date(settings.reg_end).toISOString().split('T')[0];
                isOpen = today >= start && today <= end;
            }
            if (!isOpen) {
                return NextResponse.json(
                    { error: `Pendaftaran untuk ${waveName} sedang ditutup.` },
                    { status: 403 }
                );
            }
        }

        // Validasi penguncian jalur pendaftaran pada gelombang ini
        const submittedPath = String(registration_path || '').trim();
        if (allowedPaths === 'Prestasi' && submittedPath !== 'Prestasi') {
            return NextResponse.json(
                { error: `Pendaftaran pada ${waveName} terkunci khusus untuk Jalur Prestasi.` },
                { status: 400 }
            );
        }
        if (allowedPaths === 'Reguler' && submittedPath !== 'Reguler') {
            return NextResponse.json(
                { error: `Pendaftaran pada ${waveName} terkunci khusus untuk Jalur Reguler.` },
                { status: 400 }
            );
        }
        if (!['Reguler', 'Prestasi'].includes(submittedPath)) {
            return NextResponse.json({ error: 'Jalur pendaftaran tidak valid.' }, { status: 400 });
        }

        // Jika jalur Prestasi, dokumen prestasi wajib dilampirkan
        if (submittedPath === 'Prestasi' && !document_prestasi) {
            return NextResponse.json(
                { error: 'Dokumen raport/sertifikat prestasi (PDF) wajib diunggah untuk Jalur Prestasi.' },
                { status: 400 }
            );
        }

        // Cek duplikasi NISN atau Email
        const existing = await sql`
            SELECT id, nisn, email FROM applicants
            WHERE nisn = ${nisn.trim()} OR LOWER(email) = LOWER(${email.trim()})
            LIMIT 1
        `;
        if (existing.length > 0) {
            if (existing[0].nisn === nisn.trim()) {
                return NextResponse.json({ error: 'NISN sudah terdaftar di sistem.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Email sudah terdaftar di sistem.' }, { status: 409 });
        }

        // Generate Nomor Pendaftaran unik
        const year = new Date().getFullYear();
        let registrationNumber = '';
        for (let attempt = 0; attempt < 5; attempt++) {
            const rand = Math.floor(1000 + Math.random() * 9000);
            const candidate = `PSB-${year}-${rand}`;
            const checkReg = await sql`SELECT id FROM applicants WHERE registration_number = ${candidate} LIMIT 1`;
            if (checkReg.length === 0) {
                registrationNumber = candidate;
                break;
            }
        }
        if (!registrationNumber) {
            registrationNumber = `PSB-${year}-${Date.now().toString().slice(-5)}`;
        }

        const inserted = await sql`
            INSERT INTO applicants (
                registration_number,
                full_name,
                nisn,
                tanggal_lahir,
                asal_sekolah,
                email,
                phone,
                father_name,
                mother_name,
                parent_phone,
                registration_path,
                school_choice,
                school_choice_2,
                document_kk,
                document_akta,
                document_prestasi,
                status
            ) VALUES (
                ${registrationNumber},
                ${full_name.trim()},
                ${nisn.trim()},
                ${tanggal_lahir},
                ${asal_sekolah.trim()},
                ${email.trim()},
                ${(phone || '').trim() || null},
                ${father_name.trim()},
                ${mother_name.trim()},
                ${parent_phone.trim()},
                ${submittedPath},
                ${school_choice},
                ${school_choice_2 || null},
                ${document_kk},
                ${document_akta},
                ${submittedPath === 'Prestasi' ? document_prestasi : null},
                'Pending'
            )
            RETURNING registration_number, full_name, school_choice, registration_path
        `;

        return NextResponse.json(
            {
                message: 'Pendaftaran berhasil!',
                registration_number: inserted[0].registration_number,
                full_name: inserted[0].full_name,
                school_choice: inserted[0].school_choice,
                registration_path: inserted[0].registration_path,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error register applicant:', error);
        return NextResponse.json({ error: 'Gagal menyimpan pendaftaran.' }, { status: 500 });
    }
}