import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import SeasonRow from "./components/SeasonRow";

const sortSeasons = (items = []) => {
  return [...items].sort((a, b) => {
    const aVisible = a?.isVisible !== false;
    const bVisible = b?.isVisible !== false;

    if (aVisible !== bVisible) {
      return aVisible ? -1 : 1;
    }

    return (a?.name || "").localeCompare(b?.name || "", "vi");
  });
};

const AdminSeasons = () => {
  const { toast, confirm } = useFeedback();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [editingSeasonId, setEditingSeasonId] = useState("");
  const [editingSeasonName, setEditingSeasonName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const seasonRes = await api.get("/seasons?includeHidden=true");
      setSeasons(sortSeasons(seasonRes.data || []));
    } catch (err) {
      console.error("Lỗi tải dữ liệu mùa vụ admin:", err);
      toast.error(err.response?.data?.message || "Không thể tải dữ liệu mùa vụ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) {
      toast.warning("Vui lòng nhập tên mùa vụ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/seasons", { name: newSeasonName.trim() });
      setSeasons((prev) => sortSeasons([...prev, res.data]));
      setNewSeasonName("");
      toast.success("Đã tạo mùa vụ mới.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tạo mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (season) => {
    setEditingSeasonId(season._id);
    setEditingSeasonName(season.name || "");
  };

  const cancelEdit = () => {
    setEditingSeasonId("");
    setEditingSeasonName("");
  };

  const handleSaveEdit = async (id) => {
    if (!editingSeasonName.trim()) {
      toast.warning("Tên mùa vụ không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/seasons/${id}`, { name: editingSeasonName.trim() });
      setSeasons((prev) => sortSeasons(prev.map((item) => (item._id === id ? res.data : item))));
      cancelEdit();
      toast.success("Đã cập nhật mùa vụ.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisibility = async (season) => {
    const nextVisible = season.isVisible === false;
    const actionLabel = nextVisible ? "hiển thị" : "ẩn";

    const confirmed = await confirm({
      title: `${nextVisible ? "Hiển thị" : "Ẩn"} mùa vụ?`,
      message: `Bạn có chắc muốn ${actionLabel} mùa vụ '${season.name}'?`,
      confirmText: nextVisible ? "Hiển thị" : "Ẩn mùa vụ",
      tone: "primary",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/seasons/${season._id}`, {
        name: season.name,
        isVisible: nextVisible,
      });
      setSeasons((prev) => sortSeasons(prev.map((item) => (item._id === season._id ? res.data : item))));
      toast.success(`Đã ${actionLabel} mùa vụ.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật trạng thái hiển thị");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (season) => {
    const confirmed = await confirm({
      title: "Xóa mùa vụ?",
      message: `Bạn có chắc muốn xóa mùa vụ '${season.name}'?`,
      confirmText: "Xóa mùa vụ",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/seasons/${season._id}`);
      setSeasons((prev) => prev.filter((item) => item._id !== season._id));
      toast.success("Đã xóa mùa vụ.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý mùa vụ</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-gray-800">Thêm Mùa Vụ Mới</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={newSeasonName}
            onChange={(e) => setNewSeasonName(e.target.value)}
            placeholder="Ví dụ: Xuân Hè"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
          />
          <button
            disabled={submitting}
            onClick={handleCreateSeason}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} /> Tạo mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Danh Mục Mùa Vụ</h2>
          <span className="text-sm text-gray-500">
            Tổng: {seasons.length} | Hiển thị: {seasons.filter((item) => item.isVisible !== false).length} | Ẩn: {seasons.filter((item) => item.isVisible === false).length}
          </span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu mùa vụ..." />


        ) : seasons.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-gray-500">Chưa có mùa vụ nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên mùa vụ</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => {
                  const isEditing = editingSeasonId === season._id;

                  return (
                    <SeasonRow
                      key={season._id}
                      season={season}
                      isEditing={isEditing}
                      editingSeasonName={editingSeasonName}
                      submitting={submitting}
                      onStartEdit={startEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={cancelEdit}
                      onToggleVisibility={handleToggleVisibility}
                      onDelete={handleDelete}
                      onEditingSeasonNameChange={setEditingSeasonName}
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

export default AdminSeasons;
