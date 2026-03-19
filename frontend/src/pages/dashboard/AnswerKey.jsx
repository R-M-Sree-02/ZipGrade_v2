import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';

const AnswerKey = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, keyRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/exams/${examId}/answer-key`),
        ]);

        const examData = examRes.data.data.exam;
        setExam(examData);

        const existingKeys = keyRes.data.data.answer_key;

        if (existingKeys.length > 0) {
          setAnswers(
            existingKeys.map((k) => ({
              question_index: k.question_index,
              question_type: k.question_type,
              correct_answer: k.correct_answer,
              mark: k.mark,
            }))
          );
        } else {
          // Generate empty answers based on total_questions
          const count = examData.total_questions || 10;
          setAnswers(
            Array.from({ length: count }, (_, i) => ({
              question_index: i + 1,
              question_type: 'mcq',
              correct_answer: '',
              mark: 1,
            }))
          );
        }
      } catch (err) {
        toast.error('Failed to load exam data.');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, navigate]);

  const handleAnswerChange = (index, field, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setAnswers(newAnswers);
  };

  const addQuestion = () => {
    setAnswers([
      ...answers,
      {
        question_index: answers.length + 1,
        question_type: 'mcq',
        correct_answer: '',
        mark: 1,
      },
    ]);
  };

  const removeQuestion = (index) => {
    if (answers.length <= 1) return;
    const newAnswers = answers.filter((_, i) => i !== index).map((a, i) => ({
      ...a,
      question_index: i + 1,
    }));
    setAnswers(newAnswers);
  };

  const handleSave = async () => {
    // Validate
    const empty = answers.filter((a) => !a.correct_answer.trim());
    if (empty.length > 0) {
      toast.error(`Please fill in all answers. ${empty.length} question(s) are empty.`);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/exams/${examId}/answer-key`, { answers });
      toast.success('Answer key saved successfully!');
    } catch (err) {
      toast.error('Failed to save answer key.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Answer Key</h1>
          <p className="mt-1 text-gray-500">
            {exam?.title} · {answers.length} questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Question
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Answer Key'
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Type</div>
          <div className="col-span-4">Correct Answer</div>
          <div className="col-span-2">Marks</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {answers.map((answer, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-gray-50 transition-colors">
              <div className="col-span-1">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-sm font-semibold text-gray-600">
                  {answer.question_index}
                </span>
              </div>

              <div className="col-span-3">
                <select
                  value={answer.question_type}
                  onChange={(e) => handleAnswerChange(index, 'question_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                >
                  <option value="mcq">MCQ</option>
                  <option value="numeric">Numeric</option>
                </select>
              </div>

              <div className="col-span-4">
                {answer.question_type === 'mcq' ? (
                  <div className="flex gap-2">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswerChange(index, 'correct_answer', opt)}
                        className={`w-10 h-10 rounded-lg font-semibold text-sm border-2 transition-all ${
                          answer.correct_answer === opt
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={answer.correct_answer}
                    onChange={(e) => handleAnswerChange(index, 'correct_answer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                    placeholder="Enter numeric answer"
                  />
                )}
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={answer.mark}
                  onChange={(e) => handleAnswerChange(index, 'mark', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                />
              </div>

              <div className="col-span-2 text-right">
                <button
                  onClick={() => removeQuestion(index)}
                  disabled={answers.length <= 1}
                  className="text-red-400 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/exams')}
          className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
        >
          ← Back to Exams
        </button>
        <button
          onClick={() => navigate(`/exams/${examId}/upload`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Continue to Upload Scans
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AnswerKey;
