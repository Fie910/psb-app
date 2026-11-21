//src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Eye, EyeOff, LogIn, AlertCircle, GraduationCap } from 'lucide-react';

export default function LoginPage() {
    const { isDarkMode } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { error } = await authClient.signIn.email({ email, password });
            if (error) {
                setError(error.message || 'Email atau password salah');
            } else {
                router.push('/admin');
            }
        } catch {
            setError('Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    const bg = isDarkMode
        ? 'bg-linear-to-br from-gray-900 via-slate-800 to-slate-900'
        : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40]';
    //: 'bg-linear-to-br from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae]';

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
                {/* Logo / Icon */}
                <div className="flex justify-center mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-teal-600/30 border border-teal-500/40' : 'bg-[#b85c38]/15 border border-[#b85c38]/30'}`}>
                        <GraduationCap className={`w-8 h-8 ${isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'}`} />
                    </div>
                </div>

                <h1 className={`text-2xl font-bold text-center mb-1 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
                    Login Panitia
                </h1>
                <p className={`text-center text-xs mb-6 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>
                    PSB SMK KH. A. WAHAB MUHSIN
                </p>

                {error && (
                    <div className={`flex items-center gap-2 text-sm font-medium mb-4 p-3 rounded-xl ${isDarkMode ? 'bg-red-900/40 text-red-300 border border-red-700/50' : 'bg-red-100/60 text-red-700 border border-red-200'}`}>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${inputCls}`}
                            placeholder="email@sekolah.ac.id"
                            required
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className={`block text-sm font-semibold ${labelCls}`}>Password</label>
                            <a
                                href="/forgot-password"
                                className={`text-xs font-semibold transition-colors hover:underline ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-[#b85c38] hover:text-[#a04d2c]'
                                    }`}
                            >
                                Lupa password?
                            </a>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full rounded-xl border px-4 py-2.5 pr-12 text-sm focus:outline-none transition-all ${inputCls}`}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-teal-400' : 'text-[#9e8369] hover:text-[#b85c38]'}`}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-50 hover:-translate-y-0.5 mt-2 ${isDarkMode
                            ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40'
                            : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white shadow-lg shadow-[#b85c38]/25'
                            }`}
                    >
                        <LogIn className="w-4 h-4" />
                        {isLoading ? 'Memeriksa...' : 'Masuk'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a
                        href="/"
                        className={`text-xs font-semibold transition-colors hover:underline ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-[#9e8369] hover:text-[#6e5346]'}`}
                    >
                        &larr; Kembali ke Beranda
                    </a>
                </div>
            </div>
        </main>
    );
}
