import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { FeedbackContext } from "../../context/FeedbackContext";

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
    cardClassName: "border-emerald-200 bg-white",
    accentClassName: "bg-emerald-500",
  },
  error: {
    icon: AlertTriangle,
    iconClassName: "text-red-600",
    cardClassName: "border-red-200 bg-white",
    accentClassName: "bg-red-500",
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: "text-amber-600",
    cardClassName: "border-amber-200 bg-white",
    accentClassName: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClassName: "text-sky-600",
    cardClassName: "border-sky-200 bg-white",
    accentClassName: "bg-sky-500",
  },
};

const DEFAULT_CONFIRM = {
  title: "Xác nhận thao tác",
  message: "",
  confirmText: "Xác nhận",
  cancelText: "Hủy",
  tone: "danger",
};

const CONFIRM_STYLES = {
  danger: "bg-red-600 text-white hover:bg-red-700",
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  neutral: "bg-gray-800 text-white hover:bg-gray-900",
};

const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const timeoutMapRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timeoutId = timeoutMapRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", title = "", message = "", duration = 5000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextToast = { id, type, title, message };

      setToasts((prev) => [...prev, nextToast]);

      const timeoutId = window.setTimeout(() => {
        removeToast(id);
      }, duration);

      timeoutMapRef.current.set(id, timeoutId);
      return id;
    },
    [removeToast],
  );

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        ...DEFAULT_CONFIRM,
        ...options,
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback(
    (result) => {
      if (!confirmState) return;
      confirmState.resolve(result);
      setConfirmState(null);
    },
    [confirmState],
  );

  useEffect(() => {
    return () => {
      timeoutMapRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMapRef.current.clear();
    };
  }, []);

  const toast = useMemo(
    () => ({
      show: showToast,
      success: (message, options = {}) =>
        showToast({
          type: "success",
          message,
          title: "Thành công",
          ...options,
        }),
      error: (message, options = {}) =>
        showToast({
          type: "error",
          message,
          title: "Có lỗi xảy ra",
          ...options,
        }),
      warning: (message, options = {}) =>
        showToast({ type: "warning", message, title: "Lưu ý", ...options }),
      info: (message, options = {}) =>
        showToast({ type: "info", message, title: "Thông báo", ...options }),
    }),
    [showToast],
  );

  const contextValue = useMemo(
    () => ({
      toast,
      confirm,
    }),
    [toast, confirm],
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toastItem) => {
          const style = TOAST_STYLES[toastItem.type] || TOAST_STYLES.info;
          const Icon = style.icon;

          return (
            <div
              key={toastItem.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-xl ${style.cardClassName}`}
            >
              <div className={`h-1 ${style.accentClassName}`}></div>
              <div className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 ${style.iconClassName}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  {toastItem.title ? (
                    <p className="text-sm font-bold text-gray-900">
                      {toastItem.title}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm text-gray-600">
                    {toastItem.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toastItem.id)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <TriangleAlert size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {confirmState.title}
                </h3>
                {confirmState.message ? (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {confirmState.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`flex-1 rounded-2xl px-4 py-3 font-semibold transition-all ${
                  CONFIRM_STYLES[confirmState.tone] || CONFIRM_STYLES.primary
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;
