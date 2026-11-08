'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import imageCompression from 'browser-image-compression';

// Skema Validasi
const schema = z.object({
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').optional().or(z.literal('')),
  school_choice: z.string().min(1, 'Jurusan wajib diisi'),
});

type FormData = z.infer<typeof schema>;

// Fungsi konversi ke Base64
const convertBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // State untuk Dark Mode (Default: false / Tema Gurun Senja)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    setUploadStatus('');

    // --- 0. VALIDASI AWAL: CEK EMAIL ---
    try {
      setUploadStatus('Memeriksa ketersediaan email...');
      const checkRes = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const checkData = await checkRes.json();

      if (checkData.exists) {
        setMessage({ type: 'error', text: 'Email ini sudah terdaftar. Silakan gunakan email lain.' });
        setIsSubmitting(false);
        setUploadStatus('');
        return; // Hentikan proses, file TIDAK akan diunggah
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal memvalidasi email. Silakan coba lagi.' });
      setIsSubmitting(false);
      return;
    }

    // --- 1. PROSES UPLOAD FILE (Jika ada file) ---
    let document_key = null;

    if (selectedFile) {
      try {
        setUploadStatus('Mengompres dokumen...');
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
        const compressedFile = await imageCompression(selectedFile, options);

        setUploadStatus('Mempersiapkan unggahan...');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: compressedFile.name,
            fileType: compressedFile.type,
          }),
        });

        if (!uploadRes.ok) throw new Error('Gagal mendapatkan izin upload');
        const { signedUrl, key } = await uploadRes.json();

        setUploadStatus('Mengunggah dokumen ke storage...');
        const putRes = await fetch(signedUrl, {
          method: 'PUT',
          body: compressedFile,
        });

        if (!putRes.ok) throw new Error('Gagal mengunggah file ke storage');

        document_key = key;
        setUploadStatus('Dokumen berhasil diunggah.');
      } catch (uploadError) {
        console.error(uploadError);
        setUploadStatus('Gagal memproses atau mengunggah dokumen.');
        setIsSubmitting(false);
        return;
      }
    }

    // --- 2. SIMPAN DATA KE DATABASE ---
    try {
      setUploadStatus('Menyimpan data pendaftaran...');
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, document_key }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pendaftaran berhasil! Data Anda telah kami terima.' });
        reset();
        setSelectedFile(null);
        setUploadStatus('');
        const fileInput = document.getElementById('document') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage({ type: 'error', text: `Gagal: ${result.error || 'Terjadi kesalahan'}` });
        setUploadStatus('');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server.' });
      setUploadStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Wrapper Utama: Tema Gurun Senja untuk Light Mode
    <main
      className={`min-h-screen flex items-center justify-center p-4 sm:p-8 transition-colors duration-700 ease-in-out font-sans relative overflow-hidden
      ${isDarkMode
          ? 'bg-linear-to-br from-gray-900 via-slate-800 to-black text-gray-100'
          : 'bg-linear-to-br from-[#8c7a75] via-[#b48c6c] to-[#c99e76] text-[#2b1d18]'
        }`}
    >
      {/* Ornamen Latar Belakang (Blobs) bergaya gurun */}
      <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob transition-colors duration-700 ${isDarkMode ? 'bg-purple-600' : 'bg-[#9e6f58]'}`}></div>
      <div className={`absolute top-[20%] right-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 transition-colors duration-700 ${isDarkMode ? 'bg-blue-600' : 'bg-[#d19c6a]'}`}></div>
      <div className={`absolute bottom-[-20%] left-[20%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 transition-colors duration-700 ${isDarkMode ? 'bg-indigo-600' : 'bg-[#e3b88b]'}`}></div>

      {/* Tombol Toggle Dark/Light Mode */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`absolute top-4 right-4 sm:top-8 sm:right-8 p-3 rounded-full backdrop-blur-md border shadow-lg transition-all z-50
        ${isDarkMode
            ? 'bg-gray-800/50 border-gray-700 text-yellow-400 hover:bg-gray-700/50'
            : 'bg-white/20 border-white/30 text-[#4a342a] hover:bg-white/30'
          }`}
        aria-label="Toggle Dark Mode"
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      {/* Kartu Glassmorphism Utama */}
      <div
        className={`w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border backdrop-blur-2xl z-10 transition-all duration-700
        ${isDarkMode
            ? 'bg-gray-800/40 border-gray-700/50 shadow-black/50'
            : 'bg-[#fffcf8]/30 border-[#ffffff]/40 shadow-[#5c3a21]/20'
          }`}
      >
        <div className="text-center mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-[#2b1d18]'}`}>
            Penerimaan Siswa Baru
          </h1>
          <h2 className={`text-base sm:text-lg font-semibold tracking-wide ${isDarkMode ? 'text-indigo-400' : 'text-[#8f472a]'}`}>
            SMK KH. A. WAHAB MUHSIN
          </h2>
        </div>

        {/* Notifikasi Pesan */}
        {message.text && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-medium border backdrop-blur-sm transition-all
            ${message.type === 'success'
              ? isDarkMode ? 'bg-green-900/30 border-green-700/50 text-green-300' : 'bg-green-100/60 border-green-300 text-green-800'
              : isDarkMode ? 'bg-red-900/30 border-red-700/50 text-red-300' : 'bg-red-100/60 border-red-300 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Input Nama */}
          <div>
            <label htmlFor="full_name" className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>
              Nama Lengkap
            </label>
            <input
              id="full_name"
              {...register('full_name')}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 shadow-sm
                ${isDarkMode
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/50'
                  : 'bg-white/30 border-[#d6c5b3] text-[#2b1d18] placeholder:text-[#7a6358] focus:border-[#b85c38] focus:ring-[#b85c38]/30'
                }`}
              placeholder="Masukkan nama lengkap"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.full_name.message}</p>}
          </div>

          {/* Input Email */}
          <div>
            <label htmlFor="email" className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 shadow-sm
                ${isDarkMode
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/50'
                  : 'bg-white/30 border-[#d6c5b3] text-[#2b1d18] placeholder:text-[#7a6358] focus:border-[#b85c38] focus:ring-[#b85c38]/30'
                }`}
              placeholder="contoh@email.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
          </div>

          {/* Input Telepon */}
          <div>
            <label htmlFor="phone" className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>
              Nomor Telepon (Opsional)
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 shadow-sm
                ${isDarkMode
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/50'
                  : 'bg-white/30 border-[#d6c5b3] text-[#2b1d18] placeholder:text-[#7a6358] focus:border-[#b85c38] focus:ring-[#b85c38]/30'
                }`}
              placeholder="08xxxxxxxxxx"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.phone.message}</p>}
          </div>

          {/* Input Jurusan */}
          <div>
            <label htmlFor="school_choice" className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>
              Pilihan Jurusan
            </label>
            <select
              id="school_choice"
              {...register('school_choice')}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 shadow-sm appearance-none
                ${isDarkMode
                  ? 'bg-gray-900/50 border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500/50'
                  : 'bg-white/30 border-[#d6c5b3] text-[#2b1d18] focus:border-[#b85c38] focus:ring-[#b85c38]/30'
                }`}
            >
              <option value="" className={isDarkMode ? 'bg-gray-800' : 'text-[#2b1d18] bg-[#f4eadc]'}>-- Pilih Jurusan --</option>
              <option value="Farmasi Klinis dan Komunitas" className={isDarkMode ? 'bg-gray-800' : 'text-[#2b1d18] bg-[#f4eadc]'}>Farmasi Klinis dan Komunitas</option>
              <option value="Produksi dan Siaran Program Televisi" className={isDarkMode ? 'bg-gray-800' : 'text-[#2b1d18] bg-[#f4eadc]'}>Produksi dan Siaran Program Televisi</option>
              <option value="Manajemen Perkantoran" className={isDarkMode ? 'bg-gray-800' : 'text-[#2b1d18] bg-[#f4eadc]'}>Manajemen Perkantoran</option>
            </select>
            {errors.school_choice && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.school_choice.message}</p>}
          </div>

          {/* Input File */}
          <div>
            <label htmlFor="document" className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-[#4a342a]'}`}>
              Upload Foto (KK/Akta/Ijazah)
            </label>
            <div className={`rounded-xl border p-1 shadow-sm transition-all
              ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white/30 border-[#d6c5b3]'}`}>
              <input
                id="document"
                type="file"
                accept="image/jpeg, image/png, image/jpg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className={`block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:font-semibold transition-all
                  ${isDarkMode
                    ? 'text-gray-400 file:bg-indigo-900/50 file:text-indigo-300 hover:file:bg-indigo-800/50'
                    : 'text-[#7a6358] file:bg-[#d8b49b] file:text-[#5c2c16] hover:file:bg-[#c99e76]'
                  }`}
              />
            </div>
            <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-[#7a6358]'}`}>
              *Hanya format gambar (JPG/PNG). File akan otomatis dikompres.
            </p>
            {uploadStatus && <p className={`text-xs mt-1.5 font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-[#b85c38]'}`}>{uploadStatus}</p>}
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-3 px-4 mt-4 rounded-xl shadow-lg text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              ${isDarkMode
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50'
                : 'bg-[#b85c38] hover:bg-[#a04d2c] shadow-[#5c3a21]/30'
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Memproses...
              </span>
            ) : 'Kirim Pendaftaran'}
          </button>
        </form>
      </div>
    </main>
  );
}