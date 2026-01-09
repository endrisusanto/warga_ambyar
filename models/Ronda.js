const db = require('../config/db');
const moment = require('moment');

const Ronda = {
    // Generate schedule for a specific month (only Saturdays)
    generateSchedule: async (month, year) => {
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

        // Get the last scheduled team to determine rotation
        let nextTeamIndex = 0; // 0=A, 1=B, 2=C, 3=D
        const teams = ['A', 'B', 'C', 'D'];

        const [lastSchedule] = await db.query(`
            SELECT w.tim_ronda 
            FROM ronda_jadwal r 
            JOIN warga w ON r.warga_id = w.id 
            WHERE w.tim_ronda IS NOT NULL 
            ORDER BY r.tanggal DESC LIMIT 1
        `);

        if (lastSchedule.length > 0) {
            const lastTeam = lastSchedule[0].tim_ronda;
            const lastIdx = teams.indexOf(lastTeam);
            if (lastIdx !== -1) {
                nextTeamIndex = (lastIdx + 1) % 4;
            }
        }

        for (const date of saturdays) {
            // Check if schedule already exists for this date
            const [existing] = await db.query("SELECT id FROM ronda_jadwal WHERE tanggal = ?", [date]);
            if (existing.length > 0) {
                // Schedule exists, but we still need to increment team index for next week
                nextTeamIndex = (nextTeamIndex + 1) % 4;
                continue;
            }

            const currentTeam = teams[nextTeamIndex];

            // Get members of this team
            const [members] = await db.query("SELECT id FROM warga WHERE tim_ronda = ? AND is_ronda = 1", [currentTeam]);

            for (const member of members) {
                try {
                    await db.query(
                        "INSERT INTO ronda_jadwal (tanggal, warga_id) VALUES (?, ?)",
                        [date, member.id]
                    );
                } catch (e) {
                    // Ignore duplicates
                }
            }

            nextTeamIndex = (nextTeamIndex + 1) % 4;
        }
    },

    getMonthlySchedule: async (month, year) => {
        const startDate = `${year}-${month}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

        const [rows] = await db.query(`
            SELECT r.*, w.nama, w.blok, w.nomor_rumah, w.no_hp, w.tim_ronda
            FROM ronda_jadwal r
            JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal BETWEEN ? AND ?
            ORDER BY r.tanggal ASC, w.blok, w.nomor_rumah
        `, [startDate, endDate]);

        return rows;
    },

    getTodaySchedule: async () => {
        const today = moment().format('YYYY-MM-DD');
        const [rows] = await db.query(`
            SELECT r.*, w.nama, w.blok, w.nomor_rumah, w.tim_ronda
            FROM ronda_jadwal r
            JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal = ?
        `, [today]);
        return rows;
    },

    getNextSchedule: async () => {
        const today = moment().format('YYYY-MM-DD');
        const [rows] = await db.query(`
            SELECT r.*, w.nama, w.blok, w.nomor_rumah, w.tim_ronda
            FROM ronda_jadwal r
            JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal > ?
            ORDER BY r.tanggal ASC
            LIMIT 1
        `, [today]);

        if (rows.length === 0) return [];

        const nextDate = rows[0].tanggal;
        const [schedule] = await db.query(`
            SELECT r.*, w.nama, w.blok, w.nomor_rumah, w.tim_ronda
            FROM ronda_jadwal r
            JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal = ?
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
    },

    reschedule: async (id, keterangan) => {
        const [rows] = await db.query("SELECT * FROM ronda_jadwal WHERE id = ?", [id]);
        if (rows.length === 0) return;
        const current = rows[0];

        // Move to next week (7 days later)
        const nextWeek = moment(current.tanggal).add(7, 'days').format('YYYY-MM-DD');

        await db.query("UPDATE ronda_jadwal SET status = 'reschedule', keterangan = ? WHERE id = ?", [keterangan || 'Diganti ke minggu depan', id]);

        try {
            await db.query(
                "INSERT INTO ronda_jadwal (tanggal, warga_id, status) VALUES (?, ?, 'scheduled')",
                [nextWeek, current.warga_id]
            );
        } catch (e) {
            // Ignore
        }
    },

    payFine: async (id) => {
        await db.query("UPDATE ronda_jadwal SET denda = 0, status = 'hadir', keterangan = CONCAT(IFNULL(keterangan, ''), ' [Denda Lunas]') WHERE id = ?", [id]);
    },

    getTeams: async () => {
        const [rows] = await db.query("SELECT id, nama, blok, nomor_rumah, tim_ronda FROM warga WHERE is_ronda = 1 ORDER BY tim_ronda, blok, nomor_rumah");
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
    }
};

module.exports = Ronda;
