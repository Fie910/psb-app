'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import QRCode from 'react-qr-code';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Printer, CheckCircle2, ArrowLeft, Upload, FileText } from 'lucide-react';

const schema = z.object({
  full_name: z.string().min(3, 'Nama minimal 3 karakter'),
  nisn: z.string().length(10, 'NISN harus 10 digit').regex(/^\d+$/, 'Hanya angka'),
  tanggal_lahir: z.string().min(1, 'Wajib diisi'),
  asal_sekolah: z.string().min(3, 'Wajib diisi'),
  email: z.string().email('Format email salah'),
  phone: z.string().min(10, 'Minimal 10 digit').optional().or(z.literal('')),

  father_name: z.string().min(3, 'Nama Ayah wajib diisi'),
  mother_name: z.string().min(3, 'Nama Ibu wajib diisi'),
  parent_phone: z.string().min(10, 'No HP Ortu min 10 digit'),

  registration_path: z.string().min(1, 'Pilih Jalur Pendaftaran'),
  school_choice: z.string().min(1, 'Pilih Jurusan 1'),
  school_choice_2: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Home() {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadStatus, setUploadStatus] = useState('');

  const [fileKK, setFileKK] = useState<File | null>(null);
  const [fileAkta, setFileAkta] = useState<File | null>(null);
  const [filePrestasi, setFilePrestasi] = useState<File | null>(null);
  const [successData, setSuccessData] = useState<{ regNumber: string, name: string, jurusan: string } | null>(null);

  const { register, handleSubmit, watch, formState: { errors }, trigger, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      registration_path: 'Reguler',
    },
    mode: 'onTouched',
  });

  const selectedPath = watch('registration_path');

  const nextStep = async (fieldsToValidate: (keyof FormData)[]) => {
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const handlePrint = () => {
    if (!successData) return;
    const originalTitle = document.title;
    document.title = `Kartu Pendaftaran - ${successData.name}`;
    window.print();
    document.title = originalTitle;
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    setUploadStatus('');

    if (!fileKK || !fileAkta) {
      setMessage({ type: 'error', text: 'Kartu Keluarga dan Akta wajib diunggah.' });
      setIsSubmitting(false);
      return;
    }

    if (data.registration_path === 'Prestasi' && !filePrestasi) {
      setMessage({ type: 'error', text: 'Dokumen sertifikat/piagam prestasi (PDF) wajib diunggah untuk Jalur Prestasi.' });
      setIsSubmitting(false);
      return;
    }

    try {
      setUploadStatus('Memeriksa email...');
      const checkRes = await fetch('/api/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email }) });
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setMessage({ type: 'error', text: 'Email sudah terdaftar.' });
        setIsSubmitting(false); setUploadStatus(''); setStep(1);
        return;
      }

      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };

      setUploadStatus('Mengunggah KK...');
      const compKK = await imageCompression(fileKK, options);
      const resKK = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: compKK.name, fileType: compKK.type, studentName: data.full_name, docType: 'KK' }) });
      const { signedUrl: urlKK, key: keyKK } = await resKK.json();
      await fetch(urlKK, { method: 'PUT', body: compKK });

      setUploadStatus('Mengunggah Akta...');
      const compAkta = await imageCompression(fileAkta, options);
      const resAkta = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: compAkta.name, fileType: compAkta.type, studentName: data.full_name, docType: 'Akta' }) });
      const { signedUrl: urlAkta, key: keyAkta } = await resAkta.json();
      await fetch(urlAkta, { method: 'PUT', body: compAkta });

      let keyPrestasi = null;
      if (data.registration_path === 'Prestasi' && filePrestasi) {
        setUploadStatus('Mengunggah Dokumen Prestasi...');
        const resPrestasi = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: filePrestasi.name, fileType: filePrestasi.type || 'application/pdf', studentName: data.full_name, docType: 'Prestasi' })
        });
        const { signedUrl: urlPrestasi, key } = await resPrestasi.json();
        await fetch(urlPrestasi, {
          method: 'PUT',
          headers: { 'Content-Type': filePrestasi.type || 'application/pdf' },
          body: filePrestasi
        });
        keyPrestasi = key;
      }

      setUploadStatus('Menyimpan data...');
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, document_kk: keyKK, document_akta: keyAkta, document_prestasi: keyPrestasi }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessData({ regNumber: result.registration_number, name: result.full_name, jurusan: result.school_choice });
        reset(); setStep(1);
      } else {
        setMessage({ type: 'error', text: `Gagal: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmitting(false); setUploadStatus('');
    }
  };

  // ===== SHARED STYLES =====
  const bg = isDarkMode
    ? 'bg-linear-to-br from-gray-900 via-slate-800 to-slate-900 text-gray-100'
    : 'bg-linear-to-br from-[#c7a98c] via-[#a68160] to-[#825e40] text-[#2b1d18]';
  //: 'bg-linear-to-br from-[#ebe1d6] via-[#dfd3c3] to-[#cfc0ae] text-[#2b1d18]';

  const card = isDarkMode
    ? 'bg-gray-800/60 border-gray-700/60 backdrop-blur-xl shadow-2xl shadow-black/40'
    : 'bg-white/40 border-white/60 backdrop-blur-xl shadow-2xl shadow-[#9e8369]/15';

  const inputCls = isDarkMode
    ? 'bg-gray-700/50 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:ring-teal-500/20'
    : 'bg-white/60 border-[#d6c5b3] text-[#2b1d18] placeholder:text-[#b8a898] focus:border-[#b85c38] focus:ring-[#b85c38]/20';

  const labelCls = isDarkMode ? 'text-gray-300' : 'text-[#4a342a]';
  const btnPrimary = isDarkMode
    ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/40'
    : 'bg-[#b85c38] hover:bg-[#a04d2c] shadow-[#5c3a21]/30';

  const selectCls = isDarkMode
    ? 'bg-gray-700/50 border-gray-600 text-gray-100 focus:border-teal-500'
    : 'bg-white/60 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38]';

  // ================= KARTU SUKSES =================
  if (successData) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden transition-colors duration-500 ${bg}`}>
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className={`w-full max-w-md p-8 rounded-3xl border z-10 text-center ${card}`}>
          <div className="print:hidden">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>Pendaftaran Berhasil!</h1>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Silakan simpan atau cetak kartu ini sebagai bukti pendaftaran.</p>
          </div>

          <div className={`p-6 rounded-2xl border-2 border-dashed mb-6 ${isDarkMode ? 'bg-gray-900/50 border-teal-500/40' : 'bg-white/80 border-[#b85c38]/40'}`}>
            <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Nomor Pendaftaran</p>
            <p className={`text-3xl font-mono font-bold tracking-wider mb-4 ${isDarkMode ? 'text-teal-400' : 'text-[#b85c38]'}`}>{successData.regNumber}</p>

            <div className="bg-white p-2 inline-block rounded-xl mb-4">
              <QRCode value={`${successData.regNumber} | ${successData.name}`} size={128} />
            </div>

            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>{successData.name}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Pilihan 1: {successData.jurusan}</p>
          </div>

          <div className="space-y-3 print:hidden">
            <button onClick={handlePrint} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${btnPrimary}`}>
              <Printer className="w-4 h-4" />
              Cetak Kartu (PDF)
            </button>
            <a href="/cek-status" className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold shadow-lg transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white/70 hover:bg-white/90 text-[#4a342a] border border-[#d6c5b3]'}`}>
              Cek Status Pendaftaran
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ================= FORMULIR 3 LANGKAH =================
  return (
    <main className={`min-h-screen flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 font-sans relative overflow-hidden ${bg}`}>

      {/* Orb Decorations */}
      <div className={`absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob ${isDarkMode ? 'bg-teal-700' : 'bg-[#c9a68e]'}`}></div>
      <div className={`absolute bottom-[-10%] right-[5%] w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob ${isDarkMode ? 'bg-indigo-700' : 'bg-[#e3c4a8]'}`}></div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border z-10 transition-all duration-500 ${card}`}>

        <div className="text-center mb-6">
          <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-teal-400' : 'text-[#8f472a]'}`}>SMK KH. A. WAHAB MUHSIN</p>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>Pendaftaran Siswa Baru</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 z-0 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-[#d6c5b3]'}`}></div>
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 z-0 transition-all duration-500 rounded-full ${isDarkMode ? 'bg-teal-500' : 'bg-[#b85c38]'}`}
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          ></div>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${step >= s
                ? isDarkMode
                  ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-900/50'
                  : 'bg-[#b85c38] border-[#a04d2c] text-white shadow-lg shadow-[#b85c38]/30'
                : isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-500'
                  : 'bg-white/50 border-[#d6c5b3] text-[#b8a898]'
                }`}
            >
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {message.text && (
          <div className={`p-3 mb-4 rounded-xl text-sm text-center font-medium ${message.type === 'error' ? (isDarkMode ? 'bg-red-900/40 text-red-300 border border-red-700/50' : 'bg-red-100/80 text-red-800 border border-red-200') : (isDarkMode ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-green-100/80 text-green-800 border border-green-200')}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* STEP 1: DATA SISWA */}
          <div className={step === 1 ? 'block space-y-4' : 'hidden'}>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Nama Lengkap (Sesuai Ijazah)</label>
              <input {...register('full_name')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="Nama Lengkap" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>NISN</label>
                <input {...register('nisn')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="10 Digit" maxLength={10} />
                {errors.nisn && <p className="text-red-500 text-xs mt-1">{errors.nisn.message}</p>}
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Tgl Lahir</label>
                <input type="date" {...register('tanggal_lahir')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} />
                {errors.tanggal_lahir && <p className="text-red-500 text-xs mt-1">{errors.tanggal_lahir.message}</p>}
              </div>
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Asal Sekolah (SMP/MTs)</label>
              <input {...register('asal_sekolah')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="Contoh: SMPN 1..." />
              {errors.asal_sekolah && <p className="text-red-500 text-xs mt-1">{errors.asal_sekolah.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Email Aktif</label>
                <input type="email" {...register('email')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="contoh@email.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>No. HP/WA Siswa</label>
                <input type="tel" {...register('phone')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="08xxxxxxxxxx" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => nextStep(['full_name', 'nisn', 'tanggal_lahir', 'asal_sekolah', 'email', 'phone'])}
              className={`w-full py-3 rounded-xl font-bold text-white mt-4 shadow-lg transition-all hover:-translate-y-0.5 ${btnPrimary}`}
            >
              Lanjut ke Data Orang Tua &rarr;
            </button>
          </div>

          {/* STEP 2: DATA ORANG TUA */}
          <div className={step === 2 ? 'block space-y-4' : 'hidden'}>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Nama Ayah Kandung</label>
              <input {...register('father_name')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="Nama Ayah" />
              {errors.father_name && <p className="text-red-500 text-xs mt-1">{errors.father_name.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Nama Ibu Kandung</label>
              <input {...register('mother_name')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="Nama Ibu" />
              {errors.mother_name && <p className="text-red-500 text-xs mt-1">{errors.mother_name.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>No. HP/WA Orang Tua</label>
              <input type="tel" {...register('parent_phone')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${inputCls}`} placeholder="08xxxxxxxxxx" />
              {errors.parent_phone && <p className="text-red-500 text-xs mt-1">{errors.parent_phone.message}</p>}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 w-1/3 justify-center py-3 rounded-xl font-bold transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white/60 hover:bg-white/80 text-[#4a342a] border border-[#d6c5b3]'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button
                type="button"
                onClick={() => nextStep(['father_name', 'mother_name', 'parent_phone'])}
                className={`w-2/3 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${btnPrimary}`}
              >
                Lanjut Pilih Jurusan &rarr;
              </button>
            </div>
          </div>

          {/* STEP 3: JURUSAN & BERKAS */}
          <div className={step === 3 ? 'block space-y-4' : 'hidden'}>
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Jalur Pendaftaran</label>
              <select {...register('registration_path')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${selectCls}`}>
                <option value="Reguler">Jalur Reguler (Umum)</option>
                <option value="Prestasi">Jalur Prestasi (Akademik / Non-Akademik)</option>
              </select>
              {errors.registration_path && <p className="text-red-500 text-xs mt-1">{errors.registration_path.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Jurusan Pilihan 1</label>
                <select {...register('school_choice')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${selectCls}`}>
                  <option value="">-- Pilih --</option>
                  <option value="Farmasi Klinis dan Komunitas">Farmasi Klinis dan Komunitas</option>
                  <option value="Produksi dan Siaran Program Televisi">Produksi &amp; Siaran TV</option>
                  <option value="Manajemen Perkantoran">Manajemen Perkantoran</option>
                </select>
                {errors.school_choice && <p className="text-red-500 text-xs mt-1">{errors.school_choice.message}</p>}
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${labelCls}`}>Jurusan Pilihan 2</label>
                <select {...register('school_choice_2')} className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none transition-all ${selectCls}`}>
                  <option value="">-- Pilih --</option>
                  <option value="Farmasi Klinis dan Komunitas">Farmasi Klinis dan Komunitas</option>
                  <option value="Produksi dan Siaran Program Televisi">Produksi &amp; Siaran TV</option>
                  <option value="Manajemen Perkantoran">Manajemen Perkantoran</option>
                </select>
              </div>
            </div>

            {/* Upload Berkas */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-white/40 border-[#d6c5b3]'}`}>
              <div className={`flex items-center gap-2 mb-3 ${isDarkMode ? 'text-gray-200' : 'text-[#4a342a]'}`}>
                <Upload className="w-4 h-4" />
                <p className="text-sm font-bold">Unggah Berkas (Wajib)</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Scan Kartu Keluarga (KK) - Gambar</label>
                  <input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={(e) => setFileKK(e.target.files?.[0] || null)}
                    className={`block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-semibold transition-all ${isDarkMode ? 'text-gray-400 file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500' : 'text-[#7a6358] file:bg-[#d8b49b] file:text-[#5c2c16] hover:file:bg-[#c9a080]'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-[#6e5346]'}`}>Scan Akta Kelahiran - Gambar</label>
                  <input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={(e) => setFileAkta(e.target.files?.[0] || null)}
                    className={`block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-semibold transition-all ${isDarkMode ? 'text-gray-400 file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500' : 'text-[#7a6358] file:bg-[#d8b49b] file:text-[#5c2c16] hover:file:bg-[#c9a080]'}`}
                    required
                  />
                </div>

                {selectedPath === 'Prestasi' && (
                  <div className={`pt-3 border-t border-dashed ${isDarkMode ? 'border-amber-700/40' : 'border-amber-300/60'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <label className={`block text-xs font-bold ${isDarkMode ? 'text-amber-400' : 'text-[#b85c38]'}`}>
                        Raport dan/atau Sertifikat Prestasi - Format PDF
                      </label>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > 5 * 1024 * 1024) {
                          alert('Ukuran file PDF maksimal 5 MB. Silakan gunakan PDF yang sudah dikompresi.');
                          e.target.value = '';
                          setFilePrestasi(null);
                        } else {
                          setFilePrestasi(file);
                        }
                      }}
                      className={`block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-semibold transition-all ${isDarkMode ? 'text-gray-400 file:bg-amber-900/50 file:text-amber-300 hover:file:bg-amber-800/60' : 'text-[#7a6358] file:bg-amber-200 file:text-amber-900 hover:file:bg-amber-300'}`}
                      required
                    />
                    <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Maksimal 5 MB. (Wajib untuk Jalur Prestasi)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {uploadStatus && (
              <p className={`text-xs font-semibold text-center ${isDarkMode ? 'text-teal-400' : 'text-amber-600'}`}>{uploadStatus}</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-1.5 w-1/3 justify-center py-3 rounded-xl font-bold transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white/60 hover:bg-white/80 text-[#4a342a] border border-[#d6c5b3]'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-2/3 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 transition-all hover:-translate-y-0.5 ${btnPrimary}`}
              >
                {isSubmitting ? 'Memproses...' : 'Kirim Pendaftaran'}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 text-center">
          <a href="/cek-status" className={`text-sm font-semibold hover:underline transition-colors ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-[#8f472a] hover:text-[#b85c38]'}`}>
            Sudah mendaftar? Cek Status Pendaftaran di sini.
          </a>
        </div>
      </div>
    </main>
  );
}
