'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Settings, Calendar, ArrowLeft, Save } from 'lucide-react';

const AVAILABLE_TESTS = [
    { id: 'TPA', label: 'Tes Potensi Akademik (TPA)' },
    { id: 'DIAGNOSTIK', label: 'Asesmen Diagnostik Non-Kognitif' },
    { id: 'SOSIAL_EMOSIONAL', label: 'Skala Sosial Emosional' },
    { id: 'CHARACTER', label: 'Character Skills Snapshot' },
    { id: 'BIG_FIVE', label: 'Big Five Inventory' },
    { id: 'WAWANCARA', label: 'Wawancara Terstruktur (Rubrik)' },
];

export default function PengaturanPage() {
    const { isDarkMode } = useTheme();

    const [formData, setFormData] = useState({
        is_open_manual: true, use_auto_schedule: false, wave_name: 'Gelombang 1', contact_wa: '',
        reg_start: '', reg_end: '', verif_start: '', verif_end: '', test_start: '', test_end: '', announce_start: '', announce_end: '',
        school_name: '', foundation_name: '', school_address: '', school_city: '', headmaster_name: '', headmaster_nip: '', logo_url: ''
    });

    const [activeTests, setActiveTests] = useState<string[]>([]);
    const [testDurations, setTestDurations] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.settings) {
                    const s = data.settings;
                    const fmt = (d: string) => d ? new Date(d).toISOString().split('T')[0] : '';
                    setFormData({
                        is_open_manual: s.is_open_manual, use_auto_schedule: s.use_auto_schedule,
                        wave_name: s.wave_name || '', contact_wa: s.contact_wa || '',
                        reg_start: fmt(s.reg_start), reg_end: fmt(s.reg_end),
                        verif_start: fmt(s.verif_start), verif_end: fmt(s.verif_end),
                        test_start: fmt(s.test_start), test_end: fmt(s.test_end),
                        announce_start: fmt(s.announce_start), announce_end: fmt(s.announce_end),
                        school_name: s.school_name || '', foundation_name: s.foundation_name || '',
                        school_address: s.school_address || '', school_city: s.school_city || '',
                        headmaster_name: s.headmaster_name || '', headmaster_nip: s.headmaster_nip || '', logo_url: s.logo_url || ''
                    });
                    if (s.active_tests) setActiveTests(typeof s.active_tests === 'string' ? JSON.parse(s.active_tests) : s.active_tests);
                    if (s.test_durations) setTestDurations(typeof s.test_durations === 'string' ? JSON.parse(s.test_durations) : s.test_durations);
                }
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
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, active_tests: activeTests, test_durations: testDurations }),
            });
            if (res.ok) toast.success('Pengaturan berhasil disimpan!', { id: loadingToast });
            else toast.error('Gagal menyimpan pengaturan.', { id: loadingToast });
        } catch (err) { toast.error('Terjadi kesalahan jaringan.', { id: loadingToast }); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const toggleTest = (testId: string) => setActiveTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
    const handleDurationChange = (testId: string, minutes: string) => setTestDurations(prev => ({ ...prev, [testId]: parseInt(minutes) || 0 }));

    if (isLoading) return (
        <div className={`min-h-screen flex items-center justify-center font-bold text-xl ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-[#dfd3c3] text-[#2b1d18]'}`}>
            Memuat...
        </div>
    );

    return (
        <main className={`min-h-screen p-4 sm:p-8 font-sans bg-linear-to-br transition-colors duration-300 ${isDarkMode
            ? 'from-gray-900 via-slate-800 to-slate-900'
            : 'from-[#c7a98c] via-[#a68160] to-[#825e40]'
            //: 'from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae]'
            }`}>
            <div className={`max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl shadow-2xl border backdrop-blur-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/70'
                : 'bg-gray-900/20 border-white/70 shadow-xl'
                }`}>

                {/* Header */}
                <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isDarkMode ? 'border-gray-600' : 'border-[#d6c5b3]'}`}>
                    <div className="flex items-center gap-3">
                        <Settings className={`w-6 h-6 ${isDarkMode ? 'text-gray-300' : 'text-[#b85c38]'}`} />
                        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#2b1d18]'}`}>Pengaturan Sistem</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/admin" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-[#8f472a] hover:text-[#b85c38]'}`}>
                            <ArrowLeft className="w-4 h-4" />
                            Kembali
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-8">

                    {/* Identitas Sekolah */}
                    <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? 'bg-gray-700/50 border-gray-600/50' : 'bg-white/60 border-[#d6c5b3]'}`}>
                        <h2 className={`font-bold border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-100 border-gray-600' : 'text-[#2b1d18] border-[#d6c5b3]'}`}>
                            Identitas Sekolah &amp; Kop Surat
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Nama Yayasan</label>
                                <input type="text" name="foundation_name" value={formData.foundation_name} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Nama Sekolah</label>
                                <input type="text" name="school_name" value={formData.school_name} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Alamat Lengkap</label>
                                <textarea name="school_address" value={formData.school_address} onChange={handleChange} rows={2}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Kota (Untuk Tanda Tangan)</label>
                                <input type="text" name="school_city" value={formData.school_city} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>URL Logo Sekolah</label>
                                <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..."
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Nama Ketua Panitia</label>
                                <input type="text" name="headmaster_name" value={formData.headmaster_name} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>NIP Ketua Panitia</label>
                                <input type="text" name="headmaster_nip" value={formData.headmaster_nip} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                        </div>
                    </div>

                    {/* Status & Jadwal Pendaftaran */}
                    <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? 'bg-gray-700/50 border-gray-600/50' : 'bg-white/60 border-[#d6c5b3]'}`}>
                        <h2 className={`font-bold border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-100 border-gray-600' : 'text-[#2b1d18] border-[#d6c5b3]'}`}>
                            <Calendar className="w-4 h-4" />
                            Status &amp; Jadwal Pendaftaran
                        </h2>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="use_auto_schedule" checked={formData.use_auto_schedule} onChange={handleChange} className="w-5 h-5 accent-[#b85c38]" />
                            <div>
                                <p className={`font-semibold text-sm ${isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'}`}>Gunakan Jadwal Otomatis</p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-[#7a6358]'}`}>Status buka/tutup mengikuti tanggal Pendaftaran.</p>
                            </div>
                        </label>
                        {!formData.use_auto_schedule && (
                            <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border ${isDarkMode ? 'bg-yellow-900/20 border-yellow-700/40' : 'bg-yellow-50 border-yellow-300'}`}>
                                <input type="checkbox" name="is_open_manual" checked={formData.is_open_manual} onChange={handleChange} className="w-5 h-5 accent-[#b85c38]" />
                                <div>
                                    <p className={`font-bold text-sm ${isDarkMode ? 'text-yellow-300' : 'text-gray-900'}`}>Buka Pendaftaran (Manual)</p>
                                </div>
                            </label>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Nama Gelombang</label>
                                <input type="text" name="wave_name" value={formData.wave_name} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Nomor WhatsApp Panitia</label>
                                <input type="text" name="contact_wa" value={formData.contact_wa} onChange={handleChange}
                                    className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`} />
                            </div>
                        </div>

                        {/* Jadwal Timeline */}
                        <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-600' : 'border-[#d6c5b3]'}`}>
                            <p className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'}`}>Jadwal Alur &amp; Timeline (Ditampilkan di Beranda)</p>

                            {/* 1. Pendaftaran Online */}
                            <div className={`p-3 rounded-lg border mb-3 ${isDarkMode ? 'bg-gray-700/40 border-gray-600/40' : 'bg-[#f5ede3]/80 border-[#d6c5b3]'}`}>
                                <p className="text-xs font-bold text-[#b85c38] uppercase mb-2">1. Pendaftaran Online</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Pendaftaran Dimulai</label>
                                        <input type="date" name="reg_start" value={formData.reg_start} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Pendaftaran Selesai</label>
                                        <input type="date" name="reg_end" value={formData.reg_end} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Verifikasi Berkas */}
                            <div className={`p-3 rounded-lg border mb-3 ${isDarkMode ? 'bg-gray-700/40 border-gray-600/40' : 'bg-[#f5ede3]/80 border-[#d6c5b3]'}`}>
                                <p className="text-xs font-bold text-[#b85c38] uppercase mb-2">2. Verifikasi Berkas</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Verifikasi Dimulai</label>
                                        <input type="date" name="verif_start" value={formData.verif_start} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Verifikasi Selesai</label>
                                        <input type="date" name="verif_end" value={formData.verif_end} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Tes Seleksi */}
                            <div className={`p-3 rounded-lg border mb-3 ${isDarkMode ? 'bg-gray-700/40 border-gray-600/40' : 'bg-[#f5ede3]/80 border-[#d6c5b3]'}`}>
                                <p className="text-xs font-bold text-[#b85c38] uppercase mb-2">3. Tes Seleksi (Akademik &amp; Wawancara)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Tes Seleksi Dimulai</label>
                                        <input type="date" name="test_start" value={formData.test_start} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Tes Seleksi Selesai</label>
                                        <input type="date" name="test_end" value={formData.test_end} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Pengumuman */}
                            <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700/40 border-gray-600/40' : 'bg-[#f5ede3]/80 border-[#d6c5b3]'}`}>
                                <p className="text-xs font-bold text-[#b85c38] uppercase mb-2">4. Pengumuman Kelulusan</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Pengumuman Dimulai</label>
                                        <input type="date" name="announce_start" value={formData.announce_start} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Pengumuman Selesai</label>
                                        <input type="date" name="announce_end" value={formData.announce_end} onChange={handleChange}
                                            className={`w-full p-2 text-sm rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-[#d6c5b3] text-[#2b1d18]'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modul Asesmen */}
                    <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? 'bg-indigo-900/30 border-indigo-800/50' : 'bg-indigo-50/50 border-indigo-200'}`}>
                        <h2 className={`font-bold border-b pb-2 ${isDarkMode ? 'text-indigo-200 border-indigo-700' : 'text-indigo-900 border-indigo-200'}`}>
                            Modul Asesmen &amp; Tes
                        </h2>
                        <div className="space-y-3">
                            {AVAILABLE_TESTS.map((test) => (
                                <div key={test.id} className={`flex items-center justify-between p-3 rounded-lg border shadow-sm ${isDarkMode ? 'bg-gray-700/50 border-indigo-700/30' : 'bg-white/70 border-indigo-100'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={activeTests.includes(test.id)} onChange={() => toggleTest(test.id)} className="w-5 h-5 accent-indigo-600" />
                                        <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{test.label}</span>
                                    </label>
                                    {activeTests.includes(test.id) && test.id !== 'WAWANCARA' && (
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="1" value={testDurations[test.id] ?? ''} onChange={(e) => handleDurationChange(test.id, e.target.value)}
                                                className={`w-20 p-1.5 text-center text-sm font-bold rounded border ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'text-gray-900 border-gray-300 bg-white'}`} placeholder="0" />
                                            <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Menit</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3.5 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" />
                        Simpan Pengaturan
                    </button>
                </form>
            </div>
        </main>
    );
}
