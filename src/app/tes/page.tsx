//src/app/tes/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Flag,
    Camera,
    CameraOff,
    Check,
    ChevronLeft,
    ChevronRight,
    Send,
    HelpCircle,
    User,
    Calendar,
    LogOut,
    Sparkles,
    ShieldAlert,
    RefreshCw,
    X
} from 'lucide-react';

type Question = {
    id: number;
    category: string;
    dimension: string;
    type: string;
    question_text: string;
    options: any;
};

const TEST_INSTRUCTIONS: Record<string, string> = {
    'DIAGNOSTIK': "Bacalah setiap pernyataan dengan teliti. Pilihlah satu jawaban yang paling menggambarkan keadaan dirimu dalam DUA MINGGU TERAKHIR. Tidak ada jawaban benar atau salah.",
    'SOSIAL_EMOSIONAL': "Bacalah setiap pernyataan dengan teliti. Bayangkan situasi yang biasa kamu alami di sekolah dan di rumah dalam SATU BULAN TERAKHIR. Pilihlah jawaban yang paling menggambarkan dirimu.",
    'CHARACTER': "Pikirkan dirimu dalam SITUASI BELAJAR DI SEKOLAH selama SATU SEMESTER TERAKHIR. Baca setiap pernyataan, lalu pilih satu angka dari 1 sampai 5 yang paling menggambarkan dirimu.",
    'BIG_FIVE': "Berikut adalah beberapa pernyataan tentang diri kamu. Bacalah setiap pernyataan, lalu pilih satu angka dari 1 (Sangat Tidak Setuju) sampai 5 (Sangat Setuju). Jawablah dengan jujur.",
    'TPA': "Kerjakan seluruh soal secara mandiri. Setiap soal memiliki satu jawaban benar. Tidak ada pengurangan nilai untuk jawaban salah, jadi usahakan menjawab semua soal."
};

export default function ExamPage() {
    const { isDarkMode } = useTheme();

    const [nisn, setNisn] = useState('');
    const [namaSiswa, setNamaSiswa] = useState(''); // Untuk Watermark
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [loginError, setLoginError] = useState('');

    const [step, setStep] = useState<'login' | 'intro' | 'exam' | 'done'>('login');
    const [applicantId, setApplicantId] = useState<number | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [activeTests, setActiveTests] = useState<string[]>([]);
    const [testCategory, setTestCategory] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // State & Ref untuk Kamera
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');

    // State Pelanggaran
    const [violations, setViolations] = useState(0);

    // 1. Ambil pengaturan tes aktif
    useEffect(() => {
        fetch('/api/settings', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.settings && data.settings.active_tests) {
                    const tests = data.settings.active_tests;
                    setActiveTests(tests);
                    if (tests.length > 0) setTestCategory(tests[0]);
                }
            });
    }, []);

    // Muat / Simpan Flag Ragu-Ragu dari LocalStorage
    useEffect(() => {
        if (applicantId && testCategory) {
            try {
                const key = `exam_flags_${applicantId}_${testCategory}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    setFlaggedQuestions(JSON.parse(saved));
                }
            } catch (e) {
                // ignore
            }
        }
    }, [applicantId, testCategory]);

    const toggleFlag = (questionId: number) => {
        setFlaggedQuestions(prev => {
            const updated = { ...prev, [questionId]: !prev[questionId] };
            if (!updated[questionId]) {
                delete updated[questionId];
            }
            if (applicantId && testCategory) {
                try {
                    localStorage.setItem(`exam_flags_${applicantId}_${testCategory}`, JSON.stringify(updated));
                } catch (e) {
                    // ignore
                }
            }
            return updated;
        });
    };

    // 2. Timer Ujian
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 'exam' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleFinishExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    // 3. ANTI-CHEAT: Blokir Copy, Paste, Klik Kanan, & Shortcut
    useEffect(() => {
        if (step !== 'exam') return;

        const preventDefault = (e: Event) => e.preventDefault();

        const preventCopy = (e: Event) => {
            e.preventDefault();
            toast.error('Dilarang menyalin teks soal ujian!', { icon: '🚫' });
        };

        const preventKey = (e: KeyboardEvent) => {
            // Blokir Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, F12
            if ((e.ctrlKey && ['c', 'v', 'u', 'p'].includes(e.key.toLowerCase())) || e.key === 'F12') {
                e.preventDefault();
                toast.error('Kombinasi tombol pintasan diblokir selama ujian!', { icon: '🚫' });
            }
        };

        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('copy', preventCopy);
        document.addEventListener('cut', preventCopy);
        document.addEventListener('paste', preventDefault);
        window.addEventListener('keydown', preventKey);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('copy', preventCopy);
            document.removeEventListener('cut', preventCopy);
            document.removeEventListener('paste', preventDefault);
            window.removeEventListener('keydown', preventKey);
        };
    }, [step]);

    // 4. ANTI-CHEAT: Deteksi Pindah Tab / Window
    useEffect(() => {
        if (step !== 'exam') return;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                setViolations(prev => prev + 1);
                toast.error('PERINGATAN: Jangan berpindah tab atau aplikasi selama ujian berlangsung!', {
                    duration: 5000,
                    icon: '⚠️',
                    style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                });

                // KIRIM KE DATABASE
                await fetch('/api/exam/log-violation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        applicant_id: applicantId,
                        category: testCategory,
                        type: 'Pindah Tab / Aplikasi Lain'
                    })
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [step, applicantId, testCategory]);

    // 5. Webcam Proctoring (Snapshot berkala 2 menit)
    useEffect(() => {
        let stream: MediaStream | null = null;
        let interval: NodeJS.Timeout;

        if (step === 'exam') {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then((s) => {
                    stream = s;
                    setCameraActive(true);
                    setCameraError('');
                    if (videoRef.current) videoRef.current.srcObject = s;

                    interval = setInterval(async () => {
                        if (videoRef.current && canvasRef.current) {
                            const video = videoRef.current;
                            const canvas = canvasRef.current;

                            if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext('2d');

                                if (ctx) {
                                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                    const base64Data = canvas.toDataURL('image/jpeg', 0.5);

                                    await fetch('/api/exam/snapshot', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            applicant_id: applicantId,
                                            category: testCategory,
                                            image_url: base64Data
                                        })
                                    });
                                }
                            }
                        }
                    }, 120000); // 2 menit
                })
                .catch(() => {
                    setCameraActive(false);
                    setCameraError('Akses webcam tidak diizinkan. Mohon izinkan kamera untuk pengawasan ujian.');
                });
        }

        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (interval) clearInterval(interval);
        };
    }, [step, applicantId, testCategory]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testCategory) {
            setLoginError('Panitia belum mengaktifkan kategori tes.');
            return;
        }
        setIsLoading(true);
        setLoginError('');

        try {
            const res = await fetch('/api/exam/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({ nisn, tanggal_lahir: tanggalLahir, category: testCategory }),
            });
            const data = await res.json();

            if (!res.ok) {
                setLoginError(data.error);
            } else {
                setApplicantId(data.applicant_id);
                setQuestions(data.questions);
                setTimeLeft(data.remainingSeconds);
                setNamaSiswa(data.full_name || 'Peserta');

                const savedAnswers: Record<number, string> = {};
                data.existingAnswers?.forEach((ans: any) => {
                    savedAnswers[ans.question_id] = ans.answer_value;
                });
                setAnswers(savedAnswers);
                setStep('intro');
            }
        } catch {
            setLoginError('Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAnswer = async (questionId: number, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        setSaveStatus('saving');

        if (applicantId) {
            try {
                const res = await fetch('/api/exam/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicant_id: applicantId, question_id: questionId, answer_value: value }),
                });
                if (res.ok) {
                    setSaveStatus('saved');
                } else {
                    setSaveStatus('error');
                }
            } catch {
                setSaveStatus('error');
            }
        }
    };

    const handleFinishExam = async () => {
        setShowConfirmModal(false);
        const loadingToast = toast.loading('Mengumpulkan dan memproses nilai ujian...');
        setIsLoading(true);
        try {
            const res = await fetch('/api/exam/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: applicantId, category: testCategory }),
            });

            if (res.ok) {
                toast.success('Ujian berhasil dikumpulkan!', { id: loadingToast });
                // Bersihkan flag lokal setelah selesai
                if (applicantId && testCategory) {
                    try {
                        localStorage.removeItem(`exam_flags_${applicantId}_${testCategory}`);
                    } catch (e) {
                        // ignore
                    }
                }
                setStep('done');
            } else {
                toast.error('Gagal memproses nilai ujian.', { id: loadingToast });
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan saat mengumpulkan ujian.', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Statistik Pengerjaan
    const stats = useMemo(() => {
        const total = questions.length;
        const answered = Object.keys(answers).length;
        const flagged = Object.keys(flaggedQuestions).length;
        const unanswered = Math.max(0, total - answered);
        return { total, answered, flagged, unanswered };
    }, [questions, answers, flaggedQuestions]);

    // Typography class berdasarkan fontSize
    const questionTextCls = useMemo(() => {
        if (fontSize === 'xlarge') return 'text-xl sm:text-2xl leading-relaxed';
        if (fontSize === 'large') return 'text-lg sm:text-xl leading-relaxed';
        return 'text-base sm:text-lg leading-relaxed';
    }, [fontSize]);

    const optionTextCls = useMemo(() => {
        if (fontSize === 'xlarge') return 'text-base sm:text-lg';
        if (fontSize === 'large') return 'text-sm sm:text-base';
        return 'text-xs sm:text-sm';
    }, [fontSize]);

    // Tema styling
    const bgApp = isDarkMode
        ? 'bg-linear-to-br from-gray-950 via-gray-900 to-slate-950 text-gray-100'
        : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] text-[#1f1410]';

    const cardGlass = isDarkMode
        ? 'bg-gray-900/85 border-gray-800 backdrop-blur-xl shadow-2xl'
        : 'bg-[#fffdfa]/95 border-white backdrop-blur-xl shadow-2xl shadow-[#5c4033]/25';

    return (
        <div className={`min-h-screen font-sans ${bgApp} transition-colors duration-300`}>
            <Toaster position="top-center" />

            {/* Elemen Kamera Tersembunyi untuk Snapshot */}
            <div className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} />
            </div>

            {/* ================= STEP 1: LOGIN ================= */}
            {step === 'login' && (
                <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative">
                    <div className="absolute top-4 right-4 z-20">
                        <ThemeToggle />
                    </div>

                    <div className={`w-full max-w-md p-7 sm:p-9 rounded-3xl border ${cardGlass}`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Sparkles className="w-6 h-6 text-[#b85c38] dark:text-teal-400" />
                            <h1 className="text-2xl font-black text-center">Portal Ujian CBT</h1>
                        </div>
                        <p className={`text-center text-xs sm:text-sm font-semibold mb-6 ${isDarkMode ? 'text-gray-400' : 'text-[#63483b]'}`}>
                            Penerimaan Siswa Baru SMK KH. A. Wahab Muhsin
                        </p>

                        {loginError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold mb-4">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{loginError}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold mb-1.5">Kategori Ujian Aktif</label>
                                <select
                                    value={testCategory}
                                    onChange={(e) => setTestCategory(e.target.value)}
                                    className={`w-full p-3 rounded-xl border font-bold text-xs sm:text-sm outline-none cursor-pointer ${
                                        isDarkMode ? 'bg-gray-950 border-gray-700 text-white' : 'bg-white border-[#d6c5b3] text-[#1f1410]'
                                    }`}
                                >
                                    {activeTests.length === 0 && <option value="">Belum ada kategori tes yang diaktifkan</option>}
                                    {activeTests.map(t => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold mb-1.5">Nomor Induk Siswa Nasional (NISN)</label>
                                <input
                                    type="text"
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    placeholder="10 digit NISN Anda"
                                    maxLength={10}
                                    required
                                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-mono font-bold outline-none ${
                                        isDarkMode ? 'bg-gray-950 border-gray-700 text-white' : 'bg-white border-[#d6c5b3] text-[#1f1410]'
                                    }`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold mb-1.5">Tanggal Lahir</label>
                                <input
                                    type="date"
                                    value={tanggalLahir}
                                    onChange={(e) => setTanggalLahir(e.target.value)}
                                    required
                                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-bold outline-none ${
                                        isDarkMode ? 'bg-gray-950 border-gray-700 text-white' : 'bg-white border-[#d6c5b3] text-[#1f1410]'
                                    }`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || activeTests.length === 0}
                                className={`w-full py-3.5 mt-2 rounded-xl font-black text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white ${
                                    isDarkMode
                                        ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-950/50'
                                        : 'bg-[#b85c38] hover:bg-[#a04d2c] shadow-[#b85c38]/30'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Memverifikasi Data...</span>
                                    </>
                                ) : (
                                    <span>Masuk Ujian CBT</span>
                                )}
                            </button>
                        </form>
                    </div>
                </main>
            )}

            {/* ================= STEP 2: INTRO & TATA TERTIB ================= */}
            {step === 'intro' && (
                <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative">
                    <div className="absolute top-4 right-4 z-20">
                        <ThemeToggle />
                    </div>

                    <div className={`w-full max-w-2xl p-7 sm:p-10 rounded-3xl border ${cardGlass}`}>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black">Petunjuk &amp; Tata Tertib Ujian</h1>
                                <p className="text-xs text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                                    Peserta: {namaSiswa} ({nisn}) &bull; Kategori: {testCategory.replace(/_/g, ' ')}
                                </p>
                            </div>
                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#b85c38]/15 text-[#8f3f20] dark:bg-teal-500/20 dark:text-teal-300">
                                CBT System
                            </span>
                        </div>

                        <div className={`p-4 rounded-2xl border mb-5 text-xs sm:text-sm leading-relaxed italic ${
                            isDarkMode ? 'bg-gray-950/70 border-gray-800 text-gray-200' : 'bg-[#faf4ec] border-[#d6c5b3] text-[#4a352b]'
                        }`}>
                            &ldquo;{TEST_INSTRUCTIONS[testCategory] || "Bacalah setiap butir soal dengan teliti dan jawablah dengan jujur sesuai kemampuan terbaik Anda."}&rdquo;
                        </div>

                        <ul className="text-xs sm:text-sm space-y-2.5 mb-7 opacity-90 leading-relaxed">
                            <li className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                                <span>Jumlah soal sebanyak <strong>{questions.length} butir</strong> dengan estimasi waktu <strong>{Math.ceil(timeLeft / 60)} menit</strong>.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                                <span>Jawaban tersimpan otomatis secara real-time setiap kali Anda memilih opsi jawaban.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                                <span>Anda dapat menandai nomor tertentu sebagai <strong>&quot;Ragu-ragu&quot;</strong> dan kembali memeriksanya melalui panel navigasi.</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-rose-600 dark:text-rose-400 font-bold">
                                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>DILARANG berpindah tab browser, menyalin teks, atau membuka aplikasi lain. Setiap aktivitas keluar tab akan dicatat sebagai pelanggaran oleh sistem proctoring.</span>
                            </li>
                        </ul>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep('login')}
                                className="w-1/3 py-3.5 rounded-xl font-bold text-xs sm:text-sm border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('exam')}
                                className="w-2/3 py-3.5 rounded-xl font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:-translate-y-0.5"
                            >
                                Mulai Mengerjakan Ujian &rarr;
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {/* ================= STEP 3: AREA UJIAN CBT ================= */}
            {step === 'exam' && questions.length > 0 && (
                <main className="min-h-screen flex flex-col relative select-none">
                    {/* WATERMARK DINAMIS ANTI SCREENSHOT */}
                    <div className="fixed inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.025] overflow-hidden z-0 flex flex-wrap gap-12 p-4 justify-center items-center transform -rotate-12">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <span key={i} className="text-3xl sm:text-4xl font-black whitespace-nowrap text-black dark:text-white">
                                {namaSiswa} &bull; {nisn} &bull; {testCategory}
                            </span>
                        ))}
                    </div>

                    {/* HEADER UJIAN STICKY */}
                    <header className={`sticky top-0 z-20 px-4 sm:px-6 py-3 border-b shadow-sm backdrop-blur-md transition-colors ${
                        isDarkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/95 border-[#d6c5b3]'
                    }`}>
                        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                            {/* Judul & Status Peserta */}
                            <div className="flex items-center gap-3">
                                <div>
                                    <h1 className="font-extrabold text-sm sm:text-base leading-tight">
                                        {testCategory.replace(/_/g, ' ')}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-75">
                                        <span>Soal {currentIdx + 1} dari {questions.length}</span>
                                        <span>&bull;</span>
                                        <span className="font-mono">{namaSiswa}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bar Tengah: Indikator Auto-Save & Kamera */}
                            <div className="hidden md:flex items-center gap-3">
                                <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                                    saveStatus === 'saving'
                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 animate-pulse'
                                        : saveStatus === 'error'
                                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300'
                                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
                                }`}>
                                    {saveStatus === 'saving' ? (
                                        <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : saveStatus === 'error' ? (
                                        <>
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>Gagal simpan</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3 h-3" />
                                            <span>Jawaban Tersimpan</span>
                                        </>
                                    )}
                                </div>

                                <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                                    cameraActive
                                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300'
                                        : 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300'
                                }`}>
                                    {cameraActive ? (
                                        <>
                                            <Camera className="w-3.5 h-3.5" />
                                            <span>Proctoring Aktif</span>
                                        </>
                                    ) : (
                                        <>
                                            <CameraOff className="w-3.5 h-3.5" />
                                            <span>Kamera Mati</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Sisi Kanan: Timer & Pelanggaran */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                {violations > 0 && (
                                    <div className="px-2.5 py-1 rounded-xl font-bold text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{violations} Pelanggaran</span>
                                    </div>
                                )}

                                <div className={`px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-black flex items-center gap-1.5 shadow-xs ${
                                    timeLeft < 300
                                        ? 'bg-rose-600 text-white animate-pulse'
                                        : isDarkMode
                                        ? 'bg-gray-800 text-teal-300 border border-gray-700'
                                        : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                }`}>
                                    <Clock className="w-4 h-4 shrink-0" />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>

                                <ThemeToggle />
                            </div>
                        </div>
                    </header>

                    {/* BANNER PERINGATAN KAMERA BILA ERROR */}
                    {cameraError && (
                        <div className="bg-rose-600 text-white text-xs sm:text-sm font-bold py-2 px-4 text-center flex items-center justify-center gap-2">
                            <CameraOff className="w-4 h-4" />
                            <span>{cameraError}</span>
                        </div>
                    )}

                    {/* KONTEN UTAMA: 2 KOLOM (SOAL + SIDEBAR NAVIGASI) */}
                    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* KOLOM UTAMA (SOAL & OPSI JAWABAN) */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className={`p-5 sm:p-8 rounded-3xl border shadow-lg transition-colors ${
                                isDarkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-[#d6c5b3]'
                            }`}>
                                {/* Bar Pengatur Huruf & Tombol Ragu-ragu */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5">
                                            No. {currentIdx + 1}
                                        </span>
                                        {questions[currentIdx].dimension && (
                                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300">
                                                {questions[currentIdx].dimension}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Pengatur Ukuran Font */}
                                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl text-xs font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setFontSize('normal')}
                                                className={`px-2 py-1 rounded-lg transition-colors ${fontSize === 'normal' ? 'bg-[#b85c38] dark:bg-teal-600 text-white' : 'opacity-70 hover:opacity-100'}`}
                                                title="Ukuran Font Normal"
                                            >
                                                A
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFontSize('large')}
                                                className={`px-2 py-1 rounded-lg transition-colors ${fontSize === 'large' ? 'bg-[#b85c38] dark:bg-teal-600 text-white' : 'opacity-70 hover:opacity-100'}`}
                                                title="Ukuran Font Besar"
                                            >
                                                A+
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFontSize('xlarge')}
                                                className={`px-2 py-1 rounded-lg transition-colors ${fontSize === 'xlarge' ? 'bg-[#b85c38] dark:bg-teal-600 text-white' : 'opacity-70 hover:opacity-100'}`}
                                                title="Ukuran Font Sangat Besar"
                                            >
                                                A++
                                            </button>
                                        </div>

                                        {/* Tombol Tandai Ragu-ragu */}
                                        <button
                                            type="button"
                                            onClick={() => toggleFlag(questions[currentIdx].id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                                                flaggedQuestions[questions[currentIdx].id]
                                                    ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                                                    : isDarkMode
                                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                                                    : 'bg-[#faf4ec] hover:bg-[#efe4d6] border-[#d6c5b3] text-[#4a352b]'
                                            }`}
                                        >
                                            <Flag className="w-3.5 h-3.5" />
                                            <span>{flaggedQuestions[questions[currentIdx].id] ? 'Ragu-ragu (Ditandai)' : 'Tandai Ragu-ragu'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Teks Pertanyaan Soal */}
                                <div className={`font-medium mb-6 whitespace-pre-wrap ${questionTextCls}`}>
                                    {questions[currentIdx].question_text}
                                </div>

                                {/* Opsi Jawaban (Pilihan Ganda / Likert) */}
                                <div className="space-y-3">
                                    {/* Pilihan Berganda (MC) */}
                                    {questions[currentIdx].type === 'MC' && questions[currentIdx].options && Object.entries(questions[currentIdx].options).map(([key, val]) => {
                                        const isSelected = answers[questions[currentIdx].id] === key;
                                        return (
                                            <label
                                                key={key}
                                                className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-[#b85c38] dark:border-teal-500 bg-[#b85c38]/10 dark:bg-teal-500/15 shadow-sm'
                                                        : isDarkMode
                                                        ? 'border-gray-800 hover:border-gray-700 bg-gray-950/40'
                                                        : 'border-[#dfd2c4] hover:border-[#b85c38]/50 bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${questions[currentIdx].id}`}
                                                    value={key}
                                                    checked={isSelected}
                                                    onChange={() => handleSelectAnswer(questions[currentIdx].id, key)}
                                                    className="w-4 h-4 mt-1 mr-3.5 accent-[#b85c38] dark:accent-teal-500 shrink-0"
                                                />
                                                <div className={optionTextCls}>
                                                    <span className="font-extrabold mr-2">{key}.</span>
                                                    <span className="leading-relaxed">{val as string}</span>
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {/* Skala Likert */}
                                    {questions[currentIdx].type === 'LIKERT' && questions[currentIdx].options && Object.entries(questions[currentIdx].options).map(([key, val]: any) => {
                                        const optionValue = String(val.nilai ?? key);
                                        const isSelected = answers[questions[currentIdx].id] === optionValue;
                                        return (
                                            <label
                                                key={key}
                                                className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-[#b85c38] dark:border-teal-500 bg-[#b85c38]/10 dark:bg-teal-500/15 shadow-sm'
                                                        : isDarkMode
                                                        ? 'border-gray-800 hover:border-gray-700 bg-gray-950/40'
                                                        : 'border-[#dfd2c4] hover:border-[#b85c38]/50 bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${questions[currentIdx].id}`}
                                                    value={optionValue}
                                                    checked={isSelected}
                                                    onChange={() => handleSelectAnswer(questions[currentIdx].id, optionValue)}
                                                    className="w-4 h-4 mt-1 mr-3.5 accent-[#b85c38] dark:accent-teal-500 shrink-0"
                                                />
                                                <span className={`font-semibold leading-relaxed ${optionTextCls}`}>
                                                    {val.teks || val.label || val}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tombol Navigasi Bawah */}
                            <div className="flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                    disabled={currentIdx === 0}
                                    className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center gap-1.5 disabled:opacity-40 ${
                                        isDarkMode
                                            ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                            : 'bg-white hover:bg-[#faf5ef] border-[#d6c5b3] text-[#2b1d18]'
                                    }`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Sebelumnya</span>
                                </button>

                                {currentIdx === questions.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmModal(true)}
                                        className="px-6 py-3 rounded-2xl font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Selesai &amp; Kumpulkan</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                                        className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-1.5 text-white ${
                                            isDarkMode
                                                ? 'bg-teal-600 hover:bg-teal-500'
                                                : 'bg-[#b85c38] hover:bg-[#a04d2c]'
                                        }`}
                                    >
                                        <span>Selanjutnya</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* KOLOM SIDEBAR (NAVIGASI NOMOR SOAL & STATUS) */}
                        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
                            <div className={`p-5 rounded-3xl border shadow-lg ${
                                isDarkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-[#d6c5b3]'
                            }`}>
                                <h3 className="font-extrabold text-xs uppercase tracking-wider mb-3">
                                    Navigasi Lembar Jawaban
                                </h3>

                                {/* Ringkasan Status Soal */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60">
                                        <span className="block font-mono font-black text-base text-emerald-700 dark:text-emerald-400">
                                            {stats.answered}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Dijawab</span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60">
                                        <span className="block font-mono font-black text-base text-amber-700 dark:text-amber-400">
                                            {stats.flagged}
                                        </span>
                                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Ragu-ragu</span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800">
                                        <span className="block font-mono font-black text-base opacity-80">
                                            {stats.unanswered}
                                        </span>
                                        <span className="text-[10px] font-bold opacity-75">Kosong</span>
                                    </div>
                                </div>

                                {/* Grid Nomor Soal */}
                                <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
                                    {questions.map((q, idx) => {
                                        const isAnswered = answers[q.id] !== undefined;
                                        const isFlagged = Boolean(flaggedQuestions[q.id]);
                                        const isCurrent = currentIdx === idx;

                                        return (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setCurrentIdx(idx)}
                                                className={`relative h-10 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center ${
                                                    isCurrent
                                                        ? 'ring-2 ring-offset-2 ring-[#b85c38] dark:ring-teal-400 font-black scale-105'
                                                        : ''
                                                } ${
                                                    isFlagged
                                                        ? 'bg-amber-500 text-white shadow-sm'
                                                        : isAnswered
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : isDarkMode
                                                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                                        : 'bg-[#faf4ec] hover:bg-[#efe4d6] border border-[#d6c5b3] text-[#2b1d18]'
                                                }`}
                                            >
                                                <span>{idx + 1}</span>
                                                {isFlagged && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-amber-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Tombol Selesai Cepat */}
                                <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmModal(true)}
                                        className="w-full py-3 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Kumpulkan Ujian Sekarang</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* ================= STEP 4: SELESAI ================= */}
            {step === 'done' && (
                <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative">
                    <div className="absolute top-4 right-4 z-20">
                        <ThemeToggle />
                    </div>

                    <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl border text-center ${cardGlass}`}>
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-black mb-1.5">Ujian Selesai!</h1>
                        <p className={`text-xs sm:text-sm font-semibold mb-6 ${isDarkMode ? 'text-gray-400' : 'text-[#63483b]'}`}>
                            Jawaban Anda untuk kategori <strong>{testCategory.replace(/_/g, ' ')}</strong> telah berhasil tersimpan dan diproses oleh sistem.
                        </p>

                        <div className={`p-4 rounded-2xl border text-xs text-left space-y-2 mb-6 ${
                            isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'
                        }`}>
                            <div className="flex justify-between">
                                <span className="opacity-75">Nama Siswa:</span>
                                <span className="font-bold">{namaSiswa}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-75">NISN:</span>
                                <span className="font-mono font-bold">{nisn}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-75">Status:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">Terkumpul Lengkap</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.location.href = '/cek-status'}
                            className={`w-full py-3.5 rounded-xl font-extrabold text-sm text-white shadow-lg transition-transform hover:-translate-y-0.5 ${
                                isDarkMode
                                    ? 'bg-teal-600 hover:bg-teal-500'
                                    : 'bg-[#b85c38] hover:bg-[#a04d2c]'
                            }`}
                        >
                            Lihat Status Pendaftaran &rarr;
                        </button>
                    </div>
                </main>
            )}

            {/* ================= MODAL KONFIRMASI PENGUMPULAN UJIAN ================= */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md p-6 sm:p-7 rounded-3xl border shadow-2xl ${
                        isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-[#d6c5b3] text-[#1f1410]'
                    }`}>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-base font-black flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-amber-500" />
                                <span>Konfirmasi Kumpulkan Ujian</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Ringkasan Status Soal di Modal */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                                <span className="block font-mono font-black text-lg text-emerald-700 dark:text-emerald-400">
                                    {stats.answered}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Terjawab</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                                <span className="block font-mono font-black text-lg text-amber-700 dark:text-amber-400">
                                    {stats.flagged}
                                </span>
                                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Ragu-ragu</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                                <span className="block font-mono font-black text-lg text-rose-700 dark:text-rose-400">
                                    {stats.unanswered}
                                </span>
                                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Kosong</span>
                            </div>
                        </div>

                        {/* Peringatan jika ada soal belum dijawab / masih ragu-ragu */}
                        {(stats.unanswered > 0 || stats.flagged > 0) && (
                            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs mb-4 leading-relaxed">
                                <strong>Perhatian:</strong> Masih terdapat <strong>{stats.unanswered} soal kosong</strong> dan <strong>{stats.flagged} soal ragu-ragu</strong>. Pastikan Anda telah memeriksa kembali seluruh jawaban sebelum mengumpulkan.
                            </div>
                        )}

                        <p className="text-xs opacity-80 mb-5 leading-relaxed">
                            Setelah tombol &quot;Ya, Kumpulkan Ujian&quot; ditekan, lembar jawaban akan ditutup dan Anda tidak dapat mengubah jawaban lagi.
                        </p>

                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="w-1/3 py-2.5 rounded-xl font-bold text-xs border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                Periksa Lagi
                            </button>
                            <button
                                type="button"
                                onClick={handleFinishExam}
                                className="w-2/3 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                            >
                                Ya, Kumpulkan Ujian
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
