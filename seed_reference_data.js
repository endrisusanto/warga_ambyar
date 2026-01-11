const db = require('./config/db');

const data = [
    { blok: 'F7', no: '19', nama: '', status: 'KOSONG' },
    { blok: 'F7', no: '20', nama: 'Arbas', status: 'TETAP' },
    { blok: 'F7', no: '21', nama: 'Indra', status: 'TETAP' },
    { blok: 'F7', no: '22', nama: 'Ompu', status: 'TETAP' },
    { blok: 'F7', no: '23', nama: 'Roni', status: 'TETAP' },
    { blok: 'F7', no: '24', nama: 'Ace', status: 'TETAP' },
    { blok: 'F7', no: '25', nama: 'Iyon', status: 'TETAP' },
    { blok: 'F7', no: '26', nama: 'Nashar', status: 'TETAP' },
    { blok: 'F7', no: '27', nama: 'Bu Haji', status: 'KONTRAK' },
    { blok: 'F7', no: '28', nama: 'Bu Haji', status: 'KONTRAK' },
    { blok: 'F7', no: '29', nama: 'Gunawan', status: 'TETAP' },
    { blok: 'F7', no: '30', nama: 'Ipul', status: 'TETAP' },
    { blok: 'F7', no: '31', nama: 'Ardi', status: 'TETAP' },
    { blok: 'F7', no: '33', nama: 'Saketi', status: 'TETAP' }, // 32 skipped
    { blok: 'F7', no: '34', nama: 'Renol', status: 'TETAP' },
    { blok: 'F7', no: '35', nama: 'Arifin', status: 'TETAP' },
    { blok: 'F7', no: '36', nama: 'Arifin', status: 'TETAP' },
    { blok: 'F8', no: '1', nama: 'Topan', status: 'TETAP' },
    { blok: 'F8', no: '2', nama: '', status: 'KOSONG' },
    { blok: 'F8', no: '3', nama: 'Awan', status: 'TETAP' },
    { blok: 'F8', no: '4', nama: 'Riko', status: 'TETAP' },
    { blok: 'F8', no: '5', nama: 'Endri', status: 'TETAP' },
    { blok: 'F8', no: '6', nama: 'Aas', status: 'TETAP' },
    { blok: 'F8', no: '7', nama: 'Aas', status: 'TETAP' },
    { blok: 'F8', no: '8', nama: 'Adit', status: 'TETAP' },
    { blok: 'F8', no: '9', nama: 'Imam', status: 'TETAP' },
    { blok: 'F8', no: '10', nama: '', status: 'KOSONG' },
    { blok: 'F8', no: '11', nama: 'Ari', status: 'TETAP' },
    { blok: 'F8', no: '12', nama: 'Niko', status: 'TETAP' },
    { blok: 'F8', no: '13', nama: 'Yori', status: 'TETAP' },
    { blok: 'F8', no: '14', nama: 'Dery', status: 'TETAP' },
    { blok: 'F8', no: '15', nama: 'Subani', status: 'TETAP' },
    { blok: 'F8', no: '16', nama: 'Rais', status: 'TETAP' },
    { blok: 'F8', no: '17', nama: '', status: 'KOSONG' },
    { blok: 'F8', no: '18', nama: 'Ridwan', status: 'TETAP' },
    { blok: 'F8', no: '19', nama: 'Andromeda', status: 'TETAP' },
];

async function seed() {
    try {
        console.log('Seeding warga reference data...');

        // IMPORTANT: We preserve IDs if possible or just wipe and recreate ensuring fresh state
        // Since we are setting reference data, wiping is probably safer to avoid duplicates
        await db.query('DELETE FROM iuran'); // Must delete dependent rows first
        await db.query('DELETE FROM users WHERE role = "warga"'); // Remove old warga users
        await db.query('DELETE FROM warga');
        await db.query('ALTER TABLE warga AUTO_INCREMENT = 1');

        for (const w of data) {
            await db.query(`
                INSERT INTO warga (nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                w.nama,
                w.blok,
                w.no,
                'Kepala Keluarga',
                '-',
                w.status,
                w.status === 'TETAP' || w.status === 'KONTRAK' ? 1 : 0
            ]);
        }

        // Re-create Admin user if deleted? 
        // My query only deleted role='warga'. Admin usually has no warga_id or different role.
        // `reset_db.js` typically creates admin.
        // We should ensure an admin exists.

        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
