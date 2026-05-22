import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import TaskDetailTable from "./components/TaskDetailTable";
import TaskDetailModal from "./components/TaskDetailModal";

const AdminTaskDetails = () => {
  const { toast, confirm } = useFeedback();
  const [tasks, setTasks] = useState([]);
  const [taskDetails, setTaskDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterTaskId, setFilterTaskId] = useState("");
  // modal & form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ taskId: "", name: "" });

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
      toast.error(
        error.response?.data?.message ||
          "Không thể tải danh sách chi tiết công việc",
      );
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
    [tasks],
  );

  const filterTaskOptions = useMemo(
    () => [
      { value: "", label: "Tất cả công việc" },
      ...tasks.map((task) => ({
        value: task._id,
        label: `${task.name} (${task.taskDetailCount || 0})`,
      })),
    ],
    [tasks],
  );

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ taskId: "", name: "" });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ taskId: item.taskId || "", name: item.name || "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ taskId: "", name: "" });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const taskId = String(formData.taskId || "").trim();
    const name = String(formData.name || "").trim();

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
      if (editingItem) {
        await api.put(`/task-details/${editingItem._id}`, { taskId, name });
        toast.success("Đã cập nhật chi tiết công việc.");
      } else {
        await api.post("/task-details", { taskId, name });
        toast.success("Đã tạo chi tiết công việc.");
      }

      closeModal();
      await fetchBootstrap();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể lưu chi tiết công việc",
      );
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
      toast.error(
        error.response?.data?.message || "Không thể xóa chi tiết công việc",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // pagination derived values
  const filtered = filteredTaskDetails;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Quản lý chi tiết công việc
        </h1>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="mb-4 font-bold text-gray-800">
              Thêm chi tiết công việc mới
            </h2>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
            >
              <Plus size={16} /> Tạo mới
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <CustomDropdown
              value={filterTaskId}
              onChange={setFilterTaskId}
              options={filterTaskOptions}
              placeholder="Tìm theo công việc"
              icon={Briefcase}
              variant="filter"
            />
            <p className="mt-3 text-sm text-gray-500">
              Hiển thị {filtered.length} chi tiết công việc.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">Bộ lọc</h2>
          <CustomDropdown
            value={filterTaskId}
            onChange={setFilterTaskId}
            options={filterTaskOptions}
            placeholder="Tất cả công việc"
            icon={Briefcase}
            variant="filter"
          />
        </div>
      </div>

      <TaskDetailTable
        items={paginated}
        loading={loading}
        submitting={submitting}
        onEdit={openEditModal}
        onDelete={handleDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        onPageChange={(p) => setCurrentPage(p)}
      />

      <TaskDetailModal
        open={showModal}
        editingItem={editingItem}
        formData={formData}
        onChange={(e) => {
          const { name, value } = e.target;
          setFormData((prev) => ({ ...prev, [name]: value }));
        }}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        taskOptions={createTaskOptions}
      />
    </div>
  );
};

export default AdminTaskDetails;
