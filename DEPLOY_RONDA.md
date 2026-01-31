# Deployment Guide: Ronda & Fine Payment Updates

Berikut adalah panduan untuk mengupdate fitur pembayaran denda ronda dan share WA di production server.

## 1. Persiapan Local
Pastikan semua perubahan sudah di-commit dan di-push ke repository.

```bash
git add .
git commit -m "feat: ronda payment and status updates"
git push origin main
```

## 2. Update Server

Masuk ke server via SSH:
```bash
ssh user@gang.endrisusanto.my.id
cd /path/to/warga_ambyar
```

### Pull Changes
Ambil kode terbaru dari git:
```bash
git pull origin main
```

### Install Dependencies (jika ada yang baru)
Tidak ada dependency baru yang signifikan, tapi sebaiknya dijalankan untuk memastikan:
```bash
npm install
```

### Run Database Migration
Jalankan script migrasi untuk menambahkan kolom `status_bayar` dan `bukti_bayar` ke tabel `ronda_jadwal`.

**PENTING:** Pastikan file `.env` sudah benar sebelum menjalankan ini.

```bash
node scripts/migrate_ronda_status.js
```

Jika sukses, outputnya akan seperti:
```
Migrating Ronda Tables...
✅ Added status_bayar column
✅ Added bukti_bayar column
```

### Restart Application
Restart aplikasi agar perubahan kode (Controller & Views) diterapkan.

**Jika menggunakan PM2:**
```bash
pm2 restart warga_ambyar
```

**Jika menggunakan Docker:**
```bash
docker-compose restart app
```

## 3. Verifikasi
Buka website dan cek:
1. Halaman **Control Ronda**: Pastikan badge denda bisa diklik dan muncul modal pembayaran.
2. Halaman **Public View**: Cek fitur Share WA, pastikan status kehadiran muncul sebagai ikon (✅, 💸, ❌, dll).
3. Coba lakukan pembayaran denda (simulasi) dan pastikan status berubah menjadi LUNAS.

## Troubleshooting

### Migration Gagal (Connection Error)
Jika script migrasi gagal connect ke database:
1. Cek `DB_HOST` di file `.env`. 
   - Jika pakai Docker, mungkin perlu set `DB_HOST=db` atau `DB_HOST=localhost` tergantung dari mana script dijalankan.
   - Jika script dijalankan dari *luar* container docker tapi DB ada di dalam docker port mapped, gunakan `localhost`.
   - Jika script dijalankan dari *dalam* container, gunakan `db` (service name).

Cara run dari dalam container (jika perlu):
```bash
docker-compose exec app node scripts/migrate_ronda_status.js
```

### Tampilan Tidak Berubah
Jika tampilan web belum berubah setelah restart:
- Clear browser cache.
- Pastikan tidak ada error di logs: `pm2 logs warga_ambyar` atau `docker logs warga_ambyar-app-1`.
