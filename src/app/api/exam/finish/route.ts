//src/app/api/exam/finish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const sql = getDb();
        const { applicant_id, category } = await request.json();

        // AMBIL DATA: Sertakan question_order untuk tahu total soal
        const examResult = await sql`
      SELECT id, status, question_order 
      FROM exam_results 
      WHERE applicant_id = ${applicant_id} AND category = ${category}
    `;

        if (examResult.length === 0 || examResult[0].status === 'Selesai') {
            return NextResponse.json({ error: 'Ujian sudah selesai.' }, { status: 400 });
        }

        const resultId = examResult[0].id;
        const questionOrder = typeof examResult[0].question_order === 'string'
            ? JSON.parse(examResult[0].question_order)
            : examResult[0].question_order;

        // Total soal yang seharusnya dikerjakan
        const totalQuestions = questionOrder && questionOrder.length > 0 ? questionOrder.length : 50;

        const answers = await sql`
      SELECT a.question_id, a.answer_value, q.dimension, q.type, q.correct_answer, q.is_favorable, q.question_code, q.options
      FROM exam_answers a JOIN exam_questions q ON a.question_id = q.id
      WHERE a.applicant_id = ${applicant_id} AND q.category = ${category}
    `;

        let rawScore: any = { dims: {}, flags: [], summary: '' };
        let interpretationText = '';

        // ==========================================
        // 1. TPA (LITERASI & NUMERASI)
        // ==========================================
        if (category === 'TPA') {
            let l = 0, n = 0;
            answers.forEach(a => {
                if (a.answer_value === a.correct_answer) {
                    if (a.dimension === 'Literasi') l++;
                    if (a.dimension === 'Numerasi') n++;
                }
            });

            // PEMBAGI YANG BENAR: Gunakan totalQuestions (50), bukan answers.length
            const score = Math.round(((l + n) / totalQuestions) * 100);
            const percentL = Math.round((l / 25) * 100);
            const percentN = Math.round((n / 25) * 100);

            const getTpaInterpretasi = (val: number, type: 'literasi' | 'numerasi' | 'total') => {
                if (val <= 40) return {
                    label: 'Sangat Rendah',
                    saran: type === 'literasi' ? 'Belum menguasai keterampilan membaca pemahaman dasar. Perlu program literasi intensif dan pendampingan individual.' :
                        type === 'numerasi' ? 'Belum menguasai operasi hitung dasar. Perlu remedial menyeluruh.' :
                            'Kesiapan akademik sangat kurang. Memerlukan program remedial menyeluruh dan pendampingan individual.'
                };
                if (val <= 55) return {
                    label: 'Rendah',
                    saran: type === 'literasi' ? 'Mampu memahami teks sederhana namun kesulitan pada inferensi.' :
                        type === 'numerasi' ? 'Menguasai operasi dasar namun lemah pada pemodelan masalah.' :
                            'Kesiapan akademik masih di bawah standar. Disarankan mengikuti program penguatan dasar.'
                };
                if (val <= 70) return {
                    label: 'Sedang',
                    saran: type === 'literasi' ? 'Kemampuan cukup baik, namun masih perlu penguatan pada penalaran tingkat tinggi.' :
                        type === 'numerasi' ? 'Kemampuan memadai. Perlu penguatan pada pemecahan masalah multi-langkah.' :
                            'Siswa cukup siap secara akademik. Perlu penguatan pada aspek yang lemah.'
                };
                if (val <= 85) return {
                    label: 'Tinggi',
                    saran: type === 'literasi' ? 'Memiliki kemampuan literasi yang baik. Dorong ke kegiatan pengayaan.' :
                        type === 'numerasi' ? 'Memiliki kemampuan numerasi yang baik. Dorong ke olimpiade.' :
                            'Siswa siap menghadapi jenjang baru. Dukung dengan program pengayaan.'
                };
                return {
                    label: 'Sangat Tinggi',
                    saran: 'Memiliki kemampuan yang sangat baik. Arahkan ke program akselerasi/kompetisi.'
                };
            };

            const intL = getTpaInterpretasi(percentL, 'literasi');
            const intN = getTpaInterpretasi(percentN, 'numerasi');
            const intTotal = getTpaInterpretasi(score, 'total');

            rawScore = {
                literasi: { skor: l, persen: percentL, label: intL.label, saran: intL.saran },
                numerasi: { skor: n, persen: percentN, label: intN.label, saran: intN.saran },
                total: { skor: score, label: intTotal.label, saran: intTotal.saran }
            };
            interpretationText = `Kesiapan Akademik: ${intTotal.label}`;
        }

        // ==========================================
        // 2. DIAGNOSTIK & SOSIAL EMOSIONAL
        // ==========================================
        else if (category === 'DIAGNOSTIK' || category === 'SOSIAL_EMOSIONAL') {
            // ... (Kode bagian ini TETAP SAMA seperti sebelumnya) ...
            const dimSums: Record<string, number> = {};
            const dimCounts: Record<string, number> = {};
            const flagRules = category === 'DIAGNOSTIK'
                ? { 'D1-2': 'Kecemasan tanpa alasan', 'D1-4': 'Gangguan tidur', 'D1-6': 'Mudah putus asa', 'D2-5': 'Sering bertengkar', 'D6-2': 'Pengaruh teman negatif', 'D6-4': 'Riwayat perkelahian' }
                : { 'D1-2': 'Sulit ungkapkan emosi', 'D1-6': 'Tidak ada motivasi', 'D2-2': 'Ledakan marah', 'D2-4': 'Cepat menyerah', 'D2-6': 'Emosi terpancing', 'D3-5': 'Mengabaikan teman', 'D4-3': 'Konflik kekerasan', 'D5-3': 'Terpengaruh ajakan negatif' };

            answers.forEach(a => {
                const opts = typeof a.options === 'string' ? JSON.parse(a.options) : a.options;
                if (opts && opts[a.answer_value]) {
                    let score = a.is_favorable ? opts[a.answer_value].nilai_favorable : opts[a.answer_value].nilai_unfavorable;
                    if (!dimSums[a.dimension]) { dimSums[a.dimension] = 0; dimCounts[a.dimension] = 0; }
                    dimSums[a.dimension] += score; dimCounts[a.dimension] += 1;
                    if (flagRules[a.question_code as keyof typeof flagRules] && score <= 2) {
                        rawScore.flags.push(`⚠️ ${flagRules[a.question_code as keyof typeof flagRules]}`);
                    }
                }
            });

            let totalSkor = 0, totalMax = 0;
            for (const dim in dimSums) {
                const min = dimCounts[dim] * 1, max = dimCounts[dim] * 4;
                const percent = Math.round(((dimSums[dim] - min) / (max - min)) * 100);
                totalSkor += dimSums[dim]; totalMax += max;
                let cat = 'Sangat Rendah';
                if (percent > 80) cat = 'Sangat Tinggi'; else if (percent > 60) cat = 'Tinggi'; else if (percent > 40) cat = 'Sedang'; else if (percent > 20) cat = 'Rendah';
                rawScore.dims[dim] = { skor: dimSums[dim], persen: percent, kategori: cat };
            }

            const percentTotal = Math.round((totalSkor / totalMax) * 100);
            let totalLabel = 'Perlu Pendampingan Intensif';
            if (percentTotal > 85) totalLabel = 'Sangat Baik'; else if (percentTotal > 70) totalLabel = 'Baik'; else if (percentTotal > 50) totalLabel = 'Cukup Baik'; else if (percentTotal > 30) totalLabel = 'Perlu Perhatian';
            rawScore.total = { persen: percentTotal, label: totalLabel };
            interpretationText = `Kondisi Umum: ${totalLabel}`;
        }

        // ==========================================
        // 3. CHARACTER SKILLS
        // ==========================================
        else if (category === 'CHARACTER') {
            // ... (Kode bagian ini TETAP SAMA seperti sebelumnya) ...
            const dimSums: Record<string, number> = {};
            const flagRules = { 'D3-2': 'Tidak terima kritik', 'D3-5': 'Merasa paling benar', 'D4-2': 'Cepat menyerah', 'D4-5': 'Mudah kehilangan semangat', 'D5-2': 'Sulit menahan keinginan', 'D6-3': 'Mengabaikan teman', 'D7-2': 'Sulit percaya teman' };
            answers.forEach(a => {
                const opts = typeof a.options === 'string' ? JSON.parse(a.options) : a.options;
                if (opts && opts[a.answer_value]) {
                    let score = a.is_favorable ? opts[a.answer_value].nilai_favorable : opts[a.answer_value].nilai_unfavorable;
                    if (!dimSums[a.dimension]) dimSums[a.dimension] = 0;
                    dimSums[a.dimension] += score;
                    if (flagRules[a.question_code as keyof typeof flagRules] && score <= 2) rawScore.flags.push(`⚠️ ${flagRules[a.question_code as keyof typeof flagRules]}`);
                }
            });
            const sortedDims = Object.entries(dimSums).sort((a, b) => b[1] - a[1]);
            rawScore.top3 = sortedDims.slice(0, 3).map(d => d[0]);
            rawScore.bot3 = sortedDims.slice(-3).map(d => d[0]);
            let totalSkor = 0;
            for (const dim in dimSums) {
                const percent = Math.round(((dimSums[dim] - 5) / 20) * 100);
                totalSkor += dimSums[dim];
                rawScore.dims[dim] = { skor: dimSums[dim], persen: percent, kategori: percent >= 81 ? 'Sangat Tinggi' : percent >= 61 ? 'Tinggi' : percent >= 41 ? 'Sedang' : percent >= 21 ? 'Rendah' : 'Sangat Rendah' };
            }
            const percentTotal = Math.round(((totalSkor - 35) / 140) * 100);
            rawScore.total = { persen: percentTotal, label: percentTotal >= 86 ? 'Sangat Baik' : percentTotal >= 71 ? 'Baik' : percentTotal >= 51 ? 'Cukup Baik' : percentTotal >= 31 ? 'Perlu Perhatian' : 'Perlu Pendampingan Intensif' };
            interpretationText = `Keterampilan Karakter: ${rawScore.total.label}`;
        }

        // ==========================================
        // 4. BIG FIVE
        // ==========================================
        else if (category === 'BIG_FIVE') {
            // ... (Kode bagian ini TETAP SAMA seperti sebelumnya) ...
            const dimSums: Record<string, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
            answers.forEach(a => {
                const opts = typeof a.options === 'string' ? JSON.parse(a.options) : a.options;
                if (opts && opts[a.answer_value]) {
                    let score = a.is_favorable ? opts[a.answer_value].nilai_favorable : opts[a.answer_value].nilai_unfavorable;
                    if (dimSums[a.dimension] !== undefined) dimSums[a.dimension] += score;
                }
            });
            for (const dim in dimSums) {
                const percent = Math.round(((dimSums[dim] - 6) / 24) * 100);
                const cat = percent <= 33 ? 'Rendah' : percent <= 66 ? 'Sedang' : 'Tinggi';
                rawScore.dims[dim] = { skor: dimSums[dim], persen: percent, kategori: cat };
            }
            const c = rawScore.dims.C?.kategori, n = rawScore.dims.N?.kategori, o = rawScore.dims.O?.kategori, e = rawScore.dims.E?.kategori, a = rawScore.dims.A?.kategori;
            if (n === 'Tinggi' && (c === 'Rendah' || a === 'Rendah')) rawScore.flags.push('🚨 FLAG-1: Kerentanan Emosional (Rujuk konseling).');
            if (c === 'Rendah' && o === 'Rendah' && e === 'Rendah') rawScore.flags.push('🚨 FLAG-2: Risiko Putus Sekolah (Pendampingan motivasi).');
            if (e === 'Rendah' && a === 'Rendah') rawScore.flags.push('🚨 FLAG-3: Isolasi Sosial (Fasilitasi kegiatan kelompok).');
            if (c === 'Tinggi' && n === 'Tinggi') rawScore.flags.push('🚨 FLAG-4: Perfeksionisme Berisiko (Pantau burnout).');
            if (a === 'Rendah' && e === 'Tinggi') rawScore.flags.push('🚨 FLAG-5: Potensi Konflik Sosial (Latih empati).');
            if (c === 'Tinggi' && n === 'Rendah') rawScore.summary = 'Pelajar Tangguh dan Teratur';
            else if (c === 'Tinggi' && n === 'Tinggi') rawScore.summary = 'Berprestasi namun Rentan Stres';
            else if (o === 'Tinggi' && c === 'Rendah') rawScore.summary = 'Kreatif namun Kurang Terstruktur';
            else if (e === 'Tinggi' && a === 'Rendah') rawScore.summary = 'Pemimpin Tegas namun Berpotensi Konflik';
            else if (e === 'Rendah' && o === 'Tinggi') rawScore.summary = 'Pemikir Tenang dan Mandiri';
            else if (a === 'Tinggi' && e === 'Rendah') rawScore.summary = 'Pendukung Setia';
            else rawScore.summary = 'Profil Kepribadian Seimbang';
            interpretationText = `Profil: ${rawScore.summary}`;
        }

        await sql`
      UPDATE exam_results 
      SET status = 'Selesai', raw_score = ${JSON.stringify(rawScore)}::jsonb, interpretation = ${interpretationText}, completed_at = CURRENT_TIMESTAMP
      WHERE id = ${resultId}
    `;

        return NextResponse.json({ message: 'Penilaian berhasil' }, { status: 200 });
    } catch (error) {
        console.error('Error finishing exam:', error);
        return NextResponse.json({ error: 'Gagal memproses nilai' }, { status: 500 });
    }
}