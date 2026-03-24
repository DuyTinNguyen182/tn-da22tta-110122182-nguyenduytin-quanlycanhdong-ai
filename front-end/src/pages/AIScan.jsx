import React, { useState } from "react";
import { UploadCloud, ScanLine, AlertCircle, CheckCircle, Loader2, Sprout, Save, MessageSquare, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import api from "../services/api";

const AIScan = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [selectedPlots, setSelectedPlots] = useState([]);
  const [activeSeason, setActiveSeason] = useState("Đông Xuân 2023-2024");

  useEffect(() => {
    if (showModal) {
      const fetchFields = async () => {
        try {
          const res = await api.get("/fields");
          setFields(res.data);
          if (res.data.length > 0) {
            setSelectedField(res.data[0]._id);
          }
        } catch (error) {
          console.error("Lỗi khi tải danh sách cánh đồng", error);
        }
      };
      fetchFields();
    }
  }, [showModal]);

  const handleAskAI = () => {
    navigate("/ask-ai", { state: { result } });
  };

  const handleSaveDiary = async () => {
    alert("Đã lưu kết quả bệnh vào nhật ký cánh đồng thành công!");
    setShowModal(false);
  };

  // Xử lý khi chọn file
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null); // Reset kết quả cũ
      setError(null);
    }
  };

  // Gửi ảnh lên server
  const handleScan = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      // Gọi API Node.js
      const res = await api.post("/ai/diagnose", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Không thể chẩn đoán. Vui lòng kiểm tra lại hệ thống AI.");
    } finally {
      setLoading(false);
    }
  };

  // Hàm helper để hiển thị mức độ tin cậy
  const getConfidenceLevel = (score) => {
    if (score > 0.8) return { text: "Rất cao", color: "text-emerald-600" };
    if (score > 0.5) return { text: "Trung bình", color: "text-yellow-600" };
    return { text: "Thấp (Cần kiểm tra kỹ)", color: "text-red-600" };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <ScanLine className="text-emerald-600" size={32} />
            AI Chẩn Đoán Bệnh Lúa
          </h1>
          <p className="text-gray-500 mt-2">
            Tải lên hình ảnh lá lúa có dấu hiệu bất thường để hệ thống phân tích.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cột Trái: Upload & Preview */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <label
                htmlFor="upload-input"
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                  ${previewUrl ? "border-emerald-200 bg-emerald-50/30" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
                `}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Nhấn để tải ảnh</span> hoặc kéo thả
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG (Tối đa 5MB)</p>
                  </div>
                )}
                <input
                  id="upload-input"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <button
              onClick={handleScan}
              disabled={!selectedImage || loading}
              className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all
                ${!selectedImage || loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 active:scale-95"
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Đang Phân Tích...
                </>
              ) : (
                <>
                  <ScanLine size={20} /> Chẩn Đoán Ngay
                </>
              )}
            </button>
          </div>

          {/* Cột Phải: Kết quả */}
          <div className="flex flex-col gap-6">
            {/* Hướng dẫn mặc định */}
            {!result && !loading && !error && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
                  <Sprout size={40} />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Sẵn sàng chẩn đoán</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs">
                  Hệ thống hỗ trợ nhận diện các bệnh: Đạo ôn, Bạc lá, Đốm nâu và Tungro.
                </p>
              </div>
            )}

            {/* Thông báo lỗi */}
            {error && (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-start gap-4">
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-red-800">Đã xảy ra lỗi</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Hiển thị kết quả */}
            {result && (
              <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
                  <h3 className="font-bold text-lg">Kết Quả Phân Tích</h3>
                  <CheckCircle size={24} />
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bệnh được phát hiện</span>
                    <h2 className="text-3xl font-extrabold text-emerald-700 mt-1">
                      {result.disease}
                    </h2>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Độ tin cậy</span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${result.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className={`font-bold text-lg ${getConfidenceLevel(result.confidence).color}`}>
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      Mức độ chính xác: {getConfidenceLevel(result.confidence).text}
                    </p>
                  </div>

                  
                  {/* Khung gợi ý / Nút hành động */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex-1 px-4 py-2.5 bg-white border-2 border-emerald-600 text-emerald-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
                    >
                      <Save size={18} /> Lưu Nhật Ký
                    </button>
                    <button
                      onClick={handleAskAI}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors"
                    >
                      <MessageSquare size={18} /> Hỏi AI
                    </button>
                  </div>

                  {/* Placeholder cho tính năng tư vấn sau này */}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm mb-2">💡 Gợi ý xử lý (Sắp ra mắt)</h4>
                    <p className="text-xs text-blue-600">
                      Tính năng tư vấn thuốc bảo vệ thực vật và quy trình xử lý dựa trên AI đang được phát triển.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIScan;