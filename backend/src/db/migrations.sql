-- Script de création des tables GluGlu
-- À exécuter dans phpMyAdmin sur o2switch

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(50) UNIQUE DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  intolerance_level ENUM('strict','sensitive','avoiding') DEFAULT 'sensitive',
  expo_push_token VARCHAR(255) DEFAULT NULL,
  active_group_id INT DEFAULT NULL,
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
  image_url VARCHAR(500),
  suspect_ingredients TEXT,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_scanned_at (scanned_at)
);

CREATE TABLE IF NOT EXISTS groups_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending','accepted') DEFAULT 'pending',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_group (group_id)
);

-- === Migrations o2switch (si tables déjà existantes) ===
-- ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE DEFAULT NULL AFTER email;
-- ALTER TABLE users ADD COLUMN expo_push_token VARCHAR(255) DEFAULT NULL AFTER intolerance_level;
-- ALTER TABLE users ADD COLUMN active_group_id INT DEFAULT NULL AFTER expo_push_token;
-- ALTER TABLE scans ADD COLUMN image_url VARCHAR(500) AFTER allergens;
-- ALTER TABLE scans ADD COLUMN suspect_ingredients TEXT AFTER image_url;
-- CREATE TABLE IF NOT EXISTS groups_table (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, owner_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_owner (owner_id));
-- CREATE TABLE IF NOT EXISTS group_members (id INT AUTO_INCREMENT PRIMARY KEY, group_id INT NOT NULL, user_id INT NOT NULL, status ENUM('pending','accepted') DEFAULT 'pending', joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_member (group_id, user_id), FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_user (user_id), INDEX idx_group (group_id));


