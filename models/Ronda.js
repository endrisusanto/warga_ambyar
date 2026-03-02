const db = require('../config/db');
const moment = require('moment');

const Ronda = {
    // Generate schedule for a specific month (only Saturdays)
    // HOUSE-BASED SCHEDULING: Schedules are created per house (blok + nomor_rumah), not per user
    generateSchedule: async (month, year) => {
        // Don't generate schedules for years before 2026
        if (parseInt(year) < 2026) {
            return;
        }
        
        // Determine Saturdays in the month
        const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
        const endDate = startDate.clone().endOf('month');
        const saturdays = [];

        let day = startDate.clone();
        while (day <= endDate) {
            if (day.day() === 6) { // 6 = Saturday
                saturdays.push(day.format('YYYY-MM-DD'));
            }
            day.add(1, 'days');
        }

        const teamsList = ['A', 'B', 'C', 'D'];
        // Epoch: Jan 10 2026 is Tim C (Index 2)
        // Rotation: A -> B -> C -> D
        const epochDate = moment('2026-01-10');
        const epochIndex = 2; // C

        for (const dateStr of saturdays) {
            const dateObj = moment(dateStr);
            const diffDays = dateObj.diff(epochDate, 'days');
            const diffWeeks = Math.floor(diffDays / 7);

            let teamIndex = (epochIndex + diffWeeks) % 4;
            if (teamIndex < 0) teamIndex += 4;
            const currentTeam = teamsList[teamIndex];

            // Get HOUSES (unique blok + nomor_rumah combinations) for this team
            // We select one representative from each house (preferably Kepala Keluarga)
            const [wargas] = await db.query(`
                SELECT 
                    id as representative_id,
                    blok, 
                    nomor_rumah
                FROM warga
                WHERE tim_ronda = ? AND is_ronda = 1
                ORDER BY blok ASC, CAST(nomor_rumah AS UNSIGNED) ASC, id ASC
            `, [currentTeam]);

            for (const house of wargas) {
                if (!house.representative_id) continue;
                
                // Check if this USER is already scheduled for this date
                const [existing] = await db.query(
                    "SELECT id FROM ronda_jadwal WHERE tanggal = ? AND warga_id = ?",
                    [dateStr, house.representative_id]
                );

                if (existing.length === 0) {
                    try {
                        // Insert schedule for the USER
                        await db.query(
                            `INSERT INTO ronda_jadwal 
                            (tanggal, warga_id, blok, nomor_rumah, status) 
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
        let query = "UPDATE ronda_jadwal SET status = ?";
        const params = [status];

        if (keterangan) {
            query += ", keterangan = ?";
            params.push(keterangan);
        }

        if (status === 'alpa') {
            query += ", denda = 50000";
        } else {
            query += ", denda = 0";
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
                
                await db.query(
                    "DELETE FROM ronda_jadwal WHERE warga_id = ? AND id != ? AND tanggal > ? AND tanggal <= ? AND (status IN ('scheduled', 'reschedule') OR (status = 'alpa' AND (status_bayar IS NULL OR status_bayar = '')))",
                    [wargaId, id, currentDate, fourWeeksLater]
                );
            }
        }
    },

    reschedule: async (id, keterangan) => {
        const [rows] = await db.query("SELECT * FROM ronda_jadwal WHERE id = ?", [id]);
        if (rows.length === 0) return;
        const current = rows[0];

        // Move to next week (7 days later)
        const nextWeek = moment(current.tanggal).add(7, 'days').format('YYYY-MM-DD');

        await db.query("UPDATE ronda_jadwal SET status = 'reschedule', keterangan = ? WHERE id = ?", [keterangan || 'Diganti ke minggu depan', id]);

        try {
            // USER-BASED: Insert new schedule for the USER
            await db.query(
                "INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status) VALUES (?, ?, ?, ?, 'scheduled')",
                [nextWeek, current.warga_id, current.blok, current.nomor_rumah]
            );
        } catch (e) {
            // Ignore
        }
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
        // Try to delete from ronda_jadwal
        // Since photos are stored as JSON array, we need to find rows containing the filename
        // This is tricky with JSON in MySQL 5.7/8.0 without JSON functions, but let's assume simple string search or fetch all
        // A better approach is to fetch all rows that might contain it, update them.

        // 1. Check ronda_jadwal
        const [schedules] = await db.query("SELECT id, foto_bukti FROM ronda_jadwal WHERE foto_bukti LIKE ?", [`%${filename}%`]);
        for (const s of schedules) {
            try {
                let photos = JSON.parse(s.foto_bukti);
                const initialLength = photos.length;
                photos = photos.filter(p => p !== filename);
                if (photos.length !== initialLength) {
                    await db.query("UPDATE ronda_jadwal SET foto_bukti = ? WHERE id = ?", [JSON.stringify(photos), s.id]);
                }
            } catch (e) { }
        }

        // 2. Check ronda_dokumentasi
        const [docs] = await db.query("SELECT id, foto FROM ronda_dokumentasi WHERE foto LIKE ?", [`%${filename}%`]);
        for (const d of docs) {
            try {
                let photos = JSON.parse(d.foto);
                const initialLength = photos.length;
                photos = photos.filter(p => p !== filename);
                if (photos.length !== initialLength) {
                    // If empty, maybe delete the row? Or just update. Let's update.
                    await db.query("UPDATE ronda_dokumentasi SET foto = ? WHERE id = ?", [JSON.stringify(photos), d.id]);
                }
            } catch (e) { }
        }
    },
    
    autoProcessLateSchedules: async () => {
        const today = moment().format('YYYY-MM-DD');
        
        // Find past scheduled items
        const [rows] = await db.query("SELECT * FROM ronda_jadwal WHERE status = 'scheduled' AND tanggal < ?", [today]);
        
        for (const r of rows) {
            // Cek apakah warga sudah hadir dalam 4 minggu sebelum tanggal jadwal ini
            // REVISI FINAL: Hapus pengecekan 4 minggu sebelumnya.
            // Asumsinya: Jadwal yang ada di database adalah valid.
            // Jika jadwal tgl 31 Jan masih 'scheduled' padahal sekarang 5 Feb, 
            // berarti dia mangkir dari siklus barunya (meskipun tgl 3 Jan dia hadir).
            // Jadi, SEMUA jadwal masa lalu yang masih 'scheduled' WAJIB di-reschedule.
            
            // Lanjut proses reschedule...

            // Check move count from keterangan
            // Pattern bisa berupa "Auto Move (N)" atau "Auto Reschedule (N)"
            let moveCount = 0;
            const matchMove = (r.keterangan || '').match(/Auto Move \((\d+)\)/);
            const matchReschedule = (r.keterangan || '').match(/Auto Reschedule \((\d+)\)/);
            if (matchMove) {
                moveCount = parseInt(matchMove[1]);
            } else if (matchReschedule) {
                moveCount = parseInt(matchReschedule[1]);
            }

            if (moveCount >= 3) {
                // Already moved 3 times, this is the 4th miss -> Denda
                await db.query("UPDATE ronda_jadwal SET status = 'alpa', denda = 50000, keterangan = CONCAT(IFNULL(keterangan, ''), ' [Otomatis Denda - 4x Reschedule]') WHERE id = ?", [r.id]);
            } else {
                // Move to next week
                const nextDate = moment(r.tanggal).add(7, 'days').format('YYYY-MM-DD');
                
                // 1. Mark current as reschedule
                await db.query("UPDATE ronda_jadwal SET status = 'reschedule', keterangan = ? WHERE id = ?", [`Auto Reschedule (${moveCount + 1})`, r.id]);
                
                // 2. Insert new schedule (check duplicate first)
                // USER-BASED: Check by warga_id
                const [exists] = await db.query("SELECT id FROM ronda_jadwal WHERE warga_id = ? AND tanggal = ?", [r.warga_id, nextDate]);
                if (exists.length === 0) {
                     await db.query("INSERT INTO ronda_jadwal (tanggal, warga_id, blok, nomor_rumah, status, keterangan) VALUES (?, ?, ?, ?, 'scheduled', ?)", 
                        [nextDate, r.warga_id, r.blok, r.nomor_rumah, `Auto Reschedule (${moveCount + 1})`]);
                }
            }
        }
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
    }
};

module.exports = Ronda;
