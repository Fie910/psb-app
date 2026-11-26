//src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { ensureReRegistrationSchema, normalizeAllowedPaths } from '@/lib/rereg-schema';
import { logAdminAudit } from '@/lib/audit-log';

export async function PUT(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const body = await request.json();
        const {
            is_open_manual,
            use_auto_schedule,
            wave_name,
            allowed_registration_paths,
            contact_wa,
            reg_start,
            reg_end,
            verif_start,
            verif_end,
            test_start,
            test_end,
            announce_start,
            announce_end,
            rereg_start,
            rereg_end,
            rereg_instructions,
            payment_portal_url,
            payment_tutorial_youtube_url,
            major_quotas,
            active_tests,
            test_durations,
            school_name,
            academic_year,
            foundation_name,
            school_address,
            school_city,
            headmaster_name,
            headmaster_nip,
            logo_url,
            virtual_background_url,
        } = body;

        const cleanAllowedPaths = normalizeAllowedPaths(allowed_registration_paths);
        const cleanPortalUrl = (payment_portal_url || '').trim() || 'https://gosiswa.com';
        const cleanYoutubeUrl = (payment_tutorial_youtube_url || '').trim() || null;
        const cleanReregInstructions = (rereg_instructions || '').trim() || null;
        const quotasPayload = major_quotas && typeof major_quotas === 'object'
            ? major_quotas
            : {
                'Farmasi Klinis dan Komunitas': 72,
                'Produksi dan Siaran Program Televisi': 36,
                'Manajemen Perkantoran': 72,
            };

        await sql`
            UPDATE site_settings 
            SET 
                is_open_manual = ${is_open_manual},
                use_auto_schedule = ${use_auto_schedule},
                start_date = ${reg_start || null},
                end_date = ${reg_end || null},
                wave_name = ${wave_name},
                allowed_registration_paths = ${cleanAllowedPaths},
                contact_wa = ${contact_wa},
                reg_start = ${reg_start || null},
                reg_end = ${reg_end || null},
                verif_start = ${verif_start || null},
                verif_end = ${verif_end || null},
                test_start = ${test_start || null},
                test_end = ${test_end || null},
                announce_start = ${announce_start || null},
                announce_end = ${announce_end || null},
                rereg_start = ${rereg_start || null},
                rereg_end = ${rereg_end || null},
                rereg_instructions = ${cleanReregInstructions},
                payment_portal_url = ${cleanPortalUrl},
                payment_tutorial_youtube_url = ${cleanYoutubeUrl},
                major_quotas = ${JSON.stringify(quotasPayload)}::jsonb,
                active_tests = ${JSON.stringify(active_tests || [])}::jsonb,
                test_durations = ${JSON.stringify(test_durations || {})}::jsonb,
                school_name = ${school_name},
                academic_year = ${(academic_year || '').trim() || '2027/2028'},
                foundation_name = ${foundation_name},
                school_address = ${school_address},
                school_city = ${school_city},
                headmaster_name = ${headmaster_name},
                headmaster_nip = ${headmaster_nip},
                logo_url = ${logo_url},
                virtual_background_url = ${virtual_background_url || null}
            WHERE id = 1
        `;

        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: authCheck.user.name || 'Panitia',
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'UPDATE_SETTINGS',
            target_type: 'site_settings',
            target_id: '1',
            summary: `Memperbarui pengaturan sistem PSB (Gelombang: ${wave_name || 'Standar'}, Sekolah: ${school_name})`,
            metadata: {
                is_open_manual,
                use_auto_schedule,
                wave_name,
                school_name,
                major_quotas: quotasPayload,
            },
        });

        return NextResponse.json({ message: 'Pengaturan disimpan' });
    } catch (error) {
        console.error('Error save settings:', error);
        return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
    }
}