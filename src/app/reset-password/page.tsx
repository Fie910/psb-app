'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Token & Error param dari URL (Better Auth mengirimkan token di query param ?token=... atau ?error=...)
    const token = searchParams.get('token');
    const urlError = searchParams.get('error');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(urlError ? 'Tautan reset password tidak valid atau sudah kedaluwarsa.' : '');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Token pemulihan tidak ditemukan atau tidak valid. Silakan minta tautan baru.');
            return;
        }

        if (password.length < 8) {
            setError('Password minimal terdiri dari 8 karakter.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setIsLoading(true);

        try {
            // Memanggil endpoint resetPassword Neon / Better Auth
            const { error: resetErr } = await authClient.resetPassword({
                newPassword: password,
                token,
            });

            if (resetErr) {
                setError(resetErr.message || 'Gagal mereset kata sandi. Tautan mungkin telah kedaluwarsa.');
            } else {
                setIsSuccess(true);
            }
        } catch {
            setError('Terjadi gangguan koneksi. Silakan coba kembali.');
        } finally {
            setIsLoading(false);
        }
    };

    const bg = isDarkMode
        ? 'bg-linear-to-br from-gray-900 via-slate-800 to-slate-900'
        : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40]';

    const card = isDarkMode
        ? 'bg-gray-800/60 border-gray-700/60 backdrop-blur-xl shadow-2xl shadow-black/40'
        : 'bg-white/40 border-white/60 backdrop-blur-xl shadow-2xl shadow-[#9e8369]/15';

    const inputCls = isDarkMode
        ? 'bg-gray-700/50 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
        : 'bg-white/60 border-[#d6c5b3] text-[#2b1d18] placeholder:text-[#b8a898] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20';

    const labelCls = isDarkMode ? 'text-gray-300' : 'text-[#4a342a]';

    return (
        <main className={`min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-500 ${bg}`}>
            {/* Orb decorations */}
            <div className={`absolute top-[-15%] left-[-10%] w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-25 ${isDarkMode ? 'bg-indigo-700' : 'bg-[#c9a68e]'}`}></div>
            <div className={`absolute bottom-[-15%] right-[-5%] w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-25 ${isDarkMode ? 'bg-teal-800' : 'bg-[#e3c4a8]'}`}></div>

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className={`w-full max-w-sm p-8 rounded-3xl border z-10 ${card}`}>
                {/* Icon Header */}
                <div className="flex justify-center mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                        isDarkMode ? 'bg-teal-600/30 border border-teal-500/40' : 'bg-[#b85c38]/15 border border-[#b85c38]/30'
                    }`}>
                        <Lock className={`w-8 h-8 ${isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'}`} />
                    </div>
                </div>

                <h1 className={`text-2xl font-bold text-center mb-1 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
                    Atur Password Baru
                </h1>
                <p className={`text-center text-xs mb-6 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>
                    Buat kata sandi baru yang aman untuk akun panitia Anda.
                </p>

                {error && (
                    <div className={`flex items-start gap-2 text-sm font-medium mb-4 p-3 rounded-xl ${
                        isDarkMode ? 'bg-red-900/40 text-red-300 border border-red-700/50' : 'bg-red-100/60 text-red-700 border border-red-200'
                    }`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {isSuccess ? (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${
                            isDarkMode ? 'bg-green-900/30 border-green-700/50 text-green-300' : 'bg-green-50 border-green-200 text-green-800'
                        }`}>
                            <CheckCircle2 className="w-8 h-8 mb-2 text-green-500" />
                            <p className="font-semibold text-sm mb-1">Password Berhasil Diperbarui!</p>
                            <p className="text-xs opacity-90 leading-relaxed">
                                Kata sandi Anda telah berhasil direset. Silakan masuk menggunakan kata sandi baru Anda.
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => router.push('/login')}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:-translate-y-0.5 ${
                                    isDarkMode
                                        ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40'
                                        : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-lg shadow-[#b85c38]/25'
                                }`}
                            >
                                Masuk Sekarang
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Password Baru</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 pr-12 text-sm focus:outline-none transition-all ${inputCls}`}
                                    placeholder="Minimal 8 karakter"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                                        isDarkMode ? 'text-gray-400 hover:text-teal-400' : 'text-[#9e8369] hover:text-[#b85c38]'
                                    }`}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Konfirmasi Password Baru</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${inputCls}`}
                                placeholder="Ulangi password baru"
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !token}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-50 hover:-translate-y-0.5 mt-2 ${
                                isDarkMode
                                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40'
                                    : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-lg shadow-[#b85c38]/25'
                            }`}
                        >
                            <Lock className="w-4 h-4" />
                            {isLoading ? 'Menyimpan...' : 'Perbarui Password'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-[#9e8369] hover:text-[#4a342a]'
                        }`}
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Kembali ke Login
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#8c7a75] text-white font-bold text-sm">
                Memuat formulir reset...
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
