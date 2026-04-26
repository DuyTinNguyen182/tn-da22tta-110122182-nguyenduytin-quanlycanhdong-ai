import React from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";

const TaskDetailRow = ({
  taskDetail,
  tasks,
  isEditing,
  editingTaskId,
  editingTaskDetailName,
  submitting,
  onStartEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onEditingTaskIdChange,
  onEditingTaskDetailNameChange,
}) => {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-5 py-3">
        {isEditing ? (
          <select
            value={editingTaskId}
            onChange={(e) => onEditingTaskIdChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          >
            <option value="">Chọn công việc</option>
            {tasks.map((task) => (
              <option key={task._id} value={task._id}>
                {task.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium text-gray-700">{taskDetail.taskName}</span>
        )}
      </td>
      <td className="px-5 py-3">
        {isEditing ? (
          <input
            value={editingTaskDetailName}
            onChange={(e) => onEditingTaskDetailNameChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        ) : (
          <span className="font-semibold text-gray-800">{taskDetail.name}</span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                disabled={submitting}
                onClick={() => onUpdate(taskDetail._id)}
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
                onClick={() => onStartEdit(taskDetail)}
                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                title="Sửa"
              >
                <Pencil size={16} />
              </button>
              <button
                disabled={submitting}
                onClick={() => onDelete(taskDetail)}
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

export default TaskDetailRow;
