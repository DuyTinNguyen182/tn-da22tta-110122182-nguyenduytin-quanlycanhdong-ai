import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, Sparkles, X, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";

const SmartAssistantCard = ({ selectedSeasonId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSeason, setHasActiveSeason] = useState(true);
  const [isSeasonEnded, setIsSeasonEnded] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);

        const res = await api.get("/farmer-dashboard/recommendations", {
          params: selectedSeasonId ? { seasonId: selectedSeasonId } : {},
        });

        let rawData = [];
        let active = true;
        let ended = false;

        if (res.data && !Array.isArray(res.data)) {
          rawData = res.data.data || [];
          active = res.data.hasActiveSeason ?? true;
          ended = res.data.isSeasonEnded ?? false;
        } else {
          rawData = res.data || [];
        }

        setHasActiveSeason(active);
        setIsSeasonEnded(ended);

        const grouped = rawData.reduce((acc, curr) => {
          if (!acc[curr.taskId]) {
            acc[curr.taskId] = {
              ...curr,
              plotNames: [curr.plotName],
              plotIds: [curr.plotId],
            };
          } else {
            acc[curr.taskId].plotNames.push(curr.plotName);
            acc[curr.taskId].plotIds.push(curr.plotId);
          }
          return acc;
        }, {});

        const groupedArray = Object.values(grouped).sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          if (a.urgency === "HIGH" && b.urgency !== "HIGH") return -1;
          if (a.urgency !== "HIGH" && b.urgency === "HIGH") return 1;
          return 0;
        });

        setRecommendations(groupedArray);
      } catch (error) {
        console.error("Lỗi tải gợi ý công việc:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedSeasonId]);

  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm animate-pulse min-h-[180px]">
        <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
        <div className="h-12 bg-gray-100 rounded mb-2"></div>
      </div>
    );
  }

  if (!hasActiveSeason) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-gray-50 p-3 shadow-sm min-h-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="rounded-xl bg-white p-1.5 shadow-sm border border-gray-100 text-gray-500">
            <Info className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-gray-700">Gợi ý công việc</h2>
        </div>
        <p className="text-xs text-gray-500 ml-9 leading-relaxed flex-1">
          Chưa có mùa vụ nào đang hoạt động. Hãy chờ Hợp tác xã cấu hình mùa vụ
          mới nhé.
        </p>
      </div>
    );
  }

  if (isSeasonEnded) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-amber-100 bg-amber-50/40 p-3 shadow-sm min-h-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="rounded-xl bg-white p-1.5 shadow-sm border border-amber-100 text-amber-600">
            <Info className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-amber-800">Gợi ý công việc</h2>
        </div>
        <p className="text-xs text-amber-700 ml-9 leading-relaxed flex-1">
          Mùa vụ này đã kết thúc.
        </p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3 shadow-sm min-h-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="rounded-xl bg-white p-1.5 shadow-sm border border-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-emerald-800">
            Gợi ý công việc
          </h2>
        </div>
        <p className="text-xs text-emerald-700 ml-9 leading-relaxed flex-1">
          Đồng ruộng đang phát triển rất tốt. Hiện chưa có công việc nào tới hạn
          cần xử lý ngay.
        </p>
      </div>
    );
  }

  const topRecommendations = recommendations.slice(0, 2);
  const hasMore = recommendations.length > 2;

  return (
    <>
      <div className="flex flex-col h-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-100/50 p-3 shadow-sm relative overflow-hidden min-h-[180px]">
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-yellow-200/50 blur-2xl"></div>

        <div className="flex items-center gap-2 mb-2.5 relative z-10">
          <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-sm text-white animate-bounce-slight">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-900 leading-tight">
              Gợi ý công việc hôm nay
            </h2>
            <p className="text-[10px] text-emerald-700 font-medium">
              Theo tuổi lúa thực tế
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 relative z-10 mb-3">
          {topRecommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/80 p-2 shadow-sm border border-white/60 backdrop-blur-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {rec.isOverdue ? (
                    <span className="flex h-2 w-2 shrink-0 rounded-full bg-red-600 animate-pulse"></span>
                  ) : rec.urgency === "HIGH" ? (
                    <span className="flex h-2 w-2 shrink-0 rounded-full bg-orange-500 animate-pulse"></span>
                  ) : (
                    <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
                  )}
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm font-bold ${rec.isOverdue ? "text-red-700" : "text-gray-800"}`}
                    >
                      {rec.taskName}
                    </p>
                    {rec.isOverdue && (
                      <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">
                        Quá hạn
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  <span className="font-medium text-emerald-700">
                    {rec.plotNames.join(", ")}
                  </span>{" "}
                  - {rec.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between relative z-10 border-t border-emerald-200/60 pt-2.5">
          {hasMore ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-all"
            >
              Xem tất cả ({recommendations.length})
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={() => navigate("/crops")}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            Tiến hành ngay <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold text-gray-800">
                  Tất cả gợi ý công việc
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2.5 flex-1 bg-gray-50/50">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-white p-3 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Cập nhật màu chấm tròn */}
                    {rec.isOverdue ? (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-red-600 animate-pulse"></span>
                    ) : rec.urgency === "HIGH" ? (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-orange-500 animate-pulse"></span>
                    ) : (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
                    )}

                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-bold ${rec.isOverdue ? "text-red-700" : "text-gray-800"}`}
                      >
                        {rec.taskName}
                      </p>
                      {rec.isOverdue && (
                        <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">
                          Quá hạn
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1.5">
                    Áp dụng:{" "}
                    <span className="font-semibold text-emerald-700">
                      {rec.plotNames.join(", ")}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                    {rec.message}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  navigate("/crops");
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              >
                Tiến hành ghi nhật ký <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartAssistantCard;
