import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import PaginationControls from "../../../../components/Common/PaginationControls";

const TaskDetailTable = ({
  items,
  loading,
  submitting,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="font-bold text-gray-800">Danh mục chi tiết công việc</h2>
        <span className="text-sm text-gray-500">Tổng: {totalItems}</span>
      </div>

      {loading ? (
        <div className="p-6">Đang tải dữ liệu chi tiết công việc...</div>
      ) : items.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-gray-500">
          Chưa có chi tiết công việc nào
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Công việc
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Tên chi tiết
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d._id} className="border-t border-gray-100">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-800">
                      {d.taskName || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-800">
                      {d.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(d)}
                        disabled={submitting}
                        className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(d)}
                        disabled={submitting}
                        className={`rounded-lg p-1.5 transition-colors ${
                          submitting
                            ? "cursor-not-allowed text-gray-300"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-gray-500">
          Hiển thị {items.length} chi tiết trong tổng số {totalItems} theo bộ
          lọc hiện tại.
        </p>

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={submitting}
        />
      </div>
    </div>
  );
};

export default TaskDetailTable;
