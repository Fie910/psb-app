//src/app/api/jaas-branding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

// Helper headers untuk branding response
const responseHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: responseHeaders,
    });
}

export async function GET(request: NextRequest) {
    try {
        // 1. Validasi Keamanan (Authorization header) jika JAAS_BRANDING_SECRET dikonfigurasi
        const brandingSecret = process.env.JAAS_BRANDING_SECRET;
        if (brandingSecret && brandingSecret.trim() !== '') {
            const authHeader = request.headers.get('authorization') || '';
            const normalizedAuth = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7).trim()
                : authHeader.trim();

            if (normalizedAuth !== brandingSecret.trim()) {
                return NextResponse.json(
                    { error: 'Unauthorized: Kredensial JaaS branding tidak valid.' },
                    { status: 401, headers: responseHeaders }
                );
            }
        }

        // 2. Ambil Pengaturan Sekolah dari Database
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const rows = await sql`
            SELECT school_name, logo_url, virtual_background_url 
            FROM site_settings 
            WHERE id = 1
        `;

        const settings = rows[0] || {};
        const origin = request.nextUrl.origin;

        // 3. Susun URL Logo
        let logoImageUrl = '';
        if (settings.logo_url && typeof settings.logo_url === 'string') {
            const trimmedLogo = settings.logo_url.trim();
            if (trimmedLogo.startsWith('http://') || trimmedLogo.startsWith('https://')) {
                logoImageUrl = trimmedLogo;
            } else if (trimmedLogo.startsWith('/')) {
                logoImageUrl = `${origin}${trimmedLogo}`;
            }
        }

        // 4. Susun URL Virtual Background
        const virtualBackgrounds: string[] = [];
        if (settings.virtual_background_url && typeof settings.virtual_background_url === 'string') {
            const trimmedBg = settings.virtual_background_url.trim();
            if (trimmedBg !== '') {
                // Bentuk URL absolut CORS-safe yang dilayani oleh /api/virtual-background
                virtualBackgrounds.push(
                    `${origin}/api/virtual-background?v=${encodeURIComponent(trimmedBg)}`
                );
            }
        }

        // 5. Kembalikan struktur JSON standar JaaS Branding
        const responseBody = {
            logoImageUrl: logoImageUrl || '',
            logoClickUrl: origin,
            virtualBackgrounds,
        };

        return NextResponse.json(responseBody, {
            status: 200,
            headers: responseHeaders,
        });
    } catch (err: any) {
        console.error('Error in /api/jaas-branding:', err);
        return NextResponse.json(
            { error: 'Gagal memproses JaaS branding' },
            { status: 500, headers: responseHeaders }
        );
    }
}
