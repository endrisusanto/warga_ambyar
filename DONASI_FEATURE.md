# Fitur Donasi & Penggalangan Dana

## Overview
Fitur donasi memungkinkan warga untuk membuat campaign penggalangan dana dan menerima donasi dengan sistem verifikasi. Laporan keuangan donasi terpisah dari kas utama RT/RW.

## Fitur Utama

### 1. Campaign Management (Admin/Ketua/Bendahara)
- Buat campaign donasi dengan target dana (opsional)
- Upload foto campaign
- Set tanggal mulai dan selesai
- Kelola status campaign (aktif/selesai/ditutup)

### 2. Donasi dengan Opsi Anonim
- User dapat berdonasi dengan QRIS atau Transfer
- **Opsi Anonim**: Nama donatur ditampilkan sebagai "Hamba Allah" untuk publik
- Admin/Ketua/Bendahara dapat melihat identitas asli dengan toggle "View Real"
- Upload bukti pembayaran wajib
- Tambahkan pesan/doa (opsional)

### 3. Verifikasi Donasi
- Admin/Ketua/Bendahara memverifikasi donasi yang masuk
- Lihat bukti pembayaran
- Approve atau reject donasi

### 4. Laporan Keuangan Terpisah
- Laporan keuangan donasi terpisah dari kas RT/RW
- Filter berdasarkan campaign
- Total donasi terverifikasi
- Export data (future enhancement)

## Database Schema

### Table: donasi_campaign
- id, judul, deskripsi, target_dana
- foto, tanggal_mulai, tanggal_selesai
- status (aktif/selesai/ditutup)
- created_by, timestamps

### Table: donasi_transaksi
- id, campaign_id, user_id
- nama_donatur, **is_anonim** (boolean)
- jumlah, metode_bayar (qris/transfer)
- bukti_bayar, pesan
- status (pending/verified/rejected)
- verified_by, verified_at, created_at

## Routes
- `/donasi` - Daftar campaign
- `/donasi/campaign/:id` - Detail campaign + daftar donatur
- `/donasi/campaign/:id/donate` - Form donasi
- `/donasi/campaign/create` - Buat campaign (admin)
- `/donasi/verify` - Verifikasi donasi (admin)
- `/donasi/laporan` - Laporan keuangan (admin)

## Anonymity Feature
Ketika user mencentang "Donasi sebagai Anonim":
- `is_anonim` = true di database
- Nama asli tetap tersimpan di `nama_donatur`
- Publik melihat "Hamba Allah"
- Admin/Ketua/Bendahara dapat toggle "View Real" untuk melihat nama asli

## Payment Methods
1. **QRIS** - Menggunakan QRIS yang sama dengan sistem iuran
2. **Transfer** - Transfer ke rekening Dana Karsidi

## Access Control
- **Semua User**: Lihat campaign, donasi, lihat daftar donatur (anonim)
- **Admin/Ketua/Bendahara**: 
  - Buat/edit/hapus campaign
  - Verifikasi donasi
  - Lihat laporan keuangan
  - Toggle view identitas asli donatur anonim
