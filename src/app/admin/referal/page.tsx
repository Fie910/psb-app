// src/app/admin/referal/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import {
    ArrowLeft,
    QrCode,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    Users,
} from 'lucide-react';

interface ReferralApplicantItem {
    id: number;
    full_name: string;
    registration_number: string;
    asal_sekolah: string;
    status: string;
}

interface AdminReferralItem {
    id: number;
    code: string;
    referrer_name: string;
    referrer_phone: string;
    origin_school: string;
    jabatan: string;
    status: 'pending' | 'active' | 'inactive';
    applicant_count: number;
    applicants?: ReferralApplicantItem[];
    created_at: string;
}

export default function AdminReferalPage() {
    const { isDarkMode } = useTheme();
    const [referrals, setReferrals] = useState<AdminReferralItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'active' | 'inactive'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReferral, setSelectedReferral] = useState<AdminReferralItem | null>(null);

    const fetchReferrals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/referrals');
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Gagal memuat daftar referal.');
            } else {
                setReferrals(data.referrals || []);
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReferrals();
    }, [fetchReferrals]);

    const handleUpdateStatus = async (id: number, status: 'pending' | 'active' | 'inactive') => {
        setUpdatingId(id);
        try {
            const res = await fetch('/api/admin/referrals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Gagal memperbarui status.');
            } else {
                toast.success(`Status kode ${data.referral.code} diubah menjadi ${status}.`);
                fetchReferrals();
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.');
        } finally {
            setUpdatingId(null);
        }
    };

    const cardCls = isDarkMode
        ? 'bg-gray-900/90 border-gray-800 text-gray-100'
        : 'bg-white border-[#cbb7a2] text-[#1f1410]';

    return (
        <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#f7f1e8] text-[#1f1410]'}`}>
            <Toaster position="top-center" />
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border ${cardCls}`}>
                            <ArrowLeft className="w-4 h-4" />
                            <span>Dashboard</span>
                        </Link>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <span>Kelola Kode Referal Guru / Wali Kelas</span>
                            </h1>
                            <p className="text-xs opacity-75">Setujui, nonaktifkan, dan pantau jumlah pendaftar per kode referal.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchReferrals}
                        className={`p-2.5 rounded-xl border ${cardCls}`}
                        title="Muat Ulang"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                        {(['ALL', 'pending', 'active', 'inactive'] as const).map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${statusFilter === st
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : cardCls
                                    }`}
                            >
                                {st === 'ALL' ? 'Semua' : st === 'pending' ? 'Pending' : st === 'active' ? 'Aktif' : 'Nonaktif'}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kode, nama guru, atau sekolah..."
                        className={`w-full sm:w-72 rounded-xl border px-3.5 py-2 text-xs ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-[#cbb7a2] text-[#1f1410]'}`}
                    />
                </div>

                <div className={`rounded-3xl border overflow-hidden shadow-xs ${cardCls}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className={isDarkMode ? 'bg-gray-950/60 border-b border-gray-800' : 'bg-[#faf4ec] border-b border-[#cbb7a2]'}>
                                <tr>
                                    <th className="p-3.5 font-extrabold">Kode</th>
                                    <th className="p-3.5 font-extrabold">Nama &amp; Jabatan</th>
                                    <th className="p-3.5 font-extrabold">Asal Sekolah</th>
                                    <th className="p-3.5 font-extrabold">No. WA</th>
                                    <th className="p-3.5 font-extrabold">Siswa</th>
                                    <th className="p-3.5 font-extrabold">Status</th>
                                    <th className="p-3.5 font-extrabold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/60 dark:divide-gray-800">
                                {loading && referrals.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center opacity-75">Memuat data referal...</td>
                                    </tr>
                                ) : referrals.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center opacity-75">Belum ada guru/wali kelas yang mendaftar kode referal.</td>
                                    </tr>
                                ) : (
                                    referrals
                                        .filter((r) => {
                                            const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
                                            const q = searchQuery.trim().toLowerCase();
                                            const matchQuery =
                                                !q ||
                                                r.code.toLowerCase().includes(q) ||
                                                r.referrer_name.toLowerCase().includes(q) ||
                                                r.origin_school.toLowerCase().includes(q);
                                            return matchStatus && matchQuery;
                                        })
                                        .map((r) => (
                                        <tr key={r.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                            <td className="p-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400">{r.code}</td>
                                            <td className="p-3.5">
                                                <div className="font-bold">{r.referrer_name}</div>
                                                <div className="text-xs opacity-75">{r.jabatan}</div>
                                            </td>
                                            <td className="p-3.5 text-xs">{r.origin_school}</td>
                                            <td className="p-3.5 font-mono text-xs">{r.referrer_phone}</td>
                                            <td className="p-3.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReferral(r)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 transition-colors"
                                                    title="Lihat Daftar Siswa"
                                                >
                                                    <Users className="w-3 h-3" />
                                                    <span>{r.applicant_count} Lihat</span>
                                                </button>
                                            </td>
                                            <td className="p-3.5">
                                                {r.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="w-3 h-3" /> Aktif
                                                    </span>
                                                ) : r.status === 'inactive' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                                        <XCircle className="w-3 h-3" /> Nonaktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                                        <Clock className="w-3 h-3" /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                                {r.status !== 'active' && (
                                                    <button
                                                        type="button"
                                                        disabled={updatingId === r.id}
                                                        onClick={() => handleUpdateStatus(r.id, 'active')}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                                                    >
                                                        Setujui
                                                    </button>
                                                )}
                                                {r.status !== 'inactive' && (
                                                    <button
                                                        type="button"
                                                        disabled={updatingId === r.id}
                                                        onClick={() => handleUpdateStatus(r.id, 'inactive')}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                                                    >
                                                        Nonaktifkan
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedReferral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 ${cardCls}`}>
                        <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-base font-extrabold">
                                    Siswa Referal: {selectedReferral.referrer_name} ({selectedReferral.code})
                                </h3>
                                <p className="text-xs opacity-75">{selectedReferral.jabatan} &bull; {selectedReferral.origin_school}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedReferral(null)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Tutup
                            </button>
                        </div>
                        {!selectedReferral.applicants || selectedReferral.applicants.length === 0 ? (
                            <p className="text-xs opacity-75 py-6 text-center">Belum ada siswa yang menggunakan kode referal ini.</p>
                        ) : (
                            <div className="divide-y divide-gray-200/70 dark:divide-gray-800">
                                {selectedReferral.applicants.map((st) => (
                                    <div key={st.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                                        <div>
                                            <p className="font-bold">{st.full_name}</p>
                                            <p className="opacity-75 font-mono">{st.registration_number} &bull; {st.asal_sekolah}</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                            {st.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
