import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import SeasonFormModal from "./components/SeasonFormModal";
import SeasonTable from "./components/SeasonTable";

const SEASONS_PER_PAGE = 8;

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
  const [seasonName, setSeasonName] = useState("");
  const [editingSeason, setEditingSeason] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil(seasons.length / SEASONS_PER_PAGE));

  const paginatedSeasons = useMemo(() => {
    const startIndex = (currentPage - 1) * SEASONS_PER_PAGE;
    return seasons.slice(startIndex, startIndex + SEASONS_PER_PAGE);
  }, [currentPage, seasons]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const clearForm = () => {
    setSeasonName("");
    setEditingSeason(null);
  };

  const openCreateModal = () => {
    clearForm();
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    clearForm();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const seasonRes = await api.get("/seasons?includeHidden=true");
      setSeasons(sortSeasons(seasonRes.data || []));
    } catch (err) {
      console.error("Lỗi tải dữ liệu mùa vụ admin:", err);
      toast.error(
        err.response?.data?.message || "Không thể tải dữ liệu mùa vụ",
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (season) => {
    setEditingSeason(season);
    setSeasonName(season.name || "");
    setShowFormModal(true);
    setCurrentPage(
      Math.max(
        1,
        Math.ceil(
          (seasons.findIndex((item) => item._id === season._id) + 1) /
            SEASONS_PER_PAGE,
        ),
      ),
    );
  };

  const cancelEdit = () => {
    closeFormModal();
  };

  const handleSubmitSeason = async (event) => {
    event.preventDefault();

    if (!seasonName.trim()) {
      toast.warning("Tên mùa vụ không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSeason) {
        const res = await api.put(`/seasons/${editingSeason._id}`, {
          name: seasonName.trim(),
        });
        setSeasons((prev) =>
          sortSeasons(
            prev.map((item) =>
              item._id === editingSeason._id ? res.data : item,
            ),
          ),
        );
        toast.success("Đã cập nhật mùa vụ.");
      } else {
        const res = await api.post("/seasons", { name: seasonName.trim() });
        setSeasons((prev) => sortSeasons([...prev, res.data]));
        toast.success("Đã tạo mùa vụ mới.");
      }

      clearForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu mùa vụ");
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
      setSeasons((prev) =>
        sortSeasons(
          prev.map((item) => (item._id === season._id ? res.data : item)),
        ),
      );
      toast.success(`Đã ${actionLabel} mùa vụ.`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể cập nhật trạng thái hiển thị",
      );
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý mùa vụ</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý danh mục mùa vụ và trạng thái hiển thị.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
        >
          <Plus size={16} />
          Thêm mùa vụ
        </button>
      </div>

      {loading ? (
        <LoadingScreen message="Đang tải dữ liệu mùa vụ..." />
      ) : (
        <>
          <SeasonTable
            seasons={paginatedSeasons}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={seasons.length}
            submitting={submitting}
            onPageChange={setCurrentPage}
            onStartEdit={startEdit}
            onToggleVisibility={handleToggleVisibility}
            onDelete={handleDelete}
          />
        </>
      )}

      <SeasonFormModal
        open={showFormModal}
        editingSeason={editingSeason}
        seasonName={seasonName}
        submitting={submitting}
        onChange={setSeasonName}
        onClose={closeFormModal}
        onSubmit={handleSubmitSeason}
      />
    </div>
  );
};

export default AdminSeasons;
