# Fitur Metode Pembayaran - Dokumentasi

## Ringkasan Perubahan

Fitur ini menambahkan kemampuan untuk mencatat metode pembayaran yang digunakan warga saat membayar iuran. Tersedia 3 pilihan:
- **DANA** (E-Wallet)
- **QRIS** (Pembayaran QR)
- **Tunai** (Uang Cash)

## File yang Dimodifikasi

### 1. Database
- **File**: `schema.sql` & `migrations/add_metode_pembayaran.sql`
- **Perubahan**: Menambah kolom `metode_pembayaran` pada tabel `iuran`

### 2. Form Pembayaran
- **File**: `views/iuran/pay.ejs`
- **Perubahan**: Menambah radio button untuk memilih metode pembayaran
- **Lokasi**: Setelah upload bukti transfer, sebelum Total Bayar

### 3. Controller
- **File**: `controllers/iuranController.js`
- **Perubahan**: Menyimpan metode pembayaran ke database saat submit pembayaran

### 4. Modal Detail Pembayaran
- **File**: `views/iuran/index.ejs`
- **Perubahan**: 
  - Menampilkan badge metode pembayaran dengan warna sesuai:
    - DANA: Biru (#118EE9)
    - QRIS: Hijau (emerald)
    - Tunai: Kuning (amber)
  - Badge muncul di bawah status badge

### 5. Public View
- **File**: `views/iuran/public_view.ejs`
- **Perubahan**: Menampilkan metode pembayaran di halaman publik (`/iuran/v/:id`)

### 6. Share WhatsApp
- **Fitur**: Metode pembayaran otomatis ter-capture dalam snapshot yang di-share via WhatsApp

## Cara Instalasi

### 1. Jalankan Migration Database

```bash
# Masuk ke direktori project
cd /home/endrisusanto/dev/warga_ambyar

# Jalankan migration
mysql -u root -p warga_ambyar < migrations/add_metode_pembayaran.sql
```

**Atau manual via MySQL:**

```sql
USE warga_ambyar;

ALTER TABLE iuran 
ADD COLUMN metode_pembayaran ENUM('DANA', 'QRIS', 'Tunai') DEFAULT NULL 
AFTER bukti_bayar;
```

### 2. Restart Aplikasi

```bash
# Jika menggunakan PM2
pm2 restart warga-ambyar

# Atau restart manual
# Ctrl+C untuk stop, lalu jalankan lagi:
npm start
```

## Cara Penggunaan

### Untuk Warga (Saat Membayar):

1. Buka halaman **Bayar Iuran** (`/iuran/pay`)
2. Pilih bulan dan jenis iuran
3. Upload bukti transfer
4. **PILIH METODE PEMBAYARAN** (DANA/QRIS/Tunai) - **WAJIB**
5. Submit pembayaran

### Untuk Admin/Bendahara:

1. Buka halaman **Iuran** (`/iuran`)
2. Klik detail pembayaran
3. Metode pembayaran akan muncul sebagai badge berwarna di bawah status
4. Saat share via WhatsApp, metode pembayaran otomatis ter-capture dalam gambar

## Validasi

- Metode pembayaran adalah **field wajib** (required)
- User harus memilih salah satu dari 3 opsi sebelum bisa submit
- Jika tidak dipilih, form tidak akan ter-submit

## Catatan Penting

- Data pembayaran lama (sebelum fitur ini) akan memiliki `metode_pembayaran = NULL`
- Ini normal dan tidak akan error
- Badge metode pembayaran hanya muncul jika ada nilainya

## Testing

Setelah instalasi, test dengan:

1. ✅ Buat pembayaran baru dengan pilih metode DANA
2. ✅ Lihat detail pembayaran - badge DANA muncul (biru)
3. ✅ Share via WhatsApp - metode pembayaran ter-capture
4. ✅ Buka public link - metode pembayaran tampil
5. ✅ Test dengan QRIS dan Tunai juga

## Troubleshooting

### Error: "Unknown column 'metode_pembayaran'"
**Solusi**: Migration belum dijalankan. Jalankan SQL migration di atas.

### Radio button tidak muncul
**Solusi**: Clear cache browser (Ctrl+Shift+R) atau hard refresh

### Badge tidak berwarna
**Solusi**: Pastikan Tailwind CSS arbitrary values (`bg-[#118EE9]`) didukung di config

---

**Dibuat**: 2026-02-05  
**Versi**: 1.0.0
