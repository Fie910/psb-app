//src/app/daftar-ulang/page.tsx
'use client'; import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import QRCode from 'react-qr-code';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { extractYoutubeVideoId } from '@/lib/rereg-schema';
import {
    Search,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ExternalLink,
    PlayCircle,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Sparkles,
    ShieldCheck,
    UserCheck,
    Users,
    FileUp,
    Shirt,
    HeartPulse,
    Printer,
    Clock,
    AlertTriangle,
    Edit3,
    FileText,
    Image as ImageIcon,
    Download,
    Check
} from 'lucide-react'; type ApplicantInfo = {
    id: number;
    registration_number: string;
    full_name: string;
    email: string;
    phone: string | null;
    asal_sekolah: string | null;
    father_name: string | null;
    mother_name: string | null;
    parent_phone: string | null;
    school_choice: string;
    school_choice_2: string | null;
    registration_path: string | null;
    status: string;
    nisn: string;
    tanggal_lahir: string;
    accepted_major: string | null;
    accepted_at: string | null;
}; type SiteSettingsInfo = {
    school_name?: string;
    foundation_name?: string;
    school_address?: string;
    school_city?: string;
    headmaster_name?: string;
    headmaster_nip?: string;
    logo_url?: string;
    contact_wa?: string;
    rereg_start?: string | null;
    rereg_end?: string | null;
    rereg_instructions?: string | null;
    payment_portal_url?: string;
    payment_tutorial_youtube_url?: string | null;
}; type ReRegistrationRecord = {
    id: number;
    applicant_id: number;
    payment_scheme: string;
    doc_kuitansi_gosiswa: string;
    nik: string;
    no_kk: string;
    birth_place: string;
    gender: string;
    religion: string;
    child_order: number | null;
    siblings_count: number | null;
    address_street: string;
    rt_rw: string | null;
    village: string;
    district: string;
    city: string;
    postal_code: string | null;
    living_with: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    blood_type: string | null;
    medical_notes: string | null;
    uniform_size: string;
    father_nik: string | null;
    father_education: string | null;
    father_occupation: string | null;
    father_income: string | null;
    mother_nik: string | null;
    mother_education: string | null;
    mother_occupation: string | null;
    mother_income: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_occupation: string | null;
    doc_pas_foto: string;
    doc_skl_ijazah: string;
    doc_pernyataan: string;
    rereg_status: string;
    rereg_notes: string | null;
    submitted_at: string;
    verified_at: string | null;
}; const UNIFORM_CHART = [
    { size: 'S', chest: '48 cm', length: '66 cm', fit: 'BB ± 40–48 kg' },
    { size: 'M', chest: '50 cm', length: '68 cm', fit: 'BB ± 49–56 kg' },
    { size: 'L', chest: '52 cm', length: '70 cm', fit: 'BB ± 57–65 kg' },
    { size: 'XL', chest: '54 cm', length: '72 cm', fit: 'BB ± 66–75 kg' },
    { size: 'XXL', chest: '57 cm', length: '74 cm', fit: 'BB ± 76–85 kg' },
    { size: 'XXXL', chest: '60 cm', length: '76 cm', fit: 'BB > 85 kg' },
]; const EDUCATION_OPTIONS = ['Tidak Sekolah', 'SD / Sederajat', 'SMP / Sederajat', 'SMA / SMK / Sederajat', 'D1 / D2 / D3', 'S1 / D4', 'S2 / S3'];
const OCCUPATION_OPTIONS = ['Tidak Bekerja', 'Ibu Rumah Tangga', 'Buruh', 'Petani / Pekebun', 'Pedagang / Wiraswasta', 'Karyawan Swasta', 'PNS / TNI / Polri', 'Guru / Dosen', 'Pensiunan', 'Lainnya'];
const INCOME_OPTIONS = ['Tidak Berpenghasilan', '< Rp 1.000.000', 'Rp 1.000.000 - Rp 2.000.000', 'Rp 2.000.000 - Rp 5.000.000', '> Rp 5.000.000']; function DaftarUlangContent() {
    const { isDarkMode } = useTheme();
    const searchParams = useSearchParams();// State Autentikasi Siswa
    const [nisn, setNisn] = useState(searchParams.get('nisn') || '');
    const [tanggalLahir, setTanggalLahir] = useState(searchParams.get('tgl') || '');
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState('');

    // Data Siswa, Settings & Existing Re-Registration
    const [applicant, setApplicant] = useState<ApplicantInfo | null>(null);
    const [settings, setSettings] = useState<SiteSettingsInfo | null>(null);
    const [existingRereg, setExistingRereg] = useState<ReRegistrationRecord | null>(null);
    const [pasFotoUrl, setPasFotoUrl] = useState<string | null>(null);
    const [isEditingRevision, setIsEditingRevision] = useState(false);

    // State Panel Pembayaran gosiswa.com & Lite YouTube
    const [showTutorialVideo, setShowTutorialVideo] = useState(false);
    const [isPlayingVideo, setIsPlayingVideo] = useState(false);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    // State Form 3 Langkah
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgressText, setUploadProgressText] = useState('');

    // Langkah 1: Kependudukan & Alamat
    const [nik, setNik] = useState('');
    const [noKk, setNoKk] = useState('');
    const [birthPlace, setBirthPlace] = useState('');
    const [gender, setGender] = useState('Laki-laki');
    const [religion, setReligion] = useState('Islam');
    const [childOrder, setChildOrder] = useState('1');
    const [siblingsCount, setSiblingsCount] = useState('1');
    const [addressStreet, setAddressStreet] = useState('');
    const [rtRw, setRtRw] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [livingWith, setLivingWith] = useState('Bersama Orang Tua');

    // Langkah 2: Orang Tua/Wali, Kesehatan & Seragam SMK
    const [fatherNik, setFatherNik] = useState('');
    const [fatherEducation, setFatherEducation] = useState('SMA / SMK / Sederajat');
    const [fatherOccupation, setFatherOccupation] = useState('Pedagang / Wiraswasta');
    const [fatherIncome, setFatherIncome] = useState('Rp 1.000.000 - Rp 2.000.000');

    const [motherNik, setMotherNik] = useState('');
    const [motherEducation, setMotherEducation] = useState('SMA / SMK / Sederajat');
    const [motherOccupation, setMotherOccupation] = useState('Ibu Rumah Tangga');
    const [motherIncome, setMotherIncome] = useState('Tidak Berpenghasilan');

    const [hasGuardian, setHasGuardian] = useState(false);
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [guardianOccupation, setGuardianOccupation] = useState('');

    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [bloodType, setBloodType] = useState('Belum Tahu');
    const [medicalNotes, setMedicalNotes] = useState('');
    const [uniformSize, setUniformSize] = useState('L');
    const [showSizeGuide, setShowSizeGuide] = useState(false);

    // Langkah 3: Pembayaran & Unggah Berkas
    const [paymentScheme, setPaymentScheme] = useState('Minimal (DP)');
    const [fileKuitansi, setFileKuitansi] = useState<File | null>(null);
    const [filePasFoto, setFilePasFoto] = useState<File | null>(null);
    const [localFotoPreview, setLocalFotoPreview] = useState<string | null>(null);
    const [fileSkl, setFileSkl] = useState<File | null>(null);
    const [filePernyataan, setFilePernyataan] = useState<File | null>(null);
    const [agreedTerms, setAgreedTerms] = useState(false);

    const populateFormFromRecord = (rec: ReRegistrationRecord) => {
        setNik(rec.nik || '');
        setNoKk(rec.no_kk || '');
        setBirthPlace(rec.birth_place || '');
        setGender(rec.gender || 'Laki-laki');
        setReligion(rec.religion || 'Islam');
        setChildOrder(rec.child_order ? String(rec.child_order) : '1');
        setSiblingsCount(rec.siblings_count ? String(rec.siblings_count) : '1');
        setAddressStreet(rec.address_street || '');
        setRtRw(rec.rt_rw || '');
        setVillage(rec.village || '');
        setDistrict(rec.district || '');
        setCity(rec.city || '');
        setPostalCode(rec.postal_code || '');
        setLivingWith(rec.living_with || 'Bersama Orang Tua');

        setFatherNik(rec.father_nik || '');
        setFatherEducation(rec.father_education || 'SMA / SMK / Sederajat');
        setFatherOccupation(rec.father_occupation || 'Pedagang / Wiraswasta');
        setFatherIncome(rec.father_income || 'Rp 1.000.000 - Rp 2.000.000');

        setMotherNik(rec.mother_nik || '');
        setMotherEducation(rec.mother_education || 'SMA / SMK / Sederajat');
        setMotherOccupation(rec.mother_occupation || 'Ibu Rumah Tangga');
        setMotherIncome(rec.mother_income || 'Tidak Berpenghasilan');

        if (rec.guardian_name || rec.guardian_phone) {
            setHasGuardian(true);
            setGuardianName(rec.guardian_name || '');
            setGuardianPhone(rec.guardian_phone || '');
            setGuardianOccupation(rec.guardian_occupation || '');
        }

        setHeightCm(rec.height_cm ? String(rec.height_cm) : '');
        setWeightKg(rec.weight_kg ? String(rec.weight_kg) : '');
        setBloodType(rec.blood_type || 'Belum Tahu');
        setMedicalNotes(rec.medical_notes || '');
        setUniformSize(rec.uniform_size || 'L');
        setPaymentScheme(rec.payment_scheme || 'Minimal (DP)');
        setPaymentConfirmed(true);
    };

    const performLookup = async (targetNisn: string, targetTgl: string) => {
        if (!targetNisn || !targetTgl) return;
        setIsLookingUp(true);
        setLookupError('');

        try {
            const res = await fetch('/api/daftar-ulang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'lookup',
                    nisn: targetNisn.trim(),
                    tanggal_lahir: targetTgl.trim(),
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setLookupError(data.error || 'Gagal memuat data peserta.');
            } else {
                setApplicant(data.applicant);
                setSettings(data.settings);
                setExistingRereg(data.rereg);
                setPasFotoUrl(data.pasFotoPreviewUrl || null);
                if (data.rereg) {
                    populateFormFromRecord(data.rereg);
                }
            }
        } catch {
            setLookupError('Terjadi kesalahan jaringan. Silakan coba lagi.');
        } finally {
            setIsLookingUp(false);
        }
    };

    useEffect(() => {
        const qNisn = searchParams.get('nisn');
        const qTgl = searchParams.get('tgl');
        if (qNisn && qTgl) {
            performLookup(qNisn, qTgl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await performLookup(nisn, tanggalLahir);
    };

    const handlePasFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFilePasFoto(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setLocalFotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setLocalFotoPreview(null);
        }
    };

    const uploadSingleFile = async (file: File, docType: string, studentName: string): Promise<string> => {
        let fileToUpload: File | Blob = file;
        let contentType = file.type || 'application/octet-stream';

        if (contentType.startsWith('image/')) {
            const options = {
                maxSizeMB: docType === 'DU-PasFoto' ? 0.25 : 0.35,
                maxWidthOrHeight: docType === 'DU-PasFoto' ? 800 : 1280,
                useWebWorker: true,
            };
            fileToUpload = await imageCompression(file, options);
            contentType = fileToUpload.type || contentType;
        }

        const presignRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                fileType: contentType,
                studentName,
                docType,
            }),
        });

        if (!presignRes.ok) {
            throw new Error(`Gagal menyiapkan unggahan ${docType}`);
        }

        const { signedUrl, key } = await presignRes.json();
        const putRes = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: fileToUpload,
        });

        if (!putRes.ok) {
            throw new Error(`Gagal mengunggah berkas ${docType}`);
        }

        return key;
    };

    const validateStep1 = () => {
        if (!/^\d{16}$/.test(nik)) {
            toast.error('NIK Siswa wajib 16 digit angka!');
            return false;
        }
        if (!/^\d{16}$/.test(noKk)) {
            toast.error('Nomor Kartu Keluarga (No. KK) wajib 16 digit angka!');
            return false;
        }
        if (!birthPlace.trim()) {
            toast.error('Tempat Lahir wajib diisi!');
            return false;
        }
        if (!addressStreet.trim() || !village.trim() || !district.trim() || !city.trim()) {
            toast.error('Alamat domisili (Jalan/Kampung, Desa/Kelurahan, Kecamatan, Kabupaten/Kota) wajib lengkap!');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (fatherNik && !/^\d{16}$/.test(fatherNik)) {
            toast.error('NIK Ayah harus 16 digit angka (atau kosongkan jika belum ada).');
            return false;
        }
        if (motherNik && !/^\d{16}$/.test(motherNik)) {
            toast.error('NIK Ibu harus 16 digit angka (atau kosongkan jika belum ada).');
            return false;
        }
        if (!uniformSize) {
            toast.error('Pilih ukuran seragam praktik & olahraga!');
            return false;
        }
        return true;
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!applicant) return;

        const isUpdating = Boolean(existingRereg);

        if (!isUpdating) {
            if (!fileKuitansi) {
                toast.error('Wajib mengunggah Kuitansi Digital gosiswa.com (atau Surat Keterangan Keringanan)!');
                return;
            }
            if (!filePasFoto) {
                toast.error('Wajib mengunggah Pas Foto Resmi 3x4 terbaru!');
                return;
            }
            if (!fileSkl) {
                toast.error('Wajib mengunggah Scan SKL / Ijazah SMP/MTs!');
                return;
            }
            if (!filePernyataan) {
                toast.error('Wajib mengunggah Scan Surat Pernyataan Siswa & Orang Tua!');
                return;
            }
        }

        if (!agreedTerms) {
            toast.error('Harap centang pernyataan kebenaran data dan kesediaan mematuhi tata tertib sekolah.');
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading('Mengunggah berkas & menyimpan Daftar Ulang...');

        try {
            let keyKuitansi = existingRereg?.doc_kuitansi_gosiswa || '';
            let keyPasFoto = existingRereg?.doc_pas_foto || '';
            let keySkl = existingRereg?.doc_skl_ijazah || '';
            let keyPernyataan = existingRereg?.doc_pernyataan || '';

            if (fileKuitansi) {
                setUploadProgressText('Mengunggah Kuitansi Digital gosiswa.com...');
                keyKuitansi = await uploadSingleFile(fileKuitansi, 'DU-Kuitansi', applicant.full_name);
            }
            if (filePasFoto) {
                setUploadProgressText('Mengompresi & mengunggah Pas Foto 3x4...');
                keyPasFoto = await uploadSingleFile(filePasFoto, 'DU-PasFoto', applicant.full_name);
            }
            if (fileSkl) {
                setUploadProgressText('Mengunggah Scan SKL / Ijazah...');
                keySkl = await uploadSingleFile(fileSkl, 'DU-SKL', applicant.full_name);
            }
            if (filePernyataan) {
                setUploadProgressText('Mengunggah Surat Pernyataan...');
                keyPernyataan = await uploadSingleFile(filePernyataan, 'DU-Pernyataan', applicant.full_name);
            }

            setUploadProgressText('Menyimpan data formulir daftar ulang...');
            const res = await fetch('/api/daftar-ulang', {
                method: isUpdating ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nisn: applicant.nisn,
                    tanggal_lahir: applicant.tanggal_lahir,
                    payment_scheme: paymentScheme,
                    doc_kuitansi_gosiswa: keyKuitansi,
                    nik,
                    no_kk: noKk,
                    birth_place: birthPlace,
                    gender,
                    religion,
                    child_order: childOrder,
                    siblings_count: siblingsCount,
                    address_street: addressStreet,
                    rt_rw: rtRw,
                    village,
                    district,
                    city,
                    postal_code: postalCode,
                    living_with: livingWith,
                    height_cm: heightCm,
                    weight_kg: weightKg,
                    blood_type: bloodType,
                    medical_notes: medicalNotes,
                    uniform_size: uniformSize,
                    father_nik: fatherNik,
                    father_education: fatherEducation,
                    father_occupation: fatherOccupation,
                    father_income: fatherIncome,
                    mother_nik: motherNik,
                    mother_education: motherEducation,
                    mother_occupation: motherOccupation,
                    mother_income: motherIncome,
                    guardian_name: hasGuardian ? guardianName : null,
                    guardian_phone: hasGuardian ? guardianPhone : null,
                    guardian_occupation: hasGuardian ? guardianOccupation : null,
                    doc_pas_foto: keyPasFoto,
                    doc_skl_ijazah: keySkl,
                    doc_pernyataan: keyPernyataan,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Gagal menyimpan daftar ulang.', { id: loadingToast });
            } else {
                toast.success('Daftar Ulang berhasil dikirim!', { id: loadingToast });
                setExistingRereg(data.rereg);
                if (data.pasFotoPreviewUrl) {
                    setPasFotoUrl(data.pasFotoPreviewUrl);
                } else if (localFotoPreview) {
                    setPasFotoUrl(localFotoPreview);
                }
                setIsEditingRevision(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error(err);
            toast.error('Terjadi kesalahan saat mengunggah berkas.', { id: loadingToast });
        } finally {
            setIsSubmitting(false);
            setUploadProgressText('');
        }
    };

    const formatDateIndo = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        const clean = dateStr.split('T')[0];
        const d = new Date(clean + 'T00:00:00');
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const handleDownloadTemplatePernyataan = () => {
        const schoolName = settings?.school_name || 'SMK KH. A. WAHAB MUHSIN';
        const majorName = applicant?.accepted_major || applicant?.school_choice || '-';
        const content = `SURAT PERNYATAAN CALON PESERTA DIDIK BARU & ORANG TUA/WALI
${schoolName.toUpperCase()}
Tahun Ajaran ${new Date().getFullYear()}/${new Date().getFullYear() + 1}Yang bertanda tangan di bawah ini:Nama Calon Siswa   : ${applicant?.full_name || '........................................'}
NISN               : ${applicant?.nisn || '........................................'}
No. Pendaftaran    : ${applicant?.registration_number || '........................................'}
Kompetensi Keahlian: ${majorName}Nama Orang Tua/Wali: ${applicant?.father_name || applicant?.mother_name || '........................................'}
No. HP / WhatsApp  : ${applicant?.parent_phone || '........................................'}Dengan ini menyatakan dengan sesungguhnya bahwa:Seluruh data dan dokumen yang kami lampirkan pada proses Daftar Ulang PSB adalah benar dan sah.Calon peserta didik bersedia menaati seluruh tata tertib, peraturan akademik, dan budaya kerja industri yang berlaku di ${schoolName}.Bersedia mengikuti kegiatan Masa Pengenalan Lingkungan Sekolah (MPLS) sesuai jadwal yang ditetapkan panitia.Demikian surat pernyataan ini dibuat dengan penuh kesadaran untuk dipergunakan sebagaimana mestinya.${settings?.school_city || 'Tasikmalaya'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}Mengetahui,
Orang Tua / Wali Siswa                          Calon Peserta Didik Baru,( ________________________ )                    ( ${applicant?.full_name || '________________________'} )
`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Template_Surat_Pernyataan_${applicant?.registration_number || 'PSB'}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Template Surat Pernyataan berhasil diunduh!');
    }; const youtubeVideoId = extractYoutubeVideoId(settings?.payment_tutorial_youtube_url);
    const portalUrl = settings?.payment_portal_url || 'https://gosiswa.com';

    const bgPage = isDarkMode
        ? 'bg-linear-to-br from-gray-950 via-slate-900 to-black text-gray-100'
        : 'bg-linear-to-br from-[#d5beaa] via-[#b89779] to-[#987657] text-[#1f1410]';

    const cardGlass = isDarkMode
        ? 'bg-gray-900/85 border-gray-800 backdrop-blur-xl shadow-2xl shadow-black/50'
        : 'bg-[#fffdf9]/95 border-white backdrop-blur-xl shadow-2xl shadow-[#5c4033]/20';

    const inputCls = isDarkMode
        ? 'bg-gray-950/80 border-gray-700 text-white placeholder:text-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
        : 'bg-white border-[#cbb7a2] text-[#1f1410] placeholder:text-[#7a6358] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20';

    const labelCls = isDarkMode ? 'text-gray-200' : 'text-[#2b1d18]';
    const subTextCls = isDarkMode ? 'text-gray-300' : 'text-[#4a352b]';

    return (
        <>
            {/* ================= TAMPILAN WEB ================= */}
            <main className={`min-h-screen p-4 sm:p-8 font-sans relative overflow-x-hidden print:hidden transition-colors duration-500 ${bgPage}`}>
                <Toaster position="top-center" />

                <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none ${isDarkMode ? 'bg-teal-700' : 'bg-[#e3c8af]'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none ${isDarkMode ? 'bg-indigo-700' : 'bg-[#f0decb]'}`}></div>

                {/* Top Bar */}
                <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 relative z-20">
                    <Link
                        href="/cek-status"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${isDarkMode
                            ? 'bg-gray-900/80 hover:bg-gray-800 border-gray-700 text-gray-200'
                            : 'bg-white/90 hover:bg-white border-[#cbb7a2] text-[#2b1d18] shadow-sm'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali ke Cek Status</span>
                    </Link>
                    <ThemeToggle />
                </div>

                {/* KONDISI 1: BELUM LOGIN / LOOKUP */}
                {!applicant && (
                    <div className={`max-w-md mx-auto p-6 sm:p-8 rounded-3xl border relative z-10 ${cardGlass}`}>
                        <div className="text-center mb-6">
                            <span className={`inline-block text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border mb-3 ${isDarkMode
                                ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                                : 'bg-[#b85c38]/12 text-[#8f3f20] border-[#b85c38]/30'
                                }`}>
                                Tahap Akhir PSB
                            </span>
                            <h1 className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-[#1f1410]'}`}>
                                Portal Daftar Ulang
                            </h1>
                            <p className={`text-sm font-medium mt-1 ${subTextCls}`}>
                                Masukkan NISN dan Tanggal Lahir peserta yang telah dinyatakan <strong>DITERIMA</strong>.
                            </p>
                        </div>

                        {lookupError && (
                            <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs sm:text-sm font-semibold mb-5 ${isDarkMode
                                ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                                : 'bg-rose-50 border-rose-300 text-rose-800'
                                }`}>
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                <span>{lookupError}</span>
                            </div>
                        )}

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>NISN (10 Digit)</label>
                                <input
                                    type="text"
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    maxLength={10}
                                    required
                                    placeholder="Masukkan 10 digit NISN"
                                    className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition-all ${inputCls}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Tanggal Lahir</label>
                                <input
                                    type="date"
                                    value={tanggalLahir}
                                    onChange={(e) => setTanggalLahir(e.target.value)}
                                    required
                                    className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition-all ${inputCls}`}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLookingUp}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-extrabold text-sm sm:text-base text-white shadow-lg transition-all disabled:opacity-50 ${isDarkMode
                                    ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/40'
                                    : 'bg-[#b85c38] hover:bg-[#a04d2c] shadow-[#b85c38]/30'
                                    }`}
                            >
                                <Search className="w-4 h-4" />
                                <span>{isLookingUp ? 'Memeriksa Data...' : 'Lanjutkan Daftar Ulang'}</span>
                            </button>
                        </form>
                    </div>
                )}

                {/* KONDISI 2: SUDAH SUBMIT & TIDAK SEDANG MODE EDIT PERBAIKAN */}
                {applicant && existingRereg && !isEditingRevision && (
                    <div className="max-w-3xl mx-auto space-y-6 relative z-10">
                        <div className={`p-6 sm:p-8 rounded-3xl border ${cardGlass}`}>
                            {/* Banner Status Daftar Ulang */}
                            <div className={`p-5 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${existingRereg.rereg_status === 'Terverifikasi'
                                ? isDarkMode ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200' : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                                : existingRereg.rereg_status === 'Perbaikan Daftar Ulang'
                                    ? isDarkMode ? 'bg-amber-950/60 border-amber-600 text-amber-200' : 'bg-amber-50 border-amber-400 text-amber-950'
                                    : isDarkMode ? 'bg-blue-950/60 border-blue-600 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-950'
                                }`}>
                                <div className="flex items-start gap-3.5">
                                    {existingRereg.rereg_status === 'Terverifikasi' ? (
                                        <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    ) : existingRereg.rereg_status === 'Perbaikan Daftar Ulang' ? (
                                        <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <span className="text-xs font-extrabold uppercase tracking-wider opacity-80 block">
                                            Status Daftar Ulang
                                        </span>
                                        <h2 className="text-xl font-extrabold mt-0.5">
                                            {existingRereg.rereg_status === 'Terverifikasi'
                                                ? 'Terverifikasi (Resmi Terdaftar)'
                                                : existingRereg.rereg_status}
                                        </h2>
                                        <p className="text-xs sm:text-sm mt-1 opacity-90">
                                            {existingRereg.rereg_status === 'Terverifikasi'
                                                ? 'Selamat! Proses daftar ulang dan validasi pembayaran Anda telah disetujui panitia. Silakan cetak Kartu Bukti Daftar Ulang di bawah ini.'
                                                : existingRereg.rereg_status === 'Perbaikan Daftar Ulang'
                                                    ? 'Panitia meminta perbaikan pada data atau berkas daftar ulang Anda. Silakan periksa catatan dan kirim ulang perbaikan.'
                                                    : 'Data dan kuitansi pembayaran gosiswa.com Anda sedang dalam proses verifikasi oleh Panitia & Bendahara sekolah.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Catatan Perbaikan jika ada */}
                            {existingRereg.rereg_status === 'Perbaikan Daftar Ulang' && (
                                <div className={`p-4 rounded-2xl border mb-6 ${isDarkMode ? 'bg-amber-900/30 border-amber-700 text-amber-200' : 'bg-amber-100/80 border-amber-400 text-amber-950'}`}>
                                    <p className="text-xs font-extrabold uppercase mb-1">Catatan Perbaikan dari Panitia:</p>
                                    <p className="text-sm font-semibold mb-3">{existingRereg.rereg_notes || 'Harap periksa kembali kelengkapan dokumen dan data Anda.'}</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditingRevision(true);
                                            setStep(1);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        <span>Perbaiki Data &amp; Berkas Sekarang</span>
                                    </button>
                                </div>
                            )}

                            {/* Ringkasan Data Siswa & Daftar Ulang */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                                <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[#cbb7a2] dark:border-gray-700 bg-white/70 dark:bg-gray-950/60">
                                    {pasFotoUrl ? (
                                        <img
                                            src={pasFotoUrl}
                                            alt={`Pas Foto ${applicant.full_name}`}
                                            className="w-28 h-36 object-cover rounded-xl border-2 border-[#b85c38] shadow-md"
                                        />
                                    ) : (
                                        <div className="w-28 h-36 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                                            Pas Foto 3x4
                                        </div>
                                    )}
                                    <span className="mt-2.5 text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-[#b85c38]/15 text-[#8f3f20] dark:bg-teal-500/20 dark:text-teal-300">
                                        {applicant.registration_number}
                                    </span>
                                </div>

                                <div className="md:col-span-2 p-4 rounded-2xl border border-[#cbb7a2] dark:border-gray-700 bg-white/70 dark:bg-gray-950/60 space-y-2.5 text-xs sm:text-sm">
                                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                        <span className={subTextCls}>Nama Lengkap</span>
                                        <span className="font-extrabold text-right">{applicant.full_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                        <span className={subTextCls}>NISN / NIK</span>
                                        <span className="font-mono font-bold text-right">{applicant.nisn} / {existingRereg.nik}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                        <span className={subTextCls}>Kompetensi Keahlian</span>
                                        <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-right">
                                            {applicant.accepted_major || applicant.school_choice}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                                        <span className={subTextCls}>Skema Pembayaran</span>
                                        <span className="font-extrabold text-right">{existingRereg.payment_scheme}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={subTextCls}>Ukuran Seragam SMK</span>
                                        <span className="font-extrabold text-right">Ukuran {existingRereg.uniform_size}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Cetak Kartu Bukti Daftar Ulang */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const orig = document.title;
                                        document.title = `Kartu_Daftar_Ulang_${applicant.full_name}`;
                                        window.print();
                                        document.title = orig;
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg transition-all"
                                >
                                    <Printer className="w-5 h-5" />
                                    <span>Cetak Kartu Bukti Daftar Ulang (PDF)</span>
                                </button>
                                <Link
                                    href="/cek-status"
                                    className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-bold text-sm border transition-all ${isDarkMode
                                        ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                        : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                        }`}
                                >
                                    <span>Selesai &amp; Kembali</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* KONDISI 3: BELUM DAFTAR ULANG ATAU SEDANG EDIT PERBAIKAN */}
                {applicant && (!existingRereg || isEditingRevision) && (
                    <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                        {/* Header Identitas Siswa Diterima */}
                        <div className={`p-6 rounded-3xl border ${cardGlass}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                        Status: Diterima &bull; {applicant.registration_number}
                                    </span>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">{applicant.full_name}</h1>
                                    <p className={`text-sm font-semibold mt-0.5 ${subTextCls}`}>
                                        Jurusan Diterima: <strong className="text-[#9e4522] dark:text-teal-300">{applicant.accepted_major || applicant.school_choice}</strong>
                                    </p>
                                </div>
                                {(settings?.rereg_start || settings?.rereg_end) && (
                                    <div className={`px-4 py-2.5 rounded-2xl border text-xs ${isDarkMode ? 'bg-gray-950/70 border-gray-700 text-gray-200' : 'bg-[#faf4ec] border-[#cbb7a2] text-[#2b1d18]'}`}>
                                        <span className="font-bold block opacity-75">Periode Daftar Ulang:</span>
                                        <span className="font-extrabold">
                                            {formatDateIndo(settings.rereg_start)} s.d. {formatDateIndo(settings.rereg_end)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PANEL PERSIAPAN PEMBAYARAN GOSISWA.COM */}
                        <div className={`p-6 sm:p-8 rounded-3xl border space-y-5 ${cardGlass}`}>
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-2xl bg-[#b85c38]/15 text-[#9e4522] dark:bg-teal-500/20 dark:text-teal-300 shrink-0">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#9e4522] dark:text-teal-400">
                                        Tahap Persiapan Wajib
                                    </span>
                                    <h2 className="text-xl font-extrabold">
                                        Pembayaran Daftar Ulang melalui Portal gosiswa.com
                                    </h2>
                                    <p className={`text-xs sm:text-sm mt-1 ${subTextCls}`}>
                                        Sebelum mengisi formulir di bawah, lakukan pembayaran daftar ulang melalui Virtual Account di <strong>gosiswa.com</strong> dan simpan <strong>Kuitansi Digital</strong>-nya untuk diunggah pada Langkah 3.
                                    </p>
                                </div>
                            </div>

                            {/* Perbandingan 2 Skema Pembayaran */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-950/70 border-gray-700' : 'bg-white border-[#d6c5b3]'}`}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-extrabold text-sm sm:text-base">Skema 1: Pembayaran Minimal (DP)</h3>
                                    </div>
                                    <p className={`text-xs sm:text-sm leading-relaxed ${subTextCls}`}>
                                        Melakukan pembayaran uang muka (DP) minimal untuk <strong>mengunci kursi</strong> pada jurusan <strong>{applicant.accepted_major || applicant.school_choice}</strong>. Sisa biaya dapat dilunasi sesuai ketentuan sekolah.
                                    </p>
                                </div>

                                <div className={`p-4 rounded-2xl border-2 ${isDarkMode ? 'bg-emerald-950/35 border-emerald-600/70' : 'bg-emerald-50/80 border-emerald-500'}`}>
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            <h3 className="font-extrabold text-sm sm:text-base text-emerald-950 dark:text-emerald-200">
                                                Skema 2: Lunas (Full) + Diskon
                                            </h3>
                                        </div>
                                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                            HEMAT DISKON
                                        </span>
                                    </div>
                                    <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-emerald-100/90' : 'text-emerald-950/90'}`}>
                                        Melakukan pelunasan penuh selama periode daftar ulang dan memperoleh <strong>potongan biaya (diskon khusus)</strong> langsung pada tagihan Virtual Account gosiswa.com.
                                    </p>
                                </div>
                            </div>

                            {/* Instruksi / Rincian Biaya dari Admin */}
                            {settings?.rereg_instructions && (
                                <div className={`p-4 rounded-2xl border text-xs sm:text-sm whitespace-pre-line leading-relaxed ${isDarkMode
                                    ? 'bg-indigo-950/40 border-indigo-800 text-indigo-200'
                                    : 'bg-[#faf4ec] border-[#cbb7a2] text-[#2b1d18]'
                                    }`}>
                                    <p className="font-extrabold uppercase text-xs mb-1 text-[#9e4522] dark:text-indigo-300">
                                        Informasi Rincian Biaya &amp; Ketentuan Sekolah:
                                    </p>
                                    {settings.rereg_instructions}
                                </div>
                            )}

                            {/* Tombol Buka Portal gosiswa.com & Accordion Video Tutorial YouTube */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <a
                                    href={portalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg transition-all"
                                >
                                    <span>Buka Portal Pembayaran gosiswa.com</span>
                                    <ExternalLink className="w-4 h-4" />
                                </a>

                                {youtubeVideoId && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTutorialVideo(prev => !prev)}
                                        className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${isDarkMode
                                            ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-100'
                                            : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                            }`}
                                    >
                                        <PlayCircle className="w-4 h-4 text-rose-600" />
                                        <span>Tonton Video Tutorial Pembayaran</span>
                                        {showTutorialVideo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            {/* Lite YouTube Embed (Click-to-Play Facade) */}
                            {youtubeVideoId && showTutorialVideo && (
                                <div className="rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-black aspect-video relative">
                                    {!isPlayingVideo ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsPlayingVideo(true)}
                                            className="w-full h-full relative group flex items-center justify-center cursor-pointer"
                                            aria-label="Putar Video Tutorial Pembayaran gosiswa.com"
                                        >
                                            <img
                                                src={`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                                                alt="Thumbnail Video Tutorial Pembayaran gosiswa.com"
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity"
                                            />
                                            <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center p-4 text-center">
                                                <div className="w-16 h-16 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                                                    <PlayCircle className="w-9 h-9" />
                                                </div>
                                                <span className="mt-3 px-4 py-1.5 rounded-full bg-black/75 text-white text-xs font-bold">
                                                    Klik untuk Memutar Video Tutorial
                                                </span>
                                            </div>
                                        </button>
                                    ) : (
                                        <iframe
                                            className="w-full h-full"
                                            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
                                            title="Tutorial Pembayaran gosiswa.com"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    )}
                                </div>
                            )}

                            {/* Checkbox Prasyarat Pembayaran */}
                            <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${paymentConfirmed
                                ? isDarkMode ? 'bg-emerald-950/40 border-emerald-600' : 'bg-emerald-50 border-emerald-500'
                                : isDarkMode ? 'bg-gray-950/60 border-gray-700 hover:border-gray-600' : 'bg-white border-[#cbb7a2] hover:border-[#b85c38]'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={paymentConfirmed}
                                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                                    className="w-5 h-5 mt-0.5 accent-emerald-600 rounded shrink-0"
                                />
                                <span className="text-xs sm:text-sm font-bold leading-snug">
                                    Saya sudah melakukan pembayaran daftar ulang di portal <span className="underline">gosiswa.com</span> dan memiliki Kuitansi Digital (atau memiliki Surat Keterangan Keringanan/Beasiswa Khusus dari sekolah).
                                </span>
                            </label>
                        </div>

                        {/* FORMULIR DAFTAR ULANG 3 LANGKAH */}
                        {paymentConfirmed && (
                            <div className={`p-6 sm:p-8 rounded-3xl border ${cardGlass}`}>
                                {/* Stepper Header */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-3">
                                        {[
                                            { num: 1, title: 'Data Dapodik & Alamat', icon: UserCheck },
                                            { num: 2, title: 'Orang Tua & Seragam SMK', icon: Users },
                                            { num: 3, title: 'Kuitansi & Berkas', icon: FileUp },
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            const active = step === item.num;
                                            const passed = step > item.num;
                                            return (
                                                <div key={item.num} className="flex-1 flex flex-col items-center text-center">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border-2 transition-all ${passed
                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                        : active
                                                            ? isDarkMode ? 'bg-teal-600 border-teal-500 text-white shadow-lg' : 'bg-[#b85c38] border-[#b85c38] text-white shadow-lg'
                                                            : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-[#cbb7a2] text-[#6e5346]'
                                                        }`}>
                                                        {passed ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                                    </div>
                                                    <span className={`text-[11px] sm:text-xs font-extrabold mt-1.5 ${active
                                                        ? isDarkMode ? 'text-teal-300' : 'text-[#8f3f20]'
                                                        : subTextCls
                                                        }`}>
                                                        Langkah {item.num}: {item.title}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-[#eadfd2]'}`}>
                                        <div
                                            className={`h-full transition-all duration-300 ${isDarkMode ? 'bg-teal-500' : 'bg-[#b85c38]'}`}
                                            style={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
                                        />
                                    </div>
                                </div>

                                <form onSubmit={handleFinalSubmit} className="space-y-6">
                                    {/* ================= LANGKAH 1: DATA KEPENDUDUKAN & ALAMAT ================= */}
                                    {step === 1 && (
                                        <div className="space-y-5">
                                            <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
                                                <h3 className="text-lg font-extrabold">Langkah 1: Data Kependudukan &amp; Alamat (Standar Dapodik)</h3>
                                                <p className={`text-xs sm:text-sm ${subTextCls}`}>
                                                    Lengkapi data sesuai Kartu Keluarga (KK) dan Ijazah/Akta Kelahiran untuk penginputan Dapodik.
                                                </p>
                                            </div>

                                            <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'}`}>
                                                <div>
                                                    <span className="opacity-70 block text-xs">Nama Lengkap Siswa</span>
                                                    <span className="font-extrabold">{applicant.full_name}</span>
                                                </div>
                                                <div>
                                                    <span className="opacity-70 block text-xs">NISN / Tanggal Lahir</span>
                                                    <span className="font-mono font-bold">{applicant.nisn} &bull; {formatDateIndo(applicant.tanggal_lahir)}</span>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <span className="opacity-70 block text-xs">Asal Sekolah (SMP/MTs)</span>
                                                    <span className="font-bold">{applicant.asal_sekolah || '-'}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>NIK Siswa (16 Digit) *</label>
                                                    <input
                                                        type="text"
                                                        value={nik}
                                                        onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                                                        maxLength={16}
                                                        placeholder="3206xxxxxxxxxxxx"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono font-semibold outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Nomor Kartu Keluarga / No. KK (16 Digit) *</label>
                                                    <input
                                                        type="text"
                                                        value={noKk}
                                                        onChange={(e) => setNoKk(e.target.value.replace(/\D/g, ''))}
                                                        maxLength={16}
                                                        placeholder="3206xxxxxxxxxxxx"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono font-semibold outline-none ${inputCls}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Tempat Lahir (Kab/Kota) *</label>
                                                    <input
                                                        type="text"
                                                        value={birthPlace}
                                                        onChange={(e) => setBirthPlace(e.target.value)}
                                                        placeholder="Contoh: Tasikmalaya"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Jenis Kelamin *</label>
                                                    <select
                                                        value={gender}
                                                        onChange={(e) => setGender(e.target.value)}
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                    >
                                                        <option value="Laki-laki">Laki-laki</option>
                                                        <option value="Perempuan">Perempuan</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Agama *</label>
                                                    <select
                                                        value={religion}
                                                        onChange={(e) => setReligion(e.target.value)}
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                    >
                                                        <option value="Islam">Islam</option>
                                                        <option value="Kristen">Kristen</option>
                                                        <option value="Katolik">Katolik</option>
                                                        <option value="Hindu">Hindu</option>
                                                        <option value="Buddha">Buddha</option>
                                                        <option value="Konghucu">Konghucu</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Anak ke-</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={childOrder}
                                                        onChange={(e) => setChildOrder(e.target.value)}
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Jumlah Saudara Kandung</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={siblingsCount}
                                                        onChange={(e) => setSiblingsCount(e.target.value)}
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Status Tempat Tinggal</label>
                                                    <select
                                                        value={livingWith}
                                                        onChange={(e) => setLivingWith(e.target.value)}
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                    >
                                                        <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                                                        <option value="Pesantren / Asrama">Pesantren / Asrama</option>
                                                        <option value="Bersama Wali">Bersama Wali</option>
                                                        <option value="Kos">Kos</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="sm:col-span-2">
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Alamat Jalan / Kampung / Dusun *</label>
                                                    <input
                                                        type="text"
                                                        value={addressStreet}
                                                        onChange={(e) => setAddressStreet(e.target.value)}
                                                        placeholder="Contoh: Kp. Sukarapih"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>RT / RW</label>
                                                    <input
                                                        type="text"
                                                        value={rtRw}
                                                        onChange={(e) => setRtRw(e.target.value)}
                                                        placeholder="001/002"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Desa / Kelurahan *</label>
                                                    <input
                                                        type="text"
                                                        value={village}
                                                        onChange={(e) => setVillage(e.target.value)}
                                                        placeholder="Nama Desa"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Kecamatan *</label>
                                                    <input
                                                        type="text"
                                                        value={district}
                                                        onChange={(e) => setDistrict(e.target.value)}
                                                        placeholder="Nama Kecamatan"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Kabupaten / Kota *</label>
                                                    <input
                                                        type="text"
                                                        value={city}
                                                        onChange={(e) => setCity(e.target.value)}
                                                        placeholder="Kab. Tasikmalaya"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs sm:text-sm font-bold mb-1.5 ${labelCls}`}>Kode Pos</label>
                                                    <input
                                                        type="text"
                                                        maxLength={5}
                                                        value={postalCode}
                                                        onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                                                        placeholder="46461"
                                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono font-medium outline-none ${inputCls}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (validateStep1()) {
                                                            setStep(2);
                                                            window.scrollTo({ top: 200, behavior: 'smooth' });
                                                        }
                                                    }}
                                                    className={`inline-flex items-center gap-2 py-3 px-6 rounded-xl font-extrabold text-sm text-white shadow-lg transition-all ${isDarkMode
                                                        ? 'bg-teal-600 hover:bg-teal-500'
                                                        : 'bg-[#b85c38] hover:bg-[#a04d2c]'
                                                        }`}
                                                >
                                                    <span>Lanjut ke Data Orang Tua &amp; Seragam</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ================= LANGKAH 2: ORANG TUA/WALI & SERAGAM SMK ================= */}
                                    {step === 2 && (
                                        <div className="space-y-6">
                                            <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
                                                <h3 className="text-lg font-extrabold">Langkah 2: Data Orang Tua/Wali, Kesehatan &amp; Seragam SMK</h3>
                                                <p className={`text-xs sm:text-sm ${subTextCls}`}>
                                                    Data pekerjaan dan penghasilan orang tua diperlukan untuk Dapodik &amp; program bantuan pendidikan (PIP/KIP).
                                                </p>
                                            </div>

                                            {/* Data Ayah Kandung */}
                                            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'}`}>
                                                <p className="text-xs font-extrabold uppercase tracking-wider text-[#9e4522] dark:text-teal-400">
                                                    Data Ayah Kandung ({applicant.father_name || '-'})
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>NIK Ayah (16 Digit, Opsional)</label>
                                                        <input
                                                            type="text"
                                                            maxLength={16}
                                                            value={fatherNik}
                                                            onChange={(e) => setFatherNik(e.target.value.replace(/\D/g, ''))}
                                                            placeholder="3206xxxxxxxxxxxx"
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono outline-none ${inputCls}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Pendidikan Terakhir Ayah</label>
                                                        <select
                                                            value={fatherEducation}
                                                            onChange={(e) => setFatherEducation(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Pekerjaan Utama Ayah</label>
                                                        <select
                                                            value={fatherOccupation}
                                                            onChange={(e) => setFatherOccupation(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            {OCCUPATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Penghasilan Bulanan Ayah</label>
                                                        <select
                                                            value={fatherIncome}
                                                            onChange={(e) => setFatherIncome(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            {INCOME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Data Ibu Kandung */}
                                            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#d6c5b3]'}`}>
                                                <p className="text-xs font-extrabold uppercase tracking-wider text-[#9e4522] dark:text-teal-400">
                                                    Data Ibu Kandung ({applicant.mother_name || '-'})
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>NIK Ibu (16 Digit, Opsional)</label>
                                                        <input
                                                            type="text"
                                                            maxLength={16}
                                                            value={motherNik}
                                                            onChange={(e) => setMotherNik(e.target.value.replace(/\D/g, ''))}
                                                            placeholder="3206xxxxxxxxxxxx"
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono outline-none ${inputCls}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Pendidikan Terakhir Ibu</label>
                                                        <select
                                                            value={motherEducation}
                                                            onChange={(e) => setMotherEducation(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Pekerjaan Utama Ibu</label>
                                                        <select
                                                            value={motherOccupation}
                                                            onChange={(e) => setMotherOccupation(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            {OCCUPATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Penghasilan Bulanan Ibu</label>
                                                        <select
                                                            value={motherIncome}
                                                            onChange={(e) => setMotherIncome(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            {INCOME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Data Wali (Opsional) */}
                                            <div>
                                                <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasGuardian}
                                                        onChange={(e) => setHasGuardian(e.target.checked)}
                                                        className="w-4 h-4 accent-[#b85c38] rounded"
                                                    />
                                                    <span>Siswa tinggal bersama Wali (isi data Wali jika selain orang tua kandung)</span>
                                                </label>

                                                {hasGuardian && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 p-4 rounded-2xl border border-[#cbb7a2] dark:border-gray-700">
                                                        <div>
                                                            <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Nama Lengkap Wali</label>
                                                            <input
                                                                type="text"
                                                                value={guardianName}
                                                                onChange={(e) => setGuardianName(e.target.value)}
                                                                className={`w-full rounded-xl border px-3.5 py-2 text-sm outline-none ${inputCls}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={`block text-xs font-bold mb-1 ${labelCls}`}>No. HP/WA Wali</label>
                                                            <input
                                                                type="tel"
                                                                value={guardianPhone}
                                                                onChange={(e) => setGuardianPhone(e.target.value)}
                                                                className={`w-full rounded-xl border px-3.5 py-2 text-sm outline-none ${inputCls}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Pekerjaan Wali</label>
                                                            <input
                                                                type="text"
                                                                value={guardianOccupation}
                                                                onChange={(e) => setGuardianOccupation(e.target.value)}
                                                                className={`w-full rounded-xl border px-3.5 py-2 text-sm outline-none ${inputCls}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Kesehatan Dasar & Ukuran Seragam Praktik SMK */}
                                            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-teal-950/25 border-teal-800/60' : 'bg-white border-[#cbb7a2]'}`}>
                                                <div className="flex items-center gap-2">
                                                    <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                                    <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                                                        Data Periodik Kesehatan &amp; Ukuran Seragam Praktik SMK
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Tinggi Badan (cm)</label>
                                                        <input
                                                            type="number"
                                                            min={100}
                                                            max={220}
                                                            value={heightCm}
                                                            onChange={(e) => setHeightCm(e.target.value)}
                                                            placeholder="160"
                                                            className={`w-full rounded-xl border px-3.5 py-2 text-sm outline-none ${inputCls}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Berat Badan (kg)</label>
                                                        <input
                                                            type="number"
                                                            min={25}
                                                            max={180}
                                                            value={weightKg}
                                                            onChange={(e) => setWeightKg(e.target.value)}
                                                            placeholder="50"
                                                            className={`w-full rounded-xl border px-3.5 py-2 text-sm outline-none ${inputCls}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-bold mb-1 ${labelCls}`}>Golongan Darah</label>
                                                        <select
                                                            value={bloodType}
                                                            onChange={(e) => setBloodType(e.target.value)}
                                                            className={`w-full rounded-xl border px-3.5 py-2 text-sm font-semibold outline-none ${inputCls}`}
                                                        >
                                                            <option value="Belum Tahu">Belum Tahu</option>
                                                            <option value="A">A</option>
                                                            <option value="B">B</option>
                                                            <option value="AB">AB</option>
                                                            <option value="O">O</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`block text-xs font-bold mb-1 ${labelCls}`}>
                                                        Catatan Alergi / Riwayat Kesehatan Khusus (Penting untuk Praktikum Lab/Lapangan)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={medicalNotes}
                                                        onChange={(e) => setMedicalNotes(e.target.value)}
                                                        placeholder="Contoh: Tidak ada / Alergi debu / Asma ringan"
                                                        className={`w-full rounded-xl border px-3.5 py-2 text-sm outline-none ${inputCls}`}
                                                    />
                                                </div>

                                                {/* Pilihan Ukuran Seragam */}
                                                <div>
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                        <label className={`text-xs sm:text-sm font-extrabold flex items-center gap-1.5 ${labelCls}`}>
                                                            <Shirt className="w-4 h-4 text-[#b85c38] dark:text-teal-400" />
                                                            <span>Pilih Ukuran Seragam Praktik &amp; Olahraga *</span>
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowSizeGuide(prev => !prev)}
                                                            className="text-xs font-extrabold text-[#9e4522] dark:text-teal-400 hover:underline"
                                                        >
                                                            {showSizeGuide ? 'Sembunyikan Panduan Ukuran' : 'Lihat Tabel Panduan Ukuran'}
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                                                        {UNIFORM_CHART.map((u) => (
                                                            <button
                                                                key={u.size}
                                                                type="button"
                                                                onClick={() => setUniformSize(u.size)}
                                                                className={`py-3 px-2 rounded-xl border-2 font-extrabold text-sm transition-all ${uniformSize === u.size
                                                                    ? isDarkMode
                                                                        ? 'bg-teal-600 border-teal-400 text-white shadow-md'
                                                                        : 'bg-[#b85c38] border-[#8f3f20] text-white shadow-md'
                                                                    : isDarkMode
                                                                        ? 'bg-gray-900 border-gray-700 text-gray-200 hover:border-gray-500'
                                                                        : 'bg-[#faf4ec] border-[#d6c5b3] text-[#2b1d18] hover:border-[#b85c38]'
                                                                    }`}
                                                            >
                                                                {u.size}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {showSizeGuide && (
                                                        <div className="mt-3 overflow-x-auto rounded-xl border border-[#cbb7a2] dark:border-gray-700">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className={isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-[#efe4d6] text-[#2b1d18]'}>
                                                                    <tr>
                                                                        <th className="p-2.5 font-extrabold">Ukuran</th>
                                                                        <th className="p-2.5 font-extrabold">Lebar Dada</th>
                                                                        <th className="p-2.5 font-extrabold">Panjang Baju</th>
                                                                        <th className="p-2.5 font-extrabold">Perkiraan Postur</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                                                    {UNIFORM_CHART.map((row) => (
                                                                        <tr key={row.size} className={uniformSize === row.size ? 'font-bold bg-amber-500/10' : ''}>
                                                                            <td className="p-2.5 font-extrabold">{row.size}</td>
                                                                            <td className="p-2.5">{row.chest}</td>
                                                                            <td className="p-2.5">{row.length}</td>
                                                                            <td className="p-2.5">{row.fit}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className={`inline-flex items-center gap-2 py-3 px-5 rounded-xl font-bold text-sm border ${isDarkMode
                                                        ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                                        : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                                        }`}
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    <span>Sebelumnya</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (validateStep2()) {
                                                            setStep(3);
                                                            window.scrollTo({ top: 200, behavior: 'smooth' });
                                                        }
                                                    }}
                                                    className={`inline-flex items-center gap-2 py-3 px-6 rounded-xl font-extrabold text-sm text-white shadow-lg ${isDarkMode
                                                        ? 'bg-teal-600 hover:bg-teal-500'
                                                        : 'bg-[#b85c38] hover:bg-[#a04d2c]'
                                                        }`}
                                                >
                                                    <span>Lanjut ke Kuitansi &amp; Berkas</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ================= LANGKAH 3: UNGGAH KUITANSI GOSISWA.COM & BERKAS ================= */}
                                    {step === 3 && (
                                        <div className="space-y-6">
                                            <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
                                                <h3 className="text-lg font-extrabold">Langkah 3: Unggah Kuitansi gosiswa.com &amp; Berkas Daftar Ulang</h3>
                                                <p className={`text-xs sm:text-sm ${subTextCls}`}>
                                                    Unggah kuitansi digital hasil pembayaran Virtual Account gosiswa.com beserta dokumen pelengkap.
                                                </p>
                                            </div>

                                            {/* Pilihan Skema Pembayaran */}
                                            <div>
                                                <label className={`block text-xs sm:text-sm font-extrabold mb-2 ${labelCls}`}>
                                                    1. Pilih Skema Pembayaran yang Telah Dilakukan di gosiswa.com *
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    {[
                                                        { value: 'Minimal (DP)', title: 'Pembayaran Minimal (DP)', desc: 'Pengunci kursi jurusan' },
                                                        { value: 'Lunas (Full + Diskon)', title: 'Lunas (Full + Diskon)', desc: 'Pelunasan penuh berdiskon' },
                                                        { value: 'Beasiswa / Keringanan Khusus', title: 'Beasiswa / Keringanan', desc: 'Surat keterangan sekolah' },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setPaymentScheme(opt.value)}
                                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all ${paymentScheme === opt.value
                                                                ? isDarkMode
                                                                    ? 'bg-teal-950/60 border-teal-500 text-white'
                                                                    : 'bg-[#fdf6ee] border-[#b85c38] text-[#1f1410] shadow-sm'
                                                                : isDarkMode
                                                                    ? 'bg-gray-950/50 border-gray-800 text-gray-300'
                                                                    : 'bg-white border-[#d6c5b3] text-[#2b1d18]'
                                                                }`}
                                                        >
                                                            <p className="font-extrabold text-xs sm:text-sm">{opt.title}</p>
                                                            <p className="text-[11px] opacity-75 mt-0.5">{opt.desc}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Grid Unggah 4 Berkas */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* 1. Kuitansi Digital gosiswa.com */}
                                                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#cbb7a2]'}`}>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        <label className="text-xs sm:text-sm font-extrabold">
                                                            2. Kuitansi Digital gosiswa.com *
                                                        </label>
                                                    </div>
                                                    <p className="text-[11px] opacity-80 mb-2.5">
                                                        Format JPG, PNG, atau PDF (maks. 5 MB).
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,application/pdf"
                                                        onChange={(e) => setFileKuitansi(e.target.files?.[0] || null)}
                                                        className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                                                    />
                                                    {existingRereg?.doc_kuitansi_gosiswa && !fileKuitansi && (
                                                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">
                                                            ✓ Berkas sebelumnya tersimpan (unggah baru jika ingin mengganti)
                                                        </p>
                                                    )}
                                                </div>

                                                {/* 2. Pas Foto Resmi 3x4 */}
                                                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#cbb7a2]'}`}>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                        <label className="text-xs sm:text-sm font-extrabold">
                                                            3. Pas Foto Resmi 3x4 Terbaru *
                                                        </label>
                                                    </div>
                                                    <p className="text-[11px] opacity-80 mb-2.5">
                                                        Format JPG atau PNG (ditampilkan di Kartu Daftar Ulang).
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png"
                                                        onChange={handlePasFotoChange}
                                                        className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                                                    />
                                                    {existingRereg?.doc_pas_foto && !filePasFoto && (
                                                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">
                                                            ✓ Pas foto sebelumnya tersimpan
                                                        </p>
                                                    )}
                                                </div>

                                                {/* 3. Scan SKL / Ijazah */}
                                                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#cbb7a2]'}`}>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                        <label className="text-xs sm:text-sm font-extrabold">
                                                            4. Scan SKL / Ijazah SMP/MTs *
                                                        </label>
                                                    </div>
                                                    <p className="text-[11px] opacity-80 mb-2.5">
                                                        Format JPG, PNG, atau PDF (maks. 5 MB).
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,application/pdf"
                                                        onChange={(e) => setFileSkl(e.target.files?.[0] || null)}
                                                        className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                                                    />
                                                    {existingRereg?.doc_skl_ijazah && !fileSkl && (
                                                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">
                                                            ✓ Berkas SKL/Ijazah sebelumnya tersimpan
                                                        </p>
                                                    )}
                                                </div>

                                                {/* 4. Scan Surat Pernyataan */}
                                                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-[#faf4ec] border-[#cbb7a2]'}`}>
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                            <label className="text-xs sm:text-sm font-extrabold">
                                                                5. Surat Pernyataan Siswa &amp; Ortu *
                                                            </label>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadTemplatePernyataan}
                                                            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 hover:underline"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            <span>Template</span>
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] opacity-80 mb-2.5">
                                                        Unggah hasil scan yang telah ditandatangani (JPG/PNG/PDF).
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,application/pdf"
                                                        onChange={(e) => setFilePernyataan(e.target.files?.[0] || null)}
                                                        className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                                    />
                                                    {existingRereg?.doc_pernyataan && !filePernyataan && (
                                                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">
                                                            ✓ Surat Pernyataan sebelumnya tersimpan
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Persetujuan Digital */}
                                            <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer ${isDarkMode ? 'bg-gray-950/70 border-gray-700' : 'bg-white border-[#cbb7a2]'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={agreedTerms}
                                                    onChange={(e) => setAgreedTerms(e.target.checked)}
                                                    className="w-5 h-5 mt-0.5 accent-[#b85c38] rounded shrink-0"
                                                />
                                                <span className="text-xs sm:text-sm font-semibold leading-snug">
                                                    Saya menyatakan bahwa seluruh data kependudukan, ukuran seragam, dan kuitansi pembayaran yang diunggah adalah benar dan sah, serta bersedia mematuhi seluruh tata tertib di {settings?.school_name || 'SMK KH. A. Wahab Muhsin'}.
                                                </span>
                                            </label>

                                            {uploadProgressText && (
                                                <p className="text-center text-xs sm:text-sm font-extrabold text-[#9e4522] dark:text-teal-300 animate-pulse">
                                                    {uploadProgressText}
                                                </p>
                                            )}

                                            <div className="flex justify-between gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(2)}
                                                    disabled={isSubmitting}
                                                    className={`inline-flex items-center gap-2 py-3 px-5 rounded-xl font-bold text-sm border disabled:opacity-50 ${isDarkMode
                                                        ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                                                        : 'bg-white hover:bg-[#faf5ef] border-[#cbb7a2] text-[#2b1d18]'
                                                        }`}
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    <span>Sebelumnya</span>
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="inline-flex items-center gap-2 py-3.5 px-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg transition-all disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span>{isSubmitting ? 'Menyimpan...' : isEditingRevision ? 'Kirim Perbaikan Daftar Ulang' : 'Kirim Formulir Daftar Ulang'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ================= TAMPILAN CETAK PDF: KARTU BUKTI DAFTAR ULANG ================= */}
            {applicant && existingRereg && (
                <div className="hidden print:block bg-white text-black p-8 font-serif w-full max-w-4xl mx-auto">
                    {/* Kop Surat Sekolah */}
                    <div className="flex items-center border-b-4 border-double border-black pb-4 mb-6">
                        <div className="w-20 h-20 flex items-center justify-center mr-5">
                            {settings?.logo_url ? (
                                <img src={settings.logo_url} alt="Logo Sekolah" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center text-xs font-bold">
                                    LOGO
                                </div>
                            )}
                        </div>
                        <div className="text-center flex-1">
                            <h3 className="text-base font-bold uppercase tracking-wider">
                                {settings?.foundation_name || 'YAYASAN PENDIDIKAN'}
                            </h3>
                            <h1 className="text-2xl font-extrabold uppercase tracking-wide">
                                {settings?.school_name || 'SMK KH. A. WAHAB MUHSIN'}
                            </h1>
                            <p className="text-xs mt-1">{settings?.school_address}</p>
                        </div>
                    </div>

                    {/* Judul Kartu */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-extrabold underline uppercase">KARTU BUKTI DAFTAR ULANG PESERTA DIDIK BARU</h2>
                        <p className="text-sm mt-1">
                            Tahun Ajaran {new Date().getFullYear()}/{new Date().getFullYear() + 1} &bull; No. Reg: <strong>{applicant.registration_number}</strong>
                        </p>
                    </div>

                    {/* Konten Utama Kartu + Pas Foto 3x4 */}
                    <div className="border-2 border-black rounded-xl p-5 mb-6 flex gap-6 items-start">
                        <div className="w-32 shrink-0 text-center">
                            {pasFotoUrl ? (
                                <img
                                    src={pasFotoUrl}
                                    alt="Pas Foto 3x4"
                                    className="w-32 h-40 object-cover border-2 border-black mx-auto"
                                />
                            ) : (
                                <div className="w-32 h-40 border-2 border-black flex items-center justify-center text-xs">
                                    PAS FOTO 3x4
                                </div>
                            )}
                            <p className="text-[11px] font-bold mt-2 uppercase border border-black py-1 px-2">
                                {existingRereg.rereg_status}
                            </p>
                        </div>

                        <div className="flex-1 text-sm">
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="py-1.5 w-44 font-semibold">Nama Lengkap</td>
                                        <td className="w-4">:</td>
                                        <td className="font-bold uppercase">{applicant.full_name}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">NISN / NIK</td>
                                        <td>:</td>
                                        <td>{applicant.nisn} / {existingRereg.nik}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">Tempat, Tanggal Lahir</td>
                                        <td>:</td>
                                        <td>{existingRereg.birth_place}, {formatDateIndo(applicant.tanggal_lahir)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">Asal Sekolah</td>
                                        <td>:</td>
                                        <td>{applicant.asal_sekolah || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">Kompetensi Keahlian</td>
                                        <td>:</td>
                                        <td className="font-bold">{applicant.accepted_major || applicant.school_choice}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">Skema Pembayaran</td>
                                        <td>:</td>
                                        <td className="font-bold">{existingRereg.payment_scheme} (via gosiswa.com)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">Ukuran Seragam SMK</td>
                                        <td>:</td>
                                        <td className="font-bold">Ukuran {existingRereg.uniform_size}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 font-semibold">Alamat Domisili</td>
                                        <td>:</td>
                                        <td>
                                            {existingRereg.address_street}{existingRereg.rt_rw ? ` RT/RW ${existingRereg.rt_rw}` : ''}, Desa {existingRereg.village}, Kec. {existingRereg.district}, {existingRereg.city}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Catatan Pengambilan Seragam & MPLS */}
                    <div className="border border-black p-3.5 text-xs mb-8 space-y-1">
                        <p className="font-bold uppercase">Catatan Penting:</p>
                        <p>1. Kartu ini wajib dibawa pada hari pertama masuk sekolah / kegiatan MPLS sebagai bukti resmi daftar ulang dan pengambilan seragam praktik/olahraga.</p>
                        <p>2. Keaslian kartu ini dapat dipindai melalui QR Code di bawah oleh panitia sekolah.</p>
                    </div>

                    {/* QR Code & Tanda Tangan */}
                    <div className="flex justify-between items-end">
                        <div className="text-center">
                            <div className="p-2 border border-black inline-block bg-white">
                                <QRCode
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verifikasi/${applicant.registration_number}`}
                                    size={96}
                                />
                            </div>
                            <p className="text-[11px] mt-1.5">Scan QR Code untuk Verifikasi MPLS</p>
                        </div>

                        <div className="text-center text-sm">
                            <p>
                                {settings?.school_city || 'Tasikmalaya'},{' '}
                                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="mb-16">Ketua Panitia PSB,</p>
                            <p className="font-bold underline">{settings?.headmaster_name || 'Ketua Panitia PSB'}</p>
                            {settings?.headmaster_nip && <p className="text-xs">NIP. {settings.headmaster_nip}</p>}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae] dark:from-gray-900 dark:via-slate-800 dark:to-slate-900 font-sans">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-[#b85c38] dark:border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-sm text-[#4a342a] dark:text-gray-300">
                    Memuat Portal Daftar Ulang...
                </p>
            </div>
        </div>
    );
}

export default function DaftarUlangPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <DaftarUlangContent />
        </Suspense>
    );
}