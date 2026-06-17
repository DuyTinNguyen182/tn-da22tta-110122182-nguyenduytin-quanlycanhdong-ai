import React from "react";
import { BellRing, Loader2, Send, Users, X } from "lucide-react";

const DiseaseWarningModal = ({
  open,
  preview,
  form,
  loading,
  submitting,
  selectedRecipientIds,
  onRecipientChange,
  onClose,
  onChange,
  onSubmit,
}) => {
  if (!open) return null;

  const isAllSelected =
    selectedRecipientIds?.length === preview?.recipients?.length &&
    preview?.recipients?.length > 0;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onRecipientChange(preview?.recipients?.map((r) => r.userId) || []);
    } else {
      onRecipientChange([]);
    }
  };

  const handleToggleRecipient = (userId, checked) => {
    if (checked) {
      onRecipientChange([...(selectedRecipientIds || []), userId]);
    } else {
      onRecipientChange(
        (selectedRecipientIds || []).filter((id) => id !== userId),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {preview?.log?.warningSent
                ? "Gửi lại cảnh báo bệnh"
                : "Gửi cảnh báo bệnh"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Bạn có thể tùy chỉnh tiêu đề, nội dung và chọn chính xác những
              nông dân cần gửi thông báo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gray-50 px-5 py-4 text-sm font-medium text-gray-600">
              <Loader2 size={18} className="animate-spin" />
              Đang chuẩn bị nội dung cảnh báo...
            </div>
          </div>
        ) : (
          <div className="grid gap-0 overflow-y-auto lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">
                  Tiêu đề cảnh báo
                </span>
                <input
                  value={form?.title || ""}
                  onChange={(event) => onChange("title", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">
                  Nội dung
                </span>
                <textarea
                  rows={10}
                  value={form?.content || ""}
                  onChange={(event) => onChange("content", event.target.value)}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-5 lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <div className="rounded-3xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    Thông tin bệnh
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {preview?.log?.diseaseName || "--"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Cánh đồng: {preview?.fieldName || "--"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Người ghi nhận: {preview?.log?.userName || "--"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Users size={16} />
                      Người nhận ({selectedRecipientIds?.length || 0}/
                      {preview?.recipients?.length || 0})
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 accent-emerald-600 focus:ring-emerald-500"
                      />
                      Chọn tất cả
                    </label>
                  </div>

                  <div className="mt-3 space-y-3">
                    {(preview?.recipients || []).map((recipient) => {
                      const isSelected = selectedRecipientIds?.includes(
                        recipient.userId,
                      );
                      return (
                        <label
                          key={recipient.userId}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-all ${
                            isSelected
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-gray-100 bg-gray-50/50 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleToggleRecipient(
                                recipient.userId,
                                e.target.checked,
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-gray-300 accent-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold ${isSelected ? "text-emerald-900" : "text-gray-900"}`}
                            >
                              {recipient.fullName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {recipient.email ||
                                recipient.phone ||
                                recipient.userId}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-gray-600">
                              Thửa:{" "}
                              {(recipient.plotNames || []).join(", ") || "--"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              loading || submitting || selectedRecipientIds?.length === 0
            }
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all ${
              loading || submitting || selectedRecipientIds?.length === 0
                ? "cursor-not-allowed bg-gray-300"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting ? "Đang gửi..." : "Gửi cảnh báo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiseaseWarningModal;
