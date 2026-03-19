import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosInstance';
import OtpInput from '../components/OtpInput';

const ForgotVerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email_id;

  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password/verify-otp', {
        email_id: email,
        otp_code: otp,
      });
      toast.success('OTP verified!');
      navigate('/reset-password', { state: { resetToken: data.data.resetToken } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { data } = await api.post('/auth/forgot-password/initiate', { email_id: email });
      toast.success('OTP resent!');
      setCountdown(600);
      setCanResend(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Enter verification code</h1>
            <p className="mt-2 text-gray-500">
              We've sent a 6-digit code to
              <br />
              <span className="font-semibold text-gray-700">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <OtpInput length={6} onComplete={setOtp} disabled={loading} />

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Code expires in{' '}
                  <span className="font-mono font-semibold text-primary-600">{formatTime(countdown)}</span>
                </p>
              ) : (
                <p className="text-sm text-red-500 font-medium">OTP has expired</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={!canResend}
                className={`font-semibold ${canResend ? 'text-primary-600 hover:text-primary-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
              >
                Resend OTP
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotVerifyOtp;
