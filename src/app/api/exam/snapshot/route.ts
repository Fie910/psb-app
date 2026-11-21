import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { applicant_id, category, image_url } = await request.json();

        if (!applicant_id || !category || !image_url) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        await sql`
      INSERT INTO exam_snapshots (applicant_id, category, image_url)
      VALUES (${applicant_id}, ${category}, ${image_url})
    `;

        return NextResponse.json({ message: 'Snapshot tersimpan' }, { status: 200 });
    } catch (error) {
        console.error('Error save snapshot:', error);
        return NextResponse.json({ error: 'Gagal menyimpan snapshot' }, { status: 500 });
    }
}