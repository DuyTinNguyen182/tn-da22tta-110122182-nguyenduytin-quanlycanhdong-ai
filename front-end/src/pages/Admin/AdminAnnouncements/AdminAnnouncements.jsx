import React, { useEffect, useState } from "react";
import {
  BellRing,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../components/Common/PaginationControls";
import { useFeedback } from "../../../hooks/useFeedback";

const EMPTY_FORM = {
  type: "notification",
  title: "",
  content: "",
  isVisible: true,
};

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "notification", label: "Thông báo" },
  { value: "warning", label: "Cảnh báo" },
];

const VISIBILITY_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "visible", label: "Đang hiện" },
  { value: "hidden", label: "Đang ẩn" },
];

const TYPE_STYLES = {
  notification: {
    label: "Thông báo",
    icon: BellRing,
    badgeClassName: "bg-sky-100 text-sky-700",
  },
  warning: {
    label: "Cảnh báo",
    icon: TriangleAlert,
    badgeClassName: "bg-amber-100 text-amber-700",
  },
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Chưa cập nhật";

const AdminAnnouncements = () => {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    keyword: "",
    type: "all",
    visibility: "all",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [summary, setSummary] = useState({
    totalCount: 0,
    visibleCount: 0,
    hiddenCount: 0,
    warningCount: 0,
    notificationCount: 0,
  });

  const fetchAnnouncements = async (page = 1) => {
    try {
      setLoading(true);

      const res = await api.get("/announcements/admin", {
        params: {
          page,
          limit: 5,
          ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
          ...(filters.type !== "all" ? { type: filters.type } : {}),
          ...(filters.visibility !== "all" ? { visibility: filters.visibility } : {}),
        },
      });

      const nextItems = res.data?.items || [];
      const nextPagination = res.data?.pagination || {
        page,
        limit: 5,
        totalItems: nextItems.length,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      };

      setItems(nextItems);
      setPagination(nextPagination);
      setSummary(
        res.data?.summary || {
          totalCount: 0,
          visibleCount: 0,
          hiddenCount: 0,
          warningCount: 0,
          notificationCount: 0,
        }
      );
    } catch (error) {
      console.error("Lỗi tải danh sách thông báo/cảnh báo:", error);
      toast.error(error.response?.data?.message || "Không thể tải danh sách thông báo");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(currentPage);
  }, [currentPage, filters]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId("");
    setForm(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setForm({
      type: item.type,
      title: item.title,
      content: item.content,
      isVisible: item.isVisible === true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      isVisible: form.isVisible === true,
    };

    if (!payload.title) {
      toast.warning("Vui lòng nhập tên thông báo/cảnh báo");
      return;
    }

    if (!payload.content) {
      toast.warning("Vui lòng nhập nội dung");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await api.put(`/announcements/admin/${editingId}`, payload);
        toast.success("Đã cập nhật thông báo/cảnh báo.");
      } else {
        await api.post("/announcements/admin", payload);
        toast.success("Đã tạo thông báo/cảnh báo mới.");
      }

      closeModal();
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await fetchAnnouncements(1);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu thông báo/cảnh báo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await confirm({
      title: "Xóa thông báo/cảnh báo?",
      message: `Bạn có chắc muốn xóa "${item.title}" không?`,
      confirmText: "Xóa",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      await api.delete(`/announcements/admin/${item._id}`);
      toast.success("Đã xóa thông báo/cảnh báo.");

      const fallbackPage =
        items.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      if (fallbackPage !== currentPage) {
        setCurrentPage(fallbackPage);
      } else {
        await fetchAnnouncements(fallbackPage);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa thông báo/cảnh báo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-8">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Tổng mục</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary.totalCount}</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Đang hiện
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.visibleCount}</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Thông báo
            </p>
            <p className="mt-2 text-3xl font-bold text-sky-600">
              {summary.notificationCount}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Cảnh báo
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{summary.warningCount}</p>
          </div>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Danh sách quản lý</h2>
              <p className="mt-1 text-sm text-gray-500">
                Mỗi lần chỉ tải 5 bản ghi theo trang, sắp xếp mới nhất trước.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                value={filters.keyword}
                onChange={(e) => handleFilterChange("keyword", e.target.value)}
                placeholder="Tìm tên hoặc nội dung..."
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.visibility}
                onChange={(e) => handleFilterChange("visibility", e.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700"
              >
                <Plus size={16} />
                Thêm mới
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingScreen message="Đang tải danh sách thông báo..." />
          ) : items.length === 0 ? (
            <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center">
              <div className="rounded-2xl bg-white p-4 text-gray-400 shadow-sm">
                <ShieldAlert size={28} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-700">Chưa có dữ liệu phù hợp</p>
              <p className="mt-1 text-sm text-gray-500">
                Thử đổi bộ lọc hoặc tạo thông báo mới.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3">Loại</th>
                      <th className="px-4 py-3">Tên</th>
                      <th className="px-4 py-3">Nội dung</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày tạo</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.notification;
                      const Icon = typeStyle.icon;

                      return (
                        <tr key={item._id} className="border-b border-gray-50 align-top">
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle.badgeClassName}`}
                            >
                              <Icon size={14} />
                              {typeStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-gray-800">{item.title}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              Cập nhật: {formatDateTime(item.updatedAt)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="line-clamp-3 max-w-[360px] whitespace-pre-line text-sm leading-6 text-gray-600">
                              {item.content}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                item.isVisible
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {item.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                              {item.isVisible ? "Đang hiện" : "Đang ẩn"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition-all hover:border-emerald-200 hover:text-emerald-600"
                              >
                                <Pencil size={14} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-gray-500">
                  Hiển thị {items.length} mục trong tổng số {pagination.totalItems} mục theo bộ
                  lọc hiện tại.
                </p>

                <PaginationControls
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? "Chỉnh sửa thông báo/cảnh báo" : "Tạo thông báo/cảnh báo mới"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Chọn loại, nhập nội dung và thiết lập trạng thái hiển thị cho nông dân.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Loại</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="notification">Thông báo</option>
                  <option value="warning">Cảnh báo</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">
                  Tên thông báo/cảnh báo
                </span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ví dụ: Cảnh báo sâu bệnh tuần này"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Nội dung</span>
                <textarea
                  rows={7}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Nhập nội dung chi tiết để hiển thị cho nông dân..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="inline-flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) => setForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Hiển thị cho nông dân ngay sau khi lưu
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all ${
                  submitting
                    ? "cursor-not-allowed bg-gray-300"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {submitting
                  ? "Đang xử lý..."
                  : editingId
                    ? "Lưu cập nhật"
                    : "Tạo thông báo/cảnh báo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminAnnouncements;
