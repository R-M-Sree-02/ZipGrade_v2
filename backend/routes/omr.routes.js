const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const omrController = require('../controllers/omr.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Multer configuration for OMR sheet uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `omr-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// All routes are protected
router.use(verifyToken);

router.post('/config', omrController.createOMRConfig);
router.get('/config/:config_id', omrController.getOMRConfig);
router.post('/scan', upload.single('omr_sheet'), omrController.uploadScan);
router.get('/scans/:config_id', omrController.listScans);

module.exports = router;
