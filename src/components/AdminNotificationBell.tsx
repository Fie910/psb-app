//src/components/AdminNotificationBell.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
    Bell,
    CheckCheck,
    UserPlus,
    FileWarning,
    ClipboardCheck,
    GraduationCap,
    Clock,
    Trash2
} from 'lucide-react';

export type AdminNotificationItem = {
    id: number;
    type: 'NEW_APPLICANT' | 'REVISION_SUBMITTED' | 'REREG_SUBMITTED' | 'EXAM_FINISHED' | string;
    title: string;
    message: string;
    applicant_id: number | null;
    registration_number: string | null;
    applicant_name: string | null;
    is_read: boolean;
    created_at: string;
};

interface AdminNotificationBellProps {
    onSelectNotification?: (item: AdminNotificationItem) => void;
}

function formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (isNaN(diffSeconds) || diffSeconds < 60) return 'Baru saja';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });


}

export default function AdminNotificationBell({ onSelectNotification }: AdminNotificationBellProps) {
    const { isDarkMode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
            }
            if (typeof data.unreadCount === 'number') {
                setUnreadCount(data.unreadCount);
            }
        } catch {
            // Abaikan error polling jaringan sementara
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
            }
        }, 30000);

        const handleFocus = () => fetchNotifications();
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchNotifications]);

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await fetch('/api/admin/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_all_read' }),
            });
        } catch {
            fetchNotifications();
        }
    };

    const handleClearRead = async () => {
        setNotifications((prev) => prev.filter((n) => !n.is_read));
        try {
            await fetch('/api/admin/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_read' }),
            });
        } catch {
            fetchNotifications();
        }
    };

    const handleItemClick = async (item: AdminNotificationItem) => {
        if (!item.is_read) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));

            fetch('/api/admin/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_read', id: item.id }),
            }).catch(() => { });
        }

        setIsOpen(false);
        if (onSelectNotification) {
            onSelectNotification(item);
        }
    };

    const renderTypeBadge = (type: string) => {
        switch (type) {
            case 'NEW_APPLICANT':
                return {
                    icon: UserPlus,
                    wrapper: isDarkMode
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-blue-100 text-blue-800 border-blue-200',
                };
            case 'REVISION_SUBMITTED':
                return {
                    icon: FileWarning,
                    wrapper: isDarkMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-amber-100 text-amber-900 border-amber-300',
                };
            case 'REREG_SUBMITTED':
                return {
                    icon: ClipboardCheck,
                    wrapper: isDarkMode
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300',
                };
            case 'EXAM_FINISHED':
            default:
                return {
                    icon: GraduationCap,
                    wrapper: isDarkMode
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-indigo-100 text-indigo-900 border-indigo-200',
                };
        }
    };

    const displayedNotifications =
        activeTab === 'UNREAD'
            ? notifications.filter((n) => !n.is_read)
            : notifications;

    const hasReadItems = notifications.some((n) => n.is_read);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    const nextState = !isOpen;
                    setIsOpen(nextState);
                    if (nextState) fetchNotifications();
                }}
                aria-label="Notifikasi Aktivitas Pendaftar"
                title="Notifikasi Panitia"
                className={`relative p-2.5 rounded-xl border transition-all duration-200 shadow-sm active:scale-95 ${isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                    : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                    }`}
            >
                <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className={`fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-20 sm:top-auto sm:mt-2 sm:w-[400px] rounded-2xl border shadow-2xl z-40 overflow-hidden ${isDarkMode
                            ? 'bg-gray-900 border-gray-700 text-gray-100'
                            : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                            }`}
                    >
                        {/* Header Panel */}
                        <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${isDarkMode ? 'bg-gray-950/70 border-gray-800' : 'bg-[#f7f1ea] border-[#e2d4c5]'}`}>
                            <div>
                                <h3 className="text-sm font-extrabold flex items-center gap-2">
                                    <span>Notifikasi Panitia</span>
                                    {unreadCount > 0 && (
                                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                            {unreadCount} Baru
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>Baca Semua</span>
                                    </button>
                                )}
                                {hasReadItems && (
                                    <button
                                        type="button"
                                        onClick={handleClearRead}
                                        title="Hapus notifikasi yang sudah dibaca"
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Tab */}
                        <div className={`px-4 py-2 border-b flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-[#efe4d6] bg-[#fffdf9]'}`}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('ALL')}
                                className={`px-2.5 py-1 rounded-lg transition-colors ${activeTab === 'ALL'
                                    ? isDarkMode
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-[#b85c38] text-white'
                                    : isDarkMode
                                        ? 'text-gray-400 hover:bg-gray-800'
                                        : 'text-[#5c4337] hover:bg-[#f5ece1]'
                                    }`}
                            >
                                Semua ({notifications.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('UNREAD')}
                                className={`px-2.5 py-1 rounded-lg transition-colors ${activeTab === 'UNREAD'
                                    ? isDarkMode
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-[#b85c38] text-white'
                                    : isDarkMode
                                        ? 'text-gray-400 hover:bg-gray-800'
                                        : 'text-[#5c4337] hover:bg-[#f5ece1]'
                                    }`}
                            >
                                Belum Dibaca ({unreadCount})
                            </button>
                        </div>

                        {/* Daftar Notifikasi */}
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800">
                            {isLoading ? (
                                <div className="py-10 text-center text-xs font-semibold opacity-70">
                                    Memuat notifikasi...
                                </div>
                            ) : displayedNotifications.length === 0 ? (
                                <div className="py-10 px-4 text-center space-y-1">
                                    <p className="text-xs font-extrabold opacity-80">
                                        {activeTab === 'UNREAD'
                                            ? 'Tidak ada notifikasi yang belum dibaca.'
                                            : 'Belum ada aktivitas notifikasi.'}
                                    </p>
                                    <p className="text-[11px] opacity-60">
                                        Notifikasi akan muncul otomatis saat ada pendaftar baru, perbaikan berkas, atau daftar ulang.
                                    </p>
                                </div>
                            ) : (
                                displayedNotifications.map((item) => {
                                    const badge = renderTypeBadge(item.type);
                                    const IconComponent = badge.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleItemClick(item)}
                                            className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${!item.is_read
                                                ? isDarkMode
                                                    ? 'bg-teal-950/35 hover:bg-teal-950/55'
                                                    : 'bg-[#fdf6ee] hover:bg-[#f8ecdd]'
                                                : isDarkMode
                                                    ? 'hover:bg-gray-800/70'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badge.wrapper}`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-extrabold truncate">
                                                        {item.title}
                                                    </p>
                                                    {!item.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                                                    )}
                                                </div>
                                                <p className={`text-xs mt-0.5 leading-snug ${isDarkMode ? 'text-gray-300' : 'text-[#4a352b]'}`}>
                                                    {item.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold opacity-70">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatRelativeTime(item.created_at)}
                                                    </span>
                                                    {item.registration_number && (
                                                        <>
                                                            <span>&bull;</span>
                                                            <span className="font-mono">{item.registration_number}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );


}