import React, { useEffect, useState } from "react";
import {
  BellRing,
  CalendarClock,
  ChevronDown,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Chưa cập nhật";

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "notification", label: "Thông báo" },
  { value: "warning", label: "Cảnh báo" },
];

const TYPE_STYLES = {
  notification: {
    label: "Thông báo",
    icon: BellRing,
    cardClassName: "border-sky-100 bg-sky-50/60",
    badgeClassName: "bg-sky-100 text-sky-700",
    iconClassName: "bg-sky-100 text-sky-700",
  },
  warning: {
    label: "Cảnh báo",
    icon: TriangleAlert,
    cardClassName: "border-amber-100 bg-amber-50/60",
    badgeClassName: "bg-amber-100 text-amber-700",
    iconClassName: "bg-amber-100 text-amber-700",
  },
};

const Announcements = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
  });

  const fetchAnnouncements = async ({ page = 1, append = false, type = filterType } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await api.get("/announcements", {
        params: {
          page,
          limit: 5,
          ...(type !== "all" ? { type } : {}),
        },
      });

      const nextItems = res.data?.items || [];
      const nextPagination = res.data?.pagination || {
        page,
        limit: 5,
        totalItems: nextItems.length,
        totalPages: 1,
        hasNextPage: false,
      };

      setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setPagination(nextPagination);
    } catch (error) {
      console.error("Lỗi tải thông báo/cảnh báo:", error);
      if (!append) {
        setItems([]);
        setPagination({
          page: 1,
          limit: 5,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements({ page: 1, append: false, type: filterType });
  }, [filterType]);

  const handleLoadMore = () => {
    if (!pagination.hasNextPage || loadingMore) {
      return;
    }

    fetchAnnouncements({
      page: pagination.page + 1,
      append: true,
      type: filterType,
    });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-4 lg:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Thông báo và cảnh báo</h2>              
            </div>

            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterType(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                    filterType === option.value
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingScreen message="Đang tải thông báo/cảnh báo..." />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="rounded-2xl bg-gray-100 p-4 text-gray-400">
              <ShieldAlert size={28} />
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-700">
              Chưa có thông báo nào đang hiển thị
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Admin sẽ cập nhật thêm khi có thông tin mới cho nông dân.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => {
                const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.notification;
                const Icon = typeStyle.icon;

                return (
                  <article
                    key={item._id}
                    className={`rounded-3xl border p-5 shadow-sm ${typeStyle.cardClassName}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-2xl p-3 ${typeStyle.iconClassName}`}>
                          <Icon size={20} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${typeStyle.badgeClassName}`}
                            >
                              {typeStyle.label}
                            </span>
                            <span className="text-xs font-medium text-gray-400">
                              {formatDateTime(item.createdAt)}
                            </span>
                          </div>

                          <h3 className="mt-2 text-xl font-bold text-gray-900">{item.title}</h3>
                        </div>
                      </div>

                      {/* <div className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm font-medium text-gray-600">
                        <CalendarClock size={16} className="text-emerald-600" />
                        Mới nhất trước
                      </div> */}
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/80 p-4">
                      <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
                        {item.content}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Đã hiển thị {items.length}/{pagination.totalItems} mục.
              </p>

              {pagination.hasNextPage ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <ChevronDown size={16} />
                  {loadingMore ? "Đang tải thêm..." : "Xem thêm"}
                </button>
              ) : (
                <p className="text-sm font-medium text-emerald-700">
                  Đã tải hết danh sách theo bộ lọc hiện tại.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Announcements;
