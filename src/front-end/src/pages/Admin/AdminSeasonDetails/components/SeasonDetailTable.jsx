import React from "react";
import { CalendarCheck2, Pencil, Trash2 } from "lucide-react";
import PaginationControls from "../../../../components/Common/PaginationControls";

const resolveDetailYear = (detail) => {
  if (detail?.year) {
    return String(detail.year);
  }

  if (detail?.startDate) {
    return String(new Date(detail.startDate).getFullYear());
  }

  return "";
};

const formatSeasonName = (detail) => detail?.season?.name || "Không xác định";

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

const SeasonDetailTable = ({
  seasonDetails,
  currentPage,
  totalPages,
  totalCount,
  submitting,
  onPageChange,
  onStartEdit,
  onFinish,
  onDelete,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="font-bold text-gray-800">Danh sách chi tiết mùa vụ</h2>
        <span className="text-sm font-medium text-gray-500">
          Tổng: {totalCount}
        </span>
      </div>

      {seasonDetails.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-gray-500">
          Chưa có chi tiết mùa vụ nào
        </div>
      ) : (
        <>
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
                  const finishable =
                    detail.status === "active" || detail.status === "planned";

                  return (
                    <tr
                      key={detail._id}
                      className="border-t border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-gray-800">
                          {formatSeasonName(detail)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-gray-700">
                          {resolveDetailYear(detail) || "--"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-gray-700">
                          {formatDate(detail.startDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-gray-700">
                          {formatDate(detail.endDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {renderStatus(detail.status)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {finishable ? (
                            <button
                              disabled={submitting}
                              onClick={() => onFinish(detail)}
                              className="rounded-lg bg-indigo-50 p-2 text-indigo-700 transition-colors hover:bg-indigo-100"
                              title="Kết thúc nhanh (Hôm nay)"
                            >
                              <CalendarCheck2 size={16} />
                            </button>
                          ) : null}
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {seasonDetails.length} chi tiết mùa vụ trong tổng số{" "}
              {totalCount} chi tiết mùa vụ.
            </p>

            <PaginationControls
              page={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              disabled={submitting}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SeasonDetailTable;
