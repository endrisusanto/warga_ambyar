# Aplikasi Manajemen RT/RW Gang Ambyar

Aplikasi Full-Stack Node.js untuk manajemen data warga dan iuran RT/RW.

## Fitur
- **Autentikasi**: Login & Register untuk Admin/Pengurus.
- **Manajemen Warga**: CRUD data warga.
- **Manajemen Iuran**: Generate tagihan bulanan, input pembayaran, upload bukti transfer.
- **Dashboard Keuangan**: Ringkasan saldo kas, pemasukan, dan pengeluaran.
- **Laporan Tunggakan**: Monitoring warga yang belum bayar.

## Teknologi
- Backend: Node.js, Express
- Database: MySQL
- Frontend: EJS, Tailwind CSS
- Containerization: Docker

## Cara Menjalankan (Docker)

1. Pastikan Docker dan Docker Compose sudah terinstall.
2. Buat file `.env` (sudah disediakan contohnya, bisa langsung digunakan).
3. Jalankan perintah:
   ```bash
   docker-compose up --build
   ```
4. Akses aplikasi di browser: `http://localhost:9878`

## Cara Menjalankan (Manual/Local)

1. Pastikan Node.js dan MySQL sudah terinstall.
2. Buat database `rt_rw_db` di MySQL.
3. Import `schema.sql` ke database tersebut.
4. Sesuaikan konfigurasi di `.env`.
5. Install dependencies:
   ```bash
   npm install
   ```
6. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
7. Akses di `http://localhost:9878`

## Akun Default
Silakan register akun baru pada halaman pertama kali dibuka. Akun pertama akan dianggap sebagai admin (sesuai logika aplikasi saat ini).
