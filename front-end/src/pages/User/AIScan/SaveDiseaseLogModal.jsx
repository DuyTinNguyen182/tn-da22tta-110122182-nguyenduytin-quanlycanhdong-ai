import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Loader2, MapPin, X } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import CustomCheckbox from "../../../components/UI/CustomCheckbox";

const getLocalDatetime = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const formatPercent = (score) =>
  typeof score === "number" ? `${(score * 100).toFixed(1)}%` : "Không xác định";

const getSeasonYear = (season) =>
  season?.year ||
  (season?.startDate ? new Date(season.startDate).getFullYear() : "");

const formatSeasonLabel = (season) => {
  if (!season) return "";
  const year = getSeasonYear(season);
  const baseName = season.seasonName || season.name || "Mùa vụ";
  return year ? `${baseName} ${year}` : baseName;
};
const buildDiagnosisDescriptionText = (diagnosisResult) => {
  if (!diagnosisResult) return "Không có dữ liệu chẩn đoán.";

  const topPredictionLines = (diagnosisResult.top_predictions || [])
    .slice(0, 3)
    .map(
      (prediction, index) =>
        `${index + 1}. ${prediction.disease || prediction.class_name}: ${formatPercent(
          prediction.confidence,
        )}`,
    );

  return [
    `Kết quả AI: ${diagnosisResult.disease || "Không xác định"}`,
    `Độ tin cậy: ${formatPercent(diagnosisResult.confidence)}`,
    topPredictionLines.length > 0 ? "Top dự đoán:" : null,
    ...topPredictionLines,
    "Nguồn: AI chẩn đoán bệnh lúa",
  ]
    .filter(Boolean)
    .join("\n");
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

const sortSeasons = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return (
      new Date(b.startDate || b.createdAt || 0) -
      new Date(a.startDate || a.createdAt || 0)
    );
  });

const SaveDiseaseLogModal = ({
  open,
  onClose,
  result,
  selectedImage,
  onSaveSuccess,
}) => {
  const { toast } = useFeedback();

  const [fields, setFields] = useState([]);
  const [plots, setPlots] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedField, setSelectedField] = useState(null);
  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [detectedDate, setDetectedDate] = useState(getLocalDatetime());
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchFields = async () => {
      try {
        const res = await api.get("/fields");
        const fieldList = (res.data || []).filter(
          (f) => Number(f.myPlotCount || 0) > 0,
        );
        setFields(fieldList);
        setSelectedField(fieldList[0] || null);
      } catch (fetchError) {
        console.error("Lỗi khi tải danh sách cánh đồng", fetchError);
      }
    };

    fetchFields();
    setDetectedDate(getLocalDatetime());
    setSelectedPlotIds([]);
  }, [open]);

  useEffect(() => {
    if (!open || !selectedField?._id) {
      setPlots([]);
      setSeasons([]);
      setSelectedSeason("");
      setSelectedPlotIds([]);
      return;
    }

    const fetchFieldData = async () => {
      try {
        setLoadingModal(true);
        const [seasonsRes, plotsRes] = await Promise.all([
          api.get("/season-details/member", {
            params: { fieldId: selectedField._id },
          }),
          api.get("/plots", { params: { fieldId: selectedField._id } }),
        ]);

        const seasonList = sortSeasons(seasonsRes.data || []);
        const active = seasonList.find((s) => s.status === "active");
        const farmerPlots = (plotsRes.data || []).filter(
          (p) => p.status === "active",
        );

        setSeasons(seasonList);
        setSelectedSeason(active?._id || seasonList[0]?._id || "");
        setPlots(farmerPlots);
      } catch (fetchError) {
        console.error("Lỗi khi tải mùa vụ hoặc thửa ruộng", fetchError);
      } finally {
        setLoadingModal(false);
      }
    };

    fetchFieldData();
  }, [selectedField, open]);

  const currentSeason = useMemo(
    () => seasons.find((s) => s._id === selectedSeason) || null,
    [seasons, selectedSeason],
  );

  const loggablePlots = useMemo(
    () =>
      currentSeason?.loggablePlots?.length
        ? currentSeason.loggablePlots
        : plots,
    [currentSeason, plots],
  );

  useEffect(() => {
    if (open) {
      setSelectedPlotIds(loggablePlots.map((p) => p._id));
    }
  }, [loggablePlots, open]);

  const canSave = Boolean(
    result && currentSeason && currentSeason.status === "active",
  );

  const togglePlotSelection = (plotId) => {
    setSelectedPlotIds((prev) =>
      prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId],
    );
  };

  const handleSaveDiseaseLog = async () => {
    if (!result) return;

    if (!selectedField?._id) {
      toast.warning("Vui lòng chọn cánh đồng.");
      return;
    }

    if (!selectedSeason) {
      toast.warning("Không tìm thấy mùa vụ cho cánh đồng này.");
      return;
    }

    if (currentSeason?.status !== "active") {
      toast.warning("Chỉ có thể lưu nhật ký bệnh cho vụ đang canh tác.");
      return;
    }

    if (selectedPlotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa.");
      return;
    }

    const allPlotIds = loggablePlots.map((p) => p._id);
    const scope =
      selectedPlotIds.length === allPlotIds.length
        ? "all_plots"
        : "selected_plots";

    const payload = {
      diseaseName: result.disease || "Không xác định",
      confidence: result.confidence,
      description: buildDiagnosisDescriptionText(result),
      fieldId: selectedField?._id || "",
      seasonId: selectedSeason,
      date: detectedDate,
      scope,
      plotIds: selectedPlotIds,
      imageName: selectedImage?.name || "",
      source: "ai_scan",
    };

    try {
      setSaveLoading(true);

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(key, v));
        } else {
          formData.append(key, String(value));
        }
      });
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      await api.post("/disease-logs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Đã lưu nhật ký bệnh thành công.");
      onClose();
      onSaveSuccess?.();
    } catch (saveError) {
      console.error("Lỗi khi lưu nhật ký bệnh", saveError);
      toast.error(
        saveError?.response?.data?.message ||
          "Không thể lưu nhật ký. Vui lòng thử lại.",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (!open) return null;

  const fieldOptions = fields.map((field) => ({
    value: field._id,
    label: field.name,
  }));

  const confidenceWarning = buildLowConfidenceMessage(result);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.45)] sm:max-h-[88vh] sm:rounded-[28px]">
        <div className="flex shrink-0 items-start justify-between gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-50/80">
              Ghi nhận ca phát hiện
            </p>
            <h3 className="break-words text-lg font-bold sm:text-xl">
              Lưu nhật ký bệnh
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 transition-colors hover:bg-white/15"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loadingModal ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Tóm tắt bản ghi
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Bệnh</p>
                    <p className="mt-1 break-words font-semibold text-slate-900">
                      {result?.disease || "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Độ tin cậy</p>
                    <p className="mt-1 break-words font-semibold text-slate-900">
                      {typeof result?.confidence === "number"
                        ? formatPercent(result.confidence)
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {!loadingModal &&
                (!currentSeason || currentSeason.status !== "active") && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0 text-amber-500"
                    />
                    <p className="min-w-0 break-words text-sm text-amber-800">
                      Cánh đồng này hiện{" "}
                      <strong>không có mùa vụ đang canh tác</strong>. Bạn chỉ có
                      thể lưu nhật ký khi đang trong một vụ mùa hoạt động.
                    </p>
                  </div>
                )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Chọn cánh đồng
                  </label>
                  <CustomDropdown
                    value={selectedField?._id || ""}
                    onChange={(fieldId) => {
                      const found = fields.find((f) => f._id === fieldId);
                      setSelectedField(found || null);
                    }}
                    options={fieldOptions}
                    placeholder="Chọn cánh đồng..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Mùa vụ đang canh tác
                  </label>
                  {currentSeason?.status === "active" ? (
                    <div className="flex min-h-[50px] min-w-0 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <span className="min-w-0 break-words text-sm font-semibold text-emerald-800">
                        {formatSeasonLabel(currentSeason)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex min-h-[50px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">
                      Không có mùa vụ đang canh tác
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Ngày giờ phát hiện bệnh
                </label>
                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="datetime-local"
                    value={detectedDate}
                    onChange={(e) => setDetectedDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <MapPin size={12} className="text-slate-400" /> Áp dụng cho
                    thửa
                  </label>
                  {loggablePlots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPlotIds.length === loggablePlots.length) {
                          setSelectedPlotIds([]);
                        } else {
                          setSelectedPlotIds(loggablePlots.map((p) => p._id));
                        }
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {selectedPlotIds.length === loggablePlots.length
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả"}
                    </button>
                  )}
                </div>

                <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                  {loggablePlots.length === 0 ? (
                    <div className="col-span-2 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      {selectedField
                        ? "Cánh đồng này chưa có thửa canh tác."
                        : "Vui lòng chọn cánh đồng."}
                    </div>
                  ) : (
                    loggablePlots.map((plot) => {
                      const checked = selectedPlotIds.includes(plot._id);
                      return (
                        <div
                          key={plot._id}
                          onClick={() => togglePlotSelection(plot._id)}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                            checked
                              ? "border-emerald-400 bg-emerald-50/50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <CustomCheckbox
                            checked={checked}
                            onChange={() => {}}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${
                                checked ? "text-emerald-800" : "text-slate-700"
                              }`}
                            >
                              {plot.name}
                            </p>
                          </div>
                          {plot.area ? (
                            <span className="text-[10px] font-medium text-slate-400">
                              {Number(plot.area).toLocaleString("vi-VN")} m²
                            </span>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {confidenceWarning && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-500"
                  />
                  <p className="min-w-0 break-words text-sm text-amber-800">
                    {confidenceWarning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveDiseaseLog}
            disabled={saveLoading || !canSave}
            className={`rounded-2xl px-4 py-3 font-semibold text-white transition-colors ${
              saveLoading || !canSave
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {saveLoading ? "Đang lưu..." : "Xác nhận lưu nhật ký"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDiseaseLogModal;
