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
  Activity,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
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
  LineChart,
  Line,
} from "recharts";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
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
    trends: {
      areaTrend: null,
      costTrend: null,
    },
  },
  charts: {
    costByCategory: [],
    costByStage: [],
    cropProgress: [],
    cumulativeCosts: [],
    topFarmers: [],
  },
  liveFeeds: {
    recentFarmingLogs: [],
    recentDiseaseLogs: [],
  },
};

const PIE_COLORS = [
  "#047857",
  "#0f766e",
  "#2563eb",
  "#ea580c",
  "#dc2626",
  "#7c3aed",
];

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

const formatDateOnly = (value) => {
  if (!value) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const buildSeasonOptionLabel = (item) => {
  const seasonName =
    item?.seasonName || item?.season?.name || item?.name || "Mùa vụ";
  const year =
    item?.year ||
    (item?.startDate ? new Date(item.startDate).getFullYear() : "");
  return year ? `${seasonName} ${year}` : seasonName;
};

const KpiCard = ({ title, value, icon, accentClass, iconClass, trend }) => {
  const IconComponent = icon;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-base font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${accentClass}`}>
          <IconComponent className={`h-4 w-4 ${iconClass}`} />
        </div>
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[11px]">
          {trend.isIncrease ? (
            <span
              className={`flex items-center px-1.5 py-0.5 rounded font-medium ${
                trend.isPositive
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              <TrendingUp className="w-3 h-3 mr-0.5" /> +{trend.value}%
            </span>
          ) : (
            <span
              className={`flex items-center px-1.5 py-0.5 rounded font-medium ${
                trend.isPositive
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              <TrendingDown className="w-3 h-3 mr-0.5" /> -{trend.value}%
            </span>
          )}
          <span className="text-gray-400">so với vụ trước</span>
        </div>
      )}
    </div>
  );
};

const FeedItem = ({ title, subtitle, meta, icon, iconClass }) => {
  const IconComponent = icon;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
      <div className="mt-0.5 rounded-lg bg-white p-1 shadow-sm">
        <IconComponent className={`h-3 w-3 ${iconClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 truncate text-xs text-gray-600">{subtitle}</p>
        <p className="mt-0.5 text-xs text-gray-500">{meta}</p>
      </div>
    </div>
  );
};

const EmptyBlock = ({ text }) => (
  <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2 text-center text-xs text-gray-500">
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
        toast.error(
          error.response?.data?.message || "Không thể tải danh sách mùa vụ",
        );
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
        if (isFirstDashboardLoad.current) setLoading(true);
        else setRefreshing(true);

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
      toast.error(error.response?.data?.message || "Không thể làm mới dữ liệu");
    } finally {
      setRefreshing(false);
    }
  };

  const { kpis, charts, liveFeeds } = dashboard;

  if (loading) {
    return (
      <LoadingScreen
        fullScreen={true}
        message="Đang tải tổng quan hợp tác xã..."
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-100 px-2 py-2 sm:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="Tổng số nông dân"
            value={formatNumber(kpis.totalFarmers)}
            icon={Users}
            accentClass="bg-emerald-50"
            iconClass="text-emerald-700"
          />
          <KpiCard
            title="Tổng số thửa canh tác"
            value={formatNumber(kpis.totalActivePlots)}
            icon={Layers}
            accentClass="bg-fuchsia-50"
            iconClass="text-fuchsia-700"
          />
          <KpiCard
            title="Tổng diện tích canh tác"
            value={`${formatNumber(kpis.totalArea)} m²`}
            icon={Map}
            accentClass="bg-sky-50"
            iconClass="text-sky-700"
            trend={kpis.trends?.areaTrend}
          />
          <KpiCard
            title="Tổng vốn đầu tư"
            value={formatCurrency(kpis.totalCost)}
            icon={Wallet}
            accentClass="bg-amber-50"
            iconClass="text-amber-700"
            trend={kpis.trends?.costTrend}
          />

          <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
            <div className="flex h-full items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">
                  Bộ lọc mùa vụ
                </label>
                <div className="mt-1">
                  <CustomDropdown
                    value={selectedSeasonId}
                    onChange={setSelectedSeasonId}
                    placeholder="Mùa vụ hiện tại"
                    variant="filter"
                    size="small"
                    icon={Sprout}
                    options={[
                      { value: "", label: "Mùa vụ hiện tại" },
                      ...seasonDetails.map((item) => ({
                        value: item._id,
                        label: buildSeasonOptionLabel(item),
                      })),
                    ]}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex h-[34px] items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2">
                <BarChart3 className="h-4 w-4 text-emerald-700" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                Chi phí theo danh mục vật tư
              </h2>
            </div>

            {charts.costByCategory.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu chi phí theo danh mục vật tư." />
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.costByCategory}
                    margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
                    />
                    <XAxis
                      dataKey="categoryName"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Chi phí"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "10px",
                      }}
                    />
                    <Bar
                      dataKey="totalCost"
                      fill="#059669"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-indigo-50 p-2">
                <PieChartIcon className="h-4 w-4 text-indigo-700" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                Cơ cấu chi phí theo giai đoạn
              </h2>
            </div>

            {charts.costByStage.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu cơ cấu chi phí theo giai đoạn." />
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.costByStage}
                      dataKey="totalCost"
                      nameKey="stageName"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {charts.costByStage.map((entry, index) => (
                        <Cell
                          key={`${entry.stageName}-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "10px",
                      }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-5">
          {/* Biến động chi phí lũy kế theo thời gian (Line Chart) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-2">
                <Activity className="h-4 w-4 text-blue-700" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                Chi phí đầu tư lũy kế theo thời gian
              </h2>
            </div>

            {!charts.cumulativeCosts || charts.cumulativeCosts.length === 0 ? (
              <EmptyBlock text="Chưa ghi nhận dữ liệu biến động chi phí phát sinh." />
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={charts.cumulativeCosts}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f3f4f6"
                    />
                    <XAxis
                      dataKey="_id"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(value),
                        "Chi phí lũy kế",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "10px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeCost"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top 5 Nông dân chi phí/1000m2 cao nhất */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-orange-50 p-2">
                <Layers className="h-4 w-4 text-orange-700" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                Top nông dân có chi phí/1000m² cao nhất
              </h2>
            </div>

            {!charts.topFarmers || charts.topFarmers.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu đầu tư của nông dân nào." />
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] pr-1">
                {charts.topFarmers.map((farmer, idx) => {
                  const maxCost = charts.topFarmers[0]?.costPer1000m2 || 1;
                  const widthPercent = (farmer.costPer1000m2 / maxCost) * 100;

                  return (
                    <div
                      key={idx}
                      className="relative flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100 z-10 overflow-hidden"
                    >
                      <div
                        className="absolute top-0 left-0 h-full bg-orange-100/40 -z-10 transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      ></div>

                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-800">
                          {farmer.farmerName}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Thửa: {farmer.plotName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-900 text-right flex flex-col">
                        {formatCurrency(farmer.costPer1000m2)}
                        <span className="text-[9px] font-normal text-gray-500">
                          / 1000m²
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm overflow-hidden flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-sky-50 p-1.5">
                <Activity className="h-4 w-4 text-sky-600" />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">
                Tiến độ canh tác diện tích
              </h2>
            </div>

            {charts.cropProgress.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu tiến độ." />
            ) : (
              <div className="w-full flex-1 min-h-[150px] overflow-hidden">
                {/* Tính toán chiều cao linh hoạt tránh bị rỗng khoảng không */}
                <div
                  style={{
                    height: Math.max(100, charts.cropProgress.length * 40 + 40),
                    minHeight: "100%",
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.cropProgress}
                      layout="vertical"
                      margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "#6b7280", fontSize: 9 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="stageName"
                        tick={{ fill: "#374151", fontSize: 9 }}
                        width={70}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(value)} m²`,
                          "Diện tích",
                        ]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          fontSize: "11px",
                        }}
                      />
                      <Bar
                        dataKey="totalArea"
                        name="Diện tích"
                        radius={[0, 4, 4, 0]}
                        fill="#0ea5e9"
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-1.5">
                <Sprout className="h-4 w-4 text-emerald-700" />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">
                Hoạt động canh tác gần đây
              </h2>
            </div>

            <div className="flex flex-col gap-1.5">
              {liveFeeds.recentFarmingLogs.length === 0 ? (
                <EmptyBlock text="Chưa có hoạt động canh tác." />
              ) : (
                liveFeeds.recentFarmingLogs
                  .slice(0, 3)
                  .map((item) => (
                    <FeedItem
                      key={item._id}
                      icon={Sprout}
                      iconClass="text-emerald-700"
                      title={item.task?.name || "Công việc chưa xác định"}
                      subtitle={`${item.user?.fullName || "Không xác định"} • ${formatCurrency(item.cost)}`}
                      meta={formatDateOnly(item.createdAt)}
                    />
                  ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-red-50 p-1.5">
                <Bug className="h-4 w-4 text-red-600" />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">
                Nhật kí dịch bệnh gần đây
              </h2>
            </div>

            <div className="flex flex-col gap-1.5">
              {liveFeeds.recentDiseaseLogs.length === 0 ? (
                <EmptyBlock text="Không có nhật kí dịch bệnh." />
              ) : (
                liveFeeds.recentDiseaseLogs
                  .slice(0, 3)
                  .map((item) => (
                    <FeedItem
                      key={item._id}
                      icon={Bug}
                      iconClass="text-red-600"
                      title={item.diseaseName || "Bệnh chưa xác định"}
                      subtitle={`${item.user?.fullName || "Không xác định"}`}
                      meta={formatDateOnly(item.detectedAt)}
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
