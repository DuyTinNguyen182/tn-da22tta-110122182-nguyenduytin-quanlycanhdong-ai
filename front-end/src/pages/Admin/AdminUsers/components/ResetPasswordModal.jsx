import React from "react";
import { Eye, EyeOff } from "lucide-react";

const ResetPasswordModal = ({
  open,
  resetPasswordUser,
  newPassword,
  showPassword,
  submitting,
  onChange,
  onToggleShowPassword,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
          <p className="mt-0.5 text-sm text-gray-500">{resetPasswordUser?.fullName}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                placeholder="Tối thiểu 6 ký tự"
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
              {submitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
