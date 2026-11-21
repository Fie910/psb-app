//src/lib/auth/server.ts
import { createNeonAuth } from '@neondatabase/auth/next/server';
import { NextResponse } from 'next/server';

export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
});

export async function requireAdminAuth() {
    try {
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