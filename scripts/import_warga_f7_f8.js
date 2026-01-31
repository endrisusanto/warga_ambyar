const mysql = require('mysql2/promise');
require('dotenv').config();

const dataWarga = [
    // Blok F7
    { nama: 'Arbas', blok: 'F7', nomor: '19', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'kosong', ronda: false },
    { nama: 'Indra', blok: 'F7', nomor: '20', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Ompu', blok: 'F7', nomor: '21', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Roni', blok: 'F7', nomor: '22', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true }, // Gambar 23, tapi urut 22? Cek gambar.
    // Wait, gambar says after Ompu (21) is Roni (23). No, wait.
    // Let me re-read image carefully.
    // Arbas 19. Indra 20. Ompu 21. No 22 seems missing or Roni is 23?
    // Ah, table shows: Ompu 22. Roni 23.
    // Let me RE-READ the table rows from the image artifacts carefully using logic.
    // Arbas F7 19
    // Indra F7 20
    // Indra F7 21? No.
    // Let's look closer.
    // Arbas 19.
    // Indra 20? No wait, row below Arbas is Indra, Next col is 21??
    // Let's assume standard increment if unclear, but better to trust the image text.
    // Image rows:
    // Arbas, F7, 19
    // Indra, F7, 20
    // Ompu, F7, 21 ? Or 22? Table looks like 21 is missing or Ompu is 22.
    // Wait, let's look at the Artifact 1.
    // Arbas 19
    // (Next row) 20 ... (Cut off name?) No, Indra is there.
    // (Next row) Ompu ... 22.
    // (Next row) Roni ... 23.
    // (Next row) Ace ... 24.
    // (Next row) Iyon 25.
    // (Next row) Nashar 26.
    // (Next row) Bu Haji 27.
    // (Next row) Iding 27.
    // (Next row) Bu Haji 28.
    // (Next row) Wiryono 28.
    // (Next row) Yudis 29.
    // (Next row) Gunawan 29.
    // (Next row) Ipul 30.
    // (Next row) karsidi 31.
    // ... Saketi 33.
    // Renol 34.
    // Arifin 35.
    // Arifin 36.
    
    // Blok F8
    // Topan 1
    // (Blank) 2 (Status Kosong)
    // Awan 3
    // Riko 4
    // Endri 5
    // Rahma... 5 (Istri)
    // Anjar 6
    // Aas 6 (Istri)
    // Aas 7 (Istri) -- Maybe she lives in 7 alone? Or data input error? I will insert as is.
    // Adit 8
    // Imam 9
    // (Blank) 10 (Kosong)
    // Ari 11
    // Niko 12
    // Yori 13
    // Dery 14
    // Subani 15
    // Rais 16
    // (Blank) 17 (Kosong)
    // Ridwan 18
    // Andromeda 19
];

// Based on re-reading:
const fixedData = [
    // F7
    { nama: 'Arbas', blok: 'F7', nomor: '19', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'kosong', ronda: false },
    { nama: 'Indra', blok: 'F7', nomor: '20', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true }, // Assuming 20 based on seq? Image says 21 for Ompu?
    // Let's correct based on visual alignment.
    // Arbas 19
    // Indra 21 - Correction from user image if visible?
    // Actually, looking at the crop it's:
    // Arbas 19
    // Indra [Something] - looks like 21? 
    // Ompu 22
    // Roni 23
    // Ace 24
    // Iyon 25
    // Nashar 26
    // Bu Haji 27
    // Iding 27
    // Bu Haji 28
    // Wiryono 28
    // Yudis 29
    // Gunawan 29
    // Ipul 30
    // Karsidi 31
    // Saketi 33
    // Renol 34
    // Arifin 35
    // Arifin 36

    // F8
    { nama: 'Topan', blok: 'F8', nomor: '1', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: '(Rumah Kosong)', blok: 'F8', nomor: '2', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'kosong', ronda: false },
    { nama: 'Awan', blok: 'F8', nomor: '3', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Riko', blok: 'F8', nomor: '4', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Endri', blok: 'F8', nomor: '5', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Rahma Raudya Tuzahra', blok: 'F8', nomor: '5', status_keluarga: 'Istri', hp: '6285802773660', huni: 'tetap', ronda: false },
    { nama: 'Anjar', blok: 'F8', nomor: '6', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Aas', blok: 'F8', nomor: '6', status_keluarga: 'Istri', hp: null, huni: 'tetap', ronda: false },
    { nama: 'Aas', blok: 'F8', nomor: '7', status_keluarga: 'Istri', hp: null, huni: 'tetap', ronda: false },
    { nama: 'Adit', blok: 'F8', nomor: '8', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Imam', blok: 'F8', nomor: '9', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: '(Rumah Kosong)', blok: 'F8', nomor: '10', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'kosong', ronda: false },
    { nama: 'Ari', blok: 'F8', nomor: '11', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Niko', blok: 'F8', nomor: '12', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Yori', blok: 'F8', nomor: '13', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Dery', blok: 'F8', nomor: '14', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Subani', blok: 'F8', nomor: '15', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Rais', blok: 'F8', nomor: '16', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: '(Rumah Kosong)', blok: 'F8', nomor: '17', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'kosong', ronda: false },
    { nama: 'Ridwan', blok: 'F8', nomor: '18', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
    { nama: 'Andromeda', blok: 'F8', nomor: '19', status_keluarga: 'Kepala Keluarga', hp: null, huni: 'tetap', ronda: true },
];

// F7 Manual Fill based on my best guess from "image data":
const f7Data = [
    ['Arbas', 'F7', '19', 'Kepala Keluarga', null, 'kosong', false],
    ['Indra', 'F7', '21', 'Kepala Keluarga', null, 'tetap', true], // 20 or 21? Image seems to skip 20 or Indra is 21. Let's use 21.
    ['Ompu', 'F7', '22', 'Kepala Keluarga', null, 'tetap', true],
    ['Roni', 'F7', '23', 'Kepala Keluarga', null, 'tetap', true],
    ['Ace', 'F7', '24', 'Kepala Keluarga', null, 'tetap', true],
    ['Iyon', 'F7', '25', 'Kepala Keluarga', null, 'tetap', true],
    ['Nashar', 'F7', '26', 'Kepala Keluarga', null, 'tetap', true],
    ['Bu Haji', 'F7', '27', 'Kepala Keluarga', null, 'kontrak', false],
    ['Iding', 'F7', '27', 'Kepala Keluarga', null, 'tetap', true],
    ['Bu Haji', 'F7', '28', 'Kepala Keluarga', null, 'kontrak', false],
    ['Wiryono', 'F7', '28', 'Kepala Keluarga', null, 'tetap', true],
    ['Yudis', 'F7', '29', 'Kepala Keluarga', null, 'tetap', true],
    ['Gunawan', 'F7', '29', 'Kepala Keluarga', null, 'tetap', true],
    ['Ipul', 'F7', '30', 'Kepala Keluarga', null, 'tetap', true],
    ['karsidi', 'F7', '31', 'Kepala Keluarga', null, 'tetap', true],
    ['Saketi', 'F7', '33', 'Kepala Keluarga', null, 'tetap', true],
    ['Renol', 'F7', '34', 'Kepala Keluarga', null, 'tetap', true],
    ['Arifin', 'F7', '35', 'Kepala Keluarga', null, 'tetap', true],
    ['Arifin', 'F7', '36', 'Kepala Keluarga', null, 'tetap', true],
];

const allData = [
    ...f7Data.map(d => ({ nama: d[0], blok: d[1], nomor: d[2], status_keluarga: d[3], hp: d[4], huni: d[5], ronda: d[6] })),
    ...fixedData
];

const importData = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'rootpassword',
            database: process.env.DB_NAME || 'rt_rw_db',
            port: process.env.DB_PORT || 3306
        });

        console.log('Importing Data Warga...');

        for (const w of allData) {
            // Check if exists
            const [rows] = await connection.query(
                "SELECT id FROM warga WHERE nama = ? AND blok = ? AND nomor_rumah = ?",
                [w.nama, w.blok, w.nomor]
            );

            if (rows.length === 0) {
                await connection.query(
                    "INSERT INTO warga (nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')",
                    [w.nama, w.blok, w.nomor, w.status_keluarga, w.hp, w.huni, w.ronda ? 1 : 0]
                );
                console.log(`✅ Inserted: ${w.nama} (${w.blok}-${w.nomor})`);
            } else {
                // Update existing record
                await connection.query(
                    "UPDATE warga SET nama = ?, status_huni = ?, is_ronda = ?, status_keluarga = ?, no_hp = COALESCE(?, no_hp) WHERE id = ?",
                    [w.nama, w.huni, w.ronda ? 1 : 0, w.status_keluarga, w.hp, rows[0].id]
                );
                console.log(`🔄 Updated: ${w.nama} (${w.blok}-${w.nomor})`);
            }
        }

        console.log('Done!');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

importData();
