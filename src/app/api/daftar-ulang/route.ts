//src/app/api/daftar-ulang/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AwsClient } from 'aws4fetch';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';
import { createAdminNotification } from '@/lib/notifications';

function createS3Client() {
    return new AwsClient({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        service: 's3',
        region: process.env.AWS_REGION!,
    });
}

async function getPresignedReadUrl(key: string | null | undefined): Promise<string | null> {
    if (!key) return null;
    try {
        const aws = createS3Client();
        const url = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${key}`);
        url.searchParams.set('X-Amz-Expires', '3600');
        const signed = await aws.sign(url.toString(), {
            method: 'GET',
            aws: { signQuery: true },
        });
        return signed.url;
    } catch (err) {
        console.error('Gagal membuat presigned GET URL:', err);
        return null;
    }
}

async function deleteOldS3Object(oldKey: string | null | undefined) {
    if (!oldKey) return;
    try {
        const aws = createS3Client();
        const deleteUrl = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${oldKey}`);
        const signedDelete = await aws.sign(deleteUrl.toString(), { method: 'DELETE' });
        await fetch(signedDelete.url, { method: 'DELETE' });
    } catch (err) {
        console.error('Gagal menghapus berkas lama S3:', err);
    }
}

async function fetchApplicantAndRereg(nisn: string, tanggalLahir: string) {
    const sql = getDb();
    await ensureReRegistrationSchema(sql);

    const applicants = await sql`
        SELECT 
            id, registration_number, full_name, email, phone,
            asal_sekolah, father_name, mother_name, parent_phone,
            school_choice, school_choice_2, registration_path,
            status, nisn, TO_CHAR(tanggal_lahir, 'YYYY-MM-DD') as tanggal_lahir,
            accepted_major, accepted_at
        FROM applicants
        WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggalLahir}
        LIMIT 1
    `;

    if (applicants.length === 0) {
        return { error: 'Data NISN atau Tanggal Lahir tidak ditemukan.', status: 404 };
    }

    const applicant = applicants[0];

    if (applicant.status !== 'Diterima') {
        return {
            error: `Fitur Daftar Ulang hanya tersedia untuk peserta dengan status DITERIMA. Status Anda saat ini: ${applicant.status}.`,
            status: 403,
        };
    }

    const reregRows = await sql`
        SELECT * FROM re_registrations WHERE applicant_id = ${applicant.id} LIMIT 1
    `;
    const rereg = reregRows.length > 0 ? reregRows[0] : null;

    const settingsRows = await sql`
        SELECT 
            school_name, foundation_name, school_address, school_city,
            headmaster_name, headmaster_nip, logo_url, contact_wa,
            TO_CHAR(rereg_start, 'YYYY-MM-DD') as rereg_start,
            TO_CHAR(rereg_end, 'YYYY-MM-DD') as rereg_end,
            rereg_instructions,
            COALESCE(NULLIF(payment_portal_url, ''), 'https://gosiswa.com') as payment_portal_url,
            payment_tutorial_youtube_url
        FROM site_settings
        WHERE id = 1
        LIMIT 1
    `;
    const settings = settingsRows.length > 0 ? settingsRows[0] : null;

    let pasFotoPreviewUrl: string | null = null;
    if (rereg?.doc_pas_foto) {
        pasFotoPreviewUrl = await getPresignedReadUrl(rereg.doc_pas_foto);
    }

    return {
        applicant,
        rereg,
        settings,
        pasFotoPreviewUrl,
        status: 200,
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const nisn = searchParams.get('nisn')?.trim() || '';
        const tanggalLahir = searchParams.get('tanggal_lahir')?.trim() || '';

        if (!nisn || !tanggalLahir) {
            return NextResponse.json({ error: 'NISN dan Tanggal Lahir wajib diisi.' }, { status: 400 });
        }

        const result = await fetchApplicantAndRereg(nisn, tanggalLahir);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            applicant: result.applicant,
            rereg: result.rereg,
            settings: result.settings,
            pasFotoPreviewUrl: result.pasFotoPreviewUrl,
        });
    } catch (error) {
        console.error('GET /api/daftar-ulang error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const nisn = String(body.nisn || '').trim();
        const tanggalLahir = String(body.tanggal_lahir || '').trim();

        if (!nisn || !tanggalLahir) {
            return NextResponse.json({ error: 'NISN dan Tanggal Lahir wajib diisi.' }, { status: 400 });
        }

        if (body.action === 'lookup') {
            const result = await fetchApplicantAndRereg(nisn, tanggalLahir);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: result.status });
            }
            return NextResponse.json({
                applicant: result.applicant,
                rereg: result.rereg,
                settings: result.settings,
                pasFotoPreviewUrl: result.pasFotoPreviewUrl,
            });
        }

        return await handleSaveReRegistration(body, nisn, tanggalLahir);
    } catch (error) {
        console.error('POST /api/daftar-ulang error:', error);
        return NextResponse.json({ error: 'Gagal memproses data daftar ulang.' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const nisn = String(body.nisn || '').trim();
        const tanggalLahir = String(body.tanggal_lahir || '').trim();

        if (!nisn || !tanggalLahir) {
            return NextResponse.json({ error: 'NISN dan Tanggal Lahir wajib diisi.' }, { status: 400 });
        }

        return await handleSaveReRegistration(body, nisn, tanggalLahir);
    } catch (error) {
        console.error('PUT /api/daftar-ulang error:', error);
        return NextResponse.json({ error: 'Gagal memperbarui data daftar ulang.' }, { status: 500 });
    }
}

async function handleSaveReRegistration(body: Record<string, unknown>, nisn: string, tanggalLahir: string) {
    const sql = getDb();
    await ensureReRegistrationSchema(sql);

    const applicants = await sql`
        SELECT id, registration_number, full_name, school_choice, accepted_major, status
        FROM applicants
        WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggalLahir}
        LIMIT 1
    `;

    if (applicants.length === 0) {
        return NextResponse.json({ error: 'Data peserta tidak ditemukan.' }, { status: 404 });
    }

    const applicant = applicants[0];
    if (applicant.status !== 'Diterima') {
        return NextResponse.json({ error: 'Peserta belum berstatus Diterima.' }, { status: 403 });
    }

    const nik = String(body.nik || '').trim();
    const no_kk = String(body.no_kk || '').trim();
    const birth_place = String(body.birth_place || '').trim();
    const gender = String(body.gender || '').trim();
    const religion = String(body.religion || '').trim();
    const address_street = String(body.address_street || '').trim();
    const village = String(body.village || '').trim();
    const district = String(body.district || '').trim();
    const city = String(body.city || '').trim();
    const uniform_size = String(body.uniform_size || '').trim();
    const payment_scheme = String(body.payment_scheme || 'Minimal (DP)').trim();

    if (!/^\d{16}$/.test(nik)) {
        return NextResponse.json({ error: 'NIK Siswa wajib 16 digit angka.' }, { status: 400 });
    }
    if (!/^\d{16}$/.test(no_kk)) {
        return NextResponse.json({ error: 'Nomor Kartu Keluarga (No. KK) wajib 16 digit angka.' }, { status: 400 });
    }
    if (!birth_place || !gender || !religion || !address_street || !village || !district || !city || !uniform_size) {
        return NextResponse.json({ error: 'Harap lengkapi semua kolom wajib biodata, alamat, dan ukuran seragam.' }, { status: 400 });
    }

    const doc_kuitansi_gosiswa = String(body.doc_kuitansi_gosiswa || '').trim();
    const doc_pas_foto = String(body.doc_pas_foto || '').trim();
    const doc_skl_ijazah = String(body.doc_skl_ijazah || '').trim();
    const doc_pernyataan = String(body.doc_pernyataan || '').trim();

    if (!doc_kuitansi_gosiswa || !doc_pas_foto || !doc_skl_ijazah || !doc_pernyataan) {
        return NextResponse.json(
            { error: 'Semua 4 dokumen daftar ulang (Kuitansi gosiswa.com, Pas Foto 3x4, SKL/Ijazah, dan Surat Pernyataan) wajib diunggah.' },
            { status: 400 }
        );
    }

    const existingRows = await sql`
        SELECT * FROM re_registrations WHERE applicant_id = ${applicant.id} LIMIT 1
    `;
    const existing = existingRows.length > 0 ? existingRows[0] : null;

    if (existing && existing.rereg_status === 'Terverifikasi') {
        return NextResponse.json(
            { error: 'Data daftar ulang Anda sudah Terverifikasi oleh panitia dan tidak dapat diubah lagi.' },
            { status: 403 }
        );
    }

    if (existing) {
        if (existing.doc_kuitansi_gosiswa && existing.doc_kuitansi_gosiswa !== doc_kuitansi_gosiswa) {
            await deleteOldS3Object(existing.doc_kuitansi_gosiswa);
        }
        if (existing.doc_pas_foto && existing.doc_pas_foto !== doc_pas_foto) {
            await deleteOldS3Object(existing.doc_pas_foto);
        }
        if (existing.doc_skl_ijazah && existing.doc_skl_ijazah !== doc_skl_ijazah) {
            await deleteOldS3Object(existing.doc_skl_ijazah);
        }
        if (existing.doc_pernyataan && existing.doc_pernyataan !== doc_pernyataan) {
            await deleteOldS3Object(existing.doc_pernyataan);
        }
    }

    const toNullableInt = (val: unknown) => {
        if (val === null || val === undefined || val === '') return null;
        const parsed = parseInt(String(val), 10);
        return isNaN(parsed) ? null : parsed;
    };

    const child_order = toNullableInt(body.child_order);
    const siblings_count = toNullableInt(body.siblings_count);
    const rt_rw = String(body.rt_rw || '').trim() || null;
    const postal_code = String(body.postal_code || '').trim() || null;
    const living_with = String(body.living_with || '').trim() || null;

    const height_cm = toNullableInt(body.height_cm);
    const weight_kg = toNullableInt(body.weight_kg);
    const blood_type = String(body.blood_type || '').trim() || null;
    const medical_notes = String(body.medical_notes || '').trim() || null;

    const father_nik = String(body.father_nik || '').trim() || null;
    const father_education = String(body.father_education || '').trim() || null;
    const father_occupation = String(body.father_occupation || '').trim() || null;
    const father_income = String(body.father_income || '').trim() || null;

    const mother_nik = String(body.mother_nik || '').trim() || null;
    const mother_education = String(body.mother_education || '').trim() || null;
    const mother_occupation = String(body.mother_occupation || '').trim() || null;
    const mother_income = String(body.mother_income || '').trim() || null;

    const guardian_name = String(body.guardian_name || '').trim() || null;
    const guardian_phone = String(body.guardian_phone || '').trim() || null;
    const guardian_occupation = String(body.guardian_occupation || '').trim() || null;

    const saved = await sql`
        INSERT INTO re_registrations (
            applicant_id, payment_scheme, doc_kuitansi_gosiswa,
            nik, no_kk, birth_place, gender, religion, child_order, siblings_count,
            address_street, rt_rw, village, district, city, postal_code, living_with,
            height_cm, weight_kg, blood_type, medical_notes, uniform_size,
            father_nik, father_education, father_occupation, father_income,
            mother_nik, mother_education, mother_occupation, mother_income,
            guardian_name, guardian_phone, guardian_occupation,
            doc_pas_foto, doc_skl_ijazah, doc_pernyataan,
            rereg_status, rereg_notes, submitted_at
        ) VALUES (
            ${applicant.id}, ${payment_scheme}, ${doc_kuitansi_gosiswa},
            ${nik}, ${no_kk}, ${birth_place}, ${gender}, ${religion}, ${child_order}, ${siblings_count},
            ${address_street}, ${rt_rw}, ${village}, ${district}, ${city}, ${postal_code}, ${living_with},
            ${height_cm}, ${weight_kg}, ${blood_type}, ${medical_notes}, ${uniform_size},
            ${father_nik}, ${father_education}, ${father_occupation}, ${father_income},
            ${mother_nik}, ${mother_education}, ${mother_occupation}, ${mother_income},
            ${guardian_name}, ${guardian_phone}, ${guardian_occupation},
            ${doc_pas_foto}, ${doc_skl_ijazah}, ${doc_pernyataan},
            'Menunggu Verifikasi', NULL, CURRENT_TIMESTAMP
        )
        ON CONFLICT (applicant_id) DO UPDATE SET
            payment_scheme = EXCLUDED.payment_scheme,
            doc_kuitansi_gosiswa = EXCLUDED.doc_kuitansi_gosiswa,
            nik = EXCLUDED.nik,
            no_kk = EXCLUDED.no_kk,
            birth_place = EXCLUDED.birth_place,
            gender = EXCLUDED.gender,
            religion = EXCLUDED.religion,
            child_order = EXCLUDED.child_order,
            siblings_count = EXCLUDED.siblings_count,
            address_street = EXCLUDED.address_street,
            rt_rw = EXCLUDED.rt_rw,
            village = EXCLUDED.village,
            district = EXCLUDED.district,
            city = EXCLUDED.city,
            postal_code = EXCLUDED.postal_code,
            living_with = EXCLUDED.living_with,
            height_cm = EXCLUDED.height_cm,
            weight_kg = EXCLUDED.weight_kg,
            blood_type = EXCLUDED.blood_type,
            medical_notes = EXCLUDED.medical_notes,
            uniform_size = EXCLUDED.uniform_size,
            father_nik = EXCLUDED.father_nik,
            father_education = EXCLUDED.father_education,
            father_occupation = EXCLUDED.father_occupation,
            father_income = EXCLUDED.father_income,
            mother_nik = EXCLUDED.mother_nik,
            mother_education = EXCLUDED.mother_education,
            mother_occupation = EXCLUDED.mother_occupation,
            mother_income = EXCLUDED.mother_income,
            guardian_name = EXCLUDED.guardian_name,
            guardian_phone = EXCLUDED.guardian_phone,
            guardian_occupation = EXCLUDED.guardian_occupation,
            doc_pas_foto = EXCLUDED.doc_pas_foto,
            doc_skl_ijazah = EXCLUDED.doc_skl_ijazah,
            doc_pernyataan = EXCLUDED.doc_pernyataan,
            rereg_status = 'Menunggu Verifikasi',
            rereg_notes = NULL,
            submitted_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    const majorLabel = applicant.accepted_major || applicant.school_choice;
    await createAdminNotification({
        type: 'REREG_SUBMITTED',
        title: existing ? 'Perbaikan Daftar Ulang Dikirim' : 'Daftar Ulang Baru Masuk',
        message: `${applicant.full_name} (${majorLabel}) mengirimkan berkas daftar ulang & kuitansi (${payment_scheme}).`,
        applicantId: applicant.id,
        registrationNumber: applicant.registration_number,
        applicantName: applicant.full_name,
    });

    const pasFotoPreviewUrl = await getPresignedReadUrl(doc_pas_foto);

    return NextResponse.json(
        {
            message: 'Formulir Daftar Ulang berhasil dikirim!',
            rereg: saved[0],
            pasFotoPreviewUrl,
        },
        { status: 200 }
    );
}