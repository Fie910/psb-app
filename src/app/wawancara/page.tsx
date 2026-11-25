//src/app/wawancara/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { JaaSMeeting } from '@jitsi/react-sdk';
import Link from 'next/link';

function WawancaraContent() {
    const searchParams = useSearchParams();

    const [nisn, setNisn] = useState('');
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoFilled, setAutoFilled] = useState(false);

    const [isVerified, setIsVerified] = useState(false);
    const [applicantData, setApplicantData] = useState<{ full_name: string, registration_number: string } | null>(null);
    const [jaasToken, setJaasToken] = useState('');
    const [jaasAppId, setJaasAppId] = useState('');
    const [virtualBgUrl, setVirtualBgUrl] = useState<string>('');

    // Baca query parameter nisn dan tgl (dari halaman /cek-status)
    useEffect(() => {
        const queryNisn = searchParams.get('nisn');
        const queryTgl = searchParams.get('tgl') || searchParams.get('tanggal_lahir');

        if (queryNisn || queryTgl) {
            if (queryNisn) setNisn(queryNisn.trim());
            if (queryTgl) setTanggalLahir(queryTgl.trim().split('T')[0]);
            setAutoFilled(true);
        }
    }, [searchParams]);

    // Ambil Pengaturan Sekolah (Virtual Background)
    useEffect(() => {
        async function fetchSettings() {
            try {
                const sRes = await fetch('/api/settings');
                const sData = await sRes.json();
                if (sData.settings?.virtual_background_url) {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    setVirtualBgUrl(`${origin}/api/virtual-background?v=${encodeURIComponent(sData.settings.virtual_background_url)}`);
                }
            } catch (err) {
                console.warn('Gagal memuat setting background:', err);
            }
        }
        fetchSettings();
    }, []);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/wawancara/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nisn, tanggal_lahir: tanggalLahir }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
            } else {
                setApplicantData(data.applicant);

                // Minta Token JaaS
                const tokenRes = await fetch('/api/jaas-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomName: `Wawancara-PSB-${data.applicant.registration_number}`,
                        userName: data.applicant.full_name,
                        isModerator: false, // Siswa bukan moderator
                    }),
                });
                const tokenData = await tokenRes.json();

                if (tokenRes.ok && tokenData.token) {
                    if (!tokenData.appId && !process.env.NEXT_PUBLIC_JAAS_APP_ID) {
                        setError('Konfigurasi JaaS App ID belum tersedia di server.');
                        return;
                    }
                    setJaasToken(tokenData.token);
                    setJaasAppId(tokenData.appId || '');
                    setIsVerified(true);
                } else {
                    setError(tokenData.error || 'Gagal menyiapkan ruang wawancara.');
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isVerified || !applicantData?.registration_number) return;
        const regNumber = applicantData.registration_number;
        const sendPresence = (active: boolean) => {
            fetch('/api/wawancara/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_number: regNumber, active }),
                keepalive: !active,
            }).catch(() => {});
        };
        const handleLeave = () => {
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                const blob = new Blob(
                    [JSON.stringify({ registration_number: regNumber, active: false })],
                    { type: 'application/json' }
                );
                navigator.sendBeacon('/api/wawancara/presence', blob);
            } else {
                sendPresence(false);
            }
        };
        sendPresence(true);
        const interval = setInterval(() => sendPresence(true), 15000);
        window.addEventListener('pagehide', handleLeave);
        window.addEventListener('beforeunload', handleLeave);
        return () => {
            clearInterval(interval);
            window.removeEventListener('pagehide', handleLeave);
            window.removeEventListener('beforeunload', handleLeave);
            sendPresence(false);
        };
    }, [isVerified, applicantData?.registration_number]);

    if (isVerified && applicantData) {
        return (
            <main className="min-h-screen bg-gray-900 flex flex-col">
                {/* Header */}
                <header className="bg-gray-800 text-white p-4 shadow-md shrink-0">
                    <h1 className="font-bold text-lg">Ruang Wawancara PSB</h1>
                    <p className="text-sm text-gray-400">{applicantData.full_name} ({applicantData.registration_number})</p>
                </header>

                {/* Area Jitsi */}
                <div className="flex-1 w-full relative bg-gray-900">
                    <div className="absolute inset-0">
                        <JaaSMeeting
                            appId={jaasAppId || process.env.NEXT_PUBLIC_JAAS_APP_ID || ''}
                            jwt={jaasToken}
                            roomName={`Wawancara-PSB-${applicantData.registration_number}`}
                            configOverwrite={{
                                startWithAudioMuted: true,
                                startWithVideoMuted: false,
                                prejoinPageEnabled: true,
                                disableDeepLinking: true,
                                disableVirtualBackground: false,
                                customVirtualBackgrounds: (virtualBgUrl ? [{ id: 'school-custom-bg', src: virtualBgUrl, title: 'Background Sekolah' }] : []) as any,
                            }}
                            interfaceConfigOverwrite={{
                                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                                MOBILE_APP_PROMO: false,
                            }}
                            onApiReady={(externalApi) => {
                                console.log('Jitsi API siap');
                                if (virtualBgUrl) {
                                    const applySchoolBackground = () => {
                                        try {
                                            externalApi.executeCommand('setVirtualBackground', true, virtualBgUrl);
                                        } catch (err) {
                                            console.warn('Gagal menerapkan virtual background otomatis:', err);
                                        }
                                    };

                                    applySchoolBackground();

                                    externalApi.addListener('videoConferenceJoined', () => {
                                        applySchoolBackground();
                                        setTimeout(applySchoolBackground, 1500);
                                    });

                                    externalApi.addListener('trackAdded', (track: { type?: string; local?: boolean }) => {
                                        if (track?.type === 'video' && track?.local) {
                                            setTimeout(applySchoolBackground, 800);
                                        }
                                    });
                                }
                            }}
                            getIFrameRef={(iframeRef) => {
                                // Paksa iframe memenuhi seluruh area kontainer
                                iframeRef.style.height = '100%';
                                iframeRef.style.width = '100%';
                                iframeRef.style.border = 'none';
                                iframeRef.style.position = 'absolute';
                                iframeRef.style.top = '0';
                                iframeRef.style.left = '0';
                            }}
                        />
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-[#8c7a75] via-[#b48c6c] to-[#c99e76]">
            <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-[#fffcf8]/90 backdrop-blur-xl">
                <h1 className="text-2xl font-bold text-center mb-2 text-[#2b1d18]">Masuk Ruang Wawancara</h1>
                <p className="text-center text-sm font-semibold mb-6 text-[#8f472a]">SMK KH. A. WAHAB MUHSIN</p>

                {autoFilled && (
                    <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs">
                        <span className="font-bold block mb-0.5">Data Terisi Otomatis</span>
                        Data NISN dan Tanggal Lahir telah terisi dari pencarian status Anda. Silakan periksa lalu klik <strong>Masuk Wawancara</strong>.
                    </div>
                )}

                {error && <p className="text-red-600 text-sm font-semibold mb-4 text-center bg-red-100 p-2 rounded">{error}</p>}

                <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#4a342a] mb-1.5">NISN</label>
                        <input type="text" value={nisn} onChange={(e) => setNisn(e.target.value)} className="w-full rounded-xl border border-[#d6c5b3] bg-white/50 px-4 py-2.5 text-[#2b1d18] focus:border-[#b85c38] focus:outline-none" placeholder="10 digit NISN" maxLength={10} required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#4a342a] mb-1.5">Tanggal Lahir</label>
                        <input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} className="w-full rounded-xl border border-[#d6c5b3] bg-white/50 px-4 py-2.5 text-[#2b1d18] focus:border-[#b85c38] focus:outline-none" required />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-3 mt-2 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-bold shadow-lg disabled:opacity-50 transition-all">
                        {isLoading ? 'Memverifikasi...' : 'Masuk Wawancara'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/cek-status" className="text-sm font-semibold text-[#8f472a] hover:underline">
                        &larr; Kembali ke Cek Status
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function WawancaraPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-semibold text-teal-300">Menyiapkan Ruang Wawancara...</p>
                </main>
            }
        >
            <WawancaraContent />
        </Suspense>
    );
}
