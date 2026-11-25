//src\app\admin\kelola-panitia\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth/client';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Eye, EyeOff, UserPlus, ArrowLeft, Shield, History, Users, RefreshCw, CheckCircle2 } from 'lucide-react';
import { PANITIA_ROLES, type PanitiaRole } from '@/lib/rbac';
import toast, { Toaster } from 'react-hot-toast';

interface PanitiaUser {
    user_id: string;
    email: string;
    name: string;
    role: PanitiaRole;
    created_at?: string;
    updated_at?: string;
}

export default function KelolaPanitiaPage() {
    const { isDarkMode } = useTheme();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<PanitiaRole>('verifikator');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    // List panitia state
    const [panitiaList, setPanitiaList] = useState<PanitiaUser[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const fetchPanitiaList = async () => {
        try {
            setIsLoadingList(true);
            const res = await fetch('/api/admin/panitia');
            const data = await res.json();
            if (res.ok && data.panitia) {
                setPanitiaList(data.panitia);
            }
        } catch {
            // silent ignore
        } finally {
            setIsLoadingList(false);
        }
    };

    useEffect(() => {
        fetchPanitiaList();
    }, []);

    const handleCreatePanitia = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // 1. Buat akun login melalui Neon Auth Client
            const { data, error } = await authClient.admin.createUser({
                email,
                password,
                name,
                role: 'user',
            });

            if (error) {
                setMessage({ type: 'error', text: error.message || 'Gagal membuat akun panitia.' });
                setIsLoading(false);
                return;
            }

            const createdUserId = (data?.user as any)?.id || email;

            // 2. Simpan penetapan peran RBAC di database & catat audit log
            try {
                const roleRes = await fetch('/api/admin/panitia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: createdUserId,
                        email,
                        name,
                        role,
                        is_update: false,
                    }),
                });
                const roleData = await roleRes.json();
                if (!roleRes.ok) {
                    console.warn('Gagal mencatat role panitia:', roleData.error);
                }
            } catch (rErr) {
                console.warn('Gagal sync role panitia:', rErr);
            }

            setMessage({
                type: 'success',
                text: `Akun panitia untuk ${name} berhasil dibuat dengan peran '${role}'!`,
            });
            toast.success(`Akun ${name} (${role}) berhasil dibuat!`);
            setName('');
            setEmail('');
            setPassword('');
            setRole('verifikator');
            fetchPanitiaList();
        } catch {
            setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateRole = async (panitia: PanitiaUser, newRole: PanitiaRole) => {
        if (panitia.role === newRole) return;
        setUpdatingUserId(panitia.user_id);
        try {
            const res = await fetch('/api/admin/panitia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: panitia.user_id,
                    email: panitia.email,
                    name: panitia.name,
                    role: newRole,
                    is_update: true,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Peran ${panitia.name} diubah menjadi '${newRole}'`);
                fetchPanitiaList();
            } else {
                toast.error(data.error || 'Gagal mengubah peran panitia.');
            }
        } catch {
            toast.error('Gagal memperbarui peran panitia.');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getRoleBadge = (r: PanitiaRole) => {
        const found = PANITIA_ROLES.find((item) => item.role === r);
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    found ? found.badgeColor : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
            >
                {found ? found.label : r}
            </span>
        );
    };

    return (
        <main
            className={`min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300 ${
                isDarkMode
                    ? 'bg-[#0f1218] text-gray-100'
                    : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] text-[#2b1d18]'
            }`}
        >
            <Toaster position="top-right" />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Atas */}
                <header
                    className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isDarkMode
                            ? 'bg-gray-800/80 border-gray-700/60'
                            : 'bg-white/80 border-white/60 shadow-amber-900/10'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-3 rounded-2xl ${
                                isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                            }`}
                        >
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black">Kelola Akun &amp; Peran Panitia</h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                                    <Shield className="w-3 h-3" /> RBAC
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Atur hak akses: Super Admin, Verifikator Berkas, Pewawancara, dan Bendahara.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <ThemeToggle />
                        <Link
                            href="/admin/audit-log"
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                isDarkMode
                                    ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-300'
                                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
                            }`}
                        >
                            <History className="w-3.5 h-3.5" />
                            Audit Log
                        </Link>
                        <Link
                            href="/admin"
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                                isDarkMode
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                    : 'bg-white hover:bg-[#faf5ef] text-[#2b1d18] border border-[#cbb7a2]'
                            }`}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Admin
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Formulir Tambah Panitia Baru */}
                    <div
                        className={`lg:col-span-6 p-6 sm:p-7 rounded-3xl border shadow-xl backdrop-blur-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-800/60 border-gray-700/60'
                                : 'bg-white/70 border-white/60'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <UserPlus
                                className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-[#b85c38]'}`}
                            />
                            <h2 className="text-lg font-bold">Tambah Akun Panitia Baru</h2>
                        </div>

                        {message.text && (
                            <div
                                className={`p-3 mb-4 rounded-xl text-xs font-semibold text-center border ${
                                    message.type === 'success'
                                        ? isDarkMode
                                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : isDarkMode
                                        ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                            >
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleCreatePanitia} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 opacity-80">
                                    Nama Lengkap Panitia:
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: Ahmad Fauzi, S.Pd."
                                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-indigo-500'
                                            : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]'
                                    }`}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 opacity-80">
                                    Alamat Email Login:
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="panitia@sekolah.sch.id"
                                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-indigo-500'
                                            : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]'
                                    }`}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 opacity-80">
                                    Password Akun (Minimal 8 Karakter):
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs focus:outline-none transition-colors ${
                                            isDarkMode
                                                ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-indigo-500'
                                                : 'bg-white/80 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]'
                                        }`}
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Pilihan Peran RBAC */}
                            <div>
                                <label className="block text-xs font-bold mb-1.5 opacity-80">
                                    Pilih Peran / Hak Akses (Role):
                                </label>
                                <div className="space-y-2">
                                    {PANITIA_ROLES.map((rItem) => {
                                        const isSelected = role === rItem.role;
                                        return (
                                            <div
                                                key={rItem.role}
                                                onClick={() => setRole(rItem.role)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                                                    isSelected
                                                        ? isDarkMode
                                                            ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                                                            : 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-sm'
                                                        : isDarkMode
                                                        ? 'bg-gray-800/40 border-gray-700/60 text-gray-300 hover:bg-gray-700/40'
                                                        : 'bg-white/40 border-gray-200 text-gray-700 hover:bg-white/70'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    checked={isSelected}
                                                    onChange={() => setRole(rItem.role)}
                                                    className="mt-0.5 text-indigo-600 cursor-pointer"
                                                />
                                                <div className="flex-1 text-xs">
                                                    <div className="font-bold flex items-center justify-between">
                                                        <span>{rItem.label}</span>
                                                        {getRoleBadge(rItem.role)}
                                                    </div>
                                                    <p className="text-[11px] opacity-70 mt-0.5 leading-relaxed">
                                                        {rItem.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                {isLoading ? 'Membuat Akun...' : 'Simpan Akun Panitia'}
                            </button>
                        </form>
                    </div>

                    {/* Daftar Akun Panitia & Peran Aktif */}
                    <div
                        className={`lg:col-span-6 p-6 sm:p-7 rounded-3xl border shadow-xl backdrop-blur-xl flex flex-col transition-colors ${
                            isDarkMode
                                ? 'bg-gray-800/60 border-gray-700/60'
                                : 'bg-white/70 border-white/60'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-400" />
                                <h2 className="text-lg font-bold">Daftar Akun Panitia Aktif</h2>
                            </div>
                            <button
                                onClick={fetchPanitiaList}
                                disabled={isLoadingList}
                                className="p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                                title="Segarkan data"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <p className="text-xs opacity-75 mb-4">
                            Ubah hak akses panitia secara langsung tanpa perlu membuat akun baru.
                        </p>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[580px]">
                            {isLoadingList ? (
                                <div className="py-12 text-center text-xs opacity-60">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    Memuat daftar akun panitia...
                                </div>
                            ) : panitiaList.length === 0 ? (
                                <div className="py-12 text-center text-xs opacity-60">
                                    Belum ada akun panitia tersimpan dalam database peran. Akun baru yang Anda buat akan langsung tercatat di sini.
                                </div>
                            ) : (
                                panitiaList.map((p) => {
                                    const isUpdating = updatingUserId === p.user_id;

                                    return (
                                        <div
                                            key={p.user_id}
                                            className={`p-3.5 rounded-2xl border transition-colors ${
                                                isDarkMode
                                                    ? 'bg-gray-900/60 border-gray-700/60'
                                                    : 'bg-white/80 border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="font-bold text-xs sm:text-sm">
                                                        {p.name}
                                                    </div>
                                                    <div className="text-[11px] font-mono opacity-70">
                                                        {p.email}
                                                    </div>
                                                </div>
                                                <div>{getRoleBadge(p.role)}</div>
                                            </div>

                                            {/* Selector ganti role */}
                                            <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                                                <span className="text-[11px] opacity-70">Ubah Peran:</span>
                                                <select
                                                    value={p.role}
                                                    disabled={isUpdating}
                                                    onChange={(e) =>
                                                        handleUpdateRole(p, e.target.value as PanitiaRole)
                                                    }
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border outline-none cursor-pointer transition-colors ${
                                                        isDarkMode
                                                            ? 'bg-gray-800 border-gray-700 text-gray-200'
                                                            : 'bg-white border-gray-300 text-gray-800'
                                                    }`}
                                                >
                                                    {PANITIA_ROLES.map((rOpt) => (
                                                        <option key={rOpt.role} value={rOpt.role}>
                                                            {rOpt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
