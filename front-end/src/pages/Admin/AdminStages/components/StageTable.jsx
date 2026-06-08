import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import PaginationControls from "../../../../components/Common/PaginationControls";

const StageRow = ({ stage, onEdit, handleDelete, submitting }) => (
  <tr className="border-t border-gray-100">
    <td className="px-5 py-3">
      <span className="font-semibold text-gray-800">{stage.name}</span>
    </td>

    <td className="px-5 py-3">
      <span className="font-semibold text-gray-800">{stage.order}</span>
    </td>

    <td className="px-5 py-3">
      <div className="flex justify-end gap-2">
        <>
          <button
            disabled={submitting}
            onClick={() => onEdit(stage)}
            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            title="Sửa"
          >
            <Pencil size={16} />
          </button>
          <button
            disabled={submitting}
            onClick={() => handleDelete(stage)}
            className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
            title="Xóa"
          >
            <Trash2 size={16} />
          </button>
        </>
      </div>
    </td>
  </tr>
);

const StageTable = ({
  stages,
  loading,
  submitting,
  handleDelete,
  onEdit,
  currentPage,
  totalPages,
  totalStages,
  onPageChange,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="font-bold text-gray-800">Danh sách giai đoạn</h2>
        <span className="text-sm text-gray-500">Tổng: {totalStages}</span>
      </div>

      {loading ? (
        <div className="p-6">Đang tải dữ liệu giai đoạn...</div>
      ) : stages.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-gray-500">
          Chưa có giai đoạn nào
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Tên giai đoạn
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">
                  Thứ tự
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <StageRow
                  key={stage._id}
                  stage={stage}
                  onEdit={onEdit}
                  handleDelete={handleDelete}
                  submitting={submitting}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-gray-500">
          Hiển thị {stages.length} giai đoạn trong tổng số {totalStages} giai
          đoạn.
        </p>

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={submitting}
        />
      </div>
    </div>
  );
};

export default StageTable;
