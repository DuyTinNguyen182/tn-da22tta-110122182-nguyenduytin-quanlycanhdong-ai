import React from "react";
import { Eye, EyeOff, Pencil, Save, Trash2, X } from "lucide-react";

const SeasonRow = ({
  season,
  isEditing,
  editingSeasonName,
  submitting,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleVisibility,
  onDelete,
  onEditingSeasonNameChange,
}) => {
  return (
    <tr key={season._id} className="border-t border-gray-100">
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            value={editingSeasonName}
            onChange={(e) => onEditingSeasonNameChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="font-semibold text-gray-800">{season.name}</span>
        )}
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            season.isVisible === false
              ? "bg-gray-100 text-gray-600"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {season.isVisible === false ? "Đang ẩn" : "Đang hiển thị"}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                disabled={submitting}
                onClick={() => onSaveEdit(season._id)}
                className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                title="Lưu"
              >
                <Save size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={onCancelEdit}
                className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
                title="Hủy"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                disabled={submitting}
                onClick={() => onToggleVisibility(season)}
                className={`rounded-lg p-2 ${
                  season.isVisible === false
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={season.isVisible === false ? "Hiện mùa vụ" : "Ẩn mùa vụ"}
              >
                {season.isVisible === false ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                disabled={submitting}
                onClick={() => onStartEdit(season)}
                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                title="Sửa"
              >
                <Pencil size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={() => onDelete(season)}
                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-40"
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

export default SeasonRow;
