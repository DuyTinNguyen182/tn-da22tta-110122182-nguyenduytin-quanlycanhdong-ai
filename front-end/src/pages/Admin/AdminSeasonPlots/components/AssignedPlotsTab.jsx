import React from "react";
import {
  AlertCircle,
  ClipboardList,
  MapPinned,
  Trash2,
  UserRound,
} from "lucide-react";
import PaginationControls from "../../../../components/Common/PaginationControls";

const formatArea = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} m²`;

const AssignedPlotsTab = ({
  filteredPlots = [],
  pagedPlots = [],
  summary = {},
  page = 1,
  totalPages = 1,
  onPageChange = () => {},
  submitting = false,
  onRemovePlot = () => {},
}) => {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-gray-800">
            Danh sách đang tham gia mùa vụ
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filteredPlots.length} thửa phù hợp với bộ lọc hiện tại.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {summary.assignedCount || 0}/{summary.totalActivePlotCount || 0} thửa
          đang hoạt động
        </span>
      </div>

      {filteredPlots.length === 0 ? (
        <div className="px-6 py-14 text-center text-gray-500">
          Không có thửa ruộng nào đang tham gia phù hợp với bộ lọc.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Thửa ruộng
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Cánh đồng
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Nông dân
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Diện tích
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Dữ liệu liên quan
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedPlots.map((item) => (
                  <tr key={item.assignmentId} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {item.plot?.name || "Chưa xác định"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <MapPinned
                          size={16}
                          className="mt-0.5 text-emerald-600"
                        />
                        <div>
                          <p className="font-medium text-gray-700">
                            {item.field?.name || "Chưa xác định"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.field?.address || "Chưa cập nhật địa bàn"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <UserRound size={16} className="mt-0.5 text-sky-600" />
                        <div>
                          <p className="font-medium text-gray-700">
                            {item.user?.fullName || "Chưa xác định"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.user?.phone || item.user?.email || "--"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {formatArea(item.plot?.area)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          <ClipboardList size={12} />
                          {item.diaryLogCount} nhật ký
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          <AlertCircle size={12} />
                          {item.diseaseLogCount} bệnh hại
                        </span>
                        {item.hasLogs ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Giữ lịch sử khi gỡ
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => onRemovePlot(item)}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {pagedPlots.length} trong tổng số {filteredPlots.length}{" "}
              thửa đang tham gia.
            </p>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              disabled={submitting}
            />
          </div>
        </>
      )}
    </section>
  );
};

export default AssignedPlotsTab;
