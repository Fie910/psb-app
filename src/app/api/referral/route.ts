// src/app/api/referral/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDbRetry } from '@/lib/db';
import { ensureReferralSchema, generateReferralCode } from '@/lib/referral-schema';
import { normalizeIndonesianPhone } from '@/lib/whatsapp-templates';

const VALID_JABATAN = ['Guru Mapel', 'Guru BK', 'Wali Kelas', 'Wakil Kepala'];

export async function GET(request: NextRequest) {
    try {
        const sql = getDb();
        await ensureReferralSchema(sql);

        const { searchParams } = new URL(request.url);
        const code = (searchParams.get('code') || '').trim().toUpperCase();
        const name = (searchParams.get('name') || '').trim();
        const phone = (searchParams.get('phone') || '').trim();

        if (code) {
            const rows = await withDbRetry(() => sql`
                SELECT id, code, referrer_name, referrer_phone, origin_school, jabatan, status, approved_at, created_at
                FROM referral_codes
                WHERE code = ${code}
                LIMIT 1
            `);
            if (rows.length === 0) {
                return NextResponse.json({ valid: false, error: 'Kode referal tidak ditemukan.' }, { status: 404 });
            }
            const ref = rows[0];
            return NextResponse.json({
                valid: ref.status === 'active',
                status: ref.status,
                referral: ref,
            });
        }

        if (name && phone) {
            const normTarget = normalizeIndonesianPhone(phone);
            if (!normTarget) {
                return NextResponse.json({ error: 'Format nomor WhatsApp tidak valid.' }, { status: 400 });
            }
            const normName = name.toLowerCase().replace(/\s+/g, ' ').trim();

            const rows = await withDbRetry(() => sql`
                SELECT
                    r.id, r.code, r.referrer_name, r.referrer_phone, r.origin_school, r.jabatan, r.status, r.approved_at, r.created_at,
                    COUNT(a.id)::int AS applicant_count
                FROM referral_codes r
                LEFT JOIN applicants a ON UPPER(TRIM(a.referral_code)) = r.code
                WHERE REGEXP_REPLACE(LOWER(TRIM(r.referrer_name)), '\\s+', ' ', 'g') = ${normName}
                GROUP BY r.id
                ORDER BY r.created_at DESC
            `);

            const matched = rows.filter(
                (r: any) => normalizeIndonesianPhone(r.referrer_phone) === normTarget
            );

            if (matched.length === 0) {
                return NextResponse.json({ error: 'Data kode referal tidak ditemukan untuk nama dan nomor WA tersebut.' }, { status: 404 });
            }

            return NextResponse.json({ referrals: matched });
        }

        return NextResponse.json({ error: 'Parameter code atau name & phone diperlukan.' }, { status: 400 });
    } catch (error) {
        console.error('Error GET /api/referral:', error);
        return NextResponse.json({ error: 'Gagal memeriksa kode referal.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        await ensureReferralSchema(sql);

        const body = await request.json();
        const referrerName = String(body.referrer_name || '').trim();
        const referrerPhone = String(body.referrer_phone || '').trim();
        const originSchool = String(body.origin_school || '').trim();
        const jabatan = String(body.jabatan || '').trim();

        if (!referrerName || !referrerPhone || !originSchool || !VALID_JABATAN.includes(jabatan)) {
            return NextResponse.json(
                { error: 'Nama, No. WA, Sekolah/Pesantren Asal, dan Jabatan yang valid wajib diisi.' },
                { status: 400 }
            );
        }

        const normPhone = normalizeIndonesianPhone(referrerPhone);
        if (!normPhone) {
            return NextResponse.json({ error: 'Nomor WhatsApp tidak valid.' }, { status: 400 });
        }

        let autoApprove = false;
        try {
            const settingsRows = await sql`SELECT referral_auto_approve FROM site_settings ORDER BY id ASC LIMIT 1`;
            autoApprove = Boolean(settingsRows[0]?.referral_auto_approve);
        } catch {
            autoApprove = false;
        }

        let code = '';
        for (let attempt = 0; attempt < 8; attempt++) {
            const candidate = generateReferralCode(5);
            const exists = await sql`SELECT id FROM referral_codes WHERE code = ${candidate} LIMIT 1`;
            if (exists.length === 0) {
                code = candidate;
                break;
            }
        }
        if (!code) {
            return NextResponse.json({ error: 'Gagal menghasilkan kode referal unik, silakan coba lagi.' }, { status: 500 });
        }

        const status = autoApprove ? 'active' : 'pending';
        const inserted = await sql`
            INSERT INTO referral_codes (code, referrer_name, referrer_phone, origin_school, jabatan, status, approved_at)
            VALUES (
                ${code},
                ${referrerName},
                ${normPhone},
                ${originSchool},
                ${jabatan},
                ${status},
                ${autoApprove ? new Date().toISOString() : null}
            )
            RETURNING *
        `;

        return NextResponse.json({
            message: autoApprove
                ? 'Kode referal berhasil dibuat dan langsung aktif!'
                : 'Kode referal berhasil didaftarkan dan menunggu persetujuan admin.',
            referral: inserted[0],
        });
    } catch (error) {
        console.error('Error POST /api/referral:', error);
        return NextResponse.json({ error: 'Gagal mendaftarkan kode referal.' }, { status: 500 });
    }
}
