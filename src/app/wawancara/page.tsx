//src/app/wawancara/page.tsx
'use client';

import { useState } from 'react';
import { JaaSMeeting } from '@jitsi/react-sdk';
import Link from 'next/link';

export default function WawancaraPage() {
    const [nisn, setNisn] = useState('');
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [isVerified, setIsVerified] = useState(false);
    const [applicantData, setApplicantData] = useState<{ full_name: string, registration_number: string } | null>(null);
    const [jaasToken, setJaasToken] = useState('');
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

                if (tokenRes.ok) {
                    setJaasToken(tokenData.token);
                    setIsVerified(true);
                } else {
                    setError('Gagal menyiapkan ruang wawancara.');
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

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
                            appId={process.env.NEXT_PUBLIC_JAAS_APP_ID || ''}
                            jwt={jaasToken}
                            roomName={`Wawancara-PSB-${applicantData.registration_number}`}
                            configOverwrite={{
                                startWithAudioMuted: true,
                                startWithVideoMuted: false,
                                prejoinPageEnabled: true,
                                disableDeepLinking: true,
                            }}
                            interfaceConfigOverwrite={{
                                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                                MOBILE_APP_PROMO: false,
                            }}
                            onApiReady={(externalApi) => {
                                console.log('Jitsi API siap');
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