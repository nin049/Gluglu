-- Script de création des tables GluGlu
-- À exécuter dans phpMyAdmin sur o2switch

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  barcode VARCHAR(50) NOT NULL,
  product_name VARCHAR(255),
  brand VARCHAR(255),
  risk_level ENUM('safe', 'low', 'medium', 'high', 'unknown') NOT NULL DEFAULT 'unknown',
  risk_score TINYINT UNSIGNED,
  ai_explanation TEXT,
  ingredients TEXT,
  allergens TEXT,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_scanned_at (scanned_at)
);
