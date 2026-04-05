import React, { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../hooks/useFeedback";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  role: "farmer",
};

const roleOptions = [
  { value: "farmer", label: "Nông dân" },
  { value: "admin", label: "Quản trị viên" },
];

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

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "--";

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { confirm } = useFeedback();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const closeUserModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(emptyForm);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setResetPasswordUser(null);
    setNewPassword("");
    setShowPassword(false);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data.users || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!success) return undefined;

    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesKeyword =
        !keyword ||
        user.fullName?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.phone?.toLowerCase().includes(keyword) ||
        user.address?.toLowerCase().includes(keyword);

      const matchesRole = roleFilter ? user.role === roleFilter : true;

      return matchesKeyword && matchesRole;
    });
  }, [roleFilter, searchTerm, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      adminCount: users.filter((item) => item.role === "admin").length,
      farmerCount: users.filter((item) => item.role !== "admin").length,
    }),
    [users]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenCreate = () => {
    setError("");
    setEditingUser(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setError("");
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      address: user.address || "",
      role: user.role || "farmer",
    });
    setShowModal(true);
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên, email và mật khẩu.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/users", {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        role: formData.role,
      });

      setSuccess("Tạo tài khoản thành công.");
      closeUserModal();
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tạo người dùng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    setError("");

    if (!editingUser) return;

    if (!formData.fullName.trim() || !formData.email.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên và email.");
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/users/${editingUser._id}`, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        role: formData.role,
      });

      setSuccess("Cập nhật người dùng thành công.");
      closeUserModal();
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể cập nhật người dùng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = await confirm({
      title: "Xóa người dùng?",
      message: `Bạn có chắc muốn xóa người dùng "${user.fullName}"?`,
      confirmText: "Xóa người dùng",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      await api.delete(`/users/${user._id}`);
      setSuccess("Xóa người dùng thành công.");
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa người dùng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");

    if (!resetPasswordUser) return;

    if (!newPassword || newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/users/${resetPasswordUser._id}/reset-password`, {
        newPassword,
      });

      setSuccess("Đặt lại mật khẩu thành công.");
      closePasswordModal();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể đặt lại mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Đồng bộ theo `UserModel`: họ tên, email, số điện thoại, địa chỉ, vai trò và ngày tạo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
        >
          <Plus size={18} />
          Thêm người dùng
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Tổng người dùng</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Quản trị viên</p>
          <p className="mt-3 text-3xl font-bold text-red-600">{summary.adminCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Nông dân</p>
          <p className="mt-3 text-3xl font-bold text-blue-600">{summary.farmerCount}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_220px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo họ tên, email, số điện thoại hoặc địa chỉ..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
          >
            <option value="">Tất cả vai trò</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-full min-h-[360px] items-center justify-center text-gray-500">
            Đang tải danh sách người dùng...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full min-h-[360px] items-center justify-center text-gray-500">
            Không có người dùng nào phù hợp.
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Người dùng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Liên hệ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Địa chỉ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Vai trò
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Hành động
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const roleMeta = getRoleMeta(user.role);
                  const isCurrentUser = String(currentUser?._id || currentUser?.id || "") === String(user._id);

                  return (
                    <tr key={user._id} className="hover:bg-gray-50/80">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                            {(user.fullName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.fullName}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                              <Mail size={14} />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400" />
                            {user.phone || "Chưa cập nhật"}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <p className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                          <span>{user.address || "Chưa cập nhật"}</span>
                        </p>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleMeta.className}`}
                        >
                          {roleMeta.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="rounded-xl p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setResetPasswordUser(user);
                              setShowPasswordModal(true);
                            }}
                            className="rounded-xl p-2 text-orange-600 transition-colors hover:bg-orange-50"
                            title="Đặt lại mật khẩu"
                          >
                            <Lock size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={submitting || isCurrentUser}
                            className={`rounded-xl p-2 transition-colors ${
                              submitting || isCurrentUser
                                ? "cursor-not-allowed text-gray-300"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                            title={isCurrentUser ? "Không thể xóa tài khoản đang đăng nhập" : "Xóa người dùng"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Cập nhật đúng các trường đang có trong `UserModel`.
              </p>
            </div>

            <form
              onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
              className="space-y-5 p-6"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
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
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
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
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                {!editingUser ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Mật khẩu
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Vai trò
                  </label>
                  <div className="relative">
                    <ShieldCheck
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
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
                      onChange={handleFormChange}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                      placeholder="090xxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Địa chỉ
                </label>
                <textarea
                  rows={3}
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                  placeholder="Ấp, xã, huyện, tỉnh..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    closeUserModal();
                  }}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all ${
                    submitting
                      ? "cursor-not-allowed bg-gray-300"
                      : "bg-emerald-600 shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                  }`}
                >
                  {submitting
                    ? "Đang xử lý..."
                    : editingUser
                      ? "Cập nhật người dùng"
                      : "Tạo người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showPasswordModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
              <p className="mt-1 text-sm text-gray-500">
                Người dùng: <span className="font-semibold">{resetPasswordUser?.fullName}</span>
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    closePasswordModal();
                  }}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all ${
                    submitting
                      ? "cursor-not-allowed bg-gray-300"
                      : "bg-emerald-600 shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                  }`}
                >
                  {submitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminUsers;
