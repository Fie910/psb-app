import { NextRequest, NextResponse } from 'next/server';
import { AwsClient } from 'aws4fetch';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { fileName, fileType } = await request.json();
        if (!fileName || !fileType) {
            return NextResponse.json({ error: 'Nama file dan tipe diperlukan' }, { status: 400 });
        }

        const aws = new AwsClient({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            service: 's3',
            region: process.env.AWS_REGION!,
        });

        const key = `documents/${randomUUID()}-${fileName}`;
        const url = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${key}`);
        url.searchParams.set('X-Amz-Expires', '60');

        // JANGAN sertakan header Content-Type di sini.
        // Cukup gunakan signQuery: true.
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