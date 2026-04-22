import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Eye, EyeOff, User, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const Account = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info"); // "info" or "password"
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Form thông tin tài khoản
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  useEffect(() => {
    setFormData({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
  }, [user]);

  // Form đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Cập nhật thông tin tài khoản
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.put("/auth/profile", formData);
      if (response.data?.user) {
        updateUser(response.data.user);
      }
      setMessage({
        type: "success",
        text: response.data?.message || "Cập nhật thông tin thành công!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Lỗi cập nhật thông tin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu mới không khớp!" });
      setIsLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: "error", text: "Mật khẩu phải ít nhất 6 ký tự!" });
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.put("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setMessage({
        type: "success",
        text: response.data?.message || "Đổi mật khẩu thành công!",
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Lỗi đổi mật khẩu",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const hasProfileChanges =
    (formData.fullName || "") !== (user?.fullName || "") ||
    (formData.email || "") !== (user?.email || "") ||
    (formData.phone || "") !== (user?.phone || "") ||
    (formData.address || "") !== (user?.address || "");

  const hasPasswordChanges =
    passwordForm.currentPassword !== "" ||
    passwordForm.newPassword !== "" ||
    passwordForm.confirmPassword !== "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            title="Quay lại"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Tài Khoản Của Tôi</h1>
            {/* <p className="text-sm text-gray-500">Quản lý thông tin cá nhân và bảo mật</p> */}
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg border-l-4 ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                : "bg-red-50 border-red-500 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === "info"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <User size={18} className="inline mr-2" />
            Thông Tin
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === "password"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Lock size={18} className="inline mr-2" />
            Mật Khẩu
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tab: Thông Tin Tài Khoản */}
          {activeTab === "info" && (
            <form onSubmit={handleUpdateProfile} className="p-8 max-w-lg mx-auto w-full">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Thông Tin Cá Nhân</h2>

              {/* Full Name */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Họ Tên
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  placeholder="Nhập họ tên"
                />
              </div>

              {/* Email */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  placeholder="Nhập email"
                />
              </div>

              {/* Phone */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              {/* Address */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Địa Chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  placeholder="Nhập địa chỉ"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !hasProfileChanges}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {isLoading ? "Đang cập nhật..." : "Lưu Thay Đổi"}
              </button>
            </form>
          )}

          {/* Tab: Đổi Mật Khẩu */}
          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="p-8 max-w-lg mx-auto w-full">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Đổi Mật Khẩu</h2>

              {/* Current Password */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật Khẩu Hiện Tại
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật Khẩu Mới
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Xác Nhận Mật Khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !hasPasswordChanges}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {isLoading ? "Đang thay đổi..." : "Đổi Mật Khẩu"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
