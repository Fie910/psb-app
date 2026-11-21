//src/app/api/update-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AwsClient } from 'aws4fetch';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const body = await request.json();
        const {
            nisn, tanggal_lahir, docType, document_key, oldKey,
            newName, newEmail, newPhone,
            newAsalSekolah, newFatherName, newMotherName, newParentPhone
        } = body;

        // 1. Update Data Teks (Jika ada)
        if (newName || newEmail || newPhone || newAsalSekolah || newFatherName || newMotherName || newParentPhone) {
            await sql`
        UPDATE applicants 
        SET 
          full_name = COALESCE(${newName}, full_name),
          email = COALESCE(${newEmail}, email),
          phone = COALESCE(${newPhone}, phone),
          asal_sekolah = COALESCE(${newAsalSekolah}, asal_sekolah),
          father_name = COALESCE(${newFatherName}, father_name),
          mother_name = COALESCE(${newMotherName}, mother_name),
          parent_phone = COALESCE(${newParentPhone}, parent_phone)
        WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}
      `;
        }

        // 2. Update Berkas (Jika ada)
        if (docType && document_key) {
            if (oldKey) {
                try {
                    const aws = new AwsClient({
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                        service: 's3',
                        region: process.env.AWS_REGION!,
                    });
                    const deleteUrl = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${oldKey}`);
                    const signedDelete = await aws.sign(deleteUrl.toString(), { method: 'DELETE' });
                    await fetch(signedDelete.url, { method: 'DELETE' });
                } catch (err) {
                    console.log('Gagal menghapus file lama:', err);
                }
            }

            if (docType === 'KK') {
                await sql`UPDATE applicants SET document_kk = ${document_key} WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}`;
            } else if (docType === 'Akta') {
                await sql`UPDATE applicants SET document_akta = ${document_key} WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}`;
            } else if (docType === 'Prestasi') {
                await sql`UPDATE applicants SET document_prestasi = ${document_key} WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}`;
            }
        }

        // 3. Reset Status ke Pending & Bersihkan Catatan
        await sql`
      UPDATE applicants 
      SET status = 'Pending', document_notes = NULL, revision_fields = '[]'::jsonb
      WHERE nisn = ${nisn} AND tanggal_lahir = ${tanggal_lahir}
    `;

        return NextResponse.json({ message: 'Perbaikan berhasil disimpan' }, { status: 200 });
    } catch (error) {
        console.error('Error update document:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}