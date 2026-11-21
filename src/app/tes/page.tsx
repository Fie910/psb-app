//src/app/tes/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';

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
    const [nisn, setNisn] = useState('');
    const [namaSiswa, setNamaSiswa] = useState(''); // Untuk Watermark
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [loginError, setLoginError] = useState('');

    const [step, setStep] = useState<'login' | 'intro' | 'exam' | 'done'>('login');
    const [applicantId, setApplicantId] = useState<number | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [activeTests, setActiveTests] = useState<string[]>([]);
    const [testCategory, setTestCategory] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // State & Ref untuk Kamera
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
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
            toast.error('Dilarang menyalin teks soal!', { icon: '🚫' });
        };

        const preventKey = (e: KeyboardEvent) => {
            // Blokir Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, F12
            if ((e.ctrlKey && ['c', 'v', 'u', 'p'].includes(e.key.toLowerCase())) || e.key === 'F12') {
                e.preventDefault();
                toast.error('Shortcut ini diblokir selama ujian!', { icon: '🚫' });
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

    // 4. ANTI-CHEAT: Deteksi Pindah Tab
    useEffect(() => {
        if (step !== 'exam') return;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                setViolations(prev => prev + 1);
                toast.error('PERINGATAN: Jangan berpindah tab atau aplikasi selama ujian!', {
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

    // 5. Webcam Proctoring (Snapshot)
    useEffect(() => {
        let stream: MediaStream | null = null;
        let interval: NodeJS.Timeout;

        if (step === 'exam') {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then((s) => {
                    stream = s;
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
                .catch((err) => {
                    setCameraError('Akses kamera ditolak. Pastikan Anda mengizinkan kamera untuk ujian ini.');
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
            setLoginError('Panitia belum mengaktifkan tes apa pun.');
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
                // Ambil nama dari API (asumsi API fetch mengembalikan nama, jika tidak, kita set dari input atau biarkan)
                // Untuk watermark, kita bisa mem-passing nama dari API jika ada, atau pakai NISN saja
                setNamaSiswa(data.full_name);

                const savedAnswers: Record<number, string> = {};
                data.existingAnswers.forEach((ans: any) => {
                    savedAnswers[ans.question_id] = ans.answer_value;
                });
                setAnswers(savedAnswers);
                setStep('intro');
            }
        } catch (err) {
            setLoginError('Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAnswer = async (questionId: number, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        if (applicantId) {
            await fetch('/api/exam/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: applicantId, question_id: questionId, answer_value: value }),
            });
        }
    };

    const handleFinishExam = async () => {
        setShowConfirmModal(false);
        const loadingToast = toast.loading('Menghitung nilai...');
        setIsLoading(true);
        try {
            const res = await fetch('/api/exam/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: applicantId, category: testCategory }),
            });

            if (res.ok) {
                toast.success('Ujian berhasil dikumpulkan!', { id: loadingToast });
                setStep('done');
            } else {
                toast.error('Gagal memproses nilai ujian.', { id: loadingToast });
            }
        } catch (e) {
            toast.error('Terjadi kesalahan jaringan.', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <Toaster position="top-center" />

            {/* Elemen Kamera Tersembunyi */}
            <div className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} />
            </div>

            {/* ================= LOGIN ================= */}
            {step === 'login' && (
                <main className="min-h-screen flex items-center justify-center p-4 bg-[#8c7a75]">
                    <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-[#fffcf8]/90 backdrop-blur-xl">
                        <h1 className="text-2xl font-bold text-center mb-6 text-[#2b1d18]">Portal Ujian Seleksi</h1>

                        {loginError && <p className="text-red-600 text-sm font-semibold mb-4 text-center bg-red-100 p-2 rounded">{loginError}</p>}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Kategori Ujian</label>
                                <select value={testCategory} onChange={(e) => setTestCategory(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 font-semibold text-gray-900">
                                    {activeTests.length === 0 && <option value="">Belum ada tes aktif</option>}
                                    {activeTests.map(t => (
                                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">NISN</label>
                                <input type="text" value={nisn} onChange={(e) => setNisn(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 text-gray-900" required maxLength={10} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Lahir</label>
                                <input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 text-gray-900" required />
                            </div>
                            <button type="submit" disabled={isLoading || activeTests.length === 0} className="w-full py-3 mt-4 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-bold shadow-lg disabled:opacity-50">
                                {isLoading ? 'Memeriksa...' : 'Masuk Ujian'}
                            </button>
                        </form>
                    </div>
                </main>
            )}

            {/* ================= INTRO ================= */}
            {step === 'intro' && (
                <main className="min-h-screen flex items-center justify-center p-4 bg-[#8c7a75]">
                    <div className="w-full max-w-2xl p-8 sm:p-12 rounded-3xl shadow-2xl bg-[#fffcf8]/95 backdrop-blur-xl text-center">
                        <h1 className="text-3xl font-bold text-[#2b1d18] mb-4">Aturan Pengerjaan</h1>

                        <div className="bg-white/60 p-6 rounded-2xl border border-gray-200 mb-6 text-gray-800">
                            <p className="italic text-lg">{TEST_INSTRUCTIONS[testCategory] || "Bacalah setiap pernyataan dengan teliti dan jawablah dengan jujur."}</p>
                        </div>

                        <ul className="text-left text-base sm:text-lg text-gray-800 space-y-3 mb-8 bg-white/60 p-6 rounded-2xl border border-gray-200">
                            <li className="flex gap-3"><span className="font-bold text-[#b85c38]">1.</span> Ujian terdiri dari <strong>{questions.length} soal</strong>.</li>
                            <li className="flex gap-3"><span className="font-bold text-[#b85c38]">2.</span> Waktu pengerjaan adalah <strong>{Math.ceil(timeLeft / 60)} menit</strong>.</li>
                            <li className="flex gap-3"><span className="font-bold text-[#b85c38]">3.</span> Jawaban otomatis tersimpan saat Anda memilih opsi.</li>
                            <li className="flex gap-3"><span className="font-bold text-[#b85c38]">4.</span> Waktu akan berjalan otomatis saat Anda menekan tombol di bawah.</li>
                            <li className="flex gap-3"><span className="font-bold text-[#b85c38]">5.</span> Jika waktu habis, ujian akan terkumpul secara otomatis.</li>
                            <li className="flex gap-3 text-red-600 font-bold"><span className="font-bold">6.</span> DILARANG berpindah tab, menyalin soal, atau melakukan kecurangan. Sistem akan mencatat pelanggaran Anda.</li>
                        </ul>
                        <button onClick={() => setStep('exam')} className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xl shadow-lg transition-transform hover:-translate-y-1">
                            Mulai Ujian Sekarang
                        </button>
                    </div>
                </main>
            )}

            {/* ================= UJIAN ================= */}
            {step === 'exam' && questions.length > 0 && (
                <main className="min-h-screen bg-[#f5efe6] flex flex-col relative select-none">

                    {/* WATERMARK ANTI SCREENSHOT */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden z-0 flex flex-wrap gap-10 p-4 justify-center items-center transform -rotate-12">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <span key={i} className="text-4xl font-black whitespace-nowrap text-black">
                                {namaSiswa} - {testCategory}
                            </span>
                        ))}
                    </div>

                    <header className="bg-white shadow-md p-4 sticky top-0 z-10 flex justify-between items-center">
                        <div>
                            <h1 className="font-bold text-gray-800 text-lg">{testCategory.replace('_', ' ')}</h1>
                            <p className="text-xs text-gray-500">Soal {currentIdx + 1} dari {questions.length}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {violations > 0 && (
                                <div className="bg-red-100 text-red-600 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 border border-red-300">
                                    ⚠️ {violations} Pelanggaran
                                </div>
                            )}
                            <div className={`px-4 py-2 rounded-xl font-mono text-xl font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-800'}`}>
                                ⏱ {formatTime(timeLeft)}
                            </div>
                        </div>
                    </header>

                    {cameraError && (
                        <div className="bg-red-500 text-white text-center p-2 text-sm font-bold">
                            ⚠️ {cameraError}
                        </div>
                    )}

                    <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 z-10">
                        <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-lg mb-6">
                            <p className="text-lg font-medium text-gray-900 mb-6 whitespace-pre-wrap">{questions[currentIdx].question_text}</p>

                            <div className="space-y-3">
                                {questions[currentIdx].type === 'MC' && questions[currentIdx].options && Object.entries(questions[currentIdx].options).map(([key, val]) => (
                                    <label key={key} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[questions[currentIdx].id] === key ? 'border-[#b85c38] bg-[#b85c38]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input type="radio" name={`q-${questions[currentIdx].id}`} value={key} checked={answers[questions[currentIdx].id] === key} onChange={() => handleSelectAnswer(questions[currentIdx].id, key)} className="w-5 h-5 mr-4 accent-[#b85c38]" />
                                        <span className="font-semibold text-gray-800 mr-2">{key}.</span>
                                        <span className="text-gray-700">{val as string}</span>
                                    </label>
                                ))}

                                {questions[currentIdx].type === 'LIKERT' && questions[currentIdx].options && Object.entries(questions[currentIdx].options).map(([key, val]: any) => (
                                    <label key={key} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[questions[currentIdx].id] === key ? 'border-[#b85c38] bg-[#b85c38]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input type="radio" name={`q-${questions[currentIdx].id}`} value={key} checked={answers[questions[currentIdx].id] === key} onChange={() => handleSelectAnswer(questions[currentIdx].id, key)} className="w-5 h-5 mr-4 accent-[#b85c38]" />
                                        <span className="text-gray-700 font-medium">{val.teks || val}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <button onClick={() => setCurrentIdx(prev => prev - 1)} disabled={currentIdx === 0} className="px-6 py-3 rounded-xl bg-gray-300 text-gray-700 font-bold disabled:opacity-50">
                                &larr; Sebelumnya
                            </button>

                            {currentIdx === questions.length - 1 ? (
                                <button onClick={() => setShowConfirmModal(true)} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg">
                                    Selesai & Kumpulkan
                                </button>
                            ) : (
                                <button onClick={() => setCurrentIdx(prev => prev + 1)} className="px-6 py-3 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-bold shadow-lg">
                                    Selanjutnya &rarr;
                                </button>
                            )}
                        </div>

                        <div className="mt-8 bg-white p-4 rounded-2xl shadow-lg">
                            <p className="text-sm font-bold text-gray-600 mb-3">Navigasi Soal:</p>
                            <div className="flex flex-wrap gap-2">
                                {questions.map((q, idx) => {
                                    const isAnswered = answers[q.id] !== undefined;
                                    const isCurrent = currentIdx === idx;
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => setCurrentIdx(idx)}
                                            className={`w-10 h-10 rounded-lg font-bold text-sm transition-all
                                            ${isCurrent ? 'ring-2 ring-offset-2 ring-[#b85c38]' : ''}
                                            ${isAnswered ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* ================= SELESAI ================= */}
            {step === 'done' && (
                <main className="min-h-screen flex items-center justify-center p-4 bg-[#8c7a75]">
                    <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-[#fffcf8]/90 backdrop-blur-xl text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-2xl font-bold text-[#2b1d18] mb-2">Ujian Selesai!</h1>
                        <p className="text-gray-600 mb-8">Jawaban Anda telah berhasil dikumpulkan.</p>
                        <button onClick={() => window.location.href = '/tes'} className="inline-block w-full py-3 rounded-xl bg-[#b85c38] hover:bg-[#a04d2c] text-white font-bold shadow-lg">
                            Kembali ke Menu Tes
                        </button>
                    </div>
                </main>
            )}

            {/* ================= MODAL KONFIRMASI ================= */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Selesai Mengerjakan?</h3>
                        <p className="text-gray-600 mb-6">Pastikan Anda sudah memeriksa semua jawaban. Jawaban tidak dapat diubah setelah dikumpulkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300">Batal</button>
                            <button onClick={handleFinishExam} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700">Ya, Selesai</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}