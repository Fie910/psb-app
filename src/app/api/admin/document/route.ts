import { NextRequest, NextResponse } from 'next/server';
import { AwsClient } from 'aws4fetch';

export async function POST(request: NextRequest) {
    try {
        const { key } = await request.json();
        if (!key) return NextResponse.json({ error: 'Key diperlukan' }, { status: 400 });

        const aws = new AwsClient({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            service: 's3',
            region: process.env.AWS_REGION!,
        });

        // Buat URL GET (bukan PUT) dengan masa berlaku 1 jam (3600 detik)
        const url = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${key}`);
        url.searchParams.set('X-Amz-Expires', '3600');

        const signed = await aws.sign(url.toString(), {
            method: 'GET',
            aws: { signQuery: true },
        });

        return NextResponse.json({ viewUrl: signed.url });
    } catch (error) {
        console.error('Error presigned GET:', error);
        return NextResponse.json({ error: 'Gagal membuat URL' }, { status: 500 });
    }
}