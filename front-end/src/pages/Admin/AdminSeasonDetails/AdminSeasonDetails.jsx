import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import SeasonDetailRow from "./components/SeasonDetailRow";

const AdminSeasonDetails = () => {
  const { toast, confirm } = useFeedback();
  const [seasonDetails, setSeasonDetails] = useState([]);
  const [catalogSeasons, setCatalogSeasons] = useState([]); // from /seasons
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Edit states
  const [editingId, setEditingId] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [detailsRes, catalogRes] = await Promise.all([
        api.get("/season-details/admin/all"),
        api.get("/seasons?includeHidden=false"),
      ]);
      setSeasonDetails(detailsRes.data || []);
      setCatalogSeasons(catalogRes.data || []);
      
      if (catalogRes.data?.length > 0) {
        setSelectedSeasonId(catalogRes.data[0]._id);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu chi tiết mùa vụ:", err);
      toast.error(err.response?.data?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedSeasonId) {
      toast.warning("Vui lòng chọn danh mục mùa vụ gốc");
      return;
    }
    if (!startDate) {
      toast.warning("Vui lòng chọn ngày bắt đầu");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/season-details", {
        seasonId: selectedSeasonId,
        startDate,
        endDate: endDate || null,
      });
      // push to top
      setSeasonDetails((prev) => [res.data, ...prev]);
      setStartDate("");
      setEndDate("");
      toast.success("Đã tạo chi tiết mùa vụ mới.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tạo chi tiết mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (detail) => {
    setEditingId(detail._id);
    setEditStartDate(detail.startDate ? new Date(detail.startDate).toISOString().slice(0, 10) : "");
    setEditEndDate(detail.endDate ? new Date(detail.endDate).toISOString().slice(0, 10) : "");
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditStartDate("");
    setEditEndDate("");
  };

  const handleSaveEdit = async (id) => {
    if (!editStartDate) {
      toast.warning("Ngày bắt đầu không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/season-details/${id}`, {
        startDate: editStartDate,
        endDate: editEndDate || null,
      });
      setSeasonDetails((prev) =>
        prev.map((item) => (item._id === id ? res.data : item))
      );
      cancelEdit();
      toast.success("Đã cập nhật chi tiết mùa vụ.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật thông tin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async (detail) => {
    const confirmed = await confirm({
      title: "Kết thúc mùa vụ?",
      message: `Bạn có chắc muốn báo kết thúc mùa vụ này ngay bây giờ? Ngày kết thúc sẽ được gán là hôm nay.`,
      confirmText: "Kết thúc",
      tone: "primary",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/season-details/${detail._id}/finish`);
      setSeasonDetails((prev) =>
        prev.map((item) => (item._id === detail._id ? res.data : item))
      );
      toast.success("Đã kết thúc mùa vụ.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể kết thúc mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (detail) => {
    const confirmed = await confirm({
      title: "Xóa chi tiết",
      message: `Bạn có chắc muốn xóa lịch trình mùa vụ này không? Dữ liệu nhật ký liên quan có thể bị ảnh hưởng.`,
      confirmText: "Xóa",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/season-details/${detail._id}`);
      setSeasonDetails((prev) => prev.filter((item) => item._id !== detail._id));
      toast.success("Đã xóa lịch trình mùa vụ.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa lịch trình mùa vụ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý chi tiết mùa vụ</h1>
        <p className="text-sm text-gray-500 mt-1">Lên lịch và quản lý thời gian diễn ra của các vụ mùa</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-gray-800">Lên lịch mùa vụ mới</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex pl-1 pr-1 flex-col gap-1">
             <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục mùa vụ</label>
             <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none bg-white"
             >
                {catalogSeasons.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="flex pl-1 pr-1 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày bắt đầu</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none w-full"
            />
          </div>

          <div className="flex pl-1 pr-1 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kết thúc (Tùy chọn)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none w-full"
            />
          </div>

          <div className="flex items-end pl-1 pr-1 pb-[1px]">
            <button
              disabled={submitting}
              onClick={handleCreate}
              className="w-full h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Plus size={18} /> Thêm mới
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Danh Sách Lịch Trình</h2>
          <span className="text-sm text-gray-500 font-medium">Tổng: {seasonDetails.length}</span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu..." />
        ) : seasonDetails.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-gray-500">Chưa có lịch trình mùa vụ nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mùa vụ</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày bắt đầu</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày kết thúc</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {seasonDetails.map((detail) => {
                  const isEditing = editingId === detail._id;

                  return (
                    <SeasonDetailRow
                      key={detail._id}
                      detail={detail}
                      isEditing={isEditing}
                      editStartDate={editStartDate}
                      editEndDate={editEndDate}
                      submitting={submitting}
                      onStartEdit={startEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={cancelEdit}
                      onFinish={handleFinish}
                      onDelete={handleDelete}
                      onEditStartDateChange={setEditStartDate}
                      onEditEndDateChange={setEditEndDate}
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

export default AdminSeasonDetails;
