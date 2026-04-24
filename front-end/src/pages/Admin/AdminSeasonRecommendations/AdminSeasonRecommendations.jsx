import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import { useFeedback } from "../../../hooks/useFeedback";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";

const buildDraftMap = (items = []) =>
  Object.fromEntries(
    items.map((season) => [
      season.seasonId,
      {
        content: season.recommendation?.content || "",
        isVisible: season.recommendation?.isVisible === true,
      },
    ])
  );

const AdminSeasonRecommendations = () => {
  const { toast } = useFeedback();
  const [seasons, setSeasons] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSeasonId, setSavingSeasonId] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/season-recommendations/admin/overview");
      const nextSeasons = res.data || [];
      setSeasons(nextSeasons);
      setDrafts(buildDraftMap(nextSeasons));
    } catch (error) {
      console.error("Lỗi tải quản lý khuyến nghị mùa vụ:", error);
      toast.error(error.response?.data?.message || "Không thể tải dữ liệu khuyến nghị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateDraft = (seasonId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [seasonId]: {
        ...(prev[seasonId] || { content: "", isVisible: false }),
        [field]: value,
      },
    }));
  };

  const saveSeasonRecommendation = async (season) => {
    const draft = drafts[season.seasonId] || { content: "", isVisible: false };
    const content = draft.content.trim();

    if (!content) {
      toast.warning(`Vui lòng nhập nội dung khuyến nghị cho mùa vụ ${season.seasonName}.`);
      return;
    }

    try {
      setSavingSeasonId(season.seasonId);
      await api.put(`/season-recommendations/season/${season.seasonId}`, {
        content,
        isVisible: draft.isVisible === true,
      });
      toast.success(`Đã cập nhật khuyến nghị cho mùa vụ ${season.seasonName}.`);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu khuyến nghị");
    } finally {
      setSavingSeasonId("");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {/* <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Khuyến nghị mùa vụ</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Hệ thống tổng hợp dữ liệu nhật ký bệnh của nông dân để nhận diện các bệnh phổ biến theo từng mùa vụ. 
          Tuy nhiên, admin có thể cập nhật thêm khuyến nghị canh tác theo mùa vụ dựa trên dữ liệu nhật ký và kiến thức chuyên môn
           để hỗ trợ nông dân phòng ngừa và ứng phó với các rủi ro bệnh hại. Các khuyến nghị này sẽ được hiển thị công khai cho nông dân khi admin bật trạng thái hiển thị, 
           giúp nông dân có thêm thông tin để ra quyết định canh tác phù hợp với tình hình bệnh theo mùa vụ.        
        </p>
      </div> */}

      {loading ? (
        <LoadingScreen message="Đang tải khuyến nghị mùa vụ..." />
      ) : seasons.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-gray-500">
          Chưa có mùa vụ nào để quản lý khuyến nghị
        </div>
      ) : (
        <div className="space-y-5">
          {seasons.map((season) => {
            const draft = drafts[season.seasonId] || { content: "", isVisible: false };

            return (
              <section
                key={season.seasonId}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                      <CalendarDays size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{season.seasonName}</h2>
                        {/* <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            season.seasonVisible
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {season.seasonVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                          {season.seasonVisible ? "Mùa vụ đang hiển thị" : "Mùa vụ đang ẩn"}
                        </span> */}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            draft.isVisible
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {draft.isVisible ? "Khuyến nghị đang hiển thị" : "Khuyến nghị đang ẩn"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {season.observedDiseases?.length || 0} bệnh đã ghi nhận.{" "}
                        {season.recommendation?.updatedAt
                          ? `Cập nhật khuyến nghị: ${formatDate(season.recommendation.updatedAt)}`
                          : "Chưa có khuyến nghị riêng cho mùa vụ này."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => saveSeasonRecommendation(season)}
                    disabled={savingSeasonId === season.seasonId}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                      savingSeasonId === season.seasonId
                        ? "cursor-not-allowed bg-gray-300"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Save size={15} />
                    {savingSeasonId === season.seasonId ? "Đang lưu..." : "Lưu khuyến nghị"}
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <ShieldAlert size={15} className="text-amber-500" />
                    Bệnh đã ghi nhận theo mùa vụ
                  </div>

                  {season.observedDiseases?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {season.observedDiseases.map((item) => (
                        <div
                          key={`${season.seasonId}-${item.diseaseName}`}
                          className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700"
                        >
                          {item.diseaseName} • {item.totalLogs} lượt
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                      Mùa vụ này chưa có bệnh nào được ghi nhận từ nhật ký bệnh.
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Sparkles size={15} className="text-emerald-600" />
                    Nội dung khuyến nghị hiển thị cho nông dân
                  </div>

                  <textarea
                    rows={5}
                    value={draft.content}
                    onChange={(e) => updateDraft(season.seasonId, "content", e.target.value)}
                    placeholder="Nhập khuyến nghị tổng quát cho mùa vụ này..."
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={draft.isVisible}
                        onChange={(e) =>
                          updateDraft(season.seasonId, "isVisible", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Bật hiển thị khuyến nghị này cho nông dân
                      </span>
                    </label>

                    <p className="text-xs text-gray-500">
                      Nông dân chỉ nhìn thấy khuyến nghị khi mục này được bật.
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSeasonRecommendations;
