//src/lib/rereg-schema.ts
import { NeonQueryFunction } from '@neondatabase/serverless';

let schemaEnsured = false;

/**
 * Memastikan kolom site_settings (termasuk penguncian jalur pendaftaran per gelombang)
 * dan tabel re_registrations tersedia di database. Bersifat idempoten.
 */
export async function ensureReRegistrationSchema(sql: NeonQueryFunction<false, false>) {
    if (schemaEnsured) return;

    try {
        await sql`
            ALTER TABLE site_settings
            ADD COLUMN IF NOT EXISTS rereg_start DATE,
            ADD COLUMN IF NOT EXISTS rereg_end DATE,
            ADD COLUMN IF NOT EXISTS rereg_instructions TEXT,
            ADD COLUMN IF NOT EXISTS payment_portal_url TEXT DEFAULT 'https://gosiswa.com',
            ADD COLUMN IF NOT EXISTS payment_tutorial_youtube_url TEXT,
            ADD COLUMN IF NOT EXISTS major_quotas JSONB DEFAULT '{"Farmasi Klinis dan Komunitas": 72, "Produksi dan Siaran Program Televisi": 36, "Manajemen Perkantoran": 72}'::jsonb,
            ADD COLUMN IF NOT EXISTS allowed_registration_paths VARCHAR(20) NOT NULL DEFAULT 'ALL',
            ADD COLUMN IF NOT EXISTS virtual_background_url TEXT
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS re_registrations (
                id SERIAL PRIMARY KEY,
                applicant_id INTEGER NOT NULL UNIQUE REFERENCES applicants(id) ON DELETE CASCADE,
                payment_scheme VARCHAR(60) NOT NULL DEFAULT 'Minimal (DP)',
                doc_kuitansi_gosiswa TEXT NOT NULL,
                nik VARCHAR(16) NOT NULL,
                no_kk VARCHAR(16) NOT NULL,
                birth_place VARCHAR(100) NOT NULL,
                gender VARCHAR(20) NOT NULL,
                religion VARCHAR(30) NOT NULL,
                child_order INTEGER,
                siblings_count INTEGER,
                address_street TEXT NOT NULL,
                rt_rw VARCHAR(20),
                village VARCHAR(100) NOT NULL,
                district VARCHAR(100) NOT NULL,
                city VARCHAR(100) NOT NULL,
                postal_code VARCHAR(10),
                living_with VARCHAR(50),
                height_cm INTEGER,
                weight_kg INTEGER,
                blood_type VARCHAR(15),
                medical_notes TEXT,
                uniform_size VARCHAR(10) NOT NULL,
                father_nik VARCHAR(16),
                father_education VARCHAR(50),
                father_occupation VARCHAR(100),
                father_income VARCHAR(60),
                mother_nik VARCHAR(16),
                mother_education VARCHAR(50),
                mother_occupation VARCHAR(100),
                mother_income VARCHAR(60),
                guardian_name VARCHAR(150),
                guardian_phone VARCHAR(25),
                guardian_occupation VARCHAR(100),
                doc_pas_foto TEXT NOT NULL,
                doc_skl_ijazah TEXT NOT NULL,
                doc_pernyataan TEXT NOT NULL,
                rereg_status VARCHAR(40) NOT NULL DEFAULT 'Menunggu Verifikasi',
                rereg_notes TEXT,
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                verified_at TIMESTAMP WITH TIME ZONE
            )
        `;

        schemaEnsured = true;
    } catch (err) {
        // Jangan biarkan migrasi DDL otomatis membuat API crash jika koneksi lambat/timeout
        console.warn('[rereg-schema] Gagal memastikan skema (mungkin cold start/timeout):', (err as any)?.message || err);
    }
}

/**
 * Normalisasi nilai jalur pendaftaran yang diizinkan pada gelombang aktif.
 */
export function normalizeAllowedPaths(value?: string | null): 'ALL' | 'Prestasi' | 'Reguler' {
    if (value === 'Prestasi' || value === 'Reguler') {
        return value;
    }
    return 'ALL';
}

/**
 * Mengekstrak Video ID YouTube dari berbagai format URL (watch?v=, youtu.be/, shorts/, embed/).
 */
export function extractYoutubeVideoId(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}