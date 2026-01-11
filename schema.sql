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
    status_huni ENUM('tetap', 'kontrak', 'kosong') DEFAULT 'tetap',
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL
);

CREATE TABLE iuran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warga_id INT NOT NULL, -- Linked to Kepala Keluarga usually
    periode DATE NOT NULL, -- YYYY-MM-01
    jenis ENUM('keamanan', 'sampah', 'lainnya') NOT NULL,
    jumlah DECIMAL(10, 2) NOT NULL,
    status ENUM('lunas', 'menunggu_konfirmasi', 'belum_bayar') DEFAULT 'belum_bayar',
    bukti_bayar VARCHAR(255),
    tanggal_bayar DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tagihan (warga_id, periode, jenis)
);

CREATE TABLE kas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipe ENUM('masuk', 'keluar') NOT NULL,
    jumlah DECIMAL(10, 2) NOT NULL,
    keterangan TEXT,
    tanggal DATE NOT NULL,
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
