//src/lib/whatsapp-templates.ts

export interface WhatsAppApplicantData {
    id?: number;
    registration_number?: string | null;
    full_name: string;
    phone?: string | null;
    parent_phone?: string | null;
    school_choice?: string | null;
    school_choice_2?: string | null;
    registration_path?: string | null;
    status: string;
    document_notes?: string | null;
    revision_fields?: string[] | string | null;
    test_date?: string | null;
    test_time?: string | null;
    test_location?: string | null;
    interview_date?: string | null;
    interview_time?: string | null;
    accepted_major?: string | null;
    rereg_status?: string | null;
    rereg_notes?: string | null;
    last_wa_sent_at?: string | null;
    last_wa_sent_by?: string | null;
    last_wa_recipient?: string | null;
    referral_code?: string | null;
    referrer_name?: string | null;
    referrer_phone?: string | null;
    referrer_school?: string | null;
    referrer_jabatan?: string | null;
}

export interface WhatsAppSiteSettings {
    school_name?: string | null;
    payment_portal_url?: string | null;
    rereg_start?: string | null;
    rereg_end?: string | null;
}

const REVISION_FIELD_LABELS: Record<string, string> = {
    full_name: 'Nama Lengkap Siswa',
    nisn: 'NISN',
    tanggal_lahir: 'Tanggal Lahir',
    asal_sekolah: 'Asal Sekolah (SMP/MTs)',
    email: 'Alamat Email',
    phone: 'Nomor HP/WA Siswa',
    father_name: 'Nama Ayah Kandung',
    mother_name: 'Nama Ibu Kandung',
    parent_phone: 'Nomor HP/WA Orang Tua',
    kk: 'Scan Kartu Keluarga (KK)',
    akta: 'Scan Akta Kelahiran',
    prestasi: 'Sertifikat / Piagam Prestasi (PDF)',
};

export function normalizeIndonesianPhone(raw?: string | null): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('0')) {
        return '62' + digits.slice(1);
    }
    if (digits.startsWith('8')) {
        return '62' + digits;
    }
    if (digits.startsWith('62')) {
        return digits;
    }
    return digits;


}

export function formatDateForWhatsApp(dateStr?: string | null): string {
    if (!dateStr) return 'Belum dijadwalkan';
    const clean = dateStr.split('T')[0];
    const parsed = new Date(clean + 'T00:00:00');
    if (isNaN(parsed.getTime())) return clean;

    return parsed.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });


}

function parseRevisionFields(raw?: string[] | string | null): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

export function buildWhatsAppMessage(
    applicant: WhatsAppApplicantData,
    settings?: WhatsAppSiteSettings | null,
    originUrl?: string,
    recipientType: 'student' | 'parent' | 'referrer' = 'student'
): string {
    const schoolName = settings?.school_name || 'SMK KH. A. Wahab Muhsin';
    const portalPaymentUrl = settings?.payment_portal_url || 'https://gosiswa.com';
    const baseUrl =
        originUrl ||
        (typeof window !== 'undefined'
            ? window.location.origin
            : 'https://pmb.smk-khawahabmuhsin.sch.id');

    const regNo = applicant.registration_number ? ' (' + applicant.registration_number + ')' : '';
    const refInfo = applicant.referral_code ? ' [Kode Referal: ' + applicant.referral_code + ']' : '';
    const header =
        recipientType === 'referrer'
            ? "Assalamu'alaikum Wr. Wb.\n" +
              'Yth. Bapak/Ibu ' + (applicant.referrer_name || 'Guru / Wali Kelas') +
              (applicant.referrer_jabatan ? ' (' + applicant.referrer_jabatan + ')' : '') + ',\n' +
              'Kami menginformasikan perkembangan pendaftaran siswa bimbingan/referal Anda atas nama *' +
              applicant.full_name + '*' + regNo + refInfo + ':\n\n'
            : "Assalamu'alaikum Wr. Wb.\n" +
              'Yth. Calon Peserta Didik / Orang Tua dari *' + applicant.full_name + '*' + regNo + ',\n\n';
    const footer = '\n\nHormat kami,\n*Panitia PSB ' + schoolName + '*';

    if (applicant.status === 'Perbaikan') {
        const fields = parseRevisionFields(applicant.revision_fields);
        const fieldListText =
            fields.length > 0
                ? fields
                    .map((code, idx) => (idx + 1) + '. ' + (REVISION_FIELD_LABELS[code] || code))
                    .join('\n')
                : '• Silakan periksa kelengkapan berkas dan biodata Anda.';

        const notesText = applicant.document_notes
            ? '\n*Catatan Panitia:*\n"' + applicant.document_notes + '"\n'
            : '';

        return (
            header +
            'Berdasarkan hasil verifikasi administrasi PSB *' + schoolName + '*, terdapat data/berkas pendaftaran yang perlu *DIPERBAIKI*:\n\n' +
            '*Bagian yang Perlu Diperbaiki:*\n' + fieldListText + '\n' +
            notesText +
            '\nSilakan segera mengunggah perbaikan melalui laman Cek Status berikut:\n' +
            baseUrl + '/cek-status\n\n' +
            'Login menggunakan *NISN* dan *Tanggal Lahir* Anda agar proses seleksi dapat segera dilanjutkan.' +
            footer
        );
    }

    if (
        applicant.status === 'Siap Tes dan/atau Wawancara' ||
        applicant.status === 'Siap Tes'
    ) {
        const testDateFormatted = formatDateForWhatsApp(applicant.test_date);
        const testTimeFormatted = applicant.test_time ? applicant.test_time.slice(0, 5) + ' WIB' : '-';
        const testLocFormatted = applicant.test_location || 'Online via Portal Ujian PSB';

        const intDateFormatted = formatDateForWhatsApp(applicant.interview_date);
        const intTimeFormatted = applicant.interview_time ? applicant.interview_time.slice(0, 5) + ' WIB' : '-';

        return (
            header +
            'Berkas pendaftaran Anda di *' + schoolName + '* telah terverifikasi. Anda dijadwalkan untuk mengikuti tahapan *Tes Seleksi & Wawancara* dengan rincian:\n\n' +
            '*1. Ujian Seleksi Online*\n' +
            '• Hari/Tanggal: ' + testDateFormatted + '\n' +
            '• Waktu: ' + testTimeFormatted + '\n' +
            '• Tempat/Media: ' + testLocFormatted + '\n' +
            '• Tautan Ujian: ' + baseUrl + '/tes\n\n' +
            '*2. Wawancara (Video Call)*\n' +
            '• Hari/Tanggal: ' + intDateFormatted + '\n' +
            '• Waktu: ' + intTimeFormatted + '\n' +
            '• Tautan Wawancara: ' + baseUrl + '/wawancara\n\n' +
            '*Catatan Penting:*\n' +
            'Harap bersiap 10 menit sebelum jadwal dimulai, pastikan koneksi internet stabil serta kamera perangkat berfungsi dengan baik. Login menggunakan *NISN* dan *Tanggal Lahir*.' +
            footer
        );
    }

    if (applicant.status === 'Diterima') {
        const major = applicant.accepted_major || applicant.school_choice || 'Kompetensi Keahlian Pilihan';

        if (applicant.rereg_status === 'Terverifikasi') {
            return (
                header +
                '*SELAMAT!* Proses *Daftar Ulang* Anda di *' + schoolName + '* (Jurusan: *' + major + '*) telah *TERVERIFIKASI RESMI* oleh panitia.\n\n' +
                'Silakan unduh dan cetak *Kartu Bukti Daftar Ulang (ber-QR Code)* melalui tautan berikut untuk dibawa saat kegiatan MPLS dan pengambilan seragam praktik:\n' +
                baseUrl + '/daftar-ulang' +
                footer
            );
        }

        if (applicant.rereg_status === 'Perbaikan Daftar Ulang') {
            return (
                header +
                'Panitia telah memeriksa berkas *Daftar Ulang* Anda pada jurusan *' + major + '*, namun terdapat bagian yang perlu *DIPERBAIKI*:\n\n' +
                '*Catatan Panitia:*\n"' +
                (applicant.rereg_notes || 'Harap periksa kembali kelengkapan data Dapodik atau kuitansi pembayaran.') +
                '"\n\n' +
                'Silakan segera melakukan perbaikan melalui portal Daftar Ulang:\n' +
                baseUrl + '/daftar-ulang' +
                footer
            );
        }

        if (applicant.rereg_status === 'Menunggu Verifikasi') {
            return (
                header +
                'Terima kasih, formulir *Daftar Ulang* dan kuitansi pembayaran Anda untuk jurusan *' + major + '* telah kami terima dan saat ini sedang dalam proses verifikasi panitia.\n\n' +
                'Anda dapat memantau status verifikasi secara berkala di:\n' +
                baseUrl + '/daftar-ulang' +
                footer
            );
        }

        const reregPeriod =
            settings?.rereg_start || settings?.rereg_end
                ? '\n*Periode Daftar Ulang:* ' + formatDateForWhatsApp(settings?.rereg_start) + ' s.d. ' + formatDateForWhatsApp(settings?.rereg_end) + '\n'
                : '\n';

        return (
            header +
            '*SELAMAT!* Berdasarkan hasil rapat pleno seleksi PSB *' + schoolName + '*, Anda dinyatakan *DITERIMA* pada kompetensi keahlian:\n\n' +
            '*' + major + '*\n' +
            reregPeriod +
            '\n*Langkah Daftar Ulang:*\n' +
            '1. Lakukan pembayaran daftar ulang via Virtual Account di portal *' + portalPaymentUrl + '* (tersedia pilihan Skema Minimal/DP untuk mengunci kursi atau Skema Lunas + Diskon).\n' +
            '2. Simpan *Kuitansi Digital*, lalu lengkapi biodata Dapodik & unggah berkas daftar ulang pada laman:\n' +
            baseUrl + '/daftar-ulang\n\n' +
            'Surat Keterangan Lulus juga dapat dicetak melalui laman:\n' +
            baseUrl + '/cek-status' +
            footer
        );
    }

    if (applicant.status === 'Ditolak') {
        return (
            header +
            'Terima kasih telah mengikuti rangkaian seleksi Penerimaan Siswa Baru di *' + schoolName + '*.\n\n' +
            'Berdasarkan hasil evaluasi seleksi dan keterbatasan daya tampung pada gelombang ini, mohon maaf Anda belum dapat diterima. Tetap semangat dalam melanjutkan pendidikan dan meraih cita-cita.' +
            footer
        );
    }

    const chosenMajor = applicant.school_choice || '-';
    return (
        header +
        'Terima kasih telah mendaftar di *' + schoolName + '* pada kompetensi keahlian *' + chosenMajor + '*.\n\n' +
        'Saat ini berkas pendaftaran Anda berstatus *Menunggu Verifikasi (Pending)* oleh panitia. Anda dapat memantau perkembangan status seleksi secara berkala melalui tautan:\n' +
        baseUrl + '/cek-status\n\n' +
        'Gunakan *NISN* dan *Tanggal Lahir* Anda untuk masuk.' +
        footer
    );


}

export function buildWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = normalizeIndonesianPhone(phone);
    if (!cleanPhone) return '';
    return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message);
}