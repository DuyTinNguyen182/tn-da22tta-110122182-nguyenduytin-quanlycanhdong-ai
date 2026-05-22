import React from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import PaginationControls from "../../../../components/Common/PaginationControls";

const SeasonTable = ({
  seasons,
  currentPage,
  totalPages,
  totalCount,
  submitting,
  onPageChange,
  onStartEdit,
  onToggleVisibility,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="font-bold text-gray-800">Danh Mục Mùa Vụ</h2>
        <span className="text-sm text-gray-500">
          Tổng: {totalCount}
          {/* | Trang: {currentPage}/{totalPages} */}
        </span>
      </div>

      {seasons.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-gray-500">
          Chưa có mùa vụ nào
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Tên mùa vụ
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                  <tr key={season._id} className="border-t border-gray-100">
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-800">
                        {season.name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          season.isVisible === false
                            ? "bg-gray-100 text-gray-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {season.isVisible === false
                          ? "Đang ẩn"
                          : "Đang hiển thị"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={submitting}
                          onClick={() => onToggleVisibility(season)}
                          className={`rounded-lg p-2 ${
                            season.isVisible === false
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title={
                            season.isVisible === false
                              ? "Hiện mùa vụ"
                              : "Ẩn mùa vụ"
                          }
                        >
                          {season.isVisible === false ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => onStartEdit(season)}
                          className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => onDelete(season)}
                          className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-40"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-5 py-4">
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

export default SeasonTable;
