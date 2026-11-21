'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    FileSpreadsheet,
    UserPlus,
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
    Award
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

export default function AdminDashboard() {
    const { isDarkMode } = useTheme();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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
            const data = await res.json();
            if (data.applicants) setApplicants(data.applicants);
        } catch (error) {
            console.error('Gagal mengambil data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = applicants.map((app, index) => ({
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
        XLSX.writeFile(workbook, `Data_Pendaftar_PSB_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleViewSnapshots = async (id: number) => {
        try {
            const res = await fetch(`/api/admin/snapshots?applicant_id=${id}`);
            const data = await res.json();
            if (res.ok) { setSnapshots(data.snapshots); setSnapshotModalOpen(true); }
            else { alert(data.error); }
        } catch (e) { alert('Gagal mengambil snapshot'); }
    };

    const handleViewResults = async (id: number, app: Applicant) => {
        setSelectedApp(app);
        try {
            const res = await fetch(`/api/admin/results?applicant_id=${id}`);
            const data = await res.json();
            if (res.ok) { setSelectedResult(data.results); setResultModalOpen(true); }
            else { alert(data.error); }
        } catch (e) { alert('Gagal mengambil hasil tes'); }
    };

    const handleViewDocument = async (key: string) => {
        try {
            const res = await fetch('/api/admin/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
            const data = await res.json();
            if (data.viewUrl) window.open(data.viewUrl, '_blank');
        } catch (error) { alert('Terjadi kesalahan saat membuka dokumen'); }
    };

    const handleUpdateStatus = async (id: number, newStatus: string, accepted_major?: string) => {
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus, accepted_major })
            });
            if (res.ok) {
                setApplicants(applicants.map(app => app.id === id ? { ...app, status: newStatus } : app));
                toast.success(`Status diubah menjadi: ${newStatus}`);
            }
        } catch (error) { alert('Gagal mengubah status'); }
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
        } catch (e) { alert('Gagal memuat rubrik'); }
    };

    const handleSaveSchedule = async () => {
        if (!selectedApp) return;
        try {
            const res = await fetch('/api/admin/update-schedule', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedApp.id, test_date: modalTestDate, test_time: modalTestTime, test_location: modalTestLocation,
                    interview_date: modalInterviewDate, interview_time: modalInterviewTime, interview_link: modalInterviewLink,
                    accepted_major: modalAcceptedMajor
                }),
            });
            if (res.ok) {
                setApplicants(applicants.map(app => app.id === selectedApp.id ? {
                    ...app, test_date: modalTestDate, test_time: modalTestTime, test_location: modalTestLocation,
                    interview_date: modalInterviewDate, interview_time: modalInterviewTime, interview_link: modalInterviewLink,
                    accepted_major: modalAcceptedMajor
                } : app));
                setScheduleModalOpen(false);
                toast.success('Jadwal & Jurusan disimpan!');
            }
        } catch (error) { alert('Gagal menyimpan jadwal'); }
    };

    const handleSaveRevision = async () => {
        if (!selectedApp) return;
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedApp.id, notes: modalNotes, revision_fields: modalFields, status: 'Perbaikan' }),
            });
            if (res.ok) {
                setApplicants(applicants.map(app => app.id === selectedApp.id ? { ...app, document_notes: modalNotes, revision_fields: modalFields, status: 'Perbaikan' } : app));
                setRevisionModalOpen(false);
                toast.success('Permintaan perbaikan dikirim!');
            }
        } catch (error) { alert('Gagal menyimpan perbaikan'); }
    };

    const handleSaveInterview = async () => {
        if (!selectedApp) return;
        const loading = toast.loading('Menyimpan nilai wawancara...');
        try {
            const res = await fetch('/api/admin/interview-scores', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: selectedApp.id, scores: interviewScores })
            });
            if (res.ok) { toast.success('Nilai disimpan!', { id: loading }); setInterviewModalOpen(false); }
            else { toast.error('Gagal menyimpan nilai.', { id: loading }); }
        } catch (e) { toast.error('Kesalahan jaringan.', { id: loading }); }
    };

    const toggleField = (field: string) => setModalFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);

    const filteredApplicants = applicants.filter(app => {
        const q = searchQuery.toLowerCase();
        return (
            (app.full_name || '').toLowerCase().includes(q) ||
            (app.registration_number || '').toLowerCase().includes(q) ||
            (app.nisn || '').includes(q) ||
            (app.asal_sekolah || '').toLowerCase().includes(q)
        );
    });

    return (
        <main className={`min-h-screen p-4 sm:p-8 transition-colors duration-500 font-sans relative overflow-x-hidden ${isDarkMode
            ? 'bg-linear-to-br from-gray-950 via-slate-900 to-black text-gray-100'
            : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] text-[#2b1d18]'
            //: 'bg-linear-to-br from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae] text-[#2b1d18]'
            }`}>
            <Toaster position="top-center" />

            {/* Ambient modern glass glow */}
            <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none transition-all duration-700 ${isDarkMode ? 'bg-indigo-600/20' : 'bg-[#c9a68a]/30'
                }`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none transition-all duration-700 ${isDarkMode ? 'bg-teal-600/15' : 'bg-[#dfbe9f]/30'
                }`}></div>

            <div className="max-w-[1520px] mx-auto z-10 relative space-y-6">
                {/* Header Card (Modern Glassmorphism) */}
                <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${isDarkMode
                    ? 'bg-gray-900/60 border-gray-800/80 shadow-black/40'
                    : 'bg-white/40 border-white/60 shadow-[#9e8369]/10'
                    }`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${isDarkMode
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : 'bg-[#b85c38]/10 text-[#8f472a] border-[#b85c38]/20'
                                }`}>
                                Portal Administrasi PSB
                            </span>
                        </div>
                        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
                            Dashboard Verifikasi & Seleksi
                        </h1>
                        <p className={`text-sm mt-0.5 font-medium ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>
                            SMK KH. A. WAHAB MUHSIN &bull; Total Terdaftar: <span className="font-bold">{applicants.length} Calon Siswa</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        <button
                            onClick={handleExportExcel}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-700/60 text-emerald-300'
                                : 'bg-white/80 hover:bg-white border-emerald-600/40 text-emerald-700 hover:shadow-emerald-900/10'
                                }`}
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                            <span>Ekspor Excel</span>
                        </button>

                        <Link
                            href="/admin/kelola-panitia"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-indigo-950/60 hover:bg-indigo-900/70 border-indigo-700/60 text-indigo-300'
                                : 'bg-white/80 hover:bg-white border-indigo-600/40 text-indigo-700 hover:shadow-indigo-900/10'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 text-indigo-500" />
                            <span>+ Panitia</span>
                        </Link>

                        <Link
                            href="/admin/kelola-tes"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-blue-950/60 hover:bg-blue-900/70 border-blue-700/60 text-blue-300'
                                : 'bg-white/80 hover:bg-white border-blue-600/40 text-blue-700 hover:shadow-blue-900/10'
                                }`}
                        >
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>Kelola Soal</span>
                        </Link>

                        <Link
                            href="/admin/pengaturan"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-200'
                                : 'bg-white/80 hover:bg-white border-[#d6c5b3] text-[#4a342a]'
                                }`}
                        >
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span>Pengaturan</span>
                        </Link>

                        {/* Theme Toggle Button */}
                        <ThemeToggle />
                    </div>
                </div>

                {/* Main Table Container (Modern Glass Table) */}
                <div className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${isDarkMode
                    ? 'bg-gray-900/50 border-gray-800/70 shadow-black/40'
                    : 'bg-gray-900/20 border-white/60 shadow-[#9e8369]/10'
                    }`}>
                    {/* Search & Stats Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-md">
                            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama, NISN, atau no pendaftaran..."
                                className={`w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border transition-all outline-none ${isDarkMode
                                    ? 'bg-gray-950/60 border-gray-700/80 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                    : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18] placeholder-gray-400 focus:border-[#b85c38] focus:ring-1 focus:ring-[#b85c38]'
                                    }`}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className={`px-3 py-1.5 rounded-lg border font-semibold ${isDarkMode
                                ? 'bg-gray-950/40 border-gray-800 text-gray-400'
                                : 'bg-white/70 border-[#d6c5b3]/70 text-[#5c4033]'
                                }`}>
                                Menampilkan: <strong className={isDarkMode ? 'text-white' : 'text-[#2b1d18]'}>{filteredApplicants.length}</strong> data
                            </span>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 border-4 border-[#b85c38] border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="font-semibold text-sm opacity-80">Memuat data pendaftar...</p>
                        </div>
                    ) : filteredApplicants.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="font-semibold text-sm opacity-70">Tidak ada pendaftar yang cocok dengan pencarian.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-200/40 dark:border-gray-800/60">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className={`border-b text-xs uppercase tracking-wider font-extrabold ${isDarkMode
                                        ? 'bg-gray-950/70 text-gray-400 border-gray-800'
                                        : 'bg-[#e8dcce]/80 text-[#614739] border-[#d6c5b3]'
                                        }`}>
                                        <th className="p-3.5 pl-4 w-12">No</th>
                                        <th className="p-3.5">Nama & Kontak</th>
                                        <th className="p-3.5">NISN & Tgl Lahir</th>
                                        <th className="p-3.5">Pilihan Jurusan</th>
                                        <th className="p-3.5">Dokumen Berkas</th>
                                        <th className="p-3.5 pr-4 w-72">Status & Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-800/50 text-xs">
                                    {filteredApplicants.map((app, index) => (
                                        <tr
                                            key={app.id}
                                            className={`transition-colors duration-150 ${isDarkMode
                                                ? 'hover:bg-gray-800/40'
                                                : 'hover:bg-white/40'
                                                }`}
                                        >
                                            <td className="p-3.5 pl-4 font-mono text-gray-400">{index + 1}</td>
                                            <td className="p-3.5">
                                                <div className="font-bold text-sm tracking-tight text-gray-900 dark:text-orange-700">
                                                    {app.full_name}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="font-mono text-[11px] font-semibold text-gray-500 dark:text-amber-400">
                                                        {app.registration_number}
                                                    </span>
                                                    <span className="text-gray-300 dark:text-gray-700">&bull;</span>
                                                    <a
                                                        href={`https://wa.me/${app.phone}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                                    >
                                                        {app.phone || '-'}
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                    {app.registration_path === 'Prestasi' ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                                            <Award className="w-2.5 h-2.5" /> Prestasi
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 dark:text-gray-400">
                                                            Reguler
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-500 dark:text-amber-400 mt-0.5">
                                                    SMP: {app.asal_sekolah || '-'}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                    {app.nisn || '-'}
                                                </div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {app.tanggal_lahir ? new Date(app.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-semibold text-gray-800 dark:text-gray-200">
                                                    1. {app.school_choice}
                                                </div>
                                                {app.school_choice_2 && (
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        2. {app.school_choice_2}
                                                    </div>
                                                )}
                                                {app.accepted_major && (
                                                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Lulus: {app.accepted_major}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {app.document_kk && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_kk!)}
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all flex items-center gap-1 ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
                                                                : 'bg-white/80 hover:bg-white text-[#5c3e34] border-[#d6c5b3] shadow-xs'
                                                                }`}
                                                        >
                                                            KK
                                                        </button>
                                                    )}
                                                    {app.document_akta && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_akta!)}
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all flex items-center gap-1 ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
                                                                : 'bg-white/80 hover:bg-white text-[#5c3e34] border-[#d6c5b3] shadow-xs'
                                                                }`}
                                                        >
                                                            Akta
                                                        </button>
                                                    )}
                                                    {app.document_prestasi && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_prestasi!)}
                                                            className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1"
                                                        >
                                                            <Award className="w-3 h-3 text-amber-500" />
                                                            <span>Prestasi</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-3.5 pr-4 space-y-2">
                                                {/* Status Dropdown Modern */}
                                                <div className="relative">
                                                    <select
                                                        value={app.status}
                                                        onChange={(e) => {
                                                            const ns = e.target.value;
                                                            if (ns === 'Diterima') handleUpdateStatus(app.id, ns, app.school_choice);
                                                            else handleUpdateStatus(app.id, ns);
                                                        }}
                                                        className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-xl font-bold text-xs border outline-none cursor-pointer transition-all ${app.status === 'Diterima'
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                                            : app.status === 'Ditolak'
                                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                                                : app.status === 'Perbaikan'
                                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                                                    : app.status.includes('Siap Tes')
                                                                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                                                        : 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'
                                                            }`}
                                                    >
                                                        <option value="Pending">⏳ Pending</option>
                                                        <option value="Perbaikan">⚠️ Perbaikan</option>
                                                        <option value="Siap Tes dan/atau Wawancara">📝 Siap Tes & Wawancara</option>
                                                        <option value="Diterima">✅ Diterima</option>
                                                        <option value="Ditolak">❌ Ditolak</option>
                                                    </select>
                                                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                                </div>

                                                {/* Action Buttons Grid (Simetris & Modern) */}
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        onClick={() => openScheduleModal(app)}
                                                        className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-bold text-[11px] bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Jadwal & Jurusan</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openRevisionModal(app)}
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <AlertCircle className="w-3 h-3" />
                                                        <span>Perbaikan</span>
                                                    </button>
                                                    <Link
                                                        href={`/admin/wawancara/${app.id}`}
                                                        target="_blank"
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 text-center"
                                                    >
                                                        <Video className="w-3 h-3" />
                                                        <span>Wawancara</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleViewResults(app.id, app)}
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <FileCheck2 className="w-3 h-3" />
                                                        <span>Nilai Tes</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewSnapshots(app.id)}
                                                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] bg-gray-600 hover:bg-gray-500 text-white shadow-xs transition-all active:scale-95"
                                                    >
                                                        <Camera className="w-3 h-3" />
                                                        <span>Foto Ujian</span>
                                                    </button>
                                                </div>
                                                {app.document_notes && (
                                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-tight bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
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
                                <Calendar className="w-5 h-5 text-blue-500" />
                                <span>Atur Jadwal: {selectedApp.full_name}</span>
                            </h3>
                            <button onClick={() => setScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900 space-y-3">
                            <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">Jadwal Ujian (CBT)</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs font-semibold text-blue-950 dark:text-blue-200 mb-1 block">Tanggal</label><input type="date" value={modalTestDate} onChange={(e) => setModalTestDate(e.target.value)} className="w-full p-2 text-xs rounded-xl border border-blue-300 text-gray-900 bg-white" /></div>
                                <div><label className="text-xs font-semibold text-blue-950 dark:text-blue-200 mb-1 block">Jam</label><input type="time" value={modalTestTime} onChange={(e) => setModalTestTime(e.target.value)} className="w-full p-2 text-xs rounded-xl border border-blue-300 text-gray-900 bg-white" /></div>
                            </div>
                            <div><label className="text-xs font-semibold text-blue-950 dark:text-blue-200 mb-1 block">Lokasi / Ruang Ujian</label><input type="text" value={modalTestLocation} onChange={(e) => setModalTestLocation(e.target.value)} className="w-full p-2 text-xs rounded-xl border border-blue-300 text-gray-900 bg-white" placeholder="Contoh: Lab Komputer 1" /></div>
                        </div>

                        <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl border border-teal-200/80 dark:border-teal-900 space-y-3">
                            <p className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wide">Jadwal Wawancara (Video Call)</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs font-semibold text-teal-950 dark:text-teal-200 mb-1 block">Tanggal</label><input type="date" value={modalInterviewDate} onChange={(e) => setModalInterviewDate(e.target.value)} className="w-full p-2 text-xs rounded-xl border border-teal-300 text-gray-900 bg-white" /></div>
                                <div><label className="text-xs font-semibold text-teal-950 dark:text-teal-200 mb-1 block">Jam</label><input type="time" value={modalInterviewTime} onChange={(e) => setModalInterviewTime(e.target.value)} className="w-full p-2 text-xs rounded-xl border border-teal-300 text-gray-900 bg-white" /></div>
                            </div>
                            <div><label className="text-xs font-semibold text-teal-950 dark:text-teal-200 mb-1 block">Link Jitsi Meet (Opsional)</label><input type="text" value={modalInterviewLink} onChange={(e) => setModalInterviewLink(e.target.value)} className="w-full p-2 text-xs rounded-xl border border-teal-300 text-gray-900 bg-white" placeholder="Otomatis menggunakan JaaS terintegrasi" /></div>
                        </div>

                        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-900 space-y-2">
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">Penetapan Jurusan Lulus</p>
                            <select value={modalAcceptedMajor} onChange={(e) => setModalAcceptedMajor(e.target.value)} className="w-full p-2 rounded-xl border border-emerald-300 text-xs text-gray-900 bg-white">
                                <option value="">-- Belum Ditetapkan --</option>
                                <option value={selectedApp.school_choice}>{selectedApp.school_choice} (Pilihan 1)</option>
                                {selectedApp.school_choice_2 && <option value={selectedApp.school_choice_2}>{selectedApp.school_choice_2} (Pilihan 2)</option>}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setScheduleModalOpen(false)} className="w-1/3 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold text-xs">Batal</button>
                            <button onClick={handleSaveSchedule} className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md">Simpan Jadwal</button>
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
                            <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                <span>Minta Perbaikan Berkas</span>
                            </h3>
                            <button onClick={() => setRevisionModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Centang bagian yang perlu diperbaiki oleh calon siswa:</p>
                        <div className="space-y-2 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('full_name')} onChange={() => toggleField('full_name')} className="w-4 h-4 accent-amber-600 rounded" /> Nama Lengkap</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('email')} onChange={() => toggleField('email')} className="w-4 h-4 accent-amber-600 rounded" /> Email</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('phone')} onChange={() => toggleField('phone')} className="w-4 h-4 accent-amber-600 rounded" /> No. HP/WA Siswa</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('asal_sekolah')} onChange={() => toggleField('asal_sekolah')} className="w-4 h-4 accent-amber-600 rounded" /> Asal Sekolah</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('father_name')} onChange={() => toggleField('father_name')} className="w-4 h-4 accent-amber-600 rounded" /> Nama Ayah</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('mother_name')} onChange={() => toggleField('mother_name')} className="w-4 h-4 accent-amber-600 rounded" /> Nama Ibu</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('parent_phone')} onChange={() => toggleField('parent_phone')} className="w-4 h-4 accent-amber-600 rounded" /> No. HP/WA Orang Tua</label>
                            <hr className="my-2 border-gray-200 dark:border-gray-800" />
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('kk')} onChange={() => toggleField('kk')} className="w-4 h-4 accent-amber-600 rounded" /> Upload Ulang KK</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('akta')} onChange={() => toggleField('akta')} className="w-4 h-4 accent-amber-600 rounded" /> Upload Ulang Akta</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={modalFields.includes('prestasi')} onChange={() => toggleField('prestasi')} className="w-4 h-4 accent-amber-600 rounded" /> Upload Ulang Dokumen Prestasi (PDF)</label>
                        </div>

                        <div>
                            <label className="text-xs font-semibold block mb-1">Catatan Tambahan untuk Calon Siswa:</label>
                            <textarea
                                value={modalNotes}
                                onChange={(e) => setModalNotes(e.target.value)}
                                rows={3}
                                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                    }`}
                                placeholder="Contoh: Lampiran scan KK blur, mohon foto ulang lebih jelas..."
                            ></textarea>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setRevisionModalOpen(false)} className="w-1/3 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold text-xs">Batal</button>
                            <button onClick={handleSaveRevision} className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md">Kirim Permintaan</button>
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
                                <h3 className="text-lg font-bold text-teal-600">Rubrik Penilaian Wawancara</h3>
                                <p className="text-xs text-gray-500">Peserta: {selectedApp.full_name} ({selectedApp.registration_number})</p>
                            </div>
                            <button onClick={() => setInterviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {interviewRubric.map((q, idx) => (
                                <div key={q.id} className="p-3.5 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                                    <p className="text-xs font-bold mb-2 text-gray-800 dark:text-gray-200">{idx + 1}. {q.question_text}</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map(score => (
                                            <label
                                                key={score}
                                                className={`flex-1 text-center py-2 px-3 rounded-xl cursor-pointer border font-bold text-xs transition-all ${interviewScores[q.id] === score
                                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
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

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setInterviewModalOpen(false)} className="w-1/3 py-2.5 bg-gray-500 text-white rounded-xl font-bold text-xs">Tutup</button>
                            <button onClick={handleSaveInterview} className="w-2/3 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md">Simpan Nilai Wawancara</button>
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
                            <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                <FileCheck2 className="w-5 h-5" />
                                <span>Laporan Asesmen & Ujian</span>
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePrint()}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Cetak PDF</span>
                                </button>
                                <button onClick={() => setResultModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1">
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
                                <div key={i} className={`mb-6 p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-gray-50/80 border-gray-200'
                                    }`}>
                                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                                        <span className="font-extrabold text-base uppercase text-[#b85c38] print:text-black">
                                            {r.category.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(r.completed_at).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="text-sm font-semibold p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-center mb-3">
                                        {r.interpretation}
                                    </div>

                                    {r.category === 'TPA' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl border bg-white/70 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                                <p className="text-xs font-bold text-blue-500 mb-0.5">Literasi</p>
                                                <p className="text-2xl font-bold">{r.raw_score.literasi.skor} <span className="text-xs font-normal text-gray-400">/ 25</span></p>
                                            </div>
                                            <div className="p-3 rounded-xl border bg-white/70 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                                <p className="text-xs font-bold text-emerald-500 mb-0.5">Numerasi</p>
                                                <p className="text-2xl font-bold">{r.raw_score.numerasi.skor} <span className="text-xs font-normal text-gray-400">/ 25</span></p>
                                            </div>
                                        </div>
                                    ) : r.category === 'WAWANCARA' ? (
                                        <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-center">
                                            <p className="text-base font-bold text-teal-700 dark:text-teal-300">
                                                Skor Total Wawancara: {r.raw_score.total_skor} / {r.raw_score.max_skor}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                            {Object.entries(r.raw_score.dims || {}).map(([dim, data]: any) => (
                                                <div key={dim} className="p-2.5 rounded-xl border bg-white/60 dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs">
                                                    <span className="font-semibold">{DIMENSION_NAMES[r.category]?.[dim] || dim}</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.kategori} ({data.persen}%)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setResultModalOpen(false)} className="w-full py-2.5 mt-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs print:hidden">
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
                                <Camera className="w-5 h-5 text-gray-500" />
                                <span>Galeri Pengawasan Ujian</span>
                            </h3>
                            <button onClick={() => setSnapshotModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {snapshots.length === 0 ? (
                            <p className="text-center py-12 text-sm text-gray-400">Belum ada foto snapshot ujian untuk peserta ini.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {snapshots.map((s, i) => (
                                    <div key={i} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950">
                                        <img src={s.image_url} alt="Snapshot" className="w-full h-36 object-cover" />
                                        <div className="p-2 text-center text-[10px] font-semibold bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                            {new Date(s.created_at).toLocaleTimeString('id-ID')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setSnapshotModalOpen(false)} className="w-full py-2.5 mt-6 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-xs">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
