import React from "react";
import { Edit2, Eye, EyeOff, Lock, Mail, Phone, Trash2, UserRound } from "lucide-react";

const getRoleMeta = (role) => {
  const normalized = String(role || "").toLowerCase();

  if (normalized === "admin") {
    return {
      label: "Quản trị viên",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "Nông dân",
    className: "bg-blue-100 text-blue-700",
  };
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "--");

const UserTable = ({ users, currentUser, submitting, onEdit, onResetPassword, onDelete }) => {
  return (
    <div className="h-full overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Người dùng
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Liên hệ
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Vai trò
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ngày tạo
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              Hành động
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {users.map((user) => {
            const roleMeta = getRoleMeta(user.role);
            const isCurrentUser = String(currentUser?._id || currentUser?.id || "") === String(user._id);

            return (
              <tr key={user._id} className="hover:bg-gray-50/80">
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {(user.fullName || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{user.fullName}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3 align-top">
                  <p className="text-sm text-gray-600">{user.phone || "—"}</p>
                  <p className="mt-0.5 max-w-[180px] truncate text-xs text-gray-400">
                    {user.address || ""}
                  </p>
                </td>

                <td className="px-5 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleMeta.className}`}
                  >
                    {roleMeta.label}
                  </span>
                </td>

                <td className="px-5 py-3 align-top text-sm text-gray-600">{formatDate(user.createdAt)}</td>

                <td className="px-5 py-3 align-top">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onResetPassword(user)}
                      className="rounded-lg p-1.5 text-orange-600 transition-colors hover:bg-orange-50"
                      title="Đặt lại mật khẩu"
                    >
                      <Lock size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(user)}
                      disabled={submitting || isCurrentUser}
                      className={`rounded-lg p-1.5 transition-colors ${
                        submitting || isCurrentUser
                          ? "cursor-not-allowed text-gray-300"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                      title={isCurrentUser ? "Không thể xóa tài khoản đang đăng nhập" : "Xóa người dùng"}
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
    </div>
  );
};

export default UserTable;
