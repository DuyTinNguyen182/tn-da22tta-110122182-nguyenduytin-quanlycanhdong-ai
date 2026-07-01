import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await login(email, password);
    if (result.success) {
      if ((result.user?.role || "").toLowerCase() === "admin") {
        navigate("/admin");
      } else {
        navigate("/ai-scan");
      }
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef8f2_0%,#f8fafc_100%)] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-emerald-50 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="px-6 pt-10 sm:px-8 text-center flex flex-col items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden mb-3">
            <img
              src="/Logo_AgriSmart.png"
              alt="AgriSmart Logo"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            AgriSmart
          </h1>
          <p className="mt-2 text-lg font-medium text-emerald-600">
            Chào mừng trở lại!
          </p>
        </div>

        <div className="px-6 pb-10 pt-6 sm:px-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
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
                }}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
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
                "Đăng nhập ngay"
              )}
            </button>
          </form>

          <div className="mt-7 text-center text-sm text-slate-500 leading-relaxed">
            Chưa có tài khoản?{" "}
            <div className="font-semibold text-emerald-600 mt-1">
              Vui lòng liên hệ Ban quản lý HTX để được cấp.
              <br />
              Hotline:{" "}
              <a href="tel:0123456789" className="hover:underline">
                0794 325 729
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
