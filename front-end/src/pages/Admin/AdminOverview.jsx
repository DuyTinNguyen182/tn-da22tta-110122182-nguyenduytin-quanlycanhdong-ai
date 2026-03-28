import React, { useEffect, useState } from "react";
import { LayoutGrid, MapPin, Sprout, Users } from "lucide-react";
import api from "../../services/api";

const AdminOverview = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get("/fields/summary");
        setSummary(res.data);
      } catch (error) {
        console.error("Lỗi tải dashboard admin", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const stats = summary?.stats || {};
  const recentFields = summary?.recentFields || [];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Tổng quan hợp tác xã</h1>
        <p className="mt-1 text-gray-500">
          Theo dõi số lượng cánh đồng, nông dân và quy mô canh tác trên toàn hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cánh đồng</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {loading ? "--" : stats.fieldCount || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <LayoutGrid size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Thửa ruộng</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {loading ? "--" : stats.plotCount || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Sprout size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Nông dân</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {loading ? "--" : stats.farmerCount || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Diện tích đã khai báo</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {loading ? "--" : Number(stats.totalArea || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-400">m2</p>
            </div>
            <div className="rounded-2xl bg-purple-100 p-3 text-purple-700">
              <MapPin size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Cánh đồng mới cập nhật</h2>
              <p className="text-sm text-gray-500">
                Dùng để kiểm soát khu vực nào đã được cấu hình cho nông dân khai báo dữ liệu.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {recentFields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                Chưa có cánh đồng nào được tạo.
              </div>
            ) : (
              recentFields.map((field) => (
                <div
                  key={field._id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-800">{field.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {field.address || "Chưa cập nhật địa bàn"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                      {field.activeSeasonCount || 0} vụ active
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                      {field.plotCount || 0} thửa
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                      {field.farmerCount || 0} nông dân
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                      {Number(field.totalArea || 0).toLocaleString()} m2
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white shadow-sm">
          <h2 className="text-xl font-bold">Vai trò admin trong mô hình mới</h2>
          <div className="mt-5 space-y-3 text-sm text-gray-200">
            <div className="rounded-2xl bg-white/5 p-4">
              1. Tạo và duy trì danh mục cánh đồng/khu vực canh tác của hợp tác xã.
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              2. Theo dõi số lượng thửa ruộng, nông dân tham gia và quy mô diện tích đã khai báo.
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              3. Để nông dân tự quản lý dữ liệu chi tiết thay vì admin nhập thay toàn bộ.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminOverview;
