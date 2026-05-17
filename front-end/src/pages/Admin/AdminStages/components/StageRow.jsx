import React from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";

const StageRow = ({
  stage,
  isEditing,
  editingStageName,
  editingStageOrder,
  submitting,
  onStartEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onEditingStageNameChange,
  onEditingStageOrderChange,
}) => {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            value={editingStageName}
            onChange={(e) => onEditingStageNameChange(e.target.value)}
            placeholder="Tên giai đoạn"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="font-semibold text-gray-800">{stage.name}</span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            type="number"
            value={editingStageOrder}
            onChange={(e) => onEditingStageOrderChange(Number(e.target.value))}
            placeholder="Thứ tự"
            min="0"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="font-semibold text-gray-800">{stage.order}</span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                disabled={submitting}
                onClick={() => onUpdate(stage._id)}
                className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                title="Lưu"
              >
                <Save size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={onCancelEdit}
                className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                title="Hủy"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                disabled={submitting}
                onClick={() => onStartEdit(stage)}
                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                title="Sửa"
              >
                <Pencil size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={() => onDelete(stage)}
                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
                title="Xóa"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default StageRow;
