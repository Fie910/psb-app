//src/app/verifikasi/[id]/page.tsx
'use client';
import { use, useEffect, useState } from 'react';

export default function VerifikasiPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/verifikasi/${resolvedParams.id}`)
            .then(res => res.json())
            .then(d => {
                if (d.error) setError(d.error);
                else setData(d.applicant);
            });
    }, [resolvedParams.id]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border-t-8 border-red-500">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Surat Tidak Valid</h1>
                    <p className="text-gray-600">Dokumen ini tidak ditemukan di sistem PSB atau status siswa bukan "Diterima".</p>
                </div>
            </div>
        );
    }

    if (!data) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-gray-600">Memeriksa keaslian surat...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#8c7a75] p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-t-8 border-green-500">
                <div className="text-6xl mb-4">✅</div>
                <h1 className="text-2xl font-bold text-green-600 mb-2">Surat Asli & Valid</h1>
                <p className="text-gray-600 mb-6">Dokumen ini terdaftar resmi di sistem Penerimaan Siswa Baru.</p>

                <div className="bg-gray-50 p-5 rounded-xl text-left border border-gray-200 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Nama Siswa:</p>
                        <p className="font-bold text-lg text-black">{data.full_name}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">NISN:</p>
                        <p className="font-mono font-bold text-black">{data.nisn}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">No. Pendaftaran:</p>
                        <p className="font-mono font-bold text-black">{data.registration_number}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Status:</p>
                        <p className="font-bold text-green-600 uppercase">{data.status}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}