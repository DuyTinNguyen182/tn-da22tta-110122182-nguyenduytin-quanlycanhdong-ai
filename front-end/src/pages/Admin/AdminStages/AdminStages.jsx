import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import StageRow from "./components/StageRow";

const AdminStages = () => {
  const { toast, confirm } = useFeedback();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageOrder, setNewStageOrder] = useState(0);
  const [editingStageId, setEditingStageId] = useState("");
  const [editingStageName, setEditingStageName] = useState("");
  const [editingStageOrder, setEditingStageOrder] = useState(0);

  useEffect(() => {
    fetchStages();
  }, []);

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

  const handleCreateStage = async () => {
    const name = newStageName.trim();
    if (!name) {
      toast.warning("Vui lòng nhập tên giai đoạn");
      return;
    }

    if (newStageOrder < 0) {
      toast.warning("Thứ tự phải là số không âm");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/stages", { name, order: newStageOrder });
      setStages((prev) =>
        [...prev, res.data].sort((a, b) => a.order - b.order),
      );
      setNewStageName("");
      setNewStageOrder(0);
      toast.success("Thêm giai đoạn thành công!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể thêm giai đoạn");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (stage) => {
    setEditingStageId(stage._id);
    setEditingStageName(stage.name || "");
    setEditingStageOrder(stage.order || 0);
  };

  const cancelEdit = () => {
    setEditingStageId("");
    setEditingStageName("");
    setEditingStageOrder(0);
  };

  const handleUpdate = async (id) => {
    const name = editingStageName.trim();
    if (!name) {
      toast.warning("Tên giai đoạn không được để trống");
      return;
    }

    if (editingStageOrder < 0) {
      toast.warning("Thứ tự phải là số không âm");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/stages/${id}`, {
        name,
        order: editingStageOrder,
      });
      setStages((prev) =>
        prev
          .map((item) => (item._id === id ? res.data : item))
          .sort((a, b) => a.order - b.order),
      );
      cancelEdit();
      toast.success("Cập nhật giai đoạn thành công!");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể cập nhật giai đoạn",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stage) => {
    const confirmed = await confirm({
      title: "Xóa giai đoạn?",
      message: `Bạn có chắc muốn xóa giai đoạn '${stage.name}'?`,
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

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý giai đoạn</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Thêm giai đoạn mới</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder="Ví dụ: Chuẩn bị đất"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
          />
          <input
            type="number"
            value={newStageOrder}
            onChange={(e) => setNewStageOrder(Number(e.target.value))}
            placeholder="Thứ tự"
            min="0"
            className="w-24 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
          />
          <button
            disabled={submitting}
            onClick={handleCreateStage}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            <Plus size={16} /> Thêm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Danh sách giai đoạn</h2>
          <span className="text-sm text-gray-500">Tổng: {stages.length}</span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu giai đoạn..." />
        ) : stages.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-gray-500">
            Chưa có giai đoạn nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Tên giai đoạn
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Thứ tự
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => {
                  const isEditing = editingStageId === stage._id;
                  return (
                    <StageRow
                      key={stage._id}
                      stage={stage}
                      isEditing={isEditing}
                      editingStageName={editingStageName}
                      editingStageOrder={editingStageOrder}
                      submitting={submitting}
                      onStartEdit={startEdit}
                      onUpdate={handleUpdate}
                      onCancelEdit={cancelEdit}
                      onDelete={handleDelete}
                      onEditingStageNameChange={setEditingStageName}
                      onEditingStageOrderChange={setEditingStageOrder}
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

export default AdminStages;
