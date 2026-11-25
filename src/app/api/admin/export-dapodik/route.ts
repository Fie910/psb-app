//src/app/api/admin/export-dapodik/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';
import { logAdminAudit } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
    const authCheck = await requireAdminRole(['super_admin', 'verifikator']);
    if (!authCheck.authorized) return authCheck.response;

    try {
        const sql = getDb();
        await ensureReRegistrationSchema(sql);

        const { searchParams } = new URL(request.url);
        const reregStatus = (searchParams.get('rereg_status') || '').trim();
        const major = (searchParams.get('major') || '').trim();

        const rows = await sql`
            SELECT 
                a.id,
                a.registration_number,
                a.full_name,
                a.nisn,
                r.gender,
                a.asal_sekolah,
                a.registration_path,
                a.status,
                COALESCE(a.accepted_major, a.school_choice) AS accepted_major,
                a.tanggal_lahir,
                a.phone,
                a.email,
                a.father_name,
                a.mother_name,
                r.nik,
                r.no_kk,
                r.birth_place,
                r.religion,
                r.child_order,
                r.siblings_count,
                r.address_street,
                r.rt_rw,
                r.village,
                r.district,
                r.city,
                r.postal_code,
                r.living_with,
                r.height_cm,
                r.weight_kg,
                r.blood_type,
                r.medical_notes,
                r.uniform_size,
                r.father_nik,
                r.father_education,
                r.father_occupation,
                r.father_income,
                r.mother_nik,
                r.mother_education,
                r.mother_occupation,
                r.mother_income,
                r.guardian_name,
                r.guardian_phone,
                r.guardian_occupation,
                r.payment_scheme,
                r.rereg_status,
                r.payment_amount,
                r.payment_ref_code
            FROM applicants a
            LEFT JOIN re_registrations r ON r.applicant_id = a.id
            WHERE a.status = 'Diterima'
                AND (${reregStatus} = '' OR r.rereg_status = ${reregStatus})
                AND (${major} = '' OR COALESCE(a.accepted_major, a.school_choice) = ${major})
            ORDER BY a.full_name ASC
        `;

        // Catat Audit Log
        await logAdminAudit({
            actor_id: authCheck.user.id,
            actor_name: authCheck.user.name || 'Panitia',
            actor_email: authCheck.user.email,
            actor_role: authCheck.user.role,
            action: 'EXPORT_DAPODIK',
            target_type: 'applicant',
            target_id: `${rows.length} siswa`,
            summary: `Mengekspor data siap Dapodik untuk ${rows.length} siswa diterima (Filter rereg: '${reregStatus || 'Semua'}', jurusan: '${major || 'Semua'}')`,
            metadata: {
                total_rows: rows.length,
                rereg_status: reregStatus || null,
                major: major || null,
            },
        });

        return NextResponse.json({
            students: rows,
            total: rows.length,
        });
    } catch (error) {
        console.error('Error export dapodik data:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data ekspor Dapodik.' },
            { status: 500 }
        );
    }
}
