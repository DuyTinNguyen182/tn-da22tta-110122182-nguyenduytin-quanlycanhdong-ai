import React, { useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      setError("Vui lòng nhập email.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });
      setMessage(response.data?.message || "Vui lòng kiểm tra email của bạn.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
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
            <MailCheck size={34} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Quên mật khẩu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
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
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="nhanong@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                  if (message) setMessage("");
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Gửi email đặt lại mật khẩu"
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

export default ForgotPassword;
