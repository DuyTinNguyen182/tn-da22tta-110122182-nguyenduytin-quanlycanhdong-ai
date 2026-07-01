import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import AdminAnnouncementsSummaryCards from "./components/AdminAnnouncementsSummaryCards.jsx";
import AdminAnnouncementsFilterBar from "./components/AdminAnnouncementsFilterBar.jsx";
import AdminAnnouncementsTable from "./components/AdminAnnouncementsTable.jsx";
import AnnouncementFormModal from "./components/AnnouncementFormModal.jsx";
import AnnouncementDetailModal from "./components/AnnouncementDetailModal.jsx";
import { EMPTY_FORM, createFormFromItem } from "./adminAnnouncementsUtils.jsx";

const TYPE_VALUES = new Set(["notification", "warning"]);
const TARGET_MODE_VALUES = new Set([
  "all_farmers",
  "field_users",
  "selected_users",
]);

const INITIAL_PAGINATION = {
  page: 1,
  limit: 5,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const INITIAL_SUMMARY = {
  totalCount: 0,
  visibleCount: 0,
  hiddenCount: 0,
  warningCount: 0,
  notificationCount: 0,
};

const AdminAnnouncements = () => {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [filters, setFilters] = useState({
    keyword: "",
    type: "all",
    visibility: "all",
  });
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [options, setOptions] = useState({
    fields: [],
    farmers: [],
  });

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Chọn cánh đồng" },
      ...(options.fields || []).map((field) => ({
        value: field._id,
        label: `${field.name} (${field.farmerCount || 0} nông dân)`,
      })),
    ],
    [options.fields],
  );

  const farmerOptions = useMemo(
    () =>
      (options.farmers || []).map((farmer) => ({
        value: farmer._id,
        label: farmer.email
          ? `${farmer.fullName} - ${farmer.email}`
          : farmer.fullName,
      })),
    [options.farmers],
  );

  const selectedFieldFarmers = useMemo(() => {
    if (!form.fieldId) return [];

    return (options.farmers || []).filter((farmer) =>
      (farmer.fields || []).some((field) => field.fieldId === form.fieldId),
    );
  }, [form.fieldId, options.farmers]);

  const allPageSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item._id));

  const fetchOptions = async () => {
    try {
      setOptionsLoading(true);
      const res = await api.get("/announcements/admin/options");
      setOptions({
        fields: res.data?.fields || [],
        farmers: res.data?.farmers || [],
      });
    } catch (error) {
      console.error("Lỗi tải dữ liệu người nhận thông báo:", error);
      toast.error(
        error.response?.data?.message ||
          "Không thể tải dữ liệu người nhận thông báo",
      );
    } finally {
      setOptionsLoading(false);
    }
  };

  const fetchAnnouncements = async (page = 1) => {
    try {
      setLoading(true);

      const res = await api.get("/announcements/admin", {
        params: {
          page,
          limit: 5,
          ...(filters.keyword.trim()
            ? { keyword: filters.keyword.trim() }
            : {}),
          ...(filters.type !== "all" ? { type: filters.type } : {}),
          ...(filters.visibility !== "all"
            ? { visibility: filters.visibility }
            : {}),
        },
      });

      const nextItems = res.data?.items || [];
      const nextPagination = res.data?.pagination || {
        ...INITIAL_PAGINATION,
        page,
        totalItems: nextItems.length,
      };

      setItems(nextItems);
      setPagination(nextPagination);
      setSummary(res.data?.summary || INITIAL_SUMMARY);
      setSelectedIds((prev) =>
        prev.filter((id) => nextItems.some((item) => item._id === id)),
      );
    } catch (error) {
      console.error("Lỗi tải danh sách thông báo/cảnh báo:", error);
      toast.error(
        error.response?.data?.message ||
          "Không thể tải danh sách thông báo/cảnh báo",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchAnnouncements(currentPage);
  }, [currentPage, filters]);

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingId("");
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const openCreateModal = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setForm(createFormFromItem(item));
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setFormErrors((prev) => {
      if (!prev[field]) return prev;

      const nextErrors = { ...prev };
      delete nextErrors[field];

      if (field === "targetMode") {
        delete nextErrors.fieldId;
        delete nextErrors.userIds;
      }

      return nextErrors;
    });
  };

  const handleTargetModeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      targetMode: value,
      fieldId: value === "field_users" ? prev.fieldId : "",
      userIds: value === "selected_users" ? prev.userIds : [],
    }));

    setFormErrors((prev) => {
      if (!prev.targetMode && !prev.fieldId && !prev.userIds) return prev;

      const nextErrors = { ...prev, targetMode: undefined };
      delete nextErrors.targetMode;
      delete nextErrors.fieldId;
      delete nextErrors.userIds;
      return nextErrors;
    });
  };

  const validateAnnouncementForm = () => {
    const nextErrors = {};
    const title = form.title?.trim();
    const content = form.content?.trim();

    if (!TYPE_VALUES.has(form.type)) {
      nextErrors.type = "Vui lòng chọn loại thông báo hợp lệ.";
    }

    if (!title) {
      nextErrors.title = "Vui lòng nhập tên thông báo/cảnh báo.";
    }

    if (!content) {
      nextErrors.content = "Vui lòng nhập nội dung.";
    }

    if (!TARGET_MODE_VALUES.has(form.targetMode)) {
      nextErrors.targetMode = "Vui lòng chọn nhóm người nhận hợp lệ.";
    }

    if (form.targetMode === "field_users") {
      if (!form.fieldId) {
        nextErrors.fieldId = "Vui lòng chọn cánh đồng nhận thông báo.";
      } else if ((selectedFieldFarmers || []).length === 0) {
        nextErrors.fieldId =
          "Cánh đồng đã chọn chưa có nông dân để nhận thông báo.";
      }
    }

    if (
      form.targetMode === "selected_users" &&
      (form.userIds || []).length === 0
    ) {
      nextErrors.userIds = "Vui lòng chọn ít nhất 1 nông dân.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAnnouncementForm()) {
      toast.warning("Vui lòng kiểm tra lại các trường bắt buộc.");
      return;
    }

    const payload = {
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      isVisible: form.isVisible === true,
      deliveryChannels: ["web", "email"],
      targetConfig: {
        mode: form.targetMode,
        ...(form.targetMode === "field_users" && form.fieldId
          ? { fieldId: form.fieldId }
          : {}),
      },
      audience: {
        scope: "users",
        userIds: form.targetMode === "selected_users" ? form.userIds : [],
      },
    };

    if (!payload.title) {
      toast.warning("Vui lòng nhập tên thông báo/cảnh báo");
      return;
    }

    if (!payload.content) {
      toast.warning("Vui lòng nhập nội dung");
      return;
    }

    if (form.targetMode === "field_users" && !form.fieldId) {
      toast.warning("Vui lòng chọn cánh đồng nhận thông báo");
      return;
    }

    if (form.targetMode === "selected_users" && form.userIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 nông dân");
      return;
    }

    if (editingId) {
      const originalItem = items.find((i) => i._id === editingId);
      if (originalItem) {
        const origTargetMode = originalItem.targetMode || "all_farmers";
        const origFieldId = originalItem.targetFieldId || "";
        const origUserIds = (originalItem.audienceUserIds || [])
          .slice()
          .sort()
          .join(",");
        const currentUserIds = (
          form.targetMode === "selected_users" ? form.userIds : []
        )
          .slice()
          .sort()
          .join(",");

        const isUnchanged =
          originalItem.title === payload.title &&
          originalItem.content === payload.content &&
          originalItem.type === payload.type &&
          (originalItem.isVisible === true) === payload.isVisible &&
          origTargetMode === payload.targetConfig.mode &&
          (origTargetMode === "field_users"
            ? origFieldId === (payload.targetConfig.fieldId || "")
            : true) &&
          (origTargetMode === "selected_users"
            ? origUserIds === currentUserIds
            : true);

        if (isUnchanged) {
          toast.info("Không có thay đổi nào để lưu.");
          return;
        }
      }
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

      closeFormModal();
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await fetchAnnouncements(1);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể lưu thông báo/cảnh báo",
      );
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
      toast.error(
        error.response?.data?.message || "Không thể xóa thông báo/cảnh báo",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thông báo/cảnh báo để xóa.");
      return;
    }

    const selectedCount = selectedIds.length;
    const confirmed = await confirm({
      title: "Xóa nhiều thông báo/cảnh báo?",
      message: `Bạn có chắc muốn xóa ${selectedCount} mục đã chọn không?`,
      confirmText: "Xóa đã chọn",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/announcements/admin/bulk-delete", {
        ids: selectedIds,
      });
      toast.success(`Đã xóa ${selectedCount} thông báo/cảnh báo.`);
      setSelectedIds([]);

      const fallbackPage =
        items.length === selectedCount && currentPage > 1
          ? currentPage - 1
          : currentPage;

      if (fallbackPage !== currentPage) {
        setCurrentPage(fallbackPage);
      } else {
        await fetchAnnouncements(fallbackPage);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Không thể xóa các thông báo/cảnh báo đã chọn",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleAllPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !items.some((item) => item._id === id)),
      );
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set(prev);
      items.forEach((item) => merged.add(item._id));
      return Array.from(merged);
    });
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
        <AdminAnnouncementsSummaryCards summary={summary} />

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Danh sách quản lý
              </h2>
            </div>

            <AdminAnnouncementsFilterBar
              filters={filters}
              selectedCount={selectedIds.length}
              submitting={submitting}
              onFilterChange={handleFilterChange}
              onDeleteSelected={handleDeleteSelected}
              onCreate={openCreateModal}
            />
          </div>

          <AdminAnnouncementsTable
            loading={loading}
            items={items}
            pagination={pagination}
            selectedIds={selectedIds}
            allPageSelected={allPageSelected}
            submitting={submitting}
            onToggleAllPage={handleToggleAllPage}
            onToggleRow={handleToggleRow}
            onView={setSelectedItem}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onPageChange={setCurrentPage}
          />
        </section>
      </div>

      <AnnouncementFormModal
        open={isFormModalOpen}
        editingId={editingId}
        form={form}
        errors={formErrors}
        optionsLoading={optionsLoading}
        submitting={submitting}
        fieldOptions={fieldOptions}
        farmerOptions={farmerOptions}
        selectedFieldFarmers={selectedFieldFarmers}
        onClose={closeFormModal}
        onFormChange={handleFormChange}
        onTargetModeChange={handleTargetModeChange}
        onSubmit={handleSubmit}
      />

      <AnnouncementDetailModal
        item={selectedItem}
        farmers={options.farmers}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default AdminAnnouncements;
