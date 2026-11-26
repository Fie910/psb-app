// src/app/admin/statistik/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useTheme } from '@/context/ThemeContext';
import {
    ArrowLeft,
    BarChart3,
    Download,
    Printer,
    Users,
    CheckCircle2,
    Clock,
    Wallet,
    GraduationCap,
    School,
    TrendingUp,
    RefreshCw,
} from 'lucide-react';

interface QuotaStat {
    major: string;
    quota: number;
    accepted: number;
    remaining: number;
    percentage: number;
}

interface DailyTrendItem {
    day: string;
    count: number;
}

interface TopSchoolItem {
    school: string;
    count: number;
}

interface StatisticsResponse {
    schoolName: string;
    academicYear: string;
    pathFilter: string;
    totalApplicants: number;
    byStatus: Record<string, number>;
    byPath: Record<string, number>;
    quotaStats: QuotaStat[];
    dailyTrend: DailyTrendItem[];
    topSchools: TopSchoolItem[];
    reregSummary: Record<string, number>;
    totalVerifiedFunds: number;
    generatedAt: string;
}

export default function AdminStatistikPage() {
    const { isDarkMode } = useTheme();
    const [data, setData] = useState<StatisticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pathFilter, setPathFilter] = useState<'ALL' | 'Prestasi' | 'Reguler'>('ALL');

    const fetchStatistics = useCallback(async (filter: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/statistics?path=${encodeURIComponent(filter)}`);
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || 'Gagal memuat statistik.');
            } else {
                setData(json);
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan saat memuat statistik.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatistics(pathFilter);
    }, [pathFilter, fetchStatistics]);

    const handleExportExcel = () => {
        if (!data) return;
        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Ringkasan KPI & Status
            const summaryRows = [
                ['LAPORAN PLENO EKSEKUTIF PPDB', data.schoolName],
                ['Tahun Ajaran', data.academicYear],
                ['Filter Jalur', data.pathFilter === 'ALL' ? 'Semua Jalur' : data.pathFilter],
                ['Dicetak Pada', new Date(data.generatedAt).toLocaleString('id-ID')],
                [],
                ['METRIK UTAMA', 'JUMLAH'],
                ['Total Pendaftar', data.totalApplicants],
                ['Jalur Prestasi', data.byPath['Prestasi'] || 0],
                ['Jalur Reguler', data.byPath['Reguler'] || 0],
                ['Status: Pending', data.byStatus['Pending'] || 0],
                ['Status: Perbaikan', data.byStatus['Perbaikan'] || 0],
                ['Status: Siap Tes dan/atau Wawancara', data.byStatus['Siap Tes dan/atau Wawancara'] || 0],
                ['Status: Diterima', data.byStatus['Diterima'] || 0],
                ['Status: Ditolak', data.byStatus['Ditolak'] || 0],
                [],
                ['DAFTAR ULANG & KEUANGAN', 'JUMLAH'],
                ['Terverifikasi', data.reregSummary['Terverifikasi'] || 0],
                ['Menunggu Verifikasi', data.reregSummary['Menunggu Verifikasi'] || 0],
                ['Perbaikan Daftar Ulang', data.reregSummary['Perbaikan Daftar Ulang'] || 0],
                ['Belum Daftar Ulang', data.reregSummary['Belum Daftar Ulang'] || 0],
                ['Total Dana Masuk Terverifikasi (Rp)', data.totalVerifiedFunds],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Pleno');

            // Sheet 2: Kuota Jurusan
            const quotaRows = data.quotaStats.map((q) => ({
                'Kompetensi Keahlian': q.major,
                'Kuota': q.quota,
                'Diterima': q.accepted,
                'Sisa Kuota': q.remaining,
                'Persentase Terisi (%)': q.percentage,
            }));
            const wsQuota = XLSX.utils.json_to_sheet(quotaRows);
            XLSX.utils.book_append_sheet(wb, wsQuota, 'Kuota Jurusan');

            // Sheet 3: Top 10 Asal Sekolah
            const schoolRows = data.topSchools.map((s, idx) => ({
                'Peringkat': idx + 1,
                'Asal Sekolah': s.school,
                'Jumlah Pendaftar': s.count,
            }));
            const wsSchools = XLSX.utils.json_to_sheet(schoolRows);
            XLSX.utils.book_append_sheet(wb, wsSchools, 'Top Asal Sekolah');

            // Sheet 4: Tren Harian
            const trendRows = data.dailyTrend.map((t) => ({
                'Tanggal': t.day,
                'Jumlah Pendaftar': t.count,
            }));
            const wsTrend = XLSX.utils.json_to_sheet(trendRows);
            XLSX.utils.book_append_sheet(wb, wsTrend, 'Tren Harian');

            const fileName = `Rekap_Pleno_PPDB_${data.pathFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success('Rekap Pleno (.xlsx) berhasil diunduh!');
        } catch (err) {
            console.error('Export Excel error:', err);
            toast.error('Gagal mengekspor file Excel.');
        }
    };

    const cardCls = isDarkMode
        ? 'bg-gray-900/90 border-gray-800 text-gray-100'
        : 'bg-white border-[#cbb7a2] text-[#1f1410]';

    const maxTrend = data?.dailyTrend.length
        ? Math.max(...data.dailyTrend.map((d) => d.count), 1)
        : 1;

    const maxSchool = data?.topSchools.length
        ? Math.max(...data.topSchools.map((s) => s.count), 1)
        : 1;

    return (
        <div
            className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#f7f1e8] text-[#1f1410]'
                }`}
        >
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Top Navigation & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${isDarkMode
                                ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-200'
                                : 'bg-white border-[#cbb7a2] hover:bg-[#faf4ec] text-[#1f1410]'
                                }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Kembali ke Dashboard</span>
                        </Link>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <span>Statistik &amp; Laporan Pleno Eksekutif</span>
                            </h1>
                            <p className="text-xs opacity-75">
                                {data?.schoolName || 'SMK KH. A. WAHAB MUHSIN'} &bull; Tahun Ajaran {data?.academicYear || '2027/2028'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filter Jalur */}
                        <div className={`inline-flex rounded-xl border p-1 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-[#cbb7a2]'}`}>
                            {(['ALL', 'Prestasi', 'Reguler'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPathFilter(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pathFilter === p
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-80'
                                        }`}
                                >
                                    {p === 'ALL' ? 'Semua Jalur' : p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchStatistics(pathFilter)}
                            className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-[#cbb7a2] hover:bg-[#faf4ec]'}`}
                            title="Muat Ulang Data"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={!data || loading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            <span>Ekspor Rekap Pleno (.xlsx)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            disabled={!data || loading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md disabled:opacity-50"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Cetak Laporan</span>
                        </button>
                    </div>
                </div>

                {/* Print-only Header */}
                <div className="hidden print:block border-b-2 border-black pb-3 mb-4">
                    <h1 className="text-xl font-extrabold uppercase">
                        Laporan Pleno Eksekutif PPDB &mdash; {data?.schoolName || 'SMK KH. A. WAHAB MUHSIN'}
                    </h1>
                    <p className="text-xs mt-1">
                        Tahun Ajaran {data?.academicYear || '2027/2028'} &bull; Filter Jalur:{' '}
                        {pathFilter === 'ALL' ? 'Semua Jalur' : pathFilter} &bull; Dicetak:{' '}
                        {new Date().toLocaleString('id-ID')}
                    </p>
                </div>

                {loading && !data ? (
                    <div className={`rounded-3xl border p-12 text-center ${cardCls}`}>
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
                        <p className="text-sm font-bold">Memuat data statistik eksekutif...</p>
                    </div>
                ) : data ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className={`rounded-2xl border p-5 shadow-xs ${cardCls}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold opacity-75">Total Pendaftar</span>
                                    <Users className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-3xl font-extrabold mt-2">{data.totalApplicants}</p>
                                <p className="text-[11px] opacity-75 mt-1">
                                    Prestasi: <strong>{data.byPath['Prestasi'] || 0}</strong> &bull; Reguler:{' '}
                                    <strong>{data.byPath['Reguler'] || 0}</strong>
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-5 shadow-xs ${cardCls}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold opacity-75">Peserta Diterima</span>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </div>
                                <p className="text-3xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400">
                                    {data.byStatus['Diterima'] || 0}
                                </p>
                                <p className="text-[11px] opacity-75 mt-1">
                                    Ditolak: <strong>{data.byStatus['Ditolak'] || 0}</strong>
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-5 shadow-xs ${cardCls}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold opacity-75">Proses Seleksi &amp; Berkas</span>
                                    <Clock className="w-5 h-5 text-amber-500" />
                                </div>
                                <p className="text-3xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">
                                    {(data.byStatus['Pending'] || 0) +
                                        (data.byStatus['Perbaikan'] || 0) +
                                        (data.byStatus['Siap Tes dan/atau Wawancara'] || 0)}
                                </p>
                                <p className="text-[11px] opacity-75 mt-1">
                                    Siap Tes: <strong>{data.byStatus['Siap Tes dan/atau Wawancara'] || 0}</strong> &bull; Pending:{' '}
                                    <strong>{data.byStatus['Pending'] || 0}</strong>
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-5 shadow-xs ${cardCls}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold opacity-75">Dana Masuk Terverifikasi</span>
                                    <Wallet className="w-5 h-5 text-teal-500" />
                                </div>
                                <p className="text-2xl font-extrabold mt-2 text-teal-600 dark:text-teal-400">
                                    Rp {Number(data.totalVerifiedFunds || 0).toLocaleString('id-ID')}
                                </p>
                                <p className="text-[11px] opacity-75 mt-1">
                                    Daftar Ulang Terverifikasi: <strong>{data.reregSummary['Terverifikasi'] || 0}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Keterisian Kuota & Ringkasan Daftar Ulang */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className={`lg:col-span-2 rounded-3xl border p-6 shadow-xs space-y-4 ${cardCls}`}>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-extrabold flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Keterisian Kuota per Kompetensi Keahlian</span>
                                    </h2>
                                </div>
                                <div className="space-y-4">
                                    {data.quotaStats.map((q) => (
                                        <div key={q.major} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span>{q.major}</span>
                                                <span>
                                                    {q.accepted} / {q.quota} ({q.percentage}%) &bull; Sisa: {q.remaining}
                                                </span>
                                            </div>
                                            <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${q.percentage >= 90
                                                        ? 'bg-rose-500'
                                                        : q.percentage >= 70
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                        }`}
                                                    style={{ width: `${q.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={`rounded-3xl border p-6 shadow-xs space-y-4 ${cardCls}`}>
                                <h2 className="text-base font-extrabold flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                    <span>Ringkasan Daftar Ulang</span>
                                </h2>
                                <div className="space-y-2.5 text-xs">
                                    {[
                                        { label: 'Terverifikasi', key: 'Terverifikasi', color: 'text-emerald-600 dark:text-emerald-400' },
                                        { label: 'Menunggu Verifikasi', key: 'Menunggu Verifikasi', color: 'text-amber-600 dark:text-amber-400' },
                                        { label: 'Perbaikan Daftar Ulang', key: 'Perbaikan Daftar Ulang', color: 'text-rose-600 dark:text-rose-400' },
                                        { label: 'Belum Daftar Ulang', key: 'Belum Daftar Ulang', color: 'opacity-75' },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between py-2 border-b border-gray-200/70 dark:border-gray-800 last:border-0"
                                        >
                                            <span className="font-semibold">{item.label}</span>
                                            <span className={`text-sm font-extrabold ${item.color}`}>
                                                {data.reregSummary[item.key] || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tren Harian & Top 10 Asal Sekolah */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className={`rounded-3xl border p-6 shadow-xs space-y-4 ${cardCls}`}>
                                <h2 className="text-base font-extrabold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <span>Tren Pendaftar Harian (14 Hari Terakhir)</span>
                                </h2>
                                {data.dailyTrend.length === 0 ? (
                                    <p className="text-xs opacity-70 py-8 text-center">Belum ada pendaftar dalam 14 hari terakhir.</p>
                                ) : (
                                    <div className="flex items-end gap-2 h-48 pt-4">
                                        {data.dailyTrend.map((d) => {
                                            const heightPct = Math.max(8, Math.round((d.count / maxTrend) * 100));
                                            return (
                                                <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                                                    <span className="text-[10px] font-extrabold">{d.count}</span>
                                                    <div
                                                        className="w-full max-w-[28px] rounded-t-lg bg-blue-500/85 hover:bg-blue-500 transition-all"
                                                        style={{ height: `${heightPct}%` }}
                                                        title={`${d.day}: ${d.count} pendaftar`}
                                                    />
                                                    <span className="text-[9px] opacity-70 rotate-0 truncate max-w-full">
                                                        {d.day.slice(5)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className={`rounded-3xl border p-6 shadow-xs space-y-4 ${cardCls}`}>
                                <h2 className="text-base font-extrabold flex items-center gap-2">
                                    <School className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <span>Top 10 Asal Sekolah Terbanyak</span>
                                </h2>
                                {data.topSchools.length === 0 ? (
                                    <p className="text-xs opacity-70 py-8 text-center">Belum ada data asal sekolah.</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {data.topSchools.map((s, idx) => {
                                            const pct = Math.max(6, Math.round((s.count / maxSchool) * 100));
                                            return (
                                                <div key={`${s.school}-${idx}`} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold truncate pr-2">
                                                            {idx + 1}. {s.school}
                                                        </span>
                                                        <span className="font-extrabold shrink-0">{s.count} siswa</span>
                                                    </div>
                                                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-amber-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
