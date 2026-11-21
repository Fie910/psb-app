//src/lib/auth/server.ts
import { createNeonAuth } from '@neondatabase/auth/next/server';
import { NextResponse } from 'next/server';

// Fallback dummy secret agar proses evaluasi modul Next.js saat build-time tidak crash jika env belum terpasang
const baseUrl = process.env.NEON_AUTH_BASE_URL || 'https://dummy-auth.neon.tech';
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET || 'dummy-build-time-cookie-secret-min-32-chars-long';

export const auth = createNeonAuth({
    baseUrl,
    cookies: {
        secret: cookieSecret,
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
});

export async function requireAdminAuth() {
    try {
        if (!process.env.NEON_AUTH_COOKIE_SECRET || !process.env.NEON_AUTH_BASE_URL) {
            return {
                authorized: false as const,
                response: NextResponse.json(
                    { error: 'Unauthorized: Konfigurasi autentikasi server belum lengkap.' },
                    { status: 401 }
                ),
            };
        }

        const { data: sessionData, error } = await auth.getSession();

        if (error || !sessionData?.session || !sessionData?.user) {
            return {
                authorized: false as const,
                response: NextResponse.json(
                    { error: 'Unauthorized: Sesi admin tidak valid atau telah berakhir.' },
                    { status: 401 }
                ),
            };
        }

        return {
            authorized: true as const,
            session: sessionData.session,
            user: sessionData.user,
        };
    } catch {
        return {
            authorized: false as const,
            response: NextResponse.json(
                { error: 'Unauthorized: Gagal memverifikasi sesi admin.' },
                { status: 401 }
            ),
        };
    }
}
