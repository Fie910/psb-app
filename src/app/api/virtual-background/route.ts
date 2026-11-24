//src/app/api/virtual-background/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';
import { AwsClient } from 'aws4fetch';

// CORS response helper
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        // ?src=... dapat digunakan untuk pratinjau langsung di halaman pengaturan sebelum disimpan
        let target = searchParams.get('src') || searchParams.get('v');

        if (!target) {
            const sql = getDb();
            await ensureReRegistrationSchema(sql);
            const rows = await sql`SELECT virtual_background_url FROM site_settings WHERE id = 1`;
            target = rows[0]?.virtual_background_url;
        }

        if (!target || !target.trim()) {
            return NextResponse.json(
                { error: 'Virtual background belum diatur' },
                { status: 404, headers: corsHeaders }
            );
        }

        const trimmedTarget = target.trim();

        // 1. Jika target merupakan URL eksternal (http:// atau https://)
        if (trimmedTarget.startsWith('http://') || trimmedTarget.startsWith('https://')) {
            const upstream = await fetch(trimmedTarget);
            if (!upstream.ok) {
                return NextResponse.json(
                    { error: 'Gagal memuat gambar dari URL eksternal' },
                    { status: upstream.status, headers: corsHeaders }
                );
            }

            const contentType = upstream.headers.get('content-type') || 'image/jpeg';
            return new Response(upstream.body, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=300',
                },
            });
        }

        // 2. Jika target merupakan S3/R2 object key
        // GUARDRAILS & KEAMANAN BUCKET:
        // Hanya boleh melayani key yang diawali 'documents/VirtualBackground-'
        if (!trimmedTarget.startsWith('documents/VirtualBackground-')) {
            return NextResponse.json(
                { error: 'Akses ditolak: Hanya file VirtualBackground yang diizinkan' },
                { status: 403, headers: corsHeaders }
            );
        }

        const aws = new AwsClient({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            service: 's3',
            region: process.env.AWS_REGION!,
        });

        const s3Url = new URL(`${process.env.AWS_ENDPOINT_URL_S3}/${process.env.AWS_S3_BUCKET}/${trimmedTarget}`);
        const signedReq = await aws.sign(s3Url.toString(), {
            method: 'GET',
        });

        const s3Response = await fetch(signedReq);
        if (!s3Response.ok) {
            return NextResponse.json(
                { error: 'Gagal mengambil gambar dari storage S3' },
                { status: s3Response.status, headers: corsHeaders }
            );
        }

        // Tentukan Content-Type berdasarkan ekstensi atau response header
        let contentType = s3Response.headers.get('content-type');
        if (!contentType || contentType === 'application/octet-stream') {
            const ext = trimmedTarget.split('.').pop()?.toLowerCase();
            if (ext === 'png') contentType = 'image/png';
            else if (ext === 'webp') contentType = 'image/webp';
            else contentType = 'image/jpeg';
        }

        return new Response(s3Response.body, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (err: any) {
        console.error('Error in /api/virtual-background:', err);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server saat memproses virtual background' },
            { status: 500, headers: corsHeaders }
        );
    }
}
