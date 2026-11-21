//src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

const adminPageMiddleware = auth.middleware({
    loginUrl: '/login',
});

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/api/admin')) {
        try {
            const { data: sessionData, error } = await auth.getSession();
            if (error || !sessionData?.session || !sessionData?.user) {
                return NextResponse.json(
                    { error: 'Unauthorized: Akses ditolak. Silakan login terlebih dahulu.' },
                    { status: 401 }
                );
            }
            return NextResponse.next();
        } catch {
            return NextResponse.json(
                { error: 'Unauthorized: Gagal memverifikasi autentikasi.' },
                { status: 401 }
            );
        }
    }

    return adminPageMiddleware(request);
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};