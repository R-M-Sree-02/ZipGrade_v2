const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes are protected
router.use(verifyToken);

router.post('/evaluate/:scan_id', resultController.evaluateScan);
router.get('/:exam_id', resultController.getResultsByExam);
router.get('/participant/:participant_id', resultController.getResultByParticipant);

module.exports = router;
