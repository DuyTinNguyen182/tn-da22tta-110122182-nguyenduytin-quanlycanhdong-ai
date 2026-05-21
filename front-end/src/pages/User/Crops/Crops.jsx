import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CropsSidebar from "./CropsSidebar";
import SeasonHeader from "./SeasonHeader";
import FarmingLogList from "./FarmingLogList";
import FarmingLogModal from "./FarmingLogModal";

const getToday = () => new Date().toISOString().split("T")[0];

const emptyLogForm = {
  task: null,
  description: "",
  cost: "",
  date: getToday(),
  selectedPlotIds: [],
};

const sortByOrderThenName = (items = []) =>
  [...items].sort(
    (a, b) =>
      Number(a?.order || 0) - Number(b?.order || 0) ||
      String(a?.name || "").localeCompare(String(b?.name || ""), "vi"),
  );

const sortSeasons = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return (
      new Date(b.startDate || b.createdAt || 0) -
      new Date(a.startDate || a.createdAt || 0)
    );
  });

const getLogPlots = (log) => {
  if (Array.isArray(log?.plots) && log.plots.length > 0)
    return log.plots.filter(Boolean);
  if (log?.plot) return [log.plot];
  return [];
};

const buildTaskGroups = (stages = [], tasks = []) => {
  const tasksByStage = new Map();

  tasks.forEach((task) => {
    const stageId = task?.stage?._id || task?.stage;
    if (!stageId) return;

    if (!tasksByStage.has(String(stageId))) {
      tasksByStage.set(String(stageId), []);
    }

    tasksByStage.get(String(stageId)).push(task);
  });

  return sortByOrderThenName(stages)
    .map((stage) => ({
      value: `stage:${stage._id}`,
      label: stage.name,
      stage,
      children: sortByOrderThenName(
        tasksByStage.get(String(stage._id)) || [],
      ).map((task) => ({
        value: `task:${task._id}`,
        label: task.name,
        task,
      })),
    }))
    .filter((group) => group.children.length > 0);
};

const matchesTaskFilter = (log, filterValue, taskById) => {
  if (!filterValue) return true;

  if (filterValue.startsWith("stage:")) {
    const stageId = filterValue.replace("stage:", "");
    const task = taskById.get(String(log.taskId));
    return String(task?.stage?._id || task?.stage || "") === stageId;
  }

  if (filterValue.startsWith("task:")) {
    return log.taskId === filterValue.replace("task:", "");
  }

  return log.taskId === filterValue;
};

const Crops = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [stages, setStages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loadingFieldDetail, setLoadingFieldDetail] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterPlotId, setFilterPlotId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [logForm, setLogForm] = useState(emptyLogForm);

  const sortedSeasons = useMemo(() => sortSeasons(seasons), [seasons]);

  const currentSeason = useMemo(
    () =>
      sortedSeasons.find((season) => season._id === selectedSeasonId) || null,
    [sortedSeasons, selectedSeasonId],
  );

  const isSeasonActive = currentSeason?.status === "active";
  const seasonLoggablePlots = currentSeason?.loggablePlots || [];
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [String(task._id), task])),
    [tasks],
  );
  const taskGroups = useMemo(
    () => buildTaskGroups(stages, tasks),
    [stages, tasks],
  );

  const filterPlotOptions = useMemo(() => {
    const optionMap = new Map();

    (currentSeason?.assignedPlots || []).forEach((plot) => {
      if (plot?._id) optionMap.set(plot._id, plot);
    });

    logs.forEach((log) => {
      getLogPlots(log).forEach((plot) => {
        if (plot?._id) optionMap.set(plot._id, plot);
      });
    });

    return Array.from(optionMap.values());
  }, [currentSeason, logs]);

  const filteredLogs = useMemo(() => {
    const next = logs.filter((log) => {
      const matchTask = matchesTaskFilter(log, filterTaskId, taskById);
      const matchPlot = filterPlotId
        ? getLogPlots(log).some(
            (plot) => plot?._id === filterPlotId || plot === filterPlotId,
          )
        : true;

      return matchTask && matchPlot;
    });

    return next.sort((a, b) => {
      const diff =
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      if (diff !== 0) return diff;
      return (
        new Date(b.createdAt || b.updatedAt || 0).getTime() -
        new Date(a.createdAt || a.updatedAt || 0).getTime()
      );
    });
  }, [filterPlotId, filterTaskId, logs, taskById]);

  const totalCost = useMemo(
    () => filteredLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0),
    [filteredLogs],
  );

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const [fieldRes, stageRes, taskRes] = await Promise.all([
          api.get("/fields", { params: { assignedOnly: true, my: true } }),
          api.get("/stages"),
          api.get("/tasks"),
        ]);

        const nextFields = fieldRes.data || [];
        setFields(nextFields);
        setStages(stageRes.data || []);
        setTasks(taskRes.data || []);

        if (nextFields.length > 0) {
          setSelectedField(nextFields[0]);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu cơ sở", error);
      }
    };

    loadBootstrap();
  }, []);

  useEffect(() => {
    if (!selectedField?._id) {
      setSeasons([]);
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

        const seasonRes = await api.get("/season-details/member", {
          params: { fieldId: selectedField._id },
        });

        const nextSeasons = seasonRes.data || [];
        const nextSortedSeasons = sortSeasons(nextSeasons);

        setSeasons(nextSeasons);
        setSelectedSeasonId(
          nextSortedSeasons.find((season) => season.status === "active")?._id ||
            nextSortedSeasons[0]?._id ||
            "",
        );
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
        const res = await api.get("/farming-logs", {
          params: {
            seasonId: selectedSeasonId,
            ...(selectedField?._id ? { fieldId: selectedField._id } : {}),
          },
        });
        setLogs(res.data || []);
      } catch (error) {
        console.error("Lỗi tải nhật ký canh tác", error);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadLogs();
  }, [selectedSeasonId, selectedField?._id]);

  const refreshLogs = async (seasonId) => {
    const res = await api.get("/farming-logs", {
      params: {
        seasonId,
        ...(selectedField?._id ? { fieldId: selectedField._id } : {}),
      },
    });

    setLogs(res.data || []);
  };

  const openCreateLogModal = () => {
    if (!isSeasonActive) return;

    setEditingLog(null);
    setLogForm({
      task: null,
      description: "",
      cost: "",
      date: getToday(),
      selectedPlotIds: seasonLoggablePlots.map((plot) => plot._id),
    });
    setIsLogModalOpen(true);
  };

  const openEditLogModal = (log) => {
    const foundTask =
      taskById.get(String(log.taskId)) ||
      tasks.find((task) => task.name === log.taskName) ||
      null;

    setEditingLog(log);
    setLogForm({
      task: foundTask,
      description: log.description || "",
      cost: log.cost || "",
      date: log.date ? log.date.split("T")[0] : getToday(),
      selectedPlotIds: getLogPlots(log)
        .map((plot) => plot?._id || plot)
        .filter(Boolean),
    });
    setIsLogModalOpen(true);
  };

  const handleTaskChange = (task) => {
    setLogForm((prev) => ({
      ...prev,
      task,
    }));
  };

  const handleSaveLog = async () => {
    if (!currentSeason?._id || !logForm.task?._id) {
      toast.warning("Vui lòng chọn công việc.");
      return;
    }

    if (
      Number(logForm.task?.stage?.order || 0) === 0 &&
      !logForm.description.trim()
    ) {
      toast.warning("Vui lòng nhập mô tả cho công việc thường xuyên.");
      return;
    }

    if (logForm.selectedPlotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thửa áp dụng.");
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
      taskId: logForm.task._id,
      description: logForm.description.trim(),
      cost: Number(logForm.cost || 0),
      date: logForm.date,
      seasonId: currentSeason._id,
      fieldId: selectedField?._id || null,
      scope,
      plotId: scope === "single_plot" ? logForm.selectedPlotIds[0] : null,
      plotIds: scope === "all_plots" ? allPlotIds : logForm.selectedPlotIds,
    };

    try {
      if (editingLog) {
        await api.put(`/farming-logs/${editingLog._id}`, payload);
      } else {
        await api.post("/farming-logs", payload);
      }

      setIsLogModalOpen(false);
      toast.success(
        editingLog
          ? "Đã cập nhật nhật ký canh tác."
          : "Đã tạo nhật ký canh tác.",
      );
      await refreshLogs(currentSeason._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu nhật ký.");
    }
  };

  const handleDeleteLog = async (logId) => {
    const confirmed = await confirm({
      title: "Xóa nhật ký?",
      message:
        "Thao tác này sẽ xóa nhật ký canh tác hiện tại khỏi vụ mùa đang chọn.",
      confirmText: "Xóa nhật ký",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/farming-logs/${logId}`);
      toast.success("Đã xóa nhật ký canh tác.");
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
    const allPlotIds = seasonLoggablePlots.map((plot) => plot._id);
    setLogForm((prev) => ({
      ...prev,
      selectedPlotIds:
        prev.selectedPlotIds.length === allPlotIds.length ? [] : allPlotIds,
    }));
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50 font-sans">
      <CropsSidebar
        fields={fields}
        selectedField={selectedField}
        onSelectField={setSelectedField}
      />

      <section className="relative flex flex-1 flex-col bg-gray-50/60">
        {selectedField ? (
          <>
            <SeasonHeader
              selectedField={selectedField}
              sortedSeasons={sortedSeasons}
              selectedSeasonId={selectedSeasonId}
              currentSeason={currentSeason}
              isSeasonActive={isSeasonActive}
              filterPlotId={filterPlotId}
              filterTaskId={filterTaskId}
              filterPlotOptions={filterPlotOptions}
              taskFilterOptions={taskGroups}
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
              <FarmingLogList
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

      <FarmingLogModal
        isOpen={isLogModalOpen}
        editingLog={editingLog}
        logForm={logForm}
        taskGroups={taskGroups}
        seasonLoggablePlots={seasonLoggablePlots}
        onClose={() => setIsLogModalOpen(false)}
        onSave={handleSaveLog}
        onTaskChange={handleTaskChange}
        onFormChange={(changes) =>
          setLogForm((prev) => ({ ...prev, ...changes }))
        }
        onTogglePlot={toggleLogPlot}
        onSelectAllPlots={handleSelectAllLogPlots}
      />
    </div>
  );
};

export default Crops;
