//src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

const neonAuthMiddleware = auth.middleware({
    loginUrl: '/login',
});

export async function proxy(request: NextRequest) {
    const response = await neonAuthMiddleware(request);

    if (
        request.nextUrl.pathname.startsWith('/api/admin') &&
        response &&
        (response.status === 307 || response.status === 302)
    ) {
        return NextResponse.json(
            { error: 'Unauthorized: Sesi panitia tidak valid atau telah berakhir.' },
            { status: 401 }
        );
    }

    return response;


}

export default proxy;

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};