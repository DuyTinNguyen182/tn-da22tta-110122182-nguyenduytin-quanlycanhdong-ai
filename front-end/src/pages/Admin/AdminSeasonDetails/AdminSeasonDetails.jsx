import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import SeasonDetailFormModal from "./components/SeasonDetailFormModal";
import SeasonDetailTable from "./components/SeasonDetailTable";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2023;
const MAX_YEAR = CURRENT_YEAR + 5;
const DETAILS_PER_PAGE = 8;
const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, index) => String(MAX_YEAR - index),
);

const AdminSeasonDetails = () => {
  const { toast, confirm } = useFeedback();
  const [seasonDetails, setSeasonDetails] = useState([]);
  const [catalogSeasons, setCatalogSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    seasonId: "",
    year: String(CURRENT_YEAR),
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(seasonDetails.length / DETAILS_PER_PAGE),
  );

  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * DETAILS_PER_PAGE;
    return seasonDetails.slice(startIndex, startIndex + DETAILS_PER_PAGE);
  }, [currentPage, seasonDetails]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [detailsRes, catalogRes] = await Promise.all([
        api.get("/season-details/admin/all"),
        api.get("/seasons?includeHidden=false"),
      ]);

      setSeasonDetails(detailsRes.data || []);
      setCatalogSeasons(catalogRes.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu chi tiết mùa vụ:", err);
      toast.error(err.response?.data?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDetail(null);
    setFormData({
      seasonId: catalogSeasons[0]?._id || "",
      year: String(CURRENT_YEAR),
      startDate: "",
      endDate: "",
    });
    setShowFormModal(true);
  };

  const openEditModal = (detail) => {
    const existingYear = detail?.year
      ? String(detail.year)
      : detail?.startDate
        ? String(new Date(detail.startDate).getFullYear())
        : String(CURRENT_YEAR);

    setEditingDetail(detail);
    setFormData({
      seasonId: detail?.season?._id || "",
      year: existingYear,
      startDate: detail.startDate
        ? new Date(detail.startDate).toISOString().slice(0, 10)
        : "",
      endDate: detail.endDate
        ? new Date(detail.endDate).toISOString().slice(0, 10)
        : "",
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingDetail(null);
    setFormData({
      seasonId: "",
      year: String(CURRENT_YEAR),
      startDate: "",
      endDate: "",
    });
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitDetail = async (event) => {
    event.preventDefault();

    if (!editingDetail && !formData.seasonId) {
      toast.warning("Vui lòng chọn danh mục mùa vụ gốc");
      return;
    }
    if (!formData.year) {
      toast.warning("Vui lòng chọn năm");
      return;
    }
    if (!formData.startDate) {
      toast.warning("Vui lòng chọn ngày bắt đầu");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDetail) {
        const res = await api.put(`/season-details/${editingDetail._id}`, {
          year: Number(formData.year),
          startDate: formData.startDate,
          endDate: formData.endDate || null,
        });

        setSeasonDetails((prev) =>
          prev.map((item) =>
            item._id === editingDetail._id ? res.data : item,
          ),
        );
        toast.success("Đã cập nhật chi tiết mùa vụ.");
      } else {
        const res = await api.post("/season-details", {
          seasonId: formData.seasonId,
          year: Number(formData.year),
          startDate: formData.startDate,
          endDate: formData.endDate || null,
        });

        setSeasonDetails((prev) => [res.data, ...prev]);
        toast.success("Đã tạo chi tiết mùa vụ mới.");
      }

      closeFormModal();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể lưu chi tiết mùa vụ",
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
        "Bạn có chắc muốn xóa chi tiết mùa vụ này không? Dữ liệu nhật ký liên quan có thể bị ảnh hưởng.",
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
      toast.success("Đã xóa chi tiết mùa vụ.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể xóa chi tiết mùa vụ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quản lý chi tiết mùa vụ
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Lên lịch và quản lý thời gian diễn ra của các mùa vụ
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
        >
          <Plus size={16} />
          Thêm chi tiết mùa vụ
        </button>
      </div>

      {loading ? (
        <LoadingScreen message="Đang tải dữ liệu..." />
      ) : (
        <SeasonDetailTable
          seasonDetails={paginatedDetails}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={seasonDetails.length}
          submitting={submitting}
          onPageChange={setCurrentPage}
          onStartEdit={openEditModal}
          onFinish={handleFinish}
          onDelete={handleDelete}
        />
      )}

      <SeasonDetailFormModal
        open={showFormModal}
        editingDetail={editingDetail}
        catalogSeasons={catalogSeasons}
        yearOptions={YEAR_OPTIONS}
        formData={formData}
        submitting={submitting}
        onChange={handleFormChange}
        onClose={closeFormModal}
        onSubmit={handleSubmitDetail}
      />
    </div>
  );
};

export default AdminSeasonDetails;
