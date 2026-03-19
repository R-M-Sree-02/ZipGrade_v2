const { v4: uuidv4 } = require('uuid');
const path = require('path');

// ==================== OMR CONFIGURATION ====================

const createOMRConfig = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { exam_id, sheet_name, template_type, mcq_questions, numeric_questions, header_fields } = req.body;

    // Verify exam exists and belongs to user
    const exam = await db.getExamById(exam_id);
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }
    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const configId = await db.createOMRConfig({
      exam_id,
      user_id: req.user.user_id,
      sheet_name,
      template_type,
      mcq_questions,
      numeric_questions,
    });

    // Add header fields if provided
    if (Array.isArray(header_fields)) {
      for (const fieldName of header_fields) {
        const fieldId = await db.createHeaderField(fieldName);
        await db.addOMRHeader(configId, fieldId);
      }
    }

    const config = await db.getOMRConfig(configId);
    const headers = await db.getOMRHeaders(configId);

    return res.status(201).json({
      success: true,
      message: 'OMR configuration created successfully.',
      data: { config, headers },
    });
  } catch (err) {
    console.error('Create OMR config error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getOMRConfig = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { config_id } = req.params;

    const config = await db.getOMRConfig(config_id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'OMR configuration not found.' });
    }

    if (config.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const headers = await db.getOMRHeaders(config_id);

    return res.status(200).json({
      success: true,
      data: { config, headers },
    });
  } catch (err) {
    console.error('Get OMR config error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// ==================== OMR SCAN UPLOAD ====================

const uploadScan = async (req, res) => {
  try {
    const db = req.app.locals.db;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { omr_config_id, upload_type, participant_details } = req.body;

    if (!omr_config_id) {
      return res.status(400).json({ success: false, error: 'OMR config ID is required.' });
    }

    // Verify config exists and belongs to user
    const config = await db.getOMRConfig(omr_config_id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'OMR configuration not found.' });
    }
    if (config.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const sheetCode = `SHEET-${uuidv4().slice(0, 8).toUpperCase()}`;
    const scanImagePath = req.file.path;

    const scanId = await db.createScan({
      omr_config_id,
      sheet_code: sheetCode,
      scan_image_path: scanImagePath,
      upload_type: upload_type || 'upload',
    });

    // Create participant if details provided
    let participantId = null;
    if (participant_details) {
      const details = typeof participant_details === 'string'
        ? JSON.parse(participant_details)
        : participant_details;

      participantId = await db.createParticipant({
        participant_sheet_code: sheetCode,
        participant_details: details,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'OMR sheet uploaded successfully.',
      data: {
        scan_id: scanId,
        sheet_code: sheetCode,
        scan_image_path: scanImagePath,
        participant_id: participantId,
      },
    });
  } catch (err) {
    console.error('Upload scan error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const listScans = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { config_id } = req.params;

    const config = await db.getOMRConfig(config_id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'OMR configuration not found.' });
    }
    if (config.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const scans = await db.getScansByConfig(config_id);

    return res.status(200).json({
      success: true,
      data: { scans },
    });
  } catch (err) {
    console.error('List scans error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

module.exports = {
  createOMRConfig,
  getOMRConfig,
  uploadScan,
  listScans,
};
