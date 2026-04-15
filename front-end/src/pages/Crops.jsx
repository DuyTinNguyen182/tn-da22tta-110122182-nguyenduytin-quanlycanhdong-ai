import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useFeedback } from "../hooks/useFeedback";
import CropsSidebar from "../components/Crops/CropsSidebar";
import SeasonHeader from "../components/Crops/SeasonHeader";
import DiaryLogList from "../components/Crops/DiaryLogList";
import DiaryLogModal from "../components/Crops/DiaryLogModal";
import SeasonModal from "../components/Crops/SeasonModal";

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
  if (Array.isArray(log?.plots) && log.plots.length > 0) return log.plots.filter(Boolean);
  if (log?.plot) return [log.plot];
  return [];
};

const Crops = () => {
  const { toast, confirm } = useFeedback();
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
  const [editingLog, setEditingLog] = useState(null);
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [seasonForm, setSeasonForm] = useState(emptySeasonForm);

  // ──────────────── Derived state ────────────────

  const activePlots = useMemo(() => plots.filter((p) => p.status === "active"), [plots]);

  const filteredFields = useMemo(() => {
    const kw = fieldKeyword.trim().toLowerCase();
    if (!kw) return fields;
    return fields.filter(
      (f) => f.name?.toLowerCase().includes(kw) || f.address?.toLowerCase().includes(kw)
    );
  }, [fieldKeyword, fields]);

  const sortedSeasons = useMemo(() => sortSeasons(seasons), [seasons]);

  const currentSeason = useMemo(
    () => sortedSeasons.find((s) => s._id === selectedSeasonId) || null,
    [sortedSeasons, selectedSeasonId]
  );

  const isSeasonActive = currentSeason?.status === "active";
  const hasActiveSeason = sortedSeasons.some((s) => s.status === "active");
  const seasonAssignedPlots = currentSeason?.assignedPlots || [];
  const seasonLoggablePlots = currentSeason?.loggablePlots || [];

  const seasonSelectablePlots = useMemo(() => {
    const selectedIds = new Set(seasonForm.plotIds || []);
    return plots.map((plot) => {
      const isSelected = selectedIds.has(plot._id);
      const canSelect = plot.status === "active" || isSelected;
      return { ...plot, isSelected, canSelect };
    });
  }, [plots, seasonForm.plotIds]);

  const filterPlotOptions = useMemo(() => {
    const optionMap = new Map();
    seasonAssignedPlots.forEach((p) => optionMap.set(p._id, p));
    logs.forEach((log) => {
      getLogPlots(log).forEach((p) => {
        if (p?._id) optionMap.set(p._id, p);
      });
    });
    return Array.from(optionMap.values());
  }, [logs, seasonAssignedPlots]);

  const filteredLogs = useMemo(() => {
    const next = logs.filter((log) => {
      const matchTask = filterTaskId ? log.taskId === filterTaskId : true;
      const matchPlot = filterPlotId
        ? getLogPlots(log).some((p) => p?._id === filterPlotId || p === filterPlotId)
        : true;
      return matchTask && matchPlot;
    });

    return next.sort((a, b) => {
      const diff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      if (diff !== 0) return diff;
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

  // ──────────────── Data loading ────────────────

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const [fieldRes, seasonRes, taskRes] = await Promise.all([
          api.get("/fields"),
          api.get("/seasons"),
          api.get("/tasks"),
        ]);

        const nextFields = (fieldRes.data || []).filter(
          (f) => Number(f.myPlotCount || 0) > 0
        );
        setFields(nextFields);
        setSeasonCatalogs(seasonRes.data || []);
        setTaskTypes(taskRes.data || []);

        if (nextFields.length > 0) setSelectedField(nextFields[0]);
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

  // ──────────────── Helpers ────────────────

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

  const refreshLogs = async (seasonId) => {
    const res = await api.get("/diary-logs", { params: { seasonId } });
    setLogs(res.data || []);
  };

  // ──────────────── Season handlers ────────────────

  const openCreateSeasonModal = () => {
    setSeasonForm({
      seasonId: "",
      year: new Date().getFullYear(),
      startDate: getToday(),
      plotIds: activePlots.map((p) => p._id),
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
      toast.warning("Vui lòng chọn cánh đồng.");
      return;
    }
    if (!seasonForm.seasonId) {
      toast.warning("Vui lòng chọn mùa vụ.");
      return;
    }
    if ((seasonForm.plotIds || []).length === 0) {
      toast.warning("Cần chọn ít nhất 1 thửa tham gia vụ mùa.");
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
      toast.success(seasonForm.editingSeasonId ? "Đã cập nhật vụ mùa." : "Đã bắt đầu vụ mới.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu mùa vụ.");
    }
  };

  const handleFinishSeason = async () => {
    if (!currentSeason) return;

    const confirmed = await confirm({
      title: "Kết thúc vụ này?",
      message: "Sau khi kết thúc, bạn chỉ có thể xem lại lịch sử và không thêm nhật ký mới.",
      confirmText: "Kết thúc vụ",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await api.put(`/season-details/${currentSeason._id}/finish`);
      toast.success("Đã kết thúc vụ mùa.");
      await reloadCurrentField(res.data?._id || currentSeason._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể kết thúc vụ mùa.");
    }
  };

  // ──────────────── Log handlers ────────────────

  const openCreateLogModal = () => {
    if (!isSeasonActive) return;
    setEditingLog(null);
    setLogForm({
      taskType: null,
      description: "",
      cost: "",
      date: getToday(),
      selectedPlotIds: seasonLoggablePlots.map((p) => p._id),
    });
    setIsLogModalOpen(true);
  };

  const openEditLogModal = (log) => {
    const foundTask =
      taskTypes.find((t) => t._id === log.taskId) ||
      taskTypes.find((t) => t.name === log.taskName) ||
      null;

    setEditingLog(log);
    setLogForm({
      taskType: foundTask,
      description: log.description || "",
      cost: log.cost || "",
      date: log.date ? log.date.split("T")[0] : getToday(),
      selectedPlotIds: getLogPlots(log)
        .map((p) => p?._id || p)
        .filter(Boolean),
    });
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async () => {
    if (!currentSeason?._id || !logForm.taskType?._id) {
      toast.warning("Vui lòng chọn công việc.");
      return;
    }
    if (logForm.selectedPlotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa áp dụng.");
      return;
    }

    const allPlotIds = seasonLoggablePlots.map((p) => p._id);
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
      toast.success(editingLog ? "Đã cập nhật nhật ký." : "Đã tạo nhật ký.");
      await refreshLogs(currentSeason._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu nhật ký.");
    }
  };

  const handleDeleteLog = async (logId) => {
    const confirmed = await confirm({
      title: "Xóa nhật ký?",
      message: "Thao tác này sẽ xóa nhật ký hiện tại khỏi vụ mùa đang chọn.",
      confirmText: "Xóa nhật ký",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/diary-logs/${logId}`);
      toast.success("Đã xóa nhật ký.");
      await refreshLogs(currentSeason._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa nhật ký.");
    }
  };

  const toggleLogPlot = (plotId) => {
    setLogForm((prev) => ({
      ...prev,
      selectedPlotIds: prev.selectedPlotIds.includes(plotId)
        ? prev.selectedPlotIds.filter((id) => id !== plotId)
        : [...prev.selectedPlotIds, plotId],
    }));
  };

  const handleSelectAllLogPlots = () => {
    const allPlotIds = seasonLoggablePlots.map((p) => p._id);
    setLogForm((prev) => ({
      ...prev,
      selectedPlotIds: prev.selectedPlotIds.length === allPlotIds.length ? [] : allPlotIds,
    }));
  };

  const toggleSeasonPlot = (plotId) => {
    setSeasonForm((prev) => ({
      ...prev,
      plotIds: prev.plotIds.includes(plotId)
        ? prev.plotIds.filter((id) => id !== plotId)
        : [...prev.plotIds, plotId],
    }));
  };

  const selectedSeasonCatalog = seasonCatalogs.find((s) => s._id === seasonForm.seasonId);

  // ──────────────── Render ────────────────

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50 font-sans">
      <CropsSidebar
        fields={filteredFields}
        selectedField={selectedField}
        fieldKeyword={fieldKeyword}
        onFieldKeywordChange={setFieldKeyword}
        onSelectField={setSelectedField}
      />

      <section className="relative flex flex-1 flex-col bg-gray-50/60">
        {selectedField ? (
          <>
            <SeasonHeader
              selectedField={selectedField}
              activePlots={activePlots}
              sortedSeasons={sortedSeasons}
              selectedSeasonId={selectedSeasonId}
              currentSeason={currentSeason}
              isSeasonActive={isSeasonActive}
              hasActiveSeason={hasActiveSeason}
              seasonAssignedPlots={seasonAssignedPlots}
              filterPlotId={filterPlotId}
              filterTaskId={filterTaskId}
              filterPlotOptions={filterPlotOptions}
              taskTypes={taskTypes}
              totalCost={totalCost}
              onSelectSeason={setSelectedSeasonId}
              onCreateSeason={openCreateSeasonModal}
              onEditSeason={openEditSeasonModal}
              onFinishSeason={handleFinishSeason}
              onCreateLog={openCreateLogModal}
              onFilterPlotChange={setFilterPlotId}
              onFilterTaskChange={setFilterTaskId}
              onResetFilters={() => {
                setFilterPlotId("");
                setFilterTaskId("");
              }}
            />

            <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6">
              <DiaryLogList
                loading={loadingFieldDetail || loadingLogs}
                currentSeason={currentSeason}
                isSeasonActive={isSeasonActive}
                filteredLogs={filteredLogs}
                totalLogs={logs.length}
                onCreateLog={openCreateLogModal}
                onEditLog={openEditLogModal}
                onDeleteLog={handleDeleteLog}
              />
            </div>
          </>
        ) : (
          <SeasonHeader selectedField={null} />
        )}
      </section>

      <DiaryLogModal
        isOpen={isLogModalOpen}
        editingLog={editingLog}
        logForm={logForm}
        taskTypes={taskTypes}
        seasonLoggablePlots={seasonLoggablePlots}
        onClose={() => setIsLogModalOpen(false)}
        onSave={handleSaveLog}
        onFormChange={(changes) => setLogForm((prev) => ({ ...prev, ...changes }))}
        onTogglePlot={toggleLogPlot}
        onSelectAllPlots={handleSelectAllLogPlots}
      />

      <SeasonModal
        isOpen={isSeasonModalOpen}
        seasonForm={seasonForm}
        seasonCatalogs={seasonCatalogs}
        seasonSelectablePlots={seasonSelectablePlots}
        selectedSeasonCatalog={selectedSeasonCatalog}
        onClose={() => setIsSeasonModalOpen(false)}
        onSave={handleSaveSeason}
        onFormChange={(changes) => setSeasonForm((prev) => ({ ...prev, ...changes }))}
        onTogglePlot={toggleSeasonPlot}
      />
    </div>
  );
};

export default Crops;
