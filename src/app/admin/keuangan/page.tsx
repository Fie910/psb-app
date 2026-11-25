//src/app/admin/keuangan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    Wallet,
    ArrowLeft,
    Search,
    Download,
    RefreshCw,
    CheckCircle2,
    Clock,
    FileText,
    ExternalLink,
    Filter,
    Edit3,
    Save,
    X,
    Building2,
    Users,
    TrendingUp,
    Check,
    AlertCircle
} from 'lucide-react';

interface PaymentItem {
    rereg_id: number;
    applicant_id: number;
    registration_number: string;
    full_name: string;
    asal_sekolah: string;
    accepted_major: string;
    phone: string | null;
    payment_scheme: string;
    doc_kuitansi_gosiswa: string;
    rereg_status: string;
    payment_amount: number | null;
    payment_ref_code: string | null;
    payment_verified_by: string | null;
    payment_verified_at: string | null;
    submitted_at: string;
}

interface FinanceSummary {
    total_amount: number;
    total_rereg_count: number;
    count_lunas: number;
    count_dp: number;
    count_paid: number;
}

interface MajorBreakdown {
    major_name: string;
    count_students: number;
    total_amount: number;
}

export default function AdminKeuanganPage() {
    const { isDarkMode } = useTheme();

    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [summary, setSummary] = useState<FinanceSummary>({
        total_amount: 0,
        total_rereg_count: 0,
        count_lunas: 0,
        count_dp: 0,
        count_paid: 0,
    });
    const [majorBreakdown, setMajorBreakdown] = useState<MajorBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Filter states
    const [search, setSearch] = useState<string>('');
    const [scheme, setScheme] = useState<string>('');
    const [reregStatus, setReregStatus] = useState<string>('');

    // Modal / Inline Edit Verifikasi Pembayaran
    const [editingItem, setEditingItem] = useState<PaymentItem | null>(null);
    const [inputAmount, setInputAmount] = useState<string>('');
    const [inputRefCode, setInputRefCode] = useState<string>('');
    const [autoVerify, setAutoVerify] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError('');
            const params = new URLSearchParams();
            if (search.trim()) params.set('search', search.trim());
            if (scheme) params.set('scheme', scheme);
            if (reregStatus) params.set('rereg_status', reregStatus);

            const res = await fetch(`/api/admin/finance?${params.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    setError('Akses Ditolak: Halaman ini khusus untuk Bendahara dan Super Admin.');
                } else {
                    setError(data.error || 'Gagal memuat rekap keuangan.');
                }
                setPayments([]);
            } else {
                setPayments(data.payments || []);
                if (data.summary) setSummary(data.summary);
                if (data.majorBreakdown) setMajorBreakdown(data.majorBreakdown);
            }
        } catch {
            setError('Terjadi kesalahan jaringan saat memuat rekap keuangan.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const handleOpenEdit = (item: PaymentItem) => {
        setEditingItem(item);
        setInputAmount(item.payment_amount ? String(item.payment_amount) : '');
        setInputRefCode(item.payment_ref_code || '');
        setAutoVerify(item.rereg_status !== 'Terverifikasi');
    };

    const handleSavePayment = async () => {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/finance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicant_id: editingItem.applicant_id,
                    payment_amount: inputAmount,
                    payment_ref_code: inputRefCode,
                    auto_verify_rereg: autoVerify,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Pembayaran berhasil diverifikasi!');
                setEditingItem(null);
                fetchData();
            } else {
                toast.error(data.error || 'Gagal menyimpan pembayaran.');
            }
        } catch {
            toast.error('Gagal terhubung ke server.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleViewDocument = async (key: string) => {
        try {
            const res = await fetch('/api/admin/document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key }),
            });
            const data = await res.json();
            if (data.viewUrl) {
                window.open(data.viewUrl, '_blank');
            } else {
                toast.error(data.error || 'Gagal membuka kuitansi.');
            }
        } catch {
            toast.error('Terjadi kesalahan saat membuka kuitansi.');
        }
    };

    const handleExportExcel = () => {
        if (payments.length === 0) {
            toast.error('Tidak ada data keuangan untuk diekspor.');
            return;
        }

        try {
            const excelRows = payments.map((item, idx) => ({
                'No': idx + 1,
                'No. Pendaftaran': item.registration_number,
                'Nama Siswa': item.full_name,
                'Asal Sekolah': item.asal_sekolah,
                'Jurusan Diterima': item.accepted_major,
                'Skema Pembayaran': item.payment_scheme,
                'Nominal Masuk (Rp)': item.payment_amount || 0,
                'Kode Referensi / VA': item.payment_ref_code || '-',
                'Status Daftar Ulang': item.rereg_status,
                'Diverifikasi Oleh': item.payment_verified_by || '-',
                'Waktu Verifikasi': item.payment_verified_at
                    ? new Date(item.payment_verified_at).toLocaleString('id-ID')
                    : '-',
                'Waktu Pengajuan': new Date(item.submitted_at).toLocaleString('id-ID'),
            }));

            const ws = XLSX.utils.json_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Rekap Keuangan');

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Laporan_Keuangan_Daftar_Ulang_${dateStr}.xlsx`);
            toast.success('Laporan Keuangan (.xlsx) berhasil diunduh!');
        } catch {
            toast.error('Gagal mengekspor data.');
        }
    };

    return (
        <main
            className={`min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300 ${
                isDarkMode
                    ? 'bg-[#0f1218] text-gray-100'
                    : 'bg-linear-to-br from-[#f5ede4] via-[#ebe1d6] to-[#dfd3c3] text-[#2b1d18]'
            }`}
        >
            <Toaster position="top-right" />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Atas */}
                <header
                    className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        isDarkMode
                            ? 'bg-gray-900/80 border-gray-800'
                            : 'bg-white/80 border-white/60 shadow-amber-900/5'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-3 rounded-2xl ${
                                isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black">Rekap Keuangan &amp; Kas Masuk</h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    Bendahara
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Pantau dan verifikasi setoran biaya daftar ulang dan administrasi peserta didik baru.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <ThemeToggle />
                        <Link
                            href="/admin"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-md transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Kembali ke Admin
                        </Link>
                    </div>
                </header>

                {/* Kartu Ringkasan Keuangan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Uang Masuk */}
                    <div
                        className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-900/70 border-gray-800'
                                : 'bg-white/80 border-white/60'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Total Kas Masuk
                            </span>
                            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                            Rp {Number(summary.total_amount).toLocaleString('id-ID')}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Dari {summary.count_paid} peserta terverifikasi
                        </p>
                    </div>

                    {/* Skema Lunas */}
                    <div
                        className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-900/70 border-gray-800'
                                : 'bg-white/80 border-white/60'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Skema Lunas
                            </span>
                            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
                            {summary.count_lunas} <span className="text-xs font-sans font-normal text-gray-500">Siswa</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Biaya daftar ulang lunas penuh
                        </p>
                    </div>

                    {/* Skema DP / Minimal */}
                    <div
                        className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-900/70 border-gray-800'
                                : 'bg-white/80 border-white/60'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Skema Minimal (DP)
                            </span>
                            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
                            {summary.count_dp} <span className="text-xs font-sans font-normal text-gray-500">Siswa</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Setoran awal / cicilan bertahap
                        </p>
                    </div>

                    {/* Total Berkas Masuk */}
                    <div
                        className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-900/70 border-gray-800'
                                : 'bg-white/80 border-white/60'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Formulir Masuk
                            </span>
                            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
                            {summary.total_rereg_count} <span className="text-xs font-sans font-normal text-gray-500">Total</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Peserta telah mengisi daftar ulang
                        </p>
                    </div>
                </div>

                {/* Ringkasan per Kompetensi Keahlian */}
                {majorBreakdown.length > 0 && (
                    <div
                        className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-900/70 border-gray-800'
                                : 'bg-white/80 border-white/60'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-amber-500" />
                            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                Rincian Perolehan Kas Masuk per Jurusan
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {majorBreakdown.map((mb, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-2xl border ${
                                        isDarkMode
                                            ? 'bg-gray-800/40 border-gray-700/60'
                                            : 'bg-[#faf6f0] border-[#ebe1d6]'
                                    }`}
                                >
                                    <div className="font-bold text-xs truncate" title={mb.major_name}>
                                        {mb.major_name}
                                    </div>
                                    <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                                        Rp {Number(mb.total_amount).toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        {mb.count_students} siswa daftar ulang
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter & Toolbar */}
                <section
                    className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                        isDarkMode
                            ? 'bg-gray-900/70 border-gray-800'
                            : 'bg-white/80 border-white/60'
                    }`}
                >
                    <form onSubmit={handleSearchSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Pencarian */}
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Cari Nama Siswa / No Pendaftaran / Kode VA:
                                </label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari siswa atau kode referensi kuitansi..."
                                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-colors ${
                                            isDarkMode
                                                ? 'bg-gray-800/80 border-gray-700 text-white focus:border-amber-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-amber-600'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Filter Skema */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Skema Pembayaran:
                                </label>
                                <select
                                    value={scheme}
                                    onChange={(e) => setScheme(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors cursor-pointer ${
                                        isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-white focus:border-amber-500'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-amber-600'
                                    }`}
                                >
                                    <option value="">Semua Skema</option>
                                    <option value="Lunas">Lunas</option>
                                    <option value="Minimal (DP)">Minimal (DP)</option>
                                </select>
                            </div>

                            {/* Filter Status Daftar Ulang */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Status Daftar Ulang:
                                </label>
                                <select
                                    value={reregStatus}
                                    onChange={(e) => setReregStatus(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors cursor-pointer ${
                                        isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-white focus:border-amber-500'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-amber-600'
                                    }`}
                                >
                                    <option value="">Semua Status</option>
                                    <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                                    <option value="Terverifikasi">Terverifikasi</option>
                                    <option value="Perbaikan Daftar Ulang">Perbaikan Daftar Ulang</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Menampilkan <strong className="text-amber-500">{payments.length}</strong> transaksi pembayaran
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors flex items-center gap-1.5"
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    Filter Data
                                </button>

                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Ekspor Laporan (.xlsx)
                                </button>
                            </div>
                        </div>
                    </form>
                </section>

                {/* Error Banner */}
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
                        {error}
                    </div>
                )}

                {/* Tabel Data Keuangan */}
                <div
                    className={`rounded-3xl border shadow-xl overflow-hidden backdrop-blur-xl transition-colors ${
                        isDarkMode
                            ? 'bg-gray-900/80 border-gray-800'
                            : 'bg-white/80 border-white/60'
                    }`}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead
                                className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${
                                    isDarkMode
                                        ? 'bg-gray-950/60 text-gray-400 border-gray-800'
                                        : 'bg-amber-50/60 text-amber-950 border-amber-200'
                                }`}
                            >
                                <tr>
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-4">Nama Siswa &amp; No Reg</th>
                                    <th className="py-3.5 px-4">Jurusan</th>
                                    <th className="py-3.5 px-4">Skema &amp; Kuitansi</th>
                                    <th className="py-3.5 px-4">Nominal Masuk (Rp)</th>
                                    <th className="py-3.5 px-4">Status &amp; Verifikator</th>
                                    <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            Memuat data keuangan...
                                        </td>
                                    </tr>
                                ) : payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            Tidak ada data pembayaran yang sesuai kriteria.
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((item, index) => (
                                        <tr
                                            key={item.rereg_id}
                                            className={`transition-colors ${
                                                isDarkMode
                                                    ? 'hover:bg-gray-800/40'
                                                    : 'hover:bg-amber-50/40'
                                            }`}
                                        >
                                            <td className="py-3.5 px-4 text-center font-mono text-gray-400">
                                                {index + 1}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-extrabold text-gray-900 dark:text-gray-100">
                                                    {item.full_name}
                                                </div>
                                                <div className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
                                                    {item.registration_number}
                                                </div>
                                                <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                                    {item.asal_sekolah}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                                {item.accepted_major}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-xs">{item.payment_scheme}</div>
                                                {item.doc_kuitansi_gosiswa && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewDocument(item.doc_kuitansi_gosiswa)}
                                                        className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-bold mt-1"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        <span>Lihat Kuitansi</span>
                                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                                                    {item.payment_amount && item.payment_amount > 0
                                                        ? `Rp ${Number(item.payment_amount).toLocaleString('id-ID')}`
                                                        : '-'}
                                                </div>
                                                {item.payment_ref_code && (
                                                    <div className="text-[10px] font-mono text-gray-400">
                                                        Ref: {item.payment_ref_code}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        item.rereg_status === 'Terverifikasi'
                                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                            : item.rereg_status === 'Perbaikan Daftar Ulang'
                                                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                    }`}
                                                >
                                                    {item.rereg_status}
                                                </span>
                                                {item.payment_verified_by && (
                                                    <div className="text-[10px] text-gray-400 mt-1">
                                                        Oleh: <strong>{item.payment_verified_by}</strong>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-colors"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>Input Kas</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Input Nominal Pembayaran */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div
                        className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border transition-all ${
                            isDarkMode
                                ? 'bg-gray-900 border-gray-800 text-gray-100'
                                : 'bg-white border-gray-200 text-gray-900'
                        }`}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-amber-500" />
                                <h3 className="font-extrabold text-sm sm:text-base">
                                    Verifikasi Pembayaran Siswa
                                </h3>
                            </div>
                            <button
                                onClick={() => setEditingItem(null)}
                                className="p-1 rounded-lg opacity-60 hover:opacity-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                                <p className="font-bold text-sm text-gray-900 dark:text-white">
                                    {editingItem.full_name}
                                </p>
                                <p className="text-[11px] font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                                    {editingItem.registration_number} &bull; Jurusan: {editingItem.accepted_major}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Skema Terpilih: <strong>{editingItem.payment_scheme}</strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 opacity-80">
                                    Nominal Uang Masuk (Rupiah):
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 font-bold text-gray-400 text-xs">
                                        Rp
                                    </span>
                                    <input
                                        type="number"
                                        value={inputAmount}
                                        onChange={(e) => setInputAmount(e.target.value)}
                                        placeholder="Contoh: 1500000"
                                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono font-bold border outline-none transition-colors ${
                                            isDarkMode
                                                ? 'bg-gray-800 border-gray-700 text-white focus:border-amber-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-amber-600'
                                        }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 opacity-80">
                                    Kode Referensi / No. Transaksi Kuitansi:
                                </label>
                                <input
                                    type="text"
                                    value={inputRefCode}
                                    onChange={(e) => setInputRefCode(e.target.value)}
                                    placeholder="Contoh: GS-2026-88392 atau No. Kuitansi"
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-800 border-gray-700 text-white focus:border-amber-500'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-amber-600'
                                    }`}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="autoVerify"
                                    checked={autoVerify}
                                    onChange={(e) => setAutoVerify(e.target.checked)}
                                    className="rounded text-amber-600 cursor-pointer"
                                />
                                <label htmlFor="autoVerify" className="text-[11px] font-semibold cursor-pointer">
                                    Sekaligus tandai status daftar ulang sebagai &quot;Terverifikasi&quot;
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold opacity-75 hover:opacity-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={handleSavePayment}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {isSaving ? 'Menyimpan...' : 'Simpan Pembayaran'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
