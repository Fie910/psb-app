//src/app/api/admin/applicants/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/server';
import { ensureReRegistrationSchema } from '@/lib/rereg-schema';

export async function GET() {
  const authCheck = await requireAdminAuth();
  if (!authCheck.authorized) return authCheck.response;

  try {
    const sql = getDb();
    await ensureReRegistrationSchema(sql);

    const applicants = await sql`
      SELECT 
        a.id, a.registration_number, a.full_name, a.email, a.phone, 
        a.asal_sekolah, a.father_name, a.mother_name, a.parent_phone, 
        a.school_choice, a.school_choice_2, a.registration_path,
        a.document_kk, a.document_akta, a.document_prestasi, a.document_notes, a.revision_fields, 
        a.status, a.created_at, a.nisn, a.tanggal_lahir,
        TO_CHAR(a.test_date, 'YYYY-MM-DD') as test_date, 
        TO_CHAR(a.test_time, 'HH24:MI') as test_time, 
        a.test_location,
        TO_CHAR(a.interview_date, 'YYYY-MM-DD') as interview_date,
        TO_CHAR(a.interview_time, 'HH24:MI') as interview_time,
        a.interview_link,
        a.accepted_major, a.accepted_at,
        r.id as rereg_id,
        r.rereg_status,
        r.rereg_notes,
        r.payment_scheme,
        r.doc_kuitansi_gosiswa,
        r.doc_pas_foto,
        r.doc_skl_ijazah,
        r.doc_pernyataan,
        r.nik,
        r.no_kk,
        r.birth_place,
        r.gender,
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
        r.submitted_at as rereg_submitted_at,
        r.verified_at as rereg_verified_at
      FROM applicants a
      LEFT JOIN re_registrations r ON r.applicant_id = a.id
      ORDER BY a.created_at DESC
    `;
    return NextResponse.json({ applicants });
  } catch (error) {
    console.error('Error fetch applicants:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}