import React, { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bug,
  CalendarRange,
  Layers,
  Map,
  PieChart as PieChartIcon,
  RefreshCw,
  Sprout,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import { useFeedback } from "../../../hooks/useFeedback";
import api from "../../../services/api";

const EMPTY_DASHBOARD = {
  seasonDetailId: "",
  currentSeasonName: "",
  kpis: {
    totalFarmers: 0,
    totalArea: 0,
    totalCost: 0,
    totalActivePlots: 0,
  },
  charts: {
    costByCategory: [],
    costByStage: [],
  },
  liveFeeds: {
    recentFarmingLogs: [],
    recentDiseaseLogs: [],
  },
};

const PIE_COLORS = ["#047857", "#0f766e", "#2563eb", "#ea580c", "#dc2626", "#7c3aed"];

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const buildSeasonOptionLabel = (item) => {
  const seasonName = item?.seasonName || item?.season?.name || item?.name || "Mùa vụ";
  const year = item?.year || (item?.startDate ? new Date(item.startDate).getFullYear() : "");
  return year ? `${seasonName} ${year}` : seasonName;
};

const KpiCard = ({ title, value, icon, accentClass, iconClass }) => {
  const IconComponent = icon;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accentClass}`}>
          <IconComponent className={`h-6 w-6 ${iconClass}`} />
        </div>
      </div>
    </div>
  );
};

const FeedItem = ({ title, subtitle, meta, icon, iconClass }) => {
  const IconComponent = icon;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
      <div className="mt-0.5 rounded-xl bg-white p-2 shadow-sm">
        <IconComponent className={`h-4 w-4 ${iconClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        <p className="mt-1 text-xs text-gray-500">{meta}</p>
      </div>
    </div>
  );
};

const EmptyBlock = ({ text }) => (
  <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
    {text}
  </div>
);

const AdminDashboard = () => {
  const { toast } = useFeedback();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [seasonDetails, setSeasonDetails] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstDashboardLoad = useRef(true);
  const skipNextDashboardFetch = useRef(false);

  useEffect(() => {
    const fetchSeasonDetails = async () => {
      try {
        const res = await api.get("/season-details/admin/all");
        setSeasonDetails(res.data || []);
      } catch (error) {
        console.error("Lỗi tải danh sách mùa vụ:", error);
        toast.error(error.response?.data?.message || "Không thể tải danh sách mùa vụ");
      }
    };

    fetchSeasonDetails();
  }, [toast]);

  useEffect(() => {
    if (skipNextDashboardFetch.current) {
      skipNextDashboardFetch.current = false;
      return;
    }

    const fetchDashboard = async () => {
      try {
        if (isFirstDashboardLoad.current) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const res = await api.get("/admin/dashboard", {
          params: selectedSeasonId ? { seasonId: selectedSeasonId } : {},
        });

        const nextDashboard = res.data || EMPTY_DASHBOARD;
        setDashboard(nextDashboard);

        if (!selectedSeasonId && nextDashboard?.seasonDetailId) {
          skipNextDashboardFetch.current = true;
          setSelectedSeasonId(nextDashboard.seasonDetailId);
        }
      } catch (error) {
        console.error("Lỗi tải dashboard admin:", error);
        toast.error(error.response?.data?.message || "Không thể tải dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFirstDashboardLoad.current = false;
      }
    };

    fetchDashboard();
  }, [selectedSeasonId, toast]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/admin/dashboard", {
        params: selectedSeasonId ? { seasonId: selectedSeasonId } : {},
      });
      setDashboard(res.data || EMPTY_DASHBOARD);
    } catch (error) {
      console.error("Lỗi làm mới dashboard admin:", error);
      toast.error(error.response?.data?.message || "Không thể làm mới dữ liệu");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={true} message="Đang tải tổng quan hợp tác xã..." />;
  }

  const { kpis, charts, liveFeeds } = dashboard;

  return (
    <div className="h-full overflow-y-auto bg-gray-100 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
                Bảng điều khiển quản trị
              </p>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                Tổng quan Hợp tác xã
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <CalendarRange className="h-4 w-4" />
                <span>{dashboard.currentSeasonName || "Chưa xác định mùa vụ"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-[260px]">
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Bộ lọc mùa vụ
                </label>
                <select
                  value={selectedSeasonId}
                  onChange={(event) => setSelectedSeasonId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Mùa vụ đang hoạt động</option>
                  {seasonDetails.map((item) => (
                    <option key={item._id} value={item._id}>
                      {buildSeasonOptionLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Tổng số nông dân"
            value={formatNumber(kpis.totalFarmers)}
            icon={Users}
            accentClass="bg-emerald-50"
            iconClass="text-emerald-700"
          />
          <KpiCard
            title="Tổng diện tích canh tác"
            value={`${formatNumber(kpis.totalArea)} m2`}
            icon={Map}
            accentClass="bg-sky-50"
            iconClass="text-sky-700"
          />
          <KpiCard
            title="Tổng vốn đầu tư"
            value={formatCurrency(kpis.totalCost)}
            icon={Wallet}
            accentClass="bg-amber-50"
            iconClass="text-amber-700"
          />
          <KpiCard
            title="Tổng số thửa canh tác"
            value={formatNumber(kpis.totalActivePlots)}
            icon={Layers}
            accentClass="bg-fuchsia-50"
            iconClass="text-fuchsia-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-3">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <BarChart3 className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Chi phí theo danh mục vật tư
                </h2>
                <p className="text-sm text-gray-500">
                  Tổng hợp chi phí theo từng nhóm vật tư và đầu vào
                </p>
              </div>
            </div>

            {charts.costByCategory.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu chi phí theo danh mục vật tư." />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.costByCategory}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="categoryName" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Chi phí"]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="totalCost"
                      name="Chi phí"
                      radius={[12, 12, 0, 0]}
                      fill="#059669"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3">
                <PieChartIcon className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Cơ cấu chi phí theo giai đoạn
                </h2>
                <p className="text-sm text-gray-500">
                  Tỷ trọng chi phí giữa các giai đoạn canh tác
                </p>
              </div>
            </div>

            {charts.costByStage.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu cơ cấu chi phí theo giai đoạn." />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.costByStage}
                      dataKey="totalCost"
                      nameKey="stageName"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {charts.costByStage.map((entry, index) => (
                        <Cell
                          key={`${entry.stageName}-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Chi phí"]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <Sprout className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Hoạt động canh tác mới nhất
                </h2>
                <p className="text-sm text-gray-500">
                  5 nhật ký canh tác mới được ghi nhận gần đây
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {liveFeeds.recentFarmingLogs.length === 0 ? (
                <EmptyBlock text="Chưa có hoạt động canh tác nào trong mùa vụ này." />
              ) : (
                liveFeeds.recentFarmingLogs.map((item) => (
                  <FeedItem
                    key={item._id}
                    icon={Sprout}
                    iconClass="text-emerald-700"
                    title={item.task?.name || "Công việc chưa xác định"}
                    subtitle={`Người ghi nhận: ${item.user?.fullName || "Không xác định"} • Chi phí: ${formatCurrency(item.cost)}`}
                    meta={`Thời gian tạo: ${formatDateTime(item.createdAt)}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3">
                <Bug className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Cảnh báo dịch bệnh chờ xử lý
                </h2>
                <p className="text-sm text-gray-500">
                  5 cảnh báo dịch bệnh gần nhất cần được theo dõi
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {liveFeeds.recentDiseaseLogs.length === 0 ? (
                <EmptyBlock text="Không có cảnh báo dịch bệnh chờ xử lý." />
              ) : (
                liveFeeds.recentDiseaseLogs.map((item) => (
                  <FeedItem
                    key={item._id}
                    icon={Bug}
                    iconClass="text-red-600"
                    title={item.diseaseName || "Bệnh chưa xác định"}
                    subtitle={`Người phát hiện: ${item.user?.fullName || "Không xác định"}`}
                    meta={`Phát hiện lúc: ${formatDateTime(item.detectedAt)}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
