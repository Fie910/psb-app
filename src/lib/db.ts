//src/lib/db.ts
import { neon } from '@neondatabase/serverless';

// Fungsi ini akan membuat koneksi baru setiap kali dipanggil.
// Ini aman dan direkomendasikan untuk driver HTTP Neon di lingkungan Edge/Serverless.
export function getDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL tidak ditemukan di environment variables.');
    }
    return neon(process.env.DATABASE_URL);
}

export async function withDbRetry<T>(
    fn: () => Promise<T>,
    retries = 2,
    delayMs = 350
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const msg = String(err?.message || '') + ' ' + String(err?.cause?.code || '');
            const isTransient =
                msg.includes('fetch failed') ||
                msg.includes('UND_ERR_CONNECT_TIMEOUT') ||
                msg.includes('ConnectTimeoutError');
            if (!isTransient || attempt === retries) {
                throw err;
            }
            await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        }
    }
    throw lastError;
}