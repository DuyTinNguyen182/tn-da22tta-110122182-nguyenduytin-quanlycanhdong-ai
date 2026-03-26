import React, { useEffect, useState } from "react";
import {
  Loader,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";
import api from "../../services/api";

const AdminSeasons = () => {
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
      const seasonRes = await api.get("/seasons");
      setSeasons(seasonRes.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu mùa vụ admin:", err);
      alert(err.response?.data?.message || "Không thể tải dữ liệu mùa vụ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) {
      alert("Vui lòng nhập tên mùa vụ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/seasons", { name: newSeasonName.trim() });
      setSeasons((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name, "vi")));
      setNewSeasonName("");
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tạo mùa vụ");
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
      alert("Tên mùa vụ không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/seasons/${id}`, { name: editingSeasonName.trim() });
      setSeasons((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      cancelEdit();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (season) => {
    if (!window.confirm(`Xóa mùa vụ '${season.name}'?`)) return;

    setSubmitting(true);
    try {
      await api.delete(`/seasons/${season._id}`);
      setSeasons((prev) => prev.filter((item) => item._id !== season._id));
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Mùa Vụ</h1>
        <p className="text-gray-600 mt-1">Thêm mới, chỉnh sửa và xóa tên mùa vụ.</p>
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
          <span className="text-sm text-gray-500">Tổng: {seasons.length}</span>
        </div>

        {loading ? (
          <div className="h-44 flex items-center justify-center text-gray-500 gap-2">
            <Loader size={18} className="animate-spin" /> Đang tải...
          </div>
        ) : seasons.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-gray-500">Chưa có mùa vụ nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên mùa vụ</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => {
                  const isEditing = editingSeasonId === season._id;

                  return (
                    <tr key={season._id} className="border-t border-gray-100">
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            value={editingSeasonName}
                            onChange={(e) => setEditingSeasonName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-gray-800">{season.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => handleSaveEdit(season._id)}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                title="Lưu"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                disabled={submitting}
                                onClick={cancelEdit}
                                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                title="Hủy"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => startEdit(season)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                title="Sửa"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleDelete(season)}
                                className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                                title="Xóa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
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