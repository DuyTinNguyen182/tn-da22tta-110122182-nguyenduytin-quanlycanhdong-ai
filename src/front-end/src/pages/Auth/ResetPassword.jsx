import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu mới.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });
      setMessage(response.data?.message || "Đặt lại mật khẩu thành công.");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => navigate("/login"), 1600);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef8f2_0%,#f8fafc_100%)] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-emerald-50 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="px-6 pt-10 text-center sm:px-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            {message ? <CheckCircle2 size={34} /> : <LockKeyhole size={34} />}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Đặt lại mật khẩu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Tạo mật khẩu mới để tiếp tục sử dụng AgriSmart.
          </p>
        </div>

        <div className="px-6 pb-10 pt-6 sm:px-8">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mật khẩu mới
              </label>
              <input
                type="password"
                autoComplete="new-password"
                className="hide-password-reveal w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                autoComplete="new-password"
                className="hide-password-reveal w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(message)}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Cập nhật mật khẩu"
              )}
            </button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
