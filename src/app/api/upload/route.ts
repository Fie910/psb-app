import { NextRequest, NextResponse } from 'next/server';
import { AwsClient } from 'aws4fetch';

export async function POST(request: NextRequest) {
    try {
        const { fileName, fileType, studentName, docType } = await request.json();

        if (!fileName || !fileType) {
            return NextResponse.json({ error: 'Nama file dan tipe diperlukan' }, { status: 400 });
        }

        const aws = new AwsClient({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            service: 's3',
            region: process.env.AWS_REGION!,
        });

        // FITUR BARU: Rename file otomatis
        // 1. Bersihkan nama siswa dari karakter aneh (hanya huruf dan angka)
        const safeName = (studentName || 'Siswa').replace(/[^a-zA-Z0-9]/g, '');
        // 2. Buat timestamp unik
        const timestamp = Date.now();
        // 3. Susun nama file: Tipe-Nama-Timestamp.ekstensi
        const extension = fileName.split('.').pop();
        const newFileName = `${docType}-${safeName}-${timestamp}.${extension}`;

        // Path di dalam bucket
        const key = `documents/${newFileName}`;

        const url = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${key}`);
        url.searchParams.set('X-Amz-Expires', '60');

        const signed = await aws.sign(url.toString(), {
            method: 'PUT',
            aws: { signQuery: true },
        });

        return NextResponse.json({ signedUrl: signed.url, key });
    } catch (error) {
        console.error('Gagal membuat presigned URL:', error);
        return NextResponse.json({ error: 'Gagal membuat izin upload' }, { status: 500 });
    }
}