//src/app/admin/kelola-tes/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Upload, ArrowLeft, Info, FileJson } from 'lucide-react';

export default function KelolaTesPage() {
    const { isDarkMode } = useTheme();
    const [category, setCategory] = useState('TPA');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error('Pilih file JSON terlebih dahulu!');
            return;
        }

        setIsUploading(true);
        const loadingToast = toast.loading('Membaca dan mengimport soal...');

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jsonString = event.target?.result as string;
                    const jsonData = JSON.parse(jsonString);

                    const res = await fetch('/api/admin/import-questions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ category, jsonData }),
                    });

                    const result = await res.json();

                    if (res.ok) {
                        toast.success(`Berhasil! ${result.count} soal dimasukkan ke database.`, { id: loadingToast });
                        setFile(null);
                        (document.getElementById('file-json') as HTMLInputElement).value = '';
                    } else {
                        toast.error(result.error || 'Gagal mengimport soal', { id: loadingToast });
                    }
                } catch (err) {
                    toast.error('Format file JSON tidak valid.', { id: loadingToast });
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            toast.error('Gagal membaca file.', { id: loadingToast });
            setIsUploading(false);
        }
    };

    return (
        <main className={`min-h-screen p-4 sm:p-8 font-sans bg-linear-to-br transition-colors duration-300 ${isDarkMode
            ? 'from-gray-900 via-slate-800 to-slate-900'
            : 'from-[#c7a98c] via-[#a68160] to-[#825e40]'
            //: 'from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae]'
            }`}>
            <div className={`max-w-xl mx-auto p-6 sm:p-8 rounded-3xl shadow-2xl border backdrop-blur-xl transition-colors duration-300 ${isDarkMode
                ? 'bg-gray-800/70 border-gray-700/60'
                : 'bg-white/70 border-white/60'
                }`}>

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <FileJson className={`w-6 h-6 ${isDarkMode ? 'text-gray-300' : 'text-[#b85c38]'}`} />
                        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#2b1d18]'}`}>Import Bank Soal</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/admin" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-[#8f472a] hover:text-[#b85c38]'}`}>
                            <ArrowLeft className="w-4 h-4" />
                            Kembali
                        </Link>
                    </div>
                </div>

                {/* Info box */}
                <div className={`border p-4 rounded-xl mb-6 text-sm flex gap-3 ${isDarkMode
                    ? 'bg-blue-900/30 border-blue-700/50 text-blue-200'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1">Petunjuk:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Pastikan file berformat <strong>.json</strong>.</li>
                            <li>Pilih kategori tes yang sesuai.</li>
                            <li>Mengimport ulang akan <strong>menghapus soal lama</strong> pada kategori yang sama.</li>
                        </ul>
                    </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-5">
                    <div>
                        <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'}`}>Pilih Kategori Tes</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={`w-full p-3 rounded-xl border font-semibold outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-indigo-500'
                                : 'bg-white/80 border-[#d6c5b3] text-gray-900 focus:border-[#b85c38]'
                                }`}
                        >
                            <option value="TPA">TPA (Literasi &amp; Numerasi)</option>
                            <option value="DIAGNOSTIK">Asesmen Diagnostik Non-Kognitif</option>
                            <option value="SOSIAL_EMOSIONAL">Skala Sosial-Emosional</option>
                            <option value="CHARACTER">Character Skills Snapshot</option>
                            <option value="BIG_FIVE">Big Five Inventory</option>
                            <option value="WAWANCARA">Rubrik Wawancara</option>
                        </select>
                    </div>

                    <div>
                        <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'}`}>Upload File JSON</label>
                        <input
                            id="file-json"
                            type="file"
                            accept=".json,application/json"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className={`block w-full text-sm rounded-xl border cursor-pointer
                                file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-[#b85c38] file:text-white hover:file:bg-[#a04d2c] transition-colors ${isDarkMode
                                    ? 'text-gray-400 bg-gray-700/50 border-gray-600'
                                    : 'text-gray-600 bg-white/50 border-[#d6c5b3]'
                                }`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isUploading}
                        className={`w-full py-3.5 mt-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isDarkMode
                            ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                            : 'bg-gray-900 hover:bg-black text-white'
                            }`}
                    >
                        <Upload className="w-5 h-5" />
                        {isUploading ? 'Memproses File...' : 'Mulai Import Soal'}
                    </button>
                </form>
            </div>
        </main>
    );
}
