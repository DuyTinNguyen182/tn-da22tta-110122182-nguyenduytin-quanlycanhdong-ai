import React from "react";
import { ArrowRight, Edit2, MapPin, Sprout, Trash2, Users } from "lucide-react";

const FieldCard = ({ field, onEdit, onDelete, onViewDetails }) => {
  return (
    <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-4">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <Sprout size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{field.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={14} />
              {field.address || "Chưa cập nhật địa bàn"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(field)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(field._id)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Thửa ruộng</p>
          <p className="mt-2 text-2xl font-bold text-gray-800">{field.plotCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Nông dân</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Users size={18} className="text-emerald-600" />
            {field.farmerCount || 0}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Diện tích</p>
          <p className="mt-2 text-2xl font-bold text-gray-800">
            {Number(field.totalArea || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">m2</p>
        </div>
      </div>

      <button
        onClick={() => onViewDetails(field)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100 transition-all hover:bg-emerald-100"
      >
        Xem nông dân và thửa ruộng
        <ArrowRight size={16} />
      </button>
    </article>
  );
};

export default FieldCard;
