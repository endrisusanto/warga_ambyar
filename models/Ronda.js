const db = require('../config/db');
const moment = require('moment');

const Ronda = {
    // Generate schedule for a specific month (only Saturdays)
    // Respects ronda_libur table: skips libur dates and adjusts team rotation accordingly
    getTeamForDate: async (date) => {
        const dateStr = moment(date).format('YYYY-MM-DD');
        const [liburRows] = await db.query('SELECT tanggal FROM ronda_libur ORDER BY tanggal ASC');
        const liburSet = new Set(liburRows.map(r => moment(r.tanggal).format('YYYY-MM-DD')));

        if (liburSet.has(dateStr)) return null;

        const teamsList = ['A', 'B', 'C', 'D'];
        const epochDate = moment('2026-01-10');
        const epochIndex = 2; // C

        const dateObj = moment(date);
        const diffDays = dateObj.diff(epochDate, 'days');
        const diffWeeks = Math.floor(diffDays / 7);
        const liburCountBefore = liburRows.filter(r => moment(r.tanggal).format('YYYY-MM-DD') < dateStr).length;

        let teamIndex = (epochIndex + diffWeeks - liburCountBefore) % 4;
        if (teamIndex < 0) teamIndex += 4;
        return teamsList[teamIndex];
    },

    generateSchedule: async (month, year) => {
        // Don't generate schedules for years before 2026
        if (parseInt(year) < 2026) return;

        // Auto-create ronda_libur table if not exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS ronda_libur (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanggal DATE NOT NULL,
                alasan VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_libur (tanggal)
            )
        `);

        // Fetch ALL libur dates (across all years, not just this month)
        const [liburRows] = await db.query('SELECT tanggal FROM ronda_libur ORDER BY tanggal ASC');
        const liburSet = new Set(liburRows.map(r => moment(r.tanggal).format('YYYY-MM-DD')));

        // Determine Saturdays in the month
        const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
        const endDate = startDate.clone().endOf('month');
        const saturdays = [];
        let day = startDate.clone();
        while (day <= endDate) {
            if (day.day() === 6) saturdays.push(day.format('YYYY-MM-DD'));
            day.add(1, 'days');
        }

        const teamsList = ['A', 'B', 'C', 'D'];
        // Epoch: Jan 10 2026 is Tim C (Index 2)
        const epochDate = moment('2026-01-10');
        const epochIndex = 2; // C

        for (const dateStr of saturdays) {
            // Skip this date entirely if it's a libur week — do NOT insert any schedule
            if (liburSet.has(dateStr)) continue;

            const dateObj = moment(dateStr);
            const diffDays = dateObj.diff(epochDate, 'days');
            const diffWeeks = Math.floor(diffDays / 7);

            // Adjust the team index: for each libur date BEFORE this date,
            // shift the rotation back by 1 (so the libured team gets scheduled next)
            const liburCountBefore = liburRows.filter(r => moment(r.tanggal).format('YYYY-MM-DD') < dateStr).length;

            let teamIndex = (epochIndex + diffWeeks - liburCountBefore) % 4;
            if (teamIndex < 0) teamIndex += 4;
            const currentTeam = teamsList[teamIndex];

            const [wargas] = await db.query(`
                SELECT id as representative_id, blok, nomor_rumah
                FROM warga
                WHERE tim_ronda = ? AND is_ronda = 1
                ORDER BY blok ASC, CAST(nomor_rumah AS UNSIGNED) ASC, id ASC
            `, [currentTeam]);

            for (const house of wargas) {
                if (!house.representative_id) continue;

                const [existing] = await db.query(
                    'SELECT id FROM ronda_jadwal WHERE tanggal = ? AND warga_id = ?',
                    [dateStr, house.representative_id]
                );

                if (existing.length === 0) {
                    try {
                        await db.query(
                            `INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status)
                             VALUES (?, ?, ?, ?, 'scheduled')`,
                            [dateStr, house.representative_id, house.blok, house.nomor_rumah]
                        );
                    } catch (e) {
                        console.error('Error inserting schedule:', e);
                    }
                }
            }
        }
    },

    getMonthlySchedule: async (month, year) => {
        const startDate = `${year}-${month}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

        // USER-BASED: Deduplicate ronda_jadwal by user and join
        const [rows] = await db.query(`
            SELECT r.*, w.nama, w.no_hp, w.tim_ronda
            FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY tanggal, warga_id ORDER BY (status != 'scheduled') DESC, id DESC) as rn
                FROM ronda_jadwal
                WHERE tanggal BETWEEN ? AND ?
            ) r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.rn = 1
            ORDER BY r.tanggal ASC, r.blok, CAST(r.nomor_rumah AS UNSIGNED), r.warga_id
        `, [startDate, endDate]);

        return rows;
    },

    getTodaySchedule: async () => {
        const now = moment();
        let targetDate = now.format('YYYY-MM-DD');

        // Jika hari ini Minggu, tampilkan jadwal hari Sabtu (kemarin)
        // karena Ronda Malam Minggu relevan sampai Minggu pagi/siang
        if (now.day() === 0) {
            targetDate = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
        }

        // USER-BASED
        const [rows] = await db.query(`
            SELECT r.*, w.nama, w.tim_ronda, w.foto_profil
            FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY tanggal, warga_id ORDER BY (status != 'scheduled') DESC, id DESC) as rn
                FROM ronda_jadwal
                WHERE tanggal = ?
            ) r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.rn = 1
        `, [targetDate]);
        return rows;
    },

    getNextSchedule: async () => {
        const today = moment().format('YYYY-MM-DD');
        
        // Find next date
        const [dateRows] = await db.query(`
            SELECT DISTINCT tanggal
            FROM ronda_jadwal
            WHERE tanggal > ?
            ORDER BY tanggal ASC
            LIMIT 1
        `, [today]);

        if (dateRows.length === 0) return [];

        const nextDate = dateRows[0].tanggal;

        // USER-BASED
        const [schedule] = await db.query(`
            SELECT r.*, w.nama, w.tim_ronda, w.foto_profil
            FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY tanggal, warga_id ORDER BY (status != 'scheduled') DESC, id DESC) as rn
                FROM ronda_jadwal
                WHERE tanggal = ?
            ) r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.rn = 1
        `, [nextDate]);

        return schedule;
    },

    updateStatus: async (id, status, keterangan = null) => {
        let finalKeterangan = keterangan;

        // Jika meriset ke scheduled, bersihkan semua tag "Auto" dan tag dalam kurung [] agar tidak terproses ulang
        if (status === 'scheduled' && finalKeterangan) {
            finalKeterangan = finalKeterangan
                .replace(/Auto (Reschedule|Move) \(\d+\)/g, '')
                .replace(/\[.*?\]/g, '')
                .trim();
        }

        let query = "UPDATE ronda_jadwal SET status = ?";
        const params = [status];

        if (status === 'alpa') {
            query += ", denda = 50000";
        } else {
            query += ", denda = 0";
        }

        if (finalKeterangan !== undefined && finalKeterangan !== null) {
            query += ", keterangan = ?";
            params.push(finalKeterangan);
        }

        query += " WHERE id = ?";
params.push(id);

        await db.query(query, params);

        // Jika status berubah menjadi 'hadir' atau 'alpa', batalkan semua jadwal 
        // untuk USER yang sama dalam range 4 minggu ke depan dari tanggal jadwal ini
        if (status === 'hadir' || status === 'alpa') {
            const [currentSchedule] = await db.query("SELECT tanggal, warga_id FROM ronda_jadwal WHERE id = ?", [id]);
            if (currentSchedule.length > 0) {
                const currentDate = currentSchedule[0].tanggal;
                const wargaId = currentSchedule[0].warga_id;
                const fourWeeksLater = moment(currentDate).add(4, 'weeks').format('YYYY-MM-DD');
                
                if (status === 'hadir') {
                    // CURI START LOGIC: Cari jadwal aslinya di masa depan
                    const [futureSchedules] = await db.query(
                        "SELECT tanggal FROM ronda_jadwal WHERE warga_id = ? AND tanggal > ? AND status = 'scheduled' ORDER BY tanggal ASC LIMIT 1",
                        [wargaId, currentDate]
                    );
                    
                    if (futureSchedules.length > 0) {
                        const futureDate = futureSchedules[0].tanggal;
                        const futureDateStr = moment(futureDate).format('DD MMM');
                        const currentDateStr = moment(currentDate).format('DD MMM');
                        
                        // 1. Tandai jadwal masa depan sebagai 'hadir' dengan catatan
                        await db.query(`
                            UPDATE ronda_jadwal 
                            SET status = 'hadir', 
                                keterangan = CONCAT(IFNULL(keterangan, ''), ' [Sudah Hadir Lebih Awal pada ', ?, ']')
                            WHERE warga_id = ? AND tanggal = ? AND status = 'scheduled'
                        `, [currentDateStr, wargaId, futureDate]);
                        
                        // 2. Tambahkan catatan pemajuan pada jadwal saat ini
                        await db.query(`
                            UPDATE ronda_jadwal 
                            SET keterangan = CONCAT(IFNULL(keterangan, ''), ' [Pemajuan Jadwal dari ', ?, ']')
                            WHERE id = ?
                        `, [futureDateStr, id]);
                        
                        console.log(`[CURI START] Linked ${currentDateStr} to future ${futureDateStr} for Warga ${wargaId}`);
                    }
                } else {
                    // For 'alpa', we still delete future redundant schedules to avoid confusion
                    await db.query(
                        "DELETE FROM ronda_jadwal WHERE warga_id = ? AND id != ? AND tanggal > ? AND tanggal <= ? AND (status IN ('scheduled', 'reschedule') OR (status = 'alpa' AND (status_bayar IS NULL OR status_bayar = '')))",
                        [wargaId, id, currentDate, fourWeeksLater]
                    );
                }
            }
        } else if (status === 'scheduled') {
            // REVERT LOGIC: Jika kehadiran dibatalkan (kembali ke 'scheduled')
            const [currentSchedule] = await db.query("SELECT tanggal, warga_id, keterangan FROM ronda_jadwal WHERE id = ?", [id]);
            if (currentSchedule.length > 0) {
                const currentDate = currentSchedule[0].tanggal;
                const wargaId = currentSchedule[0].warga_id;
                const currentKet = currentSchedule[0].keterangan || '';
                
                // Cek apakah ini adalah record "Pemajuan"
                if (currentKet.includes('[Pemajuan Jadwal dari')) {
                    const dateTag = ` [Sudah Hadir Lebih Awal pada ${moment(currentDate).format('DD MMM')}]`;
                    
                    // 1. Kembalikan jadwal masa depan yang tertaut menjadi 'scheduled'
                    await db.query(`
                        UPDATE ronda_jadwal 
                        SET status = 'scheduled',
                            keterangan = TRIM(REPLACE(keterangan, ?, ''))
                        WHERE warga_id = ? 
                          AND tanggal > ? 
                          AND status = 'hadir' 
                          AND keterangan LIKE ?
                    `, [dateTag, wargaId, currentDate, `%${dateTag.trim()}%`]);
                    
                    // 2. HAPUS record pemajuan ini (agar hilang dari minggu sebelumnya)
                    await db.query("DELETE FROM ronda_jadwal WHERE id = ?", [id]);
                    
                    console.log(`[REVERT CURI START] Deleted early record and restored future schedule for Warga ${wargaId}`);
                } else {
                    // Reset reguler (untuk jadwal asli)
                    const dateTag = ` [Sudah Hadir Lebih Awal pada ${moment(currentDate).format('DD MMM')}]`;
                    await db.query(`
                        UPDATE ronda_jadwal 
                        SET status = 'scheduled',
                            keterangan = TRIM(REPLACE(keterangan, ?, ''))
                        WHERE warga_id = ? 
                          AND tanggal > ? 
                          AND status = 'hadir' 
                          AND keterangan LIKE ?
                    `, [dateTag, wargaId, currentDate, `%${dateTag.trim()}%`]);
                }
            }
        }
    },

    rescheduleNext: async (id, keterangan) => {
        const [rows] = await db.query("SELECT * FROM ronda_jadwal WHERE id = ?", [id]);
        if (rows.length === 0) return;
        const current = rows[0];

        let liburSet = new Set();
        try {
            const [liburRows] = await db.query("SELECT tanggal FROM ronda_libur");
            liburSet = new Set(liburRows.map(r => moment(r.tanggal).format('YYYY-MM-DD')));
        } catch (e) { }

        let nextWeekDate = moment(current.tanggal).add(7, 'days');
        while (liburSet.has(nextWeekDate.format('YYYY-MM-DD'))) {
            nextWeekDate.add(7, 'days');
        }
        const nextWeek = nextWeekDate.format('YYYY-MM-DD');
        const nextWeekStr = nextWeekDate.format('DD MMM YYYY');

        await db.query("UPDATE ronda_jadwal SET status = 'reschedule', keterangan = ? WHERE id = ?", [keterangan || `Reschedule ke ${nextWeekStr}`, id]);

        try {
            await db.query(
                "INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status, keterangan) VALUES (?, ?, ?, ?, 'scheduled', ?)",
                [nextWeek, current.warga_id, current.blok, current.nomor_rumah, `Reschedule dari ${moment(current.tanggal).format('DD MMM YYYY')}`]
            );
        } catch (e) { }

        return nextWeek;
    },

    reschedulePrev: async (id, keterangan) => {
        const [rows] = await db.query("SELECT * FROM ronda_jadwal WHERE id = ?", [id]);
        if (rows.length === 0) return;
        const current = rows[0];

        let liburSet = new Set();
        try {
            const [liburRows] = await db.query("SELECT tanggal FROM ronda_libur");
            liburSet = new Set(liburRows.map(r => moment(r.tanggal).format('YYYY-MM-DD')));
        } catch (e) { }

        let prevWeekDate = moment(current.tanggal).subtract(7, 'days');
        while (liburSet.has(prevWeekDate.format('YYYY-MM-DD'))) {
            prevWeekDate.subtract(7, 'days');
        }
        const prevWeek = prevWeekDate.format('YYYY-MM-DD');
        const prevWeekStr = prevWeekDate.format('DD MMM YYYY');

        await db.query("UPDATE ronda_jadwal SET status = 'reschedule', keterangan = ? WHERE id = ?", [keterangan || `[Maju Jadwal] Reschedule ke ${prevWeekStr}`, id]);

        try {
            // Cek apakah sudah ada jadwal di minggu lalu
            const [existing] = await db.query("SELECT id FROM ronda_jadwal WHERE tanggal = ? AND warga_id = ?", [prevWeek, current.warga_id]);
            if (existing.length > 0) {
                await db.query("UPDATE ronda_jadwal SET status = 'hadir', keterangan = CONCAT(IFNULL(keterangan, ''), ?) WHERE id = ?", [` [Reschedule dari ${moment(current.tanggal).format('DD MMM YYYY')}]`, existing[0].id]);
            } else {
                await db.query(
                    "INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status, keterangan) VALUES (?, ?, ?, ?, 'hadir', ?)",
                    [prevWeek, current.warga_id, current.blok, current.nomor_rumah, `Reschedule dari ${moment(current.tanggal).format('DD MMM YYYY')}`]
                );
            }
        } catch (e) { }

        return prevWeek;
    },

    markAsPaid: async (ids) => {
        if (!Array.isArray(ids)) ids = [ids];
        if (ids.length === 0) return;
        // Mark as paid but DO NOT clear denda amount. This preserves history.
        // Also do NOT change status to 'hadir', keep it as 'alpa' or whatever.
        await db.query("UPDATE ronda_jadwal SET status_bayar = 'paid' WHERE id IN (?)", [ids]);
    },

    payFine: async (id) => {
        await db.query("UPDATE ronda_jadwal SET denda = 0, status = 'hadir', status_bayar = 'paid', keterangan = CONCAT(IFNULL(keterangan, ''), ' [Denda Lunas]') WHERE id = ?", [id]);
    },

    submitFinePayment: async (id, filename) => {
        await db.query("UPDATE ronda_jadwal SET bukti_bayar = ?, status_bayar = 'pending' WHERE id = ?", [filename, id]);
    },

    getTeams: async () => {
        // USER-BASED: Get all users that do ronda
        const [rows] = await db.query(`
            SELECT id, nama, blok, nomor_rumah, tim_ronda 
            FROM warga w 
            WHERE is_ronda = 1 
            ORDER BY tim_ronda, blok, CAST(nomor_rumah AS UNSIGNED), id
        `);
        const teams = { A: [], B: [], C: [], D: [], Unassigned: [] };
        rows.forEach(r => {
            if (r.tim_ronda && teams[r.tim_ronda]) {
                teams[r.tim_ronda].push(r);
            } else {
                teams.Unassigned.push(r);
            }
        });
        return teams;
    },

    updateMemberTeam: async (wargaId, team) => {
        await db.query("UPDATE warga SET tim_ronda = ? WHERE id = ?", [team || null, wargaId]);
    },

    updatePhotos: async (id, photos) => {
        // Fetch existing photos first
        const [rows] = await db.query("SELECT foto_bukti FROM ronda_jadwal WHERE id = ?", [id]);
        let existingPhotos = [];
        if (rows.length > 0 && rows[0].foto_bukti) {
            try {
                existingPhotos = JSON.parse(rows[0].foto_bukti);
            } catch (e) {
                existingPhotos = [];
            }
        }

        const allPhotos = [...existingPhotos, ...photos];
        const photosJson = JSON.stringify(allPhotos);
        await db.query("UPDATE ronda_jadwal SET foto_bukti = ? WHERE id = ?", [photosJson, id]);
    },

    addDokumentasi: async (date, photos) => {
        const photosJson = JSON.stringify(photos);
        await db.query("INSERT INTO ronda_dokumentasi (tanggal, foto) VALUES (?, ?)", [date, photosJson]);
    },

    getDokumentasi: async (month, year) => {
        const startDate = `${year}-${month}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
        const [rows] = await db.query("SELECT * FROM ronda_dokumentasi WHERE tanggal BETWEEN ? AND ?", [startDate, endDate]);
        return rows;
    },

    createShare: async (date, filename) => {
        const [result] = await db.query("INSERT INTO ronda_shares (date, image_filename) VALUES (?, ?)", [date, filename]);
        return result.insertId;
    },

    getShare: async (id) => {
        const [rows] = await db.query("SELECT * FROM ronda_shares WHERE id = ?", [id]);
        return rows[0];
    },

    updateShareImage: async (id, filename) => {
        await db.query("UPDATE ronda_shares SET image_filename = ? WHERE id = ?", [filename, id]);
    },

    deletePhoto: async (filename) => {
        // 1. Check ronda_jadwal
        const [schedules] = await db.query("SELECT id, foto_bukti FROM ronda_jadwal WHERE foto_bukti LIKE ?", [`%${filename}%`]);
        for (const s of schedules) {
            try {
                let raw = String(s.foto_bukti);
                let photos = [];
                try {
                    let parsed = JSON.parse(raw);
                    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                    if (Array.isArray(parsed)) photos = parsed;
                    else photos = [raw];
                } catch (e) {
                    if (raw.includes(',')) photos = raw.split(',').map(p => p.trim());
                    else photos = [raw.trim()];
                }
                
                const initialLength = photos.length;
                photos = photos.filter(p => p !== filename);
                if (photos.length !== initialLength) {
                    await db.query("UPDATE ronda_jadwal SET foto_bukti = ? WHERE id = ?", [JSON.stringify(photos), s.id]);
                }
            } catch (e) { console.error('Error deleting photo from ronda_jadwal:', e); }
        }

        // 2. Check ronda_dokumentasi
        const [docs] = await db.query("SELECT id, foto FROM ronda_dokumentasi WHERE foto LIKE ?", [`%${filename}%`]);
        for (const d of docs) {
            try {
                let raw = String(d.foto);
                let photos = [];
                try {
                    let parsed = JSON.parse(raw);
                    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                    if (Array.isArray(parsed)) photos = parsed;
                    else photos = [raw];
                } catch (e) {
                    if (raw.includes(',')) photos = raw.split(',').map(p => p.trim());
                    else photos = [raw.trim()];
                }
                
                const initialLength = photos.length;
                photos = photos.filter(p => p !== filename);
                if (photos.length !== initialLength) {
                    await db.query("UPDATE ronda_dokumentasi SET foto = ? WHERE id = ?", [JSON.stringify(photos), d.id]);
                }
            } catch (e) { console.error('Error deleting photo from ronda_dokumentasi:', e); }
        }
    },
    
    autoProcessLateSchedules: async () => {
        const today = moment().format('YYYY-MM-DD');
        const fiveMinutesAgo = moment().subtract(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
        
        // Find past scheduled items that haven't been touched in the last 5 minutes
        const [rows] = await db.query(`
            SELECT * FROM ronda_jadwal 
            WHERE status = 'scheduled' 
              AND tanggal < ? 
              AND updated_at < ?
        `, [today, fiveMinutesAgo]);
        
        // Fetch libur dates once for efficiency
        let liburSet = new Set();
        try {
            const [liburRows] = await db.query("SELECT tanggal FROM ronda_libur");
            liburSet = new Set(liburRows.map(r => moment(r.tanggal).format('YYYY-MM-DD')));
        } catch (e) {
            // Table doesn't exist yet — no libur dates
        }

        for (const r of rows) {
            // Check move count from keterangan
            let moveCount = 0;
            const matchMove = (r.keterangan || '').match(/Auto Move \((\d+)\)/);
            const matchReschedule = (r.keterangan || '').match(/Auto Reschedule \((\d+)\)/);
            if (matchMove) {
                moveCount = parseInt(matchMove[1]);
            } else if (matchReschedule) {
                moveCount = parseInt(matchReschedule[1]);
            }

            if (moveCount >= 3) {
                // Already moved 3 times -> Denda
                await db.query(`
                    UPDATE ronda_jadwal 
                    SET status = 'alpa', 
                        denda = 50000, 
                        keterangan = CASE 
                            WHEN keterangan LIKE '%[Otomatis Denda - 4x Reschedule]%' THEN keterangan
                            ELSE CONCAT(IFNULL(keterangan, ''), ' [Otomatis Denda - 4x Reschedule]')
                        END
                    WHERE id = ?
                `, [r.id]);
            } else {
                // Find next available (non-libur) Saturday
                let nextDateObj = moment(r.tanggal).add(7, 'days');
                while (liburSet.has(nextDateObj.format('YYYY-MM-DD'))) {
                    nextDateObj.add(7, 'days');
                }
                const nextDate = nextDateObj.format('YYYY-MM-DD');
                
                // 1. Mark current as reschedule
                await db.query("UPDATE ronda_jadwal SET status = 'reschedule', keterangan = ? WHERE id = ?", [`Auto Reschedule (${moveCount + 1})`, r.id]);
                
                // 2. Insert new schedule on next available week (skip libur)
                const [exists] = await db.query("SELECT id FROM ronda_jadwal WHERE warga_id = ? AND tanggal = ?", [r.warga_id, nextDate]);
                if (exists.length === 0) {
                     await db.query("INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status, keterangan) VALUES (?, ?, ?, ?, 'scheduled', ?)", 
                        [nextDate, r.warga_id, r.blok, r.nomor_rumah, `Auto Reschedule (${moveCount + 1})`]);
                }
            }
        }
        
        // --- CLEANUP LOGIC ---
        // If someone is scheduled for the future but they already attended recently (fulfillment),
        // we should remove the redundant scheduled entries.
        try {
            await Ronda.cleanupAllRedundantSchedules();
        } catch (cleanupErr) {
            console.error('[ERROR] Cleanup schedules:', cleanupErr);
        }
    },

    cleanupAllRedundantSchedules: async () => {
        // Find all 'scheduled' entries that have a 'hadir' entry within +/- 10 days
        const [toDelete] = await db.query(`
            SELECT s.id
            FROM ronda_jadwal s
            INNER JOIN ronda_jadwal h ON s.warga_id = h.warga_id
            WHERE s.status = 'scheduled'
              AND h.status = 'hadir'
              AND h.tanggal < s.tanggal
              AND h.tanggal >= DATE_SUB(s.tanggal, INTERVAL 10 DAY)
              AND s.tanggal <= DATE_ADD(h.tanggal, INTERVAL 10 DAY)
        `);

        if (toDelete.length > 0) {
            const ids = toDelete.map(r => r.id);
            await db.query('DELETE FROM ronda_jadwal WHERE id IN (?)', [ids]);
            console.log(`[CLEANUP] Deleted ${ids.length} redundant future schedules (fulfilled).`);
            return ids.length;
        }
        return 0;
    },

    cleanupRedundantSchedulesForUser: async (wargaId, date) => {
        // If user just attended on 'date', update any 'scheduled' entries in the next 14 days
        // to 'hadir' status with a special note, so they don't appear as 'upcoming' but stay in history.
        const [result] = await db.query(`
            UPDATE ronda_jadwal 
            SET status = 'hadir', 
                keterangan = CONCAT(IFNULL(keterangan, ''), ' [Sudah Hadir Lebih Awal pada ', ?, ']')
            WHERE warga_id = ? 
              AND status = 'scheduled' 
              AND tanggal > ? 
              AND tanggal <= DATE_ADD(?, INTERVAL 14 DAY)
        `, [moment(date).format('DD MMM'), wargaId, date, date]);
        
        if (result.affectedRows > 0) {
            console.log(`[CLEANUP] Updated ${result.affectedRows} future schedules to 'hadir' for Warga ${wargaId} after early attendance on ${date}.`);
        }
        return result.affectedRows;
    },

    // Ensure a schedule entry exists (create if not)
    ensureSchedule: async (date, wargaId) => {
        // Check existing
        const [existing] = await db.query(
            "SELECT id FROM ronda_jadwal WHERE tanggal = ? AND warga_id = ?",
            [date, wargaId]
        );
        
        if (existing.length > 0) return existing[0].id;

        // Fetch Warga details
        const [warga] = await db.query("SELECT blok, nomor_rumah FROM warga WHERE id = ?", [wargaId]);
        if (warga.length === 0) throw new Error('Warga not found');

        // Insert
        const [result] = await db.query(
            "INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status) VALUES (?, ?, ?, ?, 'scheduled')",
            [date, wargaId, warga[0].blok, warga[0].nomor_rumah]
        );
        return result.insertId;
    },

    // Skip / Liburkan a week's ronda
    // 1. Add date to ronda_libur
    // 2. DELETE ALL entries for the libur date itself (clean slate for that column)
    // 3. DELETE all SCHEDULED entries after the libur date (force fresh regeneration)
    skipWeek: async (date) => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS ronda_libur (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanggal DATE NOT NULL,
                alasan VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_libur (tanggal)
            )
        `);

        // Mark this date as libur
        await db.query("INSERT IGNORE INTO ronda_libur (tanggal) VALUES (?)", [date]);

        // Delete ONLY non-finalized entries for the libur date itself (scheduled/reschedule)
        // Preserving hadir/alpa/izin records to maintain historical data if any were recorded
        await db.query("DELETE FROM ronda_jadwal WHERE tanggal = ? AND (status = 'scheduled' OR status = 'reschedule')", [date]);

        // Delete all SCHEDULED entries AFTER the libur date
        // (hadir/alpa records are preserved for history)
        await db.query(
            "DELETE FROM ronda_jadwal WHERE tanggal > ? AND status = 'scheduled'",
            [date]
        );
    },

    // Reset / Batalkan libur sebuah minggu
    // 1. Remove date from ronda_libur
    // 2. Delete all SCHEDULED entries >= date (force fresh regeneration with normal rotation)
    resetWeek: async (date) => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS ronda_libur (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanggal DATE NOT NULL,
                alasan VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_libur (tanggal)
            )
        `);

        // Remove from libur list
        await db.query("DELETE FROM ronda_libur WHERE tanggal = ?", [date]);

        // Delete all SCHEDULED entries from this date onward to force regeneration
        await db.query(
            "DELETE FROM ronda_jadwal WHERE tanggal >= ? AND status = 'scheduled'",
            [date]
        );
    }
};


module.exports = Ronda;
