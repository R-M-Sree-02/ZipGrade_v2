require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const pool = require('./config/db');
const DBManager = require('./db/DBManager');

// Import routes
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const omrRoutes = require('./routes/omr.routes');
const resultRoutes = require('./routes/result.routes');
const oauthRoutes = require('./routes/oauth.routes');

const app = express();

// ✅ PORT (Render)
const PORT = process.env.PORT || 10000;

// Initialize DB
const db = new DBManager(pool);
app.locals.db = db;

// ==================== CREATE FOLDERS ====================

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==================== MIDDLEWARE ====================

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static uploads
app.use('/uploads', express.static(uploadsDir));

// ==================== API ROUTES ====================

// ✅ Combine auth + oauth cleanly
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);

app.use('/api/exams', examRoutes);
app.use('/api/omr', omrRoutes);
app.use('/api/results', resultRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZipGrade API is running ✅'
  });
});

// ==================== SERVE FRONTEND ====================

const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// ==================== ERROR HANDLING ====================

// API 404 (only API)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API route not found'
  });
});

// Global error
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds 10MB limit.'
    });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error.'
  });
});

// ==================== REACT ROUTE (LAST) ====================

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// ==================== START ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;