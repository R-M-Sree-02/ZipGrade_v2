import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, fetchUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('OAuth authentication failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token) {
      localStorage.setItem('accessToken', token);
      fetchUser().then(() => {
        toast.success('Welcome!');
        navigate('/dashboard');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, login, fetchUser]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
