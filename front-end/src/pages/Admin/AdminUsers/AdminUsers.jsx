import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import UserTable from "./components/UserTable";
import UserFormModal from "./components/UserFormModal";
import ResetPasswordModal from "./components/ResetPasswordModal";
import CustomDropdown from "../../../components/UI/CustomDropdown";

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

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { toast, confirm } = useFeedback();

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
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setEditingUser(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
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

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.warning("Vui lòng nhập đầy đủ họ tên, email và mật khẩu.");
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

      toast.success("Tạo tài khoản thành công.");
      closeUserModal();
      await fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tạo người dùng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();

    if (!editingUser) return;

    if (!formData.fullName.trim() || !formData.email.trim()) {
      toast.warning("Vui lòng nhập đầy đủ họ tên và email.");
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

      toast.success("Cập nhật người dùng thành công.");
      closeUserModal();
      await fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật người dùng.");
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
      toast.success("Xóa người dùng thành công.");
      await fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa người dùng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!resetPasswordUser) return;

    if (!newPassword || newPassword.length < 6) {
      toast.warning("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/users/${resetPasswordUser._id}/reset-password`, {
        newPassword,
      });

      toast.success("Đặt lại mật khẩu thành công.");
      closePasswordModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể đặt lại mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
        >
          <Plus size={16} />
          Thêm người dùng
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Tổng người dùng</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quản trị viên</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{summary.adminCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Nông dân</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{summary.farmerCount}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_200px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, email, SĐT hoặc địa chỉ..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <CustomDropdown
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="Tất cả vai trò"
            variant="filter"
            icon={ShieldCheck}
            options={[
              { value: "", label: "Tất cả vai trò" },
              ...roleOptions.map((opt) => ({
                value: opt.value,
                label: opt.label,
              })),
            ]}
          />
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <LoadingScreen message="Đang tải danh sách người dùng..." />
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center text-gray-500">
            Không có người dùng nào phù hợp.
          </div>
        ) : (
          <UserTable
            users={filteredUsers}
            currentUser={currentUser}
            submitting={submitting}
            onEdit={handleOpenEdit}
            onResetPassword={(user) => {
              setResetPasswordUser(user);
              setShowPasswordModal(true);
            }}
            onDelete={handleDeleteUser}
          />
        )}
      </div>

      <UserFormModal
        open={showModal}
        editingUser={editingUser}
        formData={formData}
        submitting={submitting}
        roleOptions={roleOptions}
        onChange={handleFormChange}
        onRoleChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
        onClose={closeUserModal}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
      />

      <ResetPasswordModal
        open={showPasswordModal}
        resetPasswordUser={resetPasswordUser}
        newPassword={newPassword}
        showPassword={showPassword}
        submitting={submitting}
        onChange={(event) => setNewPassword(event.target.value)}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        onClose={closePasswordModal}
        onSubmit={handleResetPassword}
      />
    </div>
  );
};

export default AdminUsers;
