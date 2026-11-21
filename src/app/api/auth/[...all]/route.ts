import { NextRequest, NextResponse } from 'next/server';

async function proxyRequest(request: NextRequest, method: string) {
    const url = new URL(request.url);
    // Mengambil path setelah /api/auth (misal: /sign-up/email)
    const path = url.pathname.replace('/api/auth', '');
    const targetUrl = `${process.env.NEON_AUTH_BASE_URL}${path}${url.search}`;

    // Ambil body sebagai JSON (bukan text mentah) agar Next.js tidak merusak formatnya
    let body = undefined;
    if (method === 'POST' || method === 'PUT') {
        try {
            const json = await request.json();
            body = JSON.stringify(json);
        } catch (e) {
            // Jika body kosong (misal: request GET)
            body = undefined;
        }
    }

    // Susun header baru yang bersih
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Origin', request.headers.get('origin') || 'http://localhost:3000');

    // Teruskan cookie jika ada (untuk session)
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);

    // Lakukan request ke Neon Auth
    const response = await fetch(targetUrl, {
        method,
        headers,
        body,
    });

    const data = await response.text();

    // Kembalikan response ke browser
    const nextResponse = new NextResponse(data, {
        status: response.status,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    // Teruskan Set-Cookie dari Neon ke Browser
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        nextResponse.headers.set('set-cookie', setCookie);
    }

    return nextResponse;
}

export async function POST(request: NextRequest) {
    return proxyRequest(request, 'POST');
}

export async function GET(request: NextRequest) {
    return proxyRequest(request, 'GET');
}