import React, { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Save,
  ShieldAlert,
  Sparkles,
  Edit,
  Eye,
  X,
} from "lucide-react";
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

const quillFormats = ["header", "bold", "italic", "underline", "list"];

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
  const [editingSeason, setEditingSeason] = useState(null);
  const [viewingSeason, setViewingSeason] = useState(null);

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
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="relative max-h-24 overflow-hidden">
                      <div className="ql-snow">
                        <div
                          className="ql-editor prose max-w-none text-sm text-gray-700 p-0"
                          dangerouslySetInnerHTML={{
                            __html:
                              draft.content ||
                              "<span class='text-gray-400'>Chưa có nội dung khuyến nghị...</span>",
                          }}
                        />
                      </div>
                      {draft.content && (
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingSeason(season)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Eye size={14} />
                        Xem chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSeason(season)}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Edit size={14} />
                        Chỉnh sửa
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Draft Viewing Modal */}
      {viewingSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Chi tiết khuyến nghị - {viewingSeason.seasonName}
                </h3>
              </div>
              <button
                onClick={() => setViewingSeason(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="p-6"
              style={{ maxHeight: "calc(90vh - 140px)", overflowY: "auto" }}
            >
              <div className="ql-snow">
                <div
                  className="ql-editor prose max-w-none text-gray-800 p-0"
                  dangerouslySetInnerHTML={{
                    __html:
                      drafts[viewingSeason.seasonId]?.content ||
                      "<span class='text-gray-400'>Chưa có nội dung khuyến nghị...</span>",
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setViewingSeason(null)}
                className="rounded-xl bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {editingSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[96vh] w-full max-w-6xl flex-col rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Chỉnh sửa khuyến nghị - {editingSeason.seasonName}
                </h3>
              </div>
              <button
                onClick={() => setEditingSeason(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="flex flex-1 flex-col gap-4 p-6 min-h-0"
              style={{ maxHeight: "calc(96vh - 142px)" }}
            >
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-1 flex-col overflow-hidden [&_.ql-toolbar]:shrink-0 [&_.ql-toolbar]:border-t-0 [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:flex-1 [&_.ql-container]:overflow-y-auto [&_.ql-editor]:min-h-[250px]">
                  <SeasonRecommendationEditor
                    value={drafts[editingSeason.seasonId]?.content}
                    onChange={(value) =>
                      updateDraft(editingSeason.seasonId, "content", value)
                    }
                    placeholder="Nhập khuyến nghị tổng quát cho mùa vụ này..."
                  />
                </div>
              </div>
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-3">
                  <CustomCheckbox
                    checked={drafts[editingSeason.seasonId]?.isVisible || false}
                    onChange={() =>
                      updateDraft(
                        editingSeason.seasonId,
                        "isVisible",
                        !(drafts[editingSeason.seasonId]?.isVisible || false),
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
            <div className="flex justify-end gap-3 border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setEditingSeason(null)}
                className="rounded-xl bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await saveSeasonRecommendation(editingSeason);
                  setEditingSeason(null);
                }}
                disabled={
                  savingSeasonId === editingSeason.seasonId ||
                  !isDraftChanged(
                    drafts[editingSeason.seasonId],
                    initialDrafts[editingSeason.seasonId],
                  )
                }
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white ${
                  !isDraftChanged(
                    drafts[editingSeason.seasonId],
                    initialDrafts[editingSeason.seasonId],
                  ) || savingSeasonId === editingSeason.seasonId
                    ? "cursor-not-allowed bg-gray-300 opacity-60"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Save size={15} />
                {savingSeasonId === editingSeason.seasonId
                  ? "Đang lưu..."
                  : "Lưu khuyến nghị"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSeasonRecommendations;
