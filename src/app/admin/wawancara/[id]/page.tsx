'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { JaaSMeeting } from '@jitsi/react-sdk';
import toast, { Toaster } from 'react-hot-toast';
import { Save, ClipboardList, User, Lightbulb, Search, ArrowLeft, Video } from 'lucide-react';

type Applicant = {
    id: number;
    registration_number: string;
    full_name: string;
    asal_sekolah: string;
    school_choice: string;
    school_choice_2: string | null;
    interview_date: string | null;
    interview_time: string | null;
};

type RubricQuestion = {
    id: number;
    question_code: string;
    dimension: string;
    question_text: string;
    options: {
        rubrik?: {
            level_1?: string;
            level_2?: string;
            level_3?: string;
            level_4?: string;
        };
        probing?: string[];
    } | null;
};

const DIMENSION_WAWANCARA: Record<string, string> = {
    'D1': 'Refleksi Diri & Motivasi Belajar',
    'D2': 'Kesiapan & Regulasi Diri',
    'D3': 'Integritas & Daya Juang (Resiliensi)',
};

export default function AdminWawancaraRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const applicantId = resolvedParams.id;

    const [applicant, setApplicant] = useState<Applicant | null>(null);
    const [rubric, setRubric] = useState<RubricQuestion[]>([]);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [jaasToken, setJaasToken] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'rubrik' | 'info'>('rubrik');

    useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                setError('');

                const appRes = await fetch(`/api/admin/applicants/${applicantId}`);
                const appData = await appRes.json();
                if (!appRes.ok || !appData.applicant) {
                    setError(appData.error || 'Peserta tidak ditemukan');
                    setIsLoading(false);
                    return;
                }
                const appInfo = appData.applicant;
                setApplicant(appInfo);

                const roomName = `Wawancara-PSB-${appInfo.registration_number}`;
                const tokenRes = await fetch('/api/jaas-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomName,
                        userName: 'Panitia Wawancara',
                        isModerator: true,
                    }),
                });
                const tokenData = await tokenRes.json();
                if (tokenRes.ok && tokenData.token) {
                    setJaasToken(tokenData.token);
                } else {
                    console.error('Gagal mengambil token JaaS:', tokenData.error);
                }

                const rubricRes = await fetch('/api/admin/rubric');
                const rubricData = await rubricRes.json();
                if (rubricRes.ok && rubricData.rubric) {
                    setRubric(rubricData.rubric);
                }

                const scoreRes = await fetch(`/api/admin/interview-scores?applicant_id=${applicantId}`);
                const scoreData = await scoreRes.json();
                if (scoreRes.ok && scoreData.scores) {
                    const existing: Record<number, number> = {};
                    scoreData.scores.forEach((s: { rubric_id: number; score: number }) => {
                        existing[s.rubric_id] = s.score;
                    });
                    setScores(existing);
                }
            } catch (err) {
                console.error(err);
                setError('Terjadi kesalahan memuat data wawancara.');
            } finally {
                setIsLoading(false);
            }
        }

        if (applicantId) {
            loadData();
        }
    }, [applicantId]);

    const handleSelectScore = (questionId: number, score: number) => {
        setScores((prev) => ({
            ...prev,
            [questionId]: score,
        }));
    };

    const handleSaveScores = async () => {
        if (!applicant) return;
        setIsSaving(true);
        const loadingToast = toast.loading('Menyimpan nilai wawancara...');
        try {
            const res = await fetch('/api/admin/interview-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicant_id: applicant.id,
                    scores,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Nilai wawancara berhasil disimpan!', { id: loadingToast });
            } else {
                toast.error(data.error || 'Gagal menyimpan nilai.', { id: loadingToast });
            }
        } catch {
            toast.error('Terjadi kesalahan koneksi.', { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    const totalScore = Object.values(scores).reduce((acc, s) => acc + (Number(s) || 0), 0);
    const maxScore = (rubric.length || 12) * 4;
    const answeredCount = Object.keys(scores).length;

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-semibold text-teal-300">Menyiapkan Ruang Wawancara &amp; Rubrik...</p>
            </main>
        );
    }

    if (error || !applicant) {
        return (
            <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white">
                <div className="max-w-md w-full bg-gray-800 p-6 rounded-2xl border border-red-500/30 text-center">
                    <p className="text-red-400 font-semibold mb-4">{error || 'Data peserta tidak ditemukan.'}</p>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Dashboard Admin
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden text-gray-100 font-sans">
            <Toaster position="top-right" />

            {/* Top Navigation Bar */}
            <header className="h-14 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/80 px-4 flex items-center justify-between shrink-0 shadow-lg shadow-black/30">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-colors flex items-center gap-1.5 border border-gray-700/80"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Admin
                    </Link>
                    <div className="border-l border-gray-700 pl-3">
                        <h1 className="text-sm font-bold text-white flex items-center gap-2">
                            <Video className="w-4 h-4 text-teal-400" />
                            <span>Ruang Wawancara</span>
                            <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                                Moderator
                            </span>
                        </h1>
                        <p className="text-xs text-gray-400">
                            {applicant.full_name} &bull; No: <span className="text-teal-400 font-mono">{applicant.registration_number}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-teal-300">
                            Skor: {totalScore} / {maxScore} ({answeredCount}/{rubric.length} Pertanyaan)
                        </div>
                        <div className="text-[10px] text-gray-400">
                            Jadwal: {applicant.interview_date || '-'} {applicant.interview_time ? `(${applicant.interview_time} WIB)` : ''}
                        </div>
                    </div>
                    <button
                        onClick={handleSaveScores}
                        disabled={isSaving}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 hover:shadow-teal-900/50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Menyimpan...' : 'Simpan Nilai'}
                    </button>
                </div>
            </header>

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Panel Kiri: Jitsi Meet */}
                <div className="flex-1 h-1/2 lg:h-full relative bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-800">
                    {jaasToken ? (
                        <div className="absolute inset-0">
                            <JaaSMeeting
                                appId={process.env.NEXT_PUBLIC_JAAS_APP_ID || ''}
                                jwt={jaasToken}
                                roomName={`Wawancara-PSB-${applicant.registration_number}`}
                                configOverwrite={{
                                    startWithAudioMuted: false,
                                    startWithVideoMuted: false,
                                    prejoinPageEnabled: false,
                                    disableDeepLinking: true,
                                }}
                                interfaceConfigOverwrite={{
                                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                                    MOBILE_APP_PROMO: false,
                                }}
                                onApiReady={() => {
                                    console.log('Jitsi Moderator API ready');
                                }}
                                getIFrameRef={(iframeRef) => {
                                    iframeRef.style.height = '100%';
                                    iframeRef.style.width = '100%';
                                    iframeRef.style.border = 'none';
                                    iframeRef.style.position = 'absolute';
                                    iframeRef.style.top = '0';
                                    iframeRef.style.left = '0';
                                }}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
                            <p className="mb-2 text-yellow-400 font-semibold">Gagal memuat token Jitsi Moderator.</p>
                            <p className="text-xs">Pastikan kunci API JaaS di .env.local telah terkonfigurasi dengan benar.</p>
                        </div>
                    )}
                </div>

                {/* Panel Kanan: Rubrik Penilaian */}
                <div className="w-full lg:w-[480px] xl:w-[540px] h-1/2 lg:h-full flex flex-col bg-[#1a1d23] border-l border-gray-800/80">
                    {/* Header Tab */}
                    <div className="p-3 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('rubrik')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'rubrik'
                                        ? 'bg-teal-600 text-white shadow-md'
                                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                <ClipboardList className="w-3.5 h-3.5" />
                                Rubrik ({rubric.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'info'
                                        ? 'bg-teal-600 text-white shadow-md'
                                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                <User className="w-3.5 h-3.5" />
                                Info Peserta
                            </button>
                        </div>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-gray-800 text-teal-400 border border-gray-700">
                            {answeredCount} / {rubric.length} dinilai
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'info' ? (
                            <div className="space-y-4 text-xs bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
                                <div>
                                    <span className="text-gray-400 block mb-0.5">Nama Lengkap</span>
                                    <p className="font-bold text-white text-sm">{applicant.full_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-gray-400 block mb-0.5">No. Pendaftaran</span>
                                        <p className="font-mono text-teal-300 font-semibold">{applicant.registration_number}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block mb-0.5">Asal Sekolah</span>
                                        <p className="font-medium text-gray-200">{applicant.asal_sekolah || '-'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-gray-400 block mb-0.5">Pilihan Jurusan 1</span>
                                        <p className="font-medium text-emerald-400">{applicant.school_choice || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block mb-0.5">Pilihan Jurusan 2</span>
                                        <p className="font-medium text-gray-300">{applicant.school_choice_2 || '-'}</p>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800/40 flex gap-2">
                                    <Lightbulb className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-teal-200 leading-relaxed">
                                        <strong>Tips Wawancara:</strong> Ajukan pertanyaan secara santai namun terstruktur.
                                        Gunakan pertanyaan probing untuk menggali pengalaman konkret calon peserta didik bila jawaban masih singkat.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            rubric.map((q, idx) => {
                                const rubricDetails = q.options?.rubrik;
                                const probingList = q.options?.probing;
                                const selectedScore = scores[q.id];

                                return (
                                    <div
                                        key={q.id}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            selectedScore
                                                ? 'bg-gray-900/90 border-teal-600/50 shadow-sm shadow-teal-900/20'
                                                : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
                                        }`}
                                    >
                                        {/* Kategori / Dimensi */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-800 text-teal-300 border border-gray-700">
                                                {q.question_code} &bull; {DIMENSION_WAWANCARA[q.dimension] || q.dimension}
                                            </span>
                                            {selectedScore && (
                                                <span className="text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/60">
                                                    Level {selectedScore}
                                                </span>
                                            )}
                                        </div>

                                        {/* Teks Pertanyaan Utama */}
                                        <h4 className="text-sm font-semibold text-gray-100 mb-2 leading-snug">
                                            {idx + 1}. {q.question_text}
                                        </h4>

                                        {/* Probing Questions */}
                                        {probingList && probingList.length > 0 && (
                                            <div className="mb-3 p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Search className="w-3 h-3 text-amber-400" />
                                                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Pertanyaan Pendalaman (Probing):</p>
                                                </div>
                                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-300">
                                                    {probingList.map((probe, pIdx) => (
                                                        <li key={pIdx} className="leading-relaxed">
                                                            {probe}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Pilihan Level Skor */}
                                        <div className="space-y-1.5 mt-3">
                                            <p className="text-[11px] font-semibold text-gray-400">Pilih Level Penilaian:</p>
                                            {[1, 2, 3, 4].map((level) => {
                                                const levelKey = `level_${level}` as keyof typeof rubricDetails;
                                                const desc = rubricDetails ? rubricDetails[levelKey] : '';
                                                const isSelected = selectedScore === level;

                                                return (
                                                    <div
                                                        key={level}
                                                        onClick={() => handleSelectScore(q.id, level)}
                                                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                                                            isSelected
                                                                ? 'bg-teal-950/70 border-teal-500 text-white shadow-md shadow-teal-950/40'
                                                                : 'bg-gray-950/40 border-gray-800/80 hover:bg-gray-800/50 text-gray-300'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                                                                isSelected
                                                                    ? 'bg-teal-500 border-teal-400 text-white'
                                                                    : 'border-gray-600 text-gray-400'
                                                            }`}
                                                        >
                                                            {level}
                                                        </div>
                                                        <div className="flex-1 text-[11px] leading-relaxed">
                                                            <div className="font-semibold text-xs mb-0.5 flex items-center justify-between">
                                                                <span className={isSelected ? 'text-teal-300' : 'text-gray-300'}>
                                                                    Level {level}
                                                                </span>
                                                                {isSelected && (
                                                                    <span className="text-[10px] text-teal-400 font-normal">Dipilih</span>
                                                                )}
                                                            </div>
                                                            {desc && <p className="text-gray-400">{desc}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Penilaian */}
                    <div className="p-4 bg-gray-900/95 border-t border-gray-800 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] text-gray-400 block">Total Nilai Wawancara</span>
                            <span className="text-lg font-bold text-teal-400 font-mono">
                                {totalScore} <span className="text-xs text-gray-500 font-normal">/ {maxScore}</span>
                            </span>
                        </div>
                        <button
                            onClick={handleSaveScores}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:shadow-teal-900/50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Nilai'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
