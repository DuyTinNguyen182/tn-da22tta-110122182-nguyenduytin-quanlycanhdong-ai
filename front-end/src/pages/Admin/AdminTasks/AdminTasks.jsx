import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import TaskRow from "./components/TaskRow";

const AdminTasks = () => {
  const { toast, confirm } = useFeedback();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingTaskName, setEditingTaskName] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tasks");
      setTasks(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    const name = newTaskName.trim();
    if (!name) {
      toast.warning("Vui lòng nhập tên công việc");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/tasks", { name });
      setTasks((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name, "vi")));
      setNewTaskName("");
      toast.success("Đã tạo công việc mới.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tạo công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (task) => {
    setEditingTaskId(task._id);
    setEditingTaskName(task.name || "");
  };

  const cancelEdit = () => {
    setEditingTaskId("");
    setEditingTaskName("");
  };

  const handleUpdate = async (id) => {
    const name = editingTaskName.trim();
    if (!name) {
      toast.warning("Tên công việc không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/tasks/${id}`, { name });
      setTasks((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      cancelEdit();
      toast.success("Đã cập nhật công việc.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật công việc");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task) => {
    const confirmed = await confirm({
      title: "Xóa công việc?",
      message: `Bạn có chắc muốn xóa công việc '${task.name}'?`,
      confirmText: "Xóa công việc",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((prev) => prev.filter((item) => item._id !== task._id));
      toast.success("Đã xóa công việc.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa công việc");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý công việc</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Thêm Công Việc Mới</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Ví dụ: Phun thuốc"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
          />
          <button
            disabled={submitting}
            onClick={handleCreateTask}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} /> Tạo mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Danh Mục Công Việc</h2>
          <span className="text-sm text-gray-500">Tổng: {tasks.length}</span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu công việc..." />


        ) : tasks.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-gray-500">Chưa có công việc nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên công việc</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isEditing = editingTaskId === task._id;
                  return (
                    <TaskRow
                      key={task._id}
                      task={task}
                      isEditing={isEditing}
                      editingTaskName={editingTaskName}
                      submitting={submitting}
                      onStartEdit={startEdit}
                      onUpdate={handleUpdate}
                      onCancelEdit={cancelEdit}
                      onDelete={handleDelete}
                      onEditingTaskNameChange={setEditingTaskName}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTasks;
