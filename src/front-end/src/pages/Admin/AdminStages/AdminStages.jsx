import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import StageModal from "./components/StageModal";
import StageTable from "./components/StageTable";

const AdminStages = () => {
  const { toast, confirm } = useFeedback();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [formData, setFormData] = useState({ name: "", order: 0 });

  // pagination (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchStages();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(stages.length / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [stages, currentPage]);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const res = await api.get("/stages");
      setStages(res.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể tải danh sách giai đoạn",
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingStage(null);
    setFormData({ name: "", order: 0 });
    setShowModal(true);
  };

  const openEditModal = (stage) => {
    setEditingStage(stage);
    setFormData({ name: stage.name || "", order: stage.order || 0 });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStage(null);
    setFormData({ name: "", order: 0 });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const name = String(formData.name || "").trim();
    const order = Number(formData.order || 0);

    if (!name) {
      toast.warning("Vui lòng nhập tên giai đoạn");
      return;
    }

    if (name.length > 100) {
      toast.warning("Tên giai đoạn không được vượt quá 100 ký tự");
      return;
    }

    if (order < 0) {
      toast.warning("Thứ tự phải là số không âm");
      return;
    }

    if (
      editingStage &&
      editingStage.name === name &&
      editingStage.order === order
    ) {
      toast.info("Không có thay đổi nào để lưu.");
      closeModal();
      return;
    }

    setSubmitting(true);
    try {
      if (editingStage) {
        const res = await api.put(`/stages/${editingStage._id}`, {
          name,
          order,
        });
        setStages((prev) =>
          prev
            .map((it) => (it._id === editingStage._id ? res.data : it))
            .sort((a, b) => a.order - b.order),
        );
        toast.success("Cập nhật giai đoạn thành công!");
      } else {
        const res = await api.post("/stages", { name, order });
        setStages((prev) =>
          [...prev, res.data].sort((a, b) => a.order - b.order),
        );
        toast.success("Thêm giai đoạn thành công!");
      }

      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu giai đoạn");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stage) => {
    const confirmed = await confirm({
      title: "Xóa giai đoạn?",
      message: `Bạn có chắc muốn xóa giai đoạn '${stage.name}'? Lưu ý: Chỉ có thể xóa nếu không có công việc nào đang thuộc giai đoạn này.`,
      confirmText: "Xóa giai đoạn",
      tone: "danger",
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/stages/${stage._id}`);
      setStages((prev) => prev.filter((item) => item._id !== stage._id));
      toast.success("Xóa giai đoạn thành công!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa giai đoạn");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(stages.length / pageSize));
  const totalStages = stages.length;
  const paginatedStages = stages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quản lý giai đoạn
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý danh mục giai đoạn và thứ tự hiển thị.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            Thêm giai đoạn
          </button>
        </div>
      </div>
      {loading ? (
        <LoadingScreen message="Đang tải dữ liệu giai đoạn..." />
      ) : (
        <StageTable
          stages={paginatedStages}
          loading={loading}
          submitting={submitting}
          handleDelete={handleDelete}
          onEdit={openEditModal}
          currentPage={currentPage}
          totalPages={totalPages}
          totalStages={totalStages}
          onPageChange={(p) => setCurrentPage(p)}
        />
      )}

      <StageModal
        open={showModal}
        editingStage={editingStage}
        formData={formData}
        onChange={(e) => {
          const { name, value } = e.target;
          setFormData((prev) => ({
            ...prev,
            [name]: name === "order" ? Number(value) : value,
          }));
        }}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
};

export default AdminStages;
