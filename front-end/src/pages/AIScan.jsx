import React, { useEffect, useMemo, useState } from "react";
import {
  UploadCloud,
  ScanLine,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sprout,
  Save,
  MessageSquare,
  X,
  CalendarDays,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [plots, setPlots] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [selectAllPlots, setSelectAllPlots] = useState(true);
  const [detectedDate, setDetectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (showModal) {
      const fetchFields = async () => {
        try {
          const res = await api.get("/fields");
          const fieldList = (res.data || []).filter(
            (field) => Number(field.myPlotCount || 0) > 0
          );
          setFields(fieldList);
          if (fieldList.length > 0) {
            setSelectedField(fieldList[0]._id);
          } else {
            setSelectedField("");
          }
        } catch (error) {
          console.error("Lỗi khi tải danh sách cánh đồng", error);
        }
      };
      fetchFields();
      setDetectedDate(new Date().toISOString().slice(0, 10));
      setSelectAllPlots(true);
      setSelectedPlotIds([]);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showModal || !selectedField) {
      setPlots([]);
      setSeasons([]);
      setSelectedSeason("");
      return;
    }

    const fetchFieldData = async () => {
      try {
        const seasonsRes = await api.get("/season-details", { params: { fieldId: selectedField } });

        const seasonList = seasonsRes.data || [];
        const active = seasonList.find((season) => season.status === "active");
        const plotList = active?.loggablePlots || [];

        setPlots(plotList);
        setSeasons(seasonList);
        setSelectedSeason(active?._id || "");
        setSelectAllPlots(true);
        setSelectedPlotIds([]);
      } catch (fetchError) {
        console.error("Lỗi khi tải thửa ruộng hoặc mùa vụ", fetchError);
      }
    };

    fetchFieldData();
  }, [showModal, selectedField]);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.status === "active") || null,
    [seasons]
  );

  const handleAskAI = () => {
    navigate("/ask-ai", { state: { result } });
  };

  const buildDiagnosisDescription = () => {
    if (!result) return "Không có dữ liệu chẩn đoán.";
    const confidenceText =
      typeof result.confidence === "number"
        ? `${(result.confidence * 100).toFixed(1)}%`
        : "Không xác định";

    return [
      `Kết quả AI: ${result.disease || "Không xác định"}`,
      `Độ tin cậy: ${confidenceText}`,
      "Nguồn: AI chẩn đoán bệnh lúa",
    ].join("\n");
  };

  const handleSaveDiseaseLog = async () => {
    if (!result) return;

    if (!selectedField) {
      alert("Vui lòng chọn cánh đồng.");
      return;
    }

    if (!selectedSeason) {
      alert("Không tìm thấy mùa vụ đang canh tác cho cánh đồng này.");
      return;
    }

    if (!selectAllPlots && selectedPlotIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 thửa hoặc chọn tất cả các thửa.");
      return;
    }

    const payload = {
      diseaseName: result.disease || "Không xác định",
      confidence: result.confidence,
      title: `Phát hiện bệnh: ${result.disease || "Không xác định"}`,
      description: buildDiagnosisDescription(),
      type: "disease",
      seasonId: selectedSeason,
      date: new Date(detectedDate),
      scope: selectAllPlots ? "all_plots" : "selected_plots",
      plotIds: selectAllPlots ? [] : selectedPlotIds,
      imageName: selectedImage?.name || "",
      source: "ai_scan",
    };

    try {
      setSaveLoading(true);
      await api.post("/disease-logs", payload);

      alert("Đã lưu nhật ký bệnh thành công.");
      setShowModal(false);
    } catch (saveError) {
      console.error("Lỗi khi lưu nhật ký bệnh", saveError);
      alert(saveError?.response?.data?.message || "Không thể lưu nhật ký. Vui lòng thử lại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const togglePlotSelection = (plotId) => {
    if (selectAllPlots) {
      setSelectAllPlots(false);
      setSelectedPlotIds([plotId]);
      return;
    }

    setSelectedPlotIds((prev) =>
      prev.includes(plotId) ? prev.filter((id) => id !== plotId) : [...prev, plotId]
    );
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
                  {/* <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm mb-2">💡 Gợi ý xử lý (Sắp ra mắt)</h4>
                    <p className="text-xs text-blue-600">
                      Tính năng tư vấn thuốc bảo vệ thực vật và quy trình xử lý dựa trên AI đang được phát triển.
                    </p>
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">Lưu Nhật Ký Bệnh</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-white/15 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Chọn cánh đồng</label>
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {fields.length === 0 && <option value="">Chưa có cánh đồng</option>}
                    {fields.map((field) => (
                      <option key={field._id} value={field._id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Mùa vụ đang canh tác</label>
                  <div className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-gray-50 text-sm text-gray-700 min-h-[44px] flex items-center">
                    {activeSeason ? activeSeason.name : "Không có mùa vụ active"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Ngày phát hiện bệnh</label>
                <div className="relative">
                  <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={detectedDate}
                    onChange={(e) => setDetectedDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Chọn thửa ruộng</label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectAllPlots}
                      onChange={(e) => {
                        setSelectAllPlots(e.target.checked);
                        if (e.target.checked) {
                          setSelectedPlotIds([]);
                        }
                      }}
                    />
                    Tất cả các thửa
                  </label>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-2 bg-gray-50">
                  {plots.length === 0 && (
                    <p className="text-sm text-gray-500 p-2">Cánh đồng này chưa có thửa ruộng.</p>
                  )}

                  {plots.map((plot) => (
                    <label
                      key={plot._id}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
                    >
                      <span className="text-sm text-gray-700">{plot.name}</span>
                      <input
                        type="checkbox"
                        checked={selectAllPlots ? true : selectedPlotIds.includes(plot._id)}
                        disabled={selectAllPlots}
                        onChange={() => togglePlotSelection(plot._id)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Chi tiết sẽ lưu</p>
                <p className="text-sm text-emerald-900 mt-1">Danh mục: Bệnh</p>
                <p className="text-sm text-emerald-900">Bệnh: {result?.disease || "-"}</p>
                <p className="text-sm text-emerald-900">
                  Độ tin cậy: {typeof result?.confidence === "number" ? `${(result.confidence * 100).toFixed(1)}%` : "-"}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveDiseaseLog}
                  disabled={saveLoading || !result}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-white ${
                    saveLoading || !result ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {saveLoading ? "Đang lưu..." : "Xác nhận lưu nhật ký"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIScan;
