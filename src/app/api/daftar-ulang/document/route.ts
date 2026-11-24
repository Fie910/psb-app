//src/app/api/daftar-ulang/document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AwsClient } from 'aws4fetch';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const nisn = typeof body?.nisn === 'string' ? body.nisn.trim() : '';
        const tanggal_lahir = typeof body?.tanggal_lahir === 'string' ? body.tanggal_lahir.trim() : '';
        const key = typeof body?.key === 'string' ? body.key.trim() : '';

        if (!nisn || !tanggal_lahir || !key) {
            return NextResponse.json(
                { error: 'NISN, Tanggal Lahir, dan key dokumen wajib diisi.' },
                { status: 400 }
            );
        }

        const sql = getDb();

        const rows = await sql`
        SELECT 
            a.id,
            a.document_kk,
            a.document_akta,
            a.document_prestasi,
            r.doc_pas_foto,
            r.doc_kuitansi_gosiswa,
            r.doc_skl_ijazah,
            r.doc_pernyataan
        FROM applicants a
        LEFT JOIN re_registrations r ON r.applicant_id = a.id
        WHERE a.nisn = ${nisn} AND a.tanggal_lahir = ${tanggal_lahir}
        LIMIT 1
    `;

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Data siswa tidak ditemukan atau kredensial tidak cocok.' },
                { status: 404 }
            );
        }

        const student = rows[0];
        const allowedKeys = [
            student.doc_pas_foto,
            student.doc_kuitansi_gosiswa,
            student.doc_skl_ijazah,
            student.doc_pernyataan,
            student.document_kk,
            student.document_akta,
            student.document_prestasi,
        ].filter((item): item is string => typeof item === 'string' && item.length > 0);

        if (!allowedKeys.includes(key)) {
            return NextResponse.json(
                { error: 'Akses ditolak: Dokumen tidak terdaftar pada akun siswa ini.' },
                { status: 403 }
            );
        }

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION;
        const endpointUrl = process.env.AWS_ENDPOINT_URL_S3;
        const bucketName = process.env.AWS_S3_BUCKET;

        if (!accessKeyId || !secretAccessKey || !region || !endpointUrl || !bucketName) {
            return NextResponse.json(
                { error: 'Konfigurasi penyimpanan S3/R2 belum lengkap di server.' },
                { status: 500 }
            );
        }

        const aws = new AwsClient({
            accessKeyId,
            secretAccessKey,
            service: 's3',
            region,
        });

        const url = new URL(`${endpointUrl}/${bucketName}/${key}`);
        url.searchParams.set('X-Amz-Expires', '3600');

        const signed = await aws.sign(url.toString(), {
            method: 'GET',
            aws: { signQuery: true },
        });

        return NextResponse.json({ viewUrl: signed.url }, { status: 200 });
    } catch (error) {
        console.error('Error presigned GET daftar-ulang document:', error);
        return NextResponse.json(
            { error: 'Gagal membuat tautan pratinjau dokumen.' },
            { status: 500 }
        );
    }


}