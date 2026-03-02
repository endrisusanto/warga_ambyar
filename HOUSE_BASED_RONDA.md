# Perubahan Algoritma Ronda: Dari User-Based ke House-Based

## Ringkasan Perubahan

Algoritma penjadwalan ronda telah diubah dari **berbasis user** menjadi **berbasis rumah (blok + nomor_rumah)**. Ini berarti:

### Sebelum:
- Jadwal dibuat untuk setiap user yang terdaftar sebagai wajib ronda
- Jika user berganti (pindah, keluar, dll), jadwal lama menjadi tidak valid
- Setiap user memiliki baris sendiri di jadwal

### Sesudah:
- Jadwal dibuat untuk setiap **rumah** (kombinasi blok + nomor_rumah)
- Sistem otomatis memilih **perwakilan** dari rumah tersebut (prioritas: Kepala Keluarga)
- Jika user berganti, sistem otomatis menampilkan user lain dari rumah yang sama
- Setiap rumah memiliki satu baris di jadwal

## Perubahan Database

### 1. Tabel `ronda_jadwal`

Ditambahkan 2 kolom baru:
```sql
ALTER TABLE ronda_jadwal 
ADD COLUMN blok ENUM('F7', 'F8') DEFAULT NULL AFTER warga_id,
ADD COLUMN nomor_rumah INT DEFAULT NULL AFTER blok;
```

Ditambahkan index untuk performa:
```sql
CREATE INDEX idx_house ON ronda_jadwal(blok, nomor_rumah);
CREATE INDEX idx_tanggal_house ON ronda_jadwal(tanggal, blok, nomor_rumah);
```

Migrasi data existing:
```sql
UPDATE ronda_jadwal rj
INNER JOIN warga w ON rj.warga_id = w.id
SET rj.blok = w.blok, rj.nomor_rumah = w.nomor_rumah
WHERE rj.blok IS NULL OR rj.nomor_rumah IS NULL;
```

## Perubahan Kode

### 1. Model: `models/Ronda.js`

#### `generateSchedule(month, year)`
- **Sebelum**: Query semua user dengan `tim_ronda` tertentu
- **Sesudah**: Query semua rumah (GROUP BY blok, nomor_rumah) dengan perwakilan
- **Logic**: Untuk setiap rumah, pilih 1 perwakilan (prioritas Kepala Keluarga)

```javascript
// Query rumah dengan perwakilan
const [houses] = await db.query(`
    SELECT 
        blok, 
        nomor_rumah,
        (SELECT id FROM warga w2 
         WHERE w2.blok = w1.blok 
         AND w2.nomor_rumah = w1.nomor_rumah 
         AND w2.is_ronda = 1
         ORDER BY 
            CASE WHEN w2.status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END,
            w2.id
         LIMIT 1
        ) as representative_id
    FROM warga w1
    WHERE tim_ronda = ? AND is_ronda = 1
    GROUP BY blok, nomor_rumah
`);

// Insert jadwal untuk RUMAH
INSERT INTO ronda_jadwal 
(tanggal, warga_id, blok, nomor_rumah, status) 
VALUES (?, ?, ?, ?, 'scheduled')
```

#### `updateStatus(id, status, keterangan)`
- **Perubahan**: Saat hadir/alpa, hapus jadwal berdasarkan `blok + nomor_rumah` (bukan `warga_id`)

```javascript
// Hapus jadwal untuk RUMAH ini (bukan user)
DELETE FROM ronda_jadwal 
WHERE blok = ? AND nomor_rumah = ? AND id != ? 
AND tanggal > ? AND tanggal <= ?
```

#### `reschedule(id, keterangan)`
- **Perubahan**: Insert jadwal baru dengan `blok + nomor_rumah`

```javascript
INSERT INTO ronda_jadwal 
(tanggal, warga_id, blok, nomor_rumah, status) 
VALUES (?, ?, ?, ?, 'scheduled')
```

#### `autoProcessLateSchedules()`
- **Perubahan**: Check duplikat berdasarkan `blok + nomor_rumah`

```javascript
SELECT id FROM ronda_jadwal 
WHERE blok = ? AND nomor_rumah = ? AND tanggal = ?
```

### 2. Controller: `controllers/rondaController.js`

#### `control(req, res)`
- **Perubahan Besar**: Matrix dibangun berdasarkan rumah, bukan user

```javascript
// Query rumah dengan perwakilan
const [houses] = await db.query(`...`);

// Build matrix dengan key = "blok-nomor_rumah"
const matrix = {};
houses.forEach(h => {
    const houseKey = `${h.blok}-${h.nomor_rumah}`;
    matrix[houseKey] = {
        info: {
            id: h.representative_id,
            nama: h.representative_nama,
            blok: h.blok,
            nomor_rumah: h.nomor_rumah,
            tim_ronda: h.tim_ronda
        },
        dates: {}
    };
});

// Map schedules ke rumah (bukan user)
schedules.forEach(s => {
    const houseKey = `${s.blok}-${s.nomor_rumah}`;
    if (matrix[houseKey]) {
        matrix[houseKey].dates[d] = s;
    }
});
```

#### `exportControl(req, res)`
- **Perubahan**: Sama seperti `control()`, menggunakan house-based matrix
- **Loop**: `Object.keys(matrix).forEach(houseKey => {...})`

### 3. View: `views/ronda/control_v2.ejs`
- **Tidak ada perubahan**: View tetap sama karena struktur matrix tetap sama
- Matrix key berubah dari `warga_id` menjadi `houseKey`, tapi struktur data sama

## Cara Kerja Sistem Baru

### Skenario 1: User Berganti di Rumah yang Sama

**Situasi**: 
- Rumah F7-10 awalnya dihuni oleh Budi (Kepala Keluarga)
- Budi pindah, diganti oleh Andi (Kepala Keluarga baru)

**Yang Terjadi**:
1. Jadwal tetap ada untuk rumah F7-10
2. Sistem otomatis menampilkan Andi sebagai perwakilan baru
3. Tidak perlu update jadwal manual

### Skenario 2: Reschedule

**Situasi**:
- Rumah F7-10 dijadwalkan ronda tanggal 10 Jan
- Mereka reschedule ke 17 Jan

**Yang Terjadi**:
1. Jadwal 10 Jan diubah status menjadi 'reschedule'
2. Jadwal baru dibuat untuk 17 Jan dengan `blok=F7, nomor_rumah=10`
3. Perwakilan bisa berbeda (misal dari Budi ke Andi), tapi tetap rumah yang sama

### Skenario 3: Hadir/Alpa

**Situasi**:
- Rumah F7-10 hadir pada tanggal 10 Jan

**Yang Terjadi**:
1. Status diubah menjadi 'hadir'
2. Semua jadwal untuk rumah F7-10 dalam 4 minggu ke depan dihapus
3. Kewajiban ronda untuk rumah ini terpenuhi

## Cara Menjalankan Migration

1. Pastikan backup database terlebih dahulu:
```bash
mysqldump -u root -p rt_rw_db > backup_before_migration.sql
```

2. Jalankan migration script:
```bash
mysql -u root -p rt_rw_db < migrations/add_house_to_ronda_jadwal.sql
```

3. Verifikasi kolom baru sudah ada:
```bash
mysql -u root -p rt_rw_db -e "DESCRIBE ronda_jadwal;"
```

4. Regenerate jadwal untuk tahun 2026:
- Akses halaman `/ronda/control?year=2026`
- Sistem akan otomatis regenerate jadwal dengan algoritma baru

## Testing

### Test 1: Lihat Jadwal Control
1. Buka `/ronda/control?year=2026`
2. Pastikan setiap rumah hanya muncul 1 kali (bukan per user)
3. Pastikan nama yang muncul adalah perwakilan rumah

### Test 2: Reschedule
1. Klik status pada jadwal
2. Pilih "Reschedule"
3. Pastikan jadwal baru dibuat untuk rumah yang sama

### Test 3: Hadir/Alpa
1. Tandai status sebagai "Hadir" atau "Alpa"
2. Pastikan jadwal 4 minggu ke depan untuk rumah tersebut terhapus

### Test 4: User Berganti
1. Edit data warga, ubah Kepala Keluarga di rumah tertentu
2. Refresh halaman control
3. Pastikan nama perwakilan berubah otomatis

## Rollback (Jika Diperlukan)

Jika terjadi masalah, rollback dengan:

```sql
-- Restore dari backup
mysql -u root -p rt_rw_db < backup_before_migration.sql

-- Atau hapus kolom baru
ALTER TABLE ronda_jadwal DROP COLUMN blok;
ALTER TABLE ronda_jadwal DROP COLUMN nomor_rumah;
DROP INDEX idx_house ON ronda_jadwal;
DROP INDEX idx_tanggal_house ON ronda_jadwal;
```

Kemudian revert kode ke commit sebelumnya.

## Catatan Penting

1. **Backward Compatibility**: Kolom `warga_id` tetap ada untuk referensi, tapi logic utama menggunakan `blok + nomor_rumah`

2. **Performance**: Index ditambahkan pada `(blok, nomor_rumah)` untuk query cepat

3. **Data Integrity**: Pastikan semua warga yang `is_ronda = 1` memiliki `blok` dan `nomor_rumah` yang valid

4. **Representative Selection**: Sistem prioritaskan Kepala Keluarga, jika tidak ada maka user pertama yang `is_ronda = 1` dari rumah tersebut

## Manfaat

✅ Jadwal tidak perlu diupdate saat user berganti  
✅ Lebih mudah tracking per rumah  
✅ Menghindari duplikasi jadwal untuk rumah yang sama  
✅ Lebih sesuai dengan konsep "ronda per rumah" bukan "ronda per orang"  
✅ Fleksibel: perwakilan bisa siapa saja dari rumah tersebut
