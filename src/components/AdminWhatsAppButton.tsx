//src/components/AdminWhatsAppButton.tsx
'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import {
    WhatsAppApplicantData,
    WhatsAppSiteSettings,
    buildWhatsAppMessage,
    buildWhatsAppUrl,
    normalizeIndonesianPhone
} from '@/lib/whatsapp-templates';
import { MessageCircle, ExternalLink, Copy, RotateCcw, X, Phone, CheckCheck } from 'lucide-react';

interface AdminWhatsAppButtonProps {
    applicant: WhatsAppApplicantData;
    settings?: WhatsAppSiteSettings | null;
    onWaLogged?: (lastSentAt: string, lastSentBy: string) => void;
}

export default function AdminWhatsAppButton({ applicant, settings, onWaLogged }: AdminWhatsAppButtonProps) {
    const { isDarkMode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [lastSentAt, setLastSentAt] = useState<string | null>(applicant.last_wa_sent_at || null);
    const [lastSentBy, setLastSentBy] = useState<string | null>(applicant.last_wa_sent_by || null);

    const studentPhone = normalizeIndonesianPhone(applicant.phone);
    const parentPhone = normalizeIndonesianPhone(applicant.parent_phone);
    const referrerPhone = normalizeIndonesianPhone(applicant.referrer_phone);

    const [recipientType, setRecipientType] = useState<'student' | 'parent' | 'referrer'>(
        studentPhone ? 'student' : parentPhone ? 'parent' : 'referrer'
    );

    const [hasManualEdit, setHasManualEdit] = useState(false);

    const defaultMessage = useMemo(
        () => buildWhatsAppMessage(applicant, settings, undefined, recipientType),
        [applicant, settings, recipientType]
    );

    const [customMessage, setCustomMessage] = useState(defaultMessage);

    const handleOpenModal = () => {
        const initialType: 'student' | 'parent' | 'referrer' = studentPhone
            ? 'student'
            : parentPhone
                ? 'parent'
                : 'referrer';
        setRecipientType(initialType);
        setHasManualEdit(false);
        setCustomMessage(buildWhatsAppMessage(applicant, settings, undefined, initialType));
        setIsOpen(true);
    };

    const handleSelectRecipient = (nextType: 'student' | 'parent' | 'referrer') => {
        setRecipientType(nextType);
        if (!hasManualEdit) {
            setCustomMessage(buildWhatsAppMessage(applicant, settings, undefined, nextType));
        }
    };

    const activePhone =
        recipientType === 'student'
            ? studentPhone
            : recipientType === 'parent'
                ? parentPhone
                : referrerPhone;

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(customMessage);
            toast.success('Draf pesan WhatsApp disalin ke clipboard!');
        } catch {
            toast.error('Gagal menyalin pesan.');
        }
    };

    const handleSendWhatsApp = async () => {
        if (!activePhone) {
            toast.error('Nomor WhatsApp siswa maupun orang tua tidak tersedia.');
            return;
        }

        // Buka chat WA di tab baru
        const url = buildWhatsAppUrl(activePhone, customMessage);
        window.open(url, '_blank', 'noopener,noreferrer');
        setIsOpen(false);

        // Catat log pengiriman ke database server jika applicant.id tersedia
        if (applicant.id) {
            try {
                const res = await fetch('/api/admin/wa-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        applicant_id: applicant.id,
                        recipient_phone: activePhone,
                        recipient_type: recipientType,
                        message_preview: customMessage,
                    }),
                });
                const data = await res.json();
                if (res.ok && data.last_wa_sent_at) {
                    setLastSentAt(data.last_wa_sent_at);
                    setLastSentBy(data.last_wa_sent_by || 'Panitia');
                    if (onWaLogged) {
                        onWaLogged(data.last_wa_sent_at, data.last_wa_sent_by || 'Panitia');
                    }
                    toast.success('Pesan WA dibuka & status pengiriman tercatat.');
                }
            } catch (err) {
                console.warn('Gagal mencatat log WA ke server:', err);
            }
        }
    };

    const hasAnyPhone = Boolean(studentPhone || parentPhone || referrerPhone);

    return (
        <div className="flex flex-col items-start gap-1">
            <button
                type="button"
                onClick={handleOpenModal}
                disabled={!hasAnyPhone}
                title={
                    hasAnyPhone
                        ? `Kirim Info WhatsApp Otomatis (${applicant.status})`
                        : 'Nomor HP Siswa & Orang Tua kosong'
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all"
            >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Info WA</span>
            </button>

            {lastSentAt && (
                <div
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold"
                    title={`Terkirim: ${new Date(lastSentAt).toLocaleString('id-ID')} oleh ${lastSentBy || 'Panitia'}`}
                >
                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                    <span>
                        {new Date(lastSentAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                </div>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-left">
                    <div
                        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${isDarkMode
                                ? 'bg-gray-900 border-gray-700 text-gray-100'
                                : 'bg-[#fffdf9] border-[#cbb7a2] text-[#1f1410]'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-2 border-b pb-3 mb-4 border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Kirim Notifikasi WhatsApp</span>
                                </h3>
                                <p className="text-xs opacity-80 mt-0.5">
                                    Peserta: <strong>{applicant.full_name}</strong> &bull; Status:{' '}
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                        {applicant.status}
                                    </span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-extrabold mb-1.5">
                                Pilih Nomor WhatsApp Tujuan:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <button
                                    type="button"
                                    disabled={!studentPhone}
                                    onClick={() => handleSelectRecipient('student')}
                                    className={`p-2.5 rounded-xl border text-left text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${recipientType === 'student' && studentPhone
                                            ? 'bg-emerald-600/15 border-emerald-500 font-extrabold'
                                            : isDarkMode
                                                ? 'bg-gray-950/60 border-gray-800'
                                                : 'bg-white border-[#d6c5b3]'
                                        }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>HP/WA Siswa</span>
                                    </span>
                                    <span className="block font-mono mt-0.5 opacity-80">
                                        {applicant.phone || 'Tidak diisi'}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled={!parentPhone}
                                    onClick={() => handleSelectRecipient('parent')}
                                    className={`p-2.5 rounded-xl border text-left text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${recipientType === 'parent' && parentPhone
                                            ? 'bg-emerald-600/15 border-emerald-500 font-extrabold'
                                            : isDarkMode
                                                ? 'bg-gray-950/60 border-gray-800'
                                                : 'bg-white border-[#d6c5b3]'
                                        }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                                        <span>HP/WA Orang Tua</span>
                                    </span>
                                    <span className="block font-mono mt-0.5 opacity-80">
                                        {applicant.parent_phone || 'Tidak diisi'}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled={!referrerPhone}
                                    onClick={() => handleSelectRecipient('referrer')}
                                    className={`p-2.5 rounded-xl border text-left text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${recipientType === 'referrer' && referrerPhone
                                            ? 'bg-emerald-600/15 border-emerald-500 font-extrabold'
                                            : isDarkMode
                                                ? 'bg-gray-950/60 border-gray-800'
                                                : 'bg-white border-[#d6c5b3]'
                                        }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Guru / Wali Kelas Referal</span>
                                    </span>
                                    <span className="block font-mono mt-0.5 opacity-80">
                                        {applicant.referrer_phone || 'Tanpa referal'}
                                    </span>
                                </button>
                            </div>
                            {recipientType === 'referrer' && referrerPhone && (
                                <div className="mt-2.5 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs">
                                    <p className="font-bold">
                                        Penerima Referal: {applicant.referrer_name || '-'} ({applicant.referral_code || '-'})
                                    </p>
                                    {(applicant.referrer_jabatan || applicant.referrer_school) && (
                                        <p className="opacity-80">
                                            {[applicant.referrer_jabatan, applicant.referrer_school].filter(Boolean).join(' • ')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-extrabold">
                                    Pratinjau Draf Pesan Otomatis (Dapat Diedit):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHasManualEdit(false);
                                        setCustomMessage(buildWhatsAppMessage(applicant, settings, undefined, recipientType));
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset Template</span>
                                </button>
                            </div>
                            <textarea
                                rows={9}
                                value={customMessage}
                                onChange={(e) => {
                                    setHasManualEdit(true);
                                    setCustomMessage(e.target.value);
                                }}
                                className={`w-full rounded-2xl border p-3.5 text-xs leading-relaxed outline-none ${isDarkMode
                                        ? 'bg-gray-950 border-gray-700 text-gray-100 focus:border-emerald-500'
                                        : 'bg-white border-[#cbb7a2] text-[#1f1410] focus:border-emerald-600'
                                    }`}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleCopyMessage}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDarkMode
                                        ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                        : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                    }`}
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Teks</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendWhatsApp}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg transition-all"
                                >
                                    <span>Kirim via WhatsApp</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}