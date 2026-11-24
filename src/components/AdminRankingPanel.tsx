//src/components/AdminRankingPanel.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import {
    Trophy,
    FileSpreadsheet,
    Search,
    ChevronDown,
    CheckCircle2,
    Award,
    Filter,
    X,
    RefreshCw,
    GraduationCap,
    Info,
    RotateCcw,
    MessageSquare,
    Check,
} from 'lucide-react';

export interface RankingRow {
    rank: number;
    id: number;
    registration_number: string;
    full_name: string;
    nisn: string;
    registration_path: string;
    asal_sekolah: string | null;
    school_choice: string;
    school_choice_2: string | null;
    accepted_major: string | null;
    status: string;
    document_notes: string | null;
    interview_notes: string | null;
    tpa_literasi: number | null;
    tpa_numerasi: number | null;
    tpa_total: number | null;
    tpa_percent: number | null;
    wawancara_total: number | null;
    wawancara_max: number | null;
    wawancara_percent: number | null;
    wawancara_question_count: number;
    combined_percent: number | null;
    has_tpa: boolean;
    has_wawancara: boolean;
    displayRank?: number;
}

const MAJOR_OPTIONS = [
    'Farmasi Klinis dan Komunitas',
    'Produksi dan Siaran Program Televisi',
    'Manajemen Perkantoran',
];

interface AdminRankingPanelProps {
    onStatusChange: () => void;
}

export default function AdminRankingPanel({ onStatusChange }: AdminRankingPanelProps) {
    const { isDarkMode } = useTheme();
    const [ranking, setRanking] = useState<RankingRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [majorFilter, setMajorFilter] = useState('ALL');
    const [pathFilter, setPathFilter] = useState('ALL'); // 'ALL' | 'Prestasi' | 'Reguler'
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Belum Ditetapkan' | 'Diterima' | 'Ditolak'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'combined' | 'tpa' | 'wawancara'>('combined');
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Modal Tetapkan Lulus
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [acceptTarget, setAcceptTarget] = useState<RankingRow | null>(null);
    const [acceptMajorChoice, setAcceptMajorChoice] = useState<'CHOICE_1' | 'CHOICE_2'>('CHOICE_1');

    const fetchRanking = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (majorFilter !== 'ALL') params.set('major', majorFilter);
            if (pathFilter !== 'ALL') params.set('path', pathFilter);
            if (statusFilter !== 'ALL') params.set('status', statusFilter);

            const url = `/api/admin/exam-ranking${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            const data = await res.json();
            if (res.ok && Array.isArray(data.ranking)) {
                setRanking(data.ranking);
            } else {
                toast.error(data.error || 'Gagal memuat peringkat.');
            }
        } catch {
            toast.error('Gagal memuat peringkat.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRanking();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [majorFilter, pathFilter, statusFilter]);

    const displayed = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = ranking.filter((r) => {
            if (!q) return true;
            return (
                (r.full_name || '').toLowerCase().includes(q) ||
                (r.registration_number || '').toLowerCase().includes(q) ||
                (r.nisn || '').includes(q) ||
                (r.asal_sekolah || '').toLowerCase().includes(q)
            );
        });
        const getVal = (r: RankingRow) => {
            if (sortBy === 'tpa') return r.tpa_percent ?? -1;
            if (sortBy === 'wawancara') return r.wawancara_percent ?? -1;
            return r.combined_percent ?? -1;
        };
        list = [...list].sort((a, b) => getVal(b) - getVal(a));
        return list.map((r, idx) => ({ ...r, displayRank: idx + 1 }));
    }, [ranking, searchQuery, sortBy]);

    const stats = useMemo(() => {
        const total = ranking.length;
        const sudahTPA = ranking.filter((r) => r.has_tpa).length;
        const sudahWawancara = ranking.filter((r) => r.has_wawancara).length;
        const sudahLengkap = ranking.filter((r) => r.has_tpa && r.has_wawancara).length;
        const sudahDiterima = ranking.filter((r) => r.status === 'Diterima').length;
        const belumDitetapkan = ranking.filter((r) => r.status !== 'Diterima' && r.status !== 'Ditolak').length;
        return { total, sudahTPA, sudahWawancara, sudahLengkap, sudahDiterima, belumDitetapkan };
    }, [ranking]);

    const hasActiveFilters =
        majorFilter !== 'ALL' || pathFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== '';

    const resetFilters = () => {
        setMajorFilter('ALL');
        setPathFilter('ALL');
        setStatusFilter('ALL');
        setSearchQuery('');
        setSortBy('combined');
    };

    const openAcceptModal = (row: RankingRow) => {
        setAcceptTarget(row);
        setAcceptMajorChoice('CHOICE_1');
        setAcceptModalOpen(true);
    };

    const confirmAccept = async () => {
        if (!acceptTarget) return;
        const major =
            acceptMajorChoice === 'CHOICE_2'
                ? acceptTarget.school_choice_2 || acceptTarget.school_choice
                : acceptTarget.school_choice;

        setProcessingId(acceptTarget.id);
        const loading = toast.loading(`Menetapkan ${acceptTarget.full_name} lulus di ${major}...`);
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: acceptTarget.id,
                    status: 'Diterima',
                    accepted_major: major,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`${acceptTarget.full_name} LULUS di ${major}`, { id: loading });
                setAcceptModalOpen(false);
                setAcceptTarget(null);
                fetchRanking();
                onStatusChange();
            } else {
                toast.error(data.error || 'Gagal menetapkan status.', { id: loading });
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.', { id: loading });
        } finally {
            setProcessingId(null);
        }
    };

    const exportXlsx = () => {
        if (displayed.length === 0) {
            toast.error('Belum ada data peringkat untuk diekspor.');
            return;
        }
        const rows = displayed.map((r: any) => ({
            'Peringkat': r.displayRank,
            'No Pendaftaran': r.registration_number,
            'Nama Lengkap': r.full_name,
            'NISN': r.nisn,
            'Jalur Pendaftaran': r.registration_path,
            'Asal Sekolah': r.asal_sekolah || '-',
            'Pilihan 1': r.school_choice,
            'Pilihan 2': r.school_choice_2 || '-',
            'Diterima di Jurusan': r.accepted_major || '-',
            'Status Seleksi': r.status,
            'TPA Literasi (/25)': r.tpa_literasi ?? '-',
            'TPA Numerasi (/25)': r.tpa_numerasi ?? '-',
            'TPA Total (/50)': r.tpa_total ?? '-',
            'TPA (%)': r.tpa_percent !== null ? `${r.tpa_percent}%` : '-',
            'Wawancara Skor Mentah': r.wawancara_total !== null ? `${r.wawancara_total} / ${r.wawancara_max}` : '-',
            'Wawancara (%)': r.wawancara_percent !== null ? `${r.wawancara_percent}%` : '-',
            'Total Skor Gabungan (%)': r.combined_percent !== null ? `${r.combined_percent}%` : '-',
            'Rekomendasi Pewawancara': r.interview_notes || '-',
            'Catatan Dokumen': r.document_notes || '-',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Peringkat_Pleno');

        const majorSuffix = majorFilter === 'ALL' ? 'SemuaJurusan' : majorFilter.replace(/\s+/g, '_');
        const pathSuffix = pathFilter === 'ALL' ? 'SemuaJalur' : pathFilter;
        const dateStr = new Date().toISOString().slice(0, 10);

        XLSX.writeFile(
            wb,
            `Rekap_Peringkat_Pleno_${majorSuffix}_${pathSuffix}_${dateStr}.xlsx`
        );
        toast.success(`Berhasil mengekspor ${rows.length} baris peringkat pleno.`);
    };

    const inputCls = isDarkMode
        ? 'bg-gray-950/80 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 outline-none'
        : 'bg-white border-[#cbb7a2] text-[#1f1410] placeholder-[#7a6358] focus:border-[#b85c38] outline-none';

    return (
        <div
            className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${
                isDarkMode
                    ? 'bg-gray-900/75 border-gray-800 shadow-black/40'
                    : 'bg-[#fffdf9]/95 border-white shadow-[#5c4033]/15'
            }`}
        >
            {/* Header & Bobot Perhitungan */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                    <div
                        className={`p-2.5 rounded-2xl shrink-0 ${
                            isDarkMode
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-emerald-100 text-emerald-800'
                        }`}
                    >
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <h2
                            className={`text-lg sm:text-xl font-extrabold flex items-center gap-2 ${
                                isDarkMode ? 'text-white' : 'text-[#1f1410]'
                            }`}
                        >
                            <span>Rekap Nilai &amp; Peringkat Pleno Seleksi</span>
                        </h2>
                        <div
                            className={`mt-1 inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-xs font-semibold ${
                                isDarkMode
                                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            }`}
                        >
                            <Info className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>
                                Bobot Pleno Resmi: <strong>TPA (Potensi Akademik) 60%</strong> &bull;{' '}
                                <strong>Wawancara Terstruktur 40%</strong>
                            </span>
                            <span className="opacity-75 font-normal">
                                (TPA = (Literasi + Numerasi) / 50 &bull; Wawancara = Skor / Skor Maks)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    <button
                        type="button"
                        onClick={fetchRanking}
                        disabled={isLoading}
                        title="Muat ulang data peringkat"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            isDarkMode
                                ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                        } disabled:opacity-50`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Muat Ulang</span>
                    </button>
                    <button
                        type="button"
                        onClick={exportXlsx}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold border shadow-sm transition-all ${
                            isDarkMode
                                ? 'bg-emerald-950/75 hover:bg-emerald-900/85 border-emerald-700/70 text-emerald-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                        }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Ekspor Pleno (.xlsx)</span>
                    </button>
                </div>
            </div>

            {/* Mini Stats Pleno */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
                <div
                    className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'
                    }`}
                >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                        Total Peserta
                    </p>
                    <p className="text-2xl font-black mt-0.5">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-blue-950/40 border-blue-800/70' : 'bg-blue-50 border-blue-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                        Sudah Tes TPA
                    </p>
                    <p className="text-2xl font-black mt-0.5 text-blue-700 dark:text-blue-400">{stats.sudahTPA}</p>
                </div>
                <div
                    className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-teal-950/40 border-teal-800/70' : 'bg-teal-50 border-teal-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                        Sudah Wawancara
                    </p>
                    <p className="text-2xl font-black mt-0.5 text-teal-700 dark:text-teal-400">{stats.sudahWawancara}</p>
                </div>
                <div
                    className={`p-3 rounded-2xl border ${
                        isDarkMode ? 'bg-amber-950/40 border-amber-800/70' : 'bg-amber-50 border-amber-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                        Belum Ditetapkan
                    </p>
                    <p className="text-2xl font-black mt-0.5 text-amber-700 dark:text-amber-400">{stats.belumDitetapkan}</p>
                </div>
                <div
                    className={`p-3 rounded-2xl border col-span-2 sm:col-span-1 ${
                        isDarkMode ? 'bg-emerald-950/40 border-emerald-800/70' : 'bg-emerald-50 border-emerald-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                        Sudah Lulus
                    </p>
                    <p className="text-2xl font-black mt-0.5 text-emerald-700 dark:text-emerald-400">{stats.sudahDiterima}</p>
                </div>
            </div>

            {/* Filter Bar Lengkap */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 mb-5">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search
                        className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                            isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'
                        }`}
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama, NISN, no reg, SMP..."
                        className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl border ${inputCls}`}
                    />
                </div>

                {/* Filter Jurusan */}
                <div className="relative">
                    <Filter
                        className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                            isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'
                        }`}
                    />
                    <select
                        value={majorFilter}
                        onChange={(e) => setMajorFilter(e.target.value)}
                        aria-label="Filter Jurusan"
                        className={`appearance-none pl-8 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border ${inputCls}`}
                    >
                        <option value="ALL">Semua Jurusan</option>
                        {MAJOR_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>

                {/* Filter Jalur Pendaftaran */}
                <div className="relative">
                    <select
                        value={pathFilter}
                        onChange={(e) => setPathFilter(e.target.value)}
                        aria-label="Filter Jalur Pendaftaran"
                        className={`appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border ${inputCls}`}
                    >
                        <option value="ALL">Semua Jalur</option>
                        <option value="Prestasi">Prestasi</option>
                        <option value="Reguler">Reguler</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>

                {/* Filter Status Kelulusan */}
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter Status Kelulusan"
                        className={`appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border ${inputCls}`}
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="Belum Ditetapkan">Belum Ditetapkan</option>
                        <option value="Diterima">Diterima</option>
                        <option value="Ditolak">Ditolak</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>

                {/* Urutkan Berdasarkan */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(e.target.value as 'combined' | 'tpa' | 'wawancara')
                        }
                        aria-label="Urutkan Peringkat"
                        className={`appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border ${inputCls}`}
                    >
                        <option value="combined">Urut: Nilai Gabungan</option>
                        <option value="tpa">Urut: Skor TPA (60%)</option>
                        <option value="wawancara">Urut: Skor Wawancara (40%)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                            isDarkMode
                                ? 'bg-rose-950/60 hover:bg-rose-900/70 border-rose-700 text-rose-300'
                                : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                        }`}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                    </button>
                )}

                <span
                    className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold self-end sm:self-auto ${
                        isDarkMode
                            ? 'bg-gray-950/60 border-gray-800 text-gray-300'
                            : 'bg-[#f7f1ea] border-[#d6c5b3] text-[#4a352b]'
                    }`}
                >
                    Menampilkan{' '}
                    <strong className={isDarkMode ? 'text-white' : 'text-[#1f1410]'}>
                        {displayed.length}
                    </strong>{' '}
                    peserta
                </span>
            </div>

            {/* Table Rekap Pleno */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-[#b85c38] border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-semibold text-sm">Memuat rekap peringkat pleno...</p>
                </div>
            ) : displayed.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                    <p className="font-semibold text-sm">
                        Belum ada peserta yang cocok dengan kriteria filter pleno saat ini.
                    </p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#b85c38] hover:bg-[#a04d2c] text-white"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Semua Filter
                        </button>
                    )}
                </div>
            ) : (
                <div
                    className={`overflow-x-auto rounded-2xl border ${
                        isDarkMode ? 'border-gray-800' : 'border-[#d6c5b3]'
                    }`}
                >
                    <table className="w-full text-left border-collapse min-w-[1250px]">
                        <thead>
                            <tr
                                className={`border-b-2 text-xs sm:text-[13px] uppercase tracking-wider font-extrabold ${
                                    isDarkMode
                                        ? 'bg-gray-950 text-gray-300 border-gray-800'
                                        : 'bg-[#efe4d6] text-[#2b1d18] border-[#d1bfa9]'
                                }`}
                            >
                                <th className="p-3.5 w-14 text-center">Rank</th>
                                <th className="p-3.5">Nama &amp; Identitas</th>
                                <th className="p-3.5">Jalur &amp; Pilihan Jurusan</th>
                                <th className="p-3.5 text-center">TPA Lit. (/25)</th>
                                <th className="p-3.5 text-center">TPA Num. (/25)</th>
                                <th className="p-3.5 text-center">TPA Total (60%)</th>
                                <th className="p-3.5 text-center">Wawancara (40%)</th>
                                <th className="p-3.5 text-center">Skor Gabungan</th>
                                <th className="p-3.5">Status &amp; Catatan Pleno</th>
                                <th className="p-3.5 text-center w-36">Aksi Pleno</th>
                            </tr>
                        </thead>
                        <tbody
                            className={`divide-y text-sm ${
                                isDarkMode ? 'divide-gray-800' : 'divide-[#e6d9ca]'
                            }`}
                        >
                            {displayed.map((r: any) => {
                                const isAccepted = r.status === 'Diterima';
                                return (
                                    <tr
                                        key={r.id}
                                        className={
                                            isAccepted
                                                ? isDarkMode
                                                    ? 'bg-emerald-950/25 hover:bg-emerald-950/40'
                                                    : 'bg-emerald-50/50 hover:bg-emerald-50/80'
                                                : isDarkMode
                                                ? 'bg-gray-900/40 hover:bg-gray-800/70'
                                                : 'bg-white hover:bg-[#faf4ec]'
                                        }
                                    >
                                        {/* Rank */}
                                        <td className="p-3.5 text-center">
                                            <span
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                                                    r.displayRank === 1
                                                        ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-300'
                                                        : r.displayRank === 2
                                                        ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-200'
                                                        : r.displayRank === 3
                                                        ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                                        : isDarkMode
                                                        ? 'bg-gray-800 text-gray-300'
                                                        : 'bg-[#eadfd2] text-[#2b1d18]'
                                                }`}
                                            >
                                                {r.displayRank}
                                            </span>
                                        </td>

                                        {/* Nama & Identitas */}
                                        <td className="p-3.5">
                                            <p
                                                className={`font-extrabold text-sm ${
                                                    isDarkMode ? 'text-white' : 'text-[#1f1410]'
                                                }`}
                                            >
                                                {r.full_name}
                                            </p>
                                            <p className="font-mono text-xs font-bold opacity-80 mt-0.5">
                                                {r.registration_number} &bull; NISN {r.nisn}
                                            </p>
                                            {r.asal_sekolah && (
                                                <p className="text-[11px] font-medium opacity-70 mt-0.5">
                                                    SMP: {r.asal_sekolah}
                                                </p>
                                            )}
                                        </td>

                                        {/* Jalur & Pilihan Jurusan */}
                                        <td className="p-3.5">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                {r.registration_path === 'Prestasi' ? (
                                                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                                                        <Award className="w-3 h-3" /> Prestasi
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 dark:bg-gray-800 dark:text-gray-300 border border-stone-300 dark:border-gray-700">
                                                        Reguler
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                1. {r.school_choice}
                                            </p>
                                            {r.school_choice_2 && (
                                                <p className="text-xs font-medium opacity-80 mt-0.5">
                                                    2. {r.school_choice_2}
                                                </p>
                                            )}
                                        </td>

                                        {/* TPA Literasi */}
                                        <td className="p-3.5 text-center">
                                            {r.tpa_literasi !== null ? (
                                                <span className="font-mono font-extrabold text-sm">
                                                    {r.tpa_literasi}{' '}
                                                    <span className="text-[10px] opacity-60">/25</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs opacity-50 font-mono">-</span>
                                            )}
                                        </td>

                                        {/* TPA Numerasi */}
                                        <td className="p-3.5 text-center">
                                            {r.tpa_numerasi !== null ? (
                                                <span className="font-mono font-extrabold text-sm">
                                                    {r.tpa_numerasi}{' '}
                                                    <span className="text-[10px] opacity-60">/25</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs opacity-50 font-mono">-</span>
                                            )}
                                        </td>

                                        {/* TPA Total & % */}
                                        <td className="p-3.5 text-center">
                                            {r.tpa_total !== null ? (
                                                <div>
                                                    <p className="font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                                                        {r.tpa_percent}%
                                                    </p>
                                                    <p className="text-[10px] opacity-70 font-medium">
                                                        {r.tpa_total}/50
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs opacity-50 font-mono">-</span>
                                            )}
                                        </td>

                                        {/* Wawancara Total & % */}
                                        <td className="p-3.5 text-center">
                                            {r.wawancara_total !== null ? (
                                                <div>
                                                    <p className="font-mono font-black text-sm text-teal-700 dark:text-teal-400">
                                                        {r.wawancara_percent}%
                                                    </p>
                                                    <p className="text-[10px] opacity-70 font-medium">
                                                        {r.wawancara_total}/{r.wawancara_max}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs opacity-50 font-mono">-</span>
                                            )}
                                        </td>

                                        {/* Skor Gabungan */}
                                        <td className="p-3.5 text-center">
                                            {r.combined_percent !== null ? (
                                                <span
                                                    className={`inline-block px-3 py-1.5 rounded-xl font-black text-sm shadow-xs ${
                                                        r.combined_percent >= 75
                                                            ? 'bg-emerald-600 text-white'
                                                            : r.combined_percent >= 60
                                                            ? 'bg-blue-600 text-white'
                                                            : r.combined_percent >= 45
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-rose-600 text-white'
                                                    }`}
                                                >
                                                    {r.combined_percent}%
                                                </span>
                                            ) : (
                                                <span className="text-xs opacity-50 font-mono">-</span>
                                            )}
                                        </td>

                                        {/* Status & Rekomendasi Pewawancara */}
                                        <td className="p-3.5">
                                            <div className="space-y-1">
                                                {isAccepted ? (
                                                    <div className="space-y-0.5">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                                            <CheckCircle2 className="w-3 h-3" /> DITERIMA
                                                        </span>
                                                        {r.accepted_major && (
                                                            <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                                                                {r.accepted_major}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : r.status === 'Ditolak' ? (
                                                    <span className="inline-flex items-center text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                                                        DITOLAK
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                                                        {r.status}
                                                    </span>
                                                )}

                                                {/* Catatan / Rekomendasi Pewawancara */}
                                                {r.interview_notes && (
                                                    <div className="flex items-start gap-1 text-[11px] opacity-80 text-teal-800 dark:text-teal-300">
                                                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                                        <span className="line-clamp-2" title={r.interview_notes}>
                                                            {r.interview_notes}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Aksi Pleno */}
                                        <td className="p-3.5 text-center">
                                            {!isAccepted && (r.has_tpa || r.has_wawancara) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openAcceptModal(r)}
                                                    disabled={processingId === r.id}
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm disabled:opacity-50 active:scale-95 w-full transition-all"
                                                >
                                                    <GraduationCap className="w-3.5 h-3.5" />
                                                    <span>Tetapkan Lulus</span>
                                                </button>
                                            ) : isAccepted ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openAcceptModal(r)}
                                                    disabled={processingId === r.id}
                                                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                                                        isDarkMode
                                                            ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                                                            : 'border-[#cbb7a2] hover:bg-[#f7f1ea] text-[#3d271d]'
                                                    }`}
                                                >
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    <span>Ubah Jurusan</span>
                                                </button>
                                            ) : (
                                                <span className="text-[11px] font-medium opacity-50">
                                                    Belum ada skor
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Tetapkan Lulus */}
            {acceptModalOpen && acceptTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div
                        className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${
                            isDarkMode
                                ? 'bg-gray-900 border-gray-800 text-white'
                                : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                        }`}
                    >
                        <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-extrabold flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-emerald-600" />
                                <span>Penetapan Kelulusan Pleno</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setAcceptModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div
                                className={`p-3.5 rounded-2xl border ${
                                    isDarkMode
                                        ? 'bg-gray-950/60 border-gray-800'
                                        : 'bg-[#faf4ec] border-[#d6c5b3]'
                                }`}
                            >
                                <p className="font-extrabold text-sm">{acceptTarget.full_name}</p>
                                <p className="font-mono text-xs font-bold opacity-75 mt-0.5">
                                    {acceptTarget.registration_number} &bull; NISN {acceptTarget.nisn}
                                </p>
                                <div className="mt-2 text-xs flex flex-wrap gap-x-3 gap-y-1 font-semibold">
                                    <span>
                                        Jalur:{' '}
                                        <strong className="text-amber-700 dark:text-amber-400">
                                            {acceptTarget.registration_path}
                                        </strong>
                                    </span>
                                    <span>
                                        Nilai Gabungan:{' '}
                                        <strong className="text-emerald-700 dark:text-emerald-400">
                                            {acceptTarget.combined_percent !== null
                                                ? `${acceptTarget.combined_percent}%`
                                                : '-'}
                                        </strong>
                                    </span>
                                </div>
                                {acceptTarget.interview_notes && (
                                    <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-1.5 bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-200 dark:border-teal-800/60">
                                        Catatan Wawancara: {acceptTarget.interview_notes}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold mb-2">
                                    Tetapkan Kelulusan pada Kompetensi Keahlian:
                                </label>
                                <div className="space-y-2">
                                    <label
                                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                                            acceptMajorChoice === 'CHOICE_1'
                                                ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-600'
                                                : isDarkMode
                                                ? 'bg-gray-950/60 border-gray-700'
                                                : 'bg-white border-[#d6c5b3]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            checked={acceptMajorChoice === 'CHOICE_1'}
                                            onChange={() => setAcceptMajorChoice('CHOICE_1')}
                                            className="accent-emerald-600"
                                        />
                                        <div className="text-xs">
                                            <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                                                Pilihan 1:
                                            </span>{' '}
                                            <span className="font-bold">{acceptTarget.school_choice}</span>
                                        </div>
                                    </label>

                                    {acceptTarget.school_choice_2 && (
                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                                                acceptMajorChoice === 'CHOICE_2'
                                                    ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-600'
                                                : isDarkMode
                                                    ? 'bg-gray-950/60 border-gray-700'
                                                    : 'bg-white border-[#d6c5b3]'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                checked={acceptMajorChoice === 'CHOICE_2'}
                                                onChange={() => setAcceptMajorChoice('CHOICE_2')}
                                                className="accent-emerald-600"
                                            />
                                            <div className="text-xs">
                                                <span className="font-extrabold text-blue-800 dark:text-blue-300">
                                                    Pilihan 2:
                                                </span>{' '}
                                                <span className="font-bold">{acceptTarget.school_choice_2}</span>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-4">
                            <button
                                type="button"
                                onClick={() => setAcceptModalOpen(false)}
                                className="w-1/3 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold text-xs transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={processingId === acceptTarget.id}
                                onClick={confirmAccept}
                                className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md disabled:opacity-50 transition-all"
                            >
                                {processingId === acceptTarget.id ? 'Memproses...' : 'Tetapkan LULUS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
