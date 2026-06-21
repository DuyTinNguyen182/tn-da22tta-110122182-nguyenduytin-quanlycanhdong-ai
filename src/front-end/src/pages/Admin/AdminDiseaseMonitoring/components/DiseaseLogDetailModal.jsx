import React from "react";
import {
  BellRing,
  CalendarDays,
  Clock,
  Eye,
  FileText,
  Image as ImageIcon,
  MapPinned,
  UserRound,
  X,
} from "lucide-react";
import {
  formatDateTime,
  formatSeasonLabel,
  getPlotSummary,
  getStatusMeta,
  getWarningMeta,
} from "../adminDiseaseMonitoringUtils.jsx";

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-gray-800">
        {value || "--"}
      </p>
    </div>
  </div>
);

const DiseaseLogDetailModal = ({ open, log, selectedSeason, onClose }) => {
  if (!open || !log) return null;

  const statusMeta = getStatusMeta(log.status);
  const warningMeta = getWarningMeta(log);
  const seasonLabel =
    log.seasonLabel ||
    (log.season ? formatSeasonLabel(log.season) : "") ||
    formatSeasonLabel(selectedSeason);
  const plotSummary = getPlotSummary(log);

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Eye size={16} />
              Chi tiết ghi nhận bệnh
            </div>
            <h3 className="mt-2 truncate text-xl font-bold text-gray-900">
              {log.diseaseName || "Bệnh chưa xác định"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {log.fieldName || "--"} · {seasonLabel || "--"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-0 overflow-y-auto lg:grid-cols-[0.95fr_1.2fr]">
          <div className="border-b border-gray-100 bg-gray-50/60 p-6 lg:border-b-0 lg:border-r">
            {log.imageUrl ? (
              <a
                href={log.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                title="Mở ảnh gốc"
              >
                <img
                  src={log.imageUrl}
                  alt="Ảnh bệnh"
                  className="h-72 w-full object-cover"
                />
              </a>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-gray-400">
                <ImageIcon size={28} />
                <p className="mt-2 text-sm font-medium">Chưa có ảnh</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${warningMeta.className}`}
              >
                <BellRing size={13} />
                {warningMeta.label}
              </span>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow icon={MapPinned} label="Cánh đồng" value={log.fieldName} />
              <DetailRow icon={CalendarDays} label="Mùa vụ" value={seasonLabel} />
              <DetailRow
                icon={UserRound}
                label="Người ghi nhận"
                value={log.userName || log.user?.fullName}
              />
              <DetailRow
                icon={Clock}
                label="Ngày ghi nhận"
                value={formatDateTime(log.detectedAt || log.createdAt)}
              />
            </div>

            <section>
              <h4 className="text-sm font-bold text-gray-900">
                Thửa ảnh hưởng
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {(log.plots || []).length > 0 ? (
                  log.plots.map((plot) => (
                    <span
                      key={plot?._id || plot?.name}
                      className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                    >
                      {plot?.name || "--"}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">{plotSummary}</p>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <FileText size={16} />
                Mô tả
              </div>
              <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">
                {log.description || "Chưa có mô tả chi tiết."}
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                icon={Clock}
                label="Cập nhật lần cuối"
                value={formatDateTime(log.updatedAt)}
              />
              <DetailRow
                icon={UserRound}
                label="Nguồn ghi nhận"
                value={log.source === "manual" ? "Thủ công" : "AI scan"}
              />
            </section>

            <section>
              <h4 className="text-sm font-bold text-gray-900">Xử lý</h4>
              <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">
                {log.status === "processed" ? (
                  <>
                    <p>
                      Đã xử lý lúc {formatDateTime(log.processedAt)}
                      {log.processedBy?.fullName
                        ? ` bởi ${log.processedBy.fullName}`
                        : ""}.
                    </p>
                    {log.processingNote ? (
                      <p className="mt-2 text-gray-600">{log.processingNote}</p>
                    ) : null}
                  </>
                ) : (
                  <p>Nông dân chưa cập nhật xử lý.</p>
                )}
              </div>
            </section>

            {log.warningSent ? (
              <section>
                <h4 className="text-sm font-bold text-gray-900">Cảnh báo</h4>
                <p className="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                  Đã gửi cảnh báo. Lần gần nhất:{" "}
                  {formatDateTime(log.warningSentAt)}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiseaseLogDetailModal;
