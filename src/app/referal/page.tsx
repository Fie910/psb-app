// src/app/referal/page.tsx
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import {
    ArrowLeft,
    QrCode,
    Search,
    UserPlus,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Printer,
    Copy,
} from 'lucide-react';

interface ReferralRecord {
    id: number;
    code: string;
    referrer_name: string;
    referrer_phone: string;
    origin_school: string;
    jabatan: string;
    status: 'pending' | 'active' | 'inactive';
    approved_at?: string | null;
    created_at?: string;
}

const JABATAN_OPTIONS = ['Guru Mapel', 'Guru BK', 'Wali Kelas', 'Wakil Kepala'];

export default function ReferalPage() {
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState<'daftar' | 'cek'>('daftar');

    // Form Daftar
    const [referrerName, setReferrerName] = useState('');
    const [referrerPhone, setReferrerPhone] = useState('');
    const [originSchool, setOriginSchool] = useState('');
    const [jabatan, setJabatan] = useState(JABATAN_OPTIONS[0]);
    const [submitting, setSubmitting] = useState(false);
    const [createdReferral, setCreatedReferral] = useState<ReferralRecord | null>(null);

    // Form Cek / Cari Kode
    const [searchName, setSearchName] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundReferrals, setFoundReferrals] = useState<ReferralRecord[]>([]);

    const qrContainerRef = useRef<HTMLDivElement>(null);

    const handleRegisterReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referrer_name: referrerName,
                    referrer_phone: referrerPhone,
                    origin_school: originSchool,
                    jabatan,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Gagal mendaftarkan kode referal.');
            } else {
                toast.success(data.message || 'Kode referal berhasil dibuat!');
                setCreatedReferral(data.referral);
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSearchReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        setFoundReferrals([]);
        try {
            const res = await fetch(
                `/api/referral?name=${encodeURIComponent(searchName)}&phone=${encodeURIComponent(searchPhone)}`
            );
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Kode referal tidak ditemukan.');
            } else {
                setFoundReferrals(data.referrals || []);
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.');
        } finally {
            setSearching(false);
        }
    };

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(`Kode ${code} disalin!`);
        } catch {
            toast.error('Gagal menyalin kode.');
        }
    };

    const handleDownloadQR = (code: string) => {
        const svg = qrContainerRef.current?.querySelector('svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const pad = 24;
            canvas.width = img.width + pad * 2;
            canvas.height = img.height + pad * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, pad, pad);
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `QR_Referal_${code}.png`;
                a.click();
            }
            URL.revokeObjectURL(svgUrl);
        };
        img.src = svgUrl;
    };

    const getReferralUrl = (code: string) =>
        `${typeof window !== 'undefined' ? window.location.origin : ''}/daftar?ref=${code}`;

    const renderStatusBadge = (status: string) => {
        if (status === 'active') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aktif
                </span>
            );
        }
        if (status === 'inactive') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                    <XCircle className="w-3.5 h-3.5" />
                    Nonaktif
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Menunggu Persetujuan Admin
            </span>
        );
    };

    const cardCls = isDarkMode
        ? 'bg-gray-900/90 border-gray-800 text-gray-100'
        : 'bg-white border-[#cbb7a2] text-[#1f1410]';

    const inputCls = isDarkMode
        ? 'bg-gray-950 border-gray-700 text-white focus:border-teal-500 outline-none'
        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38] outline-none';

    return (
        <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#f7f1e8] text-[#1f1410]'}`}>
            <Toaster position="top-center" />
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4 print:hidden">
                    <Link
                        href="/"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border ${cardCls}`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Beranda</span>
                    </Link>
                    <h1 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span>Program Referal Guru &amp; Wali Kelas</span>
                    </h1>
                </div>

                {/* Tabs */}
                <div className={`flex rounded-2xl border p-1.5 gap-1.5 print:hidden ${cardCls}`}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('daftar')}
                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${activeTab === 'daftar'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-80'
                            }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Daftar Kode Referal Baru</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('cek')}
                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${activeTab === 'cek'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-80'
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        <span>Cek Status / Cari Kode</span>
                    </button>
                </div>

                {activeTab === 'daftar' && (
                    <div className={`rounded-3xl border p-6 shadow-sm space-y-5 ${cardCls}`}>
                        {!createdReferral ? (
                            <form onSubmit={handleRegisterReferral} className="space-y-4">
                                <div>
                                    <h2 className="text-base font-extrabold">Formulir Pendaftaran Referal</h2>
                                    <p className="text-xs opacity-75 mt-0.5">
                                        Dapatkan kode referal unik 5 karakter dan QR Code untuk dibagikan kepada calon siswa.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Nama Lengkap *</label>
                                        <input
                                            type="text"
                                            required
                                            value={referrerName}
                                            onChange={(e) => setReferrerName(e.target.value)}
                                            placeholder="Contoh: Drs. Ahmad Fauzi"
                                            className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Nomor WhatsApp *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={referrerPhone}
                                            onChange={(e) => setReferrerPhone(e.target.value)}
                                            placeholder="081234567890"
                                            className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Sekolah / Pesantren Asal *</label>
                                        <input
                                            type="text"
                                            required
                                            value={originSchool}
                                            onChange={(e) => setOriginSchool(e.target.value)}
                                            placeholder="Contoh: SMPN 1 Sukarame"
                                            className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Jabatan *</label>
                                        <select
                                            value={jabatan}
                                            onChange={(e) => setJabatan(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold ${inputCls}`}
                                        >
                                            {JABATAN_OPTIONS.map((j) => (
                                                <option key={j} value={j}>{j}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-lg disabled:opacity-50"
                                >
                                    {submitting ? 'Memproses...' : 'Buat Kode Referal & QR Code'}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="flex justify-center">{renderStatusBadge(createdReferral.status)}</div>
                                <h2 className="text-xl font-extrabold">{createdReferral.referrer_name}</h2>
                                <p className="text-xs opacity-80">
                                    {createdReferral.jabatan} &bull; {createdReferral.origin_school}
                                </p>

                                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-500/10">
                                    <span className="text-3xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                                        {createdReferral.code}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(createdReferral.code)}
                                        className="p-2 rounded-xl hover:bg-emerald-500/20"
                                        title="Salin Kode"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>

                                <div ref={qrContainerRef} className="flex justify-center p-4 bg-white rounded-2xl w-fit mx-auto border">
                                    <QRCode value={getReferralUrl(createdReferral.code)} size={180} />
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 print:hidden">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadQR(createdReferral.code)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Unduh QR (.png)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Cetak Kartu QR</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCreatedReferral(null)}
                                        className="px-4 py-2 rounded-xl border text-xs font-bold"
                                    >
                                        Daftar Lagi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'cek' && (
                    <div className={`rounded-3xl border p-6 shadow-sm space-y-5 ${cardCls}`}>
                        <form onSubmit={handleSearchReferral} className="space-y-4">
                            <div>
                                <h2 className="text-base font-extrabold">Cek Status &amp; Cari Kode Referal</h2>
                                <p className="text-xs opacity-75 mt-0.5">
                                    Masukkan Nama Lengkap dan Nomor WhatsApp yang didaftarkan untuk melihat status persetujuan atau menemukan kembali QR Code Anda.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">Nama Lengkap *</label>
                                    <input
                                        type="text"
                                        required
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        placeholder="Sesuai saat mendaftar"
                                        className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Nomor WhatsApp *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={searchPhone}
                                        onChange={(e) => setSearchPhone(e.target.value)}
                                        placeholder="08... / 628..."
                                        className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={searching}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-lg disabled:opacity-50"
                            >
                                {searching ? 'Mencari...' : 'Cari Kode Referal Saya'}
                            </button>
                        </form>

                        {foundReferrals.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                                {foundReferrals.map((ref) => (
                                    <div key={ref.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="space-y-1 text-center sm:text-left">
                                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                                <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                    {ref.code}
                                                </span>
                                                {renderStatusBadge(ref.status)}
                                            </div>
                                            <p className="text-sm font-bold">{ref.referrer_name}</p>
                                            <p className="text-xs opacity-75">
                                                {ref.jabatan} &bull; {ref.origin_school}
                                            </p>
                                        </div>
                                        <div className="p-2.5 bg-white rounded-xl border shrink-0">
                                            <QRCode value={getReferralUrl(ref.code)} size={96} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
