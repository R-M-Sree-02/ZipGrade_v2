class DBManager {
  constructor(pool) {
    this.pool = pool;
  }

  // ==================== USER QUERIES ====================

  async getUserByEmail(email) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM users WHERE email_id = ?',
      [email]
    );
    return rows[0] || null;
  }

  async getUserById(userId) {
    const [rows] = await this.pool.execute(
      'SELECT user_id, user_name, email_id, auth_provider, is_verified, created_time FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  async createUser({ user_name, email_id, hashedPassword, auth_provider, provider_id }) {
    const [result] = await this.pool.execute(
      `INSERT INTO users (user_name, email_id, password, auth_provider, provider_id, is_verified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_name,
        email_id,
        hashedPassword,
        auth_provider || 'local',
        provider_id || null,
        auth_provider !== 'local' ? true : false,
      ]
    );
    return result.insertId;
  }

  async verifyUser(email) {
    await this.pool.execute(
      'UPDATE users SET is_verified = TRUE WHERE email_id = ?',
      [email]
    );
  }

  async updatePassword(email, hashedPassword) {
    await this.pool.execute(
      'UPDATE users SET password = ? WHERE email_id = ?',
      [hashedPassword, email]
    );
  }

  async updateProviderIdByEmail(email, providerId) {
    await this.pool.execute(
      'UPDATE users SET provider_id = ? WHERE email_id = ?',
      [providerId, email]
    );
  }

  // ==================== OTP QUERIES ====================

  async saveOTP({ email_id, otp_code, otp_type, expires_at }) {
    await this.pool.execute(
      `INSERT INTO otp_verifications (email_id, otp_code, otp_type, expires_at)
       VALUES (?, ?, ?, ?)`,
      [email_id, otp_code, otp_type, expires_at]
    );
  }

  async getLatestOTP(email_id, otp_type) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM otp_verifications
       WHERE email_id = ? AND otp_type = ? AND is_used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [email_id, otp_type]
    );
    return rows[0] || null;
  }

  async markOTPUsed(otp_id) {
    await this.pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE otp_id = ?',
      [otp_id]
    );
  }

  async invalidateOTPs(email_id, otp_type) {
    await this.pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE email_id = ? AND otp_type = ? AND is_used = FALSE',
      [email_id, otp_type]
    );
  }

  async countRecentOTPs(email_id, sinceTimestamp) {
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as count FROM otp_verifications WHERE email_id = ? AND created_at > ?',
      [email_id, sinceTimestamp]
    );
    return rows[0].count;
  }

  // ==================== SESSION QUERIES ====================

  async createSession({ session_id, user_id, expires_at, ip_address, user_agent }) {
    await this.pool.execute(
      `INSERT INTO sessions (session_id, user_id, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [session_id, user_id, expires_at, ip_address, user_agent]
    );
  }

  async getSession(session_id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM sessions WHERE session_id = ? AND expires_at > ?',
      [session_id, Date.now()]
    );
    return rows[0] || null;
  }

  async deleteSession(session_id) {
    await this.pool.execute(
      'DELETE FROM sessions WHERE session_id = ?',
      [session_id]
    );
  }

  async deleteAllUserSessions(user_id) {
    await this.pool.execute(
      'DELETE FROM sessions WHERE user_id = ?',
      [user_id]
    );
  }

  // ==================== EXAM QUERIES ====================

  async createExam({ title, description, exam_date, is_online, created_by, total_questions, total_mark }) {
    const [result] = await this.pool.execute(
      `INSERT INTO exams (title, description, exam_date, is_online, created_by, total_questions, total_mark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, exam_date || null, is_online || false, created_by, total_questions || 0, total_mark || 0]
    );
    return result.insertId;
  }

  async getExamsByUser(userId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM exams WHERE created_by = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  async getExamById(examId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM exams WHERE exam_id = ?',
      [examId]
    );
    return rows[0] || null;
  }

  async updateExam(examId, { title, description, exam_date, is_online, total_questions, total_mark }) {
    const [result] = await this.pool.execute(
      `UPDATE exams SET title = ?, description = ?, exam_date = ?, is_online = ?, total_questions = ?, total_mark = ?
       WHERE exam_id = ?`,
      [title, description || null, exam_date || null, is_online || false, total_questions || 0, total_mark || 0, examId]
    );
    return result.affectedRows;
  }

  async deleteExam(examId) {
    await this.pool.execute('DELETE FROM exams WHERE exam_id = ?', [examId]);
  }

  // ==================== ANSWER KEY QUERIES ====================

  async setAnswerKey(examId, answers) {
    // Delete existing answer key for the exam
    await this.pool.execute('DELETE FROM answer_keys WHERE exam_id = ?', [examId]);

    // Batch insert new answer keys
    for (const ans of answers) {
      await this.pool.execute(
        `INSERT INTO answer_keys (exam_id, question_index, question_type, correct_answer, mark, allow_decimal, allow_fraction, allow_negative)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          examId,
          ans.question_index,
          ans.question_type,
          ans.correct_answer,
          ans.mark || 1,
          ans.allow_decimal || false,
          ans.allow_fraction || false,
          ans.allow_negative || false,
        ]
      );
    }
  }

  async getAnswerKey(examId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM answer_keys WHERE exam_id = ? ORDER BY question_index',
      [examId]
    );
    return rows;
  }

  async getAnswerKeyByExamId(examId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM answer_keys WHERE exam_id = ? ORDER BY question_index',
      [examId]
    );
    return rows;
  }

  // ==================== HEADER FIELDS QUERIES ====================

  async createHeaderField(fieldName) {
    const [result] = await this.pool.execute(
      'INSERT INTO header_fields (field_name) VALUES (?)',
      [fieldName]
    );
    return result.insertId;
  }

  async getAllHeaderFields() {
    const [rows] = await this.pool.execute('SELECT * FROM header_fields');
    return rows;
  }

  // ==================== OMR CONFIGURATION QUERIES ====================

  async createOMRConfig({ exam_id, user_id, sheet_name, template_type, mcq_questions, numeric_questions }) {
    const [result] = await this.pool.execute(
      `INSERT INTO omr_configurations (exam_id, user_id, sheet_name, template_type, mcq_questions, numeric_questions)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [exam_id, user_id, sheet_name || null, template_type || null, mcq_questions || 0, numeric_questions || 0]
    );
    return result.insertId;
  }

  async getOMRConfig(configId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM omr_configurations WHERE config_id = ?',
      [configId]
    );
    return rows[0] || null;
  }

  async getOMRConfigsByExam(examId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM omr_configurations WHERE exam_id = ?',
      [examId]
    );
    return rows;
  }

  // ==================== OMR HEADER QUERIES ====================

  async addOMRHeader(omrConfigId, fieldId) {
    const [result] = await this.pool.execute(
      'INSERT INTO omr_header (omr_config_id, field_id) VALUES (?, ?)',
      [omrConfigId, fieldId]
    );
    return result.insertId;
  }

  async getOMRHeaders(omrConfigId) {
    const [rows] = await this.pool.execute(
      `SELECT oh.header_id, oh.omr_config_id, oh.field_id, hf.field_name
       FROM omr_header oh
       JOIN header_fields hf ON oh.field_id = hf.field_id
       WHERE oh.omr_config_id = ?`,
      [omrConfigId]
    );
    return rows;
  }

  // ==================== OMR SCAN QUERIES ====================

  async createScan({ omr_config_id, sheet_code, scan_image_path, upload_type }) {
    const [result] = await this.pool.execute(
      `INSERT INTO omr_scans (omr_config_id, sheet_code, scan_image_path, upload_type)
       VALUES (?, ?, ?, ?)`,
      [omr_config_id, sheet_code, scan_image_path, upload_type]
    );
    return result.insertId;
  }

  async getScanById(scanId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM omr_scans WHERE scan_id = ?',
      [scanId]
    );
    return rows[0] || null;
  }

  async getScansByConfig(configId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM omr_scans WHERE omr_config_id = ? ORDER BY uploaded_at DESC',
      [configId]
    );
    return rows;
  }

  // ==================== PARTICIPANT QUERIES ====================

  async createParticipant({ participant_sheet_code, participant_details }) {
    const [result] = await this.pool.execute(
      `INSERT INTO participants (participant_sheet_code, participant_details)
       VALUES (?, ?)`,
      [participant_sheet_code, JSON.stringify(participant_details)]
    );
    return result.insertId;
  }

  async getParticipantById(participantId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM participants WHERE participant_id = ?',
      [participantId]
    );
    return rows[0] || null;
  }

  async getParticipantsBySheetCode(sheetCode) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM participants WHERE participant_sheet_code = ?',
      [sheetCode]
    );
    return rows;
  }

  // ==================== DETECTED VALUES QUERIES ====================

  async saveDetectedValue({ answer_id, participant_id, detected_value, is_correct }) {
    const [result] = await this.pool.execute(
      `INSERT INTO detected_values (answer_id, participant_id, detected_value, is_correct)
       VALUES (?, ?, ?, ?)`,
      [answer_id, participant_id, detected_value, is_correct]
    );
    return result.insertId;
  }

  async getDetectedValuesByParticipant(participantId) {
    const [rows] = await this.pool.execute(
      `SELECT dv.*, ak.question_index, ak.question_type, ak.correct_answer, ak.mark
       FROM detected_values dv
       JOIN answer_keys ak ON dv.answer_id = ak.answer_key_id
       WHERE dv.participant_id = ?
       ORDER BY ak.question_index`,
      [participantId]
    );
    return rows;
  }

  // ==================== RESULT QUERIES ====================

  async saveResult({ scan_id, participant_id, correct_count, wrong_count, blank_count, total_mark }) {
    const [result] = await this.pool.execute(
      `INSERT INTO result (scan_id, participant_id, correct_count, wrong_count, blank_count, total_mark)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [scan_id, participant_id, correct_count, wrong_count, blank_count, total_mark]
    );
    return result.insertId;
  }

  async getResultsByExam(examId) {
    const [rows] = await this.pool.execute(
      `SELECT r.*, p.participant_details, os.sheet_code
       FROM result r
       JOIN participants p ON r.participant_id = p.participant_id
       JOIN omr_scans os ON r.scan_id = os.scan_id
       JOIN omr_configurations oc ON os.omr_config_id = oc.config_id
       WHERE oc.exam_id = ?
       ORDER BY r.evaluated_at DESC`,
      [examId]
    );
    return rows;
  }

  async getResultByParticipant(participantId) {
    const [rows] = await this.pool.execute(
      `SELECT r.*, p.participant_details
       FROM result r
       JOIN participants p ON r.participant_id = p.participant_id
       WHERE r.participant_id = ?`,
      [participantId]
    );
    return rows[0] || null;
  }
}

module.exports = DBManager;
