import React from "react";
import {
  Check,
  ClipboardList,
  MapPinned,
  Plus,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import PaginationControls from "../../../../components/Common/PaginationControls";
import CustomCheckbox from "../../../../components/UI/CustomCheckbox";

const formatArea = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} m²`;

const AvailablePlotsTab = ({
  filteredPlots = [],
  pagedPlots = [],
  page = 1,
  totalPages = 1,
  onPageChange = () => {},
  submitting = false,
  selectedIds = [],
  onToggleSelection = () => {},
  onToggleSelectAllFiltered = () => {},
  allFilteredSelected = false,
  onAssignSelected = () => {},
}) => {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-gray-800">
            Danh sách có thể thêm vào mùa vụ
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Chỉ hiển thị các thửa đang canh tác nhưng chưa được đưa vào mùa vụ
            đang hoạt động.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleSelectAllFiltered}
            disabled={filteredPlots.length === 0 || submitting}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                allFilteredSelected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-gray-300 bg-white"
              }`}
            >
              {allFilteredSelected ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            Chọn tất cả theo bộ lọc
          </button>

          <button
            type="button"
            onClick={onAssignSelected}
            disabled={selectedIds.length === 0 || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Thêm {selectedIds.length} thửa đã chọn
          </button>
        </div>
      </div>

      {filteredPlots.length === 0 ? (
        <div className="px-6 py-14 text-center text-gray-500">
          Không còn thửa ruộng khả dụng phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    Chọn
                  </th>
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
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedPlots.map((item) => {
                  const plotId = String(item?.plot?._id || "");
                  const checked = selectedIds.includes(plotId);

                  return (
                    <tr key={plotId} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <CustomCheckbox
                          checked={checked}
                          disabled={submitting}
                          onChange={() => onToggleSelection(plotId)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {item.plot?.name || "Chưa xác định"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Trạng thái: Đang canh tác
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
                          <UserRound
                            size={16}
                            className="mt-0.5 text-sky-600"
                          />
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
                        {item.hadPreviousAssignment ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            <RefreshCcw size={12} />
                            Có thể kích hoạt lại từ lịch sử cũ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <Plus size={12} />
                            Sẵn sàng thêm mới
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {pagedPlots.length} trong tổng số {filteredPlots.length}{" "}
              thửa có thể thêm.
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

export default AvailablePlotsTab;
