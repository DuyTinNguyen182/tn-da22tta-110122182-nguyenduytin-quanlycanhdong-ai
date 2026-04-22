import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Edit2,
  ImageIcon,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import api from "../services/api";
import { useFeedback } from "../hooks/useFeedback";
import LoadingScreen from "../components/Layout/LoadingScreen";
import CustomDropdown from "../components/UI/CustomDropdown";
import CustomCheckbox from "../components/UI/CustomCheckbox";

const emptyForm = {
  diseaseName: "",
  description: "",
  detectedAt: new Date().toISOString().slice(0, 10),
  fieldId: "",
  seasonId: "",
  scope: "all_plots",
  plotIds: [],
  status: "unprocessed",
  processingNote: "",
};

const filterStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "unprocessed", label: "Chưa xử lý", dot: "bg-amber-400" },
  { value: "processed", label: "Đã xử lý", dot: "bg-emerald-500" },
];

const formStatusOptions = [
  { value: "unprocessed", label: "Chưa xử lý", dot: "bg-amber-400" },
  { value: "processed", label: "Đã xử lý", dot: "bg-emerald-500" },
];

const scopeOptions = [
  { value: "all_plots", label: "Toàn bộ thửa tham gia vụ" },
  { value: "selected_plots", label: "Chỉ một số thửa" },
];

const getStatusMeta = (status) => {
  if (status === "processed") {
    return { label: "Đã xử lý", className: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Chưa xử lý", className: "bg-amber-100 text-amber-700" };
};

const formatSeasonLabel = (season) => {
  if (!season) return "";
  const year = season.startDate ? new Date(season.startDate).getFullYear() : "";
  const baseName = season.seasonName || season.name || season.seasonLabel || "Mùa vụ";
  return year ? `${baseName} ${year}` : baseName;
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "--");

const DiseaseLogs = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [filterSeasons, setFilterSeasons] = useState([]);
  const [formSeasons, setFormSeasons] = useState([]);
  const [formPlots, setFormPlots] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({
    fieldId: "",
    seasonId: "",
    status: "",
  });
  const [form, setForm] = useState(emptyForm);

  // ── Dropdown options (memoized) ──

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Tất cả cánh đồng" },
      ...fields.map((f) => ({ value: f._id, label: f.name })),
    ],
    [fields]
  );

  const fieldFormOptions = useMemo(
    () => [
      { value: "", label: "Chọn cánh đồng" },
      ...fields.map((f) => ({ value: f._id, label: f.name })),
    ],
    [fields]
  );

  const filterSeasonOptions = useMemo(
    () => [
      { value: "", label: "Tất cả mùa vụ" },
      ...filterSeasons.map((s) => ({
        value: s._id,
        label: formatSeasonLabel(s),
        dot: s.status === "active" ? "bg-emerald-500" : "bg-gray-300",
      })),
    ],
    [filterSeasons]
  );

  const formSeasonOptions = useMemo(
    () => [
      { value: "", label: "Chọn mùa vụ" },
      ...formSeasons.map((s) => ({
        value: s._id,
        label: (() => {
          const year = s.startDate ? new Date(s.startDate).getFullYear() : "";
          const base = s.seasonName || s.name || "Mùa vụ";
          return year ? `${base} ${year}` : base;
        })(),
        dot: s.status === "active" ? "bg-emerald-500" : "bg-gray-300",
      })),
    ],
    [formSeasons]
  );

  // ── Data loading ──

  const loadFields = async () => {
    const res = await api.get("/fields");
    const fieldList = (res.data || []).filter((f) => Number(f.myPlotCount || 0) > 0);
    setFields(fieldList);
    return fieldList;
  };

  const loadSeasonsByField = async (fieldId) => {
    if (!fieldId) return [];
    const res = await api.get("/season-details/member", { params: { fieldId } });
    return res.data || [];
  };

  const loadDiseaseLogs = async (nextFilters) => {
    try {
      setLoading(true);
      const params = {};
      if (nextFilters.fieldId) params.fieldId = nextFilters.fieldId;
      if (nextFilters.seasonId) params.seasonId = nextFilters.seasonId;
      if (nextFilters.status) params.status = nextFilters.status;

      const res = await api.get("/disease-logs", { params });
      setLogs(res.data || []);
    } catch (error) {
      console.error("Lỗi tải nhật ký bệnh", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const fieldList = await loadFields();
        const defaultFieldId = fieldList[0]?._id || "";
        const seasons = defaultFieldId ? await loadSeasonsByField(defaultFieldId) : [];

        setFilters({ fieldId: defaultFieldId, seasonId: "", status: "" });
        setFilterSeasons(seasons);
        await loadDiseaseLogs({ fieldId: defaultFieldId, seasonId: "", status: "" });
      } catch (error) {
        console.error("Lỗi khởi tạo trang nhật ký bệnh", error);
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const syncFormSeasonData = async () => {
      if (!isModalOpen || !form.fieldId) {
        setFormSeasons([]);
        setFormPlots([]);
        return;
      }

      const seasons = await loadSeasonsByField(form.fieldId);
      setFormSeasons(seasons);

      const selectedSeasonId =
        form.seasonId && seasons.some((s) => s._id === form.seasonId)
          ? form.seasonId
          : seasons.find((s) => s.status === "active")?._id || seasons[0]?._id || "";

      const selectedSeason = seasons.find((s) => s._id === selectedSeasonId);
      // Prefer loggablePlots for active, assignedPlots for others
      const plots =
        selectedSeason?.loggablePlots?.length
          ? selectedSeason.loggablePlots
          : selectedSeason?.assignedPlots || [];
      setFormPlots(plots);

      setForm((prev) => ({
        ...prev,
        seasonId: selectedSeasonId,
        plotIds:
          prev.scope === "selected_plots"
            ? prev.plotIds.filter((id) => plots.some((p) => p._id === id))
            : [],
      }));
    };
    syncFormSeasonData();
  }, [isModalOpen, form.fieldId]);

  useEffect(() => {
    if (!isModalOpen || !form.seasonId) {
      setFormPlots([]);
      return;
    }

    const selectedSeason = formSeasons.find((s) => s._id === form.seasonId);
    const plots =
      selectedSeason?.loggablePlots?.length
        ? selectedSeason.loggablePlots
        : selectedSeason?.assignedPlots || [];
    setFormPlots(plots);
    setForm((prev) => ({
      ...prev,
      plotIds:
        prev.scope === "selected_plots"
          ? prev.plotIds.filter((id) => plots.some((p) => p._id === id))
          : [],
    }));
  }, [isModalOpen, form.seasonId, formSeasons]);

  // ── Computed ──

  const filteredLogs = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) => {
      const haystack = [
        log.diseaseName, log.fieldName, log.seasonLabel, log.description,
        ...(log.plotSnapshot || []).map((item) => item.name),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [keyword, logs]);

  const summary = useMemo(
    () => ({
      total: filteredLogs.length,
      unprocessed: filteredLogs.filter((l) => l.status === "unprocessed").length,
      processed: filteredLogs.filter((l) => l.status === "processed").length,
    }),
    [filteredLogs]
  );

  const selectedFormSeason = useMemo(
    () => formSeasons.find((s) => s._id === form.seasonId) || null,
    [formSeasons, form.seasonId]
  );
  const isHistoricalEdit = Boolean(editingLog && selectedFormSeason?.status !== "active");

  // ── Handlers ──

  const openCreateModal = async () => {
    const fieldId = filters.fieldId || fields[0]?._id || "";
    const seasons = fieldId ? await loadSeasonsByField(fieldId) : [];
    const seasonId =
      seasons.find((s) => s.status === "active")?._id || seasons[0]?._id || "";
    const activeSeason = seasons.find((s) => s._id === seasonId);
    const plots =
      activeSeason?.loggablePlots?.length
        ? activeSeason.loggablePlots
        : activeSeason?.assignedPlots || [];

    setEditingLog(null);
    setFormSeasons(seasons);
    setFormPlots(plots);
    setForm({ ...emptyForm, fieldId, seasonId });
    setIsModalOpen(true);
  };

  const openEditModal = async (log) => {
    // Use new field names returned by the updated backend
    const fieldId = log.fieldId || log.field?._id || log.field || "";
    const seasonId = log.seasonId || log.season?._id || log.season || "";

    const seasons = fieldId ? await loadSeasonsByField(fieldId) : [];
    const selectedSeason = seasons.find((s) => s._id === seasonId);

    // Prefer loggablePlots; for historical seasons fall back to plotSnapshot
    const plots =
      selectedSeason?.loggablePlots?.length
        ? selectedSeason.loggablePlots
        : selectedSeason?.assignedPlots?.length
          ? selectedSeason.assignedPlots
          : (log.plotSnapshot || []).map((s) => ({
            _id: String(s.plotId),
            name: s.name,
            area: s.area,
            status: s.status,
          }));

    setEditingLog(log);
    setFormSeasons(seasons);
    setFormPlots(plots);
    setForm({
      diseaseName: log.diseaseName || "",
      description: log.description || "",
      detectedAt: log.detectedAt ? new Date(log.detectedAt).toISOString().slice(0, 10) : "",
      fieldId,
      seasonId,
      scope: log.scope || "all_plots",
      plotIds: (log.plots || []).map((p) => p._id || String(p)),
      status: log.status || "unprocessed",
      processingNote: log.processingNote || "",
      source: log.source || "manual",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!isHistoricalEdit && !form.fieldId) {
      toast.warning("Vui lòng chọn cánh đồng.");
      return;
    }
    if (!form.seasonId) {
      toast.warning("Vui lòng chọn mùa vụ.");
      return;
    }
    if (!isHistoricalEdit && selectedFormSeason?.status !== "active") {
      toast.warning("Chỉ có thể tạo hoặc chỉnh sửa nội dung cho vụ đang canh tác.");
      return;
    }
    if (!isHistoricalEdit && !form.diseaseName.trim()) {
      toast.warning("Vui lòng nhập tên bệnh.");
      return;
    }
    if (!isHistoricalEdit && form.scope === "selected_plots" && form.plotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa.");
      return;
    }

    const payload = {
      diseaseName: form.diseaseName,
      description: form.description,
      detectedAt: form.detectedAt,
      seasonId: form.seasonId,
      scope: form.scope,
      plotIds: form.scope === "selected_plots" ? form.plotIds : [],
      status: form.status,
      processingNote: form.processingNote,
      source: editingLog?.source || "manual",
    };

    try {
      setSaving(true);
      if (editingLog) {
        // PUT — không có ảnh, gửi JSON bình thường
        await api.put(`/disease-logs/${editingLog._id}`, payload);
      } else {
        // POST — gửi FormData để tương thích với upload middleware
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => formData.append(key, v));
          } else if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        });
        await api.post("/disease-logs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setIsModalOpen(false);
      setEditingLog(null);
      setForm(emptyForm);
      toast.success(editingLog ? "Đã cập nhật nhật ký bệnh." : "Đã lưu nhật ký bệnh.");
      await loadDiseaseLogs(filters);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu nhật ký bệnh.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Xóa nhật ký bệnh?",
      message:
        "Nhật ký của vụ đã kết thúc sẽ không thể xóa. Với vụ đang hoạt động, thao tác này sẽ xóa bản ghi hiện tại.",
      confirmText: "Xóa nhật ký",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/disease-logs/${id}`);
      toast.success("Đã xóa nhật ký bệnh.");
      await loadDiseaseLogs(filters);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa nhật ký bệnh.");
    }
  };

  const togglePlot = (plotId) => {
    setForm((prev) => ({
      ...prev,
      plotIds: prev.plotIds.includes(plotId)
        ? prev.plotIds.filter((id) => id !== plotId)
        : [...prev.plotIds, plotId],
    }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
    setForm(emptyForm);
  };

  // ── Render ──

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký bệnh</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Ghi nhận bệnh theo mùa vụ, cánh đồng và phạm vi thửa bị ảnh hưởng.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
        >
          <Plus size={17} /> Thêm nhật ký
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Tổng bản ghi</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Chưa xử lý</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{summary.unprocessed}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Đã xử lý</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.processed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên bệnh, cánh đồng..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <CustomDropdown
            value={filters.fieldId}
            onChange={async (val) => {
              const next = { fieldId: val, seasonId: "", status: filters.status };
              setFilters(next);
              setFilterSeasons(val ? await loadSeasonsByField(val) : []);
              await loadDiseaseLogs(next);
            }}
            options={fieldOptions}
            placeholder="Tất cả cánh đồng"
            className="w-full"
          />

          <CustomDropdown
            value={filters.seasonId}
            onChange={async (val) => {
              const next = { ...filters, seasonId: val };
              setFilters(next);
              await loadDiseaseLogs(next);
            }}
            options={filterSeasonOptions}
            placeholder="Tất cả mùa vụ"
            className="w-full"
          />

          <CustomDropdown
            value={filters.status}
            onChange={async (val) => {
              const next = { ...filters, status: val };
              setFilters(next);
              await loadDiseaseLogs(next);
            }}
            options={filterStatusOptions}
            placeholder="Trạng thái"
            size="default"
            className="min-w-[160px]"
          />
        </div>
      </div>

      {/* Log list */}
      <div className="mt-5 space-y-4">
        {loading ? (
          <LoadingScreen message="Đang tải nhật ký bệnh..." />
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mb-3 rounded-2xl bg-gray-100 p-4">
              <ShieldAlert size={28} className="text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">Chưa có nhật ký bệnh nào phù hợp.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const statusMeta = getStatusMeta(log.status);
            const plotNames =
              (log.plotSnapshot || []).map((item) => item.name).filter(Boolean).join(", ") ||
              "Toàn bộ thửa tham gia vụ";
            const isSeasonActive = log.seasonStatus === "active";
            const seasonLabel =
              log.seasonLabel ||
              (log.season ? formatSeasonLabel(log.season) : null) ||
              "Chưa có mùa vụ";
            const plotCount = log.plotSnapshot?.length || log.plotCount || 0;

            return (
              <article
                key={log._id}
                className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-bold text-gray-900">{log.diseaseName}</h2>
                      <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {log.source === "manual" ? "Thủ công" : "AI scan"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {formatDate(log.detectedAt)}
                      </span>
                      <span>{log.fieldName || "Chưa có cánh đồng"}</span>
                      <span>{seasonLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(log)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log._id)}
                      disabled={!isSeasonActive}
                      className={`rounded-lg p-2 transition-colors ${isSeasonActive
                        ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
                        : "cursor-not-allowed text-gray-300"
                        }`}
                      title={isSeasonActive ? "Xóa" : "Vụ đã kết thúc"}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Body: info + optional image */}
                <div className="mt-4 flex gap-4">
                  {/* Info grid */}
                  <div className="flex-1 grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className="rounded-xl bg-gray-50/80 p-3.5 ring-1 ring-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Phạm vi</p>
                      <p className="mt-1.5 text-sm font-medium text-gray-700">
                        {log.scope === "all_plots" ? "Toàn bộ thửa" : `${plotCount} thửa`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{plotNames}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-3.5 ring-1 ring-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Mô tả bệnh</p>
                      <p className="mt-1.5 text-sm text-gray-700 line-clamp-3">{log.description || "Chưa có mô tả."}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-3.5 ring-1 ring-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Ghi chú xữ lý</p>
                      <p className="mt-1.5 text-sm text-gray-700 line-clamp-3">{log.processingNote || "Chưa có ghi chú."}</p>
                      {log.status === "processed" && log.processedAt && (
                        <p className="mt-1 text-xs text-emerald-600">Xử lý ngày {formatDate(log.processedAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Image thumbnail if from AI scan */}
                  {log.imageUrl && (
                    <a
                      href={log.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/img relative flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                      title="Xem ảnh quét AI"
                    >
                      <img
                        src={log.imageUrl}
                        alt={log.diseaseName}
                        className="h-full w-28 object-cover transition-transform group-hover/img:scale-105"
                        style={{ minHeight: "120px", maxHeight: "140px" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover/img:bg-black/20">
                        <ImageIcon size={18} className="text-white opacity-0 drop-shadow transition-opacity group-hover/img:opacity-100" />
                      </div>
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
            {/* Gradient header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingLog ? "Chỉnh sửa nhật ký bệnh" : "Thêm nhật ký bệnh"}
                </h3>
                <p className="mt-0.5 text-xs text-emerald-200">
                  Ghi nhận bệnh theo mùa vụ và phạm vi thửa.
                </p>
                {isHistoricalEdit && (
                  <p className="mt-1.5 rounded-md bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-100">
                    Vụ đã kết thúc — chỉ cập nhật trạng thái và ghi chú xử lý.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-emerald-200 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-84px)] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Tên bệnh</label>
                  <input
                    value={form.diseaseName}
                    onChange={(e) => setForm((prev) => ({ ...prev, diseaseName: e.target.value }))}
                    disabled={isHistoricalEdit}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    placeholder="Đạo ôn lá, bạc lá..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Ngày phát hiện</label>
                  <input
                    type="date"
                    value={form.detectedAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, detectedAt: e.target.value }))}
                    disabled={isHistoricalEdit}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Cánh đồng</label>
                  <CustomDropdown
                    value={form.fieldId}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, fieldId: val, seasonId: "", plotIds: [] }))
                    }
                    options={fieldFormOptions}
                    placeholder="Chọn cánh đồng"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Mùa vụ đang canh tác</label>
                  {(() => {
                    const currentSeason = formSeasons.find((s) => s._id === form.seasonId);
                    return currentSeason ? (
                      <div className="flex min-h-[42px] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-800">{formatSeasonLabel(currentSeason)}</span>
                      </div>
                    ) : (
                      <div className="flex min-h-[42px] items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400">
                        Không có mùa vụ đang canh tác
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Trạng thái xử lý</label>
                  <CustomDropdown
                    value={form.status}
                    onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
                    options={formStatusOptions}
                    placeholder="Chọn trạng thái"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Phạm vi ghi nhận</label>
                  <CustomDropdown
                    value={form.scope}
                    onChange={(val) =>
                      setForm((prev) => ({
                        ...prev,
                        scope: val,
                        plotIds: val === "all_plots" ? [] : prev.plotIds,
                      }))
                    }
                    options={scopeOptions}
                    placeholder="Chọn phạm vi"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Mô tả bệnh</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={isHistoricalEdit}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    placeholder="Biểu hiện bệnh, vị trí, mức độ..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Ghi chú xử lý</label>
                  <textarea
                    rows={4}
                    value={form.processingNote}
                    onChange={(e) => setForm((prev) => ({ ...prev, processingNote: e.target.value }))}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="Cách xử lý, cần theo dõi thêm không..."
                  />
                </div>
              </div>

              {form.scope === "selected_plots" && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList size={14} className="text-gray-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Chọn thửa bị ảnh hưởng</p>
                  </div>
                  <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 md:grid-cols-2">
                    {formPlots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
                        Chưa có thửa nào tham gia mùa vụ này.
                      </div>
                    ) : (
                      formPlots.map((plot) => {
                        const checked = form.plotIds.includes(plot._id);
                        return (
                          <div
                            key={plot._id}
                            onClick={() => {
                              if (!isHistoricalEdit) togglePlot(plot._id);
                            }}
                            className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${checked
                              ? "border-emerald-300 bg-white shadow-sm shadow-emerald-50"
                              : "border-gray-200 bg-white"
                              } ${isHistoricalEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-gray-300"}`}
                          >
                            <CustomCheckbox
                              checked={checked}
                              disabled={isHistoricalEdit}
                              onChange={() => {
                                if (!isHistoricalEdit) togglePlot(plot._id);
                              }}
                            />
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${checked ? "text-emerald-700" : "text-gray-700"}`}>
                                {plot.name}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {Number(plot.area || 0).toLocaleString("vi-VN")} m²
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all ${saving
                    ? "cursor-not-allowed bg-gray-300"
                    : "bg-emerald-600 shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg"
                    }`}
                >
                  <Save size={15} />
                  {saving ? "Đang lưu..." : editingLog ? "Cập nhật" : "Lưu nhật ký"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseLogs;
