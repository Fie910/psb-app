// src/lib/date-format.ts

/**
 * Memformat tanggal (YYYY-MM-DD, ISO timestamp, atau Date) ke format dd/mm/yyyy
 * tanpa pergeseran timezone UTC/lokal untuk string tanggal murni.
 */
export function formatDateDDMMYYYY(value?: string | Date | null, fallback = '-'): string {
    if (!value) return fallback;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;

        // Tangani format YYYY-MM-DD secara langsung tanpa konversi Date/UTC
        const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (ymdMatch) {
            const [, yyyy, mm, dd] = ymdMatch;
            return `${dd}/${mm}/${yyyy}`;
        }

        // Jika sudah dd/mm/yyyy
        const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (dmyMatch) {
            return trimmed;
        }
    }

    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return fallback;

    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

/**
 * Mengurai string dd/mm/yyyy menjadi YYYY-MM-DD (untuk input date / database).
 */
export function parseDDMMYYYYToISO(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
        const [, dd, mm, yyyy] = dmyMatch;
        return `${yyyy}-${mm}-${dd}`;
    }
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        return trimmed;
    }
    return null;
}
