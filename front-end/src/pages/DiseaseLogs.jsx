import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Edit2,
  Filter,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../services/api";
import { useFeedback } from "../hooks/useFeedback";

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

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "unprocessed", label: "Chưa xử lý" },
  { value: "processed", label: "Đã xử lý" },
];

const getStatusMeta = (status) => {
  if (status === "processed") {
    return {
      label: "Đã xử lý",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "Chưa xử lý",
    className: "bg-amber-100 text-amber-700",
  };
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

  const loadFields = async () => {
    const res = await api.get("/fields");
    const fieldList = (res.data || []).filter((field) => Number(field.myPlotCount || 0) > 0);
    setFields(fieldList);
    return fieldList;
  };

  const loadSeasonsByField = async (fieldId) => {
    if (!fieldId) return [];
    const res = await api.get("/season-details", { params: { fieldId } });
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
        form.seasonId && seasons.some((season) => season._id === form.seasonId)
          ? form.seasonId
          : seasons.find((season) => season.status === "active")?._id || seasons[0]?._id || "";

      const selectedSeason = seasons.find((season) => season._id === selectedSeasonId);
      const assignedPlots = selectedSeason?.assignedPlots || [];
      setFormPlots(assignedPlots);

      setForm((prev) => ({
        ...prev,
        seasonId: selectedSeasonId,
        plotIds:
          prev.scope === "selected_plots"
            ? prev.plotIds.filter((plotId) => assignedPlots.some((plot) => plot._id === plotId))
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

    const selectedSeason = formSeasons.find((season) => season._id === form.seasonId);
    const assignedPlots = selectedSeason?.assignedPlots || [];
    setFormPlots(assignedPlots);
    setForm((prev) => ({
      ...prev,
      plotIds:
        prev.scope === "selected_plots"
          ? prev.plotIds.filter((plotId) => assignedPlots.some((plot) => plot._id === plotId))
          : [],
    }));
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
        ...(log.plotSnapshot || []).map((item) => item.name),
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
      unprocessed: filteredLogs.filter((log) => log.status === "unprocessed").length,
      processed: filteredLogs.filter((log) => log.status === "processed").length,
      allPlots: filteredLogs.filter((log) => log.scope === "all_plots").length,
    }),
    [filteredLogs]
  );
  const selectedFormSeason = useMemo(
    () => formSeasons.find((season) => season._id === form.seasonId) || null,
    [formSeasons, form.seasonId]
  );
  const isHistoricalEdit = Boolean(editingLog && selectedFormSeason?.status !== "active");

  const openCreateModal = async () => {
    const fieldId = filters.fieldId || fields[0]?._id || "";
    const seasons = fieldId ? await loadSeasonsByField(fieldId) : [];
    const seasonId =
      seasons.find((season) => season.status === "active")?._id || seasons[0]?._id || "";

    setEditingLog(null);
    setFormSeasons(seasons);
    setFormPlots(seasons.find((season) => season._id === seasonId)?.assignedPlots || []);
    setForm({
      ...emptyForm,
      fieldId,
      seasonId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (log) => {
    const fieldId = log.field?._id || log.field || "";
    const seasons = fieldId ? await loadSeasonsByField(fieldId) : [];
    const seasonId = log.season?._id || log.season || "";
    const selectedSeason = seasons.find((season) => season._id === seasonId);

    setEditingLog(log);
    setFormSeasons(seasons);
    setFormPlots(selectedSeason?.assignedPlots || []);
    setForm({
      diseaseName: log.diseaseName || "",
      description: log.description || "",
      detectedAt: log.detectedAt ? new Date(log.detectedAt).toISOString().slice(0, 10) : "",
      fieldId,
      seasonId,
      scope: log.scope || "all_plots",
      plotIds: (log.plots || []).map((plot) => plot._id),
      status: log.status || "unprocessed",
      processingNote: log.processingNote || "",
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

    if (
      !isHistoricalEdit &&
      form.scope === "selected_plots" &&
      form.plotIds.length === 0
    ) {
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
        await api.put(`/disease-logs/${editingLog._id}`, payload);
      } else {
        await api.post("/disease-logs", payload);
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

    if (!confirmed) {
      return;
    }

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

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nhật ký bệnh</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Tự ghi nhận bệnh khi phát hiện ngoài thực tế, không cần đi qua AI. Mỗi bản ghi được gắn
            với mùa vụ, cánh đồng và phạm vi thửa bị ảnh hưởng.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
        >
          <Plus size={18} />
          Thêm nhật ký bệnh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Tổng bản ghi</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Chưa xử lý</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{summary.unprocessed}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Đã xử lý</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{summary.processed}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Toàn bộ thửa</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{summary.allPlots}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr_1fr_220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên bệnh, cánh đồng, mùa vụ..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <select
            value={filters.fieldId}
            onChange={async (event) => {
              const nextFieldId = event.target.value;
              const nextFilters = { fieldId: nextFieldId, seasonId: "", status: filters.status };
              setFilters(nextFilters);
              setFilterSeasons(nextFieldId ? await loadSeasonsByField(nextFieldId) : []);
              await loadDiseaseLogs(nextFilters);
            }}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
          >
            <option value="">Tất cả cánh đồng</option>
            {fields.map((field) => (
              <option key={field._id} value={field._id}>
                {field.name}
              </option>
            ))}
          </select>

          <select
            value={filters.seasonId}
            onChange={async (event) => {
              const nextFilters = { ...filters, seasonId: event.target.value };
              setFilters(nextFilters);
              await loadDiseaseLogs(nextFilters);
            }}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
          >
            <option value="">Tất cả mùa vụ</option>
            {filterSeasons.map((season) => (
              <option key={season._id} value={season._id}>
                {season.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filters.status}
              onChange={async (event) => {
                const nextFilters = { ...filters, status: event.target.value };
                setFilters(nextFilters);
                await loadDiseaseLogs(nextFilters);
              }}
              className="w-full bg-transparent text-sm outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Đang tải nhật ký bệnh...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Chưa có nhật ký bệnh nào phù hợp.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const statusMeta = getStatusMeta(log.status);
            const plotNames =
              (log.plotSnapshot || []).map((item) => item.name).filter(Boolean).join(", ") ||
              "Toàn bộ thửa tham gia vụ";

            const isSeasonActive = log.season?.status === "active";

            return (
              <article key={log._id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">{log.diseaseName}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {log.source === "manual" ? "Ghi thủ công" : "Từ AI scan"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={15} />
                        {formatDate(log.detectedAt)}
                      </span>
                      <span>{log.fieldName || "Chưa có cánh đồng"}</span>
                      <span>{log.seasonLabel || "Chưa có mùa vụ"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(log)}
                      title={isSeasonActive ? "Sửa nhật ký bệnh" : "Cập nhật xử lý cho nhật ký lịch sử"}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Edit2 size={15} />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log._id)}
                      disabled={!isSeasonActive}
                      title={
                        isSeasonActive
                          ? "Xóa nhật ký bệnh"
                          : "Nhật ký của vụ đã kết thúc không thể xóa"
                      }
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        isSeasonActive
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "cursor-not-allowed border-gray-200 text-gray-400"
                      }`}
                    >
                      <Trash2 size={15} />
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr]">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phạm vi ảnh hưởng</p>
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      {log.scope === "all_plots" ? "Toàn bộ thửa tham gia vụ" : `${log.plotCount || 0} thửa được chọn`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{plotNames}</p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mô tả bệnh</p>
                    <p className="mt-2 text-sm text-gray-700">{log.description || "Chưa có mô tả chi tiết."}</p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ghi chú xử lý</p>
                    <p className="mt-2 text-sm text-gray-700">{log.processingNote || "Chưa có ghi chú xử lý."}</p>
                    {log.status === "processed" && log.processedAt ? (
                      <p className="mt-2 text-xs text-emerald-600">Đã xử lý ngày {formatDate(log.processedAt)}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingLog ? "Chỉnh sửa nhật ký bệnh" : "Thêm nhật ký bệnh thủ công"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Ghi nhận bệnh theo đúng mùa vụ và phạm vi thửa bị ảnh hưởng.
                </p>
                {isHistoricalEdit ? (
                  <p className="mt-2 text-sm font-medium text-amber-600">
                    Vụ này đã kết thúc, chỉ còn cập nhật trạng thái xử lý và ghi chú.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingLog(null);
                  setForm(emptyForm);
                }}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-84px)] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tên bệnh</label>
                  <input
                    value={form.diseaseName}
                    onChange={(event) => setForm((prev) => ({ ...prev, diseaseName: event.target.value }))}
                    disabled={isHistoricalEdit}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                    placeholder="Ví dụ: Đạo ôn lá, bạc lá..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Ngày phát hiện</label>
                  <input
                    type="date"
                    value={form.detectedAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, detectedAt: event.target.value }))}
                    disabled={isHistoricalEdit}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Cánh đồng</label>
                  <select
                    value={form.fieldId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, fieldId: event.target.value, seasonId: "", plotIds: [] }))
                    }
                    disabled={isHistoricalEdit}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="">Chọn cánh đồng</option>
                    {fields.map((field) => (
                      <option key={field._id} value={field._id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Mùa vụ</label>
                  <select
                    value={form.seasonId}
                    onChange={(event) => setForm((prev) => ({ ...prev, seasonId: event.target.value, plotIds: [] }))}
                    disabled={isHistoricalEdit}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="">Chọn mùa vụ</option>
                    {formSeasons.map((season) => (
                      <option key={season._id} value={season._id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Trạng thái xử lý</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="unprocessed">Chưa xử lý</option>
                    <option value="processed">Đã xử lý</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Phạm vi ghi nhận</label>
                  <select
                    value={form.scope}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        scope: event.target.value,
                        plotIds: event.target.value === "all_plots" ? [] : prev.plotIds,
                      }))
                    }
                    disabled={isHistoricalEdit}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="all_plots">Toàn bộ thửa tham gia vụ</option>
                    <option value="selected_plots">Chỉ một số thửa</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Mô tả bệnh</label>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    disabled={isHistoricalEdit}
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                    placeholder="Mô tả biểu hiện bệnh, vị trí phát hiện, mức độ..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Ghi chú xử lý</label>
                  <textarea
                    rows={5}
                    value={form.processingNote}
                    onChange={(event) => setForm((prev) => ({ ...prev, processingNote: event.target.value }))}
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                    placeholder="Đã xử lý như thế nào, có cần theo dõi thêm không..."
                  />
                </div>
              </div>

              {form.scope === "selected_plots" ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList size={16} className="text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">Chọn thửa bị ảnh hưởng</p>
                  </div>

                  <div className="grid max-h-64 gap-3 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
                    {formPlots.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
                        Chưa có thửa nào tham gia mùa vụ này.
                      </div>
                    ) : (
                      formPlots.map((plot) => (
                        <label
                          key={plot._id}
                          className={`rounded-2xl border p-4 transition-all ${
                            form.plotIds.includes(plot._id) ? "border-emerald-300 bg-white shadow-sm" : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-800">{plot.name}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {Number(plot.area || 0).toLocaleString("vi-VN")} m²
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={form.plotIds.includes(plot._id)}
                              disabled={isHistoricalEdit}
                              onChange={() => togglePlot(plot._id)}
                            />
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingLog(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all ${
                    saving ? "cursor-not-allowed bg-gray-300" : "bg-emerald-600 shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                  }`}
                >
                  <Save size={16} />
                  {saving ? "Đang lưu..." : editingLog ? "Cập nhật nhật ký bệnh" : "Lưu nhật ký bệnh"}
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
