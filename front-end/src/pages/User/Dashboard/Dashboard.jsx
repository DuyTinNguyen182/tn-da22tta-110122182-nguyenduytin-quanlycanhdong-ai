import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  LayoutGrid,
  MapPin,
  Sprout,
  TrendingUp,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "./StatCard";
import ClockWeatherWidget from "./ClockWeatherWidget";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [summaryRes, fieldRes] = await Promise.all([
          api.get("/fields/summary"),
          api.get("/fields"),
        ]);

        setSummary(summaryRes.data);
        setFields(fieldRes.data || []);
      } catch (error) {
        console.error("Lỗi tải tổng quan nông dân", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = summary?.stats || {};
  const topFields = useMemo(() => fields.slice(0, 4), [fields]);

  if (loading) {
    return <LoadingScreen fullScreen={true} message="Đang tải dữ liệu tổng quan..." />;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] space-y-5 bg-gray-50 p-6">
      {/* Header — compact */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Không gian canh tác</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Theo dõi cánh đồng HTX và quản lý thửa ruộng của bạn.
          </p>
        </div>
        <button
          onClick={() => navigate("/fields")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
        >
          Quản lý thửa <ArrowRight size={15} />
        </button>
      </div>

      {/* Clock + Weather */}
      <ClockWeatherWidget />

      {/* Stats row — horizontal compact cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="Cánh đồng khả dụng"
          value={stats.availableFieldCount || 0}
          unit="khu vực"
          icon={LayoutGrid}
          color="blue"
        />
        <StatCard
          title="Thửa ruộng của tôi"
          value={stats.plotCount || 0}
          unit="thửa"
          icon={Sprout}
          color="emerald"
        />
        <StatCard
          title="Tổng diện tích"
          value={Number(stats.totalArea || 0).toLocaleString()}
          unit="m²"
          icon={MapPin}
          color="amber"
        />
        <StatCard
          title="Vụ đang hoạt động"
          value={stats.activeSeasonCount || 0}
          unit="vụ"
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* Field list — compact */}
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-1.5">
              <Layers size={14} className="text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Cánh đồng hợp tác xã</h3>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
            {fields.length} khu vực
          </span>
        </div>

        {topFields.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-gray-400">
            <div className="mb-3 rounded-2xl bg-gray-100 p-4">
              <LayoutGrid size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Chưa có cánh đồng nào.</p>
            <p className="mt-1 text-xs text-gray-400">Nhờ admin HTX cấu hình trước.</p>
          </div>
        ) : (
          <div className="grid gap-0 divide-y divide-gray-50 md:grid-cols-2 md:divide-y-0 xl:grid-cols-4">
            {topFields.map((field, index) => (
              <article
                key={field._id}
                className={`flex flex-col p-4 transition-colors hover:bg-emerald-50/30 ${
                  index > 0 ? "md:border-l md:border-gray-100" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-gray-800">{field.name}</h4>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-400">
                      <MapPin size={10} className="shrink-0" />
                      {field.address || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-100">
                    <Sprout size={14} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600">
                    {field.plotCount || 0} thửa
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600">
                    {Number(field.totalArea || 0).toLocaleString()} m²
                  </span>
                  {(field.activeSeasonCount || 0) > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-600 ring-1 ring-emerald-100">
                      {field.activeSeasonCount} vụ
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
