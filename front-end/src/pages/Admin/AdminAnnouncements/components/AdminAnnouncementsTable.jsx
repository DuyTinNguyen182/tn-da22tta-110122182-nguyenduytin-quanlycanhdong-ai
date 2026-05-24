import React from "react";
import {
  Eye,
  EyeOff,
  Pencil,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import LoadingScreen from "../../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../../components/Common/PaginationControls";
import CustomCheckbox from "../../../../components/UI/CustomCheckbox";
import {
  TYPE_STYLES,
  formatDateTime,
  getRecipientSummary,
} from "../adminAnnouncementsUtils.jsx";

const ActionButton = ({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  tone = "default",
}) => {
  const toneClassName =
    tone === "danger"
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-50 ${toneClassName}`}
    >
      <Icon size={16} />
    </button>
  );
};

const AdminAnnouncementsTable = ({
  loading,
  items,
  pagination,
  selectedIds,
  allPageSelected,
  submitting,
  onToggleAllPage,
  onToggleRow,
  onView,
  onEdit,
  onDelete,
  onPageChange,
}) => {
  if (loading) {
    return <LoadingScreen message="Đang tải danh sách thông báo..." />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center">
        <div className="rounded-2xl bg-white p-4 text-gray-400 shadow-sm">
          <ShieldAlert size={28} />
        </div>
        <p className="mt-4 text-base font-semibold text-gray-700">
          Chưa có dữ liệu phù hợp
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Thử đổi bộ lọc hoặc tạo thông báo/cảnh báo mới.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">
                <CustomCheckbox
                  checked={allPageSelected}
                  onChange={onToggleAllPage}
                />
              </th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Đối tượng nhận</th>
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
                    <CustomCheckbox
                      checked={selectedIds.includes(item._id)}
                      onChange={() => onToggleRow(item._id)}
                    />
                  </td>
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
                    <p className="mt-1 line-clamp-2 max-w-[320px] whitespace-pre-line text-sm leading-6 text-gray-600">
                      {item.content}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">
                      {getRecipientSummary(item)}
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
                      {item.isVisible ? "Đang hiển thị" : "Đang ẩn"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    <p>{formatDateTime(item.createdAt)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Cập nhật: {formatDateTime(item.updatedAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        label="Xem chi tiết"
                        icon={Eye}
                        onClick={() => onView(item)}
                      />
                      <ActionButton
                        label="Chỉnh sửa"
                        icon={Pencil}
                        onClick={() => onEdit(item)}
                      />
                      <ActionButton
                        label="Xóa"
                        icon={Trash2}
                        onClick={() => onDelete(item)}
                        disabled={submitting}
                        tone="danger"
                      />
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
          Hiển thị {items.length} mục trong tổng số {pagination.totalItems} mục theo
          bộ lọc hiện tại.
        </p>

        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default AdminAnnouncementsTable;
