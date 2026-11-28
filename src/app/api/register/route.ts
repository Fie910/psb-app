// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDbRetry } from '@/lib/db';
import { ensureReferralSchema } from '@/lib/referral-schema';
import { ensureReRegistrationSchema, normalizeAllowedPaths } from '@/lib/rereg-schema';
import { createAdminNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        await withDbRetry(async () => {
            await ensureReferralSchema(sql);
            await ensureReRegistrationSchema(sql);
        });

        const body = await request.json();
        const rawRefInput = body.referral_code ?? body.referralCode ?? '';
        const rawReferralCode = typeof rawRefInput === 'string' ? rawRefInput.trim().toUpperCase() : '';
        let validReferralCode: string | null = null;
        if (rawReferralCode) {
            const refRows = await withDbRetry(() => sql`
                SELECT code, status FROM referral_codes WHERE UPPER(TRIM(code)) = ${rawReferralCode} LIMIT 1
            `);
            if (refRows.length === 0) {
                return NextResponse.json({ error: 'Kode referal tidak ditemukan.' }, { status: 400 });
            }
            if (refRows[0].status !== 'active') {
                return NextResponse.json({ error: 'Kode referal belum aktif atau masih menunggu persetujuan admin.' }, { status: 400 });
            }
            validReferralCode = String(refRows[0].code).trim().toUpperCase();
        }
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

        if (!full_name || !nisn || !tanggal_lahir || !asal_sekolah || !email || !father_name || !mother_name || !parent_phone || !school_choice) {
            return NextResponse.json({ error: 'Semua data wajib harus diisi.' }, { status: 400 });
        }

        if (!document_kk || !document_akta) {
            return NextResponse.json({ error: 'Scan Kartu Keluarga (KK) dan Akta Kelahiran wajib diunggah.' }, { status: 400 });
        }

        const settingsRows = await withDbRetry(() => sql`
            SELECT wave_name, allowed_registration_paths, is_open_manual, use_auto_schedule, reg_start, reg_end
            FROM site_settings
            ORDER BY id ASC
            LIMIT 1
        `);
        const settings = settingsRows[0] || null;
        const allowedPaths = normalizeAllowedPaths(settings?.allowed_registration_paths);
        const waveName = settings?.wave_name || 'Gelombang Aktif';

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

        if (submittedPath === 'Prestasi' && !document_prestasi) {
            return NextResponse.json(
                { error: 'Dokumen raport/sertifikat prestasi (PDF) wajib diunggah untuk Jalur Prestasi.' },
                { status: 400 }
            );
        }

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

        const yearShort = String(new Date().getFullYear()).slice(-2);
        const ALPHANUM_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const genCode = (len: number) => {
            let out = '';
            for (let i = 0; i < len; i++) {
                out += ALPHANUM_CHARS[Math.floor(Math.random() * ALPHANUM_CHARS.length)];
            }
            return out;
        };

        let registrationNumber = '';
        for (let attempt = 0; attempt < 8; attempt++) {
            const candidate = `PSB-${yearShort}-${genCode(5)}`;
            const checkReg = await sql`SELECT id FROM applicants WHERE registration_number = ${candidate} LIMIT 1`;
            if (checkReg.length === 0) {
                registrationNumber = candidate;
                break;
            }
        }
        if (!registrationNumber) {
            registrationNumber = `PSB-${yearShort}-${genCode(5)}`;
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
                referral_code,
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
                ${validReferralCode},
                ${document_kk},
                ${document_akta},
                ${submittedPath === 'Prestasi' ? document_prestasi : null},
                'Pending'
            )
            RETURNING id, registration_number, full_name, school_choice, registration_path, referral_code
        `;

        const newApplicant = inserted[0];

        await createAdminNotification({
            type: 'NEW_APPLICANT',
            title: `Pendaftar Baru (${newApplicant.registration_path})`,
            message: `${newApplicant.full_name} mendaftar pada pilihan ${newApplicant.school_choice}.`,
            applicantId: newApplicant.id,
            registrationNumber: newApplicant.registration_number,
            applicantName: newApplicant.full_name,
        });

        return NextResponse.json(
            {
                message: 'Pendaftaran berhasil!',
                registration_number: newApplicant.registration_number,
                full_name: newApplicant.full_name,
                school_choice: newApplicant.school_choice,
                registration_path: newApplicant.registration_path,
                referral_code: newApplicant.referral_code || null,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error register applicant:', error);
        return NextResponse.json({ error: 'Gagal menyimpan pendaftaran.' }, { status: 500 });
    }
}