import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Save, ShieldAlert, Sparkles } from "lucide-react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomCheckbox from "../../../components/UI/CustomCheckbox";
import { useFeedback } from "../../../hooks/useFeedback";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
];

const isQuillEmpty = (value) => {
  const normalized = (value || "")
    .replace(/<p><br><\/p>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return normalized.length === 0;
};

const SeasonRecommendationEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) {
      return;
    }

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: quillModules,
      formats: quillFormats,
      placeholder,
    });

    quillRef.current = quill;

    quill.on("text-change", () => {
      onChange(quill.root.innerHTML);
    });

    const initialValue = isQuillEmpty(value) ? "" : value;
    quill.clipboard.dangerouslyPasteHTML(initialValue);
  }, [onChange, placeholder, value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) {
      return;
    }

    const currentValue = quill.root.innerHTML;
    const nextValue = isQuillEmpty(value) ? "" : value;

    if (currentValue !== nextValue) {
      const selection = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(nextValue);
      if (selection) {
        quill.setSelection(selection.index, selection.length, "silent");
      }
    }
  }, [value]);

  return <div ref={editorRef} className="season-recommendation-editor" />;
};

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
    ]),
  );

const isDraftChanged = (draft = {}, originalDraft = {}) =>
  normalizeRichText(draft.content) !==
    normalizeRichText(originalDraft.content) ||
  draft.isVisible !== (originalDraft.isVisible === true);

const normalizeRichText = (value) => {
  const trimmed = (value || "").trim();
  return isRichTextEmpty(trimmed) ? "" : trimmed;
};

const isRichTextEmpty = (value) => {
  const textOnly = (value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return textOnly.length === 0;
};

const AdminSeasonRecommendations = () => {
  const { toast } = useFeedback();
  const [seasons, setSeasons] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [initialDrafts, setInitialDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSeasonId, setSavingSeasonId] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/season-recommendations/admin/overview");
      const nextSeasons = res.data || [];
      setSeasons(nextSeasons);
      const nextDrafts = buildDraftMap(nextSeasons);
      setDrafts(nextDrafts);
      setInitialDrafts(nextDrafts);
    } catch (error) {
      console.error("Lỗi tải quản lý khuyến nghị mùa vụ:", error);
      toast.error(
        error.response?.data?.message || "Không thể tải dữ liệu khuyến nghị",
      );
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
    const content = normalizeRichText(draft.content);

    if (isRichTextEmpty(content)) {
      toast.warning(
        `Vui lòng nhập nội dung khuyến nghị cho mùa vụ ${season.seasonName}.`,
      );
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
      {loading ? (
        <LoadingScreen message="Đang tải khuyến nghị mùa vụ..." />
      ) : seasons.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-gray-500">
          Chưa có mùa vụ nào để quản lý khuyến nghị
        </div>
      ) : (
        <div className="space-y-5">
          {seasons.map((season) => {
            const draft = drafts[season.seasonId] || {
              content: "",
              isVisible: false,
            };
            const originalDraft = initialDrafts[season.seasonId] || {
              content: "",
              isVisible: false,
            };
            const hasChanges = isDraftChanged(draft, originalDraft);

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
                        <h2 className="text-lg font-bold text-gray-900">
                          {season.seasonName}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            draft.isVisible
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {draft.isVisible
                            ? "Khuyến nghị đang hiển thị"
                            : "Khuyến nghị đang ẩn"}
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
                    disabled={!hasChanges || savingSeasonId === season.seasonId}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                      !hasChanges || savingSeasonId === season.seasonId
                        ? "cursor-not-allowed bg-gray-300 opacity-60"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Save size={15} />
                    {savingSeasonId === season.seasonId
                      ? "Đang lưu..."
                      : "Lưu khuyến nghị"}
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
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <SeasonRecommendationEditor
                      value={draft.content}
                      onChange={(value) =>
                        updateDraft(season.seasonId, "content", value)
                      }
                      placeholder="Nhập khuyến nghị tổng quát cho mùa vụ này..."
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-3">
                      <CustomCheckbox
                        checked={draft.isVisible}
                        onChange={() =>
                          updateDraft(
                            season.seasonId,
                            "isVisible",
                            !draft.isVisible,
                          )
                        }
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
