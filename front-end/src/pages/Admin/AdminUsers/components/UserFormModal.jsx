import React from "react";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
          </h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Họ tên</label>
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
              <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
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

            {!editingUser ? (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Mật khẩu</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Vai trò</label>
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
            <label className="mb-1 block text-sm font-semibold text-gray-700">Địa chỉ</label>
            <textarea
              rows={2}
              name="address"
              value={formData.address}
              onChange={onChange}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
              placeholder="Ấp, xã, huyện, tỉnh..."
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
              {submitting ? "Đang xử lý..." : editingUser ? "Cập nhật" : "Tạo người dùng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
