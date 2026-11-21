//src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';

export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        const body = await request.json();
        const {
            is_open_manual, use_auto_schedule, wave_name, contact_wa,
            reg_start, reg_end, verif_start, verif_end, test_start, test_end, announce_start, announce_end,
            active_tests, test_durations,
            school_name, foundation_name, school_address, school_city, headmaster_name, headmaster_nip, logo_url
        } = body;

        await sql`
            UPDATE site_settings 
            SET 
                is_open_manual = ${is_open_manual},
                use_auto_schedule = ${use_auto_schedule},
                start_date = ${reg_start || null},
                end_date = ${reg_end || null},
                wave_name = ${wave_name},
                contact_wa = ${contact_wa},
                reg_start = ${reg_start || null},
                reg_end = ${reg_end || null},
                verif_start = ${verif_start || null},
                verif_end = ${verif_end || null},
                test_start = ${test_start || null},
                test_end = ${test_end || null},
                announce_start = ${announce_start || null},
                announce_end = ${announce_end || null},
                active_tests = ${JSON.stringify(active_tests || [])}::jsonb,
                test_durations = ${JSON.stringify(test_durations || {})}::jsonb,
                school_name = ${school_name},
                foundation_name = ${foundation_name},
                school_address = ${school_address},
                school_city = ${school_city},
                headmaster_name = ${headmaster_name},
                headmaster_nip = ${headmaster_nip},
                logo_url = ${logo_url}
            WHERE id = 1
        `;

        return NextResponse.json({ message: 'Pengaturan disimpan' });
    } catch (error) {
        console.error('Error save settings:', error);
        return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
    }
}