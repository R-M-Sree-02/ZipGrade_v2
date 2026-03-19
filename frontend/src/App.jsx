import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SignupVerifyOtp from './pages/SignupVerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import ForgotVerifyOtp from './pages/ForgotVerifyOtp';
import ResetPassword from './pages/ResetPassword';
import OAuthSuccess from './pages/OAuthSuccess';
import Dashboard from './pages/dashboard/Dashboard';
import ExamList from './pages/dashboard/ExamList';
import CreateExam from './pages/dashboard/CreateExam';
import AnswerKey from './pages/dashboard/AnswerKey';
import UploadScan from './pages/dashboard/UploadScan';
import Results from './pages/dashboard/Results';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/verify" element={<SignupVerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password/verify" element={<ForgotVerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute><ExamList /></ProtectedRoute>} />
        <Route path="/exams/create" element={<ProtectedRoute><CreateExam /></ProtectedRoute>} />
        <Route path="/exams/:examId/edit" element={<ProtectedRoute><CreateExam /></ProtectedRoute>} />
        <Route path="/exams/:examId/answer-key" element={<ProtectedRoute><AnswerKey /></ProtectedRoute>} />
        <Route path="/exams/:examId/upload" element={<ProtectedRoute><UploadScan /></ProtectedRoute>} />
        <Route path="/exams/:examId/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
