//src/app/admin/wawancara/[id]/page.tsx
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { JaaSMeeting } from '@jitsi/react-sdk';
import toast, { Toaster } from 'react-hot-toast';
import {
    Save,
    ClipboardList,
    User,
    Lightbulb,
    Search,
    ArrowLeft,
    Video,
    Award,
    FileText,
    Brain,
    CheckCircle2,
    Clock,
    BookOpen,
    Calculator,
    Compass,
    MessageSquare,
    ExternalLink,
    Volume2,
    VolumeX,
    Bell
} from 'lucide-react';

type Applicant = {
    id: number;
    registration_number: string;
    full_name: string;
    asal_sekolah: string;
    school_choice: string;
    school_choice_2: string | null;
    registration_path?: string | null;
    document_prestasi?: string | null;
    phone?: string | null;
    parent_phone?: string | null;
    status?: string | null;
    interview_date: string | null;
    interview_time: string | null;
    interview_recommendation?: string | null;
    interview_notes?: string | null;
};

type ExamResultItem = {
    category: string;
    raw_score: any;
    interpretation: string | null;
    completed_at: string;
    status: string;
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

const RECOMMENDATION_OPTIONS = [
    { value: '', label: 'Pilih Rekomendasi / Belum Diputuskan' },
    { value: 'Direkomendasikan di Pilihan 1', label: 'Direkomendasikan di Pilihan 1' },
    { value: 'Lebih Cocok di Pilihan 2', label: 'Lebih Cocok di Pilihan 2' },
    { value: 'Dipertimbangkan / Cadangan', label: 'Dipertimbangkan / Cadangan' },
    { value: 'Tidak Direkomendasikan', label: 'Tidak Direkomendasikan' },
];

export default function AdminWawancaraRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const applicantId = resolvedParams.id;

    const [applicant, setApplicant] = useState<Applicant | null>(null);
    const [examResults, setExamResults] = useState<ExamResultItem[]>([]);
    const [rubric, setRubric] = useState<RubricQuestion[]>([]);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [recommendation, setRecommendation] = useState<string>('');
    const [interviewNotes, setInterviewNotes] = useState<string>('');
    const [jaasToken, setJaasToken] = useState<string>('');
    const [jaasAppId, setJaasAppId] = useState<string>('');
    const [jaasError, setJaasError] = useState<string>('');
    const [virtualBgUrl, setVirtualBgUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'rubrik' | 'profil'>('rubrik');
    const [isApplicantWaiting, setIsApplicantWaiting] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('wawancara_sound_muted') === 'true';
        }
        return false;
    });
    const prevWaitingRef = useRef<boolean>(false);

    const playNotificationChime = () => {
        if (isMuted || typeof window === 'undefined') return;
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } catch {
            // Ignore audio context restrictions
        }
    };

    const toggleMute = () => {
        setIsMuted((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('wawancara_sound_muted', String(next));
            }
            return next;
        });
    };

    useEffect(() => {
        if (!applicant?.id) return;
        const checkPresence = async () => {
            try {
                const res = await fetch(`/api/wawancara/presence?applicant_id=${applicant.id}`);
                if (!res.ok) return;
                const data = await res.json();
                const waiting = Boolean(data.is_waiting);
                setIsApplicantWaiting(waiting);
                if (waiting && !prevWaitingRef.current) {
                    playNotificationChime();
                    toast.success(`${data.full_name || 'Peserta'} sudah masuk ruang wawancara!`);
                }
                prevWaitingRef.current = waiting;
            } catch {
                // Ignore transient network errors
            }
        };
        checkPresence();
        const interval = setInterval(checkPresence, 8000);
        return () => clearInterval(interval);
    }, [applicant?.id, isMuted]);
    // Ref to store Jitsi external API
    const externalApiRef = useRef<any>(null);
    // Apply virtual background when both API and URL are ready
    useEffect(() => {
        if (externalApiRef.current && virtualBgUrl) {
            try {
                externalApiRef.current.executeCommand('setVirtualBackground', true, virtualBgUrl);
            } catch (err) {
                console.warn('Failed to set virtual background on update:', err);
            }
        }
    }, [virtualBgUrl]);

    useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                setError('');

                // 0. Ambil Pengaturan Sekolah (Virtual Background)
                try {
                    const settingsRes = await fetch('/api/settings');
                    const settingsData = await settingsRes.json();
                    if (settingsData.settings?.virtual_background_url) {
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        setVirtualBgUrl(`${origin}/api/virtual-background?v=${encodeURIComponent(settingsData.settings.virtual_background_url)}`);
                    }
                } catch (sErr) {
                    console.warn('Gagal memuat pengaturan background:', sErr);
                }

                // 1. Ambil Data Peserta & Hasil Ujian
                const appRes = await fetch(`/api/admin/applicants/${applicantId}`);
                const appData = await appRes.json();
                if (!appRes.ok || !appData.applicant) {
                    setError(appData.error || 'Peserta tidak ditemukan');
                    setIsLoading(false);
                    return;
                }
                const appInfo = appData.applicant;
                setApplicant(appInfo);
                setExamResults(appData.exam_results || []);
                if (appInfo.interview_recommendation) {
                    setRecommendation(appInfo.interview_recommendation);
                }
                if (appInfo.interview_notes) {
                    setInterviewNotes(appInfo.interview_notes);
                }

                // 2. Ambil Token JaaS
                const roomName = `Wawancara-PSB-${appInfo.registration_number}`;
                const tokenRes = await fetch('/api/jaas-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        roomName,
                        userName: 'Panitia Wawancara',
                        isModerator: true,
                    }),
                });
                const tokenData = await tokenRes.json().catch(() => ({}));
                if (tokenRes.ok && tokenData.token) {
                    setJaasToken(tokenData.token);
                    if (tokenData.appId) {
                        setJaasAppId(tokenData.appId);
                    }
                } else {
                    const errMsg = tokenData.error || `HTTP ${tokenRes.status}: Gagal memuat token JaaS`;
                    console.error('Gagal mengambil token JaaS:', errMsg);
                    setJaasError(errMsg);
                }

                // 3. Ambil Rubrik Pertanyaan Wawancara
                const rubricRes = await fetch('/api/admin/rubric');
                const rubricData = await rubricRes.json();
                if (rubricRes.ok && rubricData.rubric) {
                    setRubric(rubricData.rubric);
                }

                // 4. Ambil Skor & Rekomendasi Tersimpan
                const scoreRes = await fetch(`/api/admin/interview-scores?applicant_id=${applicantId}`);
                const scoreData = await scoreRes.json();
                if (scoreRes.ok) {
                    if (scoreData.scores) {
                        const existing: Record<number, number> = {};
                        scoreData.scores.forEach((s: { rubric_id: number; score: number }) => {
                            existing[s.rubric_id] = s.score;
                        });
                        setScores(existing);
                    }
                    if (scoreData.interview_recommendation) {
                        setRecommendation(scoreData.interview_recommendation);
                    }
                    if (scoreData.interview_notes) {
                        setInterviewNotes(scoreData.interview_notes);
                    }
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

    const handleViewDocument = async (key: string) => {
        try {
            const res = await fetch('/api/admin/document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key }),
            });
            const data = await res.json();
            if (data.viewUrl) {
                window.open(data.viewUrl, '_blank');
            } else {
                toast.error(data.error || 'Gagal membuka berkas prestasi');
            }
        } catch {
            toast.error('Terjadi kesalahan saat membuka berkas prestasi');
        }
    };

    const handleSaveScores = async () => {
        if (!applicant) return;
        setIsSaving(true);
        const loadingToast = toast.loading('Menyimpan nilai & rekomendasi wawancara...');
        try {
            const res = await fetch('/api/admin/interview-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicant_id: applicant.id,
                    scores,
                    interview_recommendation: recommendation,
                    interview_notes: interviewNotes,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Nilai & rekomendasi wawancara berhasil disimpan!', { id: loadingToast });
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

    // Ekstraksi Nilai Tes TPA & CBT
    const tpaResult = examResults.find((r) => r.category === 'TPA');
    const tpaRaw = tpaResult?.raw_score as {
        literasi?: { skor?: number; persen?: number; label?: string };
        numerasi?: { skor?: number; persen?: number; label?: string };
        total?: { skor?: number; label?: string };
    } | null;

    const nonTpaResults = examResults.filter((r) => r.category !== 'TPA' && r.category !== 'WAWANCARA');

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
                            {applicant.full_name} &bull; No:{' '}
                            <span className="text-teal-400 font-mono">{applicant.registration_number}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Indikator Ruang Tunggu Real-Time */}
                    <div
                        className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isApplicantWaiting
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                    >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{isApplicantWaiting ? 'Peserta Sudah Masuk Ruang' : 'Menunggu Peserta'}</span>
                    </div>

                    <button
                        type="button"
                        onClick={toggleMute}
                        title={isMuted ? 'Aktifkan Suara Notifikasi' : 'Bisukan Suara Notifikasi'}
                        className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
                    >
                        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>

                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-teal-300">
                            Skor: {totalScore} / {maxScore} ({answeredCount}/{rubric.length} Pertanyaan)
                        </div>
                        <div className="text-[10px] text-gray-400">
                            Jadwal: {applicant.interview_date || '-'}{' '}
                            {applicant.interview_time ? `(${applicant.interview_time} WIB)` : ''}
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
                    {jaasToken && (jaasAppId || process.env.NEXT_PUBLIC_JAAS_APP_ID) ? (
                        <div className="absolute inset-0">
                            <JaaSMeeting
                                appId={jaasAppId || process.env.NEXT_PUBLIC_JAAS_APP_ID || ''}
                                jwt={jaasToken}
                                roomName={`Wawancara-PSB-${applicant.registration_number}`}
                                configOverwrite={{
                                    startWithAudioMuted: false,
                                    startWithVideoMuted: false,
                                    prejoinPageEnabled: false,
                                    disableDeepLinking: true,
                                    disableVirtualBackground: false,
                                    customVirtualBackgrounds: (virtualBgUrl ? [{ id: 'school-custom-bg', src: virtualBgUrl, title: 'Background Sekolah' }] : []) as any,
                                }}
                                interfaceConfigOverwrite={{
                                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                                    MOBILE_APP_PROMO: false,
                                }}
                                onApiReady={(externalApi) => {
                                    console.log('Jitsi Moderator API ready');
                                    if (virtualBgUrl) {
                                        const applySchoolBackground = () => {
                                            try {
                                                externalApi.executeCommand('setVirtualBackground', true, virtualBgUrl);
                                            } catch (err) {
                                                console.warn('Gagal menerapkan virtual background otomatis:', err);
                                            }
                                        };

                                        applySchoolBackground();

                                        externalApi.addListener('videoConferenceJoined', () => {
                                            applySchoolBackground();
                                            setTimeout(applySchoolBackground, 1500);
                                        });

                                        externalApi.addListener('trackAdded', (track: { type?: string; local?: boolean }) => {
                                            if (track?.type === 'video' && track?.local) {
                                                setTimeout(applySchoolBackground, 800);
                                            }
                                        });
                                    }
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
                            {jaasError && (
                                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-1.5 mb-2 max-w-md break-words">
                                    {jaasError}
                                </p>
                            )}
                            <p className="text-xs">Pastikan kunci API JaaS (JAAS_APP_ID, JAAS_PRIVATE_KEY, JAAS_KID) telah terkonfigurasi pada environment produksi.</p>
                        </div>
                    )}
                </div>

                {/* Panel Kanan: Profil, Rubrik & Rekomendasi */}
                <div className="w-full lg:w-[500px] xl:w-[560px] h-1/2 lg:h-full flex flex-col bg-[#16191f] border-l border-gray-800/80">
                    {/* Header Tab */}
                    <div className="p-3 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between shrink-0">
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
                                onClick={() => setActiveTab('profil')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'profil'
                                        ? 'bg-teal-600 text-white shadow-md'
                                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                <User className="w-3.5 h-3.5" />
                                Profil &amp; Hasil CBT
                            </button>
                        </div>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-gray-800 text-teal-400 border border-gray-700 font-mono">
                            {answeredCount} / {rubric.length} dinilai
                        </span>
                    </div>

                    {/* Content Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* KARTU PROFIL RINGKAS DI ATAS RUBRIK / TAB PROFIL */}
                        <div className="p-3.5 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-sm space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                                        <span>{applicant.full_name}</span>
                                    </h3>
                                    <p className="font-mono text-xs text-gray-400 mt-0.5">
                                        {applicant.registration_number} &bull; SMP: {applicant.asal_sekolah || '-'}
                                    </p>
                                </div>
                                <div>
                                    {applicant.registration_path === 'Prestasi' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                            <Award className="w-3 h-3 text-amber-400" /> Prestasi
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-gray-300 border border-gray-700">
                                            Reguler
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-800/80">
                                <div>
                                    <span className="text-gray-400 text-[11px] block">Pilihan 1:</span>
                                    <span className="font-bold text-teal-300">{applicant.school_choice}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[11px] block">Pilihan 2:</span>
                                    <span className="font-medium text-gray-300">{applicant.school_choice_2 || '-'}</span>
                                </div>
                            </div>

                            {/* Tombol Lihat Sertifikat Prestasi (Jika Ada) */}
                            {applicant.document_prestasi && (
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handleViewDocument(applicant.document_prestasi!)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors"
                                    >
                                        <Award className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Buka Sertifikat &amp; Bukti Prestasi</span>
                                        <ExternalLink className="w-3 h-3 opacity-70 ml-1" />
                                    </button>
                                </div>
                            )}

                            {/* Ringkasan Cepat Hasil Tes TPA CBT */}
                            {tpaRaw && (
                                <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-blue-400 shrink-0" />
                                        <div>
                                            <span className="text-blue-200 font-bold block text-[11px]">Hasil Tes TPA CBT:</span>
                                            <span className="text-gray-300 text-[10px]">
                                                Lit: <strong>{tpaRaw.literasi?.skor ?? '-'}/25</strong> &bull; Num: <strong>{tpaRaw.numerasi?.skor ?? '-'}/25</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-blue-300 font-mono font-black text-sm">
                                            {tpaRaw.total?.skor ?? '-'}%
                                        </span>
                                        <span className="block text-[10px] text-blue-400 font-semibold">
                                            {tpaRaw.total?.label || 'Selesai'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TAB 1: RUBRIK PERTANYAAN */}
                        {activeTab === 'rubrik' ? (
                            <>
                                {rubric.map((q, idx) => {
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
                                                    <span className="text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/60 font-mono">
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
                                                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                                                            Pertanyaan Pendalaman (Probing):
                                                        </p>
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
                                                <p className="text-[11px] font-semibold text-gray-400">
                                                    Pilih Level Penilaian:
                                                </p>
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
                                                                    <span
                                                                        className={
                                                                            isSelected ? 'text-teal-300' : 'text-gray-300'
                                                                        }
                                                                    >
                                                                        Level {level}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <span className="text-[10px] text-teal-400 font-normal">
                                                                            Dipilih
                                                                        </span>
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
                                })}

                                {/* FORM CATATAN & REKOMENDASI PEWAWANCARA */}
                                <div className="p-4 rounded-2xl bg-gray-900 border border-teal-500/40 shadow-lg space-y-3">
                                    <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                                        <MessageSquare className="w-4 h-4 text-teal-400" />
                                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-teal-300">
                                            Rekomendasi &amp; Catatan Pewawancara (Pleno)
                                        </h3>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-300 mb-1.5">
                                            Rekomendasi Kelulusan / Penempatan Jurusan:
                                        </label>
                                        <select
                                            value={recommendation}
                                            onChange={(e) => setRecommendation(e.target.value)}
                                            className="w-full bg-gray-950 border border-gray-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-teal-500 cursor-pointer"
                                        >
                                            {RECOMMENDATION_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-300 mb-1.5">
                                            Catatan Singkat Pewawancara:
                                        </label>
                                        <textarea
                                            value={interviewNotes}
                                            onChange={(e) => setInterviewNotes(e.target.value)}
                                            rows={3}
                                            placeholder="Contoh: Sangat antusias dengan praktik, komunikasi lancar, cocok untuk Jurusan Farmasi..."
                                            className="w-full bg-gray-950 border border-gray-700 text-white placeholder-gray-500 text-xs rounded-xl p-3 outline-none focus:border-teal-500 resize-none"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* TAB 2: PROFIL DETAIL & HASIL UJIAN CBT */
                            <div className="space-y-4 text-xs">
                                {/* Detail Kontak & Orang Tua */}
                                <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
                                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2 border-b border-gray-800 pb-2">
                                        <User className="w-4 h-4 text-teal-400" />
                                        Data Diri &amp; Kontak
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-gray-400 text-[11px] block">No. HP Siswa:</span>
                                            <p className="font-mono text-gray-200">{applicant.phone || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-[11px] block">No. HP Orang Tua:</span>
                                            <p className="font-mono text-gray-200">{applicant.parent_phone || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Hasil Tes CBT (TPA & Diagnostik) */}
                                <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
                                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2 border-b border-gray-800 pb-2">
                                        <Brain className="w-4 h-4 text-blue-400" />
                                        Hasil Ujian Seleksi CBT
                                    </h4>

                                    {examResults.length === 0 ? (
                                        <div className="py-6 text-center text-gray-400">
                                            <p className="text-xs">Peserta belum menyelesaikan tes CBT.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Kartu TPA */}
                                            {tpaRaw && (
                                                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-blue-300 text-xs">
                                                            Tes Potensi Akademik (TPA)
                                                        </span>
                                                        <span className="text-xs font-mono font-black text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded">
                                                            {tpaRaw.total?.skor ?? '-'}%
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                        <div className="p-2 rounded-lg bg-gray-950/50 border border-gray-800">
                                                            <span className="text-gray-400 block">Literasi:</span>
                                                            <span className="font-bold text-white">
                                                                {tpaRaw.literasi?.skor ?? '-'}/25 ({tpaRaw.literasi?.persen ?? '-'}%)
                                                            </span>
                                                            <span className="block text-[10px] text-teal-400 mt-0.5">
                                                                {tpaRaw.literasi?.label || '-'}
                                                            </span>
                                                        </div>
                                                        <div className="p-2 rounded-lg bg-gray-950/50 border border-gray-800">
                                                            <span className="text-gray-400 block">Numerasi:</span>
                                                            <span className="font-bold text-white">
                                                                {tpaRaw.numerasi?.skor ?? '-'}/25 ({tpaRaw.numerasi?.persen ?? '-'}%)
                                                            </span>
                                                            <span className="block text-[10px] text-teal-400 mt-0.5">
                                                                {tpaRaw.numerasi?.label || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Kategori Ujian Lainnya (Diagnostik, dll.) */}
                                            {nonTpaResults.map((ex, exIdx) => (
                                                <div
                                                    key={exIdx}
                                                    className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 space-y-1.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-gray-200 text-xs">
                                                            {ex.category}
                                                        </span>
                                                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Selesai
                                                        </span>
                                                    </div>
                                                    {ex.interpretation && (
                                                        <p className="text-[11px] text-gray-300 bg-gray-900/70 p-2 rounded-lg border border-gray-800">
                                                            {ex.interpretation}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tips Wawancara */}
                                <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-800/40 flex gap-2.5">
                                    <Lightbulb className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-teal-200 leading-relaxed">
                                        <strong>Panduan Pewawancara:</strong> Manfaatkan rincian hasil CBT di atas untuk
                                        mengonfirmasi minat jurusan, kemandirian belajar, dan komitmen calon siswa.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Penilaian */}
                    <div className="p-4 bg-gray-900/95 border-t border-gray-800 flex items-center justify-between shrink-0 shadow-lg">
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
                            {isSaving ? 'Menyimpan...' : 'Simpan Nilai & Rekomendasi'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
