//src/app/admin/akun/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { authClient } from '@/lib/auth/client';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Key, LogOut, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AkunPage() {
    const { isDarkMode } = useTheme();
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi password baru tidak cocok!');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password baru minimal 8 karakter!');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Menyimpan password baru...');

        try {
            const { error } = await authClient.changePassword({
                newPassword,
                currentPassword,
                revokeOtherSessions: true, // Logout dari perangkat lain
            });

            if (error) {
                toast.error(error.message || 'Gagal mengganti password. Pastikan password lama benar.', { id: loadingToast });
            } else {
                toast.success('Password berhasil diganti!', { id: loadingToast });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            toast.error('Terjadi kesalahan jaringan.', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar dari akun ini?');
        if (!confirmLogout) return;

        const loadingToast = toast.loading('Keluar dari sistem...');
        try {
            await authClient.signOut();
            toast.success('Berhasil keluar.', { id: loadingToast });
            router.push('/login');
        } catch (error) {
            toast.error('Gagal logout.', { id: loadingToast });
        }
    };

    return (
        <main className={`min-h-screen p-4 sm:p-8 font-sans bg-linear-to-br transition-colors duration-300 flex items-center justify-center ${isDarkMode
            ? 'from-gray-900 via-slate-800 to-slate-900'
            : 'from-[#c7a98c] via-[#a68160] to-[#825e40]'
            }`}>
            <Toaster position="top-center" />

            <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border backdrop-blur-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white/60 border-white/60'
                }`}>

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-300/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-6 h-6 ${isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'}`} />
                        <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>Keamanan Akun</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link href="/admin" className={`flex items-center gap-1 text-xs font-semibold hover:underline ${isDarkMode ? 'text-gray-300' : 'text-[#8f472a]'}`}>
                            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                        </Link>
                    </div>
                </div>

                {/* Form Ganti Password */}
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-amber-500" />
                        <h2 className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-[#4a342a]'}`}>Ganti Password</h2>
                    </div>

                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Password Saat Ini</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none ${isDarkMode ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`}
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Password Baru (Min. 8 Karakter)</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full rounded-xl border px-4 py-2.5 pr-12 text-sm focus:outline-none ${isDarkMode ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Konfirmasi Password Baru</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none ${isDarkMode ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18]'}`}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2.5 mt-2 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 ${isDarkMode ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white'}`}
                    >
                        {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </button>
                </form>

                {/* Logout Area */}
                <div className={`mt-8 pt-6 border-t border-dashed ${isDarkMode ? 'border-gray-700' : 'border-[#d6c5b3]'}`}>
                    <h2 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-[#4a342a]'}`}>Sesi Perangkat</h2>
                    <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>
                        Jika Anda menggunakan komputer bersama, pastikan untuk keluar setelah selesai menggunakan sistem.
                    </p>
                    <button
                        onClick={handleLogout}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${isDarkMode ? 'bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-800/50' : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'}`}
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar dari Akun (Logout)
                    </button>
                </div>
            </div>
        </main>
    );
}