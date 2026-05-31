import React from "react";
import { X, Package } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const AllowedProductFormModal = ({
  open,
  modalMode,
  submitting,
  categoryOptions,

  productName,
  setProductName,
  category,
  setCategory,
  targetIssues,
  setTargetIssues,
  usagePeriods,
  setUsagePeriods,
  instructions,
  setInstructions,
  isActive,
  setIsActive,

  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {modalMode === "edit"
                ? "Chỉnh sửa Sản phẩm"
                : "Thêm mới Vật tư HTX"}
            </h2>
            <p className="text-xs text-gray-500">
              Thông tin cấu hình tại đây sẽ được AI lấy làm căn cứ để tư vấn cho
              nông dân.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Tên sản phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="VD: Amistar Top 325SC"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Phân loại
              </label>
              <CustomDropdown
                value={category}
                onChange={setCategory}
                options={categoryOptions}
                placeholder="Chọn phân loại"
                icon={Package}
                variant="active"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Mục tiêu xử lý / Trị bệnh (Cách nhau bằng dấu phẩy)
            </label>
            <input
              value={targetIssues}
              onChange={(e) => setTargetIssues(e.target.value)}
              placeholder="VD: đạo ôn, khô vằn, còi cọc..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Giai đoạn áp dụng (Cách nhau bằng dấu phẩy)
            </label>
            <input
              value={usagePeriods}
              onChange={(e) => setUsagePeriods(e.target.value)}
              placeholder="VD: bón lót, đẻ nhánh, làm đòng..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Hướng dẫn sử dụng & Liều lượng{" "}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="VD: Pha 25ml cho bình 25 lít nước. Phun tập trung phần gốc rạ..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Cho phép AI tư vấn
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Tắt tính năng này nếu HTX không cho phép sử dụng sản phẩm nữa.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {modalMode === "edit" ? "Lưu thay đổi" : "Xác nhận tạo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllowedProductFormModal;
