import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';

const UploadScan = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [exam, setExam] = useState(null);
  const [config, setConfig] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const examRes = await api.get(`/exams/${examId}`);
        setExam(examRes.data.data.exam);

        // Try to get existing config, or we'll create one during upload
        // For simplicity, just set loading done
      } catch (err) {
        toast.error('Failed to load exam data.');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, navigate]);

  const handleFileSelect = (file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, WebP, or PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first.');
      return;
    }

    setUploading(true);
    try {
      // First ensure OMR config exists
      let configId = config?.config_id;
      if (!configId) {
        const configRes = await api.post('/omr/config', {
          exam_id: parseInt(examId),
          sheet_name: `${exam.title} Sheet`,
          template_type: 'standard',
          mcq_questions: exam.total_questions || 0,
          numeric_questions: 0,
        });
        configId = configRes.data.data.config.config_id;
        setConfig(configRes.data.data.config);
      }

      // Upload the scan
      const formData = new FormData();
      formData.append('omr_sheet', selectedFile);
      formData.append('omr_config_id', configId);
      formData.append('upload_type', 'upload');
      if (participantName.trim()) {
        formData.append(
          'participant_details',
          JSON.stringify({ name: participantName.trim() })
        );
      }

      const { data } = await api.post('/omr/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('OMR sheet uploaded successfully!');
      setScans([data.data, ...scans]);
      setSelectedFile(null);
      setPreviewUrl(null);
      setParticipantName('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload scan.');
    } finally {
      setUploading(false);
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload OMR Sheets</h1>
        <p className="mt-1 text-gray-500">{exam?.title}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Scan</h2>

          {/* Participant Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Participant Name (Optional)
            </label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all"
              placeholder="e.g., John Doe"
            />
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary-400 bg-primary-50'
                : selectedFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />

            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-3" />
            ) : (
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}

            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Drag & drop your OMR sheet here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  or click to browse · JPEG, PNG, WebP, PDF (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full mt-4 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Sheet
              </>
            )}
          </button>
        </div>

        {/* Uploaded Scans List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Sheets</h2>

          {scans.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">No sheets uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scans.map((scan, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {scan.sheet_code}
                    </p>
                    <p className="text-xs text-gray-500">Scan #{scan.scan_id}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Uploaded
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => navigate(`/exams/${examId}/answer-key`)}
          className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
        >
          ← Back to Answer Key
        </button>
        <button
          onClick={() => navigate(`/exams/${examId}/results`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          View Results
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default UploadScan;
