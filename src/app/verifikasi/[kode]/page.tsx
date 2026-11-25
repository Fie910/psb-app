//src/app/verifikasi/[kode]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    XCircle,
    Clock,
    School,
    Award,
    ShieldCheck,
    GraduationCap,
    ArrowLeft,
    FileCheck2
} from 'lucide-react';

interface PublicVerifiedApplicant {
    registration_number: string;
    full_name: string;
    asal_sekolah: string;
    registration_path: string;
    status: string;
    accepted_major: string;
    rereg_status: string | null;
    verified_at: string | null;
    school_name: string;
}

export default function VerifikasiPublikPage({ params }: { params: Promise<{ kode: string }> }) {
    const resolvedParams = use(params);
    const kode = resolvedParams.kode;

    const [applicant, setApplicant] = useState<PublicVerifiedApplicant | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        async function verifyDocument() {
            try {
                setIsLoading(true);
                setError('');
                const res = await fetch(`/api/verifikasi/${encodeURIComponent(kode)}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Dokumen tidak ditemukan.');
                    setApplicant(null);
                } else {
                    setApplicant(data.applicant || null);
                }
            } catch {
                setError('Terjadi kendala jaringan saat memverifikasi dokumen.');
            } finally {
                setIsLoading(false);
            }
        }

        if (kode) {
            verifyDocument();
        }
    }, [kode]);

    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-[#f8f5f0] text-gray-800">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="font-bold text-lg text-gray-900">Memeriksa Keaslian Dokumen...</h2>
                    <p className="text-xs text-gray-500 mt-1">Menghubungkan ke database pendaftaran sekolah.</p>
                </div>
            </main>
        );
    }

    if (error || !applicant) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-gray-100 to-rose-50 font-sans">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-t-8 border-rose-500">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-rose-600 mb-2">Dokumen Tidak Ditemukan</h1>
                    <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                        {error || 'Kode verifikasi dokumen ini tidak terdaftar resmi pada sistem PPDB/PSB sekolah.'}
                    </p>
                    <div className="p-3 bg-gray-50 rounded-xl border text-xs font-mono text-gray-500 mb-6">
                        Kode: {kode}
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Beranda
                    </Link>
                </div>
            </main>
        );
    }

    const isAccepted = applicant.status === 'Diterima';
    const isReregVerified = applicant.rereg_status === 'Terverifikasi';

    return (
        <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] font-sans">
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl text-center max-w-lg w-full border-t-8 border-emerald-600">
                {/* Header Status Keaslian */}
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShieldCheck className="w-10 h-10" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Dokumen Resmi &amp; Terverifikasi
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
                    Verifikasi Keabsahan Dokumen
                </h1>
                <p className="text-xs text-gray-600 mb-6 font-semibold">
                    {applicant.school_name}
                </p>

                {/* Detail Informasi Peserta Didik */}
                <div className="bg-[#fcfaf7] p-5 rounded-2xl text-left border border-[#ebe1d6] space-y-3.5 text-xs shadow-inner">
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Nama Lengkap Peserta
                        </span>
                        <p className="font-extrabold text-base text-gray-900">{applicant.full_name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/70">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                No. Pendaftaran
                            </span>
                            <p className="font-mono font-extrabold text-teal-800 text-xs sm:text-sm">
                                {applicant.registration_number}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Asal Sekolah
                            </span>
                            <p className="font-semibold text-gray-800 truncate">{applicant.asal_sekolah}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/70">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Jalur Pendaftaran
                            </span>
                            <p className="font-bold text-gray-800">{applicant.registration_path}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Kompetensi Keahlian
                            </span>
                            <p className="font-extrabold text-gray-900">{applicant.accepted_major}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/70">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Status Seleksi
                            </span>
                            <span
                                className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                    isAccepted
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                            >
                                {applicant.status}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Status Daftar Ulang
                            </span>
                            <span
                                className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                    isReregVerified
                                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                        : applicant.rereg_status
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                            >
                                {applicant.rereg_status || 'Belum Mengisi'}
                            </span>
                        </div>
                    </div>

                    {applicant.verified_at && (
                        <div className="pt-2 border-t border-gray-200/70 text-[11px] text-gray-500 font-medium">
                            Diverifikasi pada:{' '}
                            <span className="font-bold text-gray-700">
                                {new Date(applicant.verified_at).toLocaleString('id-ID')} WIB
                            </span>
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-gray-500 mt-5 leading-relaxed">
                    Halaman ini merupakan kanal validasi publik otomatis resmi sistem informasi PPDB/PSB.
                </p>

                <div className="mt-6">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#8f472a] hover:bg-[#72361e] text-white font-bold text-xs transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Halaman Utama
                    </Link>
                </div>
            </div>
        </main>
    );
}
