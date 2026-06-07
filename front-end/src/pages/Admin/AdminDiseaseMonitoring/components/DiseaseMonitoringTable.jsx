import React from "react";
import { AlertTriangle, BellRing, Eye, Loader2 } from "lucide-react";
import LoadingScreen from "../../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../../components/Common/PaginationControls";
import {
  formatDateTime,
  formatSeasonLabel,
  getCompactPlotSummary,
  getPlotSummary,
  getStatusMeta,
  isSeasonCompletedForLog,
} from "../adminDiseaseMonitoringUtils.jsx";

const DiseaseMonitoringTable = ({
  selectedSeason,
  loading,
  refreshing,
  paginatedLogs,
  filteredLogs,
  currentPage,
  totalPages,
  onPageChange,
  onOpenDetailModal,
  onOpenWarningModal,
  warningLoadingLogId,
}) => {
  if (!selectedSeason) {
    return (
      <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center">
        <div className="rounded-2xl bg-white p-4 text-amber-500 shadow-sm">
          <AlertTriangle size={28} />
        </div>
        <p className="mt-4 text-base font-semibold text-gray-700">
          Chưa có mùa vụ để theo dõi
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Hãy tạo mùa vụ hoặc kiểm tra lại bộ lọc để xem nhật ký bệnh tương ứng.
        </p>
      </div>
    );
  }

  if (loading || refreshing) {
    return <LoadingScreen message="Đang tải danh sách bệnh..." />;
  }

  if (paginatedLogs.length === 0) {
    return (
      <div className="mt-5 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center">
        <div className="rounded-2xl bg-white p-4 text-gray-400 shadow-sm">
          <AlertTriangle size={28} />
        </div>
        <p className="mt-4 text-base font-semibold text-gray-700">
          Chưa có bệnh nào phù hợp
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Thử đổi cánh đồng, trạng thái hoặc mốc thời gian để xem thêm dữ liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Cánh đồng / mùa vụ</th>
              <th className="px-4 py-3">Bệnh</th>
              <th className="px-4 py-3">Người ghi nhận</th>
              <th className="px-4 py-3">Ngày ghi nhận</th>
              <th className="px-4 py-3">Trạng thái xử lý</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => {
              const statusMeta = getStatusMeta(log.status);
              const isPreparingWarning = warningLoadingLogId === log._id;
              const plotSummary = getPlotSummary(log);
              const compactPlotSummary = getCompactPlotSummary(log);
              const isSeasonCompleted = isSeasonCompletedForLog(
                log,
                selectedSeason,
              );
              const isWarningDisabled = isPreparingWarning || isSeasonCompleted;

              return (
                <tr key={log._id} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-4 text-sm font-medium text-gray-700">
                    <p>{log.fieldName || "--"}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {log.seasonLabel || formatSeasonLabel(selectedSeason)}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {log.imageUrl ? (
                        <img
                          src={log.imageUrl}
                          alt="Ảnh bệnh"
                          className="h-11 w-11 rounded-lg border border-gray-100 bg-gray-50 object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-[10px] text-gray-400">
                          Trống
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-semibold text-gray-900">
                          {log.diseaseName || "--"}
                        </p>
                        <p
                          className="mt-1 max-w-[240px] truncate text-xs text-gray-500"
                          title={plotSummary}
                        >
                          {compactPlotSummary}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-700">
                    <p>{log.userName || log.user?.fullName || "--"}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Nguồn: {log.source === "manual" ? "Thủ công" : "AI scan"}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-500">
                    <p>{formatDateTime(log.detectedAt || log.createdAt)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Cập nhật: {formatDateTime(log.updatedAt)}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </div>
                    {log.warningSent ? (
                      <p className="mt-2 text-xs text-sky-600">
                        Đã gửi: {formatDateTime(log.warningSentAt)}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetailModal(log)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenWarningModal(log)}
                        disabled={isWarningDisabled}
                        title={
                          isSeasonCompleted
                            ? "Vụ đã kết thúc, không thể gửi cảnh báo"
                            : log.warningSent
                              ? "Gửi lại cảnh báo"
                              : "Gửi cảnh báo"
                        }
                        className={`inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-all ${
                          isWarningDisabled
                            ? "cursor-not-allowed bg-gray-300"
                            : log.warningSent
                              ? "bg-sky-600 shadow-md shadow-sky-200 hover:bg-sky-700"
                              : "bg-amber-500 shadow-md shadow-amber-200 hover:bg-amber-600"
                        }`}
                      >
                        {isPreparingWarning ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <BellRing size={15} />
                        )}
                        {isPreparingWarning
                          ? "Đang chuẩn bị..."
                          : isSeasonCompleted
                            ? "Vụ đã kết thúc"
                            : log.warningSent
                            ? "Gửi lại"
                            : "Gửi cảnh báo"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-gray-500">
          Hiển thị {paginatedLogs.length} mục trong tổng số{" "}
          {filteredLogs.length} log bệnh theo bộ lọc hiện tại.
        </p>

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={loading || refreshing}
        />
      </div>
    </div>
  );
};

export default DiseaseMonitoringTable;
