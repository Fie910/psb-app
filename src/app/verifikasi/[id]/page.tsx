//src/app/verifikasi/[id]/page.tsx
'use client';
import { use, useEffect, useState } from 'react';

type VerifikasiApplicant = {
    full_name: string;
    nisn: string;
    registration_number: string;
    status: string;
    accepted_major: string | null;
    rereg_status: string | null;
    payment_scheme: string | null;
    uniform_size: string | null;
};

export default function VerifikasiPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [data, setData] = useState<VerifikasiApplicant | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/verifikasi/${resolvedParams.id}`)
            .then(res => res.json())
            .then((d: { error?: string; applicant?: VerifikasiApplicant }) => {
                if (d.error) {
                    setError(d.error);
                } else if (d.applicant) {
                    setData(d.applicant);
                } else {
                    setError('Data tidak ditemukan');
                }
            })
            .catch(() => setError('Gagal memeriksa keaslian dokumen'));
    }, [resolvedParams.id]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border-t-8 border-red-500">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Dokumen Tidak Valid</h1>
                    <p className="text-gray-600">Dokumen ini tidak ditemukan di sistem PSB atau status siswa bukan &quot;Diterima&quot;.</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center font-bold text-xl text-gray-700 bg-[#f5efe6]">
                Memeriksa keaslian dokumen...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-t-8 border-emerald-600">
                <div className="text-6xl mb-4">✅</div>
                <h1 className="text-2xl font-extrabold text-emerald-700 mb-1">Dokumen Asli &amp; Valid</h1>
                <p className="text-sm text-gray-600 mb-6">Terdaftar resmi pada sistem Penerimaan Siswa Baru SMK KH. A. Wahab Muhsin.</p>

                <div className="bg-gray-50 p-5 rounded-2xl text-left border border-gray-200 space-y-3 text-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Nama Siswa</p>
                        <p className="font-extrabold text-lg text-gray-900">{data.full_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">NISN</p>
                            <p className="font-mono font-bold text-gray-900">{data.nisn}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">No. Pendaftaran</p>
                            <p className="font-mono font-bold text-gray-900">{data.registration_number}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Kompetensi Keahlian</p>
                        <p className="font-bold text-gray-900">{data.accepted_major || '-'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Status Seleksi</p>
                            <p className="font-extrabold text-emerald-700 uppercase">{data.status}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Status Daftar Ulang</p>
                            <p className={`font-extrabold ${data.rereg_status === 'Terverifikasi'
                                ? 'text-emerald-700'
                                : data.rereg_status
                                    ? 'text-blue-700'
                                    : 'text-amber-700'
                                }`}>
                                {data.rereg_status || 'Belum Daftar Ulang'}
                            </p>
                        </div>
                    </div>
                    {data.rereg_status && (
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Pembayaran</p>
                                <p className="font-bold text-gray-800">{data.payment_scheme || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Ukuran Seragam</p>
                                <p className="font-bold text-gray-800">{data.uniform_size ? `Ukuran ${data.uniform_size}` : '-'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );


}