//src/app/admin/kelola-tes/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    Upload,
    ArrowLeft,
    Info,
    FileJson,
    BookOpen,
    Calculator,
    Brain,
    HeartHandshake,
    Sparkles,
    Smile,
    MessageSquare,
    Download,
    Eye,
    X,
    Search,
    Filter,
    RefreshCw,
    CheckCircle2,
    Check
} from 'lucide-react';

interface QuestionSummary {
    TPA_LITERASI: number;
    TPA_NUMERASI: number;
    TPA_TOTAL: number;
    DIAGNOSTIK: number;
    SOSIAL_EMOSIONAL: number;
    CHARACTER: number;
    BIG_FIVE: number;
    WAWANCARA: number;
}

interface QuestionItem {
    id: number;
    question_code: string | null;
    category: string;
    dimension: string | null;
    type: string;
    question_text: string;
    options: any;
    correct_answer: string | null;
    is_favorable: boolean | null;
    difficulty: string | null;
}

const CATEGORY_CARDS = [
    {
        id: 'TPA_LITERASI',
        category: 'TPA',
        dimension: 'Literasi',
        title: 'TPA Literasi',
        description: 'Pemahaman teks bacaan, penalaran analitis, dan inferensi.',
        icon: BookOpen,
        color: 'from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30',
        badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
    },
    {
        id: 'TPA_NUMERASI',
        category: 'TPA',
        dimension: 'Numerasi',
        title: 'TPA Numerasi',
        description: 'Operasi hitung dasar, pemecahan masalah numerik & logika matematika.',
        icon: Calculator,
        color: 'from-blue-500/20 to-cyan-500/20 text-blue-500 border-blue-500/30',
        badgeBg: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300',
    },
    {
        id: 'DIAGNOSTIK',
        category: 'DIAGNOSTIK',
        dimension: null,
        title: 'Asesmen Diagnostik',
        description: 'Gaya belajar, kesiapan belajar, dan profil non-kognitif peserta didik.',
        icon: Brain,
        color: 'from-purple-500/20 to-pink-500/20 text-purple-500 border-purple-500/30',
        badgeBg: 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300',
    },
    {
        id: 'SOSIAL_EMOSIONAL',
        category: 'SOSIAL_EMOSIONAL',
        dimension: null,
        title: 'Skala Sosial-Emosional',
        description: 'Regulasi emosi, empati, interaksi teman sebaya, dan hubungan sosial.',
        icon: HeartHandshake,
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30',
        badgeBg: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    {
        id: 'CHARACTER',
        category: 'CHARACTER',
        dimension: null,
        title: 'Character Skills',
        description: 'Keuletan (grit), integritas, kemandirian, dan tanggung jawab.',
        icon: Sparkles,
        color: 'from-yellow-500/20 to-amber-500/20 text-yellow-500 border-yellow-500/30',
        badgeBg: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-300',
    },
    {
        id: 'BIG_FIVE',
        category: 'BIG_FIVE',
        dimension: null,
        title: 'Big Five Inventory',
        description: 'Extraversion, agreeableness, conscientiousness, neuroticism, openness.',
        icon: Smile,
        color: 'from-indigo-500/20 to-blue-500/20 text-indigo-500 border-indigo-500/30',
        badgeBg: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300',
    },
    {
        id: 'WAWANCARA',
        category: 'WAWANCARA',
        dimension: null,
        title: 'Rubrik Wawancara',
        description: 'Pertanyaan terstruktur, rubrik 4-level kompetensi & panduan probing.',
        icon: MessageSquare,
        color: 'from-rose-500/20 to-red-500/20 text-rose-500 border-rose-500/30',
        badgeBg: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300',
    },
];

// GENERATOR TEMPLATE JSON 100% SESUAI PARSER
function generateTemplateJSON(cat: string) {
    if (cat === 'TPA') {
        return {
            tpa_literasi: {
                bacaan: {
                    B1: "Perkembangan teknologi informasi di era digital telah merambah seluruh aspek kehidupan masyarakat. Salah satu bidang yang paling merasakan dampaknya adalah sektor pendidikan kejuruan yang menuntut adaptasi kurikulum berbasis industri modern.",
                },
                soal: [
                    {
                        id: "LIT-01",
                        bacaan_id: "B1",
                        pertanyaan: "Berdasarkan teks bacaan, faktor utama yang menuntut adaptasi kurikulum pada pendidikan kejuruan adalah...",
                        pilihan: {
                            A: "Perkembangan teknologi informasi di era digital",
                            B: "Ketersediaan sarana laboratorium komputer",
                            C: "Keinginan masyarakat untuk bekerja di luar negeri",
                            D: "Biaya pendidikan yang semakin meningkat",
                            E: "Persaingan antar sekolah kejuruan"
                        },
                        kunci: "A",
                        tingkat_kesulitan: "sedang"
                    },
                    {
                        id: "LIT-02",
                        pertanyaan: "Sinonim kata 'adaptasi' dalam konteks pembelajaran di lingkungan sekolah baru adalah...",
                        pilihan: {
                            A: "Penyesuaian",
                            B: "Perubahan",
                            C: "Peralihan",
                            D: "Penolakan",
                            E: "Penyerahan"
                        },
                        kunci: "A",
                        tingkat_kesulitan: "mudah"
                    }
                ]
            },
            tpa_numerasi: {
                soal: [
                    {
                        id: "NUM-01",
                        pertanyaan: "Sebuah apotek sekolah memesan 5 botol sirup obat dengan harga Rp24.000 per botol dan mendapatkan potongan diskon 10%. Berapakah total biaya yang harus dibayar?",
                        pilihan: {
                            A: "Rp108.000",
                            B: "Rp110.000",
                            C: "Rp112.000",
                            D: "Rp115.000",
                            E: "Rp120.000"
                        },
                        kunci: "A",
                        tingkat_kesulitan: "sedang"
                    },
                    {
                        id: "NUM-02",
                        pertanyaan: "Rasio perbandingan jumlah siswa jurusan Farmasi dan Televisi adalah 2 : 1. Jika total seluruh siswa kedua jurusan adalah 108 siswa, berapakah banyak siswa jurusan Televisi?",
                        pilihan: {
                            A: "36 siswa",
                            B: "54 siswa",
                            C: "72 siswa",
                            D: "48 siswa",
                            E: "32 siswa"
                        },
                        kunci: "A",
                        tingkat_kesulitan: "sedang"
                    }
                ]
            }
        };
    }

    if (['DIAGNOSTIK', 'SOSIAL_EMOSIONAL', 'CHARACTER', 'BIG_FIVE'].includes(cat)) {
        return {
            meta: {
                kategori: cat,
                skala: {
                    tipe: "Likert 5 Poin",
                    opsi: [
                        { nilai: 1, label: "Sangat Tidak Setuju" },
                        { nilai: 2, label: "Tidak Setuju" },
                        { nilai: 3, label: "Netral / Ragu-ragu" },
                        { nilai: 4, label: "Setuju" },
                        { nilai: 5, label: "Sangat Setuju" }
                    ]
                }
            },
            butir: [
                {
                    id: `${cat.slice(0, 3)}-01`,
                    dimensi: cat === 'DIAGNOSTIK' ? "Visual" : cat === 'CHARACTER' ? "Grit" : "Regulasi Diri",
                    pernyataan: "Saya lebih mudah memahami penjelasan materi jika disertai gambar, diagram, atau video praktik.",
                    jenis: "favorable"
                },
                {
                    id: `${cat.slice(0, 3)}-02`,
                    dimensi: cat === 'DIAGNOSTIK' ? "Auditori" : cat === 'CHARACTER' ? "Resiliensi" : "Empati",
                    pernyataan: "Saya cepat merasa putus asa dan enggan mencoba lagi apabila tugas praktik pertama saya gagal.",
                    jenis: "unfavorable"
                }
            ]
        };
    }

    if (cat === 'WAWANCARA') {
        return {
            meta: {
                kategori: "WAWANCARA",
                skala: "Rubrik 4 Level (1 = Perlu Bimbingan Intensif, 4 = Sangat Matang/Mandiri)"
            },
            pertanyaan: [
                {
                    id: "WAW-01",
                    dimensi: "D1",
                    pertanyaan_utama: "Apa alasan dan motivasi utama Anda memilih SMK KH. A. Wahab Muhsin serta jurusan yang Anda pilih?",
                    probing: [
                        "Apakah pilihan jurusan ini atas keinginan sendiri atau dorongan pihak lain?",
                        "Apa yang sudah Anda ketahui tentang prospek keahlian jurusan ini setelah lulus nanti?"
                    ],
                    rubrik: {
                        level_1: "Belum memiliki tujuan jelas, hanya ikut-ikutan teman atau tanpa pertimbangan matang.",
                        level_2: "Mengetahui minat dasar namun pemahaman mengenai kompetensi keahlian masih sangat minim.",
                        level_3: "Memiliki motivasi belajar yang baik, memahami dasar jurusan dan memiliki gambaran karir awal.",
                        level_4: "Sangat bersemangat, memiliki rencana studi/karir jangka panjang yang terarah, dan inisiatif tinggi."
                    }
                },
                {
                    id: "WAW-02",
                    dimensi: "D2",
                    pertanyaan_utama: "Bagaimana cara Anda membagi waktu antara belajar teori, praktik kejuruan, dan kegiatan ekstrakurikuler/pesantren?",
                    probing: [
                        "Ceritakan pengalaman Anda ketika menghadapi banyak tugas dalam waktu bersamaan.",
                        "Apa yang Anda lakukan saat merasa lelah atau kehilangan fokus belajar?"
                    ],
                    rubrik: {
                        level_1: "Sulit mengatur waktu dan sering menunda-nunda tanggung jawab belajar.",
                        level_2: "Bisa mengikuti jadwal umum namun masih memerlukan pengawasan dari guru/orang tua.",
                        level_3: "Mampu menyusun prioritas harian dan bertanggung jawab menyelesaikan tugas tepat waktu.",
                        level_4: "Memiliki manajemen waktu mandiri yang sangat baik, proaktif, dan resilien dalam mengatasi tekanan."
                    }
                }
            ]
        };
    }

    return {};
}

export default function KelolaTesPage() {
    const { isDarkMode } = useTheme();
    const [category, setCategory] = useState('TPA');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // State Bank Soal & Summary
    const [summary, setSummary] = useState<QuestionSummary>({
        TPA_LITERASI: 0,
        TPA_NUMERASI: 0,
        TPA_TOTAL: 0,
        DIAGNOSTIK: 0,
        SOSIAL_EMOSIONAL: 0,
        CHARACTER: 0,
        BIG_FIVE: 0,
        WAWANCARA: 0,
    });
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    // Modal Pratinjau Soal
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewCategory, setPreviewCategory] = useState<string>('TPA');
    const [previewDimension, setPreviewDimension] = useState<string>('ALL');
    const [previewQuestions, setPreviewQuestions] = useState<QuestionItem[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Summary
    const fetchSummary = async () => {
        setIsLoadingSummary(true);
        try {
            const res = await fetch('/api/admin/questions?mode=summary');
            const data = await res.json();
            if (res.ok && data.summary) {
                setSummary(data.summary);
            }
        } catch {
            toast.error('Gagal memuat ringkasan bank soal');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    // Buka Modal Pratinjau
    const openPreviewModal = async (cat: string, dim: string = 'ALL') => {
        setPreviewCategory(cat);
        setPreviewDimension(dim);
        setSearchQuery('');
        setPreviewModalOpen(true);
        setIsLoadingQuestions(true);

        try {
            const url = `/api/admin/questions?category=${encodeURIComponent(cat)}${
                dim !== 'ALL' ? `&dimension=${encodeURIComponent(dim)}` : ''
            }`;
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && Array.isArray(data.questions)) {
                setPreviewQuestions(data.questions);
            } else {
                setPreviewQuestions([]);
                toast.error(data.error || 'Gagal memuat butir soal.');
            }
        } catch {
            toast.error('Terjadi kesalahan memuat soal.');
            setPreviewQuestions([]);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    // Filter Dimensi di Modal
    const handleFilterDimension = async (dim: string) => {
        setPreviewDimension(dim);
        setIsLoadingQuestions(true);
        try {
            const url = `/api/admin/questions?category=${encodeURIComponent(previewCategory)}${
                dim !== 'ALL' ? `&dimension=${encodeURIComponent(dim)}` : ''
            }`;
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && Array.isArray(data.questions)) {
                setPreviewQuestions(data.questions);
            }
        } catch {
            toast.error('Gagal menyaring soal.');
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    // Download Contoh Template JSON
    const handleDownloadTemplate = (catToDownload: string) => {
        const template = generateTemplateJSON(catToDownload);
        const jsonStr = JSON.stringify(template, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Template_Soal_${catToDownload}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Template JSON ${catToDownload} berhasil diunduh!`);
    };

    // Upload & Import
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error('Pilih file JSON terlebih dahulu!');
            return;
        }

        setIsUploading(true);
        const loadingToast = toast.loading('Membaca dan mengimport butir soal...');

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
                        const fileInput = document.getElementById('file-json') as HTMLInputElement | null;
                        if (fileInput) fileInput.value = '';
                        fetchSummary();
                    } else {
                        toast.error(result.error || 'Gagal mengimport soal', { id: loadingToast });
                    }
                } catch {
                    toast.error('Format file JSON tidak valid.', { id: loadingToast });
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsText(file);
        } catch {
            toast.error('Gagal membaca file.', { id: loadingToast });
            setIsUploading(false);
        }
    };

    // Saring Soal di Modal
    const filteredQuestions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return previewQuestions;
        return previewQuestions.filter((item) => {
            const code = (item.question_code || '').toLowerCase();
            const text = (item.question_text || '').toLowerCase();
            const dim = (item.dimension || '').toLowerCase();
            return code.includes(q) || text.includes(q) || dim.includes(q);
        });
    }, [previewQuestions, searchQuery]);

    return (
        <main
            className={`min-h-screen p-4 sm:p-8 font-sans transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#f4eee6] text-[#2b1d18]'
            }`}
        >
            <Toaster position="top-right" />

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Navigasi */}
                <div
                    className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isDarkMode
                            ? 'bg-gray-900/80 border-gray-800'
                            : 'bg-white/90 border-[#d6c5b3] shadow-[#5c4033]/10'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2.5 rounded-2xl shrink-0 ${
                                isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-[#b85c38]/15 text-[#8f3f20]'
                            }`}
                        >
                            <FileJson className="w-6 h-6" />
                        </div>
                        <div>
                            <h1
                                className={`text-xl sm:text-2xl font-black ${
                                    isDarkMode ? 'text-white' : 'text-[#1f1410]'
                                }`}
                            >
                                Manajemen &amp; Import Bank Soal Seleksi
                            </h1>
                            <p
                                className={`text-xs sm:text-sm mt-0.5 ${
                                    isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'
                                }`}
                            >
                                Kelola butir soal ujian CBT (TPA, Diagnostik, Psikotes) serta instrumen rubrik wawancara panitia.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <button
                            type="button"
                            onClick={fetchSummary}
                            disabled={isLoadingSummary}
                            title="Segarkan ringkasan"
                            className={`p-2 rounded-xl border transition-all ${
                                isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                                    : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                            }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                        </button>
                        <ThemeToggle />
                        <Link
                            href="/admin"
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                                isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                    : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                            }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Kembali ke Admin</span>
                        </Link>
                    </div>
                </div>

                {/* Grid Kartu Ringkasan Bank Soal (7 Kategori) */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-sm font-black uppercase tracking-wider opacity-80">
                            Ringkasan Soal Aktif per Instrumen
                        </h2>
                        <span className="text-xs font-semibold opacity-70">
                            Total Keseluruhan:{' '}
                            <strong className={isDarkMode ? 'text-white' : 'text-[#1f1410]'}>
                                {summary.TPA_TOTAL +
                                    summary.DIAGNOSTIK +
                                    summary.SOSIAL_EMOSIONAL +
                                    summary.CHARACTER +
                                    summary.BIG_FIVE +
                                    summary.WAWANCARA}{' '}
                                Soal
                            </strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {CATEGORY_CARDS.map((card) => {
                            const IconComponent = card.icon;
                            let count = 0;
                            if (card.id === 'TPA_LITERASI') count = summary.TPA_LITERASI;
                            else if (card.id === 'TPA_NUMERASI') count = summary.TPA_NUMERASI;
                            else if (card.id === 'DIAGNOSTIK') count = summary.DIAGNOSTIK;
                            else if (card.id === 'SOSIAL_EMOSIONAL') count = summary.SOSIAL_EMOSIONAL;
                            else if (card.id === 'CHARACTER') count = summary.CHARACTER;
                            else if (card.id === 'BIG_FIVE') count = summary.BIG_FIVE;
                            else if (card.id === 'WAWANCARA') count = summary.WAWANCARA;

                            return (
                                <div
                                    key={card.id}
                                    className={`p-4 rounded-2xl border backdrop-blur-sm flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${
                                        isDarkMode
                                            ? 'bg-gray-900/70 border-gray-800 hover:border-gray-700'
                                            : 'bg-white/85 border-[#dfd2c4] hover:border-[#b85c38]/40 shadow-[#5c4033]/5'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div
                                                className={`p-2.5 rounded-xl border bg-linear-to-br ${card.color}`}
                                            >
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <span
                                                className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-full ${card.badgeBg}`}
                                            >
                                                {count} Butir
                                            </span>
                                        </div>

                                        <h3
                                            className={`font-black text-sm ${
                                                isDarkMode ? 'text-white' : 'text-[#1f1410]'
                                            }`}
                                        >
                                            {card.title}
                                        </h3>
                                        <p
                                            className={`text-xs mt-1 leading-relaxed line-clamp-2 ${
                                                isDarkMode ? 'text-gray-400' : 'text-[#5c4337]'
                                            }`}
                                        >
                                            {card.description}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openPreviewModal(card.category, card.dimension || 'ALL')}
                                            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                                                isDarkMode
                                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                                    : 'bg-[#faf4ec] hover:bg-[#efe4d6] border-[#d6c5b3] text-[#2b1d18]'
                                            }`}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Pratinjau</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadTemplate(card.category)}
                                            title={`Unduh Template JSON ${card.title}`}
                                            className={`p-1.5 rounded-xl border transition-all ${
                                                isDarkMode
                                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                                                    : 'bg-[#faf4ec] hover:bg-[#efe4d6] border-[#d6c5b3] text-[#2b1d18]'
                                            }`}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Upload & Unduh Template */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulir Upload */}
                    <div
                        className={`lg:col-span-2 p-6 sm:p-7 rounded-3xl border backdrop-blur-xl shadow-xl transition-colors ${
                            isDarkMode
                                ? 'bg-gray-900/80 border-gray-800'
                                : 'bg-white/90 border-[#d6c5b3] shadow-[#5c4033]/10'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                            <h2
                                className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                                    isDarkMode ? 'text-white' : 'text-[#1f1410]'
                                }`}
                            >
                                <Upload className="w-5 h-5 text-[#b85c38] dark:text-indigo-400" />
                                <span>Import File Soal (.JSON)</span>
                            </h2>
                            <button
                                type="button"
                                onClick={() => handleDownloadTemplate(category)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#b85c38]/15 hover:bg-[#b85c38]/25 text-[#8f3f20] dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 border border-[#b85c38]/30 dark:border-indigo-500/40 transition-all"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh Contoh Template ({category})</span>
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label
                                    className={`block text-xs font-bold mb-1.5 ${
                                        isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'
                                    }`}
                                >
                                    Pilih Kategori Instrumen Tes:
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-bold outline-none cursor-pointer transition-colors ${
                                        isDarkMode
                                            ? 'bg-gray-950/80 border-gray-700 text-white focus:border-indigo-500'
                                            : 'bg-white border-[#d6c5b3] text-[#1f1410] focus:border-[#b85c38]'
                                    }`}
                                >
                                    <option value="TPA">TPA (Tes Potensi Akademik - Literasi &amp; Numerasi)</option>
                                    <option value="DIAGNOSTIK">Asesmen Diagnostik Non-Kognitif (Visual, Auditori, Kinestetik)</option>
                                    <option value="SOSIAL_EMOSIONAL">Skala Sosial-Emosional (Regulasi Diri, Empati)</option>
                                    <option value="CHARACTER">Character Skills Snapshot (Grit, Kejujuran, Tanggung Jawab)</option>
                                    <option value="BIG_FIVE">Big Five Inventory (Dimensi Kepribadian)</option>
                                    <option value="WAWANCARA">Rubrik Wawancara Terstruktur (Probing &amp; 4-Level)</option>
                                </select>
                            </div>

                            <div>
                                <label
                                    className={`block text-xs font-bold mb-1.5 ${
                                        isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]'
                                    }`}
                                >
                                    Pilih File JSON Hasil Ekspor:
                                </label>
                                <input
                                    id="file-json"
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className={`block w-full text-xs rounded-xl border cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:font-extrabold file:text-xs file:bg-[#b85c38] file:text-white hover:file:bg-[#a04d2c] transition-colors ${
                                        isDarkMode
                                            ? 'text-gray-300 bg-gray-950/60 border-gray-700'
                                            : 'text-gray-700 bg-white border-[#d6c5b3]'
                                    }`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading}
                                className={`w-full py-3 mt-2 rounded-xl font-black text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 ${
                                    isDarkMode
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        : 'bg-[#b85c38] hover:bg-[#a04d2c] text-white'
                                }`}
                            >
                                <Upload className="w-4 h-4" />
                                <span>{isUploading ? 'Memproses dan Mengimport...' : 'Mulai Import Soal ke Database'}</span>
                            </button>
                        </form>
                    </div>

                    {/* Panduan & Standar Parser */}
                    <div
                        className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-xl shadow-xl flex flex-col justify-between ${
                            isDarkMode
                                ? 'bg-gray-900/80 border-gray-800'
                                : 'bg-white/90 border-[#d6c5b3] shadow-[#5c4033]/10'
                        }`}
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-sm">
                                <Info className="w-4 h-4 shrink-0" />
                                <span>Petunjuk &amp; Guardrails Parser</span>
                            </div>

                            <ul className="text-xs space-y-2 opacity-85 leading-relaxed list-disc list-inside">
                                <li>
                                    File <strong>.json</strong> harus memiliki struktur yang sesuai dengan contoh template resmi.
                                </li>
                                <li>
                                    <strong>TPA</strong> membaca objek <code>tpa_literasi.soal</code> dan <code>tpa_numerasi.soal</code>.
                                </li>
                                <li>
                                    <strong>Diagnostik / Psikotes</strong> membaca array <code>butir</code> beserta skala Likert di <code>meta.skala.opsi</code>.
                                </li>
                                <li>
                                    <strong>Wawancara</strong> membaca array <code>pertanyaan</code> yang menyertakan <code>probing</code> dan <code>rubrik</code> 4-level.
                                </li>
                                <li className="text-rose-600 dark:text-rose-400 font-semibold">
                                    Import baru akan <strong>mengganti seluruh soal lama</strong> pada kategori yang dipilih.
                                </li>
                            </ul>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                            <span className="text-[11px] font-bold block mb-2 opacity-75">
                                Unduh Template JSON Siap Pakai:
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadTemplate('TPA')}
                                    className="p-1.5 rounded-lg border text-left font-semibold hover:bg-black/5 dark:hover:bg-white/5 truncate"
                                >
                                    &bull; Template TPA
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadTemplate('DIAGNOSTIK')}
                                    className="p-1.5 rounded-lg border text-left font-semibold hover:bg-black/5 dark:hover:bg-white/5 truncate"
                                >
                                    &bull; Diagnostik
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadTemplate('SOSIAL_EMOSIONAL')}
                                    className="p-1.5 rounded-lg border text-left font-semibold hover:bg-black/5 dark:hover:bg-white/5 truncate"
                                >
                                    &bull; Sosio-Emosional
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadTemplate('WAWANCARA')}
                                    className="p-1.5 rounded-lg border text-left font-semibold hover:bg-black/5 dark:hover:bg-white/5 truncate"
                                >
                                    &bull; Rubrik Wawancara
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL PRATINJAU DAFTAR BUTIR SOAL */}
            {previewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4">
                    <div
                        className={`w-full max-w-4xl h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                            isDarkMode
                                ? 'bg-gray-900 border-gray-800 text-white'
                                : 'bg-[#fffdf9] border-[#cbb7a2] text-[#1f1410]'
                        }`}
                    >
                        {/* Header Modal */}
                        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-black/5 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                                        <span>Pratinjau Bank Soal: {previewCategory}</span>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                                            {filteredQuestions.length} Butir
                                        </span>
                                    </h3>
                                    <p className="text-xs opacity-75">
                                        Daftar butir soal aktif yang tersimpan dan digunakan pada sesi ujian CBT peserta.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPreviewModalOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Filter & Search Bar di Modal */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari teks pertanyaan atau kode soal..."
                                    className={`w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border outline-none ${
                                        isDarkMode
                                            ? 'bg-gray-950 border-gray-700 text-white focus:border-indigo-500'
                                            : 'bg-white border-[#d6c5b3] text-[#1f1410] focus:border-[#b85c38]'
                                    }`}
                                />
                            </div>

                            {/* Filter Dimensi Khusus TPA (Literasi vs Numerasi) */}
                            {previewCategory === 'TPA' && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold opacity-75 hidden sm:inline">Dimensi:</span>
                                    {['ALL', 'Literasi', 'Numerasi'].map((dim) => (
                                        <button
                                            key={dim}
                                            type="button"
                                            onClick={() => handleFilterDimension(dim)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                                                previewDimension === dim
                                                    ? 'bg-teal-600 border-teal-500 text-white shadow-sm'
                                                    : isDarkMode
                                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                                                    : 'bg-[#faf4ec] hover:bg-[#efe4d6] border-[#d6c5b3] text-[#2b1d18]'
                                            }`}
                                        >
                                            {dim === 'ALL' ? 'Semua' : dim}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => handleDownloadTemplate(previewCategory)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#b85c38] hover:bg-[#a04d2c] text-white shrink-0 shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh Template</span>
                            </button>
                        </div>

                        {/* List Butir Soal */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                            {isLoadingQuestions ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-[#b85c38] border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="font-semibold text-sm">Memuat daftar butir soal...</p>
                                </div>
                            ) : filteredQuestions.length === 0 ? (
                                <div className="py-20 text-center opacity-70">
                                    <p className="text-sm font-semibold">
                                        Tidak ada butir soal yang ditemukan pada filter saat ini.
                                    </p>
                                </div>
                            ) : (
                                filteredQuestions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            isDarkMode
                                                ? 'bg-gray-950/60 border-gray-800'
                                                : 'bg-white border-[#d6c5b3] shadow-xs'
                                        }`}
                                    >
                                        {/* Header Soal */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-[#b85c38]/15 dark:bg-teal-500/20 text-[#8f3f20] dark:text-teal-300 font-black text-xs flex items-center justify-center font-mono">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-mono text-xs font-bold opacity-80">
                                                    {q.question_code || `ID-${q.id}`}
                                                </span>
                                                {q.dimension && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                                                        {q.dimension}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                    {q.type}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {q.correct_answer && (
                                                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1">
                                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                        Kunci: {q.correct_answer}
                                                    </span>
                                                )}
                                                {q.is_favorable !== null && (
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            q.is_favorable
                                                                ? 'bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-300'
                                                                : 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        {q.is_favorable ? 'Favorable' : 'Unfavorable'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Teks Soal */}
                                        <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap leading-relaxed mb-3">
                                            {q.question_text}
                                        </p>

                                        {/* Pilihan Jawaban / Opsi */}
                                        {q.options && (
                                            <div className="mt-2 space-y-1.5 text-xs">
                                                {/* Pilihan Berganda (MC) */}
                                                {q.type === 'MC' && typeof q.options === 'object' && !Array.isArray(q.options) && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {Object.entries(q.options).map(([key, val]) => {
                                                            const isCorrect = q.correct_answer === key;
                                                            return (
                                                                <div
                                                                    key={key}
                                                                    className={`p-2 rounded-xl border flex items-start gap-2 ${
                                                                        isCorrect
                                                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-200'
                                                                            : 'bg-black/5 dark:bg-white/5 border-transparent'
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className={`w-5 h-5 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                                                                            isCorrect
                                                                                ? 'bg-emerald-600 text-white'
                                                                                : 'bg-black/10 dark:bg-white/10'
                                                                        }`}
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                    <span className="leading-snug">{String(val)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Skala Likert (Array opsi) */}
                                                {Array.isArray(q.options) && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {q.options.map((opt: any, optIdx: number) => (
                                                            <span
                                                                key={optIdx}
                                                                className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] font-semibold"
                                                            >
                                                                {opt.nilai ? `${opt.nilai}: ` : ''}
                                                                {opt.label || String(opt)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Rubrik Wawancara (Probing & Rubrik 4 Level) */}
                                                {q.type === 'RUBRIC' && typeof q.options === 'object' && (
                                                    <div className="space-y-2 pt-1">
                                                        {/* Probing */}
                                                        {Array.isArray(q.options.probing) && q.options.probing.length > 0 && (
                                                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px]">
                                                                <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
                                                                    Pertanyaan Pendalaman (Probing):
                                                                </span>
                                                                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                                                                    {q.options.probing.map((probe: string, pIdx: number) => (
                                                                        <li key={pIdx}>{probe}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {/* 4 Level Rubrik */}
                                                        {q.options.rubrik && typeof q.options.rubrik === 'object' && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                                                {[1, 2, 3, 4].map((lvl) => {
                                                                    const desc = q.options.rubrik[`level_${lvl}`];
                                                                    return (
                                                                        <div
                                                                            key={lvl}
                                                                            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800"
                                                                        >
                                                                            <span className="font-bold text-teal-700 dark:text-teal-400 block mb-0.5">
                                                                                Level {lvl}
                                                                            </span>
                                                                            <p className="opacity-80 leading-relaxed">
                                                                                {desc || '-'}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end shrink-0 bg-black/5 dark:bg-white/5">
                            <button
                                type="button"
                                onClick={() => setPreviewModalOpen(false)}
                                className="px-5 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs transition-colors"
                            >
                                Tutup Pratinjau
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
