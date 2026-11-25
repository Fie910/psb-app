//src/app/admin/audit-log/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    History,
    ArrowLeft,
    Search,
    Filter,
    Download,
    RotateCcw,
    Shield,
    Calendar,
    ChevronDown,
    ChevronRight,
    UserCheck,
    User,
    CheckCircle2,
    SlidersHorizontal,
    Info,
    ExternalLink
} from 'lucide-react';
import { PANITIA_ROLES, type PanitiaRole } from '@/lib/rbac';

interface AuditLog {
    id: number;
    actor_id: string | null;
    actor_name: string;
    actor_email: string | null;
    actor_role: PanitiaRole;
    action: string;
    target_type: string | null;
    target_id: string | null;
    summary: string;
    metadata: Record<string, any> | null;
    created_at: string;
}

export default function AdminAuditLogPage() {
    const { isDarkMode } = useTheme();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // Filter states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [actorFilter, setActorFilter] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');

    // Detail expanded row
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

    // Ambil data log
    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            setError('');

            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            if (selectedAction) params.set('action', selectedAction);
            if (actorFilter.trim()) params.set('actor', actorFilter.trim());
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);

            const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    setError('Akses Ditolak: Halaman ini khusus untuk Super Admin.');
                } else {
                    setError(data.error || 'Gagal memuat log aktivitas.');
                }
                setLogs([]);
            } else {
                setLogs(data.logs || []);
                if (data.availableActions) {
                    setAvailableActions(data.availableActions);
                }
            }
        } catch {
            setError('Terjadi kesalahan koneksi saat memuat audit log.');
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleApplyFilter = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs();
    };

    const handleResetFilter = () => {
        setSearchQuery('');
        setSelectedAction('');
        setActorFilter('');
        setFromDate('');
        setToDate('');
        setTimeout(() => {
            fetchLogs();
        }, 50);
    };

    // Ekspor Excel
    const handleExportExcel = () => {
        if (logs.length === 0) {
            toast.error('Tidak ada data audit log untuk diekspor.');
            return;
        }

        try {
            const excelRows = logs.map((item, idx) => ({
                'No': idx + 1,
                'Waktu (WIB)': new Date(item.created_at).toLocaleString('id-ID'),
                'Nama Panitia': item.actor_name,
                'Email Panitia': item.actor_email || '-',
                'Peran (Role)': item.actor_role,
                'Aksi': item.action,
                'Target Tipe': item.target_type || '-',
                'Target ID': item.target_id || '-',
                'Ringkasan Aktivitas': item.summary,
                'Detail Metadata': item.metadata ? JSON.stringify(item.metadata) : '-',
            }));

            const ws = XLSX.utils.json_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Audit Log Panitia');

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Audit_Log_Panitia_PSB_${dateStr}.xlsx`);
            toast.success('File Excel Audit Log berhasil diunduh!');
        } catch {
            toast.error('Gagal mengekspor data ke Excel.');
        }
    };

    const getRoleBadge = (role: string) => {
        const found = PANITIA_ROLES.find((r) => r.role === role);
        if (found) {
            return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${found.badgeColor}`}>
                    {found.label}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                {role}
            </span>
        );
    };

    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case 'UPDATE_STATUS':
                return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
            case 'BULK_ACTION':
                return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
            case 'VERIFY_REREG':
                return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            case 'SAVE_INTERVIEW_SCORE':
                return 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30';
            case 'UPDATE_SETTINGS':
                return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
            case 'CREATE_PANITIA':
            case 'UPDATE_PANITIA_ROLE':
                return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
            default:
                return 'bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-500/30';
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
                                isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'
                            }`}
                        >
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black">Audit Log Aktivitas Panitia</h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                    <Shield className="w-3 h-3" /> Super Admin
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Riwayat lengkap perubahan status, aksi massal, verifikasi dokumen, dan penilaian wawancara.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <ThemeToggle />
                        <Link
                            href="/admin/kelola-panitia"
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            Kelola Peran
                        </Link>
                        <Link
                            href="/admin"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-md transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Kembali ke Admin
                        </Link>
                    </div>
                </header>

                {/* Filter & Toolbar */}
                <section
                    className={`p-5 rounded-3xl border shadow-lg backdrop-blur-xl transition-colors ${
                        isDarkMode
                            ? 'bg-gray-900/70 border-gray-800'
                            : 'bg-white/80 border-white/60'
                    }`}
                >
                    <form onSubmit={handleApplyFilter} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Pencarian Kata Kunci */}
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Cari Aktivitas / Target:
                                </label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari ringkasan, nama siswa, no registrasi..."
                                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-colors ${
                                            isDarkMode
                                                ? 'bg-gray-800/80 border-gray-700 text-white focus:border-rose-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-rose-600'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Filter Jenis Aksi */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Jenis Tindakan:
                                </label>
                                <select
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors cursor-pointer ${
                                        isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-white focus:border-rose-500'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-rose-600'
                                    }`}
                                >
                                    <option value="">Semua Jenis Aksi</option>
                                    {availableActions.map((act) => (
                                        <option key={act} value={act}>
                                            {act}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter Rentang Tanggal Mulai */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Dari Tanggal:
                                </label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-white focus:border-rose-500'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-rose-600'
                                    }`}
                                />
                            </div>

                            {/* Filter Rentang Tanggal Selesai */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    Sampai Tanggal:
                                </label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-white focus:border-rose-500'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-rose-600'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Baris Tombol Aksi Filter & Ekspor */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Menampilkan <strong className="text-rose-500">{logs.length}</strong> catatan aktivitas
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetFilter}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                                            : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                                    }`}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors flex items-center gap-1.5"
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    Terapkan Filter
                                </button>

                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Ekspor Excel
                                </button>
                            </div>
                        </div>
                    </form>
                </section>

                {/* Pesan Error / Akses Ditolak */}
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
                        {error}
                    </div>
                )}

                {/* Tabel Audit Log */}
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
                                    <th className="py-3.5 px-4 w-44">Waktu (WIB)</th>
                                    <th className="py-3.5 px-4 w-52">Panitia / Aktor</th>
                                    <th className="py-3.5 px-4 w-36">Tindakan</th>
                                    <th className="py-3.5 px-4">Ringkasan Aktivitas</th>
                                    <th className="py-3.5 px-4 w-28 text-center">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-400">
                                            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            Memuat catatan audit log...
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-400">
                                            Tidak ada riwayat aktivitas yang sesuai filter.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log, index) => {
                                        const isExpanded = expandedRowId === log.id;
                                        const dateObj = new Date(log.created_at);

                                        return (
                                            <tr
                                                key={log.id}
                                                className={`transition-colors ${
                                                    isDarkMode
                                                        ? 'hover:bg-gray-800/40'
                                                        : 'hover:bg-amber-50/40'
                                                }`}
                                            >
                                                <td className="py-3.5 px-4 text-center font-mono text-gray-400">
                                                    {index + 1}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {dateObj.toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}{' '}
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">
                                                        {dateObj.toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                        })}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-gray-900 dark:text-gray-100">
                                                        {log.actor_name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]">
                                                        {log.actor_email || '-'}
                                                    </div>
                                                    <div className="mt-1">{getRoleBadge(log.actor_role)}</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${getActionBadgeColor(
                                                            log.action
                                                        )}`}
                                                    >
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                                                        {log.summary}
                                                    </p>
                                                    {log.target_type && (
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            Target: {log.target_type} {log.target_id ? `(#${log.target_id})` : ''}
                                                        </span>
                                                    )}

                                                    {/* Expanded metadata */}
                                                    {isExpanded && log.metadata && (
                                                        <div className="mt-2 p-3 rounded-xl bg-gray-950/70 border border-gray-800 text-gray-300 font-mono text-[11px] overflow-x-auto">
                                                            <div className="text-[10px] text-gray-400 font-sans font-bold uppercase mb-1">
                                                                Detail Payload Metadata:
                                                            </div>
                                                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {log.metadata ? (
                                                        <button
                                                            onClick={() =>
                                                                setExpandedRowId(isExpanded ? null : log.id)
                                                            }
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                                                isExpanded
                                                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                                                    : 'bg-gray-800/40 hover:bg-gray-800 border-gray-700 text-gray-300'
                                                            }`}
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <ChevronDown className="w-3 h-3" /> Tutup
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronRight className="w-3 h-3" /> Detail
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-[11px]">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
