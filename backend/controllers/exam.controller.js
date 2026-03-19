// ==================== EXAM CONTROLLER ====================

const createExam = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { title, description, exam_date, is_online, total_questions, total_mark } = req.body;

    const examId = await db.createExam({
      title,
      description,
      exam_date,
      is_online,
      created_by: req.user.user_id,
      total_questions,
      total_mark,
    });

    const exam = await db.getExamById(examId);

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully.',
      data: { exam },
    });
  } catch (err) {
    console.error('Create exam error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const listExams = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const exams = await db.getExamsByUser(req.user.user_id);

    return res.status(200).json({
      success: true,
      data: { exams },
    });
  } catch (err) {
    console.error('List exams error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getExam = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const exam = await db.getExamById(req.params.exam_id);

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }

    // Ensure the exam belongs to the current user
    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    return res.status(200).json({
      success: true,
      data: { exam },
    });
  } catch (err) {
    console.error('Get exam error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const updateExam = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const exam = await db.getExamById(req.params.exam_id);

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }

    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const { title, description, exam_date, is_online, total_questions, total_mark } = req.body;

    await db.updateExam(req.params.exam_id, {
      title: title || exam.title,
      description: description !== undefined ? description : exam.description,
      exam_date: exam_date !== undefined ? exam_date : exam.exam_date,
      is_online: is_online !== undefined ? is_online : exam.is_online,
      total_questions: total_questions !== undefined ? total_questions : exam.total_questions,
      total_mark: total_mark !== undefined ? total_mark : exam.total_mark,
    });

    const updatedExam = await db.getExamById(req.params.exam_id);

    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully.',
      data: { exam: updatedExam },
    });
  } catch (err) {
    console.error('Update exam error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const deleteExam = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const exam = await db.getExamById(req.params.exam_id);

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }

    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    await db.deleteExam(req.params.exam_id);

    return res.status(200).json({
      success: true,
      message: 'Exam deleted successfully.',
    });
  } catch (err) {
    console.error('Delete exam error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// ==================== ANSWER KEY ====================

const setAnswerKey = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { exam_id } = req.params;
    const { answers } = req.body;

    const exam = await db.getExamById(exam_id);
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }

    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, error: 'Answers array is required.' });
    }

    await db.setAnswerKey(exam_id, answers);

    return res.status(200).json({
      success: true,
      message: 'Answer key saved successfully.',
    });
  } catch (err) {
    console.error('Set answer key error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getAnswerKey = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { exam_id } = req.params;

    const exam = await db.getExamById(exam_id);
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found.' });
    }

    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const answerKey = await db.getAnswerKey(exam_id);

    return res.status(200).json({
      success: true,
      data: { answer_key: answerKey },
    });
  } catch (err) {
    console.error('Get answer key error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

module.exports = {
  createExam,
  listExams,
  getExam,
  updateExam,
  deleteExam,
  setAnswerKey,
  getAnswerKey,
};
