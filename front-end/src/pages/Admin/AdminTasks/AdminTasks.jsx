import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import TaskTable from "./components/TaskTable";
import TaskFormModal from "./components/TaskFormModal";

const TASKS_PER_PAGE = 10;

const TASK_CATEGORY_OPTIONS = [
  { value: "FERTILIZER", label: "Phân bón" },
  { value: "PESTICIDE", label: "Thuốc BVTV" },
  { value: "WATER", label: "Nước (Tưới tiêu)" },
  { value: "LABOR", label: "Nhân công" },
  { value: "SEED", label: "Lúa giống" },
  { value: "OTHER", label: "Khác" },
];

const REC_TYPE_OPTIONS = [
  { value: "NONE", label: "Không gợi ý (Công việc tự do)" },
  { value: "BEFORE", label: "Công việc Chuẩn bị (Trước khi sạ)" },
  { value: "SOWING", label: "Mốc xuống giống (Ngày 0)" },
  { value: "AFTER", label: "Gợi ý chăm sóc (Sau khi sạ)" },
];

const categoryOptions = TASK_CATEGORY_OPTIONS;

// Hàm chuyển đổi dữ liệu từ UI Dropdown thành cấu trúc lưu DB
const mapRecTypeToPayload = (type, start, end) => {
  switch (type) {
    case "BEFORE":
      return {
        isSuggested: true,
        isSowingTask: false,
        startDay: -1,
        endDay: -1,
      };
    case "SOWING":
      return { isSuggested: true, isSowingTask: true, startDay: 0, endDay: 0 };
    case "AFTER":
      return {
        isSuggested: true,
        isSowingTask: false,
        startDay: Math.abs(Number(start) || 0),
        endDay: Math.abs(Number(end) || 0),
      };
    case "NONE":
    default:
      return {
        isSuggested: false,
        isSowingTask: false,
        startDay: null,
        endDay: null,
      };
  }
};

// Hàm chuyển đổi ngược dữ liệu từ DB ra trạng thái UI Dropdown
const mapPayloadToRecType = (rec) => {
  if (!rec || !rec.isSuggested) return { type: "NONE", start: 0, end: 0 };
  if (rec.isSowingTask) return { type: "SOWING", start: 0, end: 0 };
  if (rec.startDay < 0 || rec.endDay < 0)
    return { type: "BEFORE", start: 0, end: 0 };
  return { type: "AFTER", start: rec.startDay || 0, end: rec.endDay || 0 };
};

const AdminTasks = () => {
  const { toast, confirm } = useFeedback();
  const [stages, setStages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStageId, setFilterStageId] = useState("");

  // Trạng thái điều khiển Popup (Modal) thêm mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");

  // States form thêm mới
  const [newStageId, setNewStageId] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskOrder, setNewTaskOrder] = useState(0);
  const [newTaskCategory, setNewTaskCategory] = useState("OTHER");
  const [newTaskIsRepeatable, setNewTaskIsRepeatable] = useState(true);
  const [newTaskPrerequisites, setNewTaskPrerequisites] = useState([]);
  const [newTaskRecType, setNewTaskRecType] = useState("NONE");
  const [newTaskStartDay, setNewTaskStartDay] = useState(0);
  const [newTaskEndDay, setNewTaskEndDay] = useState(0);

  // States form chỉnh sửa trực tiếp trên dòng
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingTaskStageId, setEditingTaskStageId] = useState("");
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingTaskOrder, setEditingTaskOrder] = useState(0);
  const [editingTaskCategory, setEditingTaskCategory] = useState("OTHER");
  const [editingTaskIsRepeatable, setEditingTaskIsRepeatable] = useState(true);
  const [editingTaskPrerequisites, setEditingTaskPrerequisites] = useState([]);
  const [editingTaskRecType, setEditingTaskRecType] = useState("NONE");
  const [editingTaskStartDay, setEditingTaskStartDay] = useState(0);
  const [editingTaskEndDay, setEditingTaskEndDay] = useState(0);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchBootstrap();
  }, []);

  const fetchBootstrap = async () => {
    setLoading(true);
    try {
      const [stageRes, taskRes] = await Promise.all([
        api.get("/stages"),
        api.get("/tasks"),
      ]);
      setStages(stageRes.data || []);
      setTasks(taskRes.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể tải danh sách công việc",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!filterStageId) return tasks;
    return tasks.filter(
      (item) => String(item.stage?._id || item.stage) === filterStageId,
    );
  }, [filterStageId, tasks]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / TASKS_PER_PAGE),
  );

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [currentPage, filteredTasks]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStageId]);

  const stageOptions = useMemo(
    () => [
      { value: "", label: "Chọn giai đoạn" },
      ...stages.map((s) => ({ value: s._id, label: s.name })),
    ],
    [stages],
  );

  const filterStageOptions = useMemo(
    () => [
      { value: "", label: "Tất cả giai đoạn" },
      ...stages.map((s) => ({ value: s._id, label: s.name })),
    ],
    [stages],
  );

  const taskOptionsForPrerequisites = useMemo(
    () => tasks.map((t) => ({ value: t._id, label: t.name })),
    [tasks],
  );

  const resetNewTaskForm = () => {
    setNewStageId("");
    setNewTaskName("");
    setNewTaskOrder(0);
    setNewTaskCategory("OTHER");
    setNewTaskIsRepeatable(true);
    setNewTaskPrerequisites([]);
    setNewTaskRecType("NONE");
    setNewTaskStartDay(0);
    setNewTaskEndDay(0);
  };

  const resetEditingTaskForm = () => {
    setEditingTaskId("");
    setEditingTaskStageId("");
    setEditingTaskName("");
    setEditingTaskOrder(0);
    setEditingTaskCategory("OTHER");
    setEditingTaskIsRepeatable(true);
    setEditingTaskPrerequisites([]);
    setEditingTaskRecType("NONE");
    setEditingTaskStartDay(0);
    setEditingTaskEndDay(0);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setModalMode("create");
    resetNewTaskForm();
    resetEditingTaskForm();
  };

  const openCreateModal = () => {
    setModalMode("create");
    resetNewTaskForm();
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    const stageId = newStageId.trim();
    const name = newTaskName.trim();

    if (!stageId || !name) {
      toast.warning("Vui lòng điền đầy đủ Giai đoạn và Tên công việc");
      return;
    }
    if (newTaskOrder < 0) {
      toast.warning("Thứ tự phải là số không âm");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/tasks", {
        stage: stageId,
        name,
        order: newTaskOrder,
        category: newTaskCategory,
        isRepeatable: newTaskIsRepeatable,
        prerequisites: newTaskPrerequisites,
        recommendation: mapRecTypeToPayload(
          newTaskRecType,
          newTaskStartDay,
          newTaskEndDay,
        ),
      });

      resetNewTaskForm();
      setIsModalOpen(false);
      if (!filterStageId) setFilterStageId(stageId);
      await fetchBootstrap();
      toast.success("Thêm công việc thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể thêm công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (task) => {
    setModalMode("edit");
    setEditingTaskId(task._id);
    setEditingTaskStageId(task.stage?._id || task.stage);
    setEditingTaskName(task.name || "");
    setEditingTaskOrder(task.order || 0);
    setEditingTaskCategory(task.category || "OTHER");
    setEditingTaskIsRepeatable(task.isRepeatable ?? true);
    setEditingTaskPrerequisites(
      (task.prerequisites || []).map((p) => p._id || p),
    );

    const uiRec = mapPayloadToRecType(task.recommendation);
    setEditingTaskRecType(uiRec.type);
    setEditingTaskStartDay(uiRec.start);
    setEditingTaskEndDay(uiRec.end);
    setIsModalOpen(true);
  };

  const cancelEdit = () => {
    closeTaskModal();
  };

  const handleUpdate = async (id) => {
    const stageId = editingTaskStageId.trim();
    const name = editingTaskName.trim();

    if (!stageId || !name) {
      toast.warning("Giai đoạn và Tên công việc không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/tasks/${id}`, {
        stage: stageId,
        name,
        order: editingTaskOrder,
        category: editingTaskCategory,
        isRepeatable: editingTaskIsRepeatable,
        prerequisites: editingTaskPrerequisites,
        recommendation: mapRecTypeToPayload(
          editingTaskRecType,
          editingTaskStartDay,
          editingTaskEndDay,
        ),
      });
      cancelEdit();
      await fetchBootstrap();
      toast.success("Cập nhật công việc thành công!");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể cập nhật công việc",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task) => {
    const confirmed = await confirm({
      title: "Xóa công việc?",
      message: `Bạn có chắc muốn xóa '${task.name}'?`,
      confirmText: "Xóa công việc",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/tasks/${task._id}`);
      await fetchBootstrap();
      toast.success("Xóa công việc thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (submitting) return;
    closeTaskModal();
  };

  const handleSubmitTask = async () => {
    if (modalMode === "edit") {
      if (!editingTaskId) return;
      await handleUpdate(editingTaskId);
      return;
    }

    await handleCreate();
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      {/* HEADER SECTION */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quản lý mục công việc
          </h1>
          <p className="text-sm text-gray-500">
            Thiết lập quy trình công việc tiêu chuẩn và cấu hình gợi ý công việc
          </p>
        </div>

        {/* FILTER & ACTION BUTTONS */}
        <div className="flex items-end gap-3 shrink-0">
          <div className="w-56 rounded-xl bg-white border border-gray-200 p-2">
            <CustomDropdown
              value={filterStageId}
              onChange={setFilterStageId}
              options={filterStageOptions}
              placeholder="Tất cả giai đoạn"
              icon={Briefcase}
              variant="filter"
              size="small"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 shrink-0"
          >
            <Plus size={18} /> Thêm công việc mới
          </button>
        </div>
      </div>

      {/* MAIN DATA TABLE CONTAINER */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mt-5">
        <TaskTable
          tasks={paginatedTasks}
          loading={loading}
          stageOptions={stageOptions}
          taskOptionsForPrerequisites={taskOptionsForPrerequisites}
          currentPage={currentPage}
          totalPages={totalPages}
          totalTasks={filteredTasks.length}
          onPageChange={setCurrentPage}
          onStartEdit={startEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* POPUP (MODAL) THÊM/SỬA CÔNG VIỆC */}
      <TaskFormModal
        open={isModalOpen}
        modalMode={modalMode}
        submitting={submitting}
        stageOptions={stageOptions}
        categoryOptions={categoryOptions}
        taskOptionsForPrerequisites={taskOptionsForPrerequisites}
        recTypeOptions={REC_TYPE_OPTIONS}
        // Props for data (edit/create form)
        stageId={modalMode === "edit" ? editingTaskStageId : newStageId}
        setStageId={
          modalMode === "edit" ? setEditingTaskStageId : setNewStageId
        }
        name={modalMode === "edit" ? editingTaskName : newTaskName}
        setName={modalMode === "edit" ? setEditingTaskName : setNewTaskName}
        order={modalMode === "edit" ? editingTaskOrder : newTaskOrder}
        setOrder={modalMode === "edit" ? setEditingTaskOrder : setNewTaskOrder}
        category={modalMode === "edit" ? editingTaskCategory : newTaskCategory}
        setCategory={
          modalMode === "edit" ? setEditingTaskCategory : setNewTaskCategory
        }
        isRepeatable={
          modalMode === "edit" ? editingTaskIsRepeatable : newTaskIsRepeatable
        }
        setIsRepeatable={
          modalMode === "edit"
            ? setEditingTaskIsRepeatable
            : setNewTaskIsRepeatable
        }
        prerequisites={
          modalMode === "edit" ? editingTaskPrerequisites : newTaskPrerequisites
        }
        setPrerequisites={
          modalMode === "edit"
            ? setEditingTaskPrerequisites
            : setNewTaskPrerequisites
        }
        recType={modalMode === "edit" ? editingTaskRecType : newTaskRecType}
        setRecType={
          modalMode === "edit" ? setEditingTaskRecType : setNewTaskRecType
        }
        startDay={modalMode === "edit" ? editingTaskStartDay : newTaskStartDay}
        setStartDay={
          modalMode === "edit" ? setEditingTaskStartDay : setNewTaskStartDay
        }
        endDay={modalMode === "edit" ? editingTaskEndDay : newTaskEndDay}
        setEndDay={
          modalMode === "edit" ? setEditingTaskEndDay : setNewTaskEndDay
        }
        // Handlers
        onClose={handleCloseModal}
        onSubmit={handleSubmitTask}
      />
    </div>
  );
};

export default AdminTasks;
