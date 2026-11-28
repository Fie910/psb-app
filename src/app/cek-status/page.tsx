//src/app/cek-status/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import QRCode from 'react-qr-code';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    Search, ArrowLeft, Printer, CheckCircle2, Clock, Video,
    AlertTriangle, FileText, Upload, User, CalendarCheck,
    ClipboardCheck, ArrowRight, Award, Check, XCircle
} from 'lucide-react';

type SiteSettings = {
    school_name?: string;
    foundation_name?: string;
    school_address?: string;
    school_city?: string;
    headmaster_name?: string;
    headmaster_nip?: string;
    logo_url?: string;
    rereg_start?: string | null;
    rereg_end?: string | null;
};

type Applicant = {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    school_choice: string;
    school_choice_2?: string | null;
    registration_path?: string | null;
    status: string;
    document_kk: string | null;
    document_akta: string | null;
    document_prestasi?: string | null;
    document_notes: string | null;
    revision_fields: string[];
    tanggal_lahir: string;
    nisn: string;
    test_date: string | null;
    test_time: string | null;
    test_location: string | null;
    registration_number: string;
    accepted_at: string | null;
    accepted_major: string | null;
    asal_sekolah: string | null;
    father_name: string | null;
    mother_name: string | null;
    parent_phone: string | null;
    interview_date: string | null;
    interview_time: string | null;
    rereg_status?: string | null;
    rereg_notes?: string | null;
    rereg_payment_scheme?: string | null;
    rereg_uniform_size?: string | null;
};

interface StepInfo {
    id: number;
    name: string;
    state: 'completed' | 'current' | 'warning' | 'rejected' | 'upcoming';
    label: string;
}

export default function CekStatusPage() {
    const { isDarkMode } = useTheme();
    const [nisn, setNisn] = useState('');
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [applicant, setApplicant] = useState<Applicant | null>(null);

    // State Print Mode (Mencegah tabrakan cetak antara Surat Kelulusan & Kartu Ujian)
    const [printMode, setPrintMode] = useState<'kelulusan' | 'kartu_ujian' | null>(null);

    // State Perbaikan
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newAsalSekolah, setNewAsalSekolah] = useState('');
    const [newFatherName, setNewFatherName] = useState('');
    const [newMotherName, setNewMotherName] = useState('');
    const [newParentPhone, setNewParentPhone] = useState('');
    const [fileKK, setFileKK] = useState<File | null>(null);
    const [fileAkta, setFileAkta] = useState<File | null>(null);
    const [filePrestasi, setFilePrestasi] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState('');

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then((data: { settings?: SiteSettings }) => {
                if (data.settings) setSiteSettings(data.settings);
            });

        const handleAfterPrint = () => {
            setPrintMode(null);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    const handleCekStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setApplicant(null);

        try {
            const res = await fetch('/api/cek-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nisn, tanggal_lahir: tanggalLahir }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Data tidak ditemukan');
            } else {
                setApplicant(data.applicant);
                setNewName(data.applicant.full_name);
                setNewEmail(data.applicant.email);
                setNewPhone(data.applicant.phone || '');
                setNewAsalSekolah(data.applicant.asal_sekolah || '');
                setNewFatherName(data.applicant.father_name || '');
                setNewMotherName(data.applicant.mother_name || '');
                setNewParentPhone(data.applicant.parent_phone || '');
            }
        } catch {
            setError('Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSimpanPerbaikan = async () => {
        if (!applicant) return;
        setUploadStatus('Memproses perbaikan...');

        try {
            let newKKKey = null;
            let newAktaKey = null;
            let newPrestasiKey = null;
            const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };

            if (applicant.revision_fields?.includes('kk') && fileKK) {
                setUploadStatus('Mengunggah KK baru...');
                const compressed = await imageCompression(fileKK, options);
                const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, studentName: applicant.full_name, docType: 'KK' }) });
                const { signedUrl, key } = await res.json();
                await fetch(signedUrl, { method: 'PUT', body: compressed });
                newKKKey = key;
            }

            if (applicant.revision_fields?.includes('akta') && fileAkta) {
                setUploadStatus('Mengunggah Akta baru...');
                const compressed = await imageCompression(fileAkta, options);
                const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, studentName: applicant.full_name, docType: 'Akta' }) });
                const { signedUrl, key } = await res.json();
                await fetch(signedUrl, { method: 'PUT', body: compressed });
                newAktaKey = key;
            }

            if (applicant.revision_fields?.includes('prestasi') && filePrestasi) {
                setUploadStatus('Mengunggah Dokumen Prestasi baru...');
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: filePrestasi.name, fileType: filePrestasi.type || 'application/pdf', studentName: applicant.full_name, docType: 'Prestasi' })
                });
                const { signedUrl, key } = await res.json();
                await fetch(signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': filePrestasi.type || 'application/pdf' },
                    body: filePrestasi
                });
                newPrestasiKey = key;
            }

            setUploadStatus('Menyimpan data...');
            const updateRes = await fetch('/api/update-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nisn,
                    tanggal_lahir: tanggalLahir,
                    newName: applicant.revision_fields?.includes('full_name') ? newName : null,
                    newEmail: applicant.revision_fields?.includes('email') ? newEmail : null,
                    newPhone: applicant.revision_fields?.includes('phone') ? newPhone : null,
                    newAsalSekolah: applicant.revision_fields?.includes('asal_sekolah') ? newAsalSekolah : null,
                    newFatherName: applicant.revision_fields?.includes('father_name') ? newFatherName : null,
                    newMotherName: applicant.revision_fields?.includes('mother_name') ? newMotherName : null,
                    newParentPhone: applicant.revision_fields?.includes('parent_phone') ? newParentPhone : null,
                    docType: newKKKey ? 'KK' : (newAktaKey ? 'Akta' : (newPrestasiKey ? 'Prestasi' : null)),
                    document_key: newKKKey || newAktaKey || newPrestasiKey || null,
                    oldKey: newKKKey ? applicant.document_kk : (newAktaKey ? applicant.document_akta : (newPrestasiKey ? applicant.document_prestasi : null))
                }),
            });

            if (!updateRes.ok) throw new Error('Gagal update');

            setUploadStatus('Perbaikan berhasil disimpan!');
            setTimeout(() => {
                setApplicant(null);
                setUploadStatus('');
            }, 2000);

        } catch (error) {
            console.error(error);
            setUploadStatus('Gagal menyimpan perbaikan. Silakan coba lagi.');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const datePart = dateString.split('T')[0];
        const date = new Date(datePart + 'T00:00:00');
        return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatShortDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        const datePart = dateString.split('T')[0];
        const date = new Date(datePart + 'T00:00:00');
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const checkIsTimeToTest = () => {
        if (!applicant || !applicant.test_date || !applicant.test_time) return false;
        const datePart = applicant.test_date.split('T')[0];
        const timePart = applicant.test_time.slice(0, 5);
        const targetTime = new Date(`${datePart}T${timePart}:00+07:00`);
        return new Date() >= targetTime;
    };

    const checkIsTimeToInterview = () => {
        if (!applicant || !applicant.interview_date || !applicant.interview_time) return false;
        const datePart = applicant.interview_date.split('T')[0];
        const timePart = applicant.interview_time.slice(0, 5);
        const targetTime = new Date(`${datePart}T${timePart}:00+07:00`);
        return new Date() >= targetTime;
    };

    const isTimeToTest = checkIsTimeToTest();
    const isTimeToInterview = checkIsTimeToInterview();

    // Trigger Cetak Surat Kelulusan
    const handlePrintKelulusan = () => {
        if (!applicant) return;
        setPrintMode('kelulusan');
        document.title = `Surat_Kelulusan_${applicant.full_name}`;
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // Trigger Cetak Kartu Peserta Ujian
    const handlePrintKartuUjian = () => {
        if (!applicant) return;
        setPrintMode('kartu_ujian');
        document.title = `Kartu_Ujian_${applicant.full_name}`;
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // LOGIKA STEPPER 5 TAHAP
    const steps: StepInfo[] = (() => {
        if (!applicant) return [];

        const st = applicant.status;
        const rst = applicant.rereg_status;

        // Tahap 1: Pendaftaran (Selalu selesai jika applicant ada)
        const step1: StepInfo = { id: 1, name: 'Pendaftaran', state: 'completed', label: 'Selesai' };

        // Tahap 2: Verifikasi Berkas
        let step2: StepInfo;
        if (st === 'Pending') {
            step2 = { id: 2, name: 'Verifikasi', state: 'current', label: 'Proses' };
        } else if (st === 'Perbaikan') {
            step2 = { id: 2, name: 'Verifikasi', state: 'warning', label: 'Perlu Revisi' };
        } else {
            step2 = { id: 2, name: 'Verifikasi', state: 'completed', label: 'Terverifikasi' };
        }

        // Tahap 3: Tes & Wawancara
        let step3: StepInfo;
        if (st === 'Pending' || st === 'Perbaikan') {
            step3 = { id: 3, name: 'Tes Seleksi', state: 'upcoming', label: 'Menunggu' };
        } else if (st === 'Siap Tes dan/atau Wawancara' || st === 'Siap Tes') {
            step3 = { id: 3, name: 'Tes Seleksi', state: 'current', label: 'Jadwal Aktif' };
        } else {
            step3 = { id: 3, name: 'Tes Seleksi', state: 'completed', label: 'Selesai' };
        }

        // Tahap 4: Pengumuman
        let step4: StepInfo;
        if (st === 'Diterima') {
            step4 = { id: 4, name: 'Pengumuman', state: 'completed', label: 'Lulus' };
        } else if (st === 'Ditolak') {
            step4 = { id: 4, name: 'Pengumuman', state: 'rejected', label: 'Tidak Lolos' };
        } else {
            step4 = { id: 4, name: 'Pengumuman', state: 'upcoming', label: 'Belum Terbit' };
        }

        // Tahap 5: Daftar Ulang
        let step5: StepInfo;
        if (st === 'Ditolak') {
            step5 = { id: 5, name: 'Daftar Ulang', state: 'upcoming', label: '-' };
        } else if (st === 'Diterima') {
            if (rst === 'Terverifikasi') {
                step5 = { id: 5, name: 'Daftar Ulang', state: 'completed', label: 'Terverifikasi' };
            } else if (rst === 'Perbaikan Daftar Ulang') {
                step5 = { id: 5, name: 'Daftar Ulang', state: 'warning', label: 'Revisi DU' };
            } else if (rst === 'Menunggu Verifikasi') {
                step5 = { id: 5, name: 'Daftar Ulang', state: 'current', label: 'Verifikasi DU' };
            } else {
                step5 = { id: 5, name: 'Daftar Ulang', state: 'current', label: 'Buka Form' };
            }
        } else {
            step5 = { id: 5, name: 'Daftar Ulang', state: 'upcoming', label: 'Menunggu' };
        }

        return [step1, step2, step3, step4, step5];
    })();

    // ===== SHARED STYLES =====
    const bg = isDarkMode
        ? 'bg-linear-to-br from-gray-900 via-slate-800 to-slate-900'
        : 'bg-linear-to-br from-[#d5beaa] via-[#b89779] to-[#987657]';

    const card = isDarkMode
        ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl shadow-2xl shadow-black/50'
        : 'bg-[#fffdf9]/92 border-white backdrop-blur-xl shadow-2xl shadow-[#5c4033]/20';

    const inputCls = isDarkMode
        ? 'bg-gray-950/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20';

    const labelCls = isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]';
    const textPrimary = isDarkMode ? 'text-white' : 'text-[#1f1410]';
    const textSecondary = isDarkMode ? 'text-gray-300' : 'text-[#4a352b]';

    const infoCard = isDarkMode
        ? 'bg-gray-950/60 border-gray-800'
        : 'bg-[#faf4ec] border-[#d6c5b3]';

    const revisionCard = isDarkMode
        ? 'bg-amber-900/25 border-amber-700/50'
        : 'bg-amber-50 border-amber-300';

    const revisionInputCls = isDarkMode
        ? 'bg-gray-800 border-gray-600 text-gray-100 focus:border-amber-500 focus:outline-none'
        : 'bg-white border-amber-400 text-[#1f1410] focus:border-amber-600 focus:outline-none';

    const fileWrapperCls = isDarkMode ? 'text-gray-400' : 'text-[#5c4337]';

    const reregHref = applicant
        ? `/daftar-ulang?nisn=${encodeURIComponent(applicant.nisn)}&tgl=${encodeURIComponent((applicant.tanggal_lahir || tanggalLahir).split('T')[0])}`
        : '/daftar-ulang';

    const wawancaraHref = applicant
        ? `/wawancara?nisn=${encodeURIComponent(applicant.nisn)}&tgl=${encodeURIComponent((applicant.tanggal_lahir || tanggalLahir).split('T')[0])}`
        : '/wawancara';

    return (
        <>
            {/* ===== TAMPILAN WEB ===== */}
            <main className={`min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden print:hidden transition-colors duration-500 ${bg}`}>
                {/* Orb */}
                <div className={`absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-25 ${isDarkMode ? 'bg-indigo-700' : 'bg-[#e3c8af]'}`}></div>

                {/* Theme Toggle */}
                <div className="absolute top-4 right-4 z-50">
                    <ThemeToggle />
                </div>

                <div className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border z-10 transition-all ${card}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <User className={`w-5 h-5 ${isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'}`} />
                        <h1 className={`text-2xl font-extrabold text-center ${textPrimary}`}>Cek Status Pendaftaran</h1>
                    </div>
                    <h2 className={`text-center text-sm font-bold mb-6 ${isDarkMode ? 'text-teal-400' : 'text-[#8f3f20]'}`}>
                        {siteSettings?.school_name || 'SMK KH. A. WAHAB MUHSIN'}
                    </h2>

                    {/* FORM PENCARIAN */}
                    {!applicant && (
                        <form onSubmit={handleCekStatus} className="space-y-4">
                            {error && (
                                <div className={`flex items-center gap-2 text-sm font-semibold text-center p-3 rounded-xl ${isDarkMode ? 'bg-red-950/60 text-red-300 border border-red-700' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className={`block text-sm font-bold mb-1.5 ${labelCls}`}>NISN</label>
                                <input
                                    type="text"
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium focus:outline-none transition-all ${inputCls}`}
                                    placeholder="10 digit NISN"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-1.5 ${labelCls}`}>Tanggal Lahir</label>
                                <input
                                    type="date"
                                    value={tanggalLahir}
                                    onChange={(e) => setTanggalLahir(e.target.value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium focus:outline-none transition-all ${inputCls}`}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold transition-all disabled:opacity-50 hover:-translate-y-0.5 ${isDarkMode
                                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40'
                                    : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-lg shadow-[#b85c38]/25'
                                    }`}
                            >
                                <Search className="w-4 h-4" />
                                {isLoading ? 'Mencari...' : 'Cek Status'}
                            </button>
                        </form>
                    )}

                    {/* HASIL PENCARIAN PESERTA */}
                    {applicant && (
                        <div className="space-y-5">
                            {/* PROGRESS STEPPER 5 TAHAP */}
                            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'}`}>
                                <h3 className={`text-xs font-extrabold uppercase tracking-wider mb-3 text-center ${isDarkMode ? 'text-gray-400' : 'text-[#7a6053]'}`}>
                                    Alur &amp; Posisi Tahapan Seleksi
                                </h3>

                                <div className="flex items-center justify-between relative">
                                    {steps.map((st, sIdx) => {
                                        const isLast = sIdx === steps.length - 1;
                                        return (
                                            <div key={st.id} className="flex-1 flex flex-col items-center relative z-10">
                                                {/* Connecting Bar */}
                                                {!isLast && (
                                                    <div
                                                        className={`absolute top-3.5 left-1/2 w-full h-1 -z-10 ${
                                                            st.state === 'completed'
                                                                ? 'bg-emerald-500'
                                                                : isDarkMode ? 'bg-gray-800' : 'bg-gray-300'
                                                        }`}
                                                    />
                                                )}

                                                {/* Step Circle */}
                                                <div
                                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                                                        st.state === 'completed'
                                                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                                            : st.state === 'current'
                                                            ? 'bg-blue-600 text-white ring-4 ring-blue-500/25 animate-pulse'
                                                            : st.state === 'warning'
                                                            ? 'bg-amber-500 text-white ring-4 ring-amber-400/30'
                                                            : st.state === 'rejected'
                                                            ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                                                            : isDarkMode
                                                            ? 'bg-gray-800 text-gray-500 border border-gray-700'
                                                            : 'bg-white text-gray-400 border border-gray-300'
                                                    }`}
                                                >
                                                    {st.state === 'completed' ? (
                                                        <Check className="w-4 h-4 stroke-[3]" />
                                                    ) : st.state === 'warning' ? (
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                    ) : st.state === 'rejected' ? (
                                                        <XCircle className="w-4 h-4" />
                                                    ) : (
                                                        <span>{st.id}</span>
                                                    )}
                                                </div>

                                                {/* Step Name */}
                                                <span
                                                    className={`text-[10px] sm:text-[11px] font-extrabold mt-1.5 text-center leading-tight line-clamp-1 ${
                                                        st.state === 'completed'
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : st.state === 'current'
                                                            ? 'text-blue-700 dark:text-blue-300 font-black'
                                                            : st.state === 'warning'
                                                            ? 'text-amber-700 dark:text-amber-400'
                                                            : st.state === 'rejected'
                                                            ? 'text-rose-700 dark:text-rose-400'
                                                            : 'text-gray-400 dark:text-gray-600 font-medium'
                                                    }`}
                                                >
                                                    {st.name}
                                                </span>

                                                {/* Sub-label state */}
                                                <span
                                                    className={`text-[9px] font-semibold mt-0.5 text-center hidden sm:block ${
                                                        st.state === 'completed'
                                                            ? 'text-emerald-600 dark:text-emerald-500'
                                                            : st.state === 'current'
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : st.state === 'warning'
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : st.state === 'rejected'
                                                            ? 'text-rose-600 dark:text-rose-400'
                                                            : 'text-gray-400 dark:text-gray-600'
                                                    }`}
                                                >
                                                    {st.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info Card Peserta */}
                            <div className={`p-4 rounded-2xl border space-y-2.5 ${infoCard}`}>
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <p className={`text-xs font-semibold ${textSecondary}`}>Nama Lengkap:</p>
                                        <p className={`font-black text-lg ${textPrimary}`}>{applicant.full_name}</p>
                                        <p className="font-mono text-xs font-semibold opacity-75 mt-0.5">
                                            NISN: {applicant.nisn} &bull; SMP: {applicant.asal_sekolah || '-'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#b85c38]/12 text-[#8f3f20] dark:bg-teal-500/20 dark:text-teal-300">
                                            {applicant.registration_number}
                                        </span>
                                        {applicant.registration_path === 'Prestasi' ? (
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                                                <Award className="w-3 h-3" /> Prestasi
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 dark:bg-gray-800 dark:text-gray-300 border border-stone-300 dark:border-gray-700">
                                                Reguler
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                        <p className={`text-[11px] font-semibold ${textSecondary}`}>Pilihan Keahlian:</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                            1. {applicant.school_choice}
                                            {applicant.school_choice_2 ? ` • 2. ${applicant.school_choice_2}` : ''}
                                        </p>
                                    </div>

                                    <div>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                                            applicant.status === 'Diterima'
                                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                                : applicant.status === 'Ditolak'
                                                ? 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                                                : 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                                        }`}>
                                            Status: {applicant.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* STATUS SIAP TES DAN/ATAU WAWANCARA: JADWAL & TOMBOL CETAK KARTU UJIAN */}
                            {(applicant.status === 'Siap Tes dan/atau Wawancara' || applicant.status === 'Siap Tes') && (
                                <div className="space-y-3">
                                    {/* Tombol Cetak Kartu Peserta Ujian */}
                                    {(applicant.test_date || applicant.interview_date) && (
                                        <button
                                            type="button"
                                            onClick={handlePrintKartuUjian}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all hover:-translate-y-0.5 active:scale-98"
                                        >
                                            <Printer className="w-4 h-4" />
                                            <span>Cetak Kartu Peserta Ujian (PDF)</span>
                                        </button>
                                    )}

                                    {/* Kotak Jadwal Tes Online */}
                                    <div className={`p-4 rounded-2xl border transition-all ${!applicant.test_date || !applicant.test_time
                                        ? isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-amber-50 border-amber-300'
                                        : isTimeToTest
                                            ? isDarkMode ? 'bg-green-900/30 border-green-600/50 shadow-md' : 'bg-green-50 border-green-400 shadow-md animate-pulse'
                                            : isDarkMode ? 'bg-gray-800/50 border-amber-700/40' : 'bg-white border-amber-300'
                                        }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <CalendarCheck className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`} />
                                            <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Jadwal Tes Seleksi CBT:</p>
                                        </div>
                                        {!applicant.test_date || !applicant.test_time ? (
                                            <>
                                                <p className={`font-bold text-base mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Belum Dijadwalkan</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-bold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
                                                    Belum Dijadwalkan
                                                </button>
                                            </>
                                        ) : isTimeToTest ? (
                                            <>
                                                <p className={`font-bold text-lg ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>{formatDate(applicant.test_date)}</p>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>Pukul: {applicant.test_time.slice(0, 5)} WIB</p>
                                                {applicant.test_location && (
                                                    <p className="text-xs mb-3 font-semibold text-gray-600 dark:text-gray-300">Lokasi: {applicant.test_location}</p>
                                                )}
                                                <a href="/tes" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-center shadow-lg transition-all animate-pulse bg-green-600 hover:bg-green-700 text-white">
                                                    Masuk Ujian CBT &rarr;
                                                </a>
                                            </>
                                        ) : (
                                            <>
                                                <p className={`font-bold text-lg ${textPrimary}`}>{formatDate(applicant.test_date)}</p>
                                                <p className={`text-xs mb-1 ${textSecondary}`}>Pukul: {applicant.test_time.slice(0, 5)} WIB</p>
                                                {applicant.test_location && (
                                                    <p className={`text-xs mb-3 font-semibold ${textSecondary}`}>Lokasi/Ruang: {applicant.test_location}</p>
                                                )}
                                                <button disabled className={`w-full py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Tombol Aktif Sesuai Jadwal
                                                    </div>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Kotak Jadwal Wawancara */}
                                    <div className={`p-4 rounded-2xl border transition-all ${!applicant.interview_date || !applicant.interview_time
                                        ? isDarkMode ? 'bg-teal-900/20 border-teal-800/40' : 'bg-teal-50 border-teal-300'
                                        : isTimeToInterview
                                            ? isDarkMode ? 'bg-teal-800/30 border-teal-500/50 shadow-md' : 'bg-teal-100 border-teal-400 shadow-md animate-pulse'
                                            : isDarkMode ? 'bg-teal-900/20 border-teal-800/30' : 'bg-white border-teal-300'
                                        }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Video className={`w-3.5 h-3.5 ${isDarkMode ? 'text-teal-400' : 'text-teal-800'}`} />
                                            <p className={`text-xs font-bold ${isDarkMode ? 'text-teal-300' : 'text-teal-950'}`}>Jadwal Wawancara (Video Call):</p>
                                        </div>
                                        {!applicant.interview_date || !applicant.interview_time ? (
                                            <>
                                                <p className={`font-bold text-base mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Belum Dijadwalkan</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-bold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
                                                    Belum Dijadwalkan
                                                </button>
                                            </>
                                        ) : isTimeToInterview ? (
                                            <>
                                                <p className={`font-bold text-lg ${isDarkMode ? 'text-teal-200' : 'text-teal-950'}`}>{formatDate(applicant.interview_date)}</p>
                                                <p className={`text-xs mb-3 ${isDarkMode ? 'text-teal-400' : 'text-teal-800'}`}>Pukul: {applicant.interview_time.slice(0, 5)} WIB</p>
                                                <Link href={wawancaraHref} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-center shadow-lg transition-all animate-pulse bg-teal-600 hover:bg-teal-700 text-white">
                                                    <Video className="w-4 h-4" />
                                                    Masuk Ruang Wawancara &rarr;
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <p className={`font-bold text-lg ${isDarkMode ? 'text-teal-200' : 'text-teal-950'}`}>{formatDate(applicant.interview_date)}</p>
                                                <p className={`text-xs mb-3 ${isDarkMode ? 'text-teal-400' : 'text-teal-800'}`}>Pukul: {applicant.interview_time.slice(0, 5)} WIB</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Tombol Aktif Sesuai Jadwal
                                                    </div>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DITERIMA: SURAT KELULUSAN + TAHAP DAFTAR ULANG */}
                            {applicant.status === 'Diterima' && (
                                <div className="space-y-4">
                                    {/* Kartu Kelulusan */}
                                    <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-emerald-50 border-emerald-300'}`}>
                                        <div className="flex items-center justify-center gap-2 mb-1.5">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            <p className={`text-sm font-extrabold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-950'}`}>
                                                Selamat! Anda dinyatakan DITERIMA.
                                            </p>
                                        </div>
                                        <p className={`text-xs font-semibold mb-3 ${isDarkMode ? 'text-emerald-200/80' : 'text-emerald-900'}`}>
                                            Jurusan: <strong>{applicant.accepted_major || applicant.school_choice}</strong>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handlePrintKelulusan}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all hover:-translate-y-0.5"
                                        >
                                            <Printer className="w-4 h-4" />
                                            <span>Cetak Surat Kelulusan (PDF)</span>
                                        </button>
                                    </div>

                                    {/* Kartu Tahap Daftar Ulang & Pembayaran gosiswa.com */}
                                    <div className={`p-4 rounded-2xl border-2 space-y-3 ${isDarkMode
                                        ? 'bg-indigo-950/45 border-indigo-500/60'
                                        : 'bg-[#fdf6ee] border-[#b85c38]'
                                        }`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <ClipboardCheck className={`w-5 h-5 shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-[#b85c38]'}`} />
                                                <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                                                    Tahap Daftar Ulang Siswa Baru
                                                </h3>
                                            </div>
                                            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${applicant.rereg_status === 'Terverifikasi'
                                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                : applicant.rereg_status === 'Perbaikan Daftar Ulang'
                                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                                                    : applicant.rereg_status === 'Menunggu Verifikasi'
                                                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300'
                                                        : 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300'
                                                }`}>
                                                {applicant.rereg_status || 'Belum Daftar Ulang'}
                                            </span>
                                        </div>

                                        {(siteSettings?.rereg_start || siteSettings?.rereg_end) && (
                                            <p className={`text-xs font-semibold ${textSecondary}`}>
                                                Batas Daftar Ulang:{' '}
                                                <strong>
                                                    {formatShortDate(siteSettings.rereg_start)} s.d. {formatShortDate(siteSettings.rereg_end)}
                                                </strong>
                                            </p>
                                        )}

                                        {applicant.rereg_status === 'Perbaikan Daftar Ulang' && applicant.rereg_notes && (
                                            <p className="text-xs font-semibold p-2.5 rounded-xl bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                                Catatan Revisi: {applicant.rereg_notes}
                                            </p>
                                        )}

                                        <p className={`text-xs leading-relaxed ${textSecondary}`}>
                                            {applicant.rereg_status === 'Terverifikasi'
                                                ? 'Daftar ulang Anda telah terverifikasi. Silakan buka portal daftar ulang untuk mencetak Kartu Bukti Daftar Ulang ber-QR Code.'
                                                : applicant.rereg_status === 'Menunggu Verifikasi'
                                                    ? 'Formulir & kuitansi gosiswa.com Anda sudah terkirim dan sedang diverifikasi panitia.'
                                                    : 'Lakukan pembayaran via gosiswa.com (Skema Minimal/DP atau Lunas + Diskon), lalu lengkapi biodata Dapodik & unggah kuitansi digital.'}
                                        </p>

                                        <Link
                                            href={reregHref}
                                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-sm text-white shadow-lg transition-all hover:-translate-y-0.5 ${isDarkMode
                                                ? 'bg-indigo-600 hover:bg-indigo-500'
                                                : 'bg-[#b85c38] hover:bg-[#a04d2c]'
                                                }`}
                                        >
                                            <span>
                                                {applicant.rereg_status === 'Terverifikasi' || applicant.rereg_status === 'Menunggu Verifikasi'
                                                    ? 'Lihat Status & Kartu Daftar Ulang'
                                                    : applicant.rereg_status === 'Perbaikan Daftar Ulang'
                                                        ? 'Perbaiki Berkas Daftar Ulang'
                                                        : 'Lanjutkan ke Daftar Ulang'}
                                            </span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* PERBAIKAN */}
                            {applicant.status === 'Perbaikan' && (
                                <div className={`p-4 rounded-2xl border ${revisionCard}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <p className={`text-sm font-extrabold ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Catatan Panitia:</p>
                                    </div>
                                    <p className={`font-medium text-sm mb-4 p-2.5 rounded-xl ${isDarkMode ? 'bg-gray-800/70 text-amber-200' : 'bg-white text-amber-900 border border-amber-200'}`}>
                                        {applicant.document_notes || 'Harap periksa kembali data Anda.'}
                                    </p>

                                    <div className="space-y-3">
                                        {applicant.revision_fields?.includes('full_name') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan Nama Lengkap</label>
                                                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('email') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan Email</label>
                                                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('phone') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan No. HP/WA Siswa</label>
                                                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('asal_sekolah') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan Asal Sekolah</label>
                                                <input type="text" value={newAsalSekolah} onChange={(e) => setNewAsalSekolah(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('father_name') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan Nama Ayah</label>
                                                <input type="text" value={newFatherName} onChange={(e) => setNewFatherName(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('mother_name') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan Nama Ibu</label>
                                                <input type="text" value={newMotherName} onChange={(e) => setNewMotherName(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('parent_phone') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Perbaikan No HP Orang Tua</label>
                                                <input type="tel" value={newParentPhone} onChange={(e) => setNewParentPhone(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('kk') && (
                                            <div className={fileWrapperCls}>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Upload Ulang KK</label>
                                                <input type="file" accept="image/jpeg, image/png" onChange={(e) => setFileKK(e.target.files?.[0] || null)} className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold ${isDarkMode ? 'file:bg-gray-600 file:text-gray-200' : 'file:bg-[#d8b49b] file:text-[#3b1c0e]'}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('akta') && (
                                            <div className={fileWrapperCls}>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Upload Ulang Akta</label>
                                                <input type="file" accept="image/jpeg, image/png" onChange={(e) => setFileAkta(e.target.files?.[0] || null)} className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold ${isDarkMode ? 'file:bg-gray-600 file:text-gray-200' : 'file:bg-[#d8b49b] file:text-[#3b1c0e]'}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields?.includes('prestasi') && (
                                            <div className={fileWrapperCls}>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <FileText className="w-3 h-3 text-amber-600" />
                                                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Upload Ulang Dokumen Prestasi (PDF)</label>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        if (file && file.size > 2 * 1024 * 1024) {
                                                            alert('Ukuran file PDF maksimal 2 MB.');
                                                            e.target.value = '';
                                                            setFilePrestasi(null);
                                                        } else {
                                                            setFilePrestasi(file);
                                                        }
                                                    }}
                                                    className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold ${isDarkMode ? 'file:bg-amber-900/50 file:text-amber-300' : 'file:bg-[#d8b49b] file:text-[#3b1c0e]'}`}
                                                />
                                            </div>
                                        )}
                                        <button
                                            onClick={handleSimpanPerbaikan}
                                            disabled={uploadStatus.includes('Memproses')}
                                            className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-md disabled:opacity-60"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {uploadStatus || 'Kirim Perbaikan'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => { setApplicant(null); setNisn(''); setTanggalLahir(''); setUploadStatus(''); }}
                                className={`w-full flex items-center justify-center gap-1.5 py-2 text-sm font-bold transition-colors ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-[#8f3f20] hover:text-[#b85c38]'}`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Kembali ke Pencarian
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* ===== TAMPILAN CETAK 1: SURAT KELULUSAN SELEKSI ===== */}
            {applicant && applicant.status === 'Diterima' && printMode === 'kelulusan' && (
                <div className="hidden print:block bg-white text-black p-10 font-serif w-full max-w-4xl mx-auto">
                    <div className="flex items-center border-b-4 border-double border-black pb-4 mb-8">
                        <div className="w-24 h-24 flex items-center justify-center mr-6">
                            {siteSettings?.logo_url ? (
                                <img src={siteSettings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded-full border">Logo</div>
                            )}
                        </div>
                        <div className="text-center flex-1">
                            <h3 className="text-lg font-semibold uppercase tracking-wider">{siteSettings?.foundation_name || 'Yayasan Pendidikan KH. A. Wahab Muhsin'}</h3>
                            <h1 className="text-2xl font-bold uppercase tracking-widest">{siteSettings?.school_name || 'SMK KH. A. WAHAB MUHSIN'}</h1>
                            <p className="text-sm">{siteSettings?.school_address || 'Sukahideng, Sukarame, Tasikmalaya'}</p>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold underline mb-1">SURAT KETERANGAN LULUS SELEKSI</h2>
                        <p className="text-sm">Nomor: {applicant.registration_number}/PSB/{new Date().getFullYear()}</p>
                    </div>

                    <div className="text-base leading-relaxed space-y-4">
                        <p>Berdasarkan hasil seleksi Penerimaan Siswa Baru (PSB) {siteSettings?.school_name} Tahun Ajaran {(siteSettings as any)?.academic_year || '2027/2028'}, dengan ini Panitia menyatakan bahwa:</p>
                        <table className="w-full ml-8">
                            <tbody>
                                <tr><td className="w-40 py-1 font-semibold">Nama Lengkap</td><td className="w-4">:</td><td className="font-bold uppercase">{applicant.full_name}</td></tr>
                                <tr><td className="py-1 font-semibold">NISN</td><td>:</td><td>{applicant.nisn}</td></tr>
                                <tr><td className="py-1 font-semibold">No. Pendaftaran</td><td>:</td><td className="font-mono font-bold">{applicant.registration_number}</td></tr>
                                <tr><td className="py-1 font-semibold">Tanggal Lahir</td><td>:</td><td>{formatDate(applicant.tanggal_lahir)}</td></tr>
                                <tr><td className="py-1 font-semibold">Asal Sekolah</td><td>:</td><td>{applicant.asal_sekolah || '-'}</td></tr>
                                <tr><td className="py-1 font-semibold">Jurusan Diterima</td><td>:</td><td className="font-bold text-lg">{applicant.accepted_major || applicant.school_choice}</td></tr>
                            </tbody>
                        </table>
                        <p className="mt-6"><strong>DINYATAKAN LULUS</strong> sebagai calon peserta didik baru. Peserta diharapkan segera melakukan proses Daftar Ulang sesuai dengan jadwal yang telah ditentukan.</p>
                        <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                    </div>

                    <div className="mt-16 flex justify-between items-end">
                        <div className="text-center">
                            <div className="bg-white p-2 border border-gray-300 rounded inline-block">
                                <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verifikasi/${applicant.registration_number}`} size={100} />
                            </div>
                            <p className="text-xs mt-2 text-gray-500">Scan untuk verifikasi keaslian</p>
                        </div>
                        <div className="text-center">
                            <p className="mb-1">{siteSettings?.school_city || 'Tasikmalaya'}, {applicant.accepted_at ? new Date(applicant.accepted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="mb-20">Ketua Panitia PSB,</p>
                            <p className="font-bold underline">{siteSettings?.headmaster_name || 'Nama Ketua Panitia'}</p>
                            <p className="text-sm">{siteSettings?.headmaster_nip || 'NIP. 197801012005011002'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TAMPILAN CETAK 2: KARTU PESERTA UJIAN SELEKSI ===== */}
            {applicant && (applicant.status === 'Siap Tes dan/atau Wawancara' || applicant.status === 'Siap Tes') && printMode === 'kartu_ujian' && (
                <div className="hidden print:block bg-white text-black p-8 font-sans w-full max-w-4xl mx-auto border-2 border-black">
                    {/* KOP RESMI */}
                    <div className="flex items-center border-b-2 border-black pb-3 mb-6">
                        <div className="w-20 h-20 flex items-center justify-center mr-4">
                            {siteSettings?.logo_url ? (
                                <img src={siteSettings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded-full border border-black">Logo</div>
                            )}
                        </div>
                        <div className="text-center flex-1">
                            <h3 className="text-xs font-semibold uppercase tracking-wider">{siteSettings?.foundation_name || 'Yayasan Pendidikan KH. A. Wahab Muhsin'}</h3>
                            <h1 className="text-xl font-black uppercase tracking-wider">{siteSettings?.school_name || 'SMK KH. A. WAHAB MUHSIN'}</h1>
                            <p className="text-xs">{siteSettings?.school_address || 'Sukahideng, Sukarame, Kab. Tasikmalaya, Jawa Barat'}</p>
                        </div>
                    </div>

                    {/* JUDUL DOKUMEN */}
                    <div className="text-center mb-6">
                        <h2 className="text-base font-black uppercase tracking-widest border-b border-black inline-block pb-0.5">
                            KARTU TANDA PESERTA UJIAN SELEKSI PSB
                        </h2>
                        <p className="text-xs font-bold mt-1">
                            Tahun Ajaran {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                        </p>
                    </div>

                    {/* BIODATA PESERTA */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="col-span-2">
                            <table className="w-full text-xs">
                                <tbody>
                                    <tr>
                                        <td className="w-32 py-1 font-bold">No. Pendaftaran</td>
                                        <td className="w-3">:</td>
                                        <td className="font-mono font-black text-sm">{applicant.registration_number}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-bold">Nama Lengkap</td>
                                        <td>:</td>
                                        <td className="font-extrabold uppercase">{applicant.full_name}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-bold">NISN</td>
                                        <td>:</td>
                                        <td className="font-mono">{applicant.nisn}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-bold">Asal Sekolah</td>
                                        <td>:</td>
                                        <td>{applicant.asal_sekolah || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-bold">Jalur Pendaftaran</td>
                                        <td>:</td>
                                        <td className="font-bold">{applicant.registration_path || 'Reguler'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-bold">Pilihan Jurusan 1</td>
                                        <td>:</td>
                                        <td className="font-bold">{applicant.school_choice}</td>
                                    </tr>
                                    {applicant.school_choice_2 && (
                                        <tr>
                                            <td className="py-1 font-bold">Pilihan Jurusan 2</td>
                                            <td>:</td>
                                            <td>{applicant.school_choice_2}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Kotak Pas Foto Tempat Ujian */}
                        <div className="flex flex-col items-center justify-center p-2 border border-black bg-gray-50 text-center">
                            <div className="w-24 h-32 border border-dashed border-gray-400 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                                Pas Foto 3x4
                            </div>
                            <span className="text-[10px] mt-1 font-mono font-bold">{applicant.registration_number}</span>
                        </div>
                    </div>

                    {/* RINCIAN JADWAL UJIAN */}
                    <div className="mb-6">
                        <h3 className="text-xs font-black uppercase mb-1.5 bg-gray-200 p-1.5 border border-black">
                            Rincian Jadwal Pelaksanaan Ujian Seleksi:
                        </h3>
                        <table className="w-full text-xs border border-black border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b border-black text-left">
                                    <th className="p-2 border-r border-black w-36">Materi Seleksi</th>
                                    <th className="p-2 border-r border-black">Hari, Tanggal &amp; Waktu</th>
                                    <th className="p-2">Ruang / Media Pelaksanaan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="p-2 border-r border-black font-bold">
                                        1. Tes Seleksi CBT (TPA &amp; Diagnostik)
                                    </td>
                                    <td className="p-2 border-r border-black">
                                        {applicant.test_date ? formatDate(applicant.test_date) : 'Menunggu Jadwal'}
                                        {applicant.test_time ? ` • Pukul ${applicant.test_time.slice(0, 5)} WIB` : ''}
                                    </td>
                                    <td className="p-2">
                                        {applicant.test_location || 'Portal CBT Online / Lab Komputer Sekolah'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-black font-bold">
                                        2. Wawancara Minat &amp; Bakat
                                    </td>
                                    <td className="p-2 border-r border-black">
                                        {applicant.interview_date ? formatDate(applicant.interview_date) : 'Menunggu Jadwal'}
                                        {applicant.interview_time ? ` • Pukul ${applicant.interview_time.slice(0, 5)} WIB` : ''}
                                    </td>
                                    <td className="p-2">
                                        Ruang Wawancara Panitia / Video Call Jitsi Online
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* TATA TERTIB SINGKAT PESERTA */}
                    <div className="border border-black p-3 text-[11px] mb-6 space-y-1">
                        <p className="font-bold uppercase">Tata Tertib Peserta Seleksi:</p>
                        <p>1. Peserta wajib hadir atau bersiap di sistem 15 menit sebelum waktu ujian/wawancara dimulai.</p>
                        <p>2. Membawa Kartu Tanda Peserta Ujian ini saat pelaksanaan tes seleksi di sekolah atau menyiapkannya saat online.</p>
                        <p>3. Dilarang membuka tab/aplikasi lain selama pengerjaan tes CBT demi menjaga integritas penilaian.</p>
                    </div>

                    {/* QR CODE & TANDA TANGAN */}
                    <div className="flex justify-between items-end pt-2">
                        <div className="text-center">
                            <div className="p-2 border border-black inline-block bg-white">
                                <QRCode
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verifikasi/${applicant.registration_number}`}
                                    size={90}
                                />
                            </div>
                            <p className="text-[10px] mt-1 font-semibold">Scan QR untuk Verifikasi Peserta</p>
                        </div>

                        <div className="text-center text-xs">
                            <p className="mb-1">
                                {siteSettings?.school_city || 'Tasikmalaya'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="mb-14">Ketua Panitia PSB,</p>
                            <p className="font-bold underline">{siteSettings?.headmaster_name || 'Nama Ketua Panitia'}</p>
                            <p className="text-[11px]">{siteSettings?.headmaster_nip || 'NIP. 197801012005011002'}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
