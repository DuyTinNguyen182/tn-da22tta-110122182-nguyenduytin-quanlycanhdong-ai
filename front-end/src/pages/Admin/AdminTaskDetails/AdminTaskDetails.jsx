import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import TaskDetailRow from "./components/TaskDetailRow";

const AdminTaskDetails = () => {
  const { toast, confirm } = useFeedback();
  const [tasks, setTasks] = useState([]);
  const [taskDetails, setTaskDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterTaskId, setFilterTaskId] = useState("");
  const [newTaskId, setNewTaskId] = useState("");
  const [newTaskDetailName, setNewTaskDetailName] = useState("");
  const [editingTaskDetailId, setEditingTaskDetailId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingTaskDetailName, setEditingTaskDetailName] = useState("");

  useEffect(() => {
    fetchBootstrap();
  }, []);

  const fetchBootstrap = async () => {
    setLoading(true);
    try {
      const [taskRes, taskDetailRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/task-details"),
      ]);
      setTasks(taskRes.data || []);
      setTaskDetails(taskDetailRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải danh sách chi tiết công việc");
    } finally {
      setLoading(false);
    }
  };

  const filteredTaskDetails = useMemo(() => {
    if (!filterTaskId) return taskDetails;
    return taskDetails.filter((item) => item.taskId === filterTaskId);
  }, [filterTaskId, taskDetails]);

  const createTaskOptions = useMemo(
    () => [
      { value: "", label: "Chọn công việc" },
      ...tasks.map((task) => ({
        value: task._id,
        label: task.name,
      })),
    ],
    [tasks]
  );

  const filterTaskOptions = useMemo(
    () => [
      { value: "", label: "Tất cả công việc" },
      ...tasks.map((task) => ({
        value: task._id,
        label: `${task.name} (${task.taskDetailCount || 0})`,
      })),
    ],
    [tasks]
  );

  const handleCreate = async () => {
    const taskId = newTaskId.trim();
    const name = newTaskDetailName.trim();

    if (!taskId) {
      toast.warning("Vui lòng chọn công việc");
      return;
    }
    if (!name) {
      toast.warning("Vui lòng nhập tên chi tiết công việc");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/task-details", { taskId, name });
      setNewTaskDetailName("");
      if (!filterTaskId) {
        setFilterTaskId(taskId);
      }
      await fetchBootstrap();
      toast.success("Đã tạo chi tiết công việc.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tạo chi tiết công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (taskDetail) => {
    setEditingTaskDetailId(taskDetail._id);
    setEditingTaskId(taskDetail.taskId || "");
    setEditingTaskDetailName(taskDetail.name || "");
  };

  const cancelEdit = () => {
    setEditingTaskDetailId("");
    setEditingTaskId("");
    setEditingTaskDetailName("");
  };

  const handleUpdate = async (id) => {
    const taskId = editingTaskId.trim();
    const name = editingTaskDetailName.trim();

    if (!taskId) {
      toast.warning("Vui lòng chọn công việc");
      return;
    }
    if (!name) {
      toast.warning("Tên chi tiết công việc không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/task-details/${id}`, { taskId, name });
      cancelEdit();
      await fetchBootstrap();
      toast.success("Đã cập nhật chi tiết công việc.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật chi tiết công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskDetail) => {
    const confirmed = await confirm({
      title: "Xóa chi tiết công việc?",
      message: `Bạn có chắc muốn xóa '${taskDetail.name}' khỏi '${taskDetail.taskName}'?`,
      confirmText: "Xóa chi tiết",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/task-details/${taskDetail._id}`);
      await fetchBootstrap();
      toast.success("Đã xóa chi tiết công việc.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa chi tiết công việc");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý chi tiết công việc</h1>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">Thêm chi tiết công việc mới</h2>
          <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
            <CustomDropdown
              value={newTaskId}
              onChange={setNewTaskId}
              options={createTaskOptions}
              placeholder="Chọn công việc"
              icon={Briefcase}
            />
            <input
              value={newTaskDetailName}
              onChange={(e) => setNewTaskDetailName(e.target.value)}
              placeholder="Ví dụ: Phun thuốc lần 1"
              className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
            />
            <button
              disabled={submitting}
              onClick={handleCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={16} /> Tạo mới
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">Lọc theo công việc</h2>
          <CustomDropdown
            value={filterTaskId}
            onChange={setFilterTaskId}
            options={filterTaskOptions}
            placeholder="Tất cả công việc"
            icon={Briefcase}
            variant="filter"
          />
          <p className="mt-3 text-sm text-gray-500">
            Hiển thị {filteredTaskDetails.length} chi tiết công việc.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-800">Danh mục chi tiết công việc</h2>
          <span className="text-sm text-gray-500">Tổng: {filteredTaskDetails.length}</span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu chi tiết công việc..." />
        ) : filteredTaskDetails.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-gray-500">
            Chưa có chi tiết công việc nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Công việc
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    Tên chi tiết
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTaskDetails.map((taskDetail) => (
                  <TaskDetailRow
                    key={taskDetail._id}
                    taskDetail={taskDetail}
                    taskOptions={createTaskOptions}
                    isEditing={editingTaskDetailId === taskDetail._id}
                    editingTaskId={editingTaskId}
                    editingTaskDetailName={editingTaskDetailName}
                    submitting={submitting}
                    onStartEdit={startEdit}
                    onUpdate={handleUpdate}
                    onCancelEdit={cancelEdit}
                    onDelete={handleDelete}
                    onEditingTaskIdChange={setEditingTaskId}
                    onEditingTaskDetailNameChange={setEditingTaskDetailName}
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

export default AdminTaskDetails;
