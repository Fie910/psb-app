// src/components/ReferralInputWithScanner.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { QrCode, Camera, Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ReferralInputWithScannerProps {
    value: string;
    onChange: (val: string) => void;
    onValidationChange?: (isValid: boolean) => void;
    isDarkMode?: boolean;
}

function extractReferralCode(raw: string): string {
    const trimmed = raw.trim();
    try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const url = new URL(trimmed);
            const refParam = url.searchParams.get('ref') || url.searchParams.get('referral');
            if (refParam) return refParam.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
        }
    } catch {
        // Not a URL, fallback to raw
    }
    return trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

export default function ReferralInputWithScanner({
    value,
    onChange,
    onValidationChange,
    isDarkMode = false,
}: ReferralInputWithScannerProps) {
    const [checking, setChecking] = useState(false);
    const [statusInfo, setStatusInfo] = useState<{
        valid: boolean;
        message: string;
        detail?: string;
    } | null>(null);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    const validateCode = useCallback(
        async (code: string) => {
            const clean = code.trim().toUpperCase();
            if (!clean) {
                setStatusInfo(null);
                onValidationChange?.(true);
                return;
            }
            if (clean.length < 5) {
                setStatusInfo({ valid: false, message: 'Kode referal harus 5 karakter.' });
                onValidationChange?.(false);
                return;
            }
            setChecking(true);
            try {
                const res = await fetch(`/api/referral?code=${encodeURIComponent(clean)}`);
                const data = await res.json();
                if (res.ok && data.valid && data.referral) {
                    setStatusInfo({
                        valid: true,
                        message: `Kode aktif: ${data.referral.referrer_name}`,
                        detail: `${data.referral.jabatan} • ${data.referral.origin_school}`,
                    });
                    onValidationChange?.(true);
                } else if (data.status === 'pending') {
                    setStatusInfo({
                        valid: false,
                        message: 'Kode referal masih menunggu persetujuan admin.',
                    });
                    onValidationChange?.(false);
                } else if (data.status === 'inactive') {
                    setStatusInfo({
                        valid: false,
                        message: 'Kode referal sudah dinonaktifkan.',
                    });
                    onValidationChange?.(false);
                } else {
                    setStatusInfo({
                        valid: false,
                        message: data.error || 'Kode referal tidak ditemukan.',
                    });
                    onValidationChange?.(false);
                }
            } catch {
                setStatusInfo({ valid: false, message: 'Gagal memvalidasi kode referal.' });
                onValidationChange?.(false);
            } finally {
                setChecking(false);
            }
        },
        [onValidationChange]
    );

    // Auto-fill from URL ?ref= or ?referral=
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref') || params.get('referral');
        if (refParam) {
            const clean = extractReferralCode(refParam);
            if (clean) {
                onChange(clean);
                validateCode(clean);
            }
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!scannerOpen) {
            stopCamera();
            return;
        }
        let cancelled = false;
        const startCamera = async () => {
            setCameraError('');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const tick = () => {
                    if (cancelled || !videoRef.current || !ctx) return;
                    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                        canvas.width = videoRef.current.videoWidth;
                        canvas.height = videoRef.current.videoHeight;
                        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const qr = jsQR(imgData.data, imgData.width, imgData.height);
                        if (qr?.data) {
                            const extracted = extractReferralCode(qr.data);
                            if (extracted) {
                                onChange(extracted);
                                validateCode(extracted);
                                setScannerOpen(false);
                                return;
                            }
                        }
                    }
                    rafRef.current = requestAnimationFrame(tick);
                };
                rafRef.current = requestAnimationFrame(tick);
            } catch {
                setCameraError('Kamera tidak dapat diakses. Anda dapat mengunggah gambar QR di bawah.');
            }
        };
        startCamera();
        return () => {
            cancelled = true;
            stopCamera();
        };
    }, [scannerOpen, onChange, validateCode, stopCamera]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qr = jsQR(imgData.data, imgData.width, imgData.height);
                if (qr?.data) {
                    const extracted = extractReferralCode(qr.data);
                    if (extracted) {
                        onChange(extracted);
                        validateCode(extracted);
                        setScannerOpen(false);
                        return;
                    }
                }
                setCameraError('QR Code tidak terbaca pada gambar tersebut.');
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-bold">
                Kode Referal Guru / Wali Kelas (Opsional)
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        const clean = extractReferralCode(e.target.value);
                        onChange(clean);
                        if (clean.length === 5 || clean.length === 0) {
                            validateCode(clean);
                        } else {
                            setStatusInfo(null);
                            onValidationChange?.(false);
                        }
                    }}
                    placeholder="Contoh: K8M4P"
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-mono uppercase tracking-widest ${isDarkMode
                        ? 'bg-gray-950 border-gray-700 text-white'
                        : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs shrink-0"
                >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR</span>
                </button>
            </div>

            {checking && (
                <p className="text-xs flex items-center gap-1.5 opacity-75">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memeriksa kode referal...</span>
                </p>
            )}

            {!checking && statusInfo && (
                <div
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${statusInfo.valid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                        }`}
                >
                    {statusInfo.valid ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className="font-bold">{statusInfo.message}</p>
                        {statusInfo.detail && <p className="opacity-80">{statusInfo.detail}</p>}
                    </div>
                </div>
            )}

            {scannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
                    <div
                        className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4 ${isDarkMode
                            ? 'bg-gray-900 border-gray-700 text-gray-100'
                            : 'bg-white border-[#cbb7a2] text-[#1f1410]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-extrabold flex items-center gap-2">
                                <Camera className="w-4 h-4 text-emerald-600" />
                                <span>Pindai QR Code Referal</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setScannerOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        </div>

                        {cameraError && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{cameraError}</p>
                        )}

                        <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed cursor-pointer text-xs font-bold hover:bg-emerald-500/10">
                            <Upload className="w-4 h-4 text-emerald-600" />
                            <span>Atau Pilih Gambar QR dari Galeri</span>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
