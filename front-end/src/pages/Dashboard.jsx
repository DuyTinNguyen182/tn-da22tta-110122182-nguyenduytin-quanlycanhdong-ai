import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  LayoutGrid,
  MapPin,
  Sprout,
  TrendingUp,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/Dashboard/StatCard";
import api from "../services/api";

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

  return (
    <div className="min-h-[calc(100vh-80px)] space-y-8 bg-gray-50 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Không gian canh tác của bạn</h2>
          <p className="mt-1 text-gray-500">
            Theo dõi các cánh đồng của hợp tác xã và quản lý thửa ruộng bạn đang phụ trách.
          </p>
        </div>

        <button
          onClick={() => navigate("/fields")}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
        >
          Vào quản lý thửa ruộng <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cánh đồng khả dụng"
          value={loading ? "--" : stats.availableFieldCount || 0}
          unit="khu vực"
          icon={LayoutGrid}
          color="blue"
        />
        <StatCard
          title="Thửa ruộng của tôi"
          value={loading ? "--" : stats.plotCount || 0}
          unit="thửa"
          icon={Sprout}
          color="emerald"
        />
        <StatCard
          title="Tổng diện tích"
          value={loading ? "--" : Number(stats.totalArea || 0).toLocaleString()}
          unit="m2"
          icon={MapPin}
          color="orange"
        />
        <StatCard
          title="Vụ đang hoạt động"
          value={loading ? "--" : stats.activeSeasonCount || 0}
          unit="vụ"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Cánh đồng hợp tác xã</h3>
              <p className="text-sm text-gray-500">
                Các khu vực do admin cấu hình để bạn gắn thửa ruộng và ghi nhật ký mùa vụ.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {topFields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 md:col-span-2">
                Chưa có cánh đồng nào được tạo. Hãy nhờ admin hợp tác xã cấu hình trước.
              </div>
            ) : (
              topFields.map((field) => (
                <article
                  key={field._id}
                  className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-800">{field.name}</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {field.address || "Admin chưa cập nhật địa bàn"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <MapPin size={18} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                      {field.plotCount || 0} thửa
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                      {Number(field.totalArea || 0).toLocaleString()} m2
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                      {field.activeSeasonCount || 0} vụ active
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg shadow-emerald-200">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <Waves size={22} />
            </div>
            <h3 className="text-lg font-bold">Luồng làm việc mới</h3>
            <p className="mt-2 text-sm text-emerald-50">
              Admin quản lý cánh đồng chung của hợp tác xã, còn bạn chỉ cần thêm thửa ruộng của
              mình và ghi nhật ký theo từng vụ.
            </p>
            <button
              onClick={() => navigate("/crops")}
              className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Mở nhật ký mùa vụ
            </button>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800">Việc cần làm</h3>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                1. Chọn cánh đồng do hợp tác xã đã tạo trong trang quản lý thửa ruộng.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                2. Tạo thửa ruộng của bạn, thêm diện tích và địa chỉ chi tiết nếu cần.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                3. Bắt đầu vụ mới và ghi nhật ký theo từng thửa để AI hỗ trợ tốt hơn.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
