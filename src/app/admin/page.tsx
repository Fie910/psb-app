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
    CalendarClock,
    CreditCard,
    Shirt,
    MessageCircle,
    Database,
    ShieldCheck
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
    revision_fields: string[] | string | null;
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

    // Kolom Join Daftar Ulang (re_registrations)
    rereg_id?: number | null;
    rereg_status?: string | null;
    rereg_notes?: string | null;
    payment_scheme?: string | null;
    doc_kuitansi_gosiswa?: string | null;
    doc_pas_foto?: string | null;
    doc_skl_ijazah?: string | null;
    doc_pernyataan?: string | null;
    nik?: string | null;
    no_kk?: string | null;
    birth_place?: string | null;
    gender?: string | null;
    religion?: string | null;
    child_order?: number | null;
    siblings_count?: number | null;
    address_street?: string | null;
    rt_rw?: string | null;
    village?: string | null;
    district?: string | null;
    city?: string | null;
    postal_code?: string | null;
    living_with?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    blood_type?: string | null;
    medical_notes?: string | null;
    uniform_size?: string | null;
    father_nik?: string | null;
    father_education?: string | null;
    father_occupation?: string | null;
    father_income?: string | null;
    mother_nik?: string | null;
    mother_education?: string | null;
    mother_occupation?: string | null;
    mother_income?: string | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_occupation?: string | null;
    rereg_submitted_at?: string | null;
    rereg_verified_at?: string | null;
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

const DEFAULT_QUOTAS: Record<string, number> = {
    'Farmasi Klinis dan Komunitas': 72,
    'Produksi dan Siaran Program Televisi': 36,
    'Manajemen Perkantoran': 72,
};

export default function AdminDashboard() {
    const { isDarkMode } = useTheme();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [majorQuotas, setMajorQuotas] = useState<Record<string, number>>(DEFAULT_QUOTAS);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // State Filter Multi-Kriteria
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [majorFilter, setMajorFilter] = useState<string>('ALL');
    const [pathFilter, setPathFilter] = useState<string>('ALL');
    const [reregFilter, setReregFilter] = useState<string>('ALL');

    // State Dropdown Menu Ekspor Excel
    const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);

    // State Modal Perbaikan Seleksi
    const [revisionModalOpen, setRevisionModalOpen] = useState<boolean>(false);

    // State Modal Jadwal & Jurusan
    const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
    const [modalTestDate, setModalTestDate] = useState<string>('');
    const [modalTestTime, setModalTestTime] = useState<string>('');
    const [modalTestLocation, setModalTestLocation] = useState<string>('');
    const [modalInterviewDate, setModalInterviewDate] = useState<string>('');
    const [modalInterviewTime, setModalInterviewTime] = useState<string>('');
    const [modalInterviewLink, setModalInterviewLink] = useState<string>('');
    const [modalAcceptedMajor, setModalAcceptedMajor] = useState<string>('');

    // State Modal Perbaikan (Fields)
    const [modalNotes, setModalNotes] = useState<string>('');
    const [modalFields, setModalFields] = useState<string[]>([]);

    // State Modal Verifikasi Daftar Ulang & Kuitansi gosiswa.com
    const [reregModalOpen, setReregModalOpen] = useState<boolean>(false);
    const [modalReregStatus, setModalReregStatus] = useState<string>('Menunggu Verifikasi');
    const [modalReregNotes, setModalReregNotes] = useState<string>('');
    const [modalPasFotoUrl, setModalPasFotoUrl] = useState<string | null>(null);
    const [isSavingRereg, setIsSavingRereg] = useState<boolean>(false);

    // State Modal Hasil Tes
    const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
    const [selectedResult, setSelectedResult] = useState<any[] | null>(null);
    const [resultModalOpen, setResultModalOpen] = useState<boolean>(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Laporan_Asesmen_${selectedApp?.full_name || 'Siswa'}`,
    });

    // State Modal Wawancara
    const [interviewModalOpen, setInterviewModalOpen] = useState<boolean>(false);
    const [interviewRubric, setInterviewRubric] = useState<any[]>([]);
    const [interviewScores, setInterviewScores] = useState<Record<number, number>>({});

    // State Modal Snapshot
    const [snapshotModalOpen, setSnapshotModalOpen] = useState<boolean>(false);
    const [snapshots, setSnapshots] = useState<any[]>([]);

    useEffect(() => {
        fetchApplicants();
        fetchSettingsQuotas();
    }, []);

    const fetchSettingsQuotas = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.settings?.major_quotas) {
                const parsed = typeof data.settings.major_quotas === 'string'
                    ? JSON.parse(data.settings.major_quotas)
                    : data.settings.major_quotas;
                setMajorQuotas({ ...DEFAULT_QUOTAS, ...parsed });
            }
        } catch {
            // Gunakan kuota default jika gagal memuat pengaturan
        }
    };

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

    // Perhitungan KPI, Statistik Daftar Ulang & Kuota Jurusan
    const stats = useMemo(() => {
        const total = applicants.length;
        const pending = applicants.filter((a) => a.status === 'Pending').length;
        const revision = applicants.filter((a) => a.status === 'Perbaikan').length;
        const readyTest = applicants.filter((a) => a.status === 'Siap Tes dan/atau Wawancara' || a.status === 'Siap Tes').length;
        const accepted = applicants.filter((a) => a.status === 'Diterima').length;
        const rejected = applicants.filter((a) => a.status === 'Ditolak').length;
        const prestasiCount = applicants.filter((a) => a.registration_path === 'Prestasi').length;
        const regulerCount = total - prestasiCount;

        // Statistik Daftar Ulang
        const reregSubmitted = applicants.filter((a) => Boolean(a.rereg_status)).length;
        const reregWaiting = applicants.filter((a) => a.rereg_status === 'Menunggu Verifikasi').length;
        const reregRevision = applicants.filter((a) => a.rereg_status === 'Perbaikan Daftar Ulang').length;
        const reregVerified = applicants.filter((a) => a.rereg_status === 'Terverifikasi').length;
        const reregNotYet = applicants.filter((a) => a.status === 'Diterima' && !a.rereg_status).length;

        const payFullCount = applicants.filter((a) => a.payment_scheme?.includes('Lunas')).length;
        const payDpCount = applicants.filter((a) => a.payment_scheme?.includes('Minimal')).length;

        const byMajor = MAJOR_OPTIONS.map((major) => {
            const choice1Count = applicants.filter((a) => a.school_choice === major).length;
            const acceptedCount = applicants.filter(
                (a) => a.status === 'Diterima' && (a.accepted_major || a.school_choice) === major
            ).length;
            const verifiedReregCount = applicants.filter(
                (a) => a.status === 'Diterima' &&
                    (a.accepted_major || a.school_choice) === major &&
                    a.rereg_status === 'Terverifikasi'
            ).length;
            const quota = majorQuotas[major] ?? DEFAULT_QUOTAS[major] ?? 72;

            return {
                major,
                choice1Count,
                acceptedCount,
                verifiedReregCount,
                quota,
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
            reregSubmitted,
            reregWaiting,
            reregRevision,
            reregVerified,
            reregNotYet,
            payFullCount,
            payDpCount,
            byMajor,
        };
    }, [applicants, majorQuotas]);

    const filteredApplicants = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return applicants.filter((app) => {
            const matchesSearch =
                !q ||
                (app.full_name || '').toLowerCase().includes(q) ||
                (app.registration_number || '').toLowerCase().includes(q) ||
                (app.nisn || '').includes(q) ||
                (app.nik || '').includes(q) ||
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

            const matchesRereg =
                reregFilter === 'ALL' ||
                (reregFilter === 'MENUNGGU' && app.rereg_status === 'Menunggu Verifikasi') ||
                (reregFilter === 'TERVERIFIKASI' && app.rereg_status === 'Terverifikasi') ||
                (reregFilter === 'PERBAIKAN' && app.rereg_status === 'Perbaikan Daftar Ulang') ||
                (reregFilter === 'BELUM' && app.status === 'Diterima' && !app.rereg_status);

            return matchesSearch && matchesStatus && matchesMajor && matchesPath && matchesRereg;
        });
    }, [applicants, searchQuery, statusFilter, majorFilter, pathFilter, reregFilter]);

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        statusFilter !== 'ALL' ||
        majorFilter !== 'ALL' ||
        pathFilter !== 'ALL' ||
        reregFilter !== 'ALL';

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setMajorFilter('ALL');
        setPathFilter('ALL');
        setReregFilter('ALL');
    };

    // 1. Ekspor Data Pendaftar Umum
    const handleExportExcel = () => {
        setExportMenuOpen(false);
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
            'Status Seleksi': app.status,
            'Status Daftar Ulang': app.rereg_status || (app.status === 'Diterima' ? 'Belum Daftar Ulang' : '-'),
            'Skema Pembayaran': app.payment_scheme || '-',
            'Ukuran Seragam': app.uniform_size || '-',
            'Tgl Daftar': new Date(app.created_at).toLocaleString('id-ID'),
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendaftar');
        const suffix = hasActiveFilters ? '_Terfilter' : '';
        XLSX.writeFile(workbook, `Data_Pendaftar_PSB${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Berhasil mengekspor ${sourceData.length} data pendaftar`);
    };

    // 2. Ekspor Format Siap Dapodik (.xlsx)
    const handleExportDapodik = () => {
        setExportMenuOpen(false);
        const reregStudents = applicants.filter((a) => Boolean(a.rereg_status));
        if (reregStudents.length === 0) {
            toast.error('Belum ada peserta yang mengirimkan data Daftar Ulang.');
            return;
        }

        const dapodikRows = reregStudents.map((app, index) => ({
            'No': index + 1,
            'No Pendaftaran': app.registration_number,
            'Status Verifikasi DU': app.rereg_status,
            'Kompetensi Keahlian': app.accepted_major || app.school_choice,
            'Nama Lengkap': app.full_name,
            'NISN': app.nisn,
            'NIK Siswa': app.nik || '-',
            'No. Kartu Keluarga (KK)': app.no_kk || '-',
            'Tempat Lahir': app.birth_place || '-',
            'Tanggal Lahir': app.tanggal_lahir ? String(app.tanggal_lahir).split('T')[0] : '-',
            'Jenis Kelamin': app.gender || '-',
            'Agama': app.religion || '-',
            'Anak Ke-': app.child_order ?? '-',
            'Jumlah Saudara Kandung': app.siblings_count ?? '-',
            'Alamat Jalan / Kampung': app.address_street || '-',
            'RT / RW': app.rt_rw || '-',
            'Desa / Kelurahan': app.village || '-',
            'Kecamatan': app.district || '-',
            'Kabupaten / Kota': app.city || '-',
            'Kode Pos': app.postal_code || '-',
            'Status Tempat Tinggal': app.living_with || '-',
            'Tinggi Badan (cm)': app.height_cm ?? '-',
            'Berat Badan (kg)': app.weight_kg ?? '-',
            'Golongan Darah': app.blood_type || '-',
            'Catatan Kesehatan/Alergi': app.medical_notes || '-',
            'Asal Sekolah (SMP/MTs)': app.asal_sekolah || '-',
            'No. HP Siswa': app.phone || '-',
            'Email Siswa': app.email || '-',
            'Nama Ayah Kandung': app.father_name || '-',
            'NIK Ayah': app.father_nik || '-',
            'Pendidikan Ayah': app.father_education || '-',
            'Pekerjaan Ayah': app.father_occupation || '-',
            'Penghasilan Ayah': app.father_income || '-',
            'Nama Ibu Kandung': app.mother_name || '-',
            'NIK Ibu': app.mother_nik || '-',
            'Pendidikan Ibu': app.mother_education || '-',
            'Pekerjaan Ibu': app.mother_occupation || '-',
            'Penghasilan Ibu': app.mother_income || '-',
            'No. HP Orang Tua': app.parent_phone || '-',
            'Nama Wali': app.guardian_name || '-',
            'No. HP Wali': app.guardian_phone || '-',
            'Pekerjaan Wali': app.guardian_occupation || '-',
        }));

        const ws = XLSX.utils.json_to_sheet(dapodikRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data_Induk_Dapodik');
        XLSX.writeFile(wb, `Ekspor_Dapodik_Siswa_Baru_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Berhasil mengekspor ${reregStudents.length} data siap Dapodik!`);
    };

    // 3. Ekspor Rekap Ukuran Seragam & Pembayaran gosiswa.com (.xlsx)
    const handleExportSeragamPembayaran = () => {
        setExportMenuOpen(false);
        const reregStudents = applicants.filter((a) => Boolean(a.rereg_status));
        if (reregStudents.length === 0) {
            toast.error('Belum ada peserta yang mengirimkan data Daftar Ulang.');
            return;
        }

        const detailRows = reregStudents.map((app, index) => ({
            'No': index + 1,
            'No Pendaftaran': app.registration_number,
            'Nama Lengkap': app.full_name,
            'Jenis Kelamin': app.gender || '-',
            'Kompetensi Keahlian': app.accepted_major || app.school_choice,
            'Status Daftar Ulang': app.rereg_status,
            'Skema Pembayaran (gosiswa.com)': app.payment_scheme || '-',
            'Ukuran Seragam SMK': app.uniform_size || '-',
            'Tinggi (cm)': app.height_cm ?? '-',
            'Berat (kg)': app.weight_kg ?? '-',
            'Catatan Kesehatan/Alergi': app.medical_notes || '-',
            'No. HP Siswa': app.phone || '-',
            'No. HP Orang Tua': app.parent_phone || '-',
        }));

        const summaryRows = MAJOR_OPTIONS.map((major) => {
            const group = reregStudents.filter((a) => (a.accepted_major || a.school_choice) === major);
            const countSize = (sz: string) => group.filter((a) => a.uniform_size === sz).length;
            return {
                'Kompetensi Keahlian': major,
                'Total Siswa DU': group.length,
                'Terverifikasi DU': group.filter((a) => a.rereg_status === 'Terverifikasi').length,
                'Bayar Minimal (DP)': group.filter((a) => a.payment_scheme?.includes('Minimal')).length,
                'Bayar Lunas (Full + Diskon)': group.filter((a) => a.payment_scheme?.includes('Lunas')).length,
                'Beasiswa / Keringanan': group.filter((a) => a.payment_scheme?.includes('Beasiswa')).length,
                'Seragam S': countSize('S'),
                'Seragam M': countSize('M'),
                'Seragam L': countSize('L'),
                'Seragam XL': countSize('XL'),
                'Seragam XXL': countSize('XXL'),
                'Seragam XXXL': countSize('XXXL'),
            };
        });

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        const wsDetail = XLSX.utils.json_to_sheet(detailRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap_Per_Jurusan');
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Seragam_Pembayaran');
        XLSX.writeFile(wb, `Rekap_Seragam_Pembayaran_PSB_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Berhasil mengekspor rekap seragam & pembayaran (${reregStudents.length} siswa)!`);
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
                setApplicants((prev) =>
                    prev.map((app) =>
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

    const openReregModal = async (app: Applicant) => {
        setSelectedApp(app);
        setModalReregStatus(app.rereg_status || 'Menunggu Verifikasi');
        setModalReregNotes(app.rereg_notes || '');
        setModalPasFotoUrl(null);
        setReregModalOpen(true);

        if (app.doc_pas_foto) {
            try {
                const res = await fetch('/api/admin/document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: app.doc_pas_foto }),
                });
                const data = await res.json();
                if (data.viewUrl) setModalPasFotoUrl(data.viewUrl);
            } catch {
                // Abaikan jika gagal memuat pratinjau pas foto
            }
        }
    };

    const handleSaveReregVerification = async () => {
        if (!selectedApp) return;
        if (modalReregStatus === 'Perbaikan Daftar Ulang' && !modalReregNotes.trim()) {
            toast.error('Harap isi catatan bagian berkas/kuitansi yang perlu diperbaiki.');
            return;
        }

        setIsSavingRereg(true);
        const loading = toast.loading('Menyimpan verifikasi daftar ulang...');
        try {
            const res = await fetch('/api/admin/re-registration', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicant_id: selectedApp.id,
                    rereg_status: modalReregStatus,
                    rereg_notes: modalReregNotes,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setApplicants((prev) =>
                    prev.map((app) =>
                        app.id === selectedApp.id
                            ? {
                                ...app,
                                rereg_status: modalReregStatus,
                                rereg_notes: modalReregNotes.trim() || null,
                            }
                            : app
                    )
                );
                setReregModalOpen(false);
                toast.success(`Status Daftar Ulang: ${modalReregStatus}`, { id: loading });
            } else {
                toast.error(data.error || 'Gagal menyimpan verifikasi.', { id: loading });
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.', { id: loading });
        } finally {
            setIsSavingRereg(false);
        }
    };

    const buildReregWhatsAppUrl = (app: Applicant) => {
        const rawPhone = (app.phone || app.parent_phone || '').replace(/\D/g, '');
        const waPhone = rawPhone.startsWith('0') ? `62${rawPhone.slice(1)}` : rawPhone;
        const majorName = app.accepted_major || app.school_choice;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const msg = `Assalamu'alaikum Wr. Wb.\nYth. *${app.full_name}* (No. Reg: ${app.registration_number}),\n\nSelamat! Anda dinyatakan *DITERIMA* di *SMK KH. A. Wahab Muhsin* pada kompetensi keahlian *${majorName}*.\n\nMohon segera menyelesaikan tahap *Daftar Ulang* dengan melakukan pembayaran melalui portal *gosiswa.com* (tersedia pilihan pembayaran Minimal/DP maupun Pelunasan Full dengan Diskon), lalu unggah kuitansi digital & lengkapi biodata Dapodik melalui tautan berikut:\n${origin}/daftar-ulang\n\nTerima kasih.\nPanitia PSB SMK KH. A. Wahab Muhsin`;
        return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
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
        const parsedFields: string[] = Array.isArray(app.revision_fields)
            ? app.revision_fields
            : typeof app.revision_fields === 'string'
                ? (() => {
                    try {
                        const p = JSON.parse(app.revision_fields);
                        return Array.isArray(p) ? p : [];
                    } catch {
                        return [];
                    }
                })()
                : [];
        setModalFields(parsedFields);
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
                setApplicants((prev) =>
                    prev.map((app) =>
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
                setApplicants((prev) =>
                    prev.map((app) =>
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

    const toggleField = (field: string) => setModalFields((prev) => prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]);

    const toggleStatusCardFilter = (target: string) => {
        setStatusFilter((prev) => (prev === target ? 'ALL' : target));
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

            <div className="max-w-[1540px] mx-auto z-10 relative space-y-6">
                {/* Header Card */}
                <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-20 ${isDarkMode
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
                            Dashboard Verifikasi, Seleksi &amp; Daftar Ulang
                        </h1>
                        <p className={`text-sm sm:text-[15px] mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                            SMK KH. A. WAHAB MUHSIN &bull; Reguler: <span className="font-extrabold">{stats.regulerCount}</span> &bull; Prestasi: <span className="font-extrabold">{stats.prestasiCount}</span> &bull; Resmi DU: <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{stats.reregVerified}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        {/* Dropdown Ekspor Excel (Umum, Dapodik, Seragam & Pembayaran) */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setExportMenuOpen((prev) => !prev)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                                    ? 'bg-emerald-950/75 hover:bg-emerald-900/85 border-emerald-700/70 text-emerald-300'
                                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                                    }`}
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Ekspor Excel</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {exportMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setExportMenuOpen(false)}
                                    />
                                    <div className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-40 space-y-1 ${isDarkMode
                                        ? 'bg-gray-900 border-gray-700 text-gray-100'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                                        }`}>
                                        <button
                                            type="button"
                                            onClick={handleExportExcel}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-start gap-2.5 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-[#faf4ec]'}`}
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-extrabold">Data Pendaftar ({filteredApplicants.length})</p>
                                                <p className="text-[11px] opacity-75 font-normal">Semua data seleksi sesuai filter aktif</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleExportDapodik}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-start gap-2.5 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-[#faf4ec]'}`}
                                        >
                                            <Database className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-extrabold">Ekspor Format Dapodik ({stats.reregSubmitted})</p>
                                                <p className="text-[11px] opacity-75 font-normal">NIK, No. KK, alamat, periodik &amp; data ortu</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleExportSeragamPembayaran}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-start gap-2.5 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-[#faf4ec]'}`}
                                        >
                                            <Shirt className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-extrabold">Rekap Seragam &amp; Pembayaran</p>
                                                <p className="text-[11px] opacity-75 font-normal">Ukuran baju SMK &amp; skema gosiswa.com</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

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

                {/* KPI SUMMARY CARDS (7 Kartu: 6 Seleksi + 1 Daftar Ulang) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {/* Total Pendaftar */}
                    <button
                        type="button"
                        onClick={() => { setStatusFilter('ALL'); setReregFilter('ALL'); }}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'ALL' && reregFilter === 'ALL'
                            ? isDarkMode
                                ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                                : 'bg-white border-[#b85c38] ring-2 ring-[#b85c38]/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                                Total Pendaftar
                            </span>
                            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                                <Users className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.total}
                        </div>
                        <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Semua calon siswa
                        </p>
                    </button>

                    {/* Pending */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Pending')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Pending'
                            ? isDarkMode
                                ? 'bg-yellow-950/75 border-yellow-500 ring-2 ring-yellow-500/30 shadow-lg'
                                : 'bg-yellow-50 border-yellow-600 ring-2 ring-yellow-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-yellow-400' : 'text-yellow-900'}`}>
                                Pending
                            </span>
                            <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400">
                                <Clock className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.pending}
                        </div>
                        <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Verifikasi berkas
                        </p>
                    </button>

                    {/* Perbaikan */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Perbaikan')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Perbaikan'
                            ? isDarkMode
                                ? 'bg-amber-950/75 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                                : 'bg-amber-50 border-amber-600 ring-2 ring-amber-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-amber-400' : 'text-amber-900'}`}>
                                Perbaikan
                            </span>
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.revision}
                        </div>
                        <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Revisi awal
                        </p>
                    </button>

                    {/* Siap Seleksi */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('SIAP_TES')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'SIAP_TES'
                            ? isDarkMode
                                ? 'bg-blue-950/75 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                                : 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                                Siap Seleksi
                            </span>
                            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400">
                                <ClipboardCheck className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.readyTest}
                        </div>
                        <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Tes &amp; Wawancara
                        </p>
                    </button>

                    {/* Diterima */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Diterima')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Diterima'
                            ? isDarkMode
                                ? 'bg-emerald-950/75 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                                : 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>
                                Diterima
                            </span>
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.accepted}
                        </div>
                        <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Lulus seleksi
                        </p>
                    </button>

                    {/* Daftar Ulang (Terverifikasi / Masuk) */}
                    <button
                        type="button"
                        onClick={() => setReregFilter((prev) => (prev === 'MENUNGGU' ? 'ALL' : 'MENUNGGU'))}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${reregFilter !== 'ALL'
                            ? isDarkMode
                                ? 'bg-teal-950/80 border-teal-500 ring-2 ring-teal-500/30 shadow-lg'
                                : 'bg-teal-50 border-teal-600 ring-2 ring-teal-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-teal-300' : 'text-teal-900'}`}>
                                Daftar Ulang
                            </span>
                            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300">
                                <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.reregVerified} <span className="text-xs font-bold opacity-70">/ {stats.accepted}</span>
                        </div>
                        <p className={`text-[11px] font-bold mt-0.5 ${stats.reregWaiting > 0 ? 'text-amber-700 dark:text-amber-400' : isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            {stats.reregWaiting > 0 ? `${stats.reregWaiting} perlu verifikasi` : `Lunas: ${stats.payFullCount} | DP: ${stats.payDpCount}`}
                        </p>
                    </button>

                    {/* Ditolak */}
                    <button
                        type="button"
                        onClick={() => toggleStatusCardFilter('Ditolak')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md ${statusFilter === 'Ditolak'
                            ? isDarkMode
                                ? 'bg-rose-950/75 border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
                                : 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/30 shadow-lg'
                            : isDarkMode
                                ? 'bg-gray-900/75 border-gray-800 hover:bg-gray-800/80'
                                : 'bg-[#fffdf9]/90 border-white/90 hover:bg-white'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isDarkMode ? 'text-rose-400' : 'text-rose-900'}`}>
                                Ditolak
                            </span>
                            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400">
                                <XCircle className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                            {stats.rejected}
                        </div>
                        <p className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                            Tidak lolos
                        </p>
                    </button>
                </div>

                {/* DISTRIBUSI & KETERISIAN KUOTA KURSI PER JURUSAN */}
                <div className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-lg ${isDarkMode
                    ? 'bg-gray-900/70 border-gray-800'
                    : 'bg-[#fffdf9]/92 border-white shadow-[#5c4033]/12'
                    }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                            <GraduationCap className={`w-5 h-5 ${isDarkMode ? 'text-teal-400' : 'text-[#9e4522]'}`} />
                            <h2 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'}`}>
                                Ringkasan Peminat, Kelulusan &amp; Keterisian Kuota Kursi (Resmi Daftar Ulang)
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
                            const quotaPercent = item.quota > 0 ? Math.round((item.verifiedReregCount / item.quota) * 100) : 0;
                            const isSelected = majorFilter === item.major;
                            return (
                                <button
                                    key={item.major}
                                    type="button"
                                    onClick={() => setMajorFilter((prev) => (prev === item.major ? 'ALL' : item.major))}
                                    className={`text-left p-4 rounded-2xl border transition-all ${isSelected
                                        ? isDarkMode
                                            ? 'bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/25'
                                            : 'bg-[#fdf6ee] border-[#b85c38] ring-2 ring-[#b85c38]/25 shadow-sm'
                                        : isDarkMode
                                            ? 'bg-gray-950/60 border-gray-800 hover:bg-gray-800/70'
                                            : 'bg-white border-[#dfd0c0] hover:border-[#b85c38]/60 hover:bg-[#faf5ef]'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-gray-100' : 'text-[#1f1410]'}`}>
                                            {item.major}
                                        </p>
                                        <span className="shrink-0 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                            {item.acceptedCount} Lulus
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}>
                                            Kursi Terkunci (DU):{' '}
                                            <strong className={isDarkMode ? 'text-white' : 'text-[#1f1410]'}>
                                                {item.verifiedReregCount} / {item.quota}
                                            </strong>
                                        </span>
                                        <span className={`font-mono font-extrabold text-xs ${isDarkMode ? 'text-teal-300' : 'text-[#8f3f20]'}`}>
                                            {quotaPercent}%
                                        </span>
                                    </div>

                                    <div className={`w-full h-2.5 rounded-full overflow-hidden mb-2 ${isDarkMode ? 'bg-gray-800' : 'bg-[#eadfd2]'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isDarkMode ? 'bg-teal-500' : 'bg-[#b85c38]'}`}
                                            style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                                        />
                                    </div>

                                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                                        Total Peminat Pilihan 1: <strong>{item.choice1Count}</strong> siswa
                                    </p>
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
                            <div className="relative flex-1 min-w-[230px] max-w-sm">
                                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama, NISN, NIK, no reg, SMP..."
                                    className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl border transition-all outline-none ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] placeholder-[#7a6358] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20'
                                        }`}
                                />
                            </div>

                            {/* Filter Status Seleksi */}
                            <div className="relative">
                                <Filter className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    aria-label="Filter Status Seleksi"
                                    className={`appearance-none pl-8 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border outline-none cursor-pointer ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-gray-100 focus:border-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38]'
                                        }`}
                                >
                                    <option value="ALL">Semua Status Seleksi</option>
                                    <option value="Pending">⏳ Pending</option>
                                    <option value="Perbaikan">⚠️ Perbaikan</option>
                                    <option value="SIAP_TES">📝 Siap Tes &amp; Wawancara</option>
                                    <option value="Diterima">✅ Diterima</option>
                                    <option value="Ditolak">❌ Ditolak</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                            </div>

                            {/* Filter Daftar Ulang */}
                            <div className="relative">
                                <select
                                    value={reregFilter}
                                    onChange={(e) => setReregFilter(e.target.value)}
                                    aria-label="Filter Status Daftar Ulang"
                                    className={`appearance-none pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl border outline-none cursor-pointer ${isDarkMode
                                        ? 'bg-gray-950/80 border-gray-700 text-gray-100 focus:border-indigo-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38]'
                                        }`}
                                >
                                    <option value="ALL">Semua Daftar Ulang</option>
                                    <option value="MENUNGGU">⏳ Menunggu Verifikasi DU ({stats.reregWaiting})</option>
                                    <option value="TERVERIFIKASI">✅ Terverifikasi DU ({stats.reregVerified})</option>
                                    <option value="PERBAIKAN">⚠️ Perbaikan DU ({stats.reregRevision})</option>
                                    <option value="BELUM">❗ Diterima - Belum DU ({stats.reregNotYet})</option>
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

                            {/* Filter Jalur */}
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
                                    <option value="Reguler">Reguler</option>
                                    <option value="Prestasi">Prestasi</option>
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
                            <table className="w-full text-left border-collapse min-w-[1160px]">
                                <thead>
                                    <tr className={`border-b-2 text-xs sm:text-[13px] uppercase tracking-wider font-extrabold ${isDarkMode
                                        ? 'bg-gray-950 text-gray-300 border-gray-800'
                                        : 'bg-[#efe4d6] text-[#2b1d18] border-[#d1bfa9]'
                                        }`}>
                                        <th className="p-4 pl-4 w-12">No</th>
                                        <th className="p-4">Nama &amp; Kontak</th>
                                        <th className="p-4">NISN &amp; Tgl Lahir</th>
                                        <th className="p-4">Pilihan Jurusan</th>
                                        <th className="p-4">Berkas &amp; Daftar Ulang</th>
                                        <th className="p-4 pr-4 w-80">Status &amp; Tindakan</th>
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

                                            {/* Kolom Berkas Seleksi + Status Daftar Ulang */}
                                            <td className="p-4 space-y-2.5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {app.document_kk && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_kk!)}
                                                            className={`px-2.5 py-1 rounded-lg font-extrabold text-xs border transition-all ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700'
                                                                : 'bg-[#f7f1ea] hover:bg-[#eadfd2] text-[#2b1d18] border-[#cbb7a2]'
                                                                }`}
                                                        >
                                                            KK
                                                        </button>
                                                    )}
                                                    {app.document_akta && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_akta!)}
                                                            className={`px-2.5 py-1 rounded-lg font-extrabold text-xs border transition-all ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700'
                                                                : 'bg-[#f7f1ea] hover:bg-[#eadfd2] text-[#2b1d18] border-[#cbb7a2]'
                                                                }`}
                                                        >
                                                            Akta
                                                        </button>
                                                    )}
                                                    {app.document_prestasi && (
                                                        <button
                                                            onClick={() => handleViewDocument(app.document_prestasi!)}
                                                            className="px-2.5 py-1 rounded-lg font-extrabold text-xs bg-amber-100 hover:bg-amber-200 text-amber-950 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 border border-amber-300 dark:border-amber-500/35 transition-all flex items-center gap-1"
                                                        >
                                                            <Award className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                                            <span>Prestasi</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Info Status Daftar Ulang untuk siswa Diterima */}
                                                {app.status === 'Diterima' && (
                                                    <div className={`p-2.5 rounded-xl border space-y-1.5 ${app.rereg_status === 'Terverifikasi'
                                                        ? isDarkMode ? 'bg-emerald-950/40 border-emerald-700/70' : 'bg-emerald-50 border-emerald-300'
                                                        : app.rereg_status === 'Perbaikan Daftar Ulang'
                                                            ? isDarkMode ? 'bg-amber-950/40 border-amber-700/70' : 'bg-amber-50 border-amber-300'
                                                            : app.rereg_status === 'Menunggu Verifikasi'
                                                                ? isDarkMode ? 'bg-blue-950/40 border-blue-700/70' : 'bg-blue-50 border-blue-300'
                                                                : isDarkMode ? 'bg-gray-950/70 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'
                                                        }`}>
                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <span className="text-[11px] font-extrabold uppercase tracking-wide">
                                                                {app.rereg_status ? `DU: ${app.rereg_status}` : 'Belum Daftar Ulang'}
                                                            </span>
                                                            {app.uniform_size && (
                                                                <span className="text-[11px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                                                    Baju {app.uniform_size}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {app.rereg_status ? (
                                                            <div className="space-y-1.5">
                                                                <p className="text-[11px] font-semibold opacity-85">
                                                                    Bayar: <strong>{app.payment_scheme}</strong>
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openReregModal(app)}
                                                                    className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                                                                >
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    <span>Verifikasi DU &amp; Kuitansi</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <a
                                                                href={buildReregWhatsAppUrl(app)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                                <span>Ingatkan WA DU</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Kolom Status Seleksi & Aksi */}
                                            <td className="p-4 pr-4 space-y-2.5">
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

            {/* MODAL BARU: VERIFIKASI DAFTAR ULANG & KUITANSI GOSISWA.COM */}
            {reregModalOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-3xl p-6 sm:p-7 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                        } max-h-[92vh] overflow-y-auto space-y-5`}>
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold">Verifikasi Daftar Ulang &amp; Pembayaran</h3>
                                    <p className="text-xs opacity-80">
                                        {selectedApp.full_name} ({selectedApp.registration_number}) &bull; {selectedApp.accepted_major || selectedApp.school_choice}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setReregModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Ringkasan Pas Foto + Pembayaran + Seragam */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-950/70 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'}`}>
                                {modalPasFotoUrl ? (
                                    <img
                                        src={modalPasFotoUrl}
                                        alt="Pas Foto 3x4"
                                        className="w-28 h-36 object-cover rounded-xl border-2 border-[#b85c38] shadow-md"
                                    />
                                ) : (
                                    <div className="w-28 h-36 rounded-xl border border-dashed border-gray-400 flex items-center justify-center text-xs font-bold opacity-60">
                                        Memuat Foto...
                                    </div>
                                )}
                                <span className="mt-2 text-xs font-extrabold">Pas Foto 3x4</span>
                            </div>

                            <div className={`md:col-span-2 p-4 rounded-2xl border space-y-2.5 text-xs sm:text-sm ${isDarkMode ? 'bg-gray-950/70 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'}`}>
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                    <span className="font-semibold opacity-75 flex items-center gap-1.5">
                                        <CreditCard className="w-4 h-4 text-blue-600" /> Skema Pembayaran:
                                    </span>
                                    <span className="font-extrabold text-blue-800 dark:text-blue-300">
                                        {selectedApp.payment_scheme || '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                    <span className="font-semibold opacity-75 flex items-center gap-1.5">
                                        <Shirt className="w-4 h-4 text-amber-600" /> Ukuran Seragam SMK:
                                    </span>
                                    <span className="font-extrabold">Ukuran {selectedApp.uniform_size || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                    <span className="font-semibold opacity-75">NIK / No. KK:</span>
                                    <span className="font-mono font-bold">{selectedApp.nik || '-'} / {selectedApp.no_kk || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                    <span className="font-semibold opacity-75">TTL / Jenis Kelamin:</span>
                                    <span className="font-bold">{selectedApp.birth_place || '-'} / {selectedApp.gender || '-'}</span>
                                </div>
                                <div>
                                    <span className="font-semibold opacity-75 block">Alamat Domisili:</span>
                                    <span className="font-bold">
                                        {selectedApp.address_street}{selectedApp.rt_rw ? ` RT/RW ${selectedApp.rt_rw}` : ''}, Desa {selectedApp.village}, Kec. {selectedApp.district}, {selectedApp.city} {selectedApp.postal_code || ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Data Orang Tua & Kesehatan */}
                        <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${isDarkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                            <div>
                                <p className="font-extrabold uppercase opacity-70 mb-1">Data Ayah &amp; Ibu</p>
                                <p>Ayah: <strong>{selectedApp.father_name}</strong> ({selectedApp.father_occupation || '-'}, {selectedApp.father_income || '-'})</p>
                                <p>Ibu: <strong>{selectedApp.mother_name}</strong> ({selectedApp.mother_occupation || '-'}, {selectedApp.mother_income || '-'})</p>
                            </div>
                            <div>
                                <p className="font-extrabold uppercase opacity-70 mb-1">Periodik &amp; Kesehatan</p>
                                <p>TB/BB: <strong>{selectedApp.height_cm || '-'} cm / {selectedApp.weight_kg || '-'} kg</strong> &bull; Gol. Darah: <strong>{selectedApp.blood_type || '-'}</strong></p>
                                <p>Catatan Kesehatan: <strong>{selectedApp.medical_notes || 'Tidak ada'}</strong></p>
                            </div>
                        </div>

                        {/* Tombol Buka 4 Dokumen Daftar Ulang */}
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wide mb-2">Tinjau Lampiran Berkas Daftar Ulang:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {selectedApp.doc_kuitansi_gosiswa && (
                                    <button
                                        type="button"
                                        onClick={() => handleViewDocument(selectedApp.doc_kuitansi_gosiswa!)}
                                        className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        <span>Kuitansi gosiswa</span>
                                    </button>
                                )}
                                {selectedApp.doc_pas_foto && (
                                    <button
                                        type="button"
                                        onClick={() => handleViewDocument(selectedApp.doc_pas_foto!)}
                                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        <span>Pas Foto 3x4</span>
                                    </button>
                                )}
                                {selectedApp.doc_skl_ijazah && (
                                    <button
                                        type="button"
                                        onClick={() => handleViewDocument(selectedApp.doc_skl_ijazah!)}
                                        className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Scan SKL/Ijazah</span>
                                    </button>
                                )}
                                {selectedApp.doc_pernyataan && (
                                    <button
                                        type="button"
                                        onClick={() => handleViewDocument(selectedApp.doc_pernyataan!)}
                                        className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        <FileCheck2 className="w-3.5 h-3.5" />
                                        <span>Surat Pernyataan</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Keputusan Verifikasi Panitia */}
                        <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-gray-950/70 border-gray-800' : 'bg-[#fdf6ee] border-[#cbb7a2]'}`}>
                            <label className="block text-xs sm:text-sm font-extrabold">Keputusan Verifikasi Daftar Ulang:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                    { value: 'Menunggu Verifikasi', label: '⏳ Menunggu Verifikasi' },
                                    { value: 'Perbaikan Daftar Ulang', label: '⚠️ Minta Perbaikan DU' },
                                    { value: 'Terverifikasi', label: '✅ Terverifikasi (Sah)' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setModalReregStatus(opt.value)}
                                        className={`py-2.5 px-3 rounded-xl border-2 font-extrabold text-xs transition-all ${modalReregStatus === opt.value
                                            ? opt.value === 'Terverifikasi'
                                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                                : opt.value === 'Perbaikan Daftar Ulang'
                                                    ? 'bg-amber-600 border-amber-500 text-white'
                                                    : 'bg-blue-600 border-blue-500 text-white'
                                            : isDarkMode
                                                ? 'bg-gray-900 border-gray-700 text-gray-300'
                                                : 'bg-white border-[#cbb7a2] text-[#2b1d18]'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1">
                                    Catatan Panitia / Bendahara {modalReregStatus === 'Perbaikan Daftar Ulang' ? '(Wajib diisi untuk perbaikan)' : '(Opsional)'}:
                                </label>
                                <textarea
                                    value={modalReregNotes}
                                    onChange={(e) => setModalReregNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Contoh: Nominal pada kuitansi gosiswa.com belum sesuai atau scan SKL kurang jelas..."
                                    className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setReregModalOpen(false)}
                                className="w-1/3 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold text-xs sm:text-sm"
                            >
                                Tutup
                            </button>
                            <button
                                type="button"
                                disabled={isSavingRereg}
                                onClick={handleSaveReregVerification}
                                className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs sm:text-sm shadow-md disabled:opacity-50"
                            >
                                {isSavingRereg ? 'Menyimpan...' : 'Simpan Verifikasi Daftar Ulang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                        {[1, 2, 3, 4].map((score) => (
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
                                                    onChange={() => setInterviewScores((prev) => ({ ...prev, [q.id]: score }))}
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