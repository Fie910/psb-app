//src/components/AdminBulkActionBar.tsx
'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import {
    CalendarClock,
    CheckCircle2,
    X,
    Users,
    GraduationCap,
    Sparkles,
    MessageCircle,
    ExternalLink,
    SkipForward,
    CheckCheck,
    Phone,
} from 'lucide-react';
import {
    WhatsAppApplicantData,
    WhatsAppSiteSettings,
    buildWhatsAppMessage,
    buildWhatsAppUrl,
    normalizeIndonesianPhone,
} from '@/lib/whatsapp-templates';

export interface BulkApplicantSummary extends WhatsAppApplicantData {
    id: number;
    full_name: string;
    registration_number: string;
    school_choice: string;
    school_choice_2?: string | null;
    status: string;
}

interface AdminBulkActionBarProps {
    selectedApplicants: BulkApplicantSummary[];
    settings?: WhatsAppSiteSettings | null;
    onClearSelection: () => void;
    onSuccess: () => void;
}

const MAJOR_OPTIONS = [
    'Farmasi Klinis dan Komunitas',
    'Produksi dan Siaran Program Televisi',
    'Manajemen Perkantoran',
];

export default function AdminBulkActionBar({
    selectedApplicants,
    settings,
    onClearSelection,
    onSuccess,
}: AdminBulkActionBarProps) {
    const { isDarkMode } = useTheme();
    const [activeModal, setActiveModal] = useState<'schedule' | 'status' | 'wa_prompt' | 'wa_queue' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // WA Queue states
    const [queueList, setQueueList] = useState<BulkApplicantSummary[]>([]);
    const [queueIndex, setQueueIndex] = useState(0);
    const [queueRecipientType, setQueueRecipientType] = useState<'student' | 'parent'>('student');
    const [queueMessage, setQueueMessage] = useState('');
    const [queueSending, setQueueSending] = useState(false);

    const [testDate, setTestDate] = useState('');
    const [testTime, setTestTime] = useState('08:00');
    const [testLocation, setTestLocation] = useState('Online via Portal Ujian PSB');
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewTime, setInterviewTime] = useState('10:00');
    const [interviewLink, setInterviewLink] = useState('');
    const [setReadyStatus, setSetReadyStatus] = useState(true);

    const [targetStatus, setTargetStatus] = useState('Siap Tes dan/atau Wawancara');
    const [majorMode, setMajorMode] = useState<'CHOICE_1' | 'CHOICE_2' | 'CUSTOM'>('CHOICE_1');
    const [customMajor, setCustomMajor] = useState(MAJOR_OPTIONS[0]);

    if (selectedApplicants.length === 0) return null;

    const selectedIds = selectedApplicants.map((a) => a.id);

    const handleSubmitBulkSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testDate && !interviewDate) {
            toast.error('Isi minimal Tanggal Tes Online atau Tanggal Wawancara!');
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading(`Menjadwalkan ${selectedIds.length} peserta...`);

        try {
            const res = await fetch('/api/admin/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_schedule',
                    applicant_ids: selectedIds,
                    test_date: testDate || null,
                    test_time: testDate ? testTime || null : null,
                    test_location: testDate ? testLocation || null : null,
                    interview_date: interviewDate || null,
                    interview_time: interviewDate ? interviewTime || null : null,
                    interview_link: interviewDate ? interviewLink || null : null,
                    set_ready_status: setReadyStatus,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Gagal menyimpan jadwal massal.', { id: loadingToast });
            } else {
                toast.success(data.message || 'Jadwal massal berhasil disimpan!', { id: loadingToast });
                const updatedList = selectedApplicants.map((a) => ({
                    ...a,
                    status: setReadyStatus ? 'Siap Tes dan/atau Wawancara' : a.status,
                    test_date: testDate || a.test_date,
                    test_time: testDate ? testTime || a.test_time : a.test_time,
                    test_location: testDate ? testLocation || a.test_location : a.test_location,
                    interview_date: interviewDate || a.interview_date,
                    interview_time: interviewDate ? interviewTime || a.interview_time : a.interview_time,
                }));
                const reachable = updatedList.filter(
                    (a) => normalizeIndonesianPhone(a.phone) || normalizeIndonesianPhone(a.parent_phone)
                );
                onSuccess();
                if (reachable.length > 0) {
                    setQueueList(reachable);
                    setActiveModal('wa_prompt');
                } else {
                    setActiveModal(null);
                    onClearSelection();
                }
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.', { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitBulkStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const loadingToast = toast.loading(`Memperbarui status ${selectedIds.length} peserta...`);

        try {
            const res = await fetch('/api/admin/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_status',
                    applicant_ids: selectedIds,
                    status: targetStatus,
                    major_mode: majorMode,
                    custom_major: customMajor,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Gagal memperbarui status massal.', { id: loadingToast });
            } else {
                toast.success(data.message || 'Status massal berhasil diperbarui!', { id: loadingToast });
                const updatedList = selectedApplicants.map((a) => ({
                    ...a,
                    status: targetStatus,
                    accepted_major:
                        targetStatus === 'Diterima'
                            ? majorMode === 'CUSTOM'
                                ? customMajor
                                : majorMode === 'CHOICE_2'
                                    ? a.school_choice_2 || a.school_choice
                                    : a.school_choice
                            : a.accepted_major,
                }));
                const reachable = updatedList.filter(
                    (a) => normalizeIndonesianPhone(a.phone) || normalizeIndonesianPhone(a.parent_phone)
                );
                onSuccess();
                if (reachable.length > 0) {
                    setQueueList(reachable);
                    setActiveModal('wa_prompt');
                } else {
                    setActiveModal(null);
                    onClearSelection();
                }
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan.', { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = isDarkMode
        ? 'bg-gray-950 border-gray-700 text-white focus:border-teal-500 outline-none'
        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-[#b85c38] outline-none';

    const initQueueAt = (list: BulkApplicantSummary[], idx: number) => {
        const item = list[idx];
        if (!item) return;
        const sPhone = normalizeIndonesianPhone(item.phone);
        setQueueIndex(idx);
        setQueueRecipientType(sPhone ? 'student' : 'parent');
        setQueueMessage(buildWhatsAppMessage(item, settings));
    };

    const handleOpenDirectWaQueue = () => {
        const reachable = selectedApplicants.filter(
            (a) => normalizeIndonesianPhone(a.phone) || normalizeIndonesianPhone(a.parent_phone)
        );
        if (reachable.length === 0) {
            toast.error('Tidak ada peserta terpilih yang memiliki nomor HP/WA.');
            return;
        }
        setQueueList(reachable);
        initQueueAt(reachable, 0);
        setActiveModal('wa_queue');
    };

    const handleCloseQueue = () => {
        setActiveModal(null);
        onClearSelection();
        onSuccess();
    };

    const currentQueueItem = queueList[queueIndex] || null;
    const currentStudentPhone = currentQueueItem ? normalizeIndonesianPhone(currentQueueItem.phone) : '';
    const currentParentPhone = currentQueueItem ? normalizeIndonesianPhone(currentQueueItem.parent_phone) : '';
    const currentActivePhone =
        queueRecipientType === 'student'
            ? currentStudentPhone || currentParentPhone
            : currentParentPhone || currentStudentPhone;

    const handleQueueSendAndNext = async () => {
        if (!currentQueueItem || !currentActivePhone) return;
        setQueueSending(true);
        try {
            const url = buildWhatsAppUrl(currentActivePhone, queueMessage);
            window.open(url, '_blank', 'noopener,noreferrer');

            await fetch('/api/admin/wa-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicant_id: currentQueueItem.id,
                    recipient_phone: currentActivePhone,
                    recipient_type: queueRecipientType,
                    message_preview: queueMessage,
                }),
            });

            if (queueIndex + 1 < queueList.length) {
                initQueueAt(queueList, queueIndex + 1);
            } else {
                toast.success(`Antrean kirim WA selesai (${queueList.length} peserta).`);
                handleCloseQueue();
            }
        } catch {
            toast.error('Gagal mencatat log WA.');
        } finally {
            setQueueSending(false);
        }
    };

    const handleQueueSkip = () => {
        if (queueIndex + 1 < queueList.length) {
            initQueueAt(queueList, queueIndex + 1);
        } else {
            toast.success('Antrean kirim WA selesai.');
            handleCloseQueue();
        }
    };

    return (
        <>
            <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl">
                <div
                    className={`rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-all ${isDarkMode
                            ? 'bg-gray-900/95 border-teal-500/40 text-white shadow-black/70'
                            : 'bg-[#2b1d18]/95 border-[#b85c38] text-white shadow-[#2b1d18]/40'
                        }`}
                >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-teal-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-extrabold flex items-center gap-2">
                                <span>{selectedApplicants.length} Peserta Terpilih</span>
                            </p>
                            <p className="text-[11px] text-gray-300 truncate">
                                {selectedApplicants
                                    .slice(0, 3)
                                    .map((a) => a.full_name)
                                    .join(', ')}
                                {selectedApplicants.length > 3
                                    ? ` +${selectedApplicants.length - 3} lainnya`
                                    : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={() => setActiveModal('schedule')}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-md"
                        >
                            <CalendarClock className="w-4 h-4" />
                            <span>Atur Jadwal</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveModal('status')}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Ubah Status</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenDirectWaQueue}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs transition-all shadow-md"
                        >
                            <MessageCircle className="w-4 h-4" />
                            <span>Kirim WA</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClearSelection}
                            title="Batalkan Pilihan"
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {activeModal === 'schedule' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div
                        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${isDarkMode
                                ? 'bg-gray-900 border-gray-700 text-gray-100'
                                : 'bg-[#fffdf9] border-[#cbb7a2] text-[#1f1410]'
                            }`}
                    >
                        <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-extrabold flex items-center gap-2">
                                    <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <span>Atur Jadwal Massal ({selectedApplicants.length} Peserta)</span>
                                </h3>
                                <p className="text-xs opacity-75 mt-0.5">
                                    Jadwal yang diisi akan diterapkan sekaligus ke seluruh peserta terpilih.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBulkSchedule} className="space-y-4">
                            <div
                                className={`p-4 rounded-2xl border space-y-3 ${isDarkMode
                                        ? 'bg-gray-950/60 border-gray-800'
                                        : 'bg-[#faf4ec] border-[#d6c5b3]'
                                    }`}
                            >
                                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                    1. Jadwal Ujian Seleksi Online (Opsional jika hanya Wawancara)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Tanggal Tes</label>
                                        <input
                                            type="date"
                                            value={testDate}
                                            onChange={(e) => setTestDate(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${inputCls}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Jam Mulai (WIB)</label>
                                        <input
                                            type="time"
                                            value={testTime}
                                            onChange={(e) => setTestTime(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${inputCls}`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Lokasi / Ruang Ujian</label>
                                    <input
                                        type="text"
                                        value={testLocation}
                                        onChange={(e) => setTestLocation(e.target.value)}
                                        placeholder="Online via Portal Ujian PSB / Lab Komputer 1"
                                        className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${inputCls}`}
                                    />
                                </div>
                            </div>

                            <div
                                className={`p-4 rounded-2xl border space-y-3 ${isDarkMode
                                        ? 'bg-gray-950/60 border-gray-800'
                                        : 'bg-[#faf4ec] border-[#d6c5b3]'
                                    }`}
                            >
                                <p className="text-xs font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                    2. Jadwal Wawancara Video Call (Opsional)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Tanggal Wawancara</label>
                                        <input
                                            type="date"
                                            value={interviewDate}
                                            onChange={(e) => setInterviewDate(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${inputCls}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Jam Wawancara (WIB)</label>
                                        <input
                                            type="time"
                                            value={interviewTime}
                                            onChange={(e) => setInterviewTime(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${inputCls}`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Catatan / Link Tambahan (Opsional)</label>
                                    <input
                                        type="text"
                                        value={interviewLink}
                                        onChange={(e) => setInterviewLink(e.target.value)}
                                        placeholder="Otomatis menggunakan ruang Jitsi PSB jika dikosongkan"
                                        className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${inputCls}`}
                                    />
                                </div>
                            </div>

                            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={setReadyStatus}
                                    onChange={(e) => setSetReadyStatus(e.target.checked)}
                                    className="w-4 h-4 mt-0.5 accent-emerald-600 rounded"
                                />
                                <span className="text-xs font-bold leading-snug">
                                    Sekaligus ubah status semua peserta terpilih menjadi{' '}
                                    <strong>&ldquo;Siap Tes dan/atau Wawancara&rdquo;</strong>
                                </span>
                            </label>

                            <div className="flex justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-lg disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : `Terapkan ke ${selectedApplicants.length} Peserta`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeModal === 'status' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div
                        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${isDarkMode
                                ? 'bg-gray-900 border-gray-700 text-gray-100'
                                : 'bg-[#fffdf9] border-[#cbb7a2] text-[#1f1410]'
                            }`}
                    >
                        <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-extrabold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Ubah Status Massal ({selectedApplicants.length} Peserta)</span>
                                </h3>
                                <p className="text-xs opacity-75 mt-0.5">
                                    Tetapkan status seleksi sekaligus untuk seluruh peserta yang dicentang.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBulkStatus} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold mb-1.5">
                                    Pilih Status Tujuan
                                </label>
                                <select
                                    value={targetStatus}
                                    onChange={(e) => setTargetStatus(e.target.value)}
                                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold ${inputCls}`}
                                >
                                    <option value="Siap Tes dan/atau Wawancara">Siap Tes dan/atau Wawancara</option>
                                    <option value="Diterima">Diterima (Lulus Seleksi)</option>
                                    <option value="Pending">Pending (Menunggu Verifikasi)</option>
                                    <option value="Ditolak">Ditolak</option>
                                </select>
                            </div>

                            {targetStatus === 'Diterima' && (
                                <div
                                    className={`p-4 rounded-2xl border space-y-3 ${isDarkMode
                                            ? 'bg-emerald-950/35 border-emerald-700/60'
                                            : 'bg-emerald-50 border-emerald-300'
                                        }`}
                                >
                                    <p className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                                        <GraduationCap className="w-4 h-4" />
                                        <span>Penempatan Kompetensi Keahlian (Jurusan)</span>
                                    </p>

                                    <div className="space-y-2 text-xs">
                                        <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                                            <input
                                                type="radio"
                                                name="bulkMajorMode"
                                                checked={majorMode === 'CHOICE_1'}
                                                onChange={() => setMajorMode('CHOICE_1')}
                                                className="accent-emerald-600"
                                            />
                                            <span>Sesuai Pilihan Jurusan 1 Masing-Masing Siswa</span>
                                        </label>

                                        <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                                            <input
                                                type="radio"
                                                name="bulkMajorMode"
                                                checked={majorMode === 'CHOICE_2'}
                                                onChange={() => setMajorMode('CHOICE_2')}
                                                className="accent-emerald-600"
                                            />
                                            <span>Sesuai Pilihan Jurusan 2 (Fallback ke Pilihan 1)</span>
                                        </label>

                                        <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                                            <input
                                                type="radio"
                                                name="bulkMajorMode"
                                                checked={majorMode === 'CUSTOM'}
                                                onChange={() => setMajorMode('CUSTOM')}
                                                className="accent-emerald-600"
                                            />
                                            <span>Tetapkan Semua ke Satu Jurusan Tertentu</span>
                                        </label>
                                    </div>

                                    {majorMode === 'CUSTOM' && (
                                        <select
                                            value={customMajor}
                                            onChange={(e) => setCustomMajor(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-xs font-bold ${inputCls}`}
                                        >
                                            {MAJOR_OPTIONS.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Memproses...' : `Simpan untuk ${selectedApplicants.length} Peserta`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeModal === 'wa_prompt' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div
                        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${isDarkMode
                            ? 'bg-gray-900 border-gray-700 text-gray-100'
                            : 'bg-[#fffdf9] border-[#cbb7a2] text-[#1f1410]'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                    <MessageCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold">Kirim Notifikasi WhatsApp?</h3>
                                    <p className="text-xs opacity-80">
                                        {queueList.length} peserta memiliki nomor HP/WA aktif.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseQueue}
                                className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs leading-relaxed opacity-85">
                            Aksi massal berhasil disimpan. Anda dapat langsung mengirim pemberitahuan WhatsApp secara berurutan ke peserta yang baru saja diperbarui.
                        </p>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleCloseQueue}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Nanti Saja
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    initQueueAt(queueList, 0);
                                    setActiveModal('wa_queue');
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span>Buka Antrean Kirim WA ({queueList.length} Peserta)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'wa_queue' && currentQueueItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
                    <div
                        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 ${isDarkMode
                            ? 'bg-gray-900 border-gray-700 text-gray-100'
                            : 'bg-[#fffdf9] border-[#cbb7a2] text-[#1f1410]'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2 border-b pb-3 border-gray-200 dark:border-gray-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <h3 className="text-base font-extrabold">Antrean Kirim WhatsApp</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                        {queueIndex + 1} dari {queueList.length}
                                    </span>
                                </div>
                                <p className="text-xs opacity-80 mt-0.5">
                                    <strong>{currentQueueItem.full_name}</strong> ({currentQueueItem.registration_number}) &bull; {currentQueueItem.status}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseQueue}
                                className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${Math.round(((queueIndex + 1) / queueList.length) * 100)}%` }}
                            />
                        </div>

                        {/* Pilihan Nomor Tujuan */}
                        <div className="flex flex-wrap items-center gap-2">
                            {currentStudentPhone && (
                                <button
                                    type="button"
                                    onClick={() => setQueueRecipientType('student')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${queueRecipientType === 'student'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Siswa: +{currentStudentPhone}</span>
                                </button>
                            )}
                            {currentParentPhone && (
                                <button
                                    type="button"
                                    onClick={() => setQueueRecipientType('parent')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${queueRecipientType === 'parent'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Orang Tua: +{currentParentPhone}</span>
                                </button>
                            )}
                        </div>

                        {/* Editor Draf Pesan */}
                        <div>
                            <label className="block text-xs font-bold mb-1.5">Draf Pesan WhatsApp (dapat diedit)</label>
                            <textarea
                                rows={7}
                                value={queueMessage}
                                onChange={(e) => setQueueMessage(e.target.value)}
                                className={`w-full rounded-xl border p-3 text-xs leading-relaxed ${inputCls}`}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleQueueSkip}
                                    disabled={queueSending}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <SkipForward className="w-3.5 h-3.5" />
                                    <span>Lewati</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseQueue}
                                    disabled={queueSending}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>Selesai</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleQueueSendAndNext}
                                disabled={queueSending || !currentActivePhone}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg disabled:opacity-50"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>
                                    {queueIndex + 1 < queueList.length
                                        ? 'Kirim & Lanjut ke Berikutnya'
                                        : 'Kirim & Selesaikan Antrean'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );


}