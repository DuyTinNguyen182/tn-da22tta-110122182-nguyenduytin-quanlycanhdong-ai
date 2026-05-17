import React from "react";
import {
  BellRing,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  ShieldAlert,
} from "lucide-react";
import LoadingScreen from "../../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../../components/Common/PaginationControls";

const OverviewFarmerTable = ({
  loading,
  hasSelectedFilter,
  warnableFarmerGroups,
  sendingAllWarnings,
  onWarningAll,
  paginatedFarmerRows,
  pendingFarmerGroups,
  expandedFarmerKeys,
  sendingRecipientKey,
  sentWarningKeys,
  appliedFilters,
  selectedTaskLabel,
  onToggleFarmer,
  onWarning,
  buildWarningSessionKey,
  getStatusClasses,
  getStatusText,
  summary,
  groupedFarmerRows,
  currentPage,
  totalPages,
  onPageChange,
  selectedStageLabel,
}) => {
  const chooseTaskTitle =
    "Vui lòng chọn giai đoạn và công việc để xem bảng dữ liệu";
  const chooseTaskDescription =
    "Bảng thống kê sẽ hiển thị khi bạn đã chọn một giai đoạn và một công việc trên bộ lọc.";

  return (
    <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bảng thống kê</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Đã làm
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            Chưa làm
          </span>
          <button
            type="button"
            onClick={onWarningAll}
            disabled={
              sendingAllWarnings ||
              warnableFarmerGroups.length === 0 ||
              loading ||
              !appliedFilters.taskId
            }
            className="ml-1 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 font-semibold text-white shadow-md shadow-amber-200 transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
          >
            <BellRing size={15} />
            {sendingAllWarnings ? "Đang gửi..." : "Cảnh báo tất cả"}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingScreen message="Đang cập nhật bảng thống kê..." />
      ) : !hasSelectedFilter ? (
        <div className="flex h-72 flex-col items-center justify-center px-6 text-center">
          <div className="rounded-3xl bg-sky-50 p-4 text-sky-600">
            <Briefcase size={28} />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-800">
            {chooseTaskTitle}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            {chooseTaskDescription}
          </p>
        </div>
      ) : groupedFarmerRows.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center px-6 text-center">
          <div className="rounded-3xl bg-amber-50 p-4 text-amber-600">
            <ShieldAlert size={28} />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-800">
            Chưa có dữ liệu phù hợp
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Hãy thử đổi mùa vụ, năm, giai đoạn, công việc hoặc trạng thái.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                <tr>
                  <th className="w-[24%] px-5 py-4">Nông dân</th>
                  <th className="w-[14%] px-5 py-4">Thửa ruộng</th>
                  <th className="w-[23%] px-5 py-4">Phạm vi</th>
                  <th className="w-[16%] px-5 py-4">Giai đoạn / công việc</th>
                  <th className="w-[13%] px-5 py-4">Tiến độ</th>
                  <th className="w-[10%] px-5 py-4 text-right">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFarmerRows.map((group) => {
                  const isExpanded = expandedFarmerKeys.has(group.recipientKey);
                  const isSendingGroup =
                    sendingRecipientKey &&
                    sendingRecipientKey === group.recipientKey;
                  const canWarn =
                    group.pendingCount > 0 && Boolean(appliedFilters.taskId);
                  const isSentInSession = sentWarningKeys.has(
                    buildWarningSessionKey(group.recipientKey, appliedFilters),
                  );

                  return (
                    <React.Fragment key={group.recipientKey}>
                      <tr className="border-t border-gray-100 align-top">
                        <td className="break-words px-5 py-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <button
                              type="button"
                              onClick={() => onToggleFarmer(group.recipientKey)}
                              className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label={
                                isExpanded
                                  ? "Ẩn chi tiết thửa ruộng"
                                  : "Xem chi tiết thửa ruộng"
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>

                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900">
                                {group.farmerName}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {group.farmerEmail || "--"}
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                {group.farmerPhone || "--"}
                              </p>
                              {isSentInSession ? (
                                <p className="mt-2 text-xs font-medium text-sky-700">
                                  Đã gửi cảnh báo trong phiên hiện tại.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="break-words px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {group.totalPlotCount} thửa
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Tổng diện tích:{" "}
                            {group.totalArea.toLocaleString("vi-VN")} m2
                          </p>
                          <button
                            type="button"
                            onClick={() => onToggleFarmer(group.recipientKey)}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-200"
                          >
                            {isExpanded
                              ? "Ẩn chi tiết"
                              : `Xem ${group.totalPlotCount} thửa`}
                          </button>
                        </td>

                        <td className="break-words px-5 py-4">
                          <div className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                            <MapIcon size={14} />
                            {group.fieldSummary}
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Mùa vụ: {group.seasonSummary}
                          </p>
                        </td>

                        <td className="break-words px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {selectedTaskLabel}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Giai đoạn: {selectedStageLabel}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {appliedFilters.taskId
                              ? "Đang lọc theo công việc đã chọn"
                              : "Tổng hợp theo giai đoạn hoặc bộ lọc hiện tại"}
                          </p>
                        </td>

                        <td className="break-words px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                              Đã làm: {group.doneCount}
                            </span>
                            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                              Chưa làm: {group.pendingCount}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Hoàn thành:{" "}
                            {group.totalPlotCount
                              ? Math.round(
                                  (group.doneCount / group.totalPlotCount) *
                                    100,
                                )
                              : 0}
                            %
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => onWarning(group)}
                              disabled={
                                !canWarn ||
                                sendingAllWarnings ||
                                Boolean(sendingRecipientKey)
                              }
                              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                !canWarn ||
                                sendingAllWarnings ||
                                Boolean(sendingRecipientKey)
                                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                  : isSentInSession
                                    ? "bg-sky-600 text-white shadow-md shadow-sky-200 hover:bg-sky-700"
                                    : "bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600"
                              }`}
                            >
                              <BellRing size={15} />
                              {group.pendingCount === 0
                                ? "Đã xong"
                                : isSendingGroup
                                  ? "Đang gửi..."
                                  : isSentInSession
                                    ? "Đã gửi"
                                    : "Cảnh báo"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="border-t border-gray-100 bg-gray-50/70">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {group.rows.map((row) => (
                                <div
                                  key={row.assignmentId}
                                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
                                >
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    <p className="font-semibold text-gray-900">
                                      {row.plotName}
                                    </p>
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                                        row.status,
                                      )}`}
                                    >
                                      {getStatusText(row.status)}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                    <p className="text-gray-500">
                                      Diện tích:{" "}
                                      {Number(row.plotArea || 0).toLocaleString(
                                        "vi-VN",
                                      )}{" "}
                                      m2
                                    </p>
                                    <p className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-700">
                                      <MapIcon size={14} />
                                      {row.fieldName}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {paginatedFarmerRows.length} nông dân trong tổng số{" "}
              {groupedFarmerRows.length} nông dân, tương ứng{" "}
              {summary.visibleCount} thửa theo bộ lọc hiện tại.
            </p>

            <PaginationControls
              page={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              disabled={loading}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default OverviewFarmerTable;
