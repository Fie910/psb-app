//src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { CheckCircle2, XCircle, Circle, Check, MessageCircle, ArrowRight, UserCheck } from 'lucide-react';

export default function LandingPage() {
    const { isDarkMode } = useTheme();
    const [settings, setSettings] = useState<any>(null);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.settings) {
                    setSettings(data.settings);
                    if (data.settings.use_auto_schedule) {
                        const now = new Date();
                        const start = new Date(data.settings.start_date);
                        const end = new Date(data.settings.end_date);
                        end.setHours(23, 59, 59, 999);
                        setIsRegistrationOpen(now >= start && now <= end);
                    } else {
                        setIsRegistrationOpen(data.settings.is_open_manual);
                    }
                }
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center font-sans ${isDarkMode ? 'bg-gray-900' : 'bg-[#dfd3c3]'}`}>
                <div className="flex flex-col items-center gap-3">
                    <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${isDarkMode ? 'border-teal-500' : 'border-[#b85c38]'}`}></div>
                    <p className={`font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <main className={`min-h-screen transition-colors duration-700 ease-in-out font-sans relative overflow-hidden ${isDarkMode
            ? 'bg-linear-to-br from-gray-900 via-slate-800 to-slate-900 text-gray-100'
            : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] text-[#2b1d18]'
            //: 'bg-linear-to-br from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae] text-[#2b1d18]'
            }`}>
            {/* Orb decorations */}
            <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob ${isDarkMode ? 'bg-indigo-700' : 'bg-[#c9a68e]'}`}></div>
            <div className={`absolute bottom-[-20%] right-[10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob ${isDarkMode ? 'bg-teal-800' : 'bg-[#e3c4a8]'}`}></div>

            {/* Navbar */}
            <nav className="relative z-20 flex justify-between items-center p-4 sm:p-6 max-w-6xl mx-auto">
                <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg sm:text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
                        SMK KH. A. WAHAB MUHSIN
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/cek-status"
                        className={`text-sm font-semibold transition-colors hover:underline ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-[#4a342a] hover:text-[#b85c38]'}`}
                    >
                        Cek Status
                    </Link>
                    <ThemeToggle />
                </div>
            </nav>

            {/* Hero */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold mb-4 backdrop-blur-md border ${isRegistrationOpen
                        ? (isDarkMode
                            ? 'bg-green-900/40 text-green-300 border-green-700/60'
                            : 'bg-green-100/60 text-green-800 border-green-300/60')
                        : (isDarkMode
                            ? 'bg-red-900/40 text-red-300 border-red-700/60'
                            : 'bg-red-100/60 text-red-800 border-red-300/60')
                        }`}>
                        {isRegistrationOpen
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Pendaftaran {settings?.wave_name || ''} Dibuka</>
                            : <><XCircle className="w-3.5 h-3.5" /> Pendaftaran Ditutup</>
                        }
                    </span>

                    <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
                        Wujudkan Masa Depan <br />
                        <span className={isDarkMode ? 'text-teal-400' : 'text-[#8f472a]'}>Cerah Bersama Kami.</span>
                    </h1>

                    <p className={`text-lg sm:text-xl mb-8 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>
                        Penerimaan Siswa Baru SMK KH. A. WAHAB MUHSIN Tahun Ajaran 2027/2028.
                        Jurusan Farmasi, Penyiaran TV - Multimedia, dan Manajemen Perkantoran.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {isRegistrationOpen ? (
                            <Link
                                href="/daftar"
                                className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-xl transition-all transform hover:-translate-y-1 hover:shadow-2xl ${isDarkMode
                                    ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/50'
                                    : 'bg-[#b85c38] hover:bg-[#a04d2c] shadow-[#5c3a21]/30'
                                    }`}
                            >
                                Mulai Pendaftaran <ArrowRight className="w-5 h-5" />
                            </Link>
                        ) : (
                            <button disabled className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-inner cursor-not-allowed ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-[#cfc0ae] text-[#8f7a6a]'}`}>
                                Pendaftaran Saat Ini Ditutup
                            </button>
                        )}

                        <Link
                            href="/cek-status"
                            className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg backdrop-blur-md border shadow-lg transition-all hover:-translate-y-0.5 ${isDarkMode
                                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/70'
                                : 'bg-white/50 border-white/70 text-[#2b1d18] hover:bg-white/70'
                                }`}
                        >
                            <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Cek Status Pendaftaran
                        </Link>

                        <a
                            href={`https://wa.me/${settings?.contact_wa || '6281234567890'}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg backdrop-blur-md border shadow-lg transition-all hover:-translate-y-0.5 ${isDarkMode
                                ? 'bg-gray-800/60 border-gray-700/60 text-white hover:bg-gray-700/70'
                                : 'bg-white/40 border-white/60 text-[#2b1d18] hover:bg-white/60'
                                }`}
                        >
                            <MessageCircle className="w-5 h-5" />
                            Hubungi Panitia
                        </a>
                    </div>
                </div>

                {/* Timeline */}
                <div className={`p-6 sm:p-10 rounded-3xl shadow-2xl border backdrop-blur-xl ${isDarkMode
                    ? 'bg-gray-800/50 border-gray-700/50 shadow-black/30'
                    : 'bg-white/40 border-white/50 shadow-[#9e8369]/10'
                    }`}>
                    <h2 className={`text-2xl font-bold text-center mb-8 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
                        Alur &amp; Jadwal Pendaftaran
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                        {/* Garis Penghubung */}
                        <div className={`hidden md:block absolute top-8 left-[8%] right-[8%] h-0.5 z-0 ${isDarkMode ? 'bg-gray-700' : 'bg-[#d6c5b3]'}`}></div>

                        {(() => {
                            const now = new Date();
                            const steps = [
                                { step: 1, title: 'Pendaftaran Online', desc: 'Isi formulir dan unggah berkas.', start: settings?.reg_start, end: settings?.reg_end },
                                { step: 2, title: 'Verifikasi Berkas', desc: 'Panitia memeriksa kelengkapan berkas.', start: settings?.verif_start, end: settings?.verif_end },
                                { step: 3, title: 'Tes Seleksi', desc: 'Tes potensi akademik dan wawancara.', start: settings?.test_start, end: settings?.test_end },
                                { step: 4, title: 'Pengumuman', desc: 'Hasil seleksi dapat dicek di website.', start: settings?.announce_start, end: settings?.announce_end },
                                { step: 5, title: 'Daftar Ulang', desc: 'Registrasi berkas & verifikasi MPLS.', start: settings?.rereg_start, end: settings?.rereg_end },
                            ];

                            return steps.map((item) => {
                                const formatDate = (dateString: string) => {
                                    if (!dateString) return 'Segera';
                                    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                };

                                const dateDisplay = (item.start || item.end)
                                    ? `${formatDate(item.start)} - ${formatDate(item.end)}`
                                    : 'Menyusul';

                                const startDate = item.start ? new Date(item.start) : null;
                                const endDate = item.end ? new Date(item.end) : null;
                                if (endDate) endDate.setHours(23, 59, 59, 999);

                                const isActive = startDate && endDate && now >= startDate && now <= endDate;
                                const isDone = endDate && now > endDate;

                                return (
                                    <div key={item.step} className="relative z-10 flex flex-col items-center text-center">
                                        {/* Circle */}
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-lg border-4 transition-colors duration-500 ${isActive
                                            ? isDarkMode
                                                ? 'bg-teal-600 border-gray-800 text-white shadow-teal-900/50'
                                                : 'bg-[#b85c38] border-white/80 text-white shadow-[#b85c38]/30'
                                            : isDone
                                                ? isDarkMode
                                                    ? 'bg-emerald-600 border-gray-800 text-white'
                                                    : 'bg-emerald-600 border-white/80 text-white'
                                                : isDarkMode
                                                    ? 'bg-gray-700 border-gray-800 text-gray-400'
                                                    : 'bg-[#dfd3c3] border-white/80 text-[#9e8369]'
                                            }`}>
                                            {isDone ? <Check className="w-7 h-7" /> : item.step}
                                        </div>

                                        <h3 className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>{item.title}</h3>

                                        <p className={`text-xs mb-2 font-semibold ${isActive
                                            ? isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'
                                            : isDone
                                                ? isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                                                : isDarkMode ? 'text-gray-500' : 'text-[#9e8369]'
                                            }`}>
                                            {dateDisplay}
                                        </p>

                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>{item.desc}</p>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* CTA Cek Status */}
                <div className="mt-6 text-center">
                    <a
                        href="/cek-status"
                        className={`text-sm font-semibold hover:underline transition-colors ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-[#8f472a] hover:text-[#b85c38]'}`}
                    >
                        Sudah mendaftar? Cek Status Pendaftaran di sini.
                    </a>
                </div>
            </div>
        </main>
    );
}
