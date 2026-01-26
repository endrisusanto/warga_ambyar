-- Reset tables for new structure
DROP TABLE IF EXISTS iuran;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS warga;
DROP TABLE IF EXISTS kas;
DROP TABLE IF EXISTS pengumuman;
DROP TABLE IF EXISTS agenda;
DROP TABLE IF EXISTS jadwal_ronda;

CREATE TABLE warga (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    blok ENUM('F7', 'F8') NOT NULL,
    nomor_rumah INT NOT NULL,
    status_keluarga ENUM('Kepala Keluarga', 'Istri', 'Anak', 'Kakek', 'Nenek', 'Lainnya') NOT NULL,
    no_hp VARCHAR(15),
    status_huni ENUM('tetap', 'kontrak', 'kosong', 'tidak huni') DEFAULT 'tetap',
    email VARCHAR(255) DEFAULT NULL,
    is_ronda BOOLEAN DEFAULT FALSE, -- Eligible for ronda?
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rumah_person (blok, nomor_rumah, nama)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'bendahara', 'warga') DEFAULT 'warga',
    warga_id INT,
    nama VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    google_id VARCHAR(255) DEFAULT NULL,
    profile_photo_url VARCHAR(255) DEFAULT NULL,
    foto_profil VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL
);

CREATE TABLE iuran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warga_id INT NOT NULL, -- Linked to Kepala Keluarga usually
    periode DATE NOT NULL, -- YYYY-MM-01
    jenis ENUM('keamanan', 'sampah', 'lainnya', 'kas', 'kas_rt', 'kas_gang') NOT NULL,
    jumlah DECIMAL(10, 2) NOT NULL,
    status ENUM('lunas', 'menunggu_konfirmasi', 'belum_bayar') DEFAULT 'belum_bayar',
    bukti_bayar VARCHAR(255),
    tanggal_bayar DATETIME,
    tanggal_konfirmasi DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tagihan (warga_id, periode, jenis)
);

CREATE TABLE kas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipe ENUM('masuk', 'keluar') NOT NULL,
    jumlah DECIMAL(10, 2) NOT NULL,
    keterangan TEXT,
    tanggal DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pengumuman (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(200) NOT NULL,
    isi TEXT NOT NULL,
    tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE agenda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(200) NOT NULL,
    tanggal DATETIME NOT NULL,
    lokasi VARCHAR(100),
    keterangan TEXT
);

-- Table to store the current shift offset for ronda
CREATE TABLE settings (
    kunci VARCHAR(50) PRIMARY KEY,
    nilai VARCHAR(255)
);

INSERT INTO settings (kunci, nilai) VALUES ('ronda_offset', '0');

CREATE TABLE event_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT,
    image_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES agenda(id) ON DELETE CASCADE
);

-- Pengaduan (Complaints) table
CREATE TABLE IF NOT EXISTS pengaduan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warga_id INT,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    foto VARCHAR(255),
    is_anonim BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'proses', 'selesai', 'ditolak') DEFAULT 'pending',
    tanggapan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL
);

-- Pengaduan Comments/Timeline table
CREATE TABLE IF NOT EXISTS pengaduan_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pengaduan_id INT NOT NULL,
    user_id INT,
    parent_id INT,
    konten TEXT NOT NULL,
    type ENUM('comment', 'log') DEFAULT 'comment',
    lampiran VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pengaduan_id) REFERENCES pengaduan(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES pengaduan_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS donasi_campaign (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    target_dana DECIMAL(15, 2) DEFAULT 0,
    foto VARCHAR(255),
    tanggal_mulai DATETIME NOT NULL,
    tanggal_selesai DATETIME,
    status ENUM('aktif', 'selesai', 'ditutup') DEFAULT 'aktif',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS donasi_transaksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    user_id INT,
    nama_donatur VARCHAR(100),
    is_anonim BOOLEAN DEFAULT FALSE,
    jumlah DECIMAL(15, 2) NOT NULL,
    metode_bayar ENUM('qris', 'transfer') NOT NULL,
    bukti_bayar VARCHAR(255),
    pesan TEXT,
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES donasi_campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS donasi_pengeluaran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    tanggal DATETIME NOT NULL,
    deskripsi VARCHAR(255) NOT NULL,
    kategori VARCHAR(50),
    jumlah DECIMAL(15, 2) NOT NULL,
    bukti VARCHAR(255),
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES donasi_campaign(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS musyawarah (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    konten LONGTEXT,
    lampiran VARCHAR(255),
    tanggal DATETIME NOT NULL,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS musyawarah_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    musyawarah_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT,
    konten TEXT NOT NULL,
    lampiran VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (musyawarah_id) REFERENCES musyawarah(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES musyawarah_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS musyawarah_edit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    musyawarah_id INT NOT NULL,
    edited_by INT NOT NULL,
    edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (musyawarah_id) REFERENCES musyawarah(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE CASCADE
);
