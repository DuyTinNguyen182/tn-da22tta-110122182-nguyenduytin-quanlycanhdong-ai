import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Edit2,
  Filter,
  Layers,
  MapPin,
  PlayCircle,
  Plus,
  Search,
  Sprout,
  Trash2,
} from "lucide-react";
import api from "../services/api";

const getToday = () => new Date().toISOString().split("T")[0];

const emptyLogForm = {
  taskType: null,
  description: "",
  cost: "",
  date: getToday(),
  selectedPlotIds: [],
};

const emptySeasonForm = {
  seasonId: "",
  year: new Date().getFullYear(),
  startDate: getToday(),
  plotIds: [],
  editingSeasonId: null,
};

const sortSeasons = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return new Date(b.startDate || b.createdAt || 0) - new Date(a.startDate || a.createdAt || 0);
  });

const getLogPlots = (log) => {
  if (Array.isArray(log?.plots) && log.plots.length > 0) {
    return log.plots.filter(Boolean);
  }

  if (log?.plot) {
    return [log.plot];
  }

  return [];
};

const getLogScopeLabel = (log) => {
  if (log?.scope === "all_plots") {
    return "Tất cả thửa tham gia vụ";
  }

  const plots = getLogPlots(log);
  if (plots.length <= 1) {
    return plots[0]?.name || "Một thửa";
  }

  return `${plots.length} thửa được chọn`;
};

const Crops = () => {
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [fieldKeyword, setFieldKeyword] = useState("");
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [plots, setPlots] = useState([]);
  const [logs, setLogs] = useState([]);
  const [seasonCatalogs, setSeasonCatalogs] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [loadingFieldDetail, setLoadingFieldDetail] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterPlotId, setFilterPlotId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [showAssignedPlots, setShowAssignedPlots] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [seasonForm, setSeasonForm] = useState(emptySeasonForm);

  const activePlots = useMemo(() => plots.filter((plot) => plot.status === "active"), [plots]);
  const inactivePlots = useMemo(() => plots.filter((plot) => plot.status !== "active"), [plots]);
  const filteredFields = useMemo(() => {
    const keyword = fieldKeyword.trim().toLowerCase();
    if (!keyword) return fields;

    return fields.filter((field) => {
      return (
        field.name?.toLowerCase().includes(keyword) ||
        field.address?.toLowerCase().includes(keyword)
      );
    });
  }, [fieldKeyword, fields]);

  const sortedSeasons = useMemo(() => sortSeasons(seasons), [seasons]);
  const currentSeason = useMemo(
    () => sortedSeasons.find((season) => season._id === selectedSeasonId) || null,
    [sortedSeasons, selectedSeasonId]
  );
  const isSeasonActive = currentSeason?.status === "active";
  const hasActiveSeason = sortedSeasons.some((season) => season.status === "active");
  const seasonAssignedPlots = currentSeason?.assignedPlots || [];
  const seasonLoggablePlots = currentSeason?.loggablePlots || [];

  const seasonSelectablePlots = useMemo(() => {
    const selectedIds = new Set(seasonForm.plotIds || []);

    return plots.map((plot) => {
      const isSelected = selectedIds.has(plot._id);
      const canSelect = plot.status === "active" || isSelected;

      return {
        ...plot,
        isSelected,
        canSelect,
        helperText:
          plot.status === "active"
            ? "Sẵn sàng tham gia vụ"
            : "Thửa đang tạm ngưng, không thể thêm mới vào vụ",
      };
    });
  }, [plots, seasonForm.plotIds]);

  const filterPlotOptions = useMemo(() => {
    const optionMap = new Map();
    seasonAssignedPlots.forEach((plot) => optionMap.set(plot._id, plot));
    logs.forEach((log) => {
      getLogPlots(log).forEach((plot) => {
        if (plot?._id) {
          optionMap.set(plot._id, plot);
        }
      });
    });
    return Array.from(optionMap.values());
  }, [logs, seasonAssignedPlots]);

  const filteredLogs = useMemo(() => {
    const nextLogs = logs.filter((log) => {
      const matchesTask = filterTaskId ? log.taskId === filterTaskId : true;
      const matchesPlot = filterPlotId
        ? getLogPlots(log).some(
            (plot) => plot?._id === filterPlotId || plot === filterPlotId
          )
        : true;

      return matchesTask && matchesPlot;
    });

    return nextLogs.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;

      return (
        new Date(b.createdAt || b.updatedAt || 0).getTime() -
        new Date(a.createdAt || a.updatedAt || 0).getTime()
      );
    });
  }, [filterPlotId, filterTaskId, logs]);

  const totalCost = useMemo(
    () => filteredLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0),
    [filteredLogs]
  );

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const [fieldRes, seasonRes, taskRes] = await Promise.all([
          api.get("/fields"),
          api.get("/seasons"),
          api.get("/tasks"),
        ]);

        const nextFields = (fieldRes.data || []).filter(
          (field) => Number(field.myPlotCount || 0) > 0
        );
        setFields(nextFields);
        setSeasonCatalogs(seasonRes.data || []);
        setTaskTypes(taskRes.data || []);

        if (nextFields.length > 0) {
          setSelectedField(nextFields[0]);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu mùa vụ", error);
      }
    };

    loadBootstrap();
  }, []);

  useEffect(() => {
    if (!selectedField?._id) {
      setSeasons([]);
      setPlots([]);
      setSelectedSeasonId("");
      setLogs([]);
      return;
    }

    const loadFieldDetail = async () => {
      try {
        setLoadingFieldDetail(true);
        setFilterPlotId("");
        setFilterTaskId("");
        setLogs([]);

        const [seasonRes, plotRes] = await Promise.all([
          api.get("/season-details", { params: { fieldId: selectedField._id } }),
          api.get("/plots", { params: { fieldId: selectedField._id } }),
        ]);

        const nextSeasons = seasonRes.data || [];
        setSeasons(nextSeasons);
        setPlots(plotRes.data || []);
        setSelectedSeasonId(sortSeasons(nextSeasons)[0]?._id || "");
      } catch (error) {
        console.error("Lỗi tải chi tiết cánh đồng", error);
      } finally {
        setLoadingFieldDetail(false);
      }
    };

    loadFieldDetail();
  }, [selectedField]);

  useEffect(() => {
    if (!selectedSeasonId) {
      setLogs([]);
      return;
    }

    const loadLogs = async () => {
      try {
        setLoadingLogs(true);
        const res = await api.get("/diary-logs", { params: { seasonId: selectedSeasonId } });
        setLogs(res.data || []);
      } catch (error) {
        console.error("Lỗi tải nhật ký mùa vụ", error);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadLogs();
  }, [selectedSeasonId]);

  useEffect(() => {
    setShowAssignedPlots(false);
  }, [selectedSeasonId]);

  const reloadCurrentField = async (preferredSeasonId) => {
    if (!selectedField?._id) return;

    const [seasonRes, plotRes] = await Promise.all([
      api.get("/season-details", { params: { fieldId: selectedField._id } }),
      api.get("/plots", { params: { fieldId: selectedField._id } }),
    ]);

    const nextSeasons = seasonRes.data || [];
    setSeasons(nextSeasons);
    setPlots(plotRes.data || []);
    setSelectedSeasonId(preferredSeasonId || sortSeasons(nextSeasons)[0]?._id || "");
  };

  const toggleSeasonPlot = (plotId) => {
    setSeasonForm((prev) => {
      const hasPlot = prev.plotIds.includes(plotId);
      return {
        ...prev,
        plotIds: hasPlot
          ? prev.plotIds.filter((id) => id !== plotId)
          : [...prev.plotIds, plotId],
      };
    });
  };

  const toggleLogPlot = (plotId) => {
    setLogForm((prev) => {
      const hasPlot = prev.selectedPlotIds.includes(plotId);
      return {
        ...prev,
        selectedPlotIds: hasPlot
          ? prev.selectedPlotIds.filter((id) => id !== plotId)
          : [...prev.selectedPlotIds, plotId],
      };
    });
  };

  const handleSelectAllLogPlots = () => {
    const allPlotIds = seasonLoggablePlots.map((plot) => plot._id);
    setLogForm((prev) => ({
      ...prev,
      selectedPlotIds:
        prev.selectedPlotIds.length === allPlotIds.length ? [] : allPlotIds,
    }));
  };

  const openCreateSeasonModal = () => {
    setSeasonForm({
      seasonId: "",
      year: new Date().getFullYear(),
      startDate: getToday(),
      plotIds: activePlots.map((plot) => plot._id),
      editingSeasonId: null,
    });
    setIsSeasonModalOpen(true);
  };

  const openEditSeasonModal = () => {
    if (!currentSeason) return;

    setSeasonForm({
      seasonId: currentSeason.seasonId || currentSeason.season?._id || "",
      year: currentSeason.year || new Date().getFullYear(),
      startDate: currentSeason.startDate?.split("T")[0] || getToday(),
      plotIds: currentSeason.assignedPlotIds || [],
      editingSeasonId: currentSeason._id,
    });
    setIsSeasonModalOpen(true);
  };

  const handleSaveSeason = async () => {
    if (!selectedField?._id) {
      alert("Vui lòng chọn cánh đồng.");
      return;
    }
    if (!seasonForm.seasonId) {
      alert("Vui lòng chọn mùa vụ.");
      return;
    }
    if ((seasonForm.plotIds || []).length === 0) {
      alert("Cần chọn ít nhất 1 thửa tham gia vụ mùa.");
      return;
    }

    const payload = {
      seasonId: seasonForm.seasonId,
      year: Number(seasonForm.year),
      fieldId: selectedField._id,
      startDate: seasonForm.startDate,
      plotIds: seasonForm.plotIds,
      status: "active",
    };

    try {
      if (seasonForm.editingSeasonId) {
        const res = await api.put(`/season-details/${seasonForm.editingSeasonId}`, payload);
        await reloadCurrentField(res.data?._id || seasonForm.editingSeasonId);
      } else {
        const res = await api.post("/season-details", payload);
        await reloadCurrentField(res.data?._id);
      }

      setIsSeasonModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || "Không thể lưu mùa vụ.");
    }
  };

  const handleFinishSeason = async () => {
    if (!currentSeason) return;

    const confirmed = window.confirm(
      "Kết thúc vụ này? Sau khi kết thúc, bạn chỉ có thể xem lại lịch sử và không thêm nhật ký mới."
    );
    if (!confirmed) return;

    try {
      const res = await api.put(`/season-details/${currentSeason._id}/finish`);
      await reloadCurrentField(res.data?._id || currentSeason._id);
    } catch (error) {
      alert(error.response?.data?.message || "Không thể kết thúc vụ mùa.");
    }
  };

  const openCreateLogModal = () => {
    if (!isSeasonActive) return;

    setEditingLog(null);
    setLogForm({
      taskType: null,
      description: "",
      cost: "",
      date: getToday(),
      selectedPlotIds: seasonLoggablePlots.map((plot) => plot._id),
    });
    setIsLogModalOpen(true);
  };

  const openEditLogModal = (log) => {
    const foundTask =
      taskTypes.find((task) => task._id === log.taskId) ||
      taskTypes.find((task) => task.name === log.taskName) ||
      null;

    setEditingLog(log);
    setLogForm({
      taskType: foundTask,
      description: log.description || "",
      cost: log.cost || "",
      date: log.date ? log.date.split("T")[0] : getToday(),
      selectedPlotIds: getLogPlots(log)
        .map((plot) => plot?._id || plot)
        .filter(Boolean),
    });
    setIsLogModalOpen(true);
  };

  const refreshLogs = async (seasonId) => {
    const res = await api.get("/diary-logs", { params: { seasonId } });
    setLogs(res.data || []);
  };

  const handleSaveLog = async () => {
    if (!currentSeason?._id || !logForm.taskType?._id) {
      alert("Vui lòng chọn công việc.");
      return;
    }

    if (logForm.selectedPlotIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 thửa áp dụng.");
      return;
    }

    const allPlotIds = seasonLoggablePlots.map((plot) => plot._id);
    const isAllSelected =
      allPlotIds.length > 0 &&
      logForm.selectedPlotIds.length === allPlotIds.length &&
      allPlotIds.every((id) => logForm.selectedPlotIds.includes(id));

    const scope = isAllSelected
      ? "all_plots"
      : logForm.selectedPlotIds.length === 1
        ? "single_plot"
        : "selected_plots";

    const payload = {
      taskId: logForm.taskType._id,
      description: logForm.description,
      cost: Number(logForm.cost || 0),
      date: logForm.date,
      seasonId: currentSeason._id,
      scope,
      plotId: scope === "single_plot" ? logForm.selectedPlotIds[0] : null,
      plotIds: scope === "all_plots" ? allPlotIds : logForm.selectedPlotIds,
    };

    try {
      if (editingLog) {
        await api.put(`/diary-logs/${editingLog._id}`, payload);
      } else {
        await api.post("/diary-logs", payload);
      }

      setIsLogModalOpen(false);
      await refreshLogs(currentSeason._id);
    } catch (error) {
      alert(error.response?.data?.message || "Không thể lưu nhật ký.");
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhật ký này?")) return;

    try {
      await api.delete(`/diary-logs/${logId}`);
      await refreshLogs(currentSeason._id);
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa nhật ký.");
    }
  };

  const selectedSeasonCatalog = seasonCatalogs.find((item) => item._id === seasonForm.seasonId);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50 font-sans">
      <aside className="z-10 flex w-[290px] xl:w-[310px] flex-col border-r border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-gray-800">Chọn cánh đồng</h2>
          <p className="text-sm text-gray-500">
            Chỉ hiển thị những cánh đồng bạn đang có thửa ruộng.
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={fieldKeyword}
              onChange={(event) => setFieldKeyword(event.target.value)}
              placeholder="Tìm theo tên hoặc địa bàn..."
              className="w-full rounded-xl border border-transparent bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-200 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {filteredFields.map((field) => (
            <button
              key={field._id}
              onClick={() => setSelectedField(field)}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                selectedField?._id === field._id
                  ? "border-emerald-200 bg-emerald-50 shadow-sm"
                  : "border-transparent bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    selectedField?._id === field._id
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <h3
                    className={`truncate text-sm font-bold ${
                      selectedField?._id === field._id ? "text-emerald-800" : "text-gray-700"
                    }`}
                  >
                    {field.name}
                  </h3>
                  <p className="truncate text-xs text-gray-400">{field.address}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="relative flex flex-1 flex-col bg-gray-50/60">
        {selectedField ? (
          <>
            <div className="z-10 border-b border-gray-200 bg-white px-6 py-3 shadow-sm lg:px-8">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-gray-800">{selectedField.name}</h1>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {activePlots.length} thửa đang canh tác
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {inactivePlots.length} thửa tạm ngưng
                    </span>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin size={15} className="text-gray-400" />
                    {selectedField.address || "Chưa cập nhật địa bàn"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!hasActiveSeason && (
                    <button
                      onClick={openCreateSeasonModal}
                      disabled={activePlots.length === 0}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        activePlots.length === 0
                          ? "cursor-not-allowed bg-gray-200 text-gray-500"
                          : "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                      }`}
                    >
                      <PlayCircle size={17} /> Bắt đầu vụ mới
                    </button>
                  )}

                  {currentSeason && isSeasonActive && (
                    <>
                      <button
                        onClick={openEditSeasonModal}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Chỉnh sửa vụ
                      </button>
                      <button
                        onClick={handleFinishSeason}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition-all hover:bg-orange-100"
                      >
                        Kết thúc vụ
                      </button>
                      <button
                        onClick={openCreateLogModal}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
                      >
                        <Plus size={17} /> Ghi nhật ký
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-2.5">
                  {sortedSeasons.length > 0 ? (
                    <div className="relative min-w-[250px]">
                      <select
                        value={selectedSeasonId}
                        onChange={(event) => setSelectedSeasonId(event.target.value)}
                        className={`appearance-none rounded-xl border py-2 pl-4 pr-9 text-sm font-semibold outline-none ${
                          isSeasonActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      >
                        {sortedSeasons.map((season) => (
                          <option key={season._id} value={season._id}>
                            {season.name} - {season.status === "active" ? "Đang canh tác" : "Đã kết thúc"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
                      Cánh đồng này chưa có vụ nào.
                    </div>
                  )}

                  {currentSeason && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                        isSeasonActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isSeasonActive ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {currentSeason.loggablePlotCount || 0}/{currentSeason.activePlotCount || 0} thửa sẵn sàng ghi nhật ký
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={16} className="text-gray-400" />
                    Bắt đầu:{" "}
                    {currentSeason?.startDate
                      ? new Date(currentSeason.startDate).toLocaleDateString("vi-VN")
                      : "Chưa có"}
                  </span>
                  {currentSeason?.endDate && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={16} className="text-gray-400" />
                      Kết thúc: {new Date(currentSeason.endDate).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                  <span>
                    Chi phí: <strong className="text-emerald-600">{totalCost.toLocaleString()} đ</strong>
                  </span>
                </div>
              </div>

              {currentSeason && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignedPlots((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:border-emerald-200 hover:text-emerald-700"
                  >
                    {showAssignedPlots
                      ? "Ẩn danh sách thửa tham gia"
                      : `Xem ${seasonAssignedPlots.length} thửa tham gia vụ`}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showAssignedPlots ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showAssignedPlots && <div className="mt-2 flex flex-wrap gap-2">
                  {seasonAssignedPlots.map((plot) => (
                    <span
                      key={plot._id}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        plot.status === "active"
                          ? "bg-white text-gray-700 ring-1 ring-gray-200"
                          : "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                      }`}
                    >
                      {plot.name} {plot.status !== "active" ? "(đang tạm ngưng)" : ""}
                    </span>
                  ))}
                  </div>}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  <Filter size={14} />
                  <select
                    value={filterPlotId}
                    onChange={(event) => setFilterPlotId(event.target.value)}
                    className="bg-transparent font-medium outline-none"
                  >
                    <option value="">Tất cả thửa</option>
                    {filterPlotOptions.map((plot) => (
                      <option key={plot._id} value={plot._id}>
                        {plot.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  <Filter size={14} />
                  <select
                    value={filterTaskId}
                    onChange={(event) => setFilterTaskId(event.target.value)}
                    className="bg-transparent font-medium outline-none"
                  >
                    <option value="">Tất cả công việc</option>
                    {taskTypes.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFilterPlotId("");
                    setFilterTaskId("");
                  }}
                  disabled={!filterPlotId && !filterTaskId}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    !filterPlotId && !filterTaskId
                      ? "cursor-not-allowed bg-gray-100 text-gray-400"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-700"
                  }`}
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
              {loadingFieldDetail || loadingLogs ? (
                <div className="py-10 text-center text-gray-400">Đang tải dữ liệu mùa vụ...</div>
              ) : !currentSeason ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                  <Sprout size={48} className="mb-4 text-gray-300" />
                  <p className="font-medium text-gray-600">Chưa có vụ nào cho cánh đồng này.</p>
                  <p className="mt-2 max-w-md text-sm">
                    Hãy bắt đầu một vụ mới từ danh mục mùa vụ do admin đã cấu hình.
                  </p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white text-center text-gray-400">
                  <p className="font-medium text-gray-600">
                    {logs.length === 0
                      ? "Chưa có nhật ký nào cho vụ này."
                      : "Không tìm thấy nhật ký phù hợp với bộ lọc."}
                  </p>
                  {isSeasonActive && (
                    <button
                      onClick={openCreateLogModal}
                      className="mt-3 text-sm font-semibold text-emerald-600 hover:underline"
                    >
                      Ghi nhật ký đầu tiên
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log, index) => (
                    <div key={log._id} className="group relative pl-8">
                      {index !== filteredLogs.length - 1 && (
                        <div className="absolute bottom-[-16px] left-[12px] top-8 w-[2px] bg-gray-200"></div>
                      )}

                      <div className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-600 shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-current"></div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-1.5 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              {log.taskName || log.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(log.date).toLocaleDateString("vi-VN")}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                              <span className="flex items-center gap-1 font-medium text-emerald-600">
                                <Layers size={12} />
                                {getLogScopeLabel(log)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1 text-base font-bold text-gray-800">
                                {Number(log.cost || 0).toLocaleString()}
                                <span className="text-xs font-normal text-gray-400">đ</span>
                              </div>
                            </div>
                            {isSeasonActive && (
                              <div className="ml-2 flex gap-1">
                                <button
                                  onClick={() => openEditLogModal(log)}
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteLog(log._id)}
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {log.description && (
                          <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                            {log.description}
                          </p>
                        )}

                        {getLogPlots(log).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {getLogPlots(log).map((plot) => (
                              <span
                                key={plot?._id || plot}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
                              >
                                {plot?.name || "Thửa đã chọn"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400">
            <Sprout size={64} className="mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600">Chọn cánh đồng</h3>
          </div>
        )}
      </section>

      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {editingLog ? "Cập nhật nhật ký" : "Ghi nhật ký mới"}
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <label className="mb-3 block text-xs font-bold uppercase text-gray-500">
                Chọn công việc
              </label>
              <div className="mb-6 grid grid-cols-4 gap-3">
                {taskTypes.map((task) => {
                  const isSelected = logForm.taskType?._id === task._id;
                  return (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => setLogForm((prev) => ({ ...prev, taskType: task }))}
                      className={`rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                          : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? "text-emerald-700" : "text-gray-600"
                        }`}
                      >
                        {task.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                      Ngày thực hiện
                    </label>
                    <input
                      type="date"
                      value={logForm.date}
                      onChange={(event) =>
                        setLogForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 font-medium outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                      Chi phí
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={logForm.cost}
                        onChange={(event) =>
                          setLogForm((prev) => ({ ...prev, cost: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 font-medium outline-none focus:border-emerald-500 focus:bg-white"
                        placeholder="0"
                      />
                      <DollarSign
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold uppercase text-gray-500">
                      Áp dụng cho các thửa
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllLogPlots}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      {logForm.selectedPlotIds.length === seasonLoggablePlots.length
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả"}
                    </button>
                  </div>

                  <div className="grid max-h-64 gap-3 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
                    {seasonLoggablePlots.map((plot) => {
                      const checked = logForm.selectedPlotIds.includes(plot._id);
                      return (
                        <label
                          key={plot._id}
                          className={`rounded-2xl border p-4 transition-all ${
                            checked
                              ? "border-emerald-300 bg-white shadow-sm"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-800">{plot.name}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {Number(plot.area || 0).toLocaleString()} m²
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleLogPlot(plot._id)}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={3}
                    value={logForm.description}
                    onChange={(event) =>
                      setLogForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 font-medium outline-none focus:border-emerald-500 focus:bg-white"
                    placeholder="Chi tiết công việc..."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="flex-1 rounded-xl py-2.5 font-bold text-gray-600 transition-colors hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveLog}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
              >
                {editingLog ? "Lưu thay đổi" : "Tạo nhật ký"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h3 className="font-bold text-gray-800">
                {seasonForm.editingSeasonId ? "Chỉnh sửa vụ mùa" : "Bắt đầu vụ mới"}
              </h3>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                    Mùa vụ
                  </label>
                  <div className="relative">
                    <select
                      value={seasonForm.seasonId}
                      onChange={(event) =>
                        setSeasonForm((prev) => ({ ...prev, seasonId: event.target.value }))
                      }
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      <option value="">-- Chọn mùa vụ chuẩn --</option>
                      {seasonCatalogs.map((season) => (
                        <option key={season._id} value={season._id}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                    Năm vụ
                  </label>
                  <input
                    type="number"
                    value={seasonForm.year}
                    onChange={(event) =>
                      setSeasonForm((prev) => ({ ...prev, year: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={seasonForm.startDate}
                    onChange={(event) =>
                      setSeasonForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {selectedSeasonCatalog && (
                <p className="text-xs font-medium text-emerald-600">
                  Vụ sẽ hiển thị là:{" "}
                  <strong>
                    {selectedSeasonCatalog.name} {seasonForm.year}
                  </strong>
                </p>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">Chọn thửa tham gia vụ</h4>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {seasonForm.plotIds.length} thửa được chọn
                  </span>
                </div>

                <div className="grid max-h-[280px] gap-3 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
                  {seasonSelectablePlots.map((plot) => (
                    <label
                      key={plot._id}
                      className={`rounded-2xl border p-4 transition-all ${
                        plot.isSelected
                          ? "border-emerald-300 bg-white shadow-sm"
                          : "border-gray-200 bg-white"
                      } ${!plot.canSelect ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-800">{plot.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Diện tích: {Number(plot.area || 0).toLocaleString()} m²
                          </p>
                          <p className="mt-2 text-xs text-gray-400">{plot.helperText}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={plot.isSelected}
                          disabled={!plot.canSelect}
                          onChange={() => toggleSeasonPlot(plot._id)}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsSeasonModalOpen(false)}
                  className="flex-1 rounded-xl bg-gray-200 py-2.5 font-medium text-gray-800 transition-all hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSeason}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-medium text-white transition-all hover:bg-emerald-700"
                >
                  {seasonForm.editingSeasonId ? "Cập nhật vụ" : "Bắt đầu vụ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Crops;
