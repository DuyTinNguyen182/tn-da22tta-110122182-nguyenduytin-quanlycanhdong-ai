import React, { useEffect, useState } from "react";
import { CalendarDays, Search, ShieldAlert, Sparkles } from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";

const SeasonRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const res = await api.get("/season-recommendations");
        setRecommendations(res.data || []);
      } catch (error) {
        console.error("Lỗi tải khuyến nghị mùa vụ:", error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
  const filteredRecommendations = recommendations.filter((item) => {
    if (!normalizedKeyword) {
      return true;
    }

    const haystack = [item.seasonName, item.content]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi");

    return haystack.includes(normalizedKeyword);
  });

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto bg-gray-50 p-4 lg:p-5">
      {/* <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Khuyến nghị mùa vụ</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Hiển thị các khuyến cáo canh tác theo mùa vụ gốc do admin đã bật trạng thái hiển thị.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Khuyến cáo hiển thị</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{filteredRecommendations.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Nguồn</p>
          <p className="mt-1.5 text-sm font-medium text-gray-600">
            Nội dung do admin cập nhật theo từng mùa vụ gốc.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Lưu ý</p>
          <p className="mt-1.5 text-sm font-medium text-gray-600">
            Chỉ hiển thị các khuyến cáo đã bật trạng thái công khai.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mùa vụ hoặc nội dung khuyến cáo..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div> */}

      <div className="mt-4 space-y-4">
        {loading ? (
          <LoadingScreen message="Đang tải khuyến nghị mùa vụ..." />
        ) : filteredRecommendations.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-2.5 rounded-2xl bg-gray-100 p-3.5">
              <ShieldAlert size={28} className="text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">
              Chưa có khuyến cáo mùa vụ nào đang được bật hiển thị.
            </p>
          </div>
        ) : (
          filteredRecommendations.map((item) => (
            <section
              key={item._id}
              className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Vụ {item.seasonName}</h2>
                    <p className="text-sm text-gray-500">
                      Cập nhật lần cuối: {formatDate(item.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  Đang hiển thị
                </div> */}
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Sparkles size={15} className="text-emerald-600" />
                  Nội dung khuyến nghị
                </div>
                <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{item.content}</p>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default SeasonRecommendations;
