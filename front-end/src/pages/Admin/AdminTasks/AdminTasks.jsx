import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
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

const AdminTasks = () => {
  const { toast, confirm } = useFeedback();
  const [stages, setStages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStageId, setFilterStageId] = useState("");
  const [newStageId, setNewStageId] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskOrder, setNewTaskOrder] = useState(0);
  const [newTaskCategory, setNewTaskCategory] = useState("OTHER");
  const [newTaskIsRepeatable, setNewTaskIsRepeatable] = useState(true);
  const [newTaskPrerequisites, setNewTaskPrerequisites] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingTaskStageId, setEditingTaskStageId] = useState("");
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingTaskOrder, setEditingTaskOrder] = useState(0);
  const [editingTaskCategory, setEditingTaskCategory] = useState("OTHER");
  const [editingTaskIsRepeatable, setEditingTaskIsRepeatable] = useState(true);
  const [editingTaskPrerequisites, setEditingTaskPrerequisites] = useState([]);

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
      ...stages.map((stage) => ({
        value: stage._id,
        label: stage.name,
      })),
    ],
    [stages],
  );

  const filterStageOptions = useMemo(
    () => [
      { value: "", label: "Tất cả giai đoạn" },
      ...stages.map((stage) => ({
        value: stage._id,
        label: `${stage.name}`,
      })),
    ],
    [stages],
  );

  const taskOptionsForPrerequisites = useMemo(() => {
    return tasks.map((task) => ({
      value: task._id,
      label: `${task.name}`,
    }));
  }, [tasks]);

  const categoryOptions = useMemo(() => TASK_CATEGORY_OPTIONS, []);

  const handleCreate = async () => {
    const stageId = newStageId.trim();
    const name = newTaskName.trim();

    if (!stageId) {
      toast.warning("Vui lòng chọn giai đoạn");
      return;
    }
    if (!name) {
      toast.warning("Vui lòng nhập tên công việc");
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
      });
      setNewTaskName("");
      setNewTaskOrder(0);
      setNewTaskCategory("OTHER");
      setNewTaskIsRepeatable(true);
      setNewTaskPrerequisites([]);
      if (!filterStageId) {
        setFilterStageId(stageId);
      }
      await fetchBootstrap();
      toast.success("Thêm công việc thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể thêm công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (task) => {
    setEditingTaskId(task._id);
    setEditingTaskStageId(task.stage?._id || task.stage);
    setEditingTaskName(task.name || "");
    setEditingTaskOrder(task.order || 0);
    setEditingTaskCategory(task.category || "OTHER");
    setEditingTaskIsRepeatable(task.isRepeatable ?? true);
    setEditingTaskPrerequisites(
      (task.prerequisites || []).map((p) => p._id || p),
    );
  };

  const cancelEdit = () => {
    setEditingTaskId("");
    setEditingTaskStageId("");
    setEditingTaskName("");
    setEditingTaskOrder(0);
    setEditingTaskCategory("OTHER");
    setEditingTaskIsRepeatable(true);
    setEditingTaskPrerequisites([]);
  };

  const handleUpdate = async (id) => {
    const stageId = editingTaskStageId.trim();
    const name = editingTaskName.trim();

    if (!stageId) {
      toast.warning("Vui lòng chọn giai đoạn");
      return;
    }
    if (!name) {
      toast.warning("Tên công việc không được để trống");
      return;
    }

    if (editingTaskOrder < 0) {
      toast.warning("Thứ tự phải là số không âm");
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý công việc</h1>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">Thêm công việc mới</h2>
          <div className="grid gap-3">
            <CustomDropdown
              value={newStageId}
              onChange={setNewStageId}
              options={stageOptions}
              placeholder="Chọn giai đoạn"
              icon={Briefcase}
            />
            <input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Tên công việc"
              className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
            />
            <CustomDropdown
              value={newTaskCategory}
              onChange={setNewTaskCategory}
              options={categoryOptions}
              placeholder="Chọn danh mục"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={newTaskOrder}
                onChange={(e) => setNewTaskOrder(Number(e.target.value))}
                placeholder="Thứ tự"
                min="0"
                className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
              />
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={newTaskIsRepeatable}
                  onChange={(e) => setNewTaskIsRepeatable(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 cursor-pointer"
                />
                <span className="text-sm text-gray-700">Cho phép lặp lại</span>
              </label>
            </div>
            <CustomDropdown
              value={newTaskPrerequisites}
              onChange={setNewTaskPrerequisites}
              options={taskOptionsForPrerequisites}
              placeholder="Công việc tiên quyết"
              multi={true}
            />
            <button
              disabled={submitting}
              onClick={handleCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={16} /> Thêm mới
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">Lọc theo giai đoạn</h2>
          <CustomDropdown
            value={filterStageId}
            onChange={setFilterStageId}
            options={filterStageOptions}
            placeholder="Tất cả giai đoạn"
            icon={Briefcase}
            variant="filter"
          />
          <p className="mt-3 text-sm text-gray-500">
            Hiển thị {filteredTasks.length} công việc.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-800">Danh mục công việc</h2>
          <span className="text-sm text-gray-500">
            Tổng: {filteredTasks.length}
          </span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu công việc..." />
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-gray-500">
            Chưa có công việc nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
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
                    Cho phép lặp lại
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Công việc tiên quyết
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTasks;
