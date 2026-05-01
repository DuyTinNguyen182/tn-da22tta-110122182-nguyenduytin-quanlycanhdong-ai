import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Eye, EyeOff, User, ArrowLeft, ShieldCheck, Mail, MapPin, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";

const Account = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const { toast } = useFeedback();

  const [activeTab, setActiveTab] = useState("info"); // "info" or "password"
  const [isLoading, setIsLoading] = useState(false);

  // State lưu lỗi validation
  const [infoErrors, setInfoErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

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

  // Hàm validate thông tin tài khoản
  const validateInfo = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

    if (!formData.fullName?.trim()) {
      errors.fullName = "Vui lòng nhập họ tên.";
    }

    if (!formData.email?.trim()) {
      errors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!emailRegex.test(formData.email)) {
      errors.email = "Email chưa đúng định dạng.";
    }

    if (!formData.phone?.trim()) {
      errors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(formData.phone)) {
      errors.phone = "Số điện thoại chưa hợp lệ.";
    }

    if (!formData.address?.trim()) {
      errors.address = "Vui lòng nhập địa chỉ.";
    }

    return errors;
  };

  // Hàm validate đổi mật khẩu
  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.currentPassword?.trim()) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    }

    if (!passwordForm.newPassword?.trim()) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 6 ký tự.";
    }

    if (!passwordForm.confirmPassword?.trim()) {
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    return errors;
  };

  // Cập nhật thông tin tài khoản
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const validationErrors = validateInfo();
    if (Object.keys(validationErrors).length > 0) {
      setInfoErrors(validationErrors);
      toast.error("Vui lòng kiểm tra lại thông tin nhập.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put("/auth/profile", formData);
      if (response.data?.user) {
        updateUser(response.data.user);
      }
      toast.success(response.data?.message || "Cập nhật thông tin thành công!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi cập nhật thông tin");
    } finally {
      setIsLoading(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();

    const validationErrors = validatePassword();
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      toast.error("Vui lòng kiểm tra lại thông tin nhập.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success(response.data?.message || "Đổi mật khẩu thành công!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi đổi mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (infoErrors[name]) {
      setInfoErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
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

  // Common Input Class
  const getInputClass = (hasError) => `
    w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white focus:ring-4
    ${hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
      : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/10 hover:border-gray-300"}
  `;

  return (
    <div className="bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"> {/*min-h-screen*/}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white shadow-sm border border-gray-100 hover:bg-gray-50 rounded-xl transition-colors"
            title="Quay lại"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
            <p className="text-sm text-gray-500">Cập nhật thông tin và bảo mật</p>
          </div>
        </div>

        {/* Layout Container */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-2">
            <button
              onClick={() => setActiveTab("info")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all ${activeTab === "info"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
                }`}
            >
              <User size={18} />
              <span>Thông tin cá nhân</span>
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all ${activeTab === "password"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
                }`}
            >
              <ShieldCheck size={18} />
              <span>Đổi mật khẩu</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Tab: Thông Tin Cá Nhân */}
            {activeTab === "info" && (
              <form onSubmit={handleUpdateProfile} className="p-6 md:p-8" noValidate>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Thông tin cơ bản</h2>
                  <p className="text-sm text-gray-500">Cập nhật thông tin hiển thị và liên hệ của bạn.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  {/* Full Name */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Họ và tên</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      className={getInputClass(infoErrors.fullName)}
                      placeholder="Nguyễn Văn A"
                    />
                    {infoErrors.fullName && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{infoErrors.fullName}</p>}
                  </div>

                  {/* Email */}
                  <div className="col-span-1">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      <Mail size={16} className="text-gray-400" /> Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      className={getInputClass(infoErrors.email)}
                      placeholder="email@example.com"
                    />
                    {infoErrors.email && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{infoErrors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div className="col-span-1">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      <Phone size={16} className="text-gray-400" /> Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className={getInputClass(infoErrors.phone)}
                      placeholder="0912345678"
                    />
                    {infoErrors.phone && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{infoErrors.phone}</p>}
                  </div>

                  {/* Address */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      <MapPin size={16} className="text-gray-400" /> Địa chỉ
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      className={getInputClass(infoErrors.address)}
                      placeholder="Nhập địa chỉ của bạn"
                    />
                    {infoErrors.address && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{infoErrors.address}</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isLoading || !hasProfileChanges}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all active:scale-[0.98]"
                  >
                    {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Đổi Mật Khẩu */}
            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} className="p-6 md:p-8" noValidate>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Bảo mật tài khoản</h2>
                  <p className="text-sm text-gray-500">Đảm bảo tài khoản của bạn đang sử dụng mật khẩu mạnh.</p>
                </div>

                <div className="space-y-5 mb-6 max-w-md">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className={getInputClass(passwordErrors.currentPassword)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{passwordErrors.currentPassword}</p>}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className={getInputClass(passwordErrors.newPassword)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{passwordErrors.newPassword}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className={getInputClass(passwordErrors.confirmPassword)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{passwordErrors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isLoading || !hasPasswordChanges}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all active:scale-[0.98]"
                  >
                    {isLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;