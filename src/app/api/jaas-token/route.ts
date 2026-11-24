//src/app/api/jaas-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const roomName = typeof body?.roomName === 'string' ? body.roomName.trim() : '';
        const userName = typeof body?.userName === 'string' && body.userName.trim() ? body.userName.trim() : 'Peserta';
        const isModerator = body?.isModerator === true;

        if (!roomName) {
            return NextResponse.json({ error: 'Parameter roomName wajib diisi.' }, { status: 400 });
        }

        const appId = process.env.JAAS_APP_ID || process.env.NEXT_PUBLIC_JAAS_APP_ID;
        const privateKeyRaw = process.env.JAAS_PRIVATE_KEY || process.env.NEXT_JAAS_PRIVATE_KEY;
        const kid = process.env.JAAS_KID || process.env.NEXT_JAAS_KID;

        if (!privateKeyRaw || !appId || !kid) {
            console.error('Konfigurasi JaaS belum lengkap:', {
                hasAppId: !!appId,
                hasKey: !!privateKeyRaw,
                hasKid: !!kid
            });
            return NextResponse.json({
                error: 'Konfigurasi JaaS belum lengkap di server. Pastikan JAAS_APP_ID (atau NEXT_PUBLIC_JAAS_APP_ID), JAAS_PRIVATE_KEY, dan JAAS_KID terpasang.'
            }, { status: 500 });
        }

        // 1. Siapkan Private Key untuk algoritma RS256
        let privateKeyPem = privateKeyRaw.trim();
        if (privateKeyPem.startsWith('"') && privateKeyPem.endsWith('"')) {
            privateKeyPem = privateKeyPem.slice(1, -1);
        }
        privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');

        const privateKey = await importPKCS8(privateKeyPem, 'RS256');

        // 2. Susun Payload JWT sesuai standar 8x8 JaaS
        const now = Math.floor(Date.now() / 1000);
        const token = await new SignJWT({
            aud: 'jitsi',
            iss: 'chat',
            sub: appId,
            room: roomName,
            context: {
                user: {
                    name: userName,
                    moderator: isModerator,
                },
                features: {
                    recording: 'false',
                    livestreaming: 'false',
                    'screen-sharing': 'true',
                },
            },
            exp: now + 7200, // Token berlaku 2 jam
            nbf: now - 10,
        })
            .setProtectedHeader({
                alg: 'RS256',
                kid: kid,
                typ: 'JWT',
            })
            .sign(privateKey);

        return NextResponse.json({ token, appId }, { status: 200 });
    } catch (error: any) {
        console.error('Error generate JWT:', error);
        return NextResponse.json({
            error: error?.message || 'Gagal membuat token JaaS'
        }, { status: 500 });
    }
}