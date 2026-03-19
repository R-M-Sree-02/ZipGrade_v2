import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';

const CreateExam = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const isEditing = !!examId;

  const [form, setForm] = useState({
    title: '',
    description: '',
    exam_date: '',
    is_online: false,
    total_questions: '',
    total_mark: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchingExam, setFetchingExam] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      const fetchExam = async () => {
        try {
          const { data } = await api.get(`/exams/${examId}`);
          const exam = data.data.exam;
          setForm({
            title: exam.title || '',
            description: exam.description || '',
            exam_date: exam.exam_date ? new Date(Number(exam.exam_date)).toISOString().split('T')[0] : '',
            is_online: exam.is_online || false,
            total_questions: exam.total_questions || '',
            total_mark: exam.total_mark || '',
          });
        } catch (err) {
          toast.error('Failed to load exam details.');
          navigate('/exams');
        } finally {
          setFetchingExam(false);
        }
      };
      fetchExam();
    }
  }, [examId, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      exam_date: form.exam_date ? new Date(form.exam_date).getTime() : null,
      total_questions: parseInt(form.total_questions) || 0,
      total_mark: parseInt(form.total_mark) || 0,
    };

    try {
      if (isEditing) {
        await api.put(`/exams/${examId}`, payload);
        toast.success('Exam updated successfully!');
      } else {
        const { data } = await api.post('/exams', payload);
        toast.success('Exam created successfully!');
        navigate(`/exams/${data.data.exam.exam_id}/answer-key`);
        return;
      }
      navigate('/exams');
    } catch (err) {
      const errorMsg = err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} exam.`;
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingExam) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Exam' : 'Create New Exam'}
        </h1>
        <p className="mt-1 text-gray-500">
          {isEditing ? 'Update your exam details' : 'Set up a new exam for OMR evaluation'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
            Exam Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={50}
            value={form.title}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all"
            placeholder="e.g., Mathematics Final Exam 2024"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all resize-none"
            placeholder="Optional description for this exam..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="total_questions" className="block text-sm font-medium text-gray-700 mb-1.5">
              Total Questions
            </label>
            <input
              id="total_questions"
              name="total_questions"
              type="number"
              min="0"
              value={form.total_questions}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all"
              placeholder="e.g., 50"
            />
          </div>

          <div>
            <label htmlFor="total_mark" className="block text-sm font-medium text-gray-700 mb-1.5">
              Total Marks
            </label>
            <input
              id="total_mark"
              name="total_mark"
              type="number"
              min="0"
              value={form.total_mark}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all"
              placeholder="e.g., 100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="exam_date" className="block text-sm font-medium text-gray-700 mb-1.5">
            Exam Date
          </label>
          <input
            id="exam_date"
            name="exam_date"
            type="date"
            value={form.exam_date}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="is_online"
            name="is_online"
            type="checkbox"
            checked={form.is_online}
            onChange={handleChange}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="is_online" className="text-sm font-medium text-gray-700">
            This is an online exam
          </label>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Exam' : 'Create Exam'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/exams')}
            className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateExam;
