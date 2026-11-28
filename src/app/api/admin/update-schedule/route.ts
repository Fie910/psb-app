//src/app/api/admin/update-schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminRole } from '@/lib/auth/server';
import { logAdminAudit } from '@/lib/audit-log';

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdminRole(['super_admin', 'verifikator']);
  if (!authCheck.authorized) return authCheck.response;

  try {
    const sql = getDb();
    const {
      id,
      test_date,
      test_time,
      test_location,
      interview_date,
      interview_time,
      interview_link,
      accepted_major,
    } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    await sql`
            UPDATE applicants 
            SET 
                test_date = ${test_date || null},
                test_time = ${test_time || null},
                test_location = ${test_location || null},
                interview_date = ${interview_date || null},
                interview_time = ${interview_time || null},
                interview_link = ${interview_link || null},
                accepted_major = ${accepted_major || null}
            WHERE id = ${id}
        `;

    return NextResponse.json({ message: 'Jadwal dan jurusan berhasil disimpan' });
  } catch (error) {
    console.error('Error update schedule:', error);
    return NextResponse.json({ error: 'Gagal menyimpan jadwal' }, { status: 500 });
  }
}