// ==================== RESULT CONTROLLER ====================

const evaluateScan = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { scan_id } = req.params;
    const { participant_id, detected_answers } = req.body;

    // Get scan info
    const scan = await db.getScanById(scan_id);
    if (!scan) {
      return res.status(404).json({ success: false, error: 'Scan not found.' });
    }

    // Get config to find exam
    const config = await db.getOMRConfig(scan.omr_config_id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'OMR configuration not found.' });
    }
    if (config.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Get answer key
    const answerKey = await db.getAnswerKeyByExamId(config.exam_id);
    if (!answerKey || answerKey.length === 0) {
      return res.status(400).json({ success: false, error: 'No answer key found for this exam.' });
    }

    if (!Array.isArray(detected_answers)) {
      return res.status(400).json({ success: false, error: 'detected_answers array is required.' });
    }

    // Ensure participant exists
    let pId = participant_id;
    if (!pId) {
      // Create a default participant for this scan
      pId = await db.createParticipant({
        participant_sheet_code: scan.sheet_code,
        participant_details: { name: 'Unknown', sheet_code: scan.sheet_code },
      });
    }

    // Evaluate each detected answer against the answer key
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let totalMark = 0;

    // Create a lookup map from the answer key
    const answerKeyMap = {};
    for (const ak of answerKey) {
      answerKeyMap[ak.question_index] = ak;
    }

    for (const detected of detected_answers) {
      const { question_index, value } = detected;
      const ak = answerKeyMap[question_index];

      if (!ak) continue; // Skip if no answer key for this question

      const detectedValue = value !== null && value !== undefined && value !== '' ? String(value).trim() : null;
      let isCorrect = false;

      if (detectedValue === null || detectedValue === '') {
        blankCount++;
      } else if (detectedValue.toLowerCase() === String(ak.correct_answer).toLowerCase()) {
        isCorrect = true;
        correctCount++;
        totalMark += parseFloat(ak.mark || 1);
      } else {
        wrongCount++;
      }

      // Save detected value
      await db.saveDetectedValue({
        answer_id: ak.answer_key_id,
        participant_id: pId,
        detected_value: detectedValue || '',
        is_correct: isCorrect,
      });
    }

    // Save result
    const resultId = await db.saveResult({
      scan_id: parseInt(scan_id),
      participant_id: pId,
      correct_count: correctCount,
      wrong_count: wrongCount,
      blank_count: blankCount,
      total_mark: totalMark,
    });

    return res.status(200).json({
      success: true,
      message: 'Evaluation completed.',
      data: {
        result_id: resultId,
        correct_count: correctCount,
        wrong_count: wrongCount,
        blank_count: blankCount,
        total_mark: totalMark,
      },
    });
  } catch (err) {
    console.error('Evaluate scan error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getResultsByExam = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { exam_id } = req.params;

    // Verify exam belongs to user
    const exam = await db.getExamById(exam_id);
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }
    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const results = await db.getResultsByExam(exam_id);

    // Parse participant_details JSON
    const parsedResults = results.map((r) => ({
      ...r,
      participant_details: typeof r.participant_details === 'string'
        ? JSON.parse(r.participant_details)
        : r.participant_details,
    }));

    return res.status(200).json({
      success: true,
      data: { results: parsedResults },
    });
  } catch (err) {
    console.error('Get results by exam error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getResultByParticipant = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { participant_id } = req.params;

    const result = await db.getResultByParticipant(participant_id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Result not found.' });
    }

    // Get detailed detected values
    const detectedValues = await db.getDetectedValuesByParticipant(participant_id);

    return res.status(200).json({
      success: true,
      data: {
        result: {
          ...result,
          participant_details: typeof result.participant_details === 'string'
            ? JSON.parse(result.participant_details)
            : result.participant_details,
        },
        detailed_responses: detectedValues,
      },
    });
  } catch (err) {
    console.error('Get result by participant error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

module.exports = {
  evaluateScan,
  getResultsByExam,
  getResultByParticipant,
};
