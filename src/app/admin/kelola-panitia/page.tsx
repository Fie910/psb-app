'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';

export default function KelolaPanitiaPage() {
    const { isDarkMode } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleCreatePanitia = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { data, error } = await authClient.admin.createUser({
                email,
                password,
                name,
                role: 'user',
            });

            if (error) {
                setMessage({ type: 'error', text: error.message || 'Gagal membuat akun panitia.' });
            } else {
                setMessage({ type: 'success', text: `Akun untuk ${name} berhasil dibuat!` });
                setName('');
                setEmail('');
                setPassword('');
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={`min-h-screen p-4 sm:p-8 font-sans bg-linear-to-br transition-colors duration-300 ${isDarkMode
            ? 'from-gray-900 via-slate-800 to-slate-900'
            : 'from-[#c7a98c] via-[#a68160] to-[#825e40]'
            //: 'from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae]'
            }`}>
            <div className={`max-w-md mx-auto p-6 sm:p-8 rounded-3xl shadow-2xl border backdrop-blur-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/60 border-gray-700/60'
                : 'bg-white/50 border-white/60'
                }`}>

                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                        <UserPlus className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-[#b85c38]'}`} />
                        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#2b1d18]'}`}>Tambah Panitia Baru</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link href="/admin" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-[#8f472a] hover:text-[#b85c38]'}`}>
                            <ArrowLeft className="w-4 h-4" />
                            Kembali
                        </Link>
                    </div>
                </div>

                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-[#4a342a]'}`}>Buat akun untuk anggota panitia PSB.</p>

                {message.text && (
                    <div className={`p-3 mb-4 rounded-xl text-sm font-medium text-center ${message.type === 'success'
                        ? isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100/60 text-green-800'
                        : isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100/60 text-red-800'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleCreatePanitia} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Nama Lengkap</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-indigo-500 placeholder:text-gray-500'
                                : 'bg-white/40 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]'
                                }`}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-indigo-500 placeholder:text-gray-500'
                                : 'bg-white/40 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]'
                                }`}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full rounded-xl border px-4 py-2.5 pr-12 focus:outline-none transition-colors ${isDarkMode
                                    ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-indigo-500'
                                    : 'bg-white/40 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]'
                                    }`}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-3 top-2.5 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-[#7a6358] hover:text-[#b85c38]'}`}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-[#7a6358]'}`}>Minimal 8 karakter.</p>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        {isLoading ? 'Membuat...' : 'Buat Akun Panitia'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/admin" className={`text-sm font-semibold hover:underline flex items-center justify-center gap-1.5 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-[#8f472a] hover:text-[#b85c38]'}`}>
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        </main>
    );
}
