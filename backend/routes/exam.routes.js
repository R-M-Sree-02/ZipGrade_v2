const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateCreateExam } = require('../middleware/validate.middleware');

// All routes are protected
router.use(verifyToken);

router.post('/', validateCreateExam, examController.createExam);
router.get('/', examController.listExams);
router.get('/:exam_id', examController.getExam);
router.put('/:exam_id', examController.updateExam);
router.delete('/:exam_id', examController.deleteExam);

// Answer key
router.post('/:exam_id/answer-key', examController.setAnswerKey);
router.get('/:exam_id/answer-key', examController.getAnswerKey);

module.exports = router;
