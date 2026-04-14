import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle,
  Crop,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Save,
  ScanLine,
  UploadCloud,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GuideModal from "../components/AIScan/GuideModal";
import ImageCropModal from "../components/AIScan/ImageCropModal";
import { useFeedback } from "../hooks/useFeedback";
import api from "../services/api";

const formatPercent = (score) =>
  typeof score === "number" ? `${(score * 100).toFixed(1)}%` : "Không xác định";

const formatFileSize = (sizeInBytes) => {
  if (typeof sizeInBytes !== "number" || Number.isNaN(sizeInBytes)) {
    return "--";
  }

  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
};

const getConfidenceMeta = (score, isLowConfidence = false) => {
  if (isLowConfidence) {
    return {
      label: "Cần kiểm tra thêm",
      color: "text-amber-700",
      chipClass: "bg-amber-100 text-amber-800",
      bannerClass: "from-amber-500 to-orange-500",
      barClass: "bg-amber-500",
    };
  }

  if (score > 0.8) {
    return {
      label: "Rất cao",
      color: "text-emerald-700",
      chipClass: "bg-emerald-100 text-emerald-800",
      bannerClass: "from-emerald-600 to-teal-600",
      barClass: "bg-emerald-500",
    };
  }

  if (score > 0.5) {
    return {
      label: "Trung bình",
      color: "text-lime-700",
      chipClass: "bg-lime-100 text-lime-800",
      bannerClass: "from-lime-600 to-emerald-600",
      barClass: "bg-lime-500",
    };
  }

  return {
    label: "Thấp",
    color: "text-rose-700",
    chipClass: "bg-rose-100 text-rose-800",
    bannerClass: "from-rose-600 to-orange-500",
    barClass: "bg-rose-500",
  };
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
      `độ tin cậy dưới ngưỡng ${formatPercent(
        diagnosisResult.confidence_threshold
      )}`
    );
  }

  if (
    typeof diagnosisResult?.confidence_gap === "number" &&
    typeof diagnosisResult?.confidence_gap_threshold === "number" &&
    diagnosisResult.confidence_gap < diagnosisResult.confidence_gap_threshold
  ) {
    reasons.push(
      `top 1 và top 2 chỉ lệch ${formatPercent(diagnosisResult.confidence_gap)}`
    );
  }

  return reasons.length === 0
    ? "Kết quả AI chưa đủ chắc chắn. Bạn nên kiểm tra thêm bằng ảnh rõ hơn hoặc đối chiếu thực tế."
    : `Kết quả AI chưa đủ chắc chắn vì ${reasons.join(
      " và "
    )}. Bạn nên kiểm tra thêm bằng ảnh rõ hơn hoặc đối chiếu thực tế.`;
};

const buildDiagnosisDescriptionText = (diagnosisResult) => {
  if (!diagnosisResult) return "Không có dữ liệu chẩn đoán.";

  const confidenceWarning = buildLowConfidenceMessage(diagnosisResult);
  const topPredictionLines = (diagnosisResult.top_predictions || [])
    .slice(0, 3)
    .map(
      (prediction, index) =>
        `${index + 1}. ${prediction.disease || prediction.class_name}: ${formatPercent(
          prediction.confidence
        )}`
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

const READY_NOTES = [
  "Ảnh sẽ được crop tự động loại bỏ bớt nền thừa trước khi phân tích.",
  "Để có kết quả tốt nhất, hãy chọn ảnh rõ nét và đủ ánh sáng ở vùng lá bệnh.",
  "AI hỗ trợ nhận diện các bệnh phổ biến như Đạo ôn, Bạc lá, Lem lép hạt..."
];

let transientAIScanState = {
  selectedImage: null,
  result: null,
  error: null,
};

const AIScan = () => {
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const fileInputRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(
    () => transientAIScanState.selectedImage
  );
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => transientAIScanState.result);
  const [error, setError] = useState(() => transientAIScanState.error);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [cropSourceFile, setCropSourceFile] = useState(null);

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
    if (!showSaveModal) return;

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
  }, [showSaveModal]);

  useEffect(() => {
    if (!showSaveModal || !selectedField) {
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

        setPlots(active?.loggablePlots || []);
        setSeasons(seasonList);
        setSelectedSeason(active?._id || "");
        setSelectAllPlots(true);
        setSelectedPlotIds([]);
      } catch (fetchError) {
        console.error("Lỗi khi tải mùa vụ hoặc thửa ruộng", fetchError);
      }
    };

    fetchFieldData();
  }, [selectedField, showSaveModal]);

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

  const confidenceMeta = useMemo(
    () =>
      getConfidenceMeta(result?.confidence ?? 0, Boolean(result?.is_low_confidence)),
    [result]
  );

  const selectedImageInfo = useMemo(() => {
    if (!selectedImage) return null;

    const extension =
      selectedImage.name?.split(".").pop()?.toUpperCase() ||
      selectedImage.type?.split("/").pop()?.toUpperCase() ||
      "IMG";

    return {
      name: selectedImage.name || "Ảnh đã crop",
      extension,
      size: formatFileSize(selectedImage.size),
    };
  }, [selectedImage]);

  const resultTips = useMemo(() => {
    if (!result) return [];

    if (result.is_low_confidence) {
      return [
        "Quét lại bằng ảnh gần và rõ hơn.",
        "Đối chiếu thêm với dấu hiệu ngoài ruộng.",
      ];
    }

    return [
      "Lưu ca này vào nhật ký bệnh.",
      "Hỏi AI để lấy hướng xử lý tiếp theo.",
    ];
  }, [result]);

  const confidencePercent = Math.max(
    0,
    Math.min(100, (result?.confidence || 0) * 100)
  );

  const gapPercent = Math.max(
    0,
    Math.min(100, (result?.confidence_gap || 0) * 100)
  );

  const handleAskAI = () => {
    navigate("/ask-ai", { state: { result } });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCropSourceFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropConfirm = async (croppedFile) => {
    setSelectedImage(croppedFile);
    setResult(null);
    setError(null);
    setCropSourceFile(null);
  };

  const handleCropClose = () => {
    setCropSourceFile(null);
  };

  const handleRecrop = () => {
    if (!selectedImage) return;
    setCropSourceFile(selectedImage);
  };

  const handleRescan = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setShowSaveModal(false);
    setCropSourceFile(null);
    setSelectedPlotIds([]);
    setSelectAllPlots(true);
    setSaveLoading(false);

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
        toast.warning("Kết quả AI chưa đủ chắc chắn. Hãy đối chiếu thêm top 3 dự đoán.");
      }
    } catch (scanError) {
      console.error(scanError);
      setError("Không thể chẩn đoán. Vui lòng kiểm tra lại hệ thống AI.");
    } finally {
      setLoading(false);
    }
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
      setShowSaveModal(false);
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

  const uploadPanel = (
    <section className="flex min-h-0 flex-col overflow-y-auto custom-scrollbar rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Ảnh đầu vào</p>
          <h3 className="text-xl font-bold text-slate-900">Khung ảnh dùng để quét AI</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <BookOpen size={14} />
            Hướng dẫn
          </button>
          {selectedImageInfo ? (
            <>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                {selectedImageInfo.extension}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {selectedImageInfo.size}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Đã crop vuông
              </span>
            </>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
              PNG, JPG tối đa 5MB
            </span>
          )}
        </div>
      </div>

      <label
        htmlFor="upload-input"
        className={`mt-4 flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed transition-colors ${previewUrl
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
          }`}
      >
        {previewUrl ? (
          <div className="relative flex h-full w-full items-center justify-center p-4">
            <img
              src={previewUrl}
              alt="Ảnh đã chọn"
              className="h-full w-full rounded-[22px] object-contain"
            />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
              Ảnh đã sẵn sàng để quét
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-slate-950/70 px-4 py-3 text-white backdrop-blur-sm">
              <p className="truncate text-sm font-semibold">{selectedImageInfo?.name}</p>
              <p className="mt-1 text-xs text-white/70">
                Có thể crop lại bất cứ lúc nào trước khi quét.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-emerald-600 shadow-[0_18px_45px_-24px_rgba(5,150,105,0.5)] ring-1 ring-emerald-100">
              <UploadCloud size={34} />
            </div>
            <h4 className="mt-6 text-2xl font-bold text-slate-900">
              Chọn ảnh lá lúa để bắt đầu
            </h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Ngay sau khi tải lên, hệ thống sẽ mở bước crop để bạn chọn đúng vùng lá cần chẩn đoán.
            </p>
          </div>
        )}
      </label>

      <input
        id="upload-input"
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <label
          htmlFor="upload-input"
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <UploadCloud size={18} />
          Tải ảnh mới
        </label>

        <button
          type="button"
          onClick={handleRecrop}
          disabled={!selectedImage || loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Crop size={18} />
          Crop lại
        </button>

        <button
          type="button"
          onClick={handleRescan}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <RefreshCcw size={18} />
          Làm mới
        </button>

        <button
          type="button"
          onClick={handleScan}
          disabled={!selectedImage || loading}
          className={`ml-auto inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white transition-colors ${!selectedImage || loading
              ? "cursor-not-allowed bg-slate-300"
              : "bg-emerald-600 hover:bg-emerald-700"
            }`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <ScanLine size={18} />
              Chẩn đoán ngay
            </>
          )}
        </button>
      </div>
    </section>
  );

  const resultPanel = (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        {!selectedImage && !loading && !result && !error && (
        <div className="flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Kết quả phân tích</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">Chờ ảnh đầu vào</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tải ảnh trước, crop đúng vùng lá rồi bấm chẩn đoán để kết quả hiển thị ngay tại đây.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {READY_NOTES.map((note) => (
              <div
                key={note}
                className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600"
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedImage && !loading && !result && !error && (
        <div className="flex h-full flex-col justify-between">
          <div className="rounded-[24px] bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Ảnh đã sẵn sàng</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Có thể gửi AI chẩn đoán ngay
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Nếu cần, bạn có thể crop lại trước khi bấm chẩn đoán để lấy đúng vùng lá muốn phân tích.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Trạng thái ảnh
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">Đã crop và chờ quét</p>
            </div>
            <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Gợi ý
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">Bấm “Chẩn đoán ngay”</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">AI đang xử lý</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Đang phân tích ảnh lá lúa
            </h3>
          </div>

          <div className="mt-5 space-y-4">
            {[
              "Chuẩn hóa ảnh đầu vào",
              "So khớp với mô hình chẩn đoán",
              "Tổng hợp dự đoán có khả năng cao nhất",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-emerald-900">
                  <span>{step}</span>
                  <Loader2 size={16} className="animate-spin" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full animate-pulse rounded-full bg-emerald-500"
                    style={{ width: `${68 + index * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex h-full flex-col justify-between rounded-[24px] border border-rose-100 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-rose-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-700">Không thể phân tích ảnh</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Có lỗi trong lúc chẩn đoán
              </h3>
              <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="flex h-full flex-col">
          <div className={`rounded-[24px] bg-gradient-to-r p-4 text-white ${confidenceMeta.bannerClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                  Kết quả chính
                </p>
                <h3 className="mt-2 text-3xl font-bold">{result.disease}</h3>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                {confidenceMeta.label}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Độ tin cậy
              </p>
              <p className={`mt-2 text-2xl font-bold ${confidenceMeta.color}`}>
                {formatPercent(result.confidence)}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${confidenceMeta.barClass}`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Lệch với top 2
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatPercent(result.confidence_gap)}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-slate-400"
                  style={{ width: `${gapPercent}%` }}
                />
              </div>
            </div>
          </div>

          {confidenceWarning && (
            <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="font-semibold text-amber-900">Kết quả cần kiểm tra thêm</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {confidenceWarning}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Top 3 dự đoán</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceMeta.chipClass}`}>
                {confidenceMeta.label}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {topPredictions.map((prediction, index) => (
                <div
                  key={`${prediction.class_name}-${index}`}
                  className="rounded-[18px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {index + 1}. {prediction.disease || prediction.class_name}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">
                      {formatPercent(prediction.confidence)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${index === 0 ? confidenceMeta.barClass : "bg-slate-400"
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

          <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Nên làm tiếp</p>
            <div className="mt-3 space-y-2">
              {resultTips.map((tip, index) => (
                <div
                  key={tip}
                  className="flex items-start gap-3 rounded-[18px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100"
                >
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>

      {result && !loading && (
        <div className="border-t border-slate-100 bg-white p-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <Save size={18} />
              Lưu nhật ký
            </button>
            <button
              type="button"
              onClick={handleAskAI}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageSquare size={18} />
              Hỏi AI
            </button>
          </div>
        </div>
      )}
    </section>
  );

  const saveModal = showSaveModal ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
          <div>
            <p className="text-sm font-semibold text-emerald-50/80">Ghi nhận ca phát hiện</p>
            <h3 className="text-xl font-bold">Lưu nhật ký bệnh</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowSaveModal(false)}
            className="rounded-xl p-2 transition-colors hover:bg-white/15"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="space-y-5">
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Tóm tắt bản ghi
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Bệnh</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {result?.disease || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Độ tin cậy</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {typeof result?.confidence === "number"
                      ? formatPercent(result.confidence)
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Chọn cánh đồng
                </label>
                <select
                  value={selectedField}
                  onChange={(event) => setSelectedField(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
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
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Mùa vụ đang canh tác
                </label>
                <div className="flex min-h-[50px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {activeSeason ? activeSeason.name : "Không có mùa vụ active"}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Ngày phát hiện bệnh
              </label>
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={detectedDate}
                  onChange={(event) => setDetectedDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Chọn thửa ruộng
                </label>
                <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectAllPlots}
                    onChange={(event) => {
                      setSelectAllPlots(event.target.checked);
                      if (event.target.checked) {
                        setSelectedPlotIds([]);
                      }
                    }}
                  />
                  Tất cả các thửa
                </label>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto rounded-[22px] border border-slate-200 bg-slate-50 p-2">
                {plots.length === 0 && (
                  <p className="p-3 text-sm text-slate-500">
                    Cánh đồng này chưa có thửa ruộng.
                  </p>
                )}

                {plots.map((plot) => (
                  <label
                    key={plot._id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-3"
                  >
                    <span className="text-sm text-slate-700">{plot.name}</span>
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
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowSaveModal(false)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveDiseaseLog}
            disabled={saveLoading || !result}
            className={`rounded-2xl px-4 py-3 font-semibold text-white transition-colors ${saveLoading || !result
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700"
              }`}
          >
            {saveLoading ? "Đang lưu..." : "Xác nhận lưu nhật ký"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden bg-[#f4f8f5] p-4 md:p-5">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
        <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[1.06fr_0.94fr]">
          {uploadPanel}
          {resultPanel}
        </div>
      </div>

      {saveModal}
      <GuideModal open={showGuideModal} onClose={() => setShowGuideModal(false)} />
      <ImageCropModal
        open={Boolean(cropSourceFile)}
        imageFile={cropSourceFile}
        onClose={handleCropClose}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};

export default AIScan;
