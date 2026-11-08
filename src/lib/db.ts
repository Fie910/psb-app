import { neon } from '@neondatabase/serverless';

// Fungsi ini akan membuat koneksi baru setiap kali dipanggil.
// Ini aman dan direkomendasikan untuk driver HTTP Neon di lingkungan Edge/Serverless.
export function getDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL tidak ditemukan di environment variables.');
    }
    return neon(process.env.DATABASE_URL);
}