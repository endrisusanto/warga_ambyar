-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: localhost    Database: rt_rw_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agenda`
--

DROP TABLE IF EXISTS `agenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agenda` (
  `id` int NOT NULL AUTO_INCREMENT,
  `judul` varchar(200) NOT NULL,
  `tanggal` datetime NOT NULL,
  `lokasi` varchar(100) DEFAULT NULL,
  `keterangan` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agenda`
--

LOCK TABLES `agenda` WRITE;
/*!40000 ALTER TABLE `agenda` DISABLE KEYS */;
INSERT INTO `agenda` VALUES (1,'Uji Coba Sistem Baru','2026-01-09 14:45:34','Balai Warga','Ini adalah data dummy untuk test fitur pengumuman.');
/*!40000 ALTER TABLE `agenda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `iuran`
--

DROP TABLE IF EXISTS `iuran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iuran` (
  `id` int NOT NULL AUTO_INCREMENT,
  `warga_id` int NOT NULL,
  `periode` date NOT NULL,
  `jenis` enum('keamanan','sampah','lainnya','kas') NOT NULL,
  `jumlah` decimal(10,2) NOT NULL,
  `status` enum('lunas','menunggu_konfirmasi','belum_bayar') DEFAULT 'belum_bayar',
  `bukti_bayar` varchar(255) DEFAULT NULL,
  `tanggal_bayar` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tagihan` (`warga_id`,`periode`,`jenis`),
  CONSTRAINT `iuran_ibfk_1` FOREIGN KEY (`warga_id`) REFERENCES `warga` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=249 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `iuran`
--

LOCK TABLES `iuran` WRITE;
/*!40000 ALTER TABLE `iuran` DISABLE KEYS */;
INSERT INTO `iuran` VALUES (3,1,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:25'),(4,1,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:26'),(5,2,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:26'),(6,2,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:26'),(7,3,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:26'),(8,3,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:26'),(9,4,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:27'),(10,4,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:27'),(11,5,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:27'),(12,5,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:27'),(13,6,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:28'),(14,6,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:28'),(15,7,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:28'),(16,7,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:29'),(17,8,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:29'),(18,8,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:29'),(20,9,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:29'),(22,9,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:29'),(25,10,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(27,10,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(29,11,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(32,11,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(34,12,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(37,12,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(39,13,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(41,13,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(42,14,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(44,14,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(45,15,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:30'),(47,15,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(48,16,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(50,16,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(51,17,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:31'),(53,17,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:32'),(54,18,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:32'),(56,18,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:32'),(57,19,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:32'),(59,19,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:32'),(60,20,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:32'),(62,20,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:33'),(63,21,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:33'),(65,21,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:33'),(66,22,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:33'),(68,22,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:33'),(69,23,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:34'),(71,23,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:34'),(72,24,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:34'),(74,24,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:34'),(75,25,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:34'),(77,25,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:35'),(78,26,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:35'),(80,26,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:35'),(81,27,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:35'),(83,27,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:35'),(84,28,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:35'),(86,28,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:36'),(87,29,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:36'),(89,29,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:36'),(90,30,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:36'),(92,30,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:36'),(93,31,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(95,31,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(96,32,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(98,32,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(99,33,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(101,33,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(102,34,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:37'),(104,34,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:38'),(105,35,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:38'),(107,35,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:38'),(108,36,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:38'),(110,36,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:38'),(111,37,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:38'),(113,37,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:39'),(114,38,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:39'),(116,38,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:39'),(117,39,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:39'),(119,39,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:40'),(120,40,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:40'),(122,40,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:40'),(123,41,'2026-01-01','keamanan',50000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:40'),(125,41,'2026-01-01','sampah',20000.00,'belum_bayar',NULL,NULL,'2026-01-10 14:14:40');
/*!40000 ALTER TABLE `iuran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kas`
--

DROP TABLE IF EXISTS `kas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipe` enum('masuk','keluar') NOT NULL,
  `jumlah` decimal(10,2) NOT NULL,
  `keterangan` text,
  `tanggal` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `bukti_foto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kas`
--

LOCK TABLES `kas` WRITE;
/*!40000 ALTER TABLE `kas` DISABLE KEYS */;
/*!40000 ALTER TABLE `kas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `musyawarah`
--

DROP TABLE IF EXISTS `musyawarah`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `musyawarah` (
  `id` int NOT NULL AUTO_INCREMENT,
  `judul` varchar(255) NOT NULL,
  `konten` longtext,
  `lampiran` varchar(255) DEFAULT NULL,
  `tanggal` date NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `musyawarah`
--

LOCK TABLES `musyawarah` WRITE;
/*!40000 ALTER TABLE `musyawarah` DISABLE KEYS */;
/*!40000 ALTER TABLE `musyawarah` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pengumuman`
--

DROP TABLE IF EXISTS `pengumuman`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pengumuman` (
  `id` int NOT NULL AUTO_INCREMENT,
  `judul` varchar(200) NOT NULL,
  `isi` text NOT NULL,
  `tanggal` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pengumuman`
--

LOCK TABLES `pengumuman` WRITE;
/*!40000 ALTER TABLE `pengumuman` DISABLE KEYS */;
/*!40000 ALTER TABLE `pengumuman` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ronda_dokumentasi`
--

DROP TABLE IF EXISTS `ronda_dokumentasi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ronda_dokumentasi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `foto` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ronda_dokumentasi`
--

LOCK TABLES `ronda_dokumentasi` WRITE;
/*!40000 ALTER TABLE `ronda_dokumentasi` DISABLE KEYS */;
/*!40000 ALTER TABLE `ronda_dokumentasi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ronda_jadwal`
--

DROP TABLE IF EXISTS `ronda_jadwal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ronda_jadwal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `warga_id` int NOT NULL,
  `status` enum('scheduled','hadir','alpa','izin','reschedule') DEFAULT 'scheduled',
  `denda` int DEFAULT '0',
  `keterangan` text,
  `foto_bukti` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `warga_id` (`warga_id`),
  CONSTRAINT `ronda_jadwal_ibfk_1` FOREIGN KEY (`warga_id`) REFERENCES `warga` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ronda_jadwal`
--

LOCK TABLES `ronda_jadwal` WRITE;
/*!40000 ALTER TABLE `ronda_jadwal` DISABLE KEYS */;
INSERT INTO `ronda_jadwal` VALUES (37,'2026-01-03',6,'scheduled',0,NULL,NULL,'2026-01-10 14:07:17'),(38,'2026-01-03',12,'scheduled',0,NULL,NULL,'2026-01-10 14:07:17'),(39,'2026-01-03',14,'scheduled',0,NULL,NULL,'2026-01-10 14:07:17'),(40,'2026-01-03',18,'scheduled',0,NULL,NULL,'2026-01-10 14:07:17'),(41,'2026-01-03',21,'scheduled',0,NULL,NULL,'2026-01-10 14:07:17'),(42,'2026-01-03',22,'reschedule',0,'Diganti ke minggu depan',NULL,'2026-01-10 14:07:18'),(43,'2026-01-03',38,'scheduled',0,NULL,NULL,'2026-01-10 14:07:18'),(44,'2026-01-03',39,'scheduled',0,NULL,NULL,'2026-01-10 14:07:19'),(45,'2026-01-10',3,'hadir',0,NULL,NULL,'2026-01-10 14:07:19'),(46,'2026-01-10',8,'scheduled',0,NULL,NULL,'2026-01-10 14:07:19'),(47,'2026-01-10',13,'scheduled',0,NULL,NULL,'2026-01-10 14:07:19'),(48,'2026-01-10',15,'hadir',0,NULL,NULL,'2026-01-10 14:07:19'),(49,'2026-01-10',25,'hadir',0,NULL,NULL,'2026-01-10 14:07:19'),(50,'2026-01-10',26,'scheduled',0,NULL,NULL,'2026-01-10 14:07:19'),(51,'2026-01-10',31,'hadir',0,NULL,NULL,'2026-01-10 14:07:20'),(52,'2026-01-10',40,'scheduled',0,NULL,NULL,'2026-01-10 14:07:20'),(53,'2026-01-17',2,'scheduled',0,NULL,NULL,'2026-01-10 14:07:20'),(54,'2026-01-17',4,'scheduled',0,NULL,NULL,'2026-01-10 14:07:20'),(55,'2026-01-17',11,'scheduled',0,NULL,NULL,'2026-01-10 14:07:20'),(56,'2026-01-17',28,'scheduled',0,NULL,NULL,'2026-01-10 14:07:20'),(57,'2026-01-17',30,'scheduled',0,NULL,NULL,'2026-01-10 14:07:21'),(58,'2026-01-17',32,'scheduled',0,NULL,NULL,'2026-01-10 14:07:21'),(59,'2026-01-17',41,'scheduled',0,NULL,NULL,'2026-01-10 14:07:21'),(60,'2026-01-24',5,'scheduled',0,NULL,NULL,'2026-01-10 14:07:21'),(61,'2026-01-24',17,'scheduled',0,NULL,NULL,'2026-01-10 14:07:21'),(62,'2026-01-24',20,'scheduled',0,NULL,NULL,'2026-01-10 14:07:21'),(63,'2026-01-24',29,'scheduled',0,NULL,NULL,'2026-01-10 14:07:22'),(64,'2026-01-24',33,'scheduled',0,NULL,NULL,'2026-01-10 14:07:22'),(65,'2026-01-24',35,'scheduled',0,NULL,NULL,'2026-01-10 14:07:22'),(66,'2026-01-24',37,'scheduled',0,NULL,NULL,'2026-01-10 14:07:22'),(67,'2026-01-31',6,'scheduled',0,NULL,NULL,'2026-01-10 14:07:23'),(68,'2026-01-31',12,'scheduled',0,NULL,NULL,'2026-01-10 14:07:23'),(69,'2026-01-31',14,'scheduled',0,NULL,NULL,'2026-01-10 14:07:23'),(70,'2026-01-31',18,'scheduled',0,NULL,NULL,'2026-01-10 14:07:23'),(71,'2026-01-31',21,'scheduled',0,NULL,NULL,'2026-01-10 14:07:23'),(72,'2026-01-31',22,'scheduled',0,NULL,NULL,'2026-01-10 14:07:23'),(73,'2026-01-31',38,'scheduled',0,NULL,NULL,'2026-01-10 14:07:24'),(74,'2026-01-31',39,'scheduled',0,NULL,NULL,'2026-01-10 14:07:24'),(77,'2026-01-10',22,'hadir',0,NULL,NULL,'2026-01-10 14:24:38'),(78,'2025-12-06',6,'scheduled',0,NULL,NULL,'2026-01-10 14:25:02'),(79,'2025-12-06',12,'scheduled',0,NULL,NULL,'2026-01-10 14:25:02'),(80,'2025-12-06',14,'scheduled',0,NULL,NULL,'2026-01-10 14:25:03'),(81,'2025-12-06',18,'scheduled',0,NULL,NULL,'2026-01-10 14:25:03'),(82,'2025-12-06',21,'scheduled',0,NULL,NULL,'2026-01-10 14:25:03'),(83,'2025-12-06',22,'scheduled',0,NULL,NULL,'2026-01-10 14:25:03'),(84,'2025-12-06',38,'scheduled',0,NULL,NULL,'2026-01-10 14:25:03'),(85,'2025-12-06',39,'scheduled',0,NULL,NULL,'2026-01-10 14:25:04'),(86,'2025-12-13',3,'scheduled',0,NULL,NULL,'2026-01-10 14:25:04'),(87,'2025-12-13',8,'scheduled',0,NULL,NULL,'2026-01-10 14:25:04'),(88,'2025-12-13',13,'scheduled',0,NULL,NULL,'2026-01-10 14:25:04'),(89,'2025-12-13',15,'scheduled',0,NULL,NULL,'2026-01-10 14:25:04'),(90,'2025-12-13',25,'scheduled',0,NULL,NULL,'2026-01-10 14:25:04'),(91,'2025-12-13',26,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(92,'2025-12-13',31,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(93,'2025-12-13',31,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(94,'2025-12-13',40,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(95,'2025-12-13',40,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(96,'2025-12-20',2,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(97,'2025-12-20',2,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(98,'2025-12-20',4,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(99,'2025-12-20',4,'scheduled',0,NULL,NULL,'2026-01-10 14:25:05'),(100,'2025-12-20',4,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(101,'2025-12-20',11,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(102,'2025-12-20',11,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(103,'2025-12-20',11,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(104,'2025-12-20',28,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(105,'2025-12-20',28,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(106,'2025-12-20',28,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(107,'2025-12-20',28,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(108,'2025-12-20',30,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(109,'2025-12-20',30,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(110,'2025-12-20',30,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(111,'2025-12-20',32,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(112,'2025-12-20',32,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(113,'2025-12-20',32,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(114,'2025-12-20',32,'scheduled',0,NULL,NULL,'2026-01-10 14:25:06'),(115,'2025-12-20',41,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(116,'2025-12-20',41,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(117,'2025-12-20',41,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(118,'2025-12-20',41,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(119,'2025-12-27',5,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(120,'2025-12-27',5,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(121,'2025-12-27',5,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(122,'2025-12-27',5,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(123,'2025-12-27',17,'reschedule',0,'Diganti ke minggu depan',NULL,'2026-01-10 14:25:07'),(124,'2025-12-27',17,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(125,'2025-12-27',17,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(126,'2025-12-27',17,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(127,'2025-12-27',20,'scheduled',0,NULL,NULL,'2026-01-10 14:25:07'),(128,'2025-12-27',20,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(129,'2025-12-27',20,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(130,'2025-12-27',20,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(131,'2025-12-27',29,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(132,'2025-12-27',29,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(133,'2025-12-27',33,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(134,'2025-12-27',33,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(135,'2025-12-27',33,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(136,'2025-12-27',33,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(137,'2025-12-27',35,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(138,'2025-12-27',35,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(139,'2025-12-27',35,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(140,'2025-12-27',35,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(141,'2025-12-27',37,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(142,'2025-12-27',37,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(143,'2025-12-27',37,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(144,'2025-12-27',37,'scheduled',0,NULL,NULL,'2026-01-10 14:25:08'),(145,'2026-01-03',17,'reschedule',0,'Diganti ke minggu depan',NULL,'2026-01-10 14:26:00'),(146,'2026-01-10',17,'hadir',0,NULL,NULL,'2026-01-10 14:26:19');
/*!40000 ALTER TABLE `ronda_jadwal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ronda_shares`
--

DROP TABLE IF EXISTS `ronda_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ronda_shares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `image_filename` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ronda_shares`
--

LOCK TABLES `ronda_shares` WRITE;
/*!40000 ALTER TABLE `ronda_shares` DISABLE KEYS */;
INSERT INTO `ronda_shares` VALUES (1,'2026-01-10','share-1768055541626.png','2026-01-10 14:32:21'),(2,'2026-01-10','share-1768055663081.png','2026-01-10 14:34:23'),(3,'2026-01-10','share-1768055757388.png','2026-01-10 14:35:57'),(4,'2026-01-10','share-1768062103673.png','2026-01-10 16:21:44'),(5,'2026-01-31','share-1768064013581.png','2026-01-10 16:53:33'),(6,'2026-01-03','share-1768064365201.png','2026-01-10 16:59:25'),(7,'2026-01-03','share-1768064468781.png','2026-01-10 17:01:08'),(8,'2026-01-10','share-1768064636828.png','2026-01-10 17:03:56'),(9,'2026-01-10','share-1768066087876.png','2026-01-10 17:28:07'),(10,'2026-01-10','share-1768073891829.png','2026-01-10 19:38:11'),(11,'2026-01-10','share-1768074580462.png','2026-01-10 19:49:40'),(12,'2026-01-24','share-1768099118866.png','2026-01-11 02:38:38'),(13,'2026-01-17','share-1768144067226.png','2026-01-11 15:07:47');
/*!40000 ALTER TABLE `ronda_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `kunci` varchar(50) NOT NULL,
  `nilai` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('ronda_offset','0');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','bendahara','warga') DEFAULT 'warga',
  `warga_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `nama` varchar(255) DEFAULT NULL,
  `foto_profil` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `warga_id` (`warga_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`warga_id`) REFERENCES `warga` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'endrisusanto','$2b$10$mMp3XxroMgKVYUtZaqNaV.FWBj.gGsEGAmw4d96xUBzcFHoWYvCoO','admin',22,'2026-01-10 11:34:41','endrisusanto','profile-1768057032716.jpeg'),(2,'rahma','$2b$10$VlEQUNRoORNttA.pYncMHuxyrAP5QGFDTp2p5wWzZAPdpYvgHSGHm','warga',42,'2026-01-10 16:14:09',NULL,'profile-1768065968131.jpg');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warga`
--

DROP TABLE IF EXISTS `warga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warga` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) NOT NULL,
  `blok` enum('F7','F8') NOT NULL,
  `nomor_rumah` int NOT NULL,
  `status_keluarga` enum('Kepala Keluarga','Istri','Anak','Kakek','Nenek','Lainnya') NOT NULL,
  `no_hp` varchar(15) DEFAULT NULL,
  `status_huni` enum('tetap','kontrak','kosong') DEFAULT 'tetap',
  `is_ronda` tinyint(1) DEFAULT '0',
  `tim_ronda` varchar(5) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'approved',
  `foto_profil` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rumah_person` (`blok`,`nomor_rumah`,`nama`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warga`
--

LOCK TABLES `warga` WRITE;
/*!40000 ALTER TABLE `warga` DISABLE KEYS */;
INSERT INTO `warga` VALUES (1,'','F7',19,'Kepala Keluarga','-','kosong',0,NULL,'2026-01-10 13:34:38','approved',NULL),(2,'Arbas','F7',20,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 13:34:38','approved',NULL),(3,'Indra','F7',21,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:39','approved',NULL),(4,'Ompu','F7',22,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 13:34:39','approved',NULL),(5,'Roni','F7',23,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:34:40','approved',NULL),(6,'Ace','F7',24,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:34:40','approved',NULL),(7,'Iyon','F7',25,'Kepala Keluarga','-','tetap',1,NULL,'2026-01-10 13:34:41','approved',NULL),(8,'Nashar','F7',26,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:41','approved',NULL),(9,'Bu Haji','F7',27,'Kepala Keluarga','-','kontrak',0,NULL,'2026-01-10 13:34:41','approved',NULL),(10,'Bu Haji','F7',28,'Kepala Keluarga','-','kontrak',0,NULL,'2026-01-10 13:34:42','approved',NULL),(11,'Gunawan','F7',29,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 13:34:42','approved',NULL),(12,'Ipul','F7',30,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:34:42','approved',NULL),(13,'karsidi','F7',31,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:43','approved',NULL),(14,'Saketi','F7',33,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:34:43','approved',NULL),(15,'Renol','F7',34,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:43','approved',NULL),(16,'Arifin','F7',35,'Kepala Keluarga','-','tetap',1,NULL,'2026-01-10 13:34:43','approved',NULL),(17,'Arifin','F7',36,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:34:44','approved',NULL),(18,'Topan','F8',1,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:34:44','approved',NULL),(19,'','F8',2,'Kepala Keluarga','-','kosong',0,NULL,'2026-01-10 13:34:44','approved',NULL),(20,'Awan','F8',3,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:34:44','approved',NULL),(21,'Riko','F8',4,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:34:44','approved',NULL),(22,'Endri','F8',5,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:34:45','approved','profile-1768057032716.jpeg'),(23,'Aas','F8',6,'Istri','-','tetap',0,NULL,'2026-01-10 13:34:45','approved',NULL),(24,'Aas','F8',7,'Istri','-','tetap',0,NULL,'2026-01-10 13:34:45','approved',NULL),(25,'Adit','F8',8,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:45','approved',NULL),(26,'Imam','F8',9,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:45','approved',NULL),(27,'','F8',10,'Kepala Keluarga','-','kosong',0,NULL,'2026-01-10 13:34:46','approved',NULL),(28,'Ari','F8',11,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 13:34:46','approved',NULL),(29,'Niko','F8',12,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:34:46','approved',NULL),(30,'Yori','F8',13,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 13:34:46','approved',NULL),(31,'Dery','F8',14,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:34:47','approved',NULL),(32,'Subani','F8',15,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 13:34:47','approved',NULL),(33,'Rais','F8',16,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:34:47','approved',NULL),(34,'','F8',17,'Kepala Keluarga','-','kosong',0,NULL,'2026-01-10 13:34:47','approved',NULL),(35,'Ridwan','F8',18,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:34:47','approved',NULL),(36,'Andromeda','F8',19,'Kepala Keluarga','-','tetap',1,NULL,'2026-01-10 13:34:48','approved',NULL),(37,'Yudis','F7',29,'Kepala Keluarga','-','tetap',1,'A','2026-01-10 13:56:05','approved',NULL),(38,'Anjar','F8',6,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:58:07','approved',NULL),(39,'Iding','F7',27,'Kepala Keluarga','-','tetap',1,'B','2026-01-10 13:58:44','approved',NULL),(40,'Wiryono','F7',28,'Kepala Keluarga','-','tetap',1,'C','2026-01-10 13:58:57','approved',NULL),(41,'Bistara','F7',17,'Kepala Keluarga','-','tetap',1,'D','2026-01-10 14:00:37','approved',NULL),(42,'Rahma Raudya Tuzahra','F8',5,'Istri','6285802773660','tetap',0,NULL,'2026-01-10 16:14:08','approved','profile-1768065968131.jpg');
/*!40000 ALTER TABLE `warga` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-11 16:54:15
