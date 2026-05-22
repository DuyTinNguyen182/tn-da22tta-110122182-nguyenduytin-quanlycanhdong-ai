import React, { useState } from "react";
import { Eye, EyeOff, Mail, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import CustomDropdown from "../../../../components/UI/CustomDropdown";

const UserFormModal = ({
  open,
  editingUser,
  formData,
  submitting,
  roleOptions,
  onChange,
  onRoleChange,
  onClose,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-gray-100 px-6 py-4 pr-14">
          <h2 className="text-xl font-bold text-gray-900">
            {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Đóng form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Họ tên
              </label>
              <div className="relative">
                <UserRound
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={onChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                {editingUser ? "Mật khẩu mới" : "Mật khẩu"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  autoComplete="new-password"
                  required={!editingUser}
                  className="hide-password-reveal w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  placeholder={
                    editingUser ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {editingUser ? (
                <p className="mt-1 text-xs text-gray-500">
                  Chỉ nhập khi muốn thay đổi mật khẩu.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Vai trò
              </label>
              <CustomDropdown
                value={formData.role}
                onChange={onRoleChange}
                icon={ShieldCheck}
                options={roleOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  placeholder="090xxxxxxx"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Địa chỉ
            </label>
            <textarea
              rows={2}
              name="address"
              value={formData.address}
              onChange={onChange}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
              placeholder="Ấp, xã, tỉnh..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
                submitting
                  ? "cursor-not-allowed bg-gray-300"
                  : "bg-emerald-600 shadow-sm hover:bg-emerald-700"
              }`}
            >
              {submitting
                ? "Đang xử lý..."
                : editingUser
                  ? "Cập nhật"
                  : "Tạo người dùng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
