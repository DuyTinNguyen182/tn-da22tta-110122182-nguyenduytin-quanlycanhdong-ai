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
      <div className="mt-0 space-y-4">
        {loading ? (
          <LoadingScreen message="Đang tải khuyến nghị mùa vụ..." />
        ) : filteredRecommendations.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-2.5 rounded-2xl bg-gray-100 p-3.5">
              <ShieldAlert size={28} className="text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">
              Chưa có khuyến nghị mùa vụ nào đang được hiển thị.
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
                    <h2 className="text-lg font-bold text-gray-900">
                      Vụ {item.seasonName}
                    </h2>
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
                <div
                  className="season-recommendation-content text-sm leading-7 text-gray-700 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{
                    __html: item.content || "",
                  }}
                />
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default SeasonRecommendations;
