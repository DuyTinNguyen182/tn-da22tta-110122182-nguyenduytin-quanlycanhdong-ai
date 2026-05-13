import React, { useEffect, useState } from "react";
import { Plus, Sprout } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import SeasonDetailRow from "./components/SeasonDetailRow";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2023;
const MAX_YEAR = CURRENT_YEAR + 5;
const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, index) => String(MAX_YEAR - index),
);

const resolveDetailYear = (detail) => {
  if (detail?.year) {
    return String(detail.year);
  }

  if (detail?.startDate) {
    return String(new Date(detail.startDate).getFullYear());
  }

  return String(CURRENT_YEAR);
};

const AdminSeasonDetails = () => {
  const { toast, confirm } = useFeedback();
  const [seasonDetails, setSeasonDetails] = useState([]);
  const [catalogSeasons, setCatalogSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editYear, setEditYear] = useState(String(CURRENT_YEAR));
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
    if (!year) {
      toast.warning("Vui lòng chọn năm");
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
        year: Number(year),
        startDate,
        endDate: endDate || null,
      });

      setSeasonDetails((prev) => [res.data, ...prev]);
      setStartDate("");
      setEndDate("");
      toast.success("Đã tạo chi tiết mùa vụ mới.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể tạo chi tiết mùa vụ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (detail) => {
    setEditingId(detail._id);
    setEditYear(resolveDetailYear(detail));
    setEditStartDate(
      detail.startDate
        ? new Date(detail.startDate).toISOString().slice(0, 10)
        : "",
    );
    setEditEndDate(
      detail.endDate ? new Date(detail.endDate).toISOString().slice(0, 10) : "",
    );
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditYear(String(CURRENT_YEAR));
    setEditStartDate("");
    setEditEndDate("");
  };

  const handleSaveEdit = async (id) => {
    if (!editYear) {
      toast.warning("Năm không được để trống");
      return;
    }
    if (!editStartDate) {
      toast.warning("Ngày bắt đầu không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/season-details/${id}`, {
        year: Number(editYear),
        startDate: editStartDate,
        endDate: editEndDate || null,
      });

      setSeasonDetails((prev) =>
        prev.map((item) => (item._id === id ? res.data : item)),
      );
      cancelEdit();
      toast.success("Đã cập nhật chi tiết mùa vụ.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể cập nhật thông tin",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async (detail) => {
    const confirmed = await confirm({
      title: "Kết thúc mùa vụ?",
      message:
        "Bạn có chắc muốn bao kết thúc mùa vụ này ngay bây giờ? Ngày kết thúc sẽ được gán là hôm nay.",
      confirmText: "Kết thúc",
      tone: "primary",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/season-details/${detail._id}/finish`);
      setSeasonDetails((prev) =>
        prev.map((item) => (item._id === detail._id ? res.data : item)),
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
      message:
        "Bạn có chắc muốn xóa lịch trình mùa vụ này không? Dữ liệu nhật ký liên quan có thể bị ảnh hưởng.",
      confirmText: "Xóa",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/season-details/${detail._id}`);
      setSeasonDetails((prev) =>
        prev.filter((item) => item._id !== detail._id),
      );
      toast.success("Đã xóa lịch trình mùa vụ.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể xóa lịch trình mùa vụ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Quản lý chi tiết mùa vụ
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Lên lịch và quản lý thời gian diễn ra của các vụ mưa
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-bold text-gray-800">Lên lịch mùa vụ mới</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="flex flex-col gap-1 px-1">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Danh mục mùa vụ
            </label>
            <CustomDropdown
              value={selectedSeasonId}
              onChange={setSelectedSeasonId}
              options={catalogSeasons.map((cat) => ({
                value: cat._id,
                label: cat.name,
              }))}
              placeholder="Chọn mùa vụ"
              icon={Sprout}
            />
          </div>

          <div className="flex flex-col gap-1 px-1">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Năm
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
            >
              {YEAR_OPTIONS.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 px-1">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Ngày bắt đầu
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1 px-1">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Ngày kết thúc (Tùy chọn)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end px-1 pb-[1px]">
            <button
              disabled={submitting}
              onClick={handleCreate}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={18} /> Thêm mới
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-800">Danh sách lịch trình</h2>
          <span className="text-sm font-medium text-gray-500">
            Tổng: {seasonDetails.length}
          </span>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải dữ liệu..." />
        ) : seasonDetails.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-gray-500">
            Chưa có lịch trình mùa vụ nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Mùa vụ
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Năm
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Ngày bắt đầu
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Ngày kết thúc
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                    Thao tác
                  </th>
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
                      editYear={editYear}
                      editStartDate={editStartDate}
                      editEndDate={editEndDate}
                      submitting={submitting}
                      yearOptions={YEAR_OPTIONS}
                      onStartEdit={startEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={cancelEdit}
                      onFinish={handleFinish}
                      onDelete={handleDelete}
                      onEditYearChange={setEditYear}
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
