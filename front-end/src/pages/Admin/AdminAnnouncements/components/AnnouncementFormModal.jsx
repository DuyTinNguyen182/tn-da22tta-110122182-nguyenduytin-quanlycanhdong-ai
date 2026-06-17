import React, { useState, useMemo, useEffect, useRef } from "react";
import { BellRing, Plus, Save, Users, X, Search } from "lucide-react";
import CustomCheckbox from "../../../../components/UI/CustomCheckbox";
import CustomDropdown from "../../../../components/UI/CustomDropdown";
import {
  FORM_TYPE_OPTIONS,
  TARGET_MODE_OPTIONS,
} from "../adminAnnouncementsUtils.jsx";

const AnnouncementFormModal = ({
  open,
  editingId,
  form,
  optionsLoading,
  submitting,
  fieldOptions,
  farmerOptions,
  selectedFieldFarmers,
  onClose,
  onFormChange,
  onTargetModeChange,
  onSubmit,
}) => {
  const [farmerSearch, setFarmerSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Xử lý click ra ngoài để đóng dropdown tìm kiếm
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lọc danh sách nông dân theo từ khóa tìm kiếm
  const filteredFarmers = useMemo(() => {
    if (!farmerSearch.trim()) return farmerOptions;
    const lowerSearch = farmerSearch.toLowerCase();
    return farmerOptions.filter((farmer) =>
      farmer.label.toLowerCase().includes(lowerSearch),
    );
  }, [farmerOptions, farmerSearch]);

  // Xử lý chọn/bỏ chọn từng nông dân
  const handleToggleFarmer = (farmerId) => {
    const currentIds = form.userIds || [];
    if (currentIds.includes(farmerId)) {
      onFormChange(
        "userIds",
        currentIds.filter((id) => id !== farmerId),
      );
    } else {
      onFormChange("userIds", [...currentIds, farmerId]);
    }
  };

  // Reset state khi đóng/mở modal
  useEffect(() => {
    if (!open) {
      setFarmerSearch("");
      setIsDropdownOpen(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {editingId
                ? "Chỉnh sửa thông báo/cảnh báo"
                : "Tạo thông báo/cảnh báo mới"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Hệ thống sẽ gửi qua web và email cho nhóm nông dân bạn chọn.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Loại
              </span>
              <CustomDropdown
                value={form.type}
                onChange={(value) => onFormChange("type", value)}
                options={FORM_TYPE_OPTIONS}
                placeholder="Chọn loại"
                icon={BellRing}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Nhóm người nhận
              </span>
              <CustomDropdown
                value={form.targetMode}
                onChange={onTargetModeChange}
                options={TARGET_MODE_OPTIONS}
                placeholder="Chọn nhóm người nhận"
                icon={Users}
              />
            </label>
          </div>

          {form.targetMode === "field_users" ? (
            <div className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Cánh đồng nhận thông báo
              </span>
              <CustomDropdown
                value={form.fieldId}
                onChange={(value) => onFormChange("fieldId", value)}
                options={fieldOptions}
                placeholder="Chọn cánh đồng"
                icon={Users}
              />

              {form.fieldId ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-gray-600">
                    Danh sách {selectedFieldFarmers.length} nông dân sẽ nhận:
                  </p>
                  {selectedFieldFarmers.length > 0 ? (
                    <div className="max-h-[200px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-2">
                      {selectedFieldFarmers.map((farmer) => (
                        <div
                          key={farmer._id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-gray-100/80"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800">
                              <span className="font-semibold">
                                {farmer.fullName}
                              </span>
                              <span className="text-gray-500 ml-1">
                                - {farmer.email || farmer.phone || "--"}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                      Cánh đồng này chưa có nông dân nào tham gia.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Chọn một cánh đồng để xem trước và gửi cho toàn bộ nông dân
                  thuộc cánh đồng đó.
                </p>
              )}
            </div>
          ) : null}

          {form.targetMode === "selected_users" ? (
            <div className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Chọn nông dân nhận thông báo (Đã chọn{" "}
                {form.userIds?.length || 0})
              </span>

              <div className="relative" ref={dropdownRef}>
                {/* Thanh tìm kiếm */}
                <div
                  className={`flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 transition-all ${
                    isDropdownOpen
                      ? "border-emerald-400 ring-2 ring-emerald-100 shadow-sm"
                      : "border-gray-200 shadow-sm hover:border-gray-300"
                  }`}
                  onClick={() => setIsDropdownOpen(true)}
                >
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                  {farmerSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFarmerSearch("");
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown danh sách (Sổ xuống khi click) */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-10 max-h-[220px] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-lg">
                    {filteredFarmers.length > 0 ? (
                      filteredFarmers.map((farmer) => {
                        const isSelected = (form.userIds || []).includes(
                          farmer.value,
                        );
                        return (
                          <label
                            key={farmer.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                              isSelected
                                ? "bg-emerald-50/50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <CustomCheckbox
                              checked={isSelected}
                              onChange={() => handleToggleFarmer(farmer.value)}
                            />
                            <span
                              className={`text-sm ${
                                isSelected
                                  ? "font-semibold text-emerald-800"
                                  : "font-medium text-gray-700"
                              }`}
                            >
                              {farmer.label}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Không tìm thấy nông dân nào phù hợp
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Danh sách nông dân ĐÃ ĐƯỢC CHỌN (hiển thị bên dưới) */}
              {(form.userIds || []).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-gray-600">
                    Danh sách nông dân sẽ nhận:
                  </p>
                  <div className="max-h-[200px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-2 space-y-1">
                    {form.userIds.map((id) => {
                      const farmerInfo = farmerOptions.find(
                        (f) => f.value === id,
                      );
                      if (!farmerInfo) return null;

                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 border border-gray-100 shadow-sm"
                        >
                          <span className="text-sm font-medium text-gray-800">
                            {farmerInfo.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleFarmer(id)}
                            className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Loại bỏ"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">
              Tên thông báo/cảnh báo
            </span>
            <input
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              placeholder="Ví dụ: Cảnh báo sâu bệnh tuần này"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block m-0 py-0">
            <span className="mb-2 block text-sm font-semibold text-gray-700">
              Nội dung
            </span>
            <textarea
              rows={5}
              value={form.content}
              onChange={(event) => onFormChange("content", event.target.value)}
              placeholder="Nhập nội dung chi tiết để hiển thị cho nông dân..."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 px-4 py-2 mt-2">
            <CustomCheckbox
              checked={form.isVisible}
              onChange={() => onFormChange("isVisible", !form.isVisible)}
            />
            <span className="text-sm font-medium text-gray-700">
              Hiển thị ngay cho nông dân sau khi lưu
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || optionsLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all ${
              submitting || optionsLoading
                ? "cursor-not-allowed bg-gray-300"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200"
            }`}
          >
            {editingId ? <Save size={16} /> : <Plus size={16} />}
            {submitting
              ? "Đang xử lý..."
              : editingId
                ? "Lưu cập nhật"
                : "Tạo và gửi"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementFormModal;
