//src/app/admin/pengaturan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { extractYoutubeVideoId, normalizeAllowedPaths } from '@/lib/rereg-schema';
import imageCompression from 'browser-image-compression';
import {
    Settings,
    Calendar,
    ArrowLeft,
    Save,
    CreditCard,
    GraduationCap,
    CheckCircle2,
    AlertCircle,
    Building2,
    ClipboardList,
    Lock,
    Unlock,
    Award
} from 'lucide-react';

const AVAILABLE_TESTS = [
    { id: 'TPA', label: 'Tes Potensi Akademik (TPA)' },
    { id: 'DIAGNOSTIK', label: 'Asesmen Diagnostik Non-Kognitif' },
    { id: 'SOSIAL_EMOSIONAL', label: 'Skala Sosial Emosional' },
    { id: 'CHARACTER', label: 'Character Skills Snapshot' },
    { id: 'BIG_FIVE', label: 'Big Five Inventory' },
    { id: 'WAWANCARA', label: 'Wawancara Terstruktur (Rubrik)' },
];

const DEFAULT_QUOTAS: Record<string, number> = {
    'Farmasi Klinis dan Komunitas': 72,
    'Produksi dan Siaran Program Televisi': 36,
    'Manajemen Perkantoran': 72,
};

export default function PengaturanPage() {
    const { isDarkMode } = useTheme();

    const [formData, setFormData] = useState({
        is_open_manual: true,
        use_auto_schedule: false,
        wave_name: 'Gelombang 1',
        allowed_registration_paths: 'ALL' as 'ALL' | 'Prestasi' | 'Reguler',
        contact_wa: '',
        reg_start: '',
        reg_end: '',
        verif_start: '',
        verif_end: '',
        test_start: '',
        test_end: '',
        announce_start: '',
        announce_end: '',
        rereg_start: '',
        rereg_end: '',
        rereg_instructions: '',
        payment_portal_url: 'https://gosiswa.com',
        payment_tutorial_youtube_url: '',
        school_name: '',
        foundation_name: '',
        school_address: '',
        school_city: '',
        headmaster_name: '',
        headmaster_nip: '',
        logo_url: '',
        virtual_background_url: '',
    });

    const [majorQuotas, setMajorQuotas] = useState<Record<string, number>>(DEFAULT_QUOTAS);
    const [activeTests, setActiveTests] = useState<string[]>([]);
    const [testDurations, setTestDurations] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.settings) {
                    const s = data.settings;
                    const fmt = (d: string) => (d ? new Date(d).toISOString().split('T')[0] : '');
                    setFormData({
                        is_open_manual: s.is_open_manual ?? true,
                        use_auto_schedule: s.use_auto_schedule ?? false,
                        wave_name: s.wave_name || '',
                        allowed_registration_paths: normalizeAllowedPaths(s.allowed_registration_paths),
                        contact_wa: s.contact_wa || '',
                        reg_start: fmt(s.reg_start),
                        reg_end: fmt(s.reg_end),
                        verif_start: fmt(s.verif_start),
                        verif_end: fmt(s.verif_end),
                        test_start: fmt(s.test_start),
                        test_end: fmt(s.test_end),
                        announce_start: fmt(s.announce_start),
                        announce_end: fmt(s.announce_end),
                        rereg_start: fmt(s.rereg_start),
                        rereg_end: fmt(s.rereg_end),
                        rereg_instructions: s.rereg_instructions || '',
                        payment_portal_url: s.payment_portal_url || 'https://gosiswa.com',
                        payment_tutorial_youtube_url: s.payment_tutorial_youtube_url || '',
                        school_name: s.school_name || '',
                        foundation_name: s.foundation_name || '',
                        school_address: s.school_address || '',
                        school_city: s.school_city || '',
                        headmaster_name: s.headmaster_name || '',
                        headmaster_nip: s.headmaster_nip || '',
                        logo_url: s.logo_url || '',
                        virtual_background_url: s.virtual_background_url || '',
                    });

                    if (s.major_quotas) {
                        const parsedQuotas = typeof s.major_quotas === 'string'
                            ? JSON.parse(s.major_quotas)
                            : s.major_quotas;
                        setMajorQuotas({ ...DEFAULT_QUOTAS, ...parsedQuotas });
                    }
                    if (s.active_tests) {
                        setActiveTests(typeof s.active_tests === 'string' ? JSON.parse(s.active_tests) : s.active_tests);
                    }
                    if (s.test_durations) {
                        setTestDurations(typeof s.test_durations === 'string' ? JSON.parse(s.test_durations) : s.test_durations);
                    }
                }
                setIsLoading(false);
            })
            .catch(() => {
                toast.error('Gagal memuat pengaturan sistem');
                setIsLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        for (const test of activeTests) {
            if (test !== 'WAWANCARA' && (!testDurations[test] || testDurations[test] <= 0)) {
                toast.error(`Durasi untuk ${test} wajib diisi lebih dari 0 menit!`);
                return;
            }
        }
        const loadingToast = toast.loading('Menyimpan pengaturan...');
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    major_quotas: majorQuotas,
                    active_tests: activeTests,
                    test_durations: testDurations,
                }),
            });
            if (res.status === 401) {
                toast.error('Sesi berakhir, silakan login ulang.', { id: loadingToast });
                window.location.href = '/login';
                return;
            }
            if (res.ok) toast.success('Pengaturan berhasil disimpan!', { id: loadingToast });
            else toast.error('Gagal menyimpan pengaturan.', { id: loadingToast });
        } catch {
            toast.error('Terjadi kesalahan jaringan.', { id: loadingToast });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleQuotaChange = (major: string, val: string) => {
        const num = Math.max(0, parseInt(val, 10) || 0);
        setMajorQuotas(prev => ({ ...prev, [major]: num }));
    };

    const toggleTest = (testId: string) =>
        setActiveTests(prev => (prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]));

    const handleDurationChange = (testId: string, minutes: string) =>
        setTestDurations(prev => ({ ...prev, [testId]: parseInt(minutes) || 0 }));

    const parsedYoutubeId = extractYoutubeVideoId(formData.payment_tutorial_youtube_url);
    const totalQuota = Object.values(majorQuotas).reduce((acc, q) => acc + (Number(q) || 0), 0);

    const cardBox = isDarkMode
        ? 'bg-gray-900/75 border-gray-800'
        : 'bg-white/90 border-[#d6c5b3]';

    const subBox = isDarkMode
        ? 'bg-gray-950/60 border-gray-800'
        : 'bg-[#faf4ec] border-[#d6c5b3]';

    const inputCls = isDarkMode
        ? 'bg-gray-950/80 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-teal-500 outline-none'
        : 'bg-white border-[#cbb7a2] text-[#1f1410] placeholder:text-[#7a6358] focus:border-[#b85c38] outline-none';

    const labelCls = isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]';

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center font-extrabold text-lg ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#b89779] text-[#1f1410]'}`}>
                Memuat Pengaturan Sistem...
            </div>
        );
    }

    return (
        <main className={`min-h-screen p-4 sm:p-8 font-sans bg-linear-to-br transition-colors duration-300 ${isDarkMode
            ? 'from-gray-950 via-slate-900 to-black text-gray-100'
            : 'from-[#d5beaa] via-[#b89779] to-[#987657] text-[#1f1410]'
            }`}>
            <Toaster position="top-center" />

            <div className={`max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl shadow-2xl border backdrop-blur-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-900/80 border-gray-800'
                : 'bg-[#fffdf9]/95 border-white shadow-[#5c4033]/20'
                }`}>
                {/* Header */}
                <div className={`flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-[#d6c5b3]'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${isDarkMode ? 'bg-teal-500/20 text-teal-300' : 'bg-[#b85c38]/15 text-[#9e4522]'}`}>
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                                Pengaturan Sistem PSB
                            </h1>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                                Identitas Sekolah, Penguncian Jalur Gelombang, Jadwal Seleksi &amp; Kuota Jurusan
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link
                            href="/admin"
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${isDarkMode
                                ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Kembali</span>
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-7">
                    {/* 1. IDENTITAS SEKOLAH & KOP SURAT */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${cardBox}`}>
                        <h2 className={`font-extrabold text-base border-b pb-2.5 flex items-center gap-2 ${isDarkMode ? 'text-white border-gray-800' : 'text-[#1f1410] border-[#d6c5b3]'}`}>
                            <Building2 className="w-4 h-4 text-[#b85c38] dark:text-teal-400" />
                            <span>Identitas Sekolah &amp; Kop Surat</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Nama Yayasan</label>
                                <input type="text" name="foundation_name" value={formData.foundation_name} onChange={handleChange} className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Nama Sekolah</label>
                                <input type="text" name="school_name" value={formData.school_name} onChange={handleChange} className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Alamat Lengkap</label>
                                <textarea name="school_address" value={formData.school_address} onChange={handleChange} rows={2} className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Kota (Untuk Tanda Tangan)</label>
                                <input type="text" name="school_city" value={formData.school_city} onChange={handleChange} className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>URL Logo Sekolah</label>
                                <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
</div>
                            <div className="sm:col-span-2 pt-2 border-t border-dashed border-gray-700/50">
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>
                                    Virtual Background Wawancara (Jitsi 8x8 JaaS)
                                </label>
                                <p className="text-xs text-gray-400 mb-2">
                                    Unggah gambar resmi sekolah atau tempel tautan gambar eksternal (16:9 disarankan, maks 1920px) yang otomatis aktif di ruang wawancara panitia &amp; calon siswa.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                                    <div className="space-y-2">
                                        <div>
                                            <span className="block text-[11px] font-semibold text-gray-400 mb-1">Upload File Gambar</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/png, image/webp"
                                                className={`w-full p-2 rounded-xl border text-xs font-medium file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer ${inputCls}`}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const loadToast = toast.loading('Mengompres & mengunggah background...');
                                                    try {
                                                        const compressed = await imageCompression(file, {
                                                            maxSizeMB: 0.6,
                                                            maxWidthOrHeight: 1920,
                                                            useWebWorker: true,
                                                        });
                                                        const uploadRes = await fetch('/api/upload', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                fileName: compressed.name,
                                                                fileType: compressed.type,
                                                                studentName: 'Sekolah',
                                                                docType: 'VirtualBackground',
                                                            }),
                                                        });
                                                        const { signedUrl, key } = await uploadRes.json();
                                                        await fetch(signedUrl, {
                                                            method: 'PUT',
                                                            body: compressed,
                                                        });
                                                        setFormData((prev) => ({ ...prev, virtual_background_url: key }));
                                                        toast.success('Virtual background berhasil diunggah!', { id: loadToast });
                                                    } catch (err) {
                                                        console.error(err);
                                                        toast.error('Gagal mengunggah virtual background', { id: loadToast });
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-semibold text-gray-400 mb-1">Atau Tempel URL Eksternal (https://...)</span>
                                            <input
                                                type="text"
                                                name="virtual_background_url"
                                                value={formData.virtual_background_url}
                                                onChange={handleChange}
                                                placeholder="https://domain.com/background.jpg atau documents/VirtualBackground-..."
                                                className={`w-full p-2.5 rounded-xl border text-xs font-medium ${inputCls}`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <span className="block text-[11px] font-semibold text-gray-400 mb-1">Pratinjau Background (16:9)</span>
                                        {formData.virtual_background_url ? (
                                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-700 bg-gray-950 flex items-center justify-center group shadow-md">
                                                <img
                                                    src={`/api/virtual-background?src=${encodeURIComponent(formData.virtual_background_url)}`}
                                                    alt="Virtual Background Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData((prev) => ({ ...prev, virtual_background_url: '' }))}
                                                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow transition-all"
                                                    >
                                                        Hapus Background
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="aspect-video w-full rounded-xl border border-dashed border-gray-700/80 bg-gray-900/40 flex flex-col items-center justify-center p-3 text-center text-gray-500 text-xs">
                                                <span>Belum ada virtual background</span>
                                                <span className="text-[10px] mt-0.5 text-gray-600">Standar blur / kamera polos akan digunakan</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Nama Ketua Panitia</label>
                                <input type="text" name="headmaster_name" value={formData.headmaster_name} onChange={handleChange} className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>NIP Ketua Panitia</label>
                                <input type="text" name="headmaster_nip" value={formData.headmaster_nip} onChange={handleChange} className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                        </div>
                    </div>

                    {/* 2. STATUS, PENGUNCIAN JALUR & JADWAL TIMELINE (5 TAHAP) */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${cardBox}`}>
                        <h2 className={`font-extrabold text-base border-b pb-2.5 flex items-center gap-2 ${isDarkMode ? 'text-white border-gray-800' : 'text-[#1f1410] border-[#d6c5b3]'}`}>
                            <Calendar className="w-4 h-4 text-[#b85c38] dark:text-teal-400" />
                            <span>Status, Penguncian Jalur &amp; Jadwal Timeline PSB</span>
                        </h2>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="use_auto_schedule" checked={formData.use_auto_schedule} onChange={handleChange} className="w-5 h-5 accent-[#b85c38] rounded" />
                            <div>
                                <p className={`font-bold text-sm ${labelCls}`}>Gunakan Jadwal Otomatis</p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>Status buka/tutup pendaftaran mengikuti tanggal Pendaftaran Online.</p>
                            </div>
                        </label>

                        {!formData.use_auto_schedule && (
                            <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border ${isDarkMode ? 'bg-amber-950/35 border-amber-700/50' : 'bg-amber-50 border-amber-300'}`}>
                                <input type="checkbox" name="is_open_manual" checked={formData.is_open_manual} onChange={handleChange} className="w-5 h-5 accent-[#b85c38] rounded" />
                                <div>
                                    <p className={`font-extrabold text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-950'}`}>Buka Pendaftaran (Kontrol Manual)</p>
                                </div>
                            </label>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Nama Gelombang Aktif</label>
                                <input type="text" name="wave_name" value={formData.wave_name} onChange={handleChange} placeholder="Contoh: Gelombang 1 / Gelombang Prestasi" className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>Nomor WhatsApp Panitia (628xxx)</label>
                                <input type="text" name="contact_wa" value={formData.contact_wa} onChange={handleChange} placeholder="6281234567890" className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`} />
                            </div>
                        </div>

                        {/* KONTROL PENGUNCIAN JALUR PENDAFTARAN PADA GELOMBANG INI */}
                        <div className={`p-4 rounded-2xl border-2 space-y-3 ${isDarkMode ? 'bg-amber-950/20 border-amber-700/60' : 'bg-[#fdf6ee] border-[#b85c38]/70'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className={`text-xs sm:text-sm font-extrabold flex items-center gap-1.5 ${isDarkMode ? 'text-amber-300' : 'text-[#8f3f20]'}`}>
                                        <Lock className="w-4 h-4" />
                                        <span>Pengaturan Jalur Pendaftaran ({formData.wave_name || 'Gelombang Aktif'})</span>
                                    </p>
                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-[#5c4337]'}`}>
                                        Pilih apakah gelombang ini membuka kedua jalur atau mengunci salah satu jalur sehingga pendaftar wajib menggunakan jalur yang ditentukan.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Opsi 1: Buka Kedua Jalur */}
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, allowed_registration_paths: 'ALL' }))}
                                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${formData.allowed_registration_paths === 'ALL'
                                        ? isDarkMode
                                            ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                                            : 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                                        : isDarkMode
                                            ? 'bg-gray-900/70 border-gray-700 text-gray-300 hover:border-gray-600'
                                            : 'bg-white border-[#d6c5b3] text-[#2b1d18] hover:border-[#b85c38]/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                                            <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span>Semua Jalur</span>
                                        </span>
                                        {formData.allowed_registration_paths === 'ALL' && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[11px] opacity-80 leading-snug">
                                        Membuka <strong>Jalur Reguler &amp; Prestasi</strong> secara bersamaan. Pendaftar bebas memilih.
                                    </p>
                                </button>

                                {/* Opsi 2: Kunci Jalur Prestasi */}
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, allowed_registration_paths: 'Prestasi' }))}
                                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${formData.allowed_registration_paths === 'Prestasi'
                                        ? isDarkMode
                                            ? 'bg-amber-950/70 border-amber-500 text-white shadow-md'
                                            : 'bg-amber-100/80 border-amber-600 text-amber-950 shadow-sm'
                                        : isDarkMode
                                            ? 'bg-gray-900/70 border-gray-700 text-gray-300 hover:border-gray-600'
                                            : 'bg-white border-[#d6c5b3] text-[#2b1d18] hover:border-[#b85c38]/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                                            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            <span>Kunci: Prestasi</span>
                                        </span>
                                        {formData.allowed_registration_paths === 'Prestasi' && (
                                            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[11px] opacity-80 leading-snug">
                                        <strong>Reguler dikunci.</strong> Pendaftar dipaksa memilih <strong>Jalur Prestasi</strong> &amp; wajib unggah PDF prestasi.
                                    </p>
                                </button>

                                {/* Opsi 3: Kunci Jalur Reguler */}
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, allowed_registration_paths: 'Reguler' }))}
                                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${formData.allowed_registration_paths === 'Reguler'
                                        ? isDarkMode
                                            ? 'bg-blue-950/70 border-blue-500 text-white shadow-md'
                                            : 'bg-blue-50 border-blue-600 text-blue-950 shadow-sm'
                                        : isDarkMode
                                            ? 'bg-gray-900/70 border-gray-700 text-gray-300 hover:border-gray-600'
                                            : 'bg-white border-[#d6c5b3] text-[#2b1d18] hover:border-[#b85c38]/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                                            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span>Kunci: Reguler</span>
                                        </span>
                                        {formData.allowed_registration_paths === 'Reguler' && (
                                            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[11px] opacity-80 leading-snug">
                                        <strong>Prestasi dikunci.</strong> Pendaftar dipaksa mendaftar melalui <strong>Jalur Reguler (Umum)</strong>.
                                    </p>
                                </button>
                            </div>
                        </div>

                        <div className={`pt-3 border-t space-y-3 ${isDarkMode ? 'border-gray-800' : 'border-[#d6c5b3]'}`}>
                            <p className={`font-extrabold text-sm ${labelCls}`}>Jadwal Alur &amp; Timeline (5 Tahapan)</p>

                            {/* 1. Pendaftaran Online */}
                            <div className={`p-3.5 rounded-xl border ${subBox}`}>
                                <p className="text-xs font-extrabold text-[#9e4522] dark:text-teal-400 uppercase mb-2">1. Pendaftaran Online</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Mulai</label>
                                        <input type="date" name="reg_start" value={formData.reg_start} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Selesai</label>
                                        <input type="date" name="reg_end" value={formData.reg_end} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Verifikasi Berkas */}
                            <div className={`p-3.5 rounded-xl border ${subBox}`}>
                                <p className="text-xs font-extrabold text-[#9e4522] dark:text-teal-400 uppercase mb-2">2. Verifikasi Berkas</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Mulai</label>
                                        <input type="date" name="verif_start" value={formData.verif_start} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Selesai</label>
                                        <input type="date" name="verif_end" value={formData.verif_end} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Tes Seleksi */}
                            <div className={`p-3.5 rounded-xl border ${subBox}`}>
                                <p className="text-xs font-extrabold text-[#9e4522] dark:text-teal-400 uppercase mb-2">3. Tes Seleksi (Akademik &amp; Wawancara)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Mulai</label>
                                        <input type="date" name="test_start" value={formData.test_start} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Selesai</label>
                                        <input type="date" name="test_end" value={formData.test_end} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Pengumuman */}
                            <div className={`p-3.5 rounded-xl border ${subBox}`}>
                                <p className="text-xs font-extrabold text-[#9e4522] dark:text-teal-400 uppercase mb-2">4. Pengumuman Kelulusan</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Mulai</label>
                                        <input type="date" name="announce_start" value={formData.announce_start} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Selesai</label>
                                        <input type="date" name="announce_end" value={formData.announce_end} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 5. Daftar Ulang */}
                            <div className={`p-3.5 rounded-xl border-2 ${isDarkMode ? 'bg-teal-950/30 border-teal-700/70' : 'bg-[#fdf6ee] border-[#b85c38]'}`}>
                                <p className="text-xs font-extrabold text-[#9e4522] dark:text-teal-300 uppercase mb-2">
                                    5. Daftar Ulang &amp; Pembayaran (gosiswa.com)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Daftar Ulang Dimulai</label>
                                        <input type="date" name="rereg_start" value={formData.rereg_start} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Batas Akhir Daftar Ulang</label>
                                        <input type="date" name="rereg_end" value={formData.rereg_end} onChange={handleChange} className={`w-full p-2 text-sm rounded-xl border ${inputCls}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. PENGATURAN PEMBAYARAN GOSISWA.COM & VIDEO TUTORIAL */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${cardBox}`}>
                        <h2 className={`font-extrabold text-base border-b pb-2.5 flex items-center gap-2 ${isDarkMode ? 'text-white border-gray-800' : 'text-[#1f1410] border-[#d6c5b3]'}`}>
                            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Integrasi Pembayaran (gosiswa.com) &amp; Panduan Daftar Ulang</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>
                                    URL Portal Pembayaran
                                </label>
                                <input
                                    type="url"
                                    name="payment_portal_url"
                                    value={formData.payment_portal_url}
                                    onChange={handleChange}
                                    placeholder="https://gosiswa.com"
                                    className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>
                                    Link Video YouTube Tutorial Pembayaran
                                </label>
                                <input
                                    type="text"
                                    name="payment_tutorial_youtube_url"
                                    value={formData.payment_tutorial_youtube_url}
                                    onChange={handleChange}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className={`w-full p-2.5 rounded-xl border text-sm font-medium ${inputCls}`}
                                />
                                {formData.payment_tutorial_youtube_url.trim() !== '' && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold">
                                        {parsedYoutubeId ? (
                                            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Video YouTube valid (ID: {parsedYoutubeId})
                                            </span>
                                        ) : (
                                            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Format URL YouTube tidak dikenali
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs sm:text-sm font-bold mb-1 ${labelCls}`}>
                                Rincian Biaya Daftar Ulang (Minimal DP vs Lunas + Diskon) &amp; Instruksi
                            </label>
                            <textarea
                                name="rereg_instructions"
                                value={formData.rereg_instructions}
                                onChange={handleChange}
                                rows={4}
                                placeholder={`Contoh:\n• Pembayaran Minimal (DP): Rp 1.000.000 (mengunci kursi jurusan)\n• Pembayaran Lunas (Full): Rp 2.500.000 (hemat diskon Rp 300.000 dari tarif normal Rp 2.800.000)\n• Pembayaran dilakukan melalui Virtual Account pada portal gosiswa.com, lalu unggah kuitansi digitalnya di langkah ke-3 formulir daftar ulang.`}
                                className={`w-full p-3 rounded-xl border text-sm leading-relaxed ${inputCls}`}
                            />
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                                Teks ini ditampilkan langsung kepada siswa/orang tua pada halaman Daftar Ulang sebelum mereka masuk ke portal gosiswa.com.
                            </p>
                        </div>
                    </div>

                    {/* 4. KUOTA KURSI PER KOMPETENSI KEAHLIAN (JURUSAN) */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${cardBox}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-[#d6c5b3] dark:border-gray-800">
                            <h2 className={`font-extrabold text-base flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Target Kuota Kursi per Kompetensi Keahlian</span>
                            </h2>
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                Total Daya Tampung: {totalQuota} Siswa
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.keys(DEFAULT_QUOTAS).map((major) => (
                                <div key={major} className={`p-3.5 rounded-xl border ${subBox}`}>
                                    <label className={`block text-xs font-extrabold mb-2 leading-snug ${labelCls}`}>
                                        {major}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            value={majorQuotas[major] ?? 0}
                                            onChange={(e) => handleQuotaChange(major, e.target.value)}
                                            className={`w-full p-2.5 rounded-xl border text-sm font-extrabold text-center ${inputCls}`}
                                        />
                                        <span className={`text-xs font-bold shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'}`}>
                                            Kursi
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. MODUL ASESMEN & TES */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-indigo-950/30 border-indigo-800/60' : 'bg-indigo-50/70 border-indigo-200'}`}>
                        <h2 className={`font-extrabold text-base border-b pb-2.5 flex items-center gap-2 ${isDarkMode ? 'text-indigo-200 border-indigo-800' : 'text-indigo-950 border-indigo-200'}`}>
                            <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Modul Asesmen &amp; Tes Seleksi</span>
                        </h2>
                        <div className="space-y-2.5">
                            {AVAILABLE_TESTS.map((test) => (
                                <div
                                    key={test.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border shadow-xs ${isDarkMode ? 'bg-gray-900/70 border-indigo-800/40' : 'bg-white border-indigo-200'}`}
                                >
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={activeTests.includes(test.id)}
                                            onChange={() => toggleTest(test.id)}
                                            className="w-5 h-5 accent-indigo-600 rounded"
                                        />
                                        <span className={`font-bold text-xs sm:text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                            {test.label}
                                        </span>
                                    </label>
                                    {activeTests.includes(test.id) && test.id !== 'WAWANCARA' && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={testDurations[test.id] ?? ''}
                                                onChange={(e) => handleDurationChange(test.id, e.target.value)}
                                                className={`w-20 p-1.5 text-center text-sm font-extrabold rounded-lg border ${inputCls}`}
                                                placeholder="0"
                                            />
                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Menit</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-extrabold text-base sm:text-lg shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                        <Save className="w-5 h-5" />
                        <span>Simpan Seluruh Pengaturan</span>
                    </button>
                </form>
            </div>
        </main>
    );
}