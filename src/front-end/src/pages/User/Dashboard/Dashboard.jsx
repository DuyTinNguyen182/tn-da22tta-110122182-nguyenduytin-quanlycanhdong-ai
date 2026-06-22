import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bug,
  CalendarDays,
  ChevronRight,
  Info,
  Layers,
  Map,
  MapPin,
  PieChart as PieChartIcon,
  RefreshCw,
  Sprout,
  Wallet,
  ShieldAlert,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import { useFeedback } from "../../../hooks/useFeedback";
import api from "../../../services/api";

import AssistantCard from "./components/AssistantCard";

const EMPTY_DASHBOARD = {
  seasonDetailId: "",
  currentSeasonName: "",
  kpis: {
    totalArea: 0,
    totalCost: 0,
    totalActivePlots: 0,
    costPer1000m2: 0,
    comparison: { text: "", type: "neutral" },
  },
  charts: {
    costByCategory: [],
    costByStage: [],
    cropProgress: [],
  },
  alerts: {
    unprocessedDiseases: [],
  },
  liveFeeds: {
    recentFarmingLogs: [],
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

const KpiCard = ({
  title,
  value,
  icon,
  accentClass,
  iconClass,
  subtext,
  subtextClass,
}) => {
  const IconComponent = icon;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-base font-bold text-gray-900">{value}</p>
          {subtext && (
            <p
              className={`mt-1 text-[10px] font-medium leading-tight ${subtextClass}`}
            >
              {subtext}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${accentClass}`}>
          <IconComponent className={`h-4 w-4 ${iconClass}`} />
        </div>
      </div>
    </div>
  );
};

const FeedItem = ({
  title,
  subtitle,
  meta,
  icon,
  iconClass,
  bgClass = "bg-gray-50",
  borderClass = "border-gray-100",
}) => {
  const IconComponent = icon;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 ${bgClass} ${borderClass}`}
    >
      <div className="mt-0.5 rounded-lg bg-white p-1 shadow-sm border border-gray-50">
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

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return (
    date.toLocaleDateString("vi-VN") +
    " " +
    date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
};

const getDiseaseStatusMeta = (status) => {
  if (status === "processed") {
    return {
      label: "Đã xử lý",
      dotClass: "bg-emerald-500",
      badgeClass: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "Chưa xử lý",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-800",
  };
};

const getDiseasePlotSummary = (log) => {
  const plotNames = Array.isArray(log?.plots)
    ? log.plots.map((plot) => plot?.name).filter(Boolean)
    : [];

  if (plotNames.length === 0) {
    return log?.scope === "all_plots" ? "Toàn bộ thửa tham gia vụ" : "--";
  }

  return plotNames.join(", ");
};

const DiseaseLogItem = ({ log, inModal = false, isPopup = false }) => {
  const isUnprocessed = log.status !== "processed";
  const statusMeta = getDiseaseStatusMeta(log.status);

  if (isPopup) {
    return (
      <div
        className={`rounded-xl border p-3 shadow-sm ${isUnprocessed ? "border-amber-300 bg-white" : "border-gray-100 bg-white"}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`flex h-2 w-2 shrink-0 rounded-full ${statusMeta.dotClass} ${isUnprocessed ? "animate-pulse" : ""}`}
          ></span>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-800">
              {log.diseaseName || "Bệnh chưa xác định"}
            </p>
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-1.5">
          Thửa ảnh hưởng:{" "}
          <span className="font-semibold text-emerald-700">
            {getDiseasePlotSummary(log)}
          </span>
        </p>
        <p className="text-xs text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">
          Ngày ghi nhận: {formatDateTime(log.detectedAt || log.createdAt)}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border backdrop-blur-sm transition-all ${
        isUnprocessed
          ? "border-amber-300 bg-white shadow-md relative overflow-hidden"
          : "border-gray-200 bg-white/60 shadow-sm"
      } ${inModal ? "p-2" : "p-2"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`flex shrink-0 rounded-full ${statusMeta.dotClass} ${
              isUnprocessed ? "animate-pulse" : ""
            } ${inModal ? "h-2 w-2" : "h-1.5 w-1.5"}`}
          ></span>
          <p
            className={`truncate font-bold text-gray-800 ${
              inModal ? "text-sm" : "text-xs"
            }`}
          >
            {log.diseaseName || "Bệnh chưa xác định"}
          </p>
          <span
            className={`shrink-0 rounded-full font-bold ${statusMeta.badgeClass} ${
              inModal ? "px-2 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[9px]"
            }`}
          >
            {statusMeta.label}
          </span>
        </div>

        <p
          className={`text-gray-600 truncate ${
            inModal ? "text-xs mt-1.5" : "text-[10px]"
          }`}
        >
          <span className="text-gray-500">Thửa ảnh hưởng:</span>{" "}
          <span className="font-medium text-amber-700">
            {getDiseasePlotSummary(log)}
          </span>
          {" - "}
          Ngày ghi nhận: {formatDateTime(log.detectedAt || log.createdAt)}
        </p>
      </div>
    </div>
  );
};

const FarmerDashboard = () => {
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [seasonDetails, setSeasonDetails] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [diseaseLogs, setDiseaseLogs] = useState([]);
  const [diseaseLoading, setDiseaseLoading] = useState(true);
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const isFirstDashboardLoad = useRef(true);
  const skipNextDashboardFetch = useRef(false);

  useEffect(() => {
    const fetchSeasonDetails = async () => {
      try {
        const res = await api.get("/season-details/all");
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

        const res = await api.get("/farmer-dashboard", {
          params: selectedSeasonId ? { seasonId: selectedSeasonId } : {},
        });

        const nextDashboard = res.data || EMPTY_DASHBOARD;
        setDashboard(nextDashboard);

        if (!selectedSeasonId && nextDashboard?.seasonDetailId) {
          setSelectedSeasonId((prevId) => {
            if (prevId !== nextDashboard.seasonDetailId) {
              skipNextDashboardFetch.current = true;
              return nextDashboard.seasonDetailId;
            }
            return prevId;
          });
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

  const fetchDiseaseLogs = useCallback(
    async ({ showLoading = true } = {}) => {
      try {
        if (showLoading) setDiseaseLoading(true);
        const res = await api.get("/disease-logs", {
          params: {
            ...(selectedSeasonId ? { seasonId: selectedSeasonId } : {}),
            limit: 10,
          },
        });

        const logs = Array.isArray(res.data) ? res.data : [];
        setDiseaseLogs(
          logs.sort(
            (left, right) =>
              new Date(right.detectedAt || right.createdAt || 0) -
              new Date(left.detectedAt || left.createdAt || 0),
          ),
        );
      } catch (error) {
        console.error("Lỗi tải nhật ký bệnh gần đây:", error);
        setDiseaseLogs([]);
      } finally {
        if (showLoading) setDiseaseLoading(false);
      }
    },
    [selectedSeasonId],
  );

  useEffect(() => {
    fetchDiseaseLogs();
  }, [fetchDiseaseLogs]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/farmer-dashboard", {
        params: selectedSeasonId ? { seasonId: selectedSeasonId } : {},
      });
      setDashboard(res.data || EMPTY_DASHBOARD);
      await fetchDiseaseLogs({ showLoading: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể làm mới dữ liệu");
    } finally {
      setRefreshing(false);
    }
  };

  const { kpis, charts, alerts, liveFeeds } = dashboard;
  const selectedSeason = seasonDetails.find(
    (item) => item?._id === selectedSeasonId,
  );
  const selectedSeasonStatus =
    selectedSeason?.status || selectedSeason?.seasonStatus || "";
  const isSelectedSeasonEnded = ["completed", "ended"].includes(
    selectedSeasonStatus,
  );
  const unprocessedDiseaseLogs = diseaseLogs.filter(
    (log) => log.status !== "processed",
  );
  const hasUnprocessedDisease = unprocessedDiseaseLogs.length > 0;
  const prioritizedDiseaseLogs = hasUnprocessedDisease
    ? unprocessedDiseaseLogs
    : diseaseLogs;
  const visibleDiseaseLogs = prioritizedDiseaseLogs.slice(0, 2);
  const hasMoreDiseaseLogs = prioritizedDiseaseLogs.length > 2;
  const diseaseFooterText = hasUnprocessedDisease
    ? `${unprocessedDiseaseLogs.length} bệnh cần xử lý`
    : "Bạn vừa phát hiện dịch bệnh?";
  const diseaseActionLabel = hasUnprocessedDisease
    ? "Xử lý ngay"
    : "Ghi chép ngay";
  const diseaseModalTitle = hasUnprocessedDisease
    ? "Bệnh chưa xử lý"
    : "Nhật ký bệnh gần đây";
  const goToDiseaseLogs = () => navigate("/disease-logs");

  if (loading) {
    return (
      <LoadingScreen
        fullScreen={true}
        message="Đang tải tổng quan cánh đồng..."
      />
    );
  }

  let compColor = "text-gray-500";
  if (kpis.comparison.type === "good") compColor = "text-emerald-600";
  if (kpis.comparison.type === "bad") compColor = "text-red-600";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-100 px-2 py-2 sm:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="Số thửa đang canh tác"
            value={formatNumber(kpis.totalActivePlots)}
            icon={Layers}
            accentClass="bg-fuchsia-50"
            iconClass="text-fuchsia-700"
          />
          <KpiCard
            title="Tổng diện tích"
            value={`${formatNumber(kpis.totalArea)} m2`}
            icon={Map}
            accentClass="bg-sky-50"
            iconClass="text-sky-700"
          />
          <KpiCard
            title="Tổng chi phí"
            value={formatCurrency(kpis.totalCost)}
            icon={Wallet}
            accentClass="bg-amber-50"
            iconClass="text-amber-700"
          />
          <KpiCard
            title="Chi phí / 1000m²"
            value={formatCurrency(kpis.costPer1000m2)}
            icon={BarChart3}
            accentClass="bg-emerald-50"
            iconClass="text-emerald-700"
            subtext={kpis.comparison.text}
            subtextClass={compColor}
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
                <Wallet className="h-4 w-4 text-emerald-700" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                Chi phí theo vật tư
              </h2>
            </div>

            {charts.costByCategory.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu chi phí." />
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
                Chi phí theo giai đoạn
              </h2>
            </div>

            {charts.costByStage.length === 0 ? (
              <EmptyBlock text="Chưa có dữ liệu cơ cấu." />
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
                          key={`cell-${index}`}
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

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          <div
            className={`flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl border p-3 shadow-sm transition-colors duration-300 ${
              hasUnprocessedDisease
                ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50"
                : "border-gray-200 bg-gradient-to-br from-white to-gray-50/80"
            }`}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <div className="rounded-xl border p-1.5 shadow-sm transition-colors border-amber-200 bg-white text-amber-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h2
                  className={`text-sm font-bold leading-tight transition-colors ${
                    hasUnprocessedDisease ? "text-amber-900" : "text-gray-800"
                  }`}
                >
                  Nhật ký bệnh gần đây
                </h2>
              </div>
            </div>

            {isSelectedSeasonEnded ? (
              <p className="text-xs text-amber-700 ml-9 leading-relaxed flex-1">
                Mùa vụ này đã kết thúc.
              </p>
            ) : (
              <>
                {diseaseLoading ? (
                  <div className="flex-1 space-y-2">
                    <div className="h-10 animate-pulse rounded-xl bg-white/70"></div>
                    <div className="h-10 animate-pulse rounded-xl bg-white/60"></div>
                  </div>
                ) : prioritizedDiseaseLogs.length === 0 ? (
                  <div className="flex min-h-[80px] flex-1 items-center justify-center rounded-xl border border-dashed border-amber-200 bg-white/60 px-3 text-center text-xs font-medium text-amber-700">
                    Chưa có nhật ký bệnh nào trong mùa vụ này.
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-1.5">
                    {visibleDiseaseLogs.map((log) => (
                      <DiseaseLogItem key={log._id} log={log} inModal={true} />
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-amber-200/70 pt-2.5">
                  <div className="min-w-0">
                    {hasMoreDiseaseLogs ? (
                      <button
                        type="button"
                        onClick={() => setIsDiseaseModalOpen(true)}
                        className="text-[11px] font-bold text-amber-700 transition hover:text-amber-800 hover:underline"
                      >
                        Xem thêm ({prioritizedDiseaseLogs.length})
                      </button>
                    ) : (
                      <p className="truncate text-[11px] font-semibold text-amber-700">
                        {diseaseFooterText}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={goToDiseaseLogs}
                    className="flex shrink-0 items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
                  >
                    {diseaseActionLabel} <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          <AssistantCard selectedSeasonId={selectedSeasonId} />
        </div>
      </div>

      {isDiseaseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold text-gray-800">
                  {diseaseModalTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDiseaseModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto bg-gray-50/60 p-4">
              {prioritizedDiseaseLogs.map((log) => (
                <DiseaseLogItem key={log._id} log={log} isPopup={true} />
              ))}
            </div>

            <div className="rounded-b-2xl border-t border-gray-100 bg-white p-4">
              <button
                type="button"
                onClick={() => {
                  setIsDiseaseModalOpen(false);
                  goToDiseaseLogs();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
              >
                {diseaseActionLabel} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
