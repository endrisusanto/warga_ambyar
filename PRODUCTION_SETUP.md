# Donasi Feature - Production Deployment Guide

## Error: Server Error saat akses /donasi

### Kemungkinan Penyebab:

1. **Database tables belum dibuat**
2. **Upload folders belum ada**
3. **Dependencies belum terinstall**
4. **Environment variables belum di-set**

---

## Solusi Step-by-Step:

### 1. SSH ke Production Server

```bash
ssh user@gang.endrisusanto.my.id
cd /path/to/warga_ambyar
```

### 2. Pull Latest Code

```bash
git pull origin main
```

### 3. Install Dependencies

```bash
npm install
# Pastikan exceljs terinstall
npm install exceljs
```

### 4. Setup Database Tables & Folders

```bash
node setup_donasi.js
```

Script ini akan:
- ✅ Create folder `public/uploads/donasi/bukti`
- ✅ Create folder `public/uploads/donasi/pengeluaran`
- ✅ Create folder `public/uploads/donasi/campaign`
- ✅ Create table `donasi_campaign`
- ✅ Create table `donasi_transaksi`
- ✅ Create table `donasi_pengeluaran`
- ✅ Add column `terkumpul` if not exists

### 5. Check Environment Variables

Pastikan file `.env` di production memiliki:

```env
# QRIS Configuration (sudah ada)
QRIS_MERCHANT_ID=ID1020020020020
QRIS_MERCHANT_NAME=Warga Ambyar

# Session Secret (sudah ada)
SESSION_SECRET=your-secret-key

# Google OAuth (jika pakai)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 6. Set Folder Permissions

```bash
chmod -R 755 public/uploads/donasi
chown -R www-data:www-data public/uploads/donasi
```

### 7. Restart Application

**Jika pakai PM2:**
```bash
pm2 restart warga_ambyar
pm2 logs warga_ambyar --lines 50
```

**Jika pakai Docker:**
```bash
docker-compose restart app
docker logs warga_ambyar-app-1 --tail 50
```

**Jika pakai systemd:**
```bash
sudo systemctl restart warga_ambyar
sudo journalctl -u warga_ambyar -n 50
```

### 8. Check Logs untuk Error

```bash
# PM2
pm2 logs warga_ambyar

# Docker
docker logs -f warga_ambyar-app-1

# Systemd
sudo journalctl -u warga_ambyar -f
```

---

## Verifikasi

Setelah setup, coba akses:

1. **https://gang.endrisusanto.my.id/donasi** - Harus tampil halaman list campaign
2. **https://gang.endrisusanto.my.id/donasi/campaign/create** - Harus bisa create campaign (admin only)

---

## Common Errors & Solutions

### Error: "Table 'donasi_campaign' doesn't exist"

**Solution:**
```bash
node setup_donasi.js
```

### Error: "Cannot find module 'exceljs'"

**Solution:**
```bash
npm install exceljs
pm2 restart warga_ambyar
```

### Error: "ENOENT: no such file or directory, open 'public/uploads/donasi/bukti'"

**Solution:**
```bash
mkdir -p public/uploads/donasi/bukti
mkdir -p public/uploads/donasi/pengeluaran
mkdir -p public/uploads/donasi/campaign
chmod -R 755 public/uploads/donasi
```

### Error: "Cannot read property 'terkumpul' of undefined"

**Solution:**
```bash
# Add terkumpul column manually
mysql -u root -p warga_ambyar
```

```sql
ALTER TABLE donasi_campaign 
ADD COLUMN terkumpul DECIMAL(15, 2) DEFAULT 0 AFTER target_dana;
```

---

## Quick Check Script

Jalankan ini untuk cek status:

```bash
# Check if tables exist
mysql -u root -p warga_ambyar -e "SHOW TABLES LIKE 'donasi%';"

# Check if folders exist
ls -la public/uploads/donasi/

# Check if exceljs installed
npm list exceljs
```

---

## Rollback (Jika Perlu)

Jika ada masalah dan perlu rollback:

```bash
# Rollback code
git reset --hard HEAD~1

# Drop tables (HATI-HATI!)
mysql -u root -p warga_ambyar -e "DROP TABLE IF EXISTS donasi_pengeluaran, donasi_transaksi, donasi_campaign;"

# Restart
pm2 restart warga_ambyar
```

---

## Contact

Jika masih error, kirim:
1. Screenshot error di browser
2. Log dari `pm2 logs` atau `docker logs`
3. Output dari `node setup_donasi.js`
