import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ScanLine, Sprout } from "lucide-react";
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
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fafc_100%)] px-6 py-7 sm:px-8">
          {/* <div className="flex items-center justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
              <Sprout className="text-white" size={26} />
            </div>
            <div className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              Mobile AI
            </div>
          </div> */}

          <h2 className="mt-5 text-2xl font-bold text-slate-900">Chào mừng trở lại</h2>
          {/* <p className="mt-2 text-sm leading-6 text-slate-500">
            Đăng nhập để chụp lá lúa, quét bệnh và hỏi AI ngay trên điện thoại.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600 ring-1 ring-emerald-100">
            <ScanLine size={16} className="shrink-0 text-emerald-600" />
            <span>Đăng nhập xong sẽ vào thẳng màn hình AI dự đoán.</span>
          </div> */}
        </div>

        <div className="px-6 py-7 sm:px-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="nhanong@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Đăng nhập ngay"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
