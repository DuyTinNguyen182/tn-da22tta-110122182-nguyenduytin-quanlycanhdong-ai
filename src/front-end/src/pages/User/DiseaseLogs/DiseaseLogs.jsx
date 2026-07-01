import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Edit2,
  Eye,
  ImageIcon,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  ShieldAlert,
  Trash2,
  X,
  RefreshCw,
  MapPin,
} from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import CustomCheckbox from "../../../components/UI/CustomCheckbox";

const emptyForm = {
  diseaseName: "",
  description: "",
  detectedAt: "",
  fieldId: "",
  seasonId: "",
  plotIds: [],
  status: "unprocessed",
  processingNote: "",
  imageFile: null,
};

const getLocalDatetime = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
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

const getStatusMeta = (status) => {
  if (status === "processed") {
    return { label: "Đã xử lý", className: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Chưa xử lý", className: "bg-amber-100 text-amber-700" };
};

const getSeasonYear = (season) =>
  season?.year ||
  (season?.startDate ? new Date(season.startDate).getFullYear() : "");

const formatSeasonLabel = (season) => {
  if (!season) return "";
  const year = getSeasonYear(season);
  const baseName =
    season.seasonName || season.name || season.seasonLabel || "Mùa vụ";
  return year ? `${baseName} ${year}` : baseName;
};

const formatDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  return (
    d.toLocaleDateString("vi-VN") +
    " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
};
const getLogPlots = (log) =>
  Array.isArray(log?.plots) ? log.plots.filter(Boolean) : [];

const getSourceLabel = (source) =>
  source === "manual" ? "Thủ công" : "AI scan";

const DetailInfo = ({ label, value, children }) => (
  <div className="rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
      {label}
    </p>
    <div className="mt-1 break-words text-sm font-medium text-gray-700">
      {children || value || "--"}
    </div>
  </div>
);

const DiseaseLogs = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [filterSeasons, setFilterSeasons] = useState([]);
  const [formSeasons, setFormSeasons] = useState([]);
  const [formPlots, setFormPlots] = useState([]);
  const [logs, setLogs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [selectedDetailLog, setSelectedDetailLog] = useState(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({
    fieldId: "",
    seasonId: "",
    status: "",
  });
  const [form, setForm] = useState(emptyForm);

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Tất cả cánh đồng" },
      ...fields.map((f) => ({ value: f._id, label: f.name })),
    ],
    [fields],
  );

  const fieldFormOptions = useMemo(
    () => [
      { value: "", label: "Chọn cánh đồng" },
      ...fields.map((f) => ({ value: f._id, label: f.name })),
    ],
    [fields],
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
    [filterSeasons],
  );

  const loadFields = async () => {
    const res = await api.get("/fields");
    const fieldList = (res.data || []).filter(
      (f) => Number(f.myPlotCount || 0) > 0,
    );
    setFields(fieldList);
    return fieldList;
  };

  const loadSeasonsByField = async (fieldId) => {
    const params = {};
    if (fieldId) params.fieldId = fieldId;
    const res = await api.get("/season-details/member", { params });
    return res.data || [];
  };

  const loadDiseaseLogs = async (nextFilters, limit) => {
    try {
      setLoading(true);
      const params = {};
      if (nextFilters.fieldId) params.fieldId = nextFilters.fieldId;
      if (nextFilters.seasonId) params.seasonId = nextFilters.seasonId;
      if (nextFilters.status) params.status = nextFilters.status;

      const effectiveLimit = typeof limit === "number" ? limit : visibleCount;
      if (effectiveLimit) params.limit = effectiveLimit;

      const res = await api.get("/disease-logs", { params });
      const data = res.data || [];
      setLogs(data);
      setHasMore(Array.isArray(data) ? data.length >= effectiveLimit : false);
    } catch (error) {
      console.error("Lỗi tải nhật ký bệnh", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadFields();

        const seasons = await loadSeasonsByField("");
        setFilterSeasons(seasons);

        const activeSeasonId =
          seasons.find((s) => s.status === "active")?._id || "";
        const defaultFilters = {
          fieldId: "",
          seasonId: activeSeasonId,
          status: "",
        };
        setFilters(defaultFilters);
        setVisibleCount(5);
        await loadDiseaseLogs(defaultFilters, 5);
      } catch (error) {
        console.error("Lỗi khởi tạo trang nhật ký bệnh", error);
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const handleLoadMore = async () => {
    if (loading) return;
    const next = visibleCount + 5;
    setVisibleCount(next);
    await loadDiseaseLogs(filters, next);
  };

  useEffect(() => {
    let isMounted = true;
    const syncFormSeasonData = async () => {
      if (!isModalOpen || !form.fieldId) {
        if (!form.fieldId && isModalOpen) {
          setFormSeasons([]);
          setFormPlots([]);
        }
        return;
      }

      const seasons = await loadSeasonsByField(form.fieldId);
      if (!isMounted) return;
      setFormSeasons(seasons);

      const selectedSeasonId =
        form.seasonId && seasons.some((s) => s._id === form.seasonId)
          ? form.seasonId
          : seasons.find((s) => s.status === "active")?._id || "";

      const selectedSeason = seasons.find((s) => s._id === selectedSeasonId);
      const plots = selectedSeason?.loggablePlots?.length
        ? selectedSeason.loggablePlots
        : selectedSeason?.assignedPlots || [];
      setFormPlots(plots);

      setForm((prev) => {
        const validIds = prev.plotIds.filter((id) =>
          plots.some((p) => p._id === id),
        );
        return {
          ...prev,
          seasonId: selectedSeasonId,
          plotIds: validIds.length > 0 ? validIds : plots.map((p) => p._id),
        };
      });
    };
    syncFormSeasonData();
    return () => {
      isMounted = false;
    };
  }, [isModalOpen, form.fieldId]);

  useEffect(() => {
    if (!isModalOpen || !form.seasonId) {
      return;
    }

    const selectedSeason = formSeasons.find((s) => s._id === form.seasonId);
    if (!selectedSeason) return;

    const plots = selectedSeason?.loggablePlots?.length
      ? selectedSeason.loggablePlots
      : selectedSeason?.assignedPlots || [];
    setFormPlots(plots);

    setForm((prev) => {
      const validIds = prev.plotIds.filter((id) =>
        plots.some((p) => p._id === id),
      );
      return {
        ...prev,
        plotIds: validIds.length > 0 ? validIds : plots.map((p) => p._id),
      };
    });
  }, [isModalOpen, form.seasonId, formSeasons]);

  const filteredLogs = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) => {
      const haystack = [
        log.diseaseName,
        log.fieldName,
        log.seasonLabel,
        log.description,
        ...getLogPlots(log).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [keyword, logs]);

  const summary = useMemo(
    () => ({
      total: filteredLogs.length,
      unprocessed: filteredLogs.filter((l) => l.status === "unprocessed")
        .length,
      processed: filteredLogs.filter((l) => l.status === "processed").length,
    }),
    [filteredLogs],
  );

  const selectedFormSeason = useMemo(
    () => formSeasons.find((s) => s._id === form.seasonId) || null,
    [formSeasons, form.seasonId],
  );
  const isHistoricalEdit = Boolean(
    editingLog && selectedFormSeason?.status !== "active",
  );
  const hasActiveFilters = Boolean(
    keyword.trim() || filters.fieldId || filters.seasonId || filters.status,
  );

  const selectedDetailData = useMemo(() => {
    if (!selectedDetailLog) return null;

    const plots = getLogPlots(selectedDetailLog);
    const plotCount = plots.length || selectedDetailLog.plotCount || 0;
    const seasonLabel =
      selectedDetailLog.seasonLabel ||
      (selectedDetailLog.season
        ? formatSeasonLabel(selectedDetailLog.season)
        : null) ||
      "Chưa có mùa vụ";

    return {
      statusMeta: getStatusMeta(selectedDetailLog.status),
      plots,
      plotCount,
      seasonLabel,
      scopeLabel:
        selectedDetailLog.scope === "all_plots"
          ? "Toàn bộ thửa"
          : `${plotCount} thửa`,
      sourceLabel: getSourceLabel(selectedDetailLog.source),
    };
  }, [selectedDetailLog]);

  const openCreateModal = async () => {
    const fieldId = filters.fieldId || fields[0]?._id || "";
    const seasons = fieldId ? await loadSeasonsByField(fieldId) : [];
    const seasonId = seasons.find((s) => s.status === "active")?._id || "";
    const activeSeason = seasons.find((s) => s._id === seasonId);
    const plots = activeSeason?.loggablePlots?.length
      ? activeSeason.loggablePlots
      : activeSeason?.assignedPlots || [];

    setEditingLog(null);
    setFormSeasons(seasons);
    setFormPlots(plots);
    setForm({
      ...emptyForm,
      fieldId,
      seasonId,
      detectedAt: getLocalDatetime(),
      plotIds: plots.map((p) => p._id),
      imageFile: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (log) => {
    const fieldId = log.fieldId || log.field?._id || log.field || "";
    const seasonId = log.seasonId || log.season?._id || log.season || "";

    const seasons = await loadSeasonsByField(fieldId);
    const selectedSeason = seasons.find((s) => s._id === seasonId);

    const plots = selectedSeason?.loggablePlots?.length
      ? selectedSeason.loggablePlots
      : selectedSeason?.assignedPlots?.length
        ? selectedSeason.assignedPlots
        : getLogPlots(log);

    setEditingLog(log);
    setFormSeasons(seasons);
    setFormPlots(plots);

    const initialPlotIds =
      log.scope === "all_plots"
        ? plots.map((p) => p._id)
        : (log.plots || []).map((p) => p._id || String(p));

    setForm({
      diseaseName: log.diseaseName || "",
      description: log.description || "",
      detectedAt: log.detectedAt ? getLocalDatetime(log.detectedAt) : "",
      fieldId,
      seasonId,
      plotIds: initialPlotIds,
      status: log.status || "unprocessed",
      processingNote: log.processingNote || "",
      source: log.source || "manual",
      imageFile: null,
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
      toast.warning(
        "Chỉ có thể tạo hoặc chỉnh sửa nội dung cho vụ đang canh tác.",
      );
      return;
    }
    if (!isHistoricalEdit && !form.diseaseName.trim()) {
      toast.warning("Vui lòng nhập tên bệnh.");
      return;
    }
    if (!isHistoricalEdit && !form.detectedAt) {
      toast.warning("Vui lòng nhập ngày giờ phát hiện bệnh.");
      return;
    }
    if (!isHistoricalEdit && new Date(form.detectedAt) > new Date()) {
      toast.warning("Ngày giờ phát hiện bệnh không được trong tương lai.");
      return;
    }
    if (!isHistoricalEdit && form.plotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa.");
      return;
    }

    const allPlotIds = formPlots.map((p) => p._id);
    const isAllSelected =
      allPlotIds.length > 0 &&
      form.plotIds.length === allPlotIds.length &&
      allPlotIds.every((id) => form.plotIds.includes(id));

    const payload = {
      diseaseName: form.diseaseName,
      description: form.description,
      detectedAt: form.detectedAt
        ? new Date(form.detectedAt).toISOString()
        : new Date().toISOString(),
      fieldId: form.fieldId,
      seasonId: form.seasonId,
      scope: isAllSelected ? "all_plots" : "selected_plots",
      plotIds: form.plotIds,
      status: form.status,
      processingNote: form.processingNote,
      source: editingLog?.source || "manual",
    };

    try {
      setSaving(true);

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(key, String(v)));
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      if (editingLog) {
        await api.put(`/disease-logs/${editingLog._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/disease-logs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setIsModalOpen(false);
      setEditingLog(null);
      setForm(emptyForm);
      toast.success(
        editingLog ? "Đã cập nhật nhật ký bệnh." : "Đã lưu nhật ký bệnh.",
      );
      await loadDiseaseLogs(filters, visibleCount);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể lưu nhật ký bệnh.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Xóa nhật ký bệnh?",
      message: "Thao tác này sẽ xóa bản ghi hiện tại. Bạn có muốn xóa?",
      confirmText: "Xóa nhật ký",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/disease-logs/${id}`);
      toast.success("Đã xóa nhật ký bệnh.");
      await loadDiseaseLogs(filters, visibleCount);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể xóa nhật ký bệnh.",
      );
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

  const handleResetFilters = async () => {
    setKeyword("");
    const seasons = await loadSeasonsByField("");
    setFilterSeasons(seasons);
    const activeSeasonId =
      seasons.find((s) => s.status === "active")?._id || "";
    const defaultFilters = {
      fieldId: "",
      seasonId: activeSeasonId,
      status: "",
    };
    setFilters(defaultFilters);
    setShowFiltersMobile(false);
    setVisibleCount(5);
    await loadDiseaseLogs(defaultFilters, 5);
  };

  return (
    <div className="app-page-shell page-scroll-shell overflow-y-auto bg-gray-50 p-3 md:p-4 lg:p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 [&>h1]:hidden md:[&>h1]:block">
          <h1 className="text-xl font-bold text-gray-900">Nhật ký bệnh</h1>
          <p className="text-sm text-gray-500 md:mt-1 md:max-w-2xl">
            Ghi nhận bệnh theo mùa vụ, cánh đồng và phạm vi thửa bị ảnh hưởng.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-md sm:w-auto"
        >
          <Plus size={16} /> Thêm nhật ký
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Tổng bản ghi
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 md:mt-1.5 md:text-2xl">
            {summary.total}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Chưa xử lý
          </p>
          <p className="mt-1 text-xl font-bold text-amber-600 md:mt-1.5 md:text-2xl">
            {summary.unprocessed}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Đã xử lý
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600 md:mt-1.5 md:text-2xl">
            {summary.processed}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setShowFiltersMobile((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl bg-gray-50/80 px-3 py-2.5 text-sm font-semibold text-gray-700 md:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-gray-400" />
            Bộ lọc và tìm kiếm
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 ring-1 ring-gray-200">
            {hasActiveFilters ? "Đang lọc" : showFiltersMobile ? "Ẩn" : "Hiện"}
          </span>
        </button>

        <div
          className={`${showFiltersMobile ? "mt-3 grid" : "hidden"} grid-cols-1 items-center gap-2.5 md:mt-0 md:grid xl:grid-cols-[1.2fr_1fr_1fr_auto_auto]`}
        >
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên bệnh, cánh đồng..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <CustomDropdown
            value={filters.fieldId}
            onChange={async (val) => {
              const seasons = await loadSeasonsByField(val);
              setFilterSeasons(seasons);
              const activeSeasonId =
                seasons.find((s) => s.status === "active")?._id || "";
              const next = {
                fieldId: val,
                seasonId: activeSeasonId,
                status: filters.status,
              };
              setFilters(next);
              setVisibleCount(5);
              await loadDiseaseLogs(next, 5);
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
              setVisibleCount(5);
              await loadDiseaseLogs(next, 5);
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
              setVisibleCount(5);
              await loadDiseaseLogs(next, 5);
            }}
            options={filterStatusOptions}
            placeholder="Trạng thái"
            size="default"
            className="min-w-[140px]"
          />

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <LoadingScreen message="Đang tải nhật ký bệnh..." />
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-2.5 rounded-2xl bg-gray-100 p-3.5">
              <ShieldAlert size={28} className="text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">
              Chưa có nhật ký bệnh nào phù hợp.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const statusMeta = getStatusMeta(log.status);
            const plotNames =
              getLogPlots(log)
                .map((item) => item.name)
                .filter(Boolean)
                .join(", ") || "Toàn bộ thửa tham gia vụ";
            const isSeasonActive = log.seasonStatus === "active";
            const seasonLabel =
              log.seasonLabel ||
              (log.season ? formatSeasonLabel(log.season) : null) ||
              "Chưa có mùa vụ";
            const plotCount = getLogPlots(log).length || log.plotCount || 0;

            return (
              <article
                key={log._id}
                className="group rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md md:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-bold text-gray-900 md:text-lg">
                        {log.diseaseName}
                      </h2>
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {getSourceLabel(log.source)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 md:text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {formatDate(log.detectedAt)}
                      </span>
                      <span>{log.fieldName || "Chưa có cánh đồng"}</span>
                      <span>{seasonLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailLog(log)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                      title="Xem chi tiết"
                      aria-label="Xem chi tiết nhật ký bệnh"
                    >
                      <Eye size={15} />
                    </button>
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
                      className={`rounded-lg p-2 transition-colors ${
                        isSeasonActive
                          ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
                          : "cursor-not-allowed text-gray-300"
                      }`}
                      title={isSeasonActive ? "Xóa" : "Vụ đã kết thúc"}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="grid flex-1 grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Phạm vi
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {log.scope === "all_plots"
                          ? "Toàn bộ thửa"
                          : `${plotCount} thửa`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                        {plotNames}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Mô tả bệnh
                      </p>
                      <p className="mt-1 text-sm text-gray-700 line-clamp-3">
                        {log.description || "Chưa có mô tả."}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Ghi chú xử lý
                      </p>
                      <p className="mt-1 text-sm text-gray-700 line-clamp-3">
                        {log.processingNote || "Chưa có ghi chú."}
                      </p>
                      {log.status === "processed" && log.processedAt && (
                        <p className="mt-1 text-xs text-emerald-600">
                          Xử lý ngày {formatDate(log.processedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {log.imageUrl && (
                    <a
                      href={log.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/img relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:flex-shrink-0 sm:ml-4 mt-2 sm:mt-0"
                      title="Xem ảnh quét AI"
                    >
                      <img
                        src={log.imageUrl}
                        alt={log.diseaseName}
                        className="w-full sm:w-24 h-48 sm:h-full object-cover transition-transform group-hover/img:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover/img:bg-black/20">
                        <ImageIcon
                          size={18}
                          className="text-white opacity-0 drop-shadow transition-opacity group-hover/img:opacity-100"
                        />
                      </div>
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Đang hiển thị {filteredLogs.length} mục.
        </p>

        {hasMore ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? "Đang tải..." : "Xem thêm"}
          </button>
        ) : (
          <p className="text-sm font-medium text-emerald-700">
            Đã tải hết danh sách theo bộ lọc hiện tại.
          </p>
        )}
      </div>

      {selectedDetailLog && selectedDetailData && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết nhật ký bệnh"
        >
          <div className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-0 py-1 text-xs font-semibold text-emerald-700">
                  <Eye size={14} />
                  Chi tiết nhật ký bệnh
                </span>
                <h3 className="mt-2 break-words text-lg font-bold text-gray-900 sm:text-xl">
                  {selectedDetailLog.diseaseName || "Bệnh chưa xác định"}
                </h3>
                {/* <p className="mt-1 text-sm text-gray-500">
                  {selectedDetailLog.fieldName || "Chưa có cánh đồng"} ·{" "}
                  {selectedDetailData.seasonLabel}
                </p> */}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailLog(null)}
                className="shrink-0 rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng cửa sổ chi tiết"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[0.9fr_1.25fr]">
              <div className="border-b border-gray-100 bg-gray-50/70 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                {selectedDetailLog.imageUrl ? (
                  <a
                    href={selectedDetailLog.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/detail-img block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                    title="Mở ảnh gốc"
                  >
                    <img
                      src={selectedDetailLog.imageUrl}
                      alt={selectedDetailLog.diseaseName || "Ảnh bệnh"}
                      className="h-56 w-full object-cover transition-transform group-hover/detail-img:scale-105 sm:h-72 lg:h-[420px]"
                    />
                  </a>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-gray-400 sm:h-72 lg:h-[420px]">
                    <ImageIcon size={30} />
                    <p className="mt-2 text-sm font-medium">Chưa có ảnh</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${selectedDetailData.statusMeta.className}`}
                  >
                    {selectedDetailData.statusMeta.label}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedDetailData.sourceLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailInfo label="Ngày phát hiện">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-gray-400" />
                      {formatDate(selectedDetailLog.detectedAt)}
                    </span>
                  </DetailInfo>
                  <DetailInfo label="Cánh đồng">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />
                      {selectedDetailLog.fieldName || "Chưa có cánh đồng"}
                    </span>
                  </DetailInfo>
                  <DetailInfo
                    label="Mùa vụ"
                    value={selectedDetailData.seasonLabel}
                  />
                  <DetailInfo
                    label="Phạm vi"
                    value={selectedDetailData.scopeLabel}
                  />
                </div>

                <section className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-gray-900">
                      Thửa bị ảnh hưởng
                    </h4>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                      {selectedDetailData.scopeLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                    {selectedDetailData.plots.length > 0 ? (
                      selectedDetailData.plots.map((plot) => (
                        <span
                          key={plot?._id || plot?.name}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        >
                          {plot?.name || "--"}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">
                        Toàn bộ thửa tham gia vụ.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-4">
                  <h4 className="text-sm font-bold text-gray-900">
                    Mô tả bệnh
                  </h4>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-700">
                    {selectedDetailLog.description || "Chưa có mô tả."}
                  </p>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-4">
                  <h4 className="text-sm font-bold text-gray-900">
                    Ghi chú xử lý
                  </h4>
                  <div className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-700">
                    {selectedDetailLog.processingNote || "Chưa có ghi chú."}
                  </div>
                  {selectedDetailLog.status === "processed" &&
                    selectedDetailLog.processedAt && (
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        Đã xử lý ngày{" "}
                        {formatDate(selectedDetailLog.processedAt)}
                      </p>
                    )}
                </section>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailInfo
                    label="Ngày tạo"
                    value={formatDate(selectedDetailLog.createdAt)}
                  />
                  <DetailInfo
                    label="Cập nhật gần nhất"
                    value={formatDate(selectedDetailLog.updatedAt)}
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedDetailLog(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
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

            <div className="flex-1 overflow-y-auto p-4">
              {(!selectedFormSeason ||
                selectedFormSeason.status !== "active") &&
                !isHistoricalEdit && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <ShieldAlert
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Tên bệnh
                  </label>
                  <input
                    value={form.diseaseName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        diseaseName: e.target.value,
                      }))
                    }
                    disabled={isHistoricalEdit}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    placeholder="Đạo ôn lá, bạc lá..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Ngày giờ phát hiện
                  </label>
                  <input
                    type="datetime-local"
                    max={getLocalDatetime()}
                    value={form.detectedAt}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        detectedAt: e.target.value,
                      }))
                    }
                    disabled={isHistoricalEdit}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Cánh đồng
                  </label>
                  <CustomDropdown
                    value={form.fieldId}
                    onChange={(val) =>
                      setForm((prev) => ({
                        ...prev,
                        fieldId: val,
                      }))
                    }
                    options={fieldFormOptions}
                    placeholder="Chọn cánh đồng"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Mùa vụ đang canh tác
                  </label>
                  {(() => {
                    const currentSeason = formSeasons.find(
                      (s) => s._id === form.seasonId,
                    );
                    return currentSeason ? (
                      <div className="flex min-h-[38px] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-800">
                          {formatSeasonLabel(currentSeason)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex min-h-[38px] items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                        {form.fieldId
                          ? "Không có mùa vụ đang canh tác"
                          : "Vui lòng chọn cánh đồng để xem vụ mùa"}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Trạng thái xử lý
                  </label>
                  <CustomDropdown
                    value={form.status}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, status: val }))
                    }
                    options={formStatusOptions}
                    placeholder="Chọn trạng thái"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                      Mô tả bệnh
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      disabled={isHistoricalEdit}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                      placeholder="Biểu hiện bệnh, vị trí, mức độ..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                      Ảnh đính kèm (Tùy chọn)
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-emerald-600">
                        <ImageIcon size={16} />
                        <span>Tải lên hình ảnh bệnh...</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file)
                              setForm((prev) => ({ ...prev, imageFile: file }));
                          }}
                        />
                      </label>
                      {form.imageFile ? (
                        <div className="relative mt-2 h-32 w-full max-w-[200px] overflow-hidden rounded-xl border border-gray-200">
                          <img
                            src={URL.createObjectURL(form.imageFile)}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({ ...prev, imageFile: null }))
                            }
                            className="absolute right-1.5 top-1.5 rounded-lg bg-black/50 p-1 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
                            title="Gỡ ảnh"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : editingLog?.imageUrl ? (
                        <div className="relative mt-2 h-32 w-full max-w-[200px] overflow-hidden rounded-xl border border-gray-200">
                          <img
                            src={editingLog.imageUrl}
                            alt="Current"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Ghi chú xử lý
                  </label>
                  <textarea
                    rows={3}
                    value={form.processingNote}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        processingNote: e.target.value,
                      }))
                    }
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="Cách xử lý, cần theo dõi thêm không..."
                  />
                </div>
              </div>

              {/* Row: Áp dụng cho thửa */}
              <div className="mt-3.5 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600">
                    <MapPin size={12} className="text-gray-400" /> Áp dụng cho
                    thửa
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isHistoricalEdit) {
                        const allIds = formPlots.map((p) => p._id);
                        const isAll = form.plotIds.length === allIds.length;
                        setForm((prev) => ({
                          ...prev,
                          plotIds: isAll ? [] : allIds,
                        }));
                      }
                    }}
                    disabled={isHistoricalEdit}
                    className={`text-xs font-semibold ${
                      isHistoricalEdit
                        ? "cursor-not-allowed text-gray-400"
                        : "text-emerald-600 hover:text-emerald-700 hover:underline"
                    }`}
                  >
                    {formPlots.length > 0 &&
                    form.plotIds.length === formPlots.length
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                </div>

                <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                  {formPlots.length === 0 ? (
                    <div className="col-span-2 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
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
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all duration-200 ${
                            checked
                              ? "border-emerald-400 bg-emerald-50/50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          } ${
                            isHistoricalEdit
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer"
                          }`}
                        >
                          <CustomCheckbox
                            checked={checked}
                            disabled={isHistoricalEdit}
                            onChange={() => {
                              // Đã xử lý onClick ở div bọc ngoài
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${
                                checked ? "text-emerald-800" : "text-gray-700"
                              }`}
                            >
                              {plot.name}
                            </p>
                          </div>
                          <span className="text-[10px] font-medium text-gray-400">
                            {Number(plot.area || 0).toLocaleString("vi-VN")} m²
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2.5 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  (!isHistoricalEdit &&
                    (!selectedFormSeason ||
                      selectedFormSeason.status !== "active"))
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all ${
                  saving ||
                  (!isHistoricalEdit &&
                    (!selectedFormSeason ||
                      selectedFormSeason.status !== "active"))
                    ? "cursor-not-allowed bg-gray-300"
                    : "bg-emerald-600 shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg"
                }`}
              >
                <Save size={15} />
                {saving
                  ? "Đang lưu..."
                  : editingLog
                    ? "Cập nhật"
                    : "Lưu nhật ký"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseLogs;
