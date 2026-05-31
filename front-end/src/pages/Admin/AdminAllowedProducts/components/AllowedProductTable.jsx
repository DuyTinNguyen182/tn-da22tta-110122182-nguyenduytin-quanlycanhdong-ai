import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import LoadingScreen from "../../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../../components/Common/PaginationControls";

const CATEGORY_STYLES = {
  fertilizer: "bg-amber-50 text-amber-700 border border-amber-100",
  pesticide: "bg-rose-50 text-rose-700 border border-rose-100",
};

const CATEGORY_LABELS = {
  fertilizer: "Phân bón",
  pesticide: "Thuốc BVTV",
};

const AllowedProductTable = ({
  products,
  loading,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onStartEdit,
  onDelete,
}) => {
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        {loading ? (
          <LoadingScreen message="Đang tải danh mục vật tư..." />
        ) : products.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-gray-500">
            Không tìm thấy sản phẩm nào phù hợp
          </div>
        ) : (
          <table className="w-full min-w-full table-auto">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Tên sản phẩm
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Phân loại
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Trị bệnh / Dùng cho
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Giai đoạn / Mốc áp dụng
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase text-gray-500 whitespace-nowrap">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((item) => {
                const categoryClass =
                  CATEGORY_STYLES[item.category] ||
                  "bg-gray-100 text-gray-700 border-gray-200";
                const categoryLabel = CATEGORY_LABELS[item.category] || "Khác";

                return (
                  <tr key={item._id} className="transition hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-gray-800">
                        {item.product_name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryClass}`}
                      >
                        {categoryLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.target_issues?.map((issue, idx) => (
                          <span
                            key={idx}
                            className="inline-flex bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[11px] font-medium border border-slate-200"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-medium text-gray-600 block max-w-[200px] truncate"
                        title={item.usage_periods?.join(", ")}
                      >
                        {item.usage_periods?.join(", ") || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {item.is_active ? "Hiển thị" : "Ẩn"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => onStartEdit(item)}
                          className="rounded-lg bg-blue-50 p-1.5 text-blue-700 transition hover:bg-blue-100"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && products.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-gray-500">
            Hiển thị {products.length} sản phẩm trong tổng số {totalItems} theo
            bộ lọc.
          </p>
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default AllowedProductTable;
