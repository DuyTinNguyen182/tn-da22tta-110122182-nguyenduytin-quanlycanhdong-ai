import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  ScanLine,
  AlertCircle,
  AlertTriangle,
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
import { useFeedback } from "../hooks/useFeedback";

const formatPercent = (score) =>
  typeof score === "number" ? `${(score * 100).toFixed(1)}%` : "Không xác định";

const getConfidenceLevel = (score, isLowConfidence = false) => {
  if (isLowConfidence) {
    return { text: "Cần kiểm tra thêm", color: "text-amber-600" };
  }
  if (score > 0.8) return { text: "Rất cao", color: "text-emerald-600" };
  if (score > 0.5) return { text: "Trung bình", color: "text-yellow-600" };
  return { text: "Thấp", color: "text-red-600" };
};

const buildLowConfidenceMessage = (diagnosisResult) => {
  if (!diagnosisResult?.is_low_confidence) return null;

  const reasons = [];
  if (
    typeof diagnosisResult?.confidence === "number" &&
    typeof diagnosisResult?.confidence_threshold === "number" &&
    diagnosisResult.confidence < diagnosisResult.confidence_threshold
  ) {
    reasons.push(
      `độ tin cậy hiện tại dưới ngưỡng ${formatPercent(diagnosisResult.confidence_threshold)}`
    );
  }

  if (
    typeof diagnosisResult?.confidence_gap === "number" &&
    typeof diagnosisResult?.confidence_gap_threshold === "number" &&
    diagnosisResult.confidence_gap < diagnosisResult.confidence_gap_threshold
  ) {
    reasons.push(
      `chênh lệch giữa dự đoán 1 và 2 chỉ ${formatPercent(diagnosisResult.confidence_gap)}`
    );
  }

  if (reasons.length === 0) {
    return "Kết quả AI chưa đủ chắc chắn. Bạn nên kiểm tra thêm bằng ảnh rõ hơn hoặc đối chiếu thực tế.";
  }

  return `Kết quả AI chưa đủ chắc chắn vì ${reasons.join(" và ")}. Bạn nên kiểm tra thêm bằng ảnh rõ hơn hoặc đối chiếu thực tế.`;
};

const buildDiagnosisDescriptionText = (diagnosisResult) => {
  if (!diagnosisResult) return "Không có dữ liệu chẩn đoán.";

  const confidenceWarning = buildLowConfidenceMessage(diagnosisResult);
  const topPredictionLines = (diagnosisResult.top_predictions || [])
    .slice(0, 3)
    .map(
      (prediction, index) =>
        `${index + 1}. ${prediction.disease || prediction.class_name}: ${formatPercent(prediction.confidence)}`
    );

  return [
    `Kết quả AI: ${diagnosisResult.disease || "Không xác định"}`,
    `Độ tin cậy: ${formatPercent(diagnosisResult.confidence)}`,
    confidenceWarning ? `Lưu ý: ${confidenceWarning}` : null,
    topPredictionLines.length > 0 ? "Top dự đoán:" : null,
    ...topPredictionLines,
    "Nguồn: AI chẩn đoán bệnh lúa",
  ]
    .filter(Boolean)
    .join("\n");
};

let transientAIScanState = {
  selectedImage: null,
  result: null,
  error: null,
};

const AIScan = () => {
  const { toast } = useFeedback();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(
    () => transientAIScanState.selectedImage
  );
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => transientAIScanState.result);
  const [error, setError] = useState(() => transientAIScanState.error);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState([]);
  const [plots, setPlots] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [selectAllPlots, setSelectAllPlots] = useState(true);
  const [detectedDate, setDetectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

  useEffect(() => {
    transientAIScanState = {
      selectedImage,
      result,
      error,
    };
  }, [selectedImage, result, error]);

  useEffect(() => {
    if (showModal) {
      const fetchFields = async () => {
        try {
          const res = await api.get("/fields");
          const fieldList = (res.data || []).filter(
            (field) => Number(field.myPlotCount || 0) > 0
          );
          setFields(fieldList);
          setSelectedField(fieldList[0]?._id || "");
        } catch (fetchError) {
          console.error("Lỗi khi tải danh sách cánh đồng", fetchError);
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
        const seasonsRes = await api.get("/season-details", {
          params: { fieldId: selectedField },
        });

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
  const topPredictions = useMemo(
    () =>
      Array.isArray(result?.top_predictions)
        ? result.top_predictions.slice(0, 3)
        : [],
    [result]
  );
  const confidenceWarning = useMemo(
    () => buildLowConfidenceMessage(result),
    [result]
  );
  const confidenceLevel = useMemo(
    () => getConfidenceLevel(result?.confidence ?? 0, Boolean(result?.is_low_confidence)),
    [result]
  );

  const handleAskAI = () => {
    navigate("/ask-ai", { state: { result } });
  };

  const handleSaveDiseaseLog = async () => {
    if (!result) return;

    if (!selectedField) {
      toast.warning("Vui lòng chọn cánh đồng.");
      return;
    }

    if (!selectedSeason) {
      toast.warning("Không tìm thấy mùa vụ đang canh tác cho cánh đồng này.");
      return;
    }

    if (!selectAllPlots && selectedPlotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa hoặc chọn tất cả các thửa.");
      return;
    }

    const payload = {
      diseaseName: result.disease || "Không xác định",
      confidence: result.confidence,
      title: `Phát hiện bệnh: ${result.disease || "Không xác định"}`,
      description: buildDiagnosisDescriptionText(result),
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
      toast.success("Đã lưu nhật ký bệnh thành công.");
      setShowModal(false);
    } catch (saveError) {
      console.error("Lỗi khi lưu nhật ký bệnh", saveError);
      toast.error(
        saveError?.response?.data?.message ||
          "Không thể lưu nhật ký. Vui lòng thử lại."
      );
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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setResult(null);
    setError(null);
  };

  const handleRescan = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setShowModal(false);
    setSaveLoading(false);
    setSelectedPlotIds([]);
    setSelectAllPlots(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    transientAIScanState = {
      selectedImage: null,
      result: null,
      error: null,
    };
  };

  const handleScan = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      const res = await api.post("/ai/diagnose", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const scanResult = res.data.data;
      setResult(scanResult);

      if (scanResult?.is_low_confidence) {
        toast.warning("Kết quả AI chưa đủ chắc chắn. Hãy xem thêm top 3 dự đoán.");
      }
    } catch (scanError) {
      console.error(scanError);
      setError("Không thể chẩn đoán. Vui lòng kiểm tra lại hệ thống AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <label
                htmlFor="upload-input"
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  previewUrl
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
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
                    <p className="text-xs text-gray-400">PNG, JPG (tối đa 5MB)</p>
                  </div>
                )}

                <input
                  id="upload-input"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleScan}
                disabled={!selectedImage || loading}
                className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                  !selectedImage || loading
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 active:scale-95"
                }`}
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

              <button
                type="button"
                onClick={handleRescan}
                disabled={loading}
                className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Quét lại
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {!result && !loading && !error && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
                  <Sprout size={40} />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Sẵn sàng chẩn đoán</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs">
                  Hệ thống hỗ trợ nhận diện 10 nhóm bệnh và trạng thái lá lúa bình thường.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-start gap-4">
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-red-800">Đã xảy ra lỗi</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
                  <h3 className="font-bold text-lg">Kết Quả Phân Tích</h3>
                  <CheckCircle size={24} />
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Bệnh được phát hiện
                    </span>
                    <h2
                      className={`text-3xl font-extrabold mt-1 ${
                        result.is_low_confidence ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {result.disease}
                    </h2>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Độ tin cậy
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            result.is_low_confidence ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, (result.confidence || 0) * 100))}%` }}
                        />
                      </div>
                      <span className={`font-bold text-lg ${confidenceLevel.color}`}>
                        {formatPercent(result.confidence)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      Mức độ chắc chắn: {confidenceLevel.text}
                    </p>
                  </div>

                  {confidenceWarning && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-amber-900">Kết quả cần kiểm tra thêm</p>
                          <p className="mt-1 text-sm text-amber-800">{confidenceWarning}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {topPredictions.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Top 3 dự đoán
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Nếu các kết quả đứng đầu quá sát nhau, bạn nên đối chiếu thêm ảnh và triệu chứng thực tế.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {topPredictions.map((prediction, index) => (
                          <div key={`${prediction.class_name}-${index}`} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
                                    index === 0
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-gray-200 text-gray-600"
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <span className="font-semibold text-gray-800">
                                  {prediction.disease || prediction.class_name}
                                </span>
                              </div>
                              <span className="font-semibold text-gray-600">
                                {formatPercent(prediction.confidence)}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-white">
                              <div
                                className={`h-full rounded-full ${
                                  index === 0 ? "bg-emerald-500" : "bg-gray-400"
                                }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, (prediction.confidence || 0) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Chọn cánh đồng
                  </label>
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
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Mùa vụ đang canh tác
                  </label>
                  <div className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-gray-50 text-sm text-gray-700 min-h-[44px] flex items-center">
                      {activeSeason ? activeSeason.name : "Không có mùa vụ active"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Ngày phát hiện bệnh
                </label>
                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
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
                  <label className="text-sm font-semibold text-gray-700">
                    Chọn thửa ruộng
                  </label>
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
                    <p className="text-sm text-gray-500 p-2">
                      Cánh đồng này chưa có thửa ruộng.
                    </p>
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
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">
                  Chi tiết sẽ lưu
                </p>
                <p className="text-sm text-emerald-900 mt-1">Danh mục: Bệnh</p>
                <p className="text-sm text-emerald-900">Bệnh: {result?.disease || "-"}</p>
                <p className="text-sm text-emerald-900">
                  Độ tin cậy:{" "}
                  {typeof result?.confidence === "number"
                    ? formatPercent(result.confidence)
                    : "-"}
                </p>
                {confidenceWarning && (
                  <p className="text-sm text-amber-700 mt-1">Lưu ý: {confidenceWarning}</p>
                )}
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
                    saveLoading || !result
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"
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
