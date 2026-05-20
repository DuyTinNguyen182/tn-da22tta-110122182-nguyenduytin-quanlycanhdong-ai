import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import TaskRow from "./components/TaskRow";

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
            Thiết lập quy trình công việc tiêu chuẩn và cấu hình trợ lý sinh học
            nhắc việc
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
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
          <h2 className="font-bold text-gray-800">Danh mục công việc</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Số lượng: {filteredTasks.length}
          </span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu công việc..." />
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-gray-500">
            Chưa có công việc nào thuộc tiêu chí này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Giai đoạn
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Tên công việc
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Thứ tự
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Danh mục
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Lặp lại
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Tiên quyết
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 min-w-[210px]">
                    Cấu hình Gợi ý nhắc việc
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => (
                  <TaskRow
                    key={task._id}
                    task={task}
                    stageOptions={stageOptions}
                    taskOptions={taskOptionsForPrerequisites}
                    isEditing={editingTaskId === task._id}
                    editingTaskStageId={editingTaskStageId}
                    editingTaskName={editingTaskName}
                    editingTaskOrder={editingTaskOrder}
                    editingTaskCategory={editingTaskCategory}
                    editingTaskIsRepeatable={editingTaskIsRepeatable}
                    editingTaskPrerequisites={editingTaskPrerequisites}
                    editingTaskRecType={editingTaskRecType}
                    editingTaskStartDay={editingTaskStartDay}
                    editingTaskEndDay={editingTaskEndDay}
                    submitting={submitting}
                    onStartEdit={startEdit}
                    onUpdate={handleUpdate}
                    onCancelEdit={cancelEdit}
                    onDelete={handleDelete}
                    onEditingTaskStageIdChange={setEditingTaskStageId}
                    onEditingTaskNameChange={setEditingTaskName}
                    onEditingTaskOrderChange={setEditingTaskOrder}
                    onEditingTaskCategoryChange={setEditingTaskCategory}
                    onEditingTaskIsRepeatableChange={setEditingTaskIsRepeatable}
                    onEditingTaskPrerequisitesChange={
                      setEditingTaskPrerequisites
                    }
                    onEditingTaskRecTypeChange={setEditingTaskRecType}
                    onEditingTaskStartDayChange={setEditingTaskStartDay}
                    onEditingTaskEndDayChange={setEditingTaskEndDay}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POPUP (MODAL) THÊM CÔNG VIỆC MỚI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-100 bg-white shadow-xl">
            {/* Header Popup */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {modalMode === "edit"
                    ? "Chỉnh sửa công việc"
                    : "Tạo công việc tiêu chuẩn mới"}
                </h2>
                <p className="text-xs text-gray-500">
                  {modalMode === "edit"
                    ? "Cập nhật thông tin và cấu hình nhắc việc cho công việc đã chọn"
                    : "Thiết lập công việc tiêu chuẩn và cấu hình trợ lý nhắc việc"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Popup */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Thuộc giai đoạn vụ mùa
                </label>
                <CustomDropdown
                  value={modalMode === "edit" ? editingTaskStageId : newStageId}
                  onChange={
                    modalMode === "edit" ? setEditingTaskStageId : setNewStageId
                  }
                  options={stageOptions}
                  placeholder="Chọn giai đoạn sản xuất"
                  icon={Briefcase}
                  variant="active"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Tên hạng mục công việc
                </label>
                <input
                  value={modalMode === "edit" ? editingTaskName : newTaskName}
                  onChange={(e) =>
                    modalMode === "edit"
                      ? setEditingTaskName(e.target.value)
                      : setNewTaskName(e.target.value)
                  }
                  placeholder="Ví dụ: Bón phân đợt 1, Xịt trừ rầy nâu..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Danh mục vật tư/loại đầu vào
                </label>
                <CustomDropdown
                  value={
                    modalMode === "edit" ? editingTaskCategory : newTaskCategory
                  }
                  onChange={
                    modalMode === "edit"
                      ? setEditingTaskCategory
                      : setNewTaskCategory
                  }
                  options={categoryOptions}
                  placeholder="Chọn nhóm danh mục"
                  variant="active"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Thứ tự hiển thị quy trình
                  </label>
                  <input
                    type="number"
                    value={
                      modalMode === "edit" ? editingTaskOrder : newTaskOrder
                    }
                    onChange={(e) =>
                      modalMode === "edit"
                        ? setEditingTaskOrder(Number(e.target.value))
                        : setNewTaskOrder(Number(e.target.value))
                    }
                    min="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Lặp lại công việc
                  </label>
                  <label className="flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={
                        modalMode === "edit"
                          ? editingTaskIsRepeatable
                          : newTaskIsRepeatable
                      }
                      onChange={(e) =>
                        modalMode === "edit"
                          ? setEditingTaskIsRepeatable(e.target.checked)
                          : setNewTaskIsRepeatable(e.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">
                      Cho phép lặp lại nhiều lần
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Công việc điều kiện tiên quyết
                </label>
                <CustomDropdown
                  value={
                    modalMode === "edit"
                      ? editingTaskPrerequisites
                      : newTaskPrerequisites
                  }
                  onChange={
                    modalMode === "edit"
                      ? setEditingTaskPrerequisites
                      : setNewTaskPrerequisites
                  }
                  options={taskOptionsForPrerequisites}
                  placeholder="Chọn các công việc bắt buộc làm trước"
                  multi
                  variant="active"
                />
              </div>

              {/* KHU VỰC CẤU HÌNH TRỢ LÝ NHẮC VIỆC SIÊU TIN GỌN */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-blue-800">
                  Thiết lập tự động nhắc việc
                </h3>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Loại mốc thời gian áp dụng
                  </label>
                  <CustomDropdown
                    value={
                      modalMode === "edit" ? editingTaskRecType : newTaskRecType
                    }
                    onChange={
                      modalMode === "edit"
                        ? setEditingTaskRecType
                        : setNewTaskRecType
                    }
                    options={REC_TYPE_OPTIONS}
                    placeholder="Chọn loại mốc"
                    variant="active"
                  />
                </div>

                {/* Chỉ hiển thị khung nhập ngày khi Admin chọn Chăm sóc sau sạ */}
                {(modalMode === "edit"
                  ? editingTaskRecType
                  : newTaskRecType) === "AFTER" && (
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 animate-slideDown">
                    <span className="text-sm text-gray-600">
                      Khung thời gian vàng: Từ ngày
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={
                        modalMode === "edit"
                          ? editingTaskStartDay
                          : newTaskStartDay
                      }
                      onChange={(e) =>
                        modalMode === "edit"
                          ? setEditingTaskStartDay(Number(e.target.value))
                          : setNewTaskStartDay(Number(e.target.value))
                      }
                      className="w-16 rounded-lg border border-gray-200 p-1.5 text-sm text-center font-semibold outline-none focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">đến ngày</span>
                    <input
                      type="number"
                      min="0"
                      value={
                        modalMode === "edit" ? editingTaskEndDay : newTaskEndDay
                      }
                      onChange={(e) =>
                        modalMode === "edit"
                          ? setEditingTaskEndDay(Number(e.target.value))
                          : setNewTaskEndDay(Number(e.target.value))
                      }
                      className="w-16 rounded-lg border border-gray-200 p-1.5 text-sm text-center font-semibold outline-none focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">sau sạ</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Popup */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                disabled={submitting}
                onClick={handleCloseModal}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTask}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {modalMode === "edit" ? "Lưu thay đổi" : "Xác nhận tạo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTasks;
