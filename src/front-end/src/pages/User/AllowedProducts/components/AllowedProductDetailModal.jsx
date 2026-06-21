import React from "react";
import { ShieldCheck, Tag, X } from "lucide-react";

const CATEGORY_LABELS = {
  fertilizer: "Phân bón",
  pesticide: "Thuốc BVTV",
};

const AllowedProductDetailModal = ({ product, onClose }) => {
  if (!product) return null;

  const categoryKey = product.category?.toLowerCase() || "";
  const categoryLabel = CATEGORY_LABELS[categoryKey] || "Khác";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck size={14} />
              Chi tiết vật tư HTX
            </span>
            <h3 className="mt-3 text-xl font-bold text-gray-900">
              {product.product_name}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Thông tin của sản phẩm được HTX khuyến nghị sử dụng.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
            aria-label="Đóng cửa sổ xem chi tiết"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Phân loại
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Tag size={15} />
                {categoryLabel}
              </p>
            </div>

            {/* <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Trạng thái
              </p>
              <p
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
              >
                {product.is_active ? "Hiển thị" : "Ẩn"}
              </p>
            </div> */}

            {/* <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Dùng cho / Trị bệnh
              </p>
              <p className="mt-2 text-sm font-medium text-gray-700">
                {(product.target_issues || []).length
                  ? `${product.target_issues.length} mục`
                  : "Chưa cập nhật"}
              </p>
            </div> */}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Mục tiêu xử lý / Trị bệnh
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.target_issues?.length ? (
                  product.target_issues.map((issue, index) => (
                    <span
                      key={`${issue}-${index}`}
                      className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {issue}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">
                    Chưa có thông tin
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Giai đoạn áp dụng
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.usage_periods?.length ? (
                  product.usage_periods.map((period, index) => (
                    <span
                      key={`${period}-${index}`}
                      className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {period}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">
                    Chưa có thông tin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Hướng dẫn sử dụng & liều lượng
            </p>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
              {product.instructions || "Chưa cập nhật hướng dẫn sử dụng."}
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllowedProductDetailModal;
