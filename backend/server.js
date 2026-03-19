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

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize DBManager and attach to app
const db = new DBManager(pool);
app.locals.db = db;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==================== MIDDLEWARE ====================

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// ==================== ROUTES ====================

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/omr', omrRoutes);
app.use('/api/results', resultRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ZipGrade API is running.' });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File size exceeds 10MB limit.' });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ success: false, error: err.message });
  }

  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Serve React build
app.use(express.static(path.join(__dirname, "build")));

// React routing support
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});


// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 ZipGrade API server running on http://localhost:${PORT}`);
});

module.exports = app;
