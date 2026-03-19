/**
 * Database initialization script
 * Run with: node scripts/initDb.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const schema = `
CREATE DATABASE IF NOT EXISTS ZipGrade;
USE ZipGrade;

CREATE TABLE IF NOT EXISTS users (
  user_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_name     VARCHAR(50) NOT NULL,
  email_id      VARCHAR(150) UNIQUE NOT NULL,
  password      VARBINARY(64) NULL,
  auth_provider ENUM('local','google','zoho') DEFAULT 'local',
  provider_id   VARCHAR(255) DEFAULT NULL,
  is_verified   BOOLEAN DEFAULT FALSE,
  created_time  BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
);

CREATE TABLE IF NOT EXISTS exams (
  exam_id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  title           VARCHAR(50) NOT NULL,
  description     TEXT,
  exam_date       BIGINT,
  is_online       BOOLEAN DEFAULT FALSE,
  created_by      BIGINT,
  total_questions INT,
  total_mark      INT,
  created_at      BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS header_fields (
  field_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  field_name VARCHAR(25) NOT NULL
);

CREATE TABLE IF NOT EXISTS omr_configurations (
  config_id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_id           BIGINT,
  user_id           BIGINT,
  sheet_name        VARCHAR(50),
  template_type     VARCHAR(255),
  mcq_questions     INT,
  numeric_questions INT,
  created_at        BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS omr_header (
  header_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  omr_config_id BIGINT,
  field_id     BIGINT,
  FOREIGN KEY (omr_config_id) REFERENCES omr_configurations(config_id),
  FOREIGN KEY (field_id)      REFERENCES header_fields(field_id)
);

CREATE TABLE IF NOT EXISTS answer_keys (
  answer_key_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_id        BIGINT,
  question_index INT NOT NULL,
  question_type  ENUM('mcq','numeric') NOT NULL,
  correct_answer VARCHAR(50),
  mark           DECIMAL(5,2),
  allow_decimal  BOOLEAN,
  allow_fraction BOOLEAN,
  allow_negative BOOLEAN,
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
  INDEX idx_answer_exam_question (exam_id, question_index)
);

CREATE TABLE IF NOT EXISTS omr_scans (
  scan_id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  omr_config_id  BIGINT,
  sheet_code     VARCHAR(100) NOT NULL UNIQUE,
  scan_image_path VARCHAR(255) NOT NULL,
  upload_type    ENUM('scan','upload') NOT NULL,
  uploaded_at    BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
  FOREIGN KEY (omr_config_id) REFERENCES omr_configurations(config_id)
);

CREATE TABLE IF NOT EXISTS participants (
  participant_id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  participant_sheet_code VARCHAR(255),
  participant_details    JSON NOT NULL,
  FOREIGN KEY (participant_sheet_code) REFERENCES omr_scans(sheet_code)
);

CREATE TABLE IF NOT EXISTS detected_values (
  response_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  answer_id      BIGINT,
  participant_id BIGINT,
  detected_value VARCHAR(50),
  is_correct     BOOLEAN,
  FOREIGN KEY (answer_id)      REFERENCES answer_keys(answer_key_id),
  FOREIGN KEY (participant_id) REFERENCES participants(participant_id),
  INDEX idx_detected_lookup (participant_id, answer_id)
);

CREATE TABLE IF NOT EXISTS result (
  result_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  scan_id        BIGINT,
  participant_id BIGINT,
  correct_count  INT,
  wrong_count    INT,
  blank_count    INT,
  total_mark     DECIMAL(6,2),
  evaluated_at   BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
  FOREIGN KEY (scan_id)        REFERENCES omr_scans(scan_id),
  FOREIGN KEY (participant_id) REFERENCES participants(participant_id)
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  otp_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  email_id   VARCHAR(150) NOT NULL,
  otp_code   VARCHAR(6) NOT NULL,
  otp_type   ENUM('signup','forgot_password') NOT NULL,
  expires_at BIGINT NOT NULL,
  is_used    BOOLEAN DEFAULT FALSE,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  created_at BIGINT DEFAULT (UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000),
  expires_at BIGINT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
`;

async function initDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
    });

    console.log('🔗 Connected to MySQL server');
    console.log('📦 Creating database and tables...');

    await connection.query(schema);

    console.log('✅ Database "ZipGrade" initialized successfully!');
    console.log('📋 Tables created:');
    console.log('   - users');
    console.log('   - exams');
    console.log('   - header_fields');
    console.log('   - omr_configurations');
    console.log('   - omr_header');
    console.log('   - answer_keys');
    console.log('   - omr_scans');
    console.log('   - participants');
    console.log('   - detected_values');
    console.log('   - result');
    console.log('   - otp_verifications');
    console.log('   - sessions');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

initDatabase();
