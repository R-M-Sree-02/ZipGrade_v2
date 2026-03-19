import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';

const Results = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailedView, setDetailedView] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, resultsRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/results/${examId}`),
        ]);
        setExam(examRes.data.data.exam);
        setResults(resultsRes.data.data.results || []);
      } catch (err) {
        // Results might be empty, that's ok
        try {
          const examRes = await api.get(`/exams/${examId}`);
          setExam(examRes.data.data.exam);
        } catch (e) {
          toast.error('Failed to load data.');
          navigate('/exams');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, navigate]);

  const viewParticipantDetail = async (participantId) => {
    try {
      const { data } = await api.get(`/results/participant/${participantId}`);
      setDetailedView(data.data);
      setSelectedResult(participantId);
    } catch (err) {
      toast.error('Failed to load detailed results.');
    }
  };

  const getScoreColor = (correct, total) => {
    if (total === 0) return 'text-gray-600';
    const percentage = (correct / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
          <p className="mt-1 text-gray-500">{exam?.title} · {results.length} participant(s)</p>
        </div>
        <button
          onClick={() => navigate(`/exams/${examId}/upload`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Upload More Sheets
        </button>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Total Participants</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{results.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">
              {(results.reduce((sum, r) => sum + parseFloat(r.total_mark || 0), 0) / results.length).toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Highest Score</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {Math.max(...results.map((r) => parseFloat(r.total_mark || 0))).toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Lowest Score</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {Math.min(...results.map((r) => parseFloat(r.total_mark || 0))).toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {results.length === 0 ? (
          <div className="p-16 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600">No results yet</h3>
            <p className="text-gray-400 mt-1 mb-4">Upload and evaluate OMR sheets to see results here</p>
            <button
              onClick={() => navigate(`/exams/${examId}/upload`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Upload OMR Sheets
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Participant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sheet Code</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Correct</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wrong</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Blank</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((result, index) => {
                  const details = result.participant_details || {};
                  const totalQ = (result.correct_count || 0) + (result.wrong_count || 0) + (result.blank_count || 0);

                  return (
                    <tr key={result.result_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-semibold text-xs">
                              {(details.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {details.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {result.sheet_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-green-600">{result.correct_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-red-600">{result.wrong_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-500">{result.blank_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${getScoreColor(result.correct_count, totalQ)}`}>
                          {parseFloat(result.total_mark || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => viewParticipantDetail(result.participant_id)}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedResult && detailedView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Detailed Result</h3>
                <p className="text-sm text-gray-500">
                  {detailedView.result?.participant_details?.name || 'Unknown'}
                </p>
              </div>
              <button
                onClick={() => { setSelectedResult(null); setDetailedView(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Score Summary */}
            <div className="px-6 py-4 grid grid-cols-4 gap-4 bg-gray-50 border-b border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{detailedView.result?.correct_count || 0}</p>
                <p className="text-xs text-gray-500">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{detailedView.result?.wrong_count || 0}</p>
                <p className="text-xs text-gray-500">Wrong</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-500">{detailedView.result?.blank_count || 0}</p>
                <p className="text-xs text-gray-500">Blank</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">
                  {parseFloat(detailedView.result?.total_mark || 0).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
            </div>

            {/* Response Details */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Question-wise Breakdown</h4>
              <div className="space-y-2">
                {detailedView.detailed_responses?.map((resp) => (
                  <div
                    key={resp.response_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      resp.is_correct
                        ? 'bg-green-50 border border-green-100'
                        : resp.detected_value
                        ? 'bg-red-50 border border-red-100'
                        : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm font-semibold text-gray-600 border">
                        {resp.question_index}
                      </span>
                      <div>
                        <span className="text-sm text-gray-600">
                          Answer: <span className="font-semibold">{resp.detected_value || '—'}</span>
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          (Correct: {resp.correct_answer})
                        </span>
                      </div>
                    </div>
                    <div>
                      {resp.is_correct ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Correct
                        </span>
                      ) : resp.detected_value ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✗ Wrong
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          — Blank
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div className="mt-6">
        <button
          onClick={() => navigate('/exams')}
          className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
        >
          ← Back to Exams
        </button>
      </div>
    </div>
  );
};

export default Results;
