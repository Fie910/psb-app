//src/app/admin/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    FileSpreadsheet,
    UserPlus,
    User,
    Settings,
    FileText,
    Calendar,
    AlertCircle,
    Video,
    FileCheck2,
    Camera,
    X,
    Printer,
    CheckCircle2,
    ExternalLink,
    Search,
    ChevronDown,
    Award,
    Users,
    Clock,
    AlertTriangle,
    ClipboardCheck,
    XCircle,
    Filter,
    RotateCcw,
    GraduationCap,
    CalendarClock
} from 'lucide-react';

type Applicant = {
    id: number;
    registration_number: string;
    full_name: string;
    email: string;
    phone: string;
    asal_sekolah: string;
    father_name: string;
    mother_name: string;
    parent_phone: string;
    school_choice: string;
    school_choice_2: string | null;
    registration_path?: string | null;
    document_kk: string | null;
    document_akta: string | null;
    document_prestasi?: string | null;
    document_notes: string | null;
    revision_fields: string[];
    status: string;
    created_at: string;
    nisn: string;
    tanggal_lahir: string;
    test_date: string | null;
    test_time: string | null;
    test_location: string | null;
    accepted_at: string | null;
    accepted_major: string | null;
    interview_date: string | null;
    interview_time: string | null;
    interview_link: string | null;
};

const DIMENSION_NAMES: Record<string, Record<string, string>> = {
    'DIAGNOSTIK': { 'D1': 'Kesejahteraan Psikologis', 'D2': 'Kompetensi Sosial-Emosional', 'D3': 'Motivasi Belajar', 'D4': 'Kemandirian Belajar', 'D5': 'Dukungan Keluarga', 'D6': 'Latar Belakang Pergaulan', 'D7': 'Minat & Gaya Belajar' },
    'SOSIAL_EMOSIONAL': { 'D1': 'Kesadaran Diri', 'D2': 'Manajemen Diri', 'D3': 'Kesadaran Sosial', 'D4': 'Keterampilan Relasi', 'D5': 'Pengambilan Keputusan' },
    'CHARACTER': { 'D1': 'Inisiatif', 'D2': 'Keterlibatan Intelektual', 'D3': 'Keterbukaan Pikiran', 'D4': 'Ketahanan', 'D5': 'Kontrol Diri', 'D6': 'Kesadaran Sosial', 'D7': 'Kerja Sama Tim' },
    'BIG_FIVE': { 'O': 'Keterbukaan (Openness)', 'C': 'Kehati-hatian (Conscientiousness)', 'E': 'Ekstroversi (Extraversion)', 'A': 'Keramahan (Agreeableness)', 'N': 'Neurotisisme (Neuroticism)' }
};

const MAJOR_OPTIONS = [
    'Farmasi Klinis dan Komunitas',
    'Produksi dan Siaran Program Televisi',
    'Manajemen Perkantoran',
];

export default function AdminDashboard() {
    const { isDarkMode } = useTheme();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // State Filter Multi-Kriteria
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [majorFilter, setMajorFilter] = useState<string>('ALL');
    const [pathFilter, setPathFilter] = useState<string>('ALL');

    // State Modal Perbaikan
    const [revisionModalOpen, setRevisionModalOpen] = useState(false);

    // State Modal Jadwal & Jurusan
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [modalTestDate, setModalTestDate] = useState('');
    const [modalTestTime, setModalTestTime] = useState('');
    const [modalTestLocation, setModalTestLocation] = useState('');
    const [modalInterviewDate, setModalInterviewDate] = useState('');
    const [modalInterviewTime, setModalInterviewTime] = useState('');
    const [modalInterviewLink, setModalInterviewLink] = useState('');
    const [modalAcceptedMajor, setModalAcceptedMajor] = useState('');

    // State Modal Perbaikan (Fields)
    const [modalNotes, setModalNotes] = useState('');
    const [modalFields, setModalFields] = useState<string[]>([]);

    // State Modal Hasil Tes
    const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
    const [selectedResult, setSelectedResult] = useState<any[] | null>(null);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Laporan_Asesmen_${selectedApp?.full_name || 'Siswa'}`,
    });

    // State Modal Wawancara
    const [interviewModalOpen, setInterviewModalOpen] = useState(false);
    const [interviewRubric, setInterviewRubric] = useState<any[]>([]);
    const [interviewScores, setInterviewScores] = useState<Record<number, number>>({});

    // State Modal Snapshot
    const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
    const [snapshots, setSnapshots] = useState<any[]>([]);

    useEffect(() => { fetchApplicants(); }, []);

    const fetchApplicants = async () => {
        try {
            const res = await fetch('/api/admin/applicants');
            if (res.status === 401) {
                toast.error('Sesi berakhir, mengalihkan ke halaman login...');
                window.location.href = '/login';
                return;
            }
            const data = await res.json();
            if (data.applicants) setApplicants(data.applicants);
        } catch (error) {
            console.error('Gagal mengambil data', error);
            toast.error('Gagal memuat data pendaftar');
        } finally {
            setIsLoading(false);
        }
    };

    // Perhitungan KPI & Statistik Jurusan secara Memoized
    const stats = useMemo(() => {
        const total = applicants.length;
        const pending = applicants.filter(a => a.status === 'Pending').length;
        const revision = applicants.filter(a => a.status === 'Perbaikan').length;
        const readyTest = applicants.filter(a => a.status === 'Siap Tes dan/atau Wawancara' || a.status === 'Siap Tes').length;
        const accepted = applicants.filter(a => a.status === 'Diterima').length;
        const rejected = applicants.filter(a => a.status === 'Ditolak').length;
        const prestasiCount = applicants.filter(a => a.registration_path === 'Prestasi').length;
        const regulerCount = total - prestasiCount;

        const byMajor = MAJOR_OPTIONS.map((major) => {
            const choice1Count = applicants.filter(a => a.school_choice === major).length;
            const acceptedCount = applicants.filter(
                a => a.status === 'Diterima' && (a.accepted_major || a.school_choice) === major
            ).length;
            return {
                major,
                choice1Count,
                acceptedCount,
            };
        });

        return {
            total,
            pending,
            revision,
            readyTest,
            accepted,
            rejected,
            prestasiCount,
            regulerCount,
            byMajor,
        };
    }, [applicants]);

    const filteredApplicants = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return applicants.filter(app => {
            const matchesSearch =
                !q ||
                (app.full_name || '').toLowerCase().includes(q) ||
                (app.registration_number || '').toLowerCase().includes(q) ||
                (app.nisn || '').includes(q) ||
                (app.asal_sekolah || '').toLowerCase().includes(q);

            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'SIAP_TES'
                    ? app.status === 'Siap Tes dan/atau Wawancara' || app.status === 'Siap Tes'
                    : app.status === statusFilter);

            const matchesMajor =
                majorFilter === 'ALL' ||
                app.school_choice === majorFilter ||
                app.accepted_major === majorFilter;

            const normalizedPath = app.registration_path || 'Reguler';
            const matchesPath = pathFilter === 'ALL' || normalizedPath === pathFilter;

            return matchesSearch && matchesStatus && matchesMajor && matchesPath;
        });
    }, [applicants, searchQuery, statusFilter, majorFilter, pathFilter]);

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        statusFilter !== 'ALL' ||
        majorFilter !== 'ALL' ||
        pathFilter !== 'ALL';

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setMajorFilter('ALL');
        setPathFilter('ALL');
    };

    const handleExportExcel = () => {
        const sourceData = filteredApplicants;
        const dataToExport = sourceData.map((app, index) => ({
            'No': index + 1,
            'No Pendaftaran': app.registration_number,
            'Jalur': app.registration_path || 'Reguler',
            'Nama Lengkap': app.full_name,
            'NISN': app.nisn,
            'Tgl Lahir': app.tanggal_lahir,
            'Asal Sekolah': app.asal_sekolah,
            'Email': app.email,
            'No HP': app.phone,
            'Nama Ayah': app.father_name,
            'Nama Ibu': app.mother_name,
            'No HP Ortu': app.parent_phone,
            'Pilihan 1': app.school_choice,
            'Pilihan 2': app.school_choice_2 || '-',
            'Jurusan Diterima': app.accepted_major || '-',
            'Status': app.status,
            'Tgl Tes': app.test_date || '-',
            'Jam Tes': app.test_time || '-',
            'Lokasi Tes': app.test_location || '-',
            'Tgl Wawancara': app.interview_date || '-',
            'Jam Wawancara': app.interview_time || '-',
            'Tgl Daftar': new Date(app.created_at).toLocaleString('id-ID'),
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendaftar');
        const suffix = hasActiveFilters ? '_Terfilter' : '';
        XLSX.writeFile(workbook, `Data_Pendaftar_PSB${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Berhasil mengekspor ${sourceData.length} data ke Excel`);
    };

    const handleViewSnapshots = async (id: number) => {
        try {
            const res = await fetch(`/api/admin/snapshots?applicant_id=${id}`);
            const data = await res.json();
            if (res.ok) { setSnapshots(data.snapshots); setSnapshotModalOpen(true); }
            else { toast.error(data.error || 'Gagal mengambil snapshot'); }
        } catch { toast.error('Gagal mengambil snapshot'); }
    };

    const handleViewResults = async (id: number, app: Applicant) => {
        setSelectedApp(app);
        try {
            const res = await fetch(`/api/admin/results?applicant_id=${id}`);
            const data = await res.json();
            if (res.ok) { setSelectedResult(data.results); setResultModalOpen(true); }
            else { toast.error(data.error || 'Belum ada hasil tes'); }
        } catch { toast.error('Gagal mengambil hasil tes'); }
    };

    const handleViewDocument = async (key: string) => {
        try {
            const res = await fetch('/api/admin/document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            const data = await res.json();
            if (data.viewUrl) window.open(data.viewUrl, '_blank');
            else toast.error(data.error || 'Gagal membuka dokumen');
        } catch { toast.error('Terjadi kesalahan saat membuka dokumen'); }
    };

    const handleUpdateStatus = async (id: number, newStatus: string, accepted_major?: string) => {
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus, accepted_major })
            });
            if (res.ok) {
                setApplicants(prev =>
                    prev.map(app =>
                        app.id === id
                            ? {
                                ...app,
                                status: newStatus,
                                accepted_major: accepted_major !== undefined ? accepted_major : app.accepted_major,
                            }
                            : app
                    )
                );
                toast.success(`Status diubah menjadi: ${newStatus}`);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Gagal mengubah status');
            }
        } catch { toast.error('Gagal mengubah status'); }
    };

    const openScheduleModal = (app: Applicant) => {
        setSelectedApp(app);
        setModalTestDate(app.test_date ? app.test_date.split('T')[0] : '');
        setModalTestTime(app.test_time ? app.test_time.slice(0, 5) : '');
        setModalTestLocation(app.test_location || '');
        setModalInterviewDate(app.interview_date ? app.interview_date.split('T')[0] : '');
        setModalInterviewTime(app.interview_time ? app.interview_time.slice(0, 5) : '');
        setModalInterviewLink(app.interview_link || '');
        setModalAcceptedMajor(app.accepted_major || '');
        setScheduleModalOpen(true);
    };

    const openRevisionModal = (app: Applicant) => {
        setSelectedApp(app);
        setModalNotes(app.document_notes || '');
        setModalFields(app.revision_fields || []);
        setRevisionModalOpen(true);
    };

    const openInterviewModal = async (app: Applicant) => {
        setSelectedApp(app);
        setInterviewModalOpen(true);
        try {
            const res = await fetch('/api/admin/rubric');
            const data = await res.json();
            if (res.ok) setInterviewRubric(data.rubric);
            const scoreRes = await fetch(`/api/admin/interview-scores?applicant_id=${app.id}`);
            const scoreData = await scoreRes.json();
            if (scoreRes.ok && scoreData.scores) {
                const existingScores: Record<number, number> = {};
                scoreData.scores.forEach((s: any) => { existingScores[s.rubric_id] = s.score; });
                setInterviewScores(existingScores);
            }
        } catch { toast.error('Gagal memuat rubrik'); }
    };

    const handleSaveSchedule = async () => {
        if (!selectedApp) return;
        const loadingToast = toast.loading('Menyimpan jadwal & jurusan...');
        try {
            const res = await fetch('/api/admin/update-schedule', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedApp.id,
                    test_date: modalTestDate,
                    test_time: modalTestTime,
                    test_location: modalTestLocation,
                    interview_date: modalInterviewDate,
                    interview_time: modalInterviewTime,
                    interview_link: modalInterviewLink,
                    accepted_major: modalAcceptedMajor
                }),
            });
            if (res.ok) {
                setApplicants(prev =>
                    prev.map(app =>
                        app.id === selectedApp.id
                            ? {
                                ...app,
                                test_date: modalTestDate || null,
                                test_time: modalTestTime || null,
                                test_location: modalTestLocation || null,
                                interview_date: modalInterviewDate || null,
                                interview_time: modalInterviewTime || null,
                                interview_link: modalInterviewLink || null,
                                accepted_major: modalAcceptedMajor || null,
                            }
                            : app
                    )
                );
                setScheduleModalOpen(false);
                toast.success('Jadwal & Jurusan berhasil disimpan!', { id: loadingToast });
            } else {
                const err = await res.json();
                toast.error(err.error || 'Gagal menyimpan jadwal', { id: loadingToast });
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan', { id: loadingToast });
        }
    };

    const handleSaveRevision = async () => {
        if (!selectedApp) return;
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedApp.id, notes: modalNotes, revision_fields: modalFields, status: 'Perbaikan' }),
            });
            if (res.ok) {
                setApplicants(prev =>
                    prev.map(app =>
                        app.id === selectedApp.id
                            ? { ...app, document_notes: modalNotes, revision_fields: modalFields, status: 'Perbaikan' }
                            : app
                    )
                );
                setRevisionModalOpen(false);
                toast.success('Permintaan perbaikan dikirim!');
            } else {
                toast.error('Gagal menyimpan perbaikan');
            }
        } catch { toast.error('Gagal menyimpan perbaikan'); }
    };

    const handleSaveInterview = async () => {
        if (!selectedApp) return;
        const loading = toast.loading('Menyimpan nilai wawancara...');
        try {
            const res = await fetch('/api/admin/interview-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: selectedApp.id, scores: interviewScores })
            });
            if (res.ok) { toast.success('Nilai disimpan!', { id: loading }); setInterviewModalOpen(false); }
            else { toast.error('Gagal menyimpan nilai.', { id: loading }); }
        } catch { toast.error('Kesalahan jaringan.', { id: loading }); }
    };

    const toggleField = (field: string) => setModalFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);

    const toggleStatusCardFilter = (target: string) => {
        setStatusFilter(prev => (prev === target ? 'ALL' : target));
    };

    return (
        <main className={`min-h-screen p-4 sm:p-8 transition-colors duration-500 font-sans relative overflow-x-hidden ${isDarkMode
            ? 'bg-linear-to-br from-gray-950 via-slate-900 to-black text-gray-100'
            : 'bg-linear-to-br from-[#d5beaa] via-[#b89779] to-[#987657] text-[#1f1410]'
            }`}>
            <Toaster position="top-center" />

            {/* Ambient modern glass glow */}
            <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none transition-all duration-700 ${isDarkMode ? 'bg-indigo-600/20' : 'bg-[#e3c8af]/40'
                }`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none transition-all duration-700 ${isDarkMode ? 'bg-teal-600/15' : 'bg-[#f0decb]/40'
                }`}></div>

            <div className="max-w-[1520px] mx-auto z-10 relative space-y-6">
                {/* Header Card */}
                <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${isDarkMode
                    ? 'bg-gray-900/75 border-gray-800 shadow-black/40'
                    : 'bg-[#fffdf9]/92 border-white shadow-[#5c4033]/15'
                    }`}>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${isDarkMode
                                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                : 'bg-[#b85c38]/12 text-[#8f3f20] border-[#b85c38]/30'
                                }`}>
                                Portal Administrasi PSB
                            </span>
                        </div>
                        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            Dashboard Verifikasi &amp; Seleksi
                        </h1>
                        <p className={`text-sm sm:text-[15px] mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                            SMK KH. A. WAHAB MUHSIN &bull; Reguler: <span className="font-extrabold">{stats.regulerCount}</span> &bull; Prestasi: <span className="font-extrabold">{stats.prestasiCount}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        <button
                            onClick={handleExportExcel}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/70 text-emerald-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                                }`}
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>{hasActiveFilters ? `Ekspor Terfilter (${filteredApplicants.length})` : 'Ekspor Excel'}</span>
                        </button>

                        <Link
                            href="/admin/kelola-panitia"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-indigo-950/70 hover:bg-indigo-900/80 border-indigo-700/70 text-indigo-300'
                                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-900'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>+ Panitia</span>
                        </Link>

                        <Link
                            href="/admin/akun"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                }`}
                        >
                            <User className="w-4 h-4 text-[#5c4337] dark:text-gray-400" />
                            <span>Akun</span>
                        </Link>

                        <Link
                            href="/admin/kelola-tes"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-blue-950/70 hover:bg-blue-900/80 border-blue-700/70 text-blue-300'
                                : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-900'
                                }`}
                        >
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Kelola Soal</span>
                        </Link>

                        <Link
                            href="/admin/pengaturan"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                }`}
                        >
                            <Settings className="w-4 h-4 text-[#5c4337] dark:text-gray-400" />
                            <span>Pengaturan</span>
                        </Link>

                        <ThemeToggle />
                    </div>
                </div>

                {/* KPI SUMMARY CARDS (Klik kartu untuk memfilter cepat) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {/* Total Pendaftar */}
                    <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`text-left p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'ALL'
                            ? isDarkMode
                                ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                                : 'bg-white border-[#b85c38] ring-2 ring-[#b85c38]/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                                Total Pendaftar
                            </span>
                            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.total}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Semua calon siswa
                        </p>
                    </button>

                    {/* Pending */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Pending')}
                        className={`text-left p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Pending'
                            ? isDarkMode
                                ? 'bg-yellow-950/75 border-yellow-500 ring-2 ring-yellow-500/30 shadow-lg'
                                : 'bg-yellow-50 border-yellow-600 ring-2 ring-yellow-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-yellow-400' : 'text-yellow-900'}`}>
                                Pending
                            </span>
                            <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.pending}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Menunggu verifikasi
                        </p>
                    </button>

                    {/* Perbaikan */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Perbaikan')}
                        className={`text-left p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Perbaikan'
                            ? isDarkMode
                                ? 'bg-amber-950/75 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                                : 'bg-amber-50 border-amber-600 ring-2 ring-amber-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-amber-400' : 'text-amber-900'}`}>
                                Perbaikan
                            </span>
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.revision}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Revisi data / berkas
                        </p>
                    </button>

                    {/* Siap Tes & Wawancara */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('SIAP_TES')}
                        className={`text-left p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'SIAP_TES'
                            ? isDarkMode
                                ? 'bg-blue-950/75 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                                : 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                                Siap Seleksi
                            </span>
                            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400">
                                <ClipboardCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.readyTest}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Tes &amp; Wawancara
                        </p>
                    </button>

                    {/* Diterima */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Diterima')}
                        className={`text-left p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Diterima'
                            ? isDarkMode
                                ? 'bg-emerald-950/75 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                                : 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>
                                Diterima
                            </span>
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.accepted}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Lulus seleksi PSB
                        </p>
                    </button>

                    {/* Ditolak */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Ditolak')}
                        className={`text-left p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Ditolak'
                            ? isDarkMode
                                ? 'bg-rose-950/75 border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
                                : 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-rose-400' : 'text-rose-900'}`}>
                                Ditolak
                            </span>
                            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400">
                                <XCircle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.rejected}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Tidak lolos seleksi
                        </p>
                    </button>
                </div>

                {/* DISTRIBUSI PER KOMPETENSI KEAHLIAN (JURUSAN) */}
                <div className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-lg ${isDarkMode
                    ? 'bg-gray-900/70 border-gray-800'
                    : 'bg-[#fffdf9]/92 border-white shadow-[#5c4033]/12'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <GraduationCap className={`w-5 h-5 ${isDarkMode ? 'text-teal-400' : 'text-[#9e4522]'}`} />
                            <h2 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'}`}>
                                Ringkasan Peminat &amp; Kelulusan per Jurusan
                            </h2>
                        </div>
                        {majorFilter !== 'ALL' && (
                            <button
                                type="button"
                                onClick={() => setMajorFilter('ALL')}
                                className="text-xs font-extrabold text-[#9e4522] dark:text-teal-400 hover:underline"
                            >
                                Tampilkan Semua Jurusan
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {stats.byMajor.map((item) => {
                            const ratio = stats.total > 0 ? Math.round((item.choice1Count / stats.total) * 100) : 0;
                            const isSelected = majorFilter === item.major;
                            return (
                                <button
                                    key={item.major}
                                    type="button"
                                    onClick={() => setMajorFilter(prev => (prev === item.major ? 'ALL' : item.major))}
                                    className={`text-left p-4 rounded-2xl border transition-all ${isSelected
                                        ? isDarkMode
                                            ? 'bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/25'
                                            : 'bg-[#fdf6ee] border-[#b85c38] ring-2 ring-[#b85c38]/25 shadow-sm'
                                        : isDarkMode
                                            ? 'bg-gray-950/60 border-gray-800 hover:bg-gray-800/70'
                                            : 'bg-white border-[#dfd0c0] hover:border-[#b85c38]/60 hover:bg-[#faf5ef]'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2.5">
                                        <p className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-gray-100' : 'text-[#1f1410]'}`}>
                                            {item.major}
                                        </p>
                                        <span className="shrink-0 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                            {item.acceptedCount} Lulus
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}>
                                            Peminat Pilihan 1: <strong className={isDarkMode ? 'text-white' : 'text-[#1f1410]'}>{item.choice1Count}</strong> siswa
                                        </span>
                                        <span className={`font-mono font-extrabold text-xs ${isDarkMode ? 'text-teal-300' : 'text-[#8f3f20]'}`}>{ratio}%</span>
                                    </div>
                                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-[#eadfd2]'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isDarkMode ? 'bg-teal-500' : 'bg-[#b85c38]'}`}
                                            style={{ width: `${Math.min(ratio, 100)}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Table Container */}
                <div className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${isDarkMode
                    ? 'bg-gray-900/75 border-gray-800 shadow-black/40'
                    : 'bg-[#fffdf9]/95 border-white shadow-[#5c4033]/15'
                    }`}>
                    {/* Search & Multi-Criteria Filter Bar */}
                    <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3.5 mb-6">
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
                            {/* Input Pencarian */}
                            <div className="relative flex-1 min-w-[240px] max-w-md">
                                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama, NISN, no pendaftaran, asal sekolah..."
                                    className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl border transition-all outline-none ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] placeholder-[#7a6358] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20'
                                        }`}
                                />
                            </div>

                            {/* Filter Status */}
                            <div className="relative">
                                <Filter className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    aria-label="Filter Status"
                                    className={`appearance-none pl-8 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border outline-none cursor-pointer ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-gray-100 focus:border-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38]'
                                        }`}
                                >
                                    <option value="ALL">Semua Status</option>
                                    <option value="Pending">⏳ Pending</option>
                                    <option value="Perbaikan">⚠️ Perbaikan</option>
                                    <option value="SIAP_TES">📝 Siap Tes &amp; Wawancara</option>
                                    <option value="Diterima">✅ Diterima</option>
                                    <option value="Ditolak">❌ Ditolak</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                            </div>

                            {/* Filter Jurusan */}
                            <div className="relative">
                                <select
                                    value={majorFilter}
                                    onChange={(e) => setMajorFilter(e.target.value)}
                                    aria-label="Filter Jurusan"
                                    className={`appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border outline-none cursor-pointer ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-gray-100 focus:border-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38]'
                                        }`}
                                >
                                    <option value="ALL">Semua Jurusan</option>
                                    {MAJOR_OPTIONS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                            </div>

                            {/* Filter Jalur Pendaftaran */}
                            <div className="relative">
                                <select
                                    value={pathFilter}
                                    onChange={(e) => setPathFilter(e.target.value)}
                                    aria-label="Filter Jalur"
                                    className={`appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border outline-none cursor-pointer ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-gray-100 focus:border-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38]'
                                        }`}
                                >
                                    <option value="ALL">Semua Jalur</option>
                                    <option value="Reguler">Jalur Reguler</option>
                                    <option value="Prestasi">Jalur Prestasi</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                            </div>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${isDarkMode
                                        ? 'bg-rose-950/60 hover:bg-rose-900/70 border-rose-700 text-rose-300'
                                        : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                                        }`}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs sm:text-sm self-end xl:self-auto">
                            <span className={`px-3.5 py-2 rounded-xl border font-semibold ${isDarkMode
                                ? 'bg-gray-950/60 border-gray-800 text-gray-300'
                                : 'bg-[#f7f1ea] border-[#d6c5b3] text-[#4a352b]'
                                }`}>
                                Menampilkan: <strong className={isDarkMode ? 'text-white' : 'text-[#1f1410]'}>{filteredApplicants.length}</strong> dari {applicants.length} data
                            </span>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 border-4 border-[#b85c38] border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="font-semibold text-sm">Memuat data pendaftar...</p>
                        </div>
                    ) : filteredApplicants.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                            <p className="font-semibold text-sm">Tidak ada pendaftar yang cocok dengan kriteria filter saat ini.</p>
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
                        <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'border-gray-800' : 'border-[#d6c5b3]'}`}>
                            <table className="w-full text-left border-collapse min-w-[1080px]">
                                <thead>
                                    <tr className={`border-b-2 text-xs sm:text-[13px] uppercase tracking-wider font-extrabold ${isDarkMode
                                        ? 'bg-gray-950 text-gray-300 border-gray-800'
                                        : 'bg-[#efe4d6] text-[#2b1d18] border-[#d1bfa9]'
                                        }`}>
                                        <th className="p-4 pl-4 w-12">No</th>
                                        <th className="p-4">Nama &amp; Kontak</th>
                                        <th className="p-4">NISN &amp; Tgl Lahir</th>
                                        <th className="p-4">Pilihan Jurusan</th>
                                        <th className="p-4">Dokumen Berkas</th>
                                        <th className="p-4 pr-4 w-76">Status &amp; Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-gray-800' : 'divide-[#e6d9ca]'}`}>
                                    {filteredApplicants.map((app, index) => (
                                        <tr
                                            key={app.id}
                                            className={`transition-colors duration-150 ${isDarkMode
                                                ? 'bg-gray-900/40 hover:bg-gray-800/70'
                                                : 'bg-white hover:bg-[#faf4ec]'
                                                }`}
                                        >
                                            <td className={`p-4 pl-4 font-mono text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                                                {index + 1}
                                            </td>
                                            <td className="p-4">
                                                <div className={`font-extrabold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                                                    {app.full_name}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    <span className={`font-mono text-xs font-bold ${isDarkMode ? 'text-amber-300' : 'text-[#3d291e]'}`}>
                                                        {app.registration_number}
                                                    </span>
                                                    <span className={isDarkMode ? 'text-gray-600' : 'text-[#cbb7a2]'}>&bull;</span>
                                                    <a
                                                        href={`https://wa.me/${app.phone}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                                    >
                                                        {app.phone || '-'}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    {app.registration_path === 'Prestasi' ? (
                                                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                                                            <Award className="w-3 h-3" /> Prestasi
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 dark:bg-gray-800 dark:text-gray-300 border border-stone-300 dark:border-gray-700">
                                                            Reguler
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-xs font-medium mt-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                                                    SMP: <span className="font-semibold">{app.asal_sekolah || '-'}</span>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <div className={`font-mono text-sm font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#1f1410]'}`}>
                                                    {app.nisn || '-'}
                                                </div>
                                                <div className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                                                    {app.tanggal_lahir ? new Date(app.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </div>
                                            </td>

                                            <td className="p-4 space-y-1.5">
                                                <div className={`text-sm font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#1f1410]'}`}>
                                                    1. {app.school_choice}
                                                </div>
                                                {app.school_choice_2 && (
                                                    <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                                                        2. {app.school_choice_2}
                                                    </div>
                                                )}
                                                {app.accepted_major && (
                                                    <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                                                        <span>Lulus: {app.accepted_major}</span>
                                                    </div>
                                                )}
                                                {(app.test_date || app.interview_date) && (
                                                    <div className="pt-1 space-y-1">
                                                        {app.test_date && (
                                                            <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                                                                <CalendarClock className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
                                                                <span>Tes: {app.test_date} {app.test_time ? `(${app.test_time})` : ''}</span>
                                                            </div>
                                                        )}
                                                        {app.interview_date && (
                                                            <div className="text-xs font-semibold text-teal-900 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                                                                <Video className="w-3.5 h-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
                                                                <span>Wawancara: {app.interview_date} {app.interview_time ? `(${app.interview_time})` : ''}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {app.document_kk && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_kk!)}
                                                            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs border transition-all flex items-center gap-1 ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700'
                                                                : 'bg-[#f7f1ea] hover:bg-[#eadfd2] text-[#2b1d18] border-[#cbb7a2] shadow-xs'
                                                                }`}
                                                        >
                                                            KK
                                                        </button>
                                                    )}
                                                    {app.document_akta && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_akta!)}
                                                            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs border transition-all flex items-center gap-1 ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700'
                                                                : 'bg-[#f7f1ea] hover:bg-[#eadfd2] text-[#2b1d18] border-[#cbb7a2] shadow-xs'
                                                                }`}
                                                        >
                                                            Akta
                                                        </button>
                                                    )}
                                                    {app.document_prestasi && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_prestasi!)}
                                                            className="px-3 py-1.5 rounded-lg font-extrabold text-xs bg-amber-100 hover:bg-amber-200 text-amber-950 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 border border-amber-300 dark:border-amber-500/35 transition-all flex items-center gap-1"
                                                        >
                                                            <Award className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                                            <span>Prestasi</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 pr-4 space-y-2.5">
                                                {/* Status Dropdown Modern */}
                                                <div className="relative">
                                                    <select
                                                        value={app.status}
                                                        onChange={(e) => {
                                                            const ns = e.target.value;
                                                            if (ns === 'Diterima') {
                                                                handleUpdateStatus(app.id, ns, app.accepted_major || app.school_choice);
                                                            } else {
                                                                handleUpdateStatus(app.id, ns);
                                                            }
                                                        }}
                                                        className={`w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl font-extrabold text-xs border outline-none cursor-pointer transition-all ${app.status === 'Diterima'
                                                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/35'
                                                            : app.status === 'Ditolak'
                                                                ? 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/35'
                                                                : app.status === 'Perbaikan'
                                                                    ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/35'
                                                                    : app.status.includes('Siap Tes')
                                                                        ? 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/35'
                                                                        : 'bg-yellow-100 text-yellow-950 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/35'
                                                            }`}
                                                    >
                                                        <option value="Pending">⏳ Pending</option>
                                                        <option value="Perbaikan">⚠️ Perbaikan</option>
                                                        <option value="Siap Tes dan/atau Wawancara">📝 Siap Tes &amp; Wawancara</option>
                                                        <option value="Diterima">✅ Diterima</option>
                                                        <option value="Ditolak">❌ Ditolak</option>
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-75" />
                                                </div>

                                                {/* Action Buttons Grid */}
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        onClick={() => openScheduleModal(app)}
                                                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Jadwal &amp; Jurusan</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openRevisionModal(app)}
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        <span>Perbaikan</span>
                                                    </button>
                                                    <Link
                                                        href={`/admin/wawancara/${app.id}`}
                                                        target="_blank"
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all active:scale-95 text-center"
                                                    >
                                                        <Video className="w-3.5 h-3.5" />
                                                        <span>Wawancara</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleViewResults(app.id, app)}
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <FileCheck2 className="w-3.5 h-3.5" />
                                                        <span>Nilai Tes</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewSnapshots(app.id)}
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <Camera className="w-3.5 h-3.5" />
                                                        <span>Foto Ujian</span>
                                                    </button>
                                                </div>
                                                {app.document_notes && (
                                                    <p className="text-xs font-medium text-amber-950 dark:text-amber-300 mt-1.5 leading-snug bg-amber-100 dark:bg-amber-500/15 p-2 rounded-lg border border-amber-300 dark:border-amber-500/30">
                                                        Catatan: {app.document_notes}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL 1: JADWAL & JURUSAN */}
            {scheduleModalOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                        } max-h-[90vh] overflow-y-auto space-y-4`}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <span>Atur Jadwal: {selectedApp.full_name}</span>
                            </h3>
                            <button onClick={() => setScheduleModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-3">
                            <p className="text-xs font-extrabold text-blue-950 dark:text-blue-300 uppercase tracking-wide">Jadwal Ujian (CBT)</p>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div><label className="text-xs font-bold text-blue-950 dark:text-blue-200 mb-1 block">Tanggal</label><input type="date" value={modalTestDate} onChange={(e) => setModalTestDate(e.target.value)} className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-blue-300 text-gray-900 bg-white" /></div>
                                <div><label className="text-xs font-bold text-blue-950 dark:text-blue-200 mb-1 block">Jam</label><input type="time" value={modalTestTime} onChange={(e) => setModalTestTime(e.target.value)} className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-blue-300 text-gray-900 bg-white" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-blue-950 dark:text-blue-200 mb-1 block">Lokasi / Ruang Ujian</label><input type="text" value={modalTestLocation} onChange={(e) => setModalTestLocation(e.target.value)} className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-blue-300 text-gray-900 bg-white" placeholder="Contoh: Lab Komputer 1" /></div>
                        </div>

                        <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-900 space-y-3">
                            <p className="text-xs font-extrabold text-teal-950 dark:text-teal-300 uppercase tracking-wide">Jadwal Wawancara (Video Call)</p>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div><label className="text-xs font-bold text-teal-950 dark:text-teal-200 mb-1 block">Tanggal</label><input type="date" value={modalInterviewDate} onChange={(e) => setModalInterviewDate(e.target.value)} className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-teal-300 text-gray-900 bg-white" /></div>
                                <div><label className="text-xs font-bold text-teal-950 dark:text-teal-200 mb-1 block">Jam</label><input type="time" value={modalInterviewTime} onChange={(e) => setModalInterviewTime(e.target.value)} className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-teal-300 text-gray-900 bg-white" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-teal-950 dark:text-teal-200 mb-1 block">Link Jitsi Meet (Opsional)</label><input type="text" value={modalInterviewLink} onChange={(e) => setModalInterviewLink(e.target.value)} className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-teal-300 text-gray-900 bg-white" placeholder="Otomatis menggunakan JaaS terintegrasi" /></div>
                        </div>

                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900 space-y-2">
                            <p className="text-xs font-extrabold text-emerald-950 dark:text-emerald-300 uppercase tracking-wide">Penetapan Jurusan Lulus</p>
                            <select value={modalAcceptedMajor} onChange={(e) => setModalAcceptedMajor(e.target.value)} className="w-full p-2.5 rounded-xl border border-emerald-300 text-xs sm:text-sm font-semibold text-gray-900 bg-white">
                                <option value="">-- Belum Ditetapkan --</option>
                                <option value={selectedApp.school_choice}>{selectedApp.school_choice} (Pilihan 1)</option>
                                {selectedApp.school_choice_2 && <option value={selectedApp.school_choice_2}>{selectedApp.school_choice_2} (Pilihan 2)</option>}
                            </select>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button onClick={() => setScheduleModalOpen(false)} className="w-1/3 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold text-xs sm:text-sm">Batal</button>
                            <button onClick={handleSaveSchedule} className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md">Simpan Jadwal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: MINTA PERBAIKAN */}
            {revisionModalOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                        } max-h-[90vh] overflow-y-auto space-y-4`}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <span>Minta Perbaikan Berkas</span>
                            </h3>
                            <button onClick={() => setRevisionModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Centang bagian yang perlu diperbaiki oleh calon siswa:</p>
                        <div className="space-y-2.5 text-xs sm:text-sm font-medium">
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('full_name')} onChange={() => toggleField('full_name')} className="w-4 h-4 accent-amber-600 rounded" /> Nama Lengkap</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('email')} onChange={() => toggleField('email')} className="w-4 h-4 accent-amber-600 rounded" /> Email</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('phone')} onChange={() => toggleField('phone')} className="w-4 h-4 accent-amber-600 rounded" /> No. HP/WA Siswa</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('asal_sekolah')} onChange={() => toggleField('asal_sekolah')} className="w-4 h-4 accent-amber-600 rounded" /> Asal Sekolah</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('father_name')} onChange={() => toggleField('father_name')} className="w-4 h-4 accent-amber-600 rounded" /> Nama Ayah</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('mother_name')} onChange={() => toggleField('mother_name')} className="w-4 h-4 accent-amber-600 rounded" /> Nama Ibu</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('parent_phone')} onChange={() => toggleField('parent_phone')} className="w-4 h-4 accent-amber-600 rounded" /> No. HP/WA Orang Tua</label>
                            <hr className="my-2 border-gray-200 dark:border-gray-800" />
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('kk')} onChange={() => toggleField('kk')} className="w-4 h-4 accent-amber-600 rounded" /> Upload Ulang KK</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('akta')} onChange={() => toggleField('akta')} className="w-4 h-4 accent-amber-600 rounded" /> Upload Ulang Akta</label>
                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={modalFields.includes('prestasi')} onChange={() => toggleField('prestasi')} className="w-4 h-4 accent-amber-600 rounded" /> Upload Ulang Dokumen Prestasi (PDF)</label>
                        </div>

                        <div>
                            <label className="text-xs sm:text-sm font-bold block mb-1.5">Catatan Tambahan untuk Calon Siswa:</label>
                            <textarea
                                value={modalNotes}
                                onChange={(e) => setModalNotes(e.target.value)}
                                rows={3}
                                className={`w-full p-3 rounded-xl border text-xs sm:text-sm outline-none ${isDarkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                    }`}
                                placeholder="Contoh: Lampiran scan KK blur, mohon foto ulang lebih jelas..."
                            ></textarea>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button onClick={() => setRevisionModalOpen(false)} className="w-1/3 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold text-xs sm:text-sm">Batal</button>
                            <button onClick={handleSaveRevision} className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md">Kirim Permintaan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: WAWANCARA (RUBRIK CEPAT) */}
            {interviewModalOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-3xl p-6 sm:p-8 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                        } max-h-[90vh] overflow-y-auto space-y-4`}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-teal-700 dark:text-teal-400">Rubrik Penilaian Wawancara</h3>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Peserta: {selectedApp.full_name} ({selectedApp.registration_number})</p>
                            </div>
                            <button onClick={() => setInterviewModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {interviewRubric.map((q, idx) => (
                                <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                                    <p className="text-xs sm:text-sm font-bold mb-2.5 text-gray-900 dark:text-gray-200">{idx + 1}. {q.question_text}</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map(score => (
                                            <label
                                                key={score}
                                                className={`flex-1 text-center py-2.5 px-3 rounded-xl cursor-pointer border font-bold text-xs sm:text-sm transition-all ${interviewScores[q.id] === score
                                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                                    : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    value={score}
                                                    checked={interviewScores[q.id] === score}
                                                    onChange={() => setInterviewScores(prev => ({ ...prev, [q.id]: score }))}
                                                    className="hidden"
                                                />
                                                Level {score}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button onClick={() => setInterviewModalOpen(false)} className="w-1/3 py-2.5 bg-gray-600 text-white rounded-xl font-bold text-xs sm:text-sm">Tutup</button>
                            <button onClick={handleSaveInterview} className="w-2/3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md">Simpan Nilai Wawancara</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: LAPORAN ASESMEN & CETAK */}
            {resultModalOpen && selectedResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-3xl p-6 sm:p-8 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                        } max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:p-0`}>
                        <div className="flex justify-between items-center mb-6 border-b pb-4 print:hidden">
                            <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                <FileCheck2 className="w-5 h-5" />
                                <span>Laporan Asesmen &amp; Ujian</span>
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePrint()}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Cetak PDF</span>
                                </button>
                                <button onClick={() => setResultModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div ref={reportRef} className="print:text-black">
                            <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                                <h1 className="text-2xl font-bold uppercase">SMK KH. A. WAHAB MUHSIN</h1>
                                <h2 className="text-lg font-semibold">Laporan Hasil Asesmen</h2>
                                <p className="text-sm mt-2">Nama: <strong>{selectedApp?.full_name}</strong> | NISN: {selectedApp?.nisn}</p>
                            </div>

                            {selectedResult.map((r: any, i: number) => (
                                <div key={i} className={`mb-6 p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                                        <span className="font-extrabold text-base uppercase text-[#9e4522] dark:text-amber-400 print:text-black">
                                            {r.category.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {new Date(r.completed_at).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-300 text-center mb-3">
                                        {r.interpretation}
                                    </div>

                                    {r.category === 'TPA' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                                <p className="text-xs font-extrabold text-blue-700 dark:text-blue-400 mb-0.5">Literasi</p>
                                                <p className="text-2xl font-bold">{r.raw_score.literasi.skor} <span className="text-xs font-normal text-gray-500">/ 25</span></p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                                <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mb-0.5">Numerasi</p>
                                                <p className="text-2xl font-bold">{r.raw_score.numerasi.skor} <span className="text-xs font-normal text-gray-500">/ 25</span></p>
                                            </div>
                                        </div>
                                    ) : r.category === 'WAWANCARA' ? (
                                        <div className="p-3.5 bg-teal-50 dark:bg-teal-500/10 rounded-xl border border-teal-200 dark:border-teal-500/20 text-center">
                                            <p className="text-base font-extrabold text-teal-900 dark:text-teal-300">
                                                Skor Total Wawancara: {r.raw_score.total_skor} / {r.raw_score.max_skor}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                                            {Object.entries(r.raw_score.dims || {}).map(([dim, data]: any) => (
                                                <div key={dim} className="p-3 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs sm:text-sm">
                                                    <span className="font-semibold">{DIMENSION_NAMES[r.category]?.[dim] || dim}</span>
                                                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{data.kategori} ({data.persen}%)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setResultModalOpen(false)} className="w-full py-2.5 mt-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs sm:text-sm print:hidden">
                            Tutup Laporan
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL 5: SNAPSHOT UJIAN */}
            {snapshotModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-4xl p-6 sm:p-8 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                        } max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Camera className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                <span>Galeri Pengawasan Ujian</span>
                            </h3>
                            <button onClick={() => setSnapshotModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {snapshots.length === 0 ? (
                            <p className="text-center py-12 text-sm text-gray-500">Belum ada foto snapshot ujian untuk peserta ini.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {snapshots.map((s, i) => (
                                    <div key={i} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950">
                                        <img src={s.image_url} alt="Snapshot" className="w-full h-36 object-cover" />
                                        <div className="p-2 text-center text-xs font-bold bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                            {new Date(s.created_at).toLocaleTimeString('id-ID')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setSnapshotModalOpen(false)} className="w-full py-2.5 mt-6 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-xs sm:text-sm">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </main>
    );


}