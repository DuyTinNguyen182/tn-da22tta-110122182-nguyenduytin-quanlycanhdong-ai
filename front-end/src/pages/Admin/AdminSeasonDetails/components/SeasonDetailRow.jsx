import React from "react";
import { CalendarCheck2, Pencil, Save, Trash2, X } from "lucide-react";

const resolveSeasonYear = (seasonDetail) => {
  if (seasonDetail?.year) {
    return seasonDetail.year;
  }

  if (seasonDetail?.startDate) {
    return new Date(seasonDetail.startDate).getFullYear();
  }

  return "";
};

const formatSeasonName = (seasonDetail) =>
  seasonDetail.season?.name || "Không xác định";

const formatDate = (dateString) => {
  if (!dateString) return "--/--/----";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const renderStatus = (status) => {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Đang canh tác
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          Đã kết thúc
        </span>
      );
    case "planned":
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Dự kiến
        </span>
      );
  }
};

const SeasonDetailRow = ({
  detail,
  isEditing,
  editYear,
  editStartDate,
  editEndDate,
  submitting,
  yearOptions,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onFinish,
  onDelete,
  onEditYearChange,
  onEditStartDateChange,
  onEditEndDateChange,
}) => {
  return (
    <tr className="border-t border-gray-100 transition-colors hover:bg-gray-50">
      <td className="px-5 py-4">
        <span className="font-semibold text-gray-800">
          {formatSeasonName(detail)}
        </span>
      </td>

      <td className="px-5 py-4">
        {isEditing ? (
          <select
            value={editYear}
            onChange={(e) => onEditYearChange(e.target.value)}
            className="w-[110px] rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-gray-700">
            {resolveSeasonYear(detail) || "--"}
          </span>
        )}
      </td>

      <td className="px-5 py-4">
        {isEditing ? (
          <input
            type="date"
            value={editStartDate}
            onChange={(e) => onEditStartDateChange(e.target.value)}
            className="w-[140px] rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="text-gray-700">{formatDate(detail.startDate)}</span>
        )}
      </td>

      <td className="px-5 py-4">
        {isEditing ? (
          <input
            type="date"
            value={editEndDate}
            onChange={(e) => onEditEndDateChange(e.target.value)}
            className="w-[140px] rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="text-gray-700">{formatDate(detail.endDate)}</span>
        )}
      </td>

      <td className="px-5 py-4">{renderStatus(detail.status)}</td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <button
                disabled={submitting}
                onClick={() => onSaveEdit(detail._id)}
                className="rounded-lg bg-emerald-50 p-2 text-emerald-700 transition-colors hover:bg-emerald-100"
                title="Lưu lại"
              >
                <Save size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={onCancelEdit}
                className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200"
                title="Hủy chỉnh sửa"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              {(detail.status === "active" || detail.status === "planned") && (
                <button
                  disabled={submitting}
                  onClick={() => onFinish(detail)}
                  className="rounded-lg bg-indigo-50 p-2 text-indigo-700 transition-colors hover:bg-indigo-100"
                  title="Kết thúc nhanh (Hôm nay)"
                >
                  <CalendarCheck2 size={16} />
                </button>
              )}
              <button
                disabled={submitting}
                onClick={() => onStartEdit(detail)}
                className="rounded-lg bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100"
                title="Chỉnh sửa"
              >
                <Pencil size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={() => onDelete(detail)}
                className="rounded-lg bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
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
};

export default SeasonDetailRow;
