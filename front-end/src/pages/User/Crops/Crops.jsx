import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CropsSidebar from "./CropsSidebar";
import SeasonHeader from "./SeasonHeader";
import DiaryLogList from "./DiaryLogList";
import DiaryLogModal from "./DiaryLogModal";

const getToday = () => new Date().toISOString().split("T")[0];

const emptyLogForm = {
  taskType: null,
  description: "",
  cost: "",
  date: getToday(),
  selectedPlotIds: [],
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
  const [taskTypes, setTaskTypes] = useState([]);
  const [loadingFieldDetail, setLoadingFieldDetail] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterPlotId, setFilterPlotId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [logForm, setLogForm] = useState(emptyLogForm);

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
        const [fieldRes, taskRes] = await Promise.all([
          api.get("/fields"),
          api.get("/tasks"),
        ]);

        const nextFields = (fieldRes.data || []).filter(
          (f) => Number(f.myPlotCount || 0) > 0
        );
        setFields(nextFields);
        setTaskTypes(taskRes.data || []);

        if (nextFields.length > 0) setSelectedField(nextFields[0]);
      } catch (error) {
        console.error("Lỗi tải dữ liệu cơ sở", error);
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
          api.get("/season-details/member", { params: { fieldId: selectedField._id } }),
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

  const refreshLogs = async (seasonId) => {
    const res = await api.get("/diary-logs", { params: { seasonId } });
    setLogs(res.data || []);
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
    </div>
  );
};

export default Crops;
