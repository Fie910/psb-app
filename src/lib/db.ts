import { neon } from '@neondatabase/serverless';

// Koneksi ke database menggunakan DATABASE_URL dari .env.local
export const sql = neon(process.env.DATABASE_URL!);