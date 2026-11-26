// src/app/api/admin/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDbRetry } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';

const DEFAULT_QUOTAS: Record<string, number> = {
    'Farmasi Klinis dan Komunitas': 72,
    'Produksi dan Siaran Program Televisi': 72,
    'Manajemen Perkantoran': 72,
};

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator', 'pewawancara', 'bendahara']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const { searchParams } = new URL(request.url);
        const pathFilter = searchParams.get('path') || 'ALL';
        const isFiltered = pathFilter === 'Prestasi' || pathFilter === 'Reguler';

        // 1. Settings & major_quotas
        let schoolName = 'SMK KH. A. WAHAB MUHSIN';
        let academicYear = '2027/2028';
        let majorQuotas: Record<string, number> = { ...DEFAULT_QUOTAS };

        try {
            const settingsRows = await withDbRetry(() => sql`
                SELECT *
                FROM site_settings
                ORDER BY id ASC
                LIMIT 1
            `);
            if (settingsRows.length > 0) {
                const s = settingsRows[0];
                if (s.school_name) schoolName = s.school_name;
                if (s.academic_year) academicYear = s.academic_year;
                if (s.major_quotas) {
                    const parsed = typeof s.major_quotas === 'string'
                        ? JSON.parse(s.major_quotas)
                        : s.major_quotas;
                    if (parsed && typeof parsed === 'object') {
                        majorQuotas = { ...DEFAULT_QUOTAS, ...parsed };
                    }
                }
            }
        } catch (e) {
            console.warn('Warning reading site_settings in statistics:', e);
        }

        // 2. Total & Status breakdown
        const statusRows = isFiltered
            ? await sql`
                SELECT status, COUNT(*)::int AS count
                FROM applicants
                WHERE registration_path = ${pathFilter}
                GROUP BY status
            `
            : await sql`
                SELECT status, COUNT(*)::int AS count
                FROM applicants
                GROUP BY status
            `;

        const byStatus: Record<string, number> = {
            'Pending': 0,
            'Perbaikan': 0,
            'Siap Tes dan/atau Wawancara': 0,
            'Diterima': 0,
            'Ditolak': 0,
        };
        let totalApplicants = 0;
        for (const row of statusRows) {
            const st = row.status || 'Pending';
            byStatus[st] = (byStatus[st] || 0) + Number(row.count || 0);
            totalApplicants += Number(row.count || 0);
        }

        // 3. Registration path breakdown (always global for comparison)
        const pathRows = await sql`
            SELECT COALESCE(registration_path, 'Reguler') AS path, COUNT(*)::int AS count
            FROM applicants
            GROUP BY COALESCE(registration_path, 'Reguler')
        `;
        const byPath: Record<string, number> = { Prestasi: 0, Reguler: 0 };
        for (const row of pathRows) {
            const p = row.path === 'Prestasi' ? 'Prestasi' : 'Reguler';
            byPath[p] = (byPath[p] || 0) + Number(row.count || 0);
        }

        // 4. Quota fulfillment per major (Diterima)
        const acceptedRows = isFiltered
            ? await sql`
                SELECT COALESCE(NULLIF(TRIM(accepted_major), ''), school_choice) AS major, COUNT(*)::int AS count
                FROM applicants
                WHERE status = 'Diterima' AND registration_path = ${pathFilter}
                GROUP BY COALESCE(NULLIF(TRIM(accepted_major), ''), school_choice)
            `
            : await sql`
                SELECT COALESCE(NULLIF(TRIM(accepted_major), ''), school_choice) AS major, COUNT(*)::int AS count
                FROM applicants
                WHERE status = 'Diterima'
                GROUP BY COALESCE(NULLIF(TRIM(accepted_major), ''), school_choice)
            `;

        const acceptedByMajor: Record<string, number> = {};
        for (const row of acceptedRows) {
            if (row.major) {
                acceptedByMajor[row.major] = Number(row.count || 0);
            }
        }

        const allMajors = Array.from(new Set([...Object.keys(majorQuotas), ...Object.keys(acceptedByMajor)]));
        const quotaStats = allMajors.map((major) => {
            const quota = Number(majorQuotas[major] || 0);
            const accepted = Number(acceptedByMajor[major] || 0);
            const remaining = Math.max(0, quota - accepted);
            const percentage = quota > 0 ? Math.min(100, Math.round((accepted / quota) * 100)) : 0;
            return { major, quota, accepted, remaining, percentage };
        });

        // 5. Daily trend (last 14 days)
        const trendRows = isFiltered
            ? await sql`
                SELECT TO_CHAR(DATE(created_at AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
                FROM applicants
                WHERE created_at >= NOW() - INTERVAL '14 days' AND registration_path = ${pathFilter}
                GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
                ORDER BY day ASC
            `
            : await sql`
                SELECT TO_CHAR(DATE(created_at AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
                FROM applicants
                WHERE created_at >= NOW() - INTERVAL '14 days'
                GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
                ORDER BY day ASC
            `;

        const dailyTrend = trendRows.map((r: any) => ({
            day: r.day,
            count: Number(r.count || 0),
        }));

        // 6. Top 10 asal_sekolah
        const schoolRows = isFiltered
            ? await sql`
                SELECT COALESCE(NULLIF(TRIM(asal_sekolah), ''), 'Tidak Diisi') AS school, COUNT(*)::int AS count
                FROM applicants
                WHERE registration_path = ${pathFilter}
                GROUP BY COALESCE(NULLIF(TRIM(asal_sekolah), ''), 'Tidak Diisi')
                ORDER BY count DESC, school ASC
                LIMIT 10
            `
            : await sql`
                SELECT COALESCE(NULLIF(TRIM(asal_sekolah), ''), 'Tidak Diisi') AS school, COUNT(*)::int AS count
                FROM applicants
                GROUP BY COALESCE(NULLIF(TRIM(asal_sekolah), ''), 'Tidak Diisi')
                ORDER BY count DESC, school ASC
                LIMIT 10
            `;

        const topSchools = schoolRows.map((r: any) => ({
            school: r.school,
            count: Number(r.count || 0),
        }));

        // 7. Re-registration & verified finance summary
        const reregRows = isFiltered
            ? await sql`
                SELECT
                    COALESCE(r.rereg_status, 'Belum Daftar Ulang') AS rereg_status,
                    COUNT(*)::int AS count,
                    COALESCE(SUM(CASE WHEN r.rereg_status = 'Terverifikasi' THEN COALESCE(r.payment_amount, 0) ELSE 0 END), 0)::bigint AS verified_amount
                FROM applicants a
                LEFT JOIN re_registrations r ON r.applicant_id = a.id
                WHERE a.status = 'Diterima' AND a.registration_path = ${pathFilter}
                GROUP BY COALESCE(r.rereg_status, 'Belum Daftar Ulang')
            `
            : await sql`
                SELECT
                    COALESCE(r.rereg_status, 'Belum Daftar Ulang') AS rereg_status,
                    COUNT(*)::int AS count,
                    COALESCE(SUM(CASE WHEN r.rereg_status = 'Terverifikasi' THEN COALESCE(r.payment_amount, 0) ELSE 0 END), 0)::bigint AS verified_amount
                FROM applicants a
                LEFT JOIN re_registrations r ON r.applicant_id = a.id
                WHERE a.status = 'Diterima'
                GROUP BY COALESCE(r.rereg_status, 'Belum Daftar Ulang')
            `;

        const reregSummary: Record<string, number> = {
            'Menunggu Verifikasi': 0,
            'Perbaikan Daftar Ulang': 0,
            'Terverifikasi': 0,
            'Belum Daftar Ulang': 0,
        };
        let totalVerifiedFunds = 0;

        for (const row of reregRows) {
            const st = row.rereg_status || 'Belum Daftar Ulang';
            reregSummary[st] = (reregSummary[st] || 0) + Number(row.count || 0);
            totalVerifiedFunds += Number(row.verified_amount || 0);
        }

        return NextResponse.json({
            schoolName,
            academicYear,
            pathFilter,
            totalApplicants,
            byStatus,
            byPath,
            quotaStats,
            dailyTrend,
            topSchools,
            reregSummary,
            totalVerifiedFunds,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching admin statistics:', error);
        return NextResponse.json({ error: 'Gagal memuat statistik eksekutif.' }, { status: 500 });
    }
}
