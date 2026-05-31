import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Loader2, X } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CustomDropdown from "../../../components/UI/CustomDropdown";

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
  const [selectAllPlots, setSelectAllPlots] = useState(true);
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
    setSelectAllPlots(true);
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
        setSelectAllPlots(true);
        setSelectedPlotIds([]);
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

  const canSave = Boolean(
    result && currentSeason && currentSeason.status === "active",
  );

  const togglePlotSelection = (plotId) => {
    if (selectAllPlots) {
      setSelectAllPlots(false);
      setSelectedPlotIds([plotId]);
      return;
    }

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

    if (!selectAllPlots && selectedPlotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa hoặc chọn tất cả các thửa.");
      return;
    }

    const allPlotIds = loggablePlots.map((p) => p._id);
    const finalPlotIds = selectAllPlots ? allPlotIds : selectedPlotIds;
    const scope =
      selectAllPlots || finalPlotIds.length === allPlotIds.length
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
      plotIds: finalPlotIds,
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

  const seasonOptions = seasons.map((season) => ({
    value: season._id,
    label: formatSeasonLabel(season),
  }));

  const confidenceWarning = buildLowConfidenceMessage(result);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
          <div>
            <p className="text-sm font-semibold text-emerald-50/80">
              Ghi nhận ca phát hiện
            </p>
            <h3 className="text-xl font-bold">Lưu nhật ký bệnh</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-white/15"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingModal ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          ) : (
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

              {!loadingModal &&
                (!currentSeason || currentSeason.status !== "active") && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0 text-amber-500"
                    />
                    <p className="text-sm text-amber-800">
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
                    <div className="flex min-h-[50px] items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-800">
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

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Thửa ruộng bị ảnh hưởng
                  </label>
                  {loggablePlots.length > 0 && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectAllPlots}
                        className="accent-emerald-600"
                        onChange={(e) => {
                          setSelectAllPlots(e.target.checked);
                          if (e.target.checked) setSelectedPlotIds([]);
                        }}
                      />
                      Tất cả các thửa ({loggablePlots.length})
                    </label>
                  )}
                </div>

                <div className="max-h-52 space-y-2 overflow-y-auto rounded-[22px] border border-slate-200 bg-slate-50 p-2">
                  {loggablePlots.length === 0 ? (
                    <p className="p-3 text-sm text-slate-400">
                      {selectedField
                        ? "Cánh đồng này chưa có thửa canh tác."
                        : "Vui lòng chọn cánh đồng."}
                    </p>
                  ) : (
                    loggablePlots.map((plot) => {
                      const checked =
                        selectAllPlots || selectedPlotIds.includes(plot._id);
                      return (
                        <label
                          key={plot._id}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 py-3 transition-all ${
                            checked
                              ? "border-emerald-300 shadow-sm shadow-emerald-50"
                              : "border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            className="accent-emerald-600"
                            onChange={() => togglePlotSelection(plot._id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-medium ${checked ? "text-emerald-700" : "text-slate-700"}`}
                            >
                              {plot.name}
                            </p>
                            {plot.area ? (
                              <p className="text-xs text-slate-400">
                                {Number(plot.area).toLocaleString("vi-VN")} m²
                              </p>
                            ) : null}
                          </div>
                        </label>
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
                  <p className="text-sm text-amber-800">{confidenceWarning}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
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
