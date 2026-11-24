//src/app/api/update-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AwsClient } from 'aws4fetch';
import { createAdminNotification } from '@/lib/notifications';

async function deleteOldFileFromS3(oldKey: string | null | undefined) {
    if (!oldKey) return;
    try {
        const aws = new AwsClient({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            service: 's3',
            region: process.env.AWS_REGION!,
        });
        const deleteUrl = new URL(
            `${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${oldKey}`
        );
        const signedDelete = await aws.sign(deleteUrl.toString(), { method: 'DELETE' });
        await fetch(signedDelete.url, { method: 'DELETE' });
    } catch (err) {
        console.error('Gagal menghapus dokumen lama S3:', err);
    }
}

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const body = await request.json();

        const nisn = String(body.nisn || '').trim();
        const tanggal_lahir = String(body.tanggal_lahir || '').trim();

        if (!nisn || !tanggal_lahir) {
            return NextResponse.json({ error: 'NISN dan Tanggal Lahir wajib diisi.' }, { status: 400 });
        }

        const existingRows = await sql`
            SELECT 
                id, registration_number, full_name, email, phone, asal_sekolah,
                father_name, mother_name, parent_phone,
                document_kk, document_akta, document_prestasi
            FROM applicants
            WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}
            LIMIT 1
        `;

        if (existingRows.length === 0) {
            return NextResponse.json({ error: 'Data pendaftar tidak ditemukan.' }, { status: 404 });
        }

        const current = existingRows[0];

        const updatedFullName = body.newName ? String(body.newName).trim() : current.full_name;
        const updatedEmail = body.newEmail ? String(body.newEmail).trim() : current.email;
        const updatedPhone = body.newPhone !== null && body.newPhone !== undefined ? String(body.newPhone).trim() : current.phone;
        const updatedAsalSekolah = body.newAsalSekolah ? String(body.newAsalSekolah).trim() : current.asal_sekolah;
        const updatedFatherName = body.newFatherName ? String(body.newFatherName).trim() : current.father_name;
        const updatedMotherName = body.newMotherName ? String(body.newMotherName).trim() : current.mother_name;
        const updatedParentPhone = body.newParentPhone ? String(body.newParentPhone).trim() : current.parent_phone;

        let updatedKK = current.document_kk;
        let updatedAkta = current.document_akta;
        let updatedPrestasi = current.document_prestasi;

        if (body.docType === 'KK' && body.document_key) {
            updatedKK = String(body.document_key);
            if (body.oldKey && body.oldKey !== updatedKK) {
                await deleteOldFileFromS3(body.oldKey);
            }
        } else if (body.docType === 'Akta' && body.document_key) {
            updatedAkta = String(body.document_key);
            if (body.oldKey && body.oldKey !== updatedAkta) {
                await deleteOldFileFromS3(body.oldKey);
            }
        } else if (body.docType === 'Prestasi' && body.document_key) {
            updatedPrestasi = String(body.document_key);
            if (body.oldKey && body.oldKey !== updatedPrestasi) {
                await deleteOldFileFromS3(body.oldKey);
            }
        }

        await sql`
            UPDATE applicants
            SET
                full_name = ${updatedFullName},
                email = ${updatedEmail},
                phone = ${updatedPhone},
                asal_sekolah = ${updatedAsalSekolah},
                father_name = ${updatedFatherName},
                mother_name = ${updatedMotherName},
                parent_phone = ${updatedParentPhone},
                document_kk = ${updatedKK},
                document_akta = ${updatedAkta},
                document_prestasi = ${updatedPrestasi},
                status = 'Pending',
                revision_fields = '[]'::jsonb
            WHERE id = ${current.id}
        `;

        await createAdminNotification({
            type: 'REVISION_SUBMITTED',
            title: 'Perbaikan Berkas & Data Dikirim',
            message: `${updatedFullName} telah mengirimkan perbaikan data/berkas dan menunggu verifikasi ulang.`,
            applicantId: current.id,
            registrationNumber: current.registration_number,
            applicantName: updatedFullName,
        });

        return NextResponse.json({ message: 'Perbaikan berhasil disimpan.' }, { status: 200 });
    } catch (error) {
        console.error('Error update document:', error);
        return NextResponse.json({ error: 'Gagal menyimpan perbaikan.' }, { status: 500 });
    }
}