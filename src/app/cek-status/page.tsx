'use client';

import { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import QRCode from 'react-qr-code';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    Search, ArrowLeft, Printer, CheckCircle2, Clock, Video,
    AlertTriangle, FileText, Upload, User, CalendarCheck
} from 'lucide-react';

type Applicant = {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    school_choice: string;
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
};

export default function CekStatusPage() {
    const { isDarkMode } = useTheme();
    const [nisn, setNisn] = useState('');
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [siteSettings, setSiteSettings] = useState<any>(null);
    const [applicant, setApplicant] = useState<Applicant | null>(null);

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
            .then(data => {
                if (data.settings) setSiteSettings(data.settings);
            });
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

            if (applicant.revision_fields.includes('kk') && fileKK) {
                setUploadStatus('Mengunggah KK baru...');
                const compressed = await imageCompression(fileKK, options);
                const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, studentName: applicant.full_name, docType: 'KK' }) });
                const { signedUrl, key } = await res.json();
                await fetch(signedUrl, { method: 'PUT', body: compressed });
                newKKKey = key;
            }

            if (applicant.revision_fields.includes('akta') && fileAkta) {
                setUploadStatus('Mengunggah Akta baru...');
                const compressed = await imageCompression(fileAkta, options);
                const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, studentName: applicant.full_name, docType: 'Akta' }) });
                const { signedUrl, key } = await res.json();
                await fetch(signedUrl, { method: 'PUT', body: compressed });
                newAktaKey = key;
            }

            if (applicant.revision_fields.includes('prestasi') && filePrestasi) {
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
                    newName: applicant.revision_fields.includes('full_name') ? newName : null,
                    newEmail: applicant.revision_fields.includes('email') ? newEmail : null,
                    newPhone: applicant.revision_fields.includes('phone') ? newPhone : null,
                    newAsalSekolah: applicant.revision_fields.includes('asal_sekolah') ? newAsalSekolah : null,
                    newFatherName: applicant.revision_fields.includes('father_name') ? newFatherName : null,
                    newMotherName: applicant.revision_fields.includes('mother_name') ? newMotherName : null,
                    newParentPhone: applicant.revision_fields.includes('parent_phone') ? newParentPhone : null,
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

    // ===== SHARED STYLES =====
    const bg = isDarkMode
        ? 'bg-linear-to-br from-gray-900 via-slate-800 to-slate-900'
        : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40]';
    //: 'bg-linear-to-br from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae]';

    const card = isDarkMode
        ? 'bg-gray-800/60 border-gray-700/60 backdrop-blur-xl shadow-2xl shadow-black/40'
        : 'bg-white/40 border-white/60 backdrop-blur-xl shadow-2xl shadow-[#9e8369]/15';

    const inputCls = isDarkMode
        ? 'bg-gray-700/50 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
        : 'bg-white/60 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20';

    const labelCls = isDarkMode ? 'text-gray-300' : 'text-[#4a342a]';
    const textPrimary = isDarkMode ? 'text-white' : 'text-[#2b1d18]';
    const textSecondary = isDarkMode ? 'text-gray-400' : 'text-[#6e5346]';

    const infoCard = isDarkMode
        ? 'bg-gray-700/50 border-gray-600/50'
        : 'bg-white/50 border-white/70';

    const revisionCard = isDarkMode
        ? 'bg-amber-900/20 border-amber-700/40'
        : 'bg-amber-50/60 border-amber-200';

    const revisionInputCls = isDarkMode
        ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-amber-500 focus:outline-none'
        : 'bg-white/80 border-amber-300 text-[#2b1d18] focus:border-amber-500 focus:outline-none';

    return (
        <>
            {/* ===== TAMPILAN WEB ===== */}
            <main className={`min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden print:hidden transition-colors duration-500 ${bg}`}>
                {/* Orb */}
                <div className={`absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-25 ${isDarkMode ? 'bg-indigo-700' : 'bg-[#c9a68e]'}`}></div>

                {/* Theme Toggle */}
                <div className="absolute top-4 right-4 z-50">
                    <ThemeToggle />
                </div>

                <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border z-10 ${card}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <User className={`w-5 h-5 ${isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'}`} />
                        <h1 className={`text-2xl font-bold text-center ${textPrimary}`}>Cek Status Pendaftaran</h1>
                    </div>
                    <h2 className={`text-center text-sm font-semibold mb-6 ${isDarkMode ? 'text-teal-400' : 'text-[#8f472a]'}`}>
                        {siteSettings?.school_name || 'SMK KH. A. WAHAB MUHSIN'}
                    </h2>

                    {/* FORM PENCARIAN */}
                    {!applicant && (
                        <form onSubmit={handleCekStatus} className="space-y-4">
                            {error && (
                                <div className={`flex items-center gap-2 text-sm font-semibold text-center p-3 rounded-xl ${isDarkMode ? 'bg-red-900/40 text-red-300 border border-red-700/50' : 'bg-red-100/60 text-red-700 border border-red-200'}`}>
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>NISN</label>
                                <input
                                    type="text"
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${inputCls}`}
                                    placeholder="10 digit NISN"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Tanggal Lahir</label>
                                <input
                                    type="date"
                                    value={tanggalLahir}
                                    onChange={(e) => setTanggalLahir(e.target.value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${inputCls}`}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-50 hover:-translate-y-0.5 ${isDarkMode
                                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40'
                                    : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-lg shadow-[#b85c38]/25'
                                    }`}
                            >
                                <Search className="w-4 h-4" />
                                {isLoading ? 'Mencari...' : 'Cek Status'}
                            </button>
                        </form>
                    )}

                    {/* HASIL */}
                    {applicant && (
                        <div className="space-y-4">
                            {/* Info Card */}
                            <div className={`p-4 rounded-xl border space-y-2 ${infoCard}`}>
                                <p className={`text-sm ${textSecondary}`}>Nama Lengkap:</p>
                                <p className={`font-bold text-lg ${textPrimary}`}>{applicant.full_name}</p>
                                <p className={`text-sm mt-2 ${textSecondary}`}>Status Saat Ini:</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${applicant.status === 'Diterima'
                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                    : applicant.status === 'Ditolak'
                                        ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                    }`}>
                                    {applicant.status}
                                </span>
                            </div>

                            {/* STATUS SIAP TES DAN/ATAU WAWANCARA */}
                            {(applicant.status === 'Siap Tes dan/atau Wawancara' || applicant.status === 'Siap Tes') && (
                                <div className="space-y-3">
                                    {/* Kotak Jadwal Tes Online */}
                                    <div className={`p-4 rounded-2xl border transition-all ${!applicant.test_date || !applicant.test_time
                                        ? isDarkMode ? 'bg-gray-700/40 border-gray-600/50' : 'bg-amber-50/60 border-amber-200'
                                        : isTimeToTest
                                            ? isDarkMode ? 'bg-green-900/30 border-green-600/50 shadow-md' : 'bg-green-50 border-green-300 shadow-md animate-pulse'
                                            : isDarkMode ? 'bg-gray-700/40 border-amber-700/30' : 'bg-white/60 border-amber-200/70'
                                        }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <CalendarCheck className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Jadwal Tes Online:</p>
                                        </div>
                                        {!applicant.test_date || !applicant.test_time ? (
                                            <>
                                                <p className={`font-bold text-base mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Belum Dijadwalkan</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-bold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-600/50 text-gray-500' : 'bg-gray-200 text-gray-400'}`}>
                                                    Belum Dijadwalkan
                                                </button>
                                            </>
                                        ) : isTimeToTest ? (
                                            <>
                                                <p className={`font-bold text-lg ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>{formatDate(applicant.test_date)}</p>
                                                <p className={`text-xs mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>Pukul: {applicant.test_time.slice(0, 5)} WIB</p>
                                                <a href="/tes" className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-center shadow-lg transition-all animate-pulse ${isDarkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                                                    Masuk Ujian &rarr;
                                                </a>
                                            </>
                                        ) : (
                                            <>
                                                <p className={`font-bold text-lg ${textPrimary}`}>{formatDate(applicant.test_date)}</p>
                                                <p className={`text-xs mb-3 ${textSecondary}`}>Pukul: {applicant.test_time.slice(0, 5)} WIB</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-600/50 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
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
                                        ? isDarkMode ? 'bg-teal-900/20 border-teal-800/40' : 'bg-teal-50/50 border-teal-200'
                                        : isTimeToInterview
                                            ? isDarkMode ? 'bg-teal-800/30 border-teal-500/50 shadow-md' : 'bg-teal-100 border-teal-400 shadow-md animate-pulse'
                                            : isDarkMode ? 'bg-teal-900/20 border-teal-800/30' : 'bg-white/60 border-teal-200/70'
                                        }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Video className={`w-3.5 h-3.5 ${isDarkMode ? 'text-teal-400' : 'text-teal-700'}`} />
                                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-teal-300' : 'text-teal-900'}`}>Jadwal Wawancara (Video Call):</p>
                                        </div>
                                        {!applicant.interview_date || !applicant.interview_time ? (
                                            <>
                                                <p className={`font-bold text-base mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Belum Dijadwalkan</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-bold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-600/50 text-gray-500' : 'bg-gray-200 text-gray-400'}`}>
                                                    Belum Dijadwalkan
                                                </button>
                                            </>
                                        ) : isTimeToInterview ? (
                                            <>
                                                <p className={`font-bold text-lg ${isDarkMode ? 'text-teal-200' : 'text-teal-950'}`}>{formatDate(applicant.interview_date)}</p>
                                                <p className={`text-xs mb-3 ${isDarkMode ? 'text-teal-400' : 'text-teal-800'}`}>Pukul: {applicant.interview_time.slice(0, 5)} WIB</p>
                                                <a href="/wawancara" className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-center shadow-lg transition-all animate-pulse ${isDarkMode ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
                                                    <Video className="w-4 h-4" />
                                                    Masuk Ruang Wawancara &rarr;
                                                </a>
                                            </>
                                        ) : (
                                            <>
                                                <p className={`font-bold text-lg ${isDarkMode ? 'text-teal-200' : 'text-teal-950'}`}>{formatDate(applicant.interview_date)}</p>
                                                <p className={`text-xs mb-3 ${isDarkMode ? 'text-teal-400' : 'text-teal-800'}`}>Pukul: {applicant.interview_time.slice(0, 5)} WIB</p>
                                                <button disabled className={`w-full py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed ${isDarkMode ? 'bg-gray-600/50 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
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

                            {/* DITERIMA */}
                            {applicant.status === 'Diterima' && (
                                <div className={`mt-4 p-4 rounded-xl border text-center ${isDarkMode ? 'bg-green-900/20 border-green-700/40' : 'bg-green-50/50 border-green-200'}`}>
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>Selamat! Anda dinyatakan DITERIMA.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            document.title = `Surat Kelulusan - ${applicant.full_name}`;
                                            window.print();
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transition-all"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Cetak Surat Kelulusan
                                    </button>
                                </div>
                            )}

                            {/* PERBAIKAN */}
                            {applicant.status === 'Perbaikan' && (
                                <div className={`p-4 rounded-xl border ${revisionCard}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>Catatan Panitia:</p>
                                    </div>
                                    <p className={`font-normal text-sm mb-4 p-2 rounded-lg ${isDarkMode ? 'bg-gray-800/50 text-amber-200' : 'bg-white/60 text-amber-700'}`}>
                                        {applicant.document_notes || 'Harap periksa kembali data Anda.'}
                                    </p>

                                    <div className="space-y-3">
                                        {applicant.revision_fields.includes('full_name') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan Nama Lengkap</label>
                                                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('email') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan Email</label>
                                                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('phone') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan No. HP/WA Siswa</label>
                                                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('asal_sekolah') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan Asal Sekolah</label>
                                                <input type="text" value={newAsalSekolah} onChange={(e) => setNewAsalSekolah(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('father_name') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan Nama Ayah</label>
                                                <input type="text" value={newFatherName} onChange={(e) => setNewFatherName(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('mother_name') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan Nama Ibu</label>
                                                <input type="text" value={newMotherName} onChange={(e) => setNewMotherName(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('parent_phone') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Perbaikan No HP Orang Tua</label>
                                                <input type="tel" value={newParentPhone} onChange={(e) => setNewParentPhone(e.target.value)} className={`w-full p-2.5 rounded-lg border text-sm ${revisionInputCls}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('kk') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Upload Ulang KK</label>
                                                <input type="file" accept="image/jpeg, image/png" onChange={(e) => setFileKK(e.target.files?.[0] || null)} className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold ${isDarkMode ? 'text-gray-400 file:bg-gray-600 file:text-gray-200' : 'text-[#7a6358] file:bg-[#d8b49b] file:text-[#5c2c16]'}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('akta') && (
                                            <div>
                                                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Upload Ulang Akta</label>
                                                <input type="file" accept="image/jpeg, image/png" onChange={(e) => setFileAkta(e.target.files?.[0] || null)} className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold ${isDarkMode ? 'text-gray-400 file:bg-gray-600 file:text-gray-200' : 'text-[#7a6358] file:bg-[#d8b49b] file:text-[#5c2c16]'}`} />
                                            </div>
                                        )}
                                        {applicant.revision_fields.includes('prestasi') && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <FileText className="w-3 h-3 text-amber-500" />
                                                    <label className={`block text-xs font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Upload Ulang Dokumen Prestasi (PDF)</label>
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
                                                    className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold ${isDarkMode ? 'text-gray-400 file:bg-amber-900/50 file:text-amber-300' : 'text-[#7a6358] file:bg-[#d8b49b] file:text-[#5c2c16]'}`}
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
                                className={`w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-[#8f472a] hover:text-[#b85c38]'}`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Kembali ke Pencarian
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* ===== TAMPILAN CETAK (SURAT KELULUSAN) ===== */}
            {applicant && applicant.status === 'Diterima' && (
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
                            <h3 className="text-lg font-semibold uppercase tracking-wider">{siteSettings?.foundation_name || 'Yayasan Pendidikan'}</h3>
                            <h1 className="text-2xl font-bold uppercase tracking-widest">{siteSettings?.school_name || 'NAMA SEKOLAH'}</h1>
                            <p className="text-sm">{siteSettings?.school_address}</p>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold underline mb-1">SURAT KETERANGAN LULUS SELEKSI</h2>
                        <p className="text-sm">Nomor: {applicant.registration_number}/PSB/{new Date().getFullYear()}</p>
                    </div>

                    <div className="text-base leading-relaxed space-y-4">
                        <p>Berdasarkan hasil seleksi Penerimaan Siswa Baru (PSB) {siteSettings?.school_name} Tahun Ajaran {new Date().getFullYear()}/{new Date().getFullYear() + 1}, dengan ini Panitia menyatakan bahwa:</p>
                        <table className="w-full ml-8">
                            <tbody>
                                <tr><td className="w-40 py-1">Nama Lengkap</td><td className="w-4">:</td><td className="font-bold">{applicant.full_name}</td></tr>
                                <tr><td className="py-1">NISN</td><td>:</td><td>{applicant.nisn}</td></tr>
                                <tr><td className="py-1">No. Pendaftaran</td><td>:</td><td>{applicant.registration_number}</td></tr>
                                <tr><td className="py-1">Tanggal Lahir</td><td>:</td><td>{formatDate(applicant.tanggal_lahir)}</td></tr>
                                <tr><td className="py-1">Jurusan Diterima</td><td>:</td><td className="font-bold">{applicant.accepted_major || applicant.school_choice}</td></tr>
                            </tbody>
                        </table>
                        <p className="mt-6"><strong>DINYATAKAN LULUS</strong> sebagai calon peserta didik baru. Peserta diharapkan segera melakukan proses Daftar Ulang sesuai dengan jadwal yang telah ditentukan.</p>
                        <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                    </div>

                    <div className="mt-16 flex justify-between items-end">
                        <div className="text-center">
                            <div className="bg-white p-2 border border-gray-300 rounded">
                                <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verifikasi/${applicant.registration_number}`} size={100} />
                            </div>
                            <p className="text-xs mt-2 text-gray-500">Scan untuk verifikasi</p>
                        </div>
                        <div className="text-center">
                            <p className="mb-1">{siteSettings?.school_city || 'Kota Anda'}, {applicant.accepted_at ? new Date(applicant.accepted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID')}</p>
                            <p className="mb-20">Ketua Panitia PSB,</p>
                            <p className="font-bold underline">{siteSettings?.headmaster_name || 'Nama Ketua Panitia'}</p>
                            <p className="text-sm">{siteSettings?.headmaster_nip}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
