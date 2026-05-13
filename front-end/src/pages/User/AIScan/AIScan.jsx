import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
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
import GuideModal from "./GuideModal";
import ImageCropModal from "./ImageCropModal";
import SaveDiseaseLogModal from "./SaveDiseaseLogModal";
import { useFeedback } from "../../../hooks/useFeedback";
import api from "../../../services/api";

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

const isRejectedDiagnosis = (scanResult) =>
  scanResult?.status === "rejected" ||
  scanResult?.error_code === "UNSUPPORTED_IMAGE";

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
        diagnosisResult.confidence_threshold,
      )}`,
    );
  }

  if (
    typeof diagnosisResult?.confidence_gap === "number" &&
    typeof diagnosisResult?.confidence_gap_threshold === "number" &&
    diagnosisResult.confidence_gap < diagnosisResult.confidence_gap_threshold
  ) {
    reasons.push(
      `top 1 và top 2 chỉ lệch ${formatPercent(diagnosisResult.confidence_gap)}`,
    );
  }

  return reasons.length === 0
    ? "Kết quả AI chưa đủ chắc chắn. Bạn nên kiểm tra thêm bằng ảnh rõ hơn hoặc đối chiếu thực tế."
    : `Kết quả AI chưa đủ chắc chắn vì ${reasons.join(
        " và ",
      )}. Bạn nên kiểm tra thêm bằng ảnh rõ hơn hoặc đối chiếu thực tế.`;
};

const READY_NOTES = [
  // "Ảnh sẽ được crop tự động loại bỏ bớt nền thừa trước khi phân tích.",
  "Để có kết quả tốt nhất, hãy chọn ảnh rõ nét và đủ ánh sáng ở vùng lá bệnh.",
  "AI hỗ trợ nhận diện các bệnh phổ biến như Đạo ôn, Bạc lá, Lem lép hạt...",
];

const sortSeasons = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return (
      new Date(b.startDate || b.createdAt || 0) -
      new Date(a.startDate || a.createdAt || 0)
    );
  });

const formatSeasonLabel = (season) => {
  if (!season) return "";
  const year = season.startDate ? new Date(season.startDate).getFullYear() : "";
  const baseName = season.seasonName || season.name || "Mùa vụ";
  return year ? `${baseName} ${year}` : baseName;
};

let transientAIScanState = {
  selectedImage: null,
  result: null,
  error: null,
};

const AIScan = () => {
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(
    () => transientAIScanState.selectedImage,
  );
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => transientAIScanState.result);
  const [error, setError] = useState(() => transientAIScanState.error);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [cropSourceFile, setCropSourceFile] = useState(null);

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

  const topPredictions = useMemo(
    () =>
      Array.isArray(result?.top_predictions)
        ? result.top_predictions.slice(0, 3)
        : [],
    [result],
  );

  const confidenceWarning = useMemo(
    () => buildLowConfidenceMessage(result),
    [result],
  );

  const confidenceMeta = useMemo(
    () =>
      getConfidenceMeta(
        result?.confidence ?? 0,
        Boolean(result?.is_low_confidence),
      ),
    [result],
  );

  const rejectedDiagnosis = useMemo(
    () => isRejectedDiagnosis(result),
    [result],
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

    if (isRejectedDiagnosis(result)) {
      return [
        "Chụp lại ảnh cận cảnh đúng phần lá lúa nghi nhiễm bệnh.",
        "Đảm bảo ảnh đủ sáng, không rung và không bị che khuất.",
      ];
    }

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
    Math.min(100, (result?.confidence || 0) * 100),
  );

  const gapPercent = Math.max(
    0,
    Math.min(100, (result?.confidence_gap || 0) * 100),
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

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
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

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
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
        toast.warning(
          "Kết quả AI chưa đủ chắc chắn. Hãy đối chiếu thêm top 3 dự đoán.",
        );
      }
    } catch (scanError) {
      console.error(scanError);
      const response = scanError?.response;
      const payload = response?.data;

      if (response?.status === 422 && payload?.rejected) {
        setError(null);
        setResult({
          ...(payload?.data || {}),
          status: "rejected",
          error_code: payload?.errorCode || "UNSUPPORTED_IMAGE",
          message:
            payload?.message ||
            "Ảnh tải lên không đủ điều kiện để chẩn đoán bệnh lá lúa.",
          guidance:
            payload?.guidance ||
            "Vui lòng dùng ảnh cận cảnh lá lúa rõ nét, đủ ánh sáng.",
        });
        toast.warning(
          "Ảnh chưa phù hợp để chẩn đoán. Vui lòng chụp lại ảnh lá lúa rõ hơn.",
        );
      } else if (response?.status === 400) {
        setResult(null);
        setError(
          payload?.message ||
            "Ảnh đầu vào không hợp lệ. Vui lòng chọn ảnh khác.",
        );
      } else {
        setResult(null);
        setError("Không thể dự đoán. Vui lòng kiểm tra lại hệ thống AI.");
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadPanel = (
    <section className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:min-h-0 md:overflow-y-auto md:custom-scrollbar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Ảnh đầu vào</p>
          <h3 className="text-xl font-bold text-slate-900">
            Khung ảnh dùng để quét AI
          </h3>
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
        className={`mt-4 flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed transition-colors md:min-h-0 md:flex-1 ${
          previewUrl
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
        }`}
      >
        {previewUrl ? (
          <div className="relative flex min-h-[220px] w-full items-center justify-center p-4 md:h-full">
            <img
              src={previewUrl}
              alt="Ảnh đã chọn"
              className="h-full w-full rounded-[22px] object-contain"
            />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
              Ảnh đã sẵn sàng để quét
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-slate-950/70 px-4 py-3 text-white backdrop-blur-sm">
              <p className="truncate text-sm font-semibold">
                {selectedImageInfo?.name}
              </p>
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
              Ngay sau khi tải lên, hệ thống sẽ mở bước crop để bạn chọn đúng
              vùng lá cần dự đoán.
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
      <input
        id="camera-input"
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <label
          htmlFor="camera-input"
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 md:hidden"
        >
          <ScanLine size={18} />
          Camera
        </label>
        <label
          htmlFor="upload-input"
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
        >
          <UploadCloud size={18} />
          Tải ảnh mới
        </label>

        <button
          type="button"
          onClick={handleRecrop}
          disabled={!selectedImage || loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"
        >
          <Crop size={18} />
          Crop lại
        </button>

        <button
          type="button"
          onClick={handleRescan}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"
        >
          <RefreshCcw size={18} />
          Làm mới
        </button>

        <button
          type="button"
          onClick={handleScan}
          disabled={!selectedImage || loading}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white transition-colors sm:ml-auto sm:w-auto ${
            !selectedImage || loading
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
              Dự đoán ngay
            </>
          )}
        </button>
      </div>
    </section>
  );

  const resultPanel = (
    <section className="flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm md:min-h-0">
      <div className="p-5 md:flex-1 md:overflow-y-auto md:custom-scrollbar">
        {!selectedImage && !loading && !result && !error && (
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Kết quả phân tích
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                Sẵn sàng quét AI
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Thực hiện các bước dưới để nhận kết quả dự đoán bệnh lúa từ AI
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    step: 1,
                    title: "Chọn ảnh lá lúa",
                    desc: "Tải ảnh từ máy hoặc chụp trực tiếp từ camera",
                  },
                  {
                    step: 2,
                    title: "Crop vùng lá",
                    desc: "Chọn đúng vùng lá bị bệnh cần dự đoán",
                  },
                  {
                    step: 3,
                    title: "Dự đoán",
                    desc: 'Bấm "Dự đoán ngay" để AI phân tích',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mẹo & Lưu ý
              </p>
              {READY_NOTES.map((note) => (
                <div
                  key={note}
                  className="rounded-[18px] border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-xs leading-5 text-emerald-700"
                >
                  • {note}
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
                  <p className="text-sm font-semibold text-emerald-800">
                    Ảnh đã sẵn sàng
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    Có thể gửi AI dự đoán ngay
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Nếu cần, bạn có thể crop lại trước khi bấm dự đoán để lấy
                    đúng vùng lá muốn phân tích.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Trạng thái ảnh
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  Đã crop và chờ quét
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Gợi ý
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  Bấm “Dự đoán ngay”
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                AI đang xử lý
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                Đang phân tích ảnh lá lúa
              </h3>
            </div>

            <div className="mt-5 space-y-4">
              {[
                "Chuẩn hóa ảnh đầu vào",
                "So khớp với mô hình dự đoán",
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
                <p className="text-sm font-semibold text-rose-700">
                  Không thể phân tích ảnh
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Có lỗi trong lúc dự đoán
                </h3>
                <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="flex h-full flex-col">
            {rejectedDiagnosis ? (
              <div className="rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                      Ảnh chưa phù hợp
                    </p>
                    <h3 className="mt-1 text-2xl font-bold">
                      Không thể chẩn đoán từ ảnh này
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/90">
                      {result.message ||
                        "Ảnh tải lên không đủ điều kiện để chẩn đoán bệnh lá lúa."}
                    </p>
                    {result.guidance && (
                      <p className="mt-2 text-sm leading-6 text-white/90">
                        Gợi ý: {result.guidance}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-[24px] bg-gradient-to-r p-4 text-white ${confidenceMeta.bannerClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                      Kết quả chính
                    </p>
                    <h3 className="mt-2 text-3xl font-bold">
                      {result.disease}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                    {confidenceMeta.label}
                  </span>
                </div>
              </div>
            )}

            {!rejectedDiagnosis && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Độ tin cậy
                  </p>
                  <p
                    className={`mt-2 text-2xl font-bold ${confidenceMeta.color}`}
                  >
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
            )}

            {confidenceWarning && !rejectedDiagnosis && (
              <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900">
                      Kết quả cần kiểm tra thêm
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      {confidenceWarning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!rejectedDiagnosis && (
              <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Top 3 dự đoán
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceMeta.chipClass}`}
                  >
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
                            {index + 1}.{" "}
                            {prediction.disease || prediction.class_name}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-600">
                          {formatPercent(prediction.confidence)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            index === 0
                              ? confidenceMeta.barClass
                              : "bg-slate-400"
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (prediction.confidence || 0) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Nên làm tiếp
              </p>
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

      {result && !loading && !rejectedDiagnosis && (
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

  return (
    <div className="app-page-shell overflow-y-auto bg-[#f4f8f5] p-3 md:overflow-hidden md:p-5">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 md:h-full">
        <div className="grid gap-4 md:min-h-0 md:flex-1 xl:grid-cols-[1.06fr_0.94fr]">
          {uploadPanel}
          {resultPanel}
        </div>
      </div>

      <SaveDiseaseLogModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        result={result}
        selectedImage={selectedImage}
        onSaveSuccess={() => {
          setResult(null);
          setSelectedImage(null);
        }}
      />
      <GuideModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
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
